import { classOf, row, type FontName, type Node } from './ast'
import { isBigOperator, parseTex } from './parser'
import {
  ENVIRONMENT_DELIMITERS,
  SUBSCRIPTS,
  SUPERSCRIPTS,
  type MathClass,
} from './symbols'

export type Block = {
  lines: string[]
  width: number
  baseline: number
}

// A formula that lays out beyond these is shown as wrapped text instead. The
// parser caps input length and nesting; these caps protect the string work.
const MAX_BLOCK_LINES = 200
const MAX_BLOCK_WIDTH = 1_000

// ---------------------------------------------------------------------------
// Width

const ZERO_WIDTH = /[̀-ͯ᪰-᫿᷀-᷿⃐-⃿︠-︯​‌‍︎️]/

function isWide(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303e) ||
    (cp >= 0x3041 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa000 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe19) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  )
}

export function charWidth(ch: string): number {
  if (ch === '') return 0
  const cp = ch.codePointAt(0) ?? 0
  if (ZERO_WIDTH.test(ch)) return 0
  return isWide(cp) ? 2 : 1
}

export function displayWidth(text: string): number {
  let width = 0
  for (const ch of text) width += charWidth(ch)
  return width
}

function padRight(text: string, width: number): string {
  const gap = width - displayWidth(text)
  return gap > 0 ? text + ' '.repeat(gap) : text
}

function padLeft(text: string, width: number): string {
  const gap = width - displayWidth(text)
  return gap > 0 ? ' '.repeat(gap) + text : text
}

function center(text: string, width: number): string {
  const gap = width - displayWidth(text)
  if (gap <= 0) return text
  const left = Math.floor(gap / 2)
  return ' '.repeat(left) + text + ' '.repeat(gap - left)
}

function trimRight(text: string): string {
  return text.replace(/[ \t]+$/u, '')
}

// ---------------------------------------------------------------------------
// Blocks

function oneLine(text: string): Block {
  return { lines: [text], width: displayWidth(text), baseline: 0 }
}

function blank(width: number, height = 1, baseline = 0): Block {
  const w = Math.max(0, width)
  const h = Math.max(1, height)
  return {
    lines: Array.from({ length: h }, () => ' '.repeat(w)),
    width: w,
    baseline: Math.max(0, Math.min(h - 1, baseline)),
  }
}

function hconcat(blocks: Block[], gap = 0): Block {
  if (blocks.length === 0) return blank(0)
  const baseline = Math.max(...blocks.map(b => b.baseline))
  const below = Math.max(...blocks.map(b => b.lines.length - b.baseline))
  const height = Math.max(1, baseline + below)
  const width = blocks.reduce((sum, b) => sum + b.width, 0) + gap * (blocks.length - 1)
  const lines = Array.from({ length: height }, () => '')
  blocks.forEach((block, index) => {
    const top = baseline - block.baseline
    for (let y = 0; y < height; y++) {
      const source = y - top
      const text = source >= 0 && source < block.lines.length ? block.lines[source]! : ''
      lines[y] += padRight(text, block.width)
      if (index < blocks.length - 1) lines[y] += ' '.repeat(gap)
    }
  })
  return { lines, width, baseline }
}

function vconcat(blocks: Block[], gap = 0): Block {
  if (blocks.length === 0) return blank(0)
  const width = Math.max(...blocks.map(b => b.width))
  const baseline = blocks[0]!.baseline
  const lines: string[] = []
  blocks.forEach((block, index) => {
    for (const line of block.lines) lines.push(center(line, width))
    if (index < blocks.length - 1 && gap > 0) lines.push(' '.repeat(width))
  })
  return { lines, width, baseline }
}

function bracketBlock(body: Block, left: string, right: string): Block {
  const width = body.width + 3
  const height = body.lines.length
  const lines = body.lines.map((line, index) => {
    const l = height === 1 ? left : index === 0 ? topOf(left) : index === height - 1 ? bottomOf(left) : middleOf(left)
    const r = height === 1 ? right : index === 0 ? topOf(right) : index === height - 1 ? bottomOf(right) : middleOf(right)
    return l + padRight(line, body.width) + ' ' + r
  })
  return { lines, width, baseline: body.baseline }
}

