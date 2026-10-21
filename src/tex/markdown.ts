import { displayTex, inlineTex } from './layout'

export type TransformOptions = {
  inline: boolean
  display: boolean
  maxWidth: number
}

export type TransformResult = {
  text: string
  changed: boolean
  count: number
}

const DISPLAY_ENVIRONMENTS = /^(equation|align|gather|multline|eqnarray)\*?$/

// A reply can be arbitrarily long; past this point leave it to Claude Code's
// renderer rather than spending time scanning it.
const MAX_SCAN_LENGTH = 200_000
const MAX_MATH_SPAN = 20_000

// Short words that occur in prose far more often than they do in math. A
// `$and$` is almost always a false positive; `$dx$` or `$sin$` are not.
const PROSE_WORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'this', 'that', 'are', 'was', 'were',
  'has', 'have', 'not', 'but', 'you', 'all', 'any', 'can', 'our', 'out',
  'its', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'is', 'of', 'to', 'in', 'on', 'at', 'by', 'as', 'or',
  'if', 'so', 'we', 'it', 'be', 'do', 'no', 'up', 'an', 'a', 'i',
])

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]<>|~#&$+\-])/g, '\\$1')
}

// `allowPadding` is for display math, where `$$ x $$` is normal. Inline math
// with leading or trailing spaces is rejected unless it has a strong math
// signal, which keeps currency and prose `$...$` from being rewritten.
function looksLikeMath(raw: string, allowPadding = false): boolean {
  const text = raw.trim()
  if (text === '' || raw.length > MAX_MATH_SPAN) return false
  const strong = /\\[A-Za-z]+|[\^_{}√∞∂∇∑∏∫≤≥≠≈±∓×÷·→←↔⇒⇔∈∉⊂⊆⊃⊇∪∩=<>+\-*/]/.test(raw)
  if (raw !== text && !allowPadding && !strong) return false
  if (strong) return true
  if (/[α-ωΑ-Ω]/.test(raw)) return true
  if (/\d\s*[+\-*/=]\s*\d/.test(raw)) return true
  if (/^[A-Za-z]$/.test(text)) return true
  if (PROSE_WORDS.has(text.toLowerCase())) return false
  if (/^[a-z][a-z0-9]{0,3}$/.test(text)) return true
  return false
}

function findInlineClose(text: string, start: number): number {
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!
    if (ch === '\\') {
      i++
      continue
    }
    if (ch === '\n') return -1
    if (ch === '$') {
      const previous = text[i - 1] ?? ''
      const next = text[i + 1] ?? ''
      if (previous !== '' && !/\s/.test(previous) && !/\d/.test(next)) return i
    }
  }
  return -1
}

function findDoubleClose(text: string, start: number): number {
  const limit = Math.min(text.length - 1, start + MAX_MATH_SPAN)
  for (let i = start; i < limit; i++) {
    if (text[i] === '\\') {
      i++
      continue
    }
    if (text[i] === '$' && text[i + 1] === '$') return i
  }
  return -1
}

function findEscapedClose(text: string, start: number, close: string): number {
  const limit = Math.min(text.length, start + MAX_MATH_SPAN)
  for (let i = start; i < limit; i++) {
    if (text[i] === '\\') {
      if (text.startsWith(close, i)) return i
      i++
      continue
    }
    if (text.startsWith(close, i)) return i
  }
  return -1
}

function findEnvironmentEnd(text: string, start: number, env: string): number {
  const close = `\\end{${env}}`
  const limit = Math.min(text.length, start + MAX_MATH_SPAN)
  for (let i = start; i < limit; i++) {
    if (text.startsWith(close, i)) return i
  }
  return -1
}

