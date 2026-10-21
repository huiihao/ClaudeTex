import type { Register } from 'claude-code'
import { transformMarkdown } from '../src/tex/markdown'
import { buildPreviewHtml } from '../src/preview'

type Reply = { id: string; text: string }

const MATH_NOTE = `# Math in this session
Claudetex, a Claude Code mod in this session, typesets math in replies. Write formulas in LaTeX instead of Unicode or ASCII:
- Inline math: $...$ with no space right after the opening $ or right before the closing $.
- Display math: $$...$$ on their own lines, with blank lines before and after.
Use LaTeX for every formula and symbol, including single letters ($x$), fractions, sums, integrals, matrices and cases. Do not replace math with Unicode symbols such as α, ² or ≤, and do not draw formulas with ASCII art.
Keep formulas out of fenced code blocks and inline code, and put dollar amounts and shell variables such as $PATH in code spans. Math in tables, headings, lists and block quotes is fine.
The terminal draws display math as a multi-line Unicode block. The user can run /tex to open the same reply in a browser where KaTeX typesets it exactly; mention that command when a formula is hard to read in the terminal.
In a side question (/btw), the answer is drawn where this mod cannot reach: write its math as Unicode text instead.`

const MAX_REPLIES = 24
const MAX_PREVIEW_CHARS = 60_000

const replies: Reply[] = []
const transformCache = new Map<string, string>()
let anonymousId = 0
let isTold = false

let config = {
  inline: true,
  display: true,
  teach: true,
  maxWidth: 0,
}

function truthy(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value !== 'false' && value !== '0' && value !== ''
  return Boolean(value)
}

function numberValue(value: unknown, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : fallback
}

function remember(id: unknown, text: string): void {
  if (typeof text !== 'string' || text === '') return
  const key = String(id ?? `anonymous-${anonymousId++}`)
  const stored = text.length > MAX_PREVIEW_CHARS ? text.slice(0, MAX_PREVIEW_CHARS) : text
  const found = replies.find(reply => reply.id === key)
  if (found) found.text = stored
  else replies.push({ id: key, text: stored })
  if (replies.length > MAX_REPLIES) replies.splice(0, replies.length - MAX_REPLIES)
}