function topOf(delim: string): string {
  switch (delim) {
    case '(':
      return '⎛'
    case ')':
      return '⎞'
    case '[':
      return '⎡'
    case ']':
      return '⎤'
    case '{':
      return '⎧'
    case '}':
      return '⎫'
    case '|':
      return '│'
    case '‖':
      return '║'
    default:
      return delim
  }
}

function middleOf(delim: string): string {
  switch (delim) {
    case '(':
      return '⎜'
    case ')':
      return '⎟'
    case '[':
      return '⎢'
    case ']':
      return '⎥'
    case '{':
    case '}':
      return '⎪'
    case '|':
      return '│'
    case '‖':
      return '║'
    default:
      return delim
  }
}

function bottomOf(delim: string): string {
  switch (delim) {
    case '(':
      return '⎝'
    case ')':
      return '⎠'
    case '[':
      return '⎣'
    case ']':
      return '⎦'
    case '{':
      return '⎩'
    case '}':
      return '⎭'
    case '|':
      return '│'
    case '‖':
      return '║'
    default:
      return delim
  }
}

// ---------------------------------------------------------------------------
// Fonts

const DOUBLE_UPPER = '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ'
const DOUBLE_LOWER = '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫'
const SCRIPT_UPPER = '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵'
const SCRIPT_LOWER = '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏'
const FRAKTUR_UPPER = '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ'
const FRAKTUR_LOWER = '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷'
const BOLD_ITALIC_LOWER_H = 'ℎ'

const FONT_TABLES: Record<string, { upper: string[]; lower: string[]; digits: string[] }> = {
  double: { upper: Array.from(DOUBLE_UPPER), lower: Array.from(DOUBLE_LOWER), digits: Array.from('𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡') },
  script: { upper: Array.from(SCRIPT_UPPER), lower: Array.from(SCRIPT_LOWER), digits: [] },
  fraktur: { upper: Array.from(FRAKTUR_UPPER), lower: Array.from(FRAKTUR_LOWER), digits: [] },
}

function mapFont(text: string, font: FontName): string {
  if (font === 'plain') return text
  const table = FONT_TABLES[font]
  if (table) {
    let out = ''
    for (const ch of text) {
      const code = ch.codePointAt(0) ?? 0
      if (code >= 65 && code <= 90) out += table.upper[code - 65] ?? ch
      else if (code >= 97 && code <= 122) out += table.lower[code - 97] ?? ch
      else if (table.digits.length > 0 && code >= 48 && code <= 57) out += table.digits[code - 48] ?? ch
      else out += ch
    }
    return out
  }
  let out = ''
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    switch (font) {
      case 'bold':
        if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d400 + code - 65)
        else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d41a + code - 97)
        else if (code >= 48 && code <= 57) out += String.fromCodePoint(0x1d7ce + code - 48)
        else out += ch
        break
      case 'italic':
        if (ch === 'h') out += BOLD_ITALIC_LOWER_H
        else if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d434 + code - 65)
        else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d44e + code - 97)
        else out += ch
        break
      case 'bolditalic':
        if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d468 + code - 65)
        else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d482 + code - 97)
        else out += ch
        break
      case 'sans':
        if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d5a0 + code - 65)
        else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d5ba + code - 97)
        else if (code >= 48 && code <= 57) out += String.fromCodePoint(0x1d7e2 + code - 48)
        else out += ch
        break
      case 'sansbold':
        if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d5d4 + code - 65)
        else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d5ee + code - 97)
        else if (code >= 48 && code <= 57) out += String.fromCodePoint(0x1d7ec + code - 48)
        else out += ch
        break
      case 'mono':
        if (code >= 65 && code <= 90) out += String.fromCodePoint(0x1d670 + code - 65)
        else if (code >= 97 && code <= 122) out += String.fromCodePoint(0x1d68a + code - 97)
        else if (code >= 48 && code <= 57) out += String.fromCodePoint(0x1d7f6 + code - 48)
        else out += ch
        break
      default:
        out += ch
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Inline rendering

function joinItems(items: Node[], render: (node: Node) => string): string {
  let out = ''
  let previous: Node | null = null
  for (const item of items) {
    if (item.type === 'newline') {
      out += ' '
      continue
    }
    const rendered = render(item)
    if (rendered === '') continue
    if (previous && needsSpace(previous, item) && !out.endsWith(' ') && !rendered.startsWith(' ')) out += ' '
    out += rendered
    if (item.type !== 'space') previous = item
  }
  return out
}