function fenceFor(lines: string[]): string {
  let length = 3
  for (const line of lines) {
    for (const run of line.match(/`+/g) ?? []) length = Math.max(length, run.length + 1)
  }
  return '`'.repeat(length)
}

function indentFor(lead: string): string {
  return lead.length <= 3 ? lead : ''
}

function displayBlock(lines: string[], indent: string): string {
  const fence = fenceFor(lines)
  const body = lines.map(line => indent + line).join('\n')
  return `${indent}${fence}\n${body}\n${indent}${fence}`
}

function skipAfterDisplay(text: string, index: number): number {
  let i = index
  while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\r')) i++
  let newlines = 0
  while (i < text.length && text[i] === '\n' && newlines < 2) {
    i++
    newlines++
  }
  return i
}

function atLineStart(text: string, index: number): boolean {
  const lineStartIndex = text.lastIndexOf('\n', index - 1) + 1
  return /^[ \t]*$/.test(text.slice(lineStartIndex, index))
}

// A code span closes only on a backtick run of exactly the same length, as
// CommonMark specifies. Searching for the raw run would close `` ` `` on the
// first backtick of a longer run and could transform math inside code.
function findBacktickClose(text: string, start: number, length: number): number {
  let i = start
  while (i < text.length) {
    const at = text.indexOf('`', i)
    if (at === -1) return -1
    let end = at
    while (text[end] === '`') end++
    if (end - at === length) return at
    i = end
  }
  return -1
}

export function transformMarkdown(text: string, options: TransformOptions): TransformResult {
  if (typeof text !== 'string') {
    return { text: String(text ?? ''), changed: false, count: 0 }
  }
  if (text === '' || (!options.inline && !options.display)) {
    return { text, changed: false, count: 0 }
  }
  if (text.length > MAX_SCAN_LENGTH) {
    return { text, changed: false, count: 0 }
  }
  // Windows input can carry CRLF; the scanner and the display fences use LF.
  text = text.replace(/\r\n?/g, '\n')

  let out = ''
  let i = 0
  let count = 0
  let lineStart = true

  const maxWidth = Number.isFinite(options.maxWidth) ? Math.max(16, options.maxWidth) : 80

  while (i < text.length) {
    // Fenced code blocks pass through untouched.
    if (lineStart) {
      const leadMatch = /^[ \t]*/.exec(text.slice(i))
      const lead = leadMatch ? leadMatch[0] : ''
      const j = i + lead.length
      const fenceMatch = /^(`{3,}|~{3,})/.exec(text.slice(j))
      if (fenceMatch) {
        const fence = fenceMatch[1]!
        const marker = fence[0]!
        const length = fence.length
        out += lead + text.slice(j, j + fence.length)
        let k = j + fence.length
        while (k < text.length) {
          const newline = text.indexOf('\n', k)
          const end = newline === -1 ? text.length : newline
          const line = text.slice(k, end)
          if (new RegExp('^ {0,3}' + marker + '{' + length + ',}[ \\t]*$').test(line)) {
            out += text.slice(k, Math.min(text.length, end + (newline === -1 ? 0 : 1)))
            k = Math.min(text.length, end + (newline === -1 ? 0 : 1))
            break
          }
          out += text.slice(k, Math.min(text.length, end + (newline === -1 ? 0 : 1)))
          k = Math.min(text.length, end + (newline === -1 ? 0 : 1))
        }
        i = k
        lineStart = i > 0 && text[i - 1] === '\n'
        continue
      }

      // Display math at the start of a line, with its indentation preserved.
      if (options.display && text.startsWith('$$', j)) {
        const close = findDoubleClose(text, j + 2)
        if (close !== -1) {
          const content = text.slice(j + 2, close)
          if (looksLikeMath(content, true)) {
            const indent = indentFor(lead)
            out += displayBlock(displayTex(content, maxWidth - indent.length), indent) + '\n\n'
            count++
            i = skipAfterDisplay(text, close + 2)
            lineStart = true
            continue
          }
        }
      }
      if (options.display && text.startsWith('\\[', j)) {
        const close = findEscapedClose(text, j + 2, '\\]')
        if (close !== -1) {
          const content = text.slice(j + 2, close)
          if (looksLikeMath(content, true)) {
            const indent = indentFor(lead)
            out += displayBlock(displayTex(content, maxWidth - indent.length), indent) + '\n\n'
            count++
            i = skipAfterDisplay(text, close + 2)
            lineStart = true
            continue
          }
        }
      }
      if (options.display && text.startsWith('\\begin{', j)) {
        const nameMatch = /^\\begin\{([^}]+)\}/.exec(text.slice(j))
        const env = nameMatch?.[1]
        if (env && DISPLAY_ENVIRONMENTS.test(env)) {
          const close = findEnvironmentEnd(text, j + nameMatch![0].length, env)
          if (close !== -1) {
            const content = text.slice(j, close + `\\end{${env}}`.length)
            const indent = indentFor(lead)
            out += displayBlock(displayTex(content, maxWidth - indent.length), indent) + '\n\n'
            count++
            i = skipAfterDisplay(text, close + `\\end{${env}}`.length)
            lineStart = true
            continue
          }
        }
      }

      out += lead
      i = j
      lineStart = false
      if (i >= text.length) break
    }

    const ch = text[i]!

    if (ch === '\n') {
      out += ch
      i++
      lineStart = true
      continue
    }

    if (ch === '`') {
      const run = /^`+/.exec(text.slice(i))?.[0] ?? '`'
      const close = findBacktickClose(text, i + run.length, run.length)
      if (close !== -1) {
        out += text.slice(i, close + run.length)
        i = close + run.length
      } else {
        out += run
        i += run.length
      }
      continue
    }

    if (ch === '\\') {
      const next = text[i + 1] ?? ''
      if (options.inline && next === '(') {
        const close = findEscapedClose(text, i + 2, '\\)')
        if (close !== -1) {
          const content = text.slice(i + 2, close)
          // `\(...\)` is unambiguous LaTeX, so surrounding spaces are fine.
          if (looksLikeMath(content, true)) {
            out += escapeMarkdown(inlineTex(content))
            count++
            i = close + 2
            continue
          }
        }
      }
      if (options.display && next === '[') {
        const close = findEscapedClose(text, i + 2, '\\]')
        if (close !== -1) {
          const content = text.slice(i + 2, close)
          if (looksLikeMath(content, true)) {
            out += '\n\n' + displayBlock(displayTex(content, maxWidth), '') + '\n\n'
            count++
            i = skipAfterDisplay(text, close + 2)
            lineStart = true
            continue
          }
        }
      }
      out += text.slice(i, i + 2)
      i += Math.min(2, text.length - i)
      lineStart = false
      continue
    }

    if (ch === '$') {
      if (text.startsWith('$$', i)) {
        if (!options.display) {
          out += '$$'
          i += 2
          continue
        }
        const close = findDoubleClose(text, i + 2)
        if (close !== -1) {
          const content = text.slice(i + 2, close)
          const displayContext = atLineStart(text, i)
          // `$$...$$` is explicit; prose-word rejection still applies.
          if (looksLikeMath(content, true)) {
            if (displayContext) {
              out += '\n\n' + displayBlock(displayTex(content, maxWidth), '') + '\n\n'
              count++
              i = skipAfterDisplay(text, close + 2)
              lineStart = true
              continue
            }
            if (options.inline) {
              out += escapeMarkdown(inlineTex(content))
              count++
              i = close + 2
              continue
            }
          }
        }
      } else if (options.inline) {
        const next = text[i + 1] ?? ''
        if (next !== '' && next !== '$' && !/\s/.test(next)) {
          const close = findInlineClose(text, i + 1)
          if (close !== -1) {
            const content = text.slice(i + 1, close)
            if (looksLikeMath(content)) {
              out += escapeMarkdown(inlineTex(content))
              count++
              i = close + 1
              continue
            }
          }
        }
      }
    }

    out += ch
    i++
  }

  return { text: out, changed: out !== text, count }
}