function hasMath(text: string): boolean {
  return /\$[^$\n]+\$|\$\$[\s\S]+?\$\$|\\\(|\\\[|\\begin\{/.test(text)
}

function transform(text: string, columns: number | undefined): string {
  if (typeof text !== 'string' || text === '' || (!config.inline && !config.display)) return text
  if (!text.includes('$') && !text.includes('\\')) return text
  const width = Number.isFinite(columns) ? columns! : 80
  const cacheable = text.length <= 20_000
  const key = `${width}\u0000${text}`
  if (cacheable) {
    const cached = transformCache.get(key)
    if (cached !== undefined) return cached
  }
  try {
    const maxWidth = config.maxWidth > 0 ? config.maxWidth : Math.max(20, width - 6)
    const result = transformMarkdown(text, {
      inline: config.inline,
      display: config.display,
      maxWidth,
    })
    const output = result.changed ? result.text : text
    if (cacheable) {
      if (transformCache.size > 60) transformCache.clear()
      transformCache.set(key, output)
    }
    return output
  } catch {
    // A failed transform must never cost the user their reply.
    return text
  }
}

function messageText(message: unknown): string {
  if (typeof message === 'string') return message
  if (!message || typeof message !== 'object') return ''
  const record = message as Record<string, unknown>
  if (typeof record.text === 'string') return record.text
  const inner = record.message
  if (inner && typeof inner === 'object') {
    const content = (inner as Record<string, unknown>).content
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content
        .map(part => {
          if (part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string') {
            return (part as Record<string, unknown>).text as string
          }
          return ''
        })
        .filter(Boolean)
        .join('\n')
    }
  }
  if (Array.isArray(record.content)) {
    return record.content
      .map(part => {
        if (part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string') {
          return (part as Record<string, unknown>).text as string
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function isAssistant(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false
  const record = message as Record<string, unknown>
  if (typeof record.role === 'string') return record.role === 'assistant'
  if (typeof record.type === 'string') return record.type === 'assistant'
  return true
}

function selectReplies(messages: unknown, all: boolean): Reply[] {
  const list: Reply[] = []
  if (Array.isArray(messages)) {
    messages.forEach((message, index) => {
      if (!isAssistant(message)) return
      const text = messageText(message)
      if (text.trim() === '') return
      list.push({ id: String(index), text })
    })
  }
  if (list.length === 0) {
    return all ? replies.slice() : replies.slice(-1)
  }
  if (all) return list.slice(-12)
  const withMath = list.filter(reply => hasMath(reply.text))
  return withMath.length > 0 ? withMath.slice(-1) : list.slice(-1)
}

function joinPath(base: string, name: string): string {
  const windows = /^[A-Za-z]:$/.test(base) || base.includes('\\')
  const separator = windows ? '\\' : '/'
  return base.replace(/[\\/]+$/, '') + separator + name
}

function escapeMarkdownSeparator(text: string): string {
  return text.replace(/\n---\n/g, '\n\n---\n\n')
}

function markdownFor(repliesToShow: Reply[], all: boolean): string {
  let text = ''
  repliesToShow.forEach((reply, index) => {
    let body = reply.text
    if (text.length + body.length > MAX_PREVIEW_CHARS) {
      body = body.slice(0, Math.max(0, MAX_PREVIEW_CHARS - text.length))
    }
    if (all && repliesToShow.length > 1) {
      text += `## Reply ${index + 1}\n\n${body}\n\n---\n\n`
    } else {
      text += body
    }
  })
  return escapeMarkdownSeparator(text.trim())
}

async function runPreview($: any, e: any): Promise<{ text: string }> {
  const all = /^(all|--all|-a)\b/i.test(String(e.args ?? '').trim())
  try {
    let messages: unknown = undefined
    try {
      messages = await $.session.messages()
    } catch {
      messages = undefined
    }
    const selected = selectReplies(messages, all)
    if (selected.length === 0) {
      return { text: 'No reply to preview yet. Ask a question first, then run /tex again.' }
    }
    const markdown = markdownFor(selected, all)
    const html = buildPreviewHtml(markdown, {
      title: all ? 'Claudetex · all replies' : 'Claudetex · latest reply',
      subtitle: all
        ? `${selected.length} replies · typeset with KaTeX in your browser`
        : 'Latest reply · typeset with KaTeX in your browser',
    })

    const windir = await $.env.get('WINDIR')
    const temp = (await $.env.get('TEMP')) ?? (await $.env.get('TMPDIR')) ?? (await $.env.get('HOME')) ?? '.'
    const suffix = Math.random().toString(36).slice(2, 8)
    const file = joinPath(temp, `claudetex-preview-${Date.now()}-${suffix}.html`)
    try {
      await $.fs.write(file, html)
    } catch (error) {
      return { text: `Could not write the preview file: ${String(error)}` }
    }

    let opened = false
    if (windir) {
      try {
        await $.process.run(['explorer.exe', file], { timeoutMs: 5000 })
        opened = true
      } catch {
        try {
          await $.process.run(['cmd', '/c', 'start', '', file], { timeoutMs: 5000 })
          opened = true
        } catch {
          opened = false
        }
      }
    } else {
      try {
        await $.process.run(['open', file], { timeoutMs: 5000 })
        opened = true
      } catch {
        try {
          await $.process.run(['xdg-open', file], { timeoutMs: 5000 })
          opened = true
        } catch {
          opened = false
        }
      }
    }

    return {
      text: opened
        ? `KaTeX preview opened in your browser: ${file}`
        : `KaTeX preview written to ${file} (open it in a browser).`,
    }
  } catch (error) {
    return { text: `Claudetex /tex failed: ${String(error)}` }
  }
}

export const register: Register = (on, options) => {
  config = {
    inline: truthy(options.inline, true),
    display: truthy(options.display, true),
    teach: truthy(options.teach_claude, true),
    maxWidth: numberValue(options.max_width, 0),
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tex',
      description: 'Open the last reply in a browser with KaTeX typesetting',
    })
    await $.command.register({
      name: 'tex-preview',
      description: 'Alias for /tex',
    })
    return next(e)
  }).catch(async ($, e, next) => next(e))

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    isTold = false
    return result
  }).catch(async ($, e, next) => next(e))

  on('session.end', ($, e, next) => {
    if ((e as { reason?: string }).reason === 'clear') {
      isTold = false
      replies.length = 0
      transformCache.clear()
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (!config.teach || isTold) return next(e)
    const surfaces = await $.session.surfaces()
    const draws = surfaces.some(surface => surface === 'terminal' || surface === 'desktop' || surface === 'vscode')
    if (!draws) return next(e)
    const result = await next({ ...e, context: [...(e.context ?? []), MATH_NOTE] })
    if (!result.drop) isTold = true
    return result
  }).catch(async ($, e, next) => next(e))

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const text = e.props.text
    if (typeof text !== 'string' || text === '') return next(e)
    remember(e.requestId, text)
    const rendered = transform(text, e.viewport?.columns)
    if (rendered === text) return next(e)
    return next({ ...e, props: { ...e.props, text: rendered } })
  })

  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    const text = e.props.text
    if (typeof text !== 'string' || text === '') return next(e)
    const rendered = transform(text, e.viewport?.columns)
    if (rendered === text) return next(e)
    return next({ ...e, props: { ...e.props, text: rendered } })
  })

  on('command.run', { command: 'tex' }, runPreview)
  on('command.run', { command: 'tex-preview' }, runPreview)
}