function needsSpace(previous: Node, current: Node): boolean {
  const p = classOf(previous)
  const n = classOf(current)
  if (p === 'space' || n === 'space') return false
  if (n === 'bin' || n === 'rel') {
    return !(p === 'open' || p === 'bin' || p === 'rel' || p === 'op' || p === 'punct')
  }
  if (p === 'bin' || p === 'rel') {
    return n !== 'close' && n !== 'punct'
  }
  if (p === 'punct') return n !== 'close' && n !== 'punct'
  if (p === 'op' && (n === 'ord' || n === 'op')) return true
  if (p === 'ord' && n === 'op') return true
  if (p === 'close' && n === 'op') return true
  return false
}

function needsParens(text: string): boolean {
  if (text.length <= 1) return false
  let depth = 0
  let first = true
  for (const ch of text) {
    if (first && (ch === '−' || ch === '-')) {
      first = false
      continue
    }
    first = false
    if ('([{⟨⌊⌈'.includes(ch)) depth++
    else if (')]}⟩⌋⌉'.includes(ch)) depth--
    else if (depth === 0 && /[+\-−=<>≤≥≠≈×·÷∓±]/u.test(ch)) return true
    else if (depth === 0 && ch === ' ') return true
  }
  return false
}

function inlineFrac(node: Extract<Node, { type: 'frac' }>): string {
  const num = renderInline(node.num)
  const den = renderInline(node.den)
  if (!node.bar) return `C(${num}, ${den})`
  const left = needsParens(num) ? `(${num})` : num
  const right = needsParens(den) ? `(${den})` : den
  return `${left}/${right}`
}

function mapScript(text: string, table: Record<string, string>): string | null {
  let out = ''
  for (const ch of text) {
    const mapped = table[ch]
    if (mapped === undefined) return null
    out += mapped
  }
  return out
}

function compactScript(text: string): string {
  return text.replace(/\s+/g, '')
}

function inlineScript(node: Extract<Node, { type: 'script' }>): string {
  const base = renderInline(node.base)
  if (node.sup && node.sub) {
    const supText = renderInline(node.sup)
    const subText = renderInline(node.sub)
    const sup = mapScript(compactScript(supText), SUPERSCRIPTS)
    const sub = mapScript(compactScript(subText), SUBSCRIPTS)
    if (sup !== null && sub !== null) return base + sub + sup
    return `${base}_(${subText})^(${supText})`
  }
  if (node.sup) {
    const text = renderInline(node.sup)
    const sup = mapScript(compactScript(text), SUPERSCRIPTS)
    if (sup !== null) return base + sup
    return `${base}^(${text})`
  }
  if (node.sub) {
    const text = renderInline(node.sub)
    const sub = mapScript(compactScript(text), SUBSCRIPTS)
    if (sub !== null) return base + sub
    return `${base}_(${text})`
  }
  return base
}

function inlineEnv(node: Extract<Node, { type: 'env' }>): string {
  const rows = node.rows.map(cells => cells.map(cell => renderInline(row(cell))).join('  '))
  if (node.env === 'cases' || node.env === 'dcases' || node.env === 'rcases') {
    return `{ ${rows.join('; ')} }`
  }
  if (node.env === 'aligned' || node.env === 'align' || node.env === 'align*' || node.env === 'split') {
    return rows.join('; ')
  }
  const [left, right] = ENVIRONMENT_DELIMITERS[node.env] ?? ['', '']
  return `${left}${rows.join('; ')}${right}`
}

function renderInline(node: Node): string {
  switch (node.type) {
    case 'row':
      return joinItems(node.items, renderInline)
    case 'sym':
    case 'text':
      return node.text
    case 'space':
      return ' '.repeat(node.width)
    case 'frac':
      return inlineFrac(node)
    case 'sqrt': {
      const body = renderInline(node.body)
      const index = node.index ? mapScript(renderInline(node.index), SUPERSCRIPTS) : null
      const prefix = index ?? ''
      return `${prefix}√(${body})`
    }
    case 'script':
      return inlineScript(node)
    case 'accent':
      return combine(renderInline(node.body), node.mark)
    case 'boxed':
      return `[${renderInline(node.body)}]`
    case 'styled':
      return mapFont(renderInline(node.body), node.font)
    case 'env':
      return inlineEnv(node)
    case 'newline':
      return ' '
    case 'phantom':
      return ' '.repeat(displayWidth(renderInline(node.body)))
  }
}

function combine(text: string, mark: string): string {
  let out = ''
  for (const ch of text) {
    out += ch === ' ' ? ch : ch + mark
  }
  return out
}

// ---------------------------------------------------------------------------
// Display rendering

function renderRowBlock(items: Node[]): Block {
  const groups: Node[][] = [[]]
  for (const item of items) {
    if (item.type === 'newline') groups.push([])
    else groups[groups.length - 1]!.push(item)
  }
  if (groups.length > 1) return vconcat(groups.map(group => renderRowBlock(group)))
  const blocks: Block[] = []
  let previous: Node | null = null
  for (const item of items) {
    if (item.type === 'space') {
      if (item.width > 0) blocks.push(oneLine(' '.repeat(item.width)))
      continue
    }
    const block = renderBlock(item)
    if (previous && needsSpace(previous, item) && blocks.length > 0) {
      const last = blocks[blocks.length - 1]!
      const lastLine = last.lines[last.baseline] ?? ''
      if (!lastLine.endsWith(' ') && !(block.lines[block.baseline] ?? '').startsWith(' ')) {
        blocks.push(oneLine(' '))
      }
    }
    blocks.push(block)
    previous = item
  }
  return hconcat(blocks)
}

function renderFracBlock(node: Extract<Node, { type: 'frac' }>): Block {
  if (!node.bar) {
    return oneLine(`C(${renderInline(node.num)}, ${renderInline(node.den)})`)
  }
  const num = renderBlock(node.num)
  const den = renderBlock(node.den)
  const inner = Math.max(1, num.width, den.width)
  const width = inner + 2
  const lines: string[] = []
  for (const line of num.lines) lines.push(' ' + center(line, inner) + ' ')
  lines.push(' ' + '─'.repeat(inner) + ' ')
  for (const line of den.lines) lines.push(' ' + center(line, inner) + ' ')
  return { lines, width, baseline: num.lines.length }
}

function renderSqrtBlock(node: Extract<Node, { type: 'sqrt' }>): Block {
  const body = renderBlock(node.body)
  const index = node.index ? mapScript(renderInline(node.index), SUPERSCRIPTS) : ''
  const head = oneLine(`${index ?? ''}√`)
  if (body.lines.length === 1) {
    const inner = body.lines[0] ?? ''
    if (displayWidth(inner) <= 1) return hconcat([head, body])
    return oneLine(`${index ?? ''}√(${inner.trimEnd()})`)
  }
  return hconcat([head, bracketBlock(body, '(', ')')])
}

function isBigOpBase(node: Node): boolean {
  if (isBigOperator(node)) return true
  if (node.type === 'row' && node.items.length === 1) return isBigOpBase(node.items[0]!)
  if (node.type === 'styled') return isBigOpBase(node.body)
  return false
}

function sideScripts(base: Block, sup: Block | null, sub: Block | null): Block {
  if (!sup && !sub) return base
  const scriptWidth = Math.max(sup?.width ?? 0, sub?.width ?? 0)
  const supHeight = sup?.lines.length ?? 0
  const subHeight = sub?.lines.length ?? 0
  const height = supHeight + base.lines.length + subHeight
  const baseline = supHeight + base.baseline
  const width = base.width + scriptWidth
  const lines = Array.from({ length: height }, () => ' '.repeat(base.width))
  for (let y = 0; y < base.lines.length; y++) {
    lines[supHeight + y] = base.lines[y] ?? ''
  }
  if (sup) {
    for (let y = 0; y < sup.lines.length; y++) {
      lines[y] = ' '.repeat(base.width) + padLeft(sup.lines[y] ?? '', scriptWidth)
    }
  }
  if (sub) {
    for (let y = 0; y < sub.lines.length; y++) {
      lines[supHeight + base.lines.length + y] =
        ' '.repeat(base.width) + padLeft(sub.lines[y] ?? '', scriptWidth)
    }
  }
  return { lines, width, baseline }
}

function renderScriptBlock(node: Extract<Node, { type: 'script' }>): Block {
  const base = renderBlock(node.base)
  const sup = node.sup ? renderBlock(node.sup) : null
  const sub = node.sub ? renderBlock(node.sub) : null
  if (!sup && !sub) return base

  // Sums, products and friends put their limits above and below.
  if (isBigOpBase(node.base) && node.limits !== false && base.lines.length === 1) {
    const symbol = stripInline(node.base)
    const wantsLimits = symbol !== '∫' && symbol !== '∬' && symbol !== '∭' && symbol !== '∮'
    if (wantsLimits) {
      const width = Math.max(base.width, sup?.width ?? 0, sub?.width ?? 0)
      const lines: string[] = []
      if (sup) for (const line of sup.lines) lines.push(center(compactScript(line), width))
      lines.push(center(base.lines[0] ?? '', width))
      if (sub) for (const line of sub.lines) lines.push(center(compactScript(line), width))
      return { lines, width, baseline: sup?.lines.length ?? 0 }
    }
  }

  // A one-line base with one-line scripts can stay on the baseline when the
  // Unicode small letters cover every character.
  if (base.lines.length === 1 && (!sup || sup.lines.length === 1) && (!sub || sub.lines.length === 1)) {
    const supText = sup ? mapScript(compactScript(sup.lines[0] ?? ''), SUPERSCRIPTS) : ''
    const subText = sub ? mapScript(compactScript(sub.lines[0] ?? ''), SUBSCRIPTS) : ''
    if ((!sup || supText !== null) && (!sub || subText !== null)) {
      const text = (base.lines[0] ?? '') + (subText ?? '') + (supText ?? '')
      return oneLine(text)
    }
  }

  return sideScripts(base, sup, sub)
}

function stripInline(node: Node): string {
  return renderInline(node)
}

function renderAccentBlock(node: Extract<Node, { type: 'accent' }>): Block {
  const body = renderBlock(node.body)
  const lines = body.lines.map(line => combine(line, node.mark))
  const width = Math.max(...lines.map(displayWidth))
  return { lines, width, baseline: body.baseline }
}

function renderBoxedBlock(node: Extract<Node, { type: 'boxed' }>): Block {
  const body = renderBlock(node.body)
  const width = body.width + 2
  const lines = ['┌' + '─'.repeat(body.width) + '┐']
  for (const line of body.lines) lines.push('│' + padRight(line, body.width) + '│')
  lines.push('└' + '─'.repeat(body.width) + '┘')
  return { lines, width, baseline: body.baseline + 1 }
}

function renderStyledBlock(node: Extract<Node, { type: 'styled' }>): Block {
  const body = renderBlock(node.body)
  const lines = body.lines.map(line => mapFont(line, node.font))
  const width = Math.max(...lines.map(displayWidth))
  return { lines, width, baseline: body.baseline }
}

function renderEnvBlock(node: Extract<Node, { type: 'env' }>): Block {
  const env = node.env
  if (env === 'aligned' || env === 'align' || env === 'align*' || env === 'split' || env === 'eqnarray' || env === 'eqnarray*') {
    return renderAligned(node.rows, false)
  }
  if (env === 'gathered' || env === 'gather' || env === 'gather*') {
    return renderAligned(node.rows, true)
  }
  if (env === 'multline' || env === 'multline*') {
    return renderMultline(node.rows)
  }
  if (env === 'cases' || env === 'dcases' || env === 'rcases') {
    return renderCases(node.rows, env)
  }
  return renderGrid(node.rows, env)
}

function cellBlocks(cells: Node[][]): Block[] {
  return cells.map(cell => renderBlock(row(cell)))
}

function rowGeometry(blocks: Block[]): { height: number; baseline: number } {
  const baseline = Math.max(...blocks.map(b => b.baseline), 0)
  const below = Math.max(...blocks.map(b => b.lines.length - b.baseline), 1)
  return { height: Math.max(1, baseline + below), baseline }
}

function placeCell(block: Block, rowBaseline: number, height: number, align: 'left' | 'center' | 'right'): string[] {
  const top = rowBaseline - block.baseline
  const lines: string[] = []
  for (let y = 0; y < height; y++) {
    const src = y - top
    const text = src >= 0 && src < block.lines.length ? block.lines[src]! : ''
    if (align === 'right') lines.push(padLeft(text, block.width))
    else if (align === 'center') lines.push(center(text, block.width))
    else lines.push(padRight(text, block.width))
  }
  return lines
}

function renderGrid(rows: Node[][][], env: string): Block {
  const rendered = rows.map(cellBlocks)
  const columns = Math.max(1, ...rendered.map(r => r.length))
  const widths = Array.from({ length: columns }, (_, c) => Math.max(0, ...rendered.map(r => r[c]?.width ?? 0)))
  const contentLines: string[] = []
  let firstBaseline = 0
  let firstRow = true

  for (const cells of rendered) {
    const { height, baseline } = rowGeometry(cells)
    if (firstRow) {
      firstBaseline = baseline
      firstRow = false
    }
    if (cells.length === 0) {
      contentLines.push(' '.repeat(widths.reduce((a, b) => a + b, 0) + 2 * (columns - 1)))
      continue
    }
    const placed = cells.map((block, c) => placeCell(block, baseline, height, 'center'))
    for (let y = 0; y < height; y++) {
      const parts: string[] = []
      for (let c = 0; c < columns; c++) {
        parts.push(padRight(placed[c]?.[y] ?? '', widths[c]!))
      }
      contentLines.push(parts.join('  '))
    }
  }

  const contentWidth = widths.reduce((a, b) => a + b, 0) + 2 * Math.max(0, columns - 1)
  const [left, right] = ENVIRONMENT_DELIMITERS[env] ?? ['', '']
  if (!left && !right) {
    return { lines: contentLines, width: contentWidth, baseline: firstBaseline }
  }
  const width = contentWidth + 2 + (left ? 1 : 0) + (right ? 1 : 0)
  const lines = contentLines.map((line, index) => {
    const l = delimiterAt(left, index, contentLines.length)
    const r = delimiterAt(right, index, contentLines.length)
    return l + ' ' + padRight(line, contentWidth) + ' ' + r
  })
  return { lines, width, baseline: firstBaseline }
}

function delimiterAt(delim: string, index: number, height: number): string {
  if (!delim) return ''
  if (height === 1) return delim
  if (index === 0) return topOf(delim)
  if (index === height - 1) return bottomOf(delim)
  return middleOf(delim)
}

function renderAligned(rows: Node[][][], centered: boolean): Block {
  const rendered = rows.map(cellBlocks)
  const columns = Math.max(1, ...rendered.map(r => r.length))
  const widths = Array.from({ length: columns }, (_, c) => Math.max(0, ...rendered.map(r => r[c]?.width ?? 0)))
  const lines: string[] = []
  let firstBaseline = 0
  let firstRow = true

  for (const cells of rendered) {
    const { height, baseline } = rowGeometry(cells)
    if (firstRow) {
      firstBaseline = baseline
      firstRow = false
    }
    const placed = cells.map((block, c) =>
      placeCell(block, baseline, height, centered ? 'center' : c === 0 ? 'right' : 'left'),
    )
    for (let y = 0; y < height; y++) {
      const parts: string[] = []
      for (let c = 0; c < columns; c++) {
        const text = centered ? placed[c]?.[y] ?? '' : (placed[c]?.[y] ?? '').trimStart()
        parts.push(padRight(text, widths[c]!))
      }
      lines.push(parts.join(' '))
    }
  }
  const width = Math.max(0, ...lines.map(displayWidth))
  return { lines, width, baseline: firstBaseline }
}

function renderMultline(rows: Node[][][]): Block {
  const rendered = rows.map(cellBlocks)
  const lines: string[] = []
  let firstBaseline = 0
  const all: Block[] = []
  for (const cells of rendered) {
    const block = cells.length === 1 ? cells[0]! : hconcat(cells, 2)
    all.push(block)
    if (all.length === 1) firstBaseline = block.baseline
  }
  const width = Math.max(0, ...all.map(b => b.width))
  all.forEach((block, index) => {
    const align = index === 0 ? 'left' : index === all.length - 1 && all.length > 1 ? 'right' : 'center'
    for (const line of block.lines) {
      lines.push(align === 'left' ? padRight(line, width) : align === 'right' ? padLeft(line, width) : center(line, width))
    }
  })
  return { lines, width, baseline: firstBaseline }
}

function renderCases(rows: Node[][][], env: string): Block {
  const rendered = rows.map(cellBlocks)
  const columns = Math.max(1, ...rendered.map(r => r.length))
  const widths = Array.from({ length: columns }, (_, c) => Math.max(0, ...rendered.map(r => r[c]?.width ?? 0)))
  const lines: string[] = []
  let firstBaseline = 0
  let firstRow = true
  for (const cells of rendered) {
    const { height, baseline } = rowGeometry(cells)
    if (firstRow) {
      firstBaseline = baseline
      firstRow = false
    }
    const placed = cells.map(block => placeCell(block, baseline, height, 'left'))
    for (let y = 0; y < height; y++) {
      const parts: string[] = []
      for (let c = 0; c < columns; c++) parts.push(padRight(placed[c]?.[y] ?? '', widths[c]!))
      lines.push(parts.join('  '))
    }
  }
  const contentWidth = Math.max(0, ...lines.map(displayWidth))
  const width = contentWidth + 4
  const withBrackets = lines.map((line, index) => {
    const l = env === 'rcases' ? ' ' : index === 0 ? '⎧' : index === lines.length - 1 ? '⎩' : '⎪'
    const r = env === 'rcases' ? (index === 0 ? '⎫' : index === lines.length - 1 ? '⎭' : '⎪') : ' '
    return l + ' ' + padRight(line, contentWidth) + ' ' + r
  })
  return { lines: withBrackets, width, baseline: firstBaseline }
}

function renderBlock(node: Node): Block {
  switch (node.type) {
    case 'row':
      return renderRowBlock(node.items)
    case 'sym':
    case 'text':
      return oneLine(node.text)
    case 'space':
      return blank(node.width)
    case 'frac':
      return renderFracBlock(node)
    case 'sqrt':
      return renderSqrtBlock(node)
    case 'script':
      return renderScriptBlock(node)
    case 'accent':
      return renderAccentBlock(node)
    case 'boxed':
      return renderBoxedBlock(node)
    case 'styled':
      return renderStyledBlock(node)
    case 'env':
      return renderEnvBlock(node)
    case 'newline':
      return blank(0)
    case 'phantom':
      return blank(displayWidth(renderInline(node.body)))
  }
}

// ---------------------------------------------------------------------------
// Public API

function wrap(text: string, width: number): string[] {
  if (width <= 0) return [text]
  const lines: string[] = []
  let line = ''
  const pushLine = () => {
    if (line !== '') {
      lines.push(trimRight(line))
      line = ''
    }
  }

  for (const token of text.split(/(\s+)/)) {
    if (token === '') continue
    let remaining = token
    while (remaining !== '') {
      if (displayWidth(line + remaining) <= width) {
        line += remaining
        break
      }
      if (line !== '') {
        pushLine()
        continue
      }
      // The token itself is wider than the line: cut it at a code point.
      let chunk = ''
      for (const ch of remaining) {
        if (chunk !== '' && displayWidth(chunk + ch) > width) break
        chunk += ch
      }
      if (chunk === '') chunk = remaining[0] ?? ''
      lines.push(trimRight(chunk))
      remaining = remaining.slice(chunk.length)
    }
  }
  pushLine()
  return lines.length > 0 ? lines : ['']
}

export function renderInlineTree(node: Node): string {
  return renderInline(node)
}

export function renderDisplayTree(node: Node, maxWidth = 80): string[] {
  const width = Number.isFinite(maxWidth) ? Math.max(12, maxWidth) : 80
  let block: Block
  try {
    block = renderBlock(node)
  } catch {
    return wrap(renderInline(node), width)
  }
  if (block.width > MAX_BLOCK_WIDTH || block.lines.length > MAX_BLOCK_LINES || block.width > width) {
    return wrap(renderInline(node), width)
  }
  const target = Math.min(width, Math.max(block.width + 8, 32))
  const lines = block.lines.map(line => trimRight(center(trimRight(line), target)))
  return lines.length > 0 ? lines : ['']
}

export function inlineTex(tex: string): string {
  if (typeof tex !== 'string') return ''
  try {
    return renderInline(parseTex(tex)).replace(/[\r\n]+/g, ' ').trim()
  } catch {
    return tex.replace(/\s+/g, ' ').trim()
  }
}

export function displayTex(tex: string, maxWidth = 80): string[] {
  if (typeof tex !== 'string') return ['']
  const width = Number.isFinite(maxWidth) ? Math.max(12, maxWidth) : 80
  try {
    return renderDisplayTree(parseTex(tex), width)
  } catch {
    return wrap(tex.replace(/\s+/g, ' ').trim(), width)
  }
}
