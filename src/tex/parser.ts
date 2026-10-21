import {
  ACCENTS,
  BIG_OPERATORS,
  BINOMIALS,
  CHAR_CLASSES,
  DELIMITER_SIZES,
  ENVIRONMENTS,
  FRACTIONS,
  FUNCTIONS,
  FONT_COMMANDS,
  IGNORED,
  NEGATED,
  SKIP_ARGUMENT,
  SPACES,
  STACKS,
  STYLE_COMMANDS,
  SYMBOLS,
  TEXT_COMMANDS,
  type MathClass,
} from './symbols'
import { classOf, row, simpleText, type EnvRow, type FontName, type Node } from './ast'

type Stop = {
  group?: boolean
  amp?: boolean
  newline?: boolean
  end?: boolean
}

const NEWLINE = '\\\\'

// A reply can contain anything; these caps keep a malformed or hostile formula
// from turning into unbounded work. Real formulas are far below them.
const MAX_TEX_LENGTH = 8_000
const MAX_DEPTH = 64

class TexLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TexLimitError'
  }
}

function sym(text: string, cls: MathClass = 'ord'): Node {
  return { type: 'sym', text, cls }
}

function textNode(text: string, cls: MathClass = 'ord'): Node {
  return { type: 'text', text, cls }
}

function space(width = 1): Node {
  return { type: 'space', width }
}

function isLetter(ch: string): boolean {
  return /[A-Za-z]/.test(ch)
}

function isSpace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v'
}

export class Parser {
  private i = 0
  private depth = 0
  private readonly s: string

  constructor(tex: string) {
    this.s = tex
  }

  parse(): Node {
    if (this.s.length > MAX_TEX_LENGTH) {
      throw new TexLimitError(`TeX formula is longer than ${MAX_TEX_LENGTH} characters`)
    }
    const items = this.parseRow({})
    return row(items)
  }

  private enter(): void {
    if (this.depth >= MAX_DEPTH) {
      throw new TexLimitError(`TeX expression is nested more than ${MAX_DEPTH} levels deep`)
    }
    this.depth++
  }

  private leave(): void {
    this.depth--
  }

  private eof(): boolean {
    return this.i >= this.s.length
  }

  private peek(offset = 0): string {
    return this.s[this.i + offset] ?? ''
  }

  private nextChar(): string {
    const cp = this.s.codePointAt(this.i)
    if (cp === undefined) return ''
    const ch = String.fromCodePoint(cp)
    this.i += ch.length
    return ch
  }

  private skipTrivia(): void {
    while (!this.eof()) {
      const ch = this.peek()
      if (isSpace(ch)) {
        this.i++
      } else if (ch === '%') {
        while (!this.eof() && this.peek() !== '\n') this.i++
      } else {
        break
      }
    }
  }

  private parseRow(stop: Stop): Node[] {
    this.enter()
    try {
      const out: Node[] = []
      while (!this.eof()) {
        const before = this.i
        this.skipTrivia()
        if (this.eof()) break
        const ch = this.peek()
        if (ch === '}' && stop.group) break
        if (ch === '&' && stop.amp) break
        if (ch === '\\') {
          const name = this.peekCommandName()
          if (name === NEWLINE && stop.newline) break
          if (name === 'end' && stop.end) break
        }
        if (ch === '^' || ch === '_') {
          this.i++
          const arg = this.parseArg()
          this.attach(out, ch === '^' ? 'sup' : 'sub', arg)
          continue
        }
        if (ch === "'") {
          while (this.peek() === "'") {
            this.i++
            this.attach(out, 'sup', sym('′'))
          }
          continue
        }
        if (ch === '&') {
          this.i++
          out.push(space(1))
          continue
        }
        if (ch === '~') {
          this.i++
          out.push(space(1))
          continue
        }
        const nodes = this.parseAtom()
        for (const node of nodes) out.push(node)
        // Every branch above consumes something, but a malformed command must
        // never leave the cursor in place and spin this loop forever.
        if (this.i === before) this.i++
      }
      this.normalize(out)
      return out
    } finally {
      this.leave()
    }
  }

  private parseAtom(): Node[] {
    const ch = this.peek()
    if (ch === '{') {
      this.i++
      const items = this.parseRow({ group: true })
      if (this.peek() === '}') this.i++
      return [row(items)]
    }
    if (ch === '}') {
      this.i++
      return []
    }
    if (ch === '\\') return this.parseCommand()
    return [charNode(this.nextChar())]
  }

  private attach(out: Node[], mark: 'sup' | 'sub', arg: Node): void {
    let index = out.length - 1
    while (index >= 0 && out[index]!.type === 'space') index--
    if (index < 0) {
      const base = sym('')
      out.push(mark === 'sup' ? { type: 'script', base, sup: arg } : { type: 'script', base, sub: arg })
      return
    }
    const base = out[index]!
    if (base.type === 'script') {
      if (mark === 'sup') base.sup = arg
      else base.sub = arg
      return
    }
    const script: Node = mark === 'sup' ? { type: 'script', base, sup: arg } : { type: 'script', base, sub: arg }
    out[index] = script
  }

  private parseArg(): Node {
    this.skipTrivia()
    if (this.eof()) return sym('')
    if (this.peek() === '{') {
      this.i++
      const items = this.parseRow({ group: true })
      if (this.peek() === '}') this.i++
      return row(items)
    }
    if (this.peek() === '\\') {
      const nodes = this.parseCommand()
      return row(nodes)
    }
    return charNode(this.nextChar())
  }

  private parseCommand(): Node[] {
    if (this.peek() !== '\\') return []
    this.enter()
    try {
      return this.parseCommandBody()
    } finally {
      this.leave()
    }
  }

  private parseCommandBody(): Node[] {
    const name = this.readCommandName()

    if (name === NEWLINE) return [{ type: 'newline' }]
    if (name === 'cr' || name === 'newline') return [{ type: 'newline' }]
    if (name === 'end') {
      // A stray \end{...} outside an environment: consume its name.
      this.readRawGroup()
      return []
    }
    if (name === 'begin') return [this.parseEnvironment()]
    if (name === 'left' || name === 'right' || name === 'middle' || DELIMITER_SIZES.has(name)) {
      const delim = this.readDelimiter()
      if (!delim) return []
      if (delim.type === 'sym') {
        if (name === 'left') delim.cls = 'open'
        else if (name === 'right') delim.cls = 'close'
        else if (name === 'middle') delim.cls = 'ord'
      }
      return [delim]
    }
    if (name === 'operatorname') {
      if (this.peek() === '*') this.i++
      const value = this.readRawGroup()
      return [textNode(unescapeText(value), 'op')]
    }
    if (TEXT_COMMANDS.has(name)) {
      if (name === 'hspace') {
        this.readRawGroup()
        return [space(1)]
      }
      return [textNode(unescapeText(this.readRawGroup()))]
    }
    if (name === 'texttip' || name === 'mathtip') {
      const part = this.parseArg()
      this.skipTrivia()
      if (this.peek() === '{') this.readRawGroup()
      else if (this.peek() === '\\') this.parseCommand()
      return [part]
    }
    if (name === 'color') {
      this.readRawGroup()
      return []
    }
    if (name === 'textcolor' || name === 'colorbox') {
      this.readRawGroup()
      return [this.parseArg()]
    }
    if (name === 'fcolorbox') {
      this.readRawGroup()
      this.readRawGroup()
      return [this.parseArg()]
    }
    if (name === 'phantom' || name === 'hphantom' || name === 'vphantom') {
      if (name === 'vphantom') {
        this.parseArg()
        return []
      }
      return [{ type: 'phantom', body: this.parseArg() }]
    }
    if (name === 'not') {
      const arg = this.parseArg()
      const value = simpleText(arg)
      if (value !== null && NEGATED[value] !== undefined) return [sym(NEGATED[value]!, 'rel')]
      return [sym('¬'), arg]
    }
    if (name === 'pmod') {
      const arg = this.parseArg()
      return [textNode('(mod '), arg, textNode(')')]
    }
    if (name === 'bmod' || name === 'mod') return [space(1), textNode('mod'), space(1)]
    if (FRACTIONS.has(name)) {
      const num = this.parseArg()
      const den = this.parseArg()
      return [{ type: 'frac', num, den, bar: true }]
    }
    if (BINOMIALS.has(name)) {
      const num = this.parseArg()
      const den = this.parseArg()
      return [{ type: 'frac', num, den, bar: false }]
    }
    if (STACKS.has(name)) {
      const top = this.parseArg()
      const base = this.parseArg()
      return [name === 'underset' ? { type: 'script', base, sub: top } : { type: 'script', base, sup: top }]
    }
    if (name === 'sqrt') {
      const bracket = this.readRawBracket()
      const body = this.parseArg()
      if (bracket !== null) {
        const index = new Parser(bracket).parse()
        return [{ type: 'sqrt', index, body }]
      }
      return [{ type: 'sqrt', body }]
    }
    if (ACCENTS[name] !== undefined) {
      return [{ type: 'accent', mark: ACCENTS[name]!, body: this.parseArg() }]
    }
    if (FONT_COMMANDS.has(name)) {
      return [{ type: 'styled', font: fontOf(name), body: this.parseArg() }]
    }
    if (name === 'boxed') return [{ type: 'boxed', body: this.parseArg() }]
    if (name === 'cancel' || name === 'bcancel' || name === 'xcancel' || name === 'sout') {
      return [this.parseArg()]
    }
    if (name === 'underline') return [{ type: 'accent', mark: '̲', body: this.parseArg() }]
    if (name === 'overline') return [{ type: 'accent', mark: '̅', body: this.parseArg() }]
    if (name === 'underbrace') return [this.parseArg(), sym('⏟')]
    if (name === 'overbrace') return [sym('⏞'), this.parseArg()]

    const symbol = SYMBOLS.get(name)
    if (symbol) return [sym(symbol.text, symbol.cls)]
    if (SPACES[name] !== undefined) return [space(SPACES[name]!.length)]
    if (FUNCTIONS.has(name)) return [textNode(name, 'op')]
    if (IGNORED.has(name)) return []
    if (SKIP_ARGUMENT.has(name)) {
      this.readRawGroup()
      return []
    }
    // Unknown commands stay readable rather than disappearing.
    return [textNode(name)]
  }

  private readCommandName(): string {
    if (this.peek() !== '\\') return ''
    this.i++
    if (this.peek() === '\\') {
      this.i++
      return NEWLINE
    }
    const ch = this.peek()
    if (ch === '') return ''
    if (isLetter(ch)) {
      const start = this.i
      while (isLetter(this.peek())) this.i++
      return this.s.slice(start, this.i)
    }
    return this.nextChar()
  }

  private peekCommandName(): string {
    const save = this.i
    const name = this.readCommandName()
    this.i = save
    return name
  }

  private readDelimiter(): Node | null {
    this.skipTrivia()
    if (this.eof()) return null
    if (this.peek() === '.') {
      this.i++
      return null
    }
    if (this.peek() === '\\') {
      const name = this.readCommandName()
      if (name === '.') return null
      const symbol = SYMBOLS.get(name)
      if (symbol) return sym(symbol.text, symbol.cls)
      if (name.length === 1) return charNode(name)
      return sym(name)
    }
    return charNode(this.nextChar())
  }

  private readRawGroup(): string {
    this.skipTrivia()
    if (this.peek() !== '{') {
      if (this.eof()) return ''
      return this.nextChar()
    }
    this.i++
    const start = this.i
    let depth = 1
    while (!this.eof()) {
      const ch = this.peek()
      if (ch === '\\') {
        this.i += 2
        continue
      }
      if (ch === '{') depth++
      if (ch === '}') {
        depth--
        if (depth === 0) {
          const value = this.s.slice(start, this.i)
          this.i++
          return value
        }
      }
      this.i++
    }
    return this.s.slice(start)
  }

  private readRawBracket(): string | null {
    this.skipTrivia()
    if (this.peek() !== '[') return null
    this.i++
    const start = this.i
    while (!this.eof() && this.peek() !== ']') this.i++
    const value = this.s.slice(start, this.i)
    if (this.peek() === ']') this.i++
    return value
  }

  private parseEnvironment(): Node {
    const env = this.readRawGroup().trim()
    let spec: string | undefined
    if (env === 'array' || env === 'subarray') spec = this.readRawGroup()
    if (env === 'alignedat' || env === 'alignat') spec = this.readRawGroup()
    if (env === 'aligned' || env === 'gathered' || env === 'split' || env === 'alignedat') {
      this.readRawBracket()
    }
    const rows: EnvRow[] = []
    let cells: Node[][] = []

    while (!this.eof()) {
      this.skipTrivia()
      if (this.eof()) break
      if (this.peekCommandName() === 'end') {
        const save = this.i
        this.readCommandName()
        const closing = this.readRawGroup().trim()
        if (closing === env) {
          rows.push(cells)
          return finish()
        }
        this.i = save
      }
      const cell = this.parseRow({ amp: true, newline: true, end: true })
      cells.push(cell)
      this.skipTrivia()
      if (this.peek() === '&') {
        this.i++
        continue
      }
      const next = this.peekCommandName()
      if (next === NEWLINE) {
        this.readCommandName()
        this.readRawBracket()
        rows.push(cells)
        cells = []
        continue
      }
      if (next === 'cr') {
        this.readCommandName()
        this.readRawBracket()
        rows.push(cells)
        cells = []
        continue
      }
      if (next === 'end') {
        this.readCommandName()
        this.readRawGroup()
        rows.push(cells)
        return finish()
      }
      // Not a separator: treat it as the end of the environment at EOF.
      rows.push(cells)
      return finish()
    }
    rows.push(cells)
    return finish()

    function finish(): Node {
      const cleaned = rows.filter(r => r.length > 1 || r.some(c => c.length > 0))
      return { type: 'env', env, rows: cleaned, spec }
    }
  }

  private normalize(items: Node[]): void {
    let previous: Node | null = null
    for (let i = 0; i < items.length; i++) {
      const node = items[i]!
      const cls = classOf(node)
      if (node.type === 'sym' && node.cls === 'bin') {
        const prevCls = previous ? classOf(previous) : null
        if (prevCls === null || prevCls === 'open' || prevCls === 'bin' || prevCls === 'rel' || prevCls === 'op' || prevCls === 'punct') {
          node.cls = 'ord'
        }
      }
      if ((cls === 'rel' || cls === 'close' || cls === 'punct') && previous?.type === 'sym' && previous.cls === 'bin') {
        previous.cls = 'ord'
      }
      if (cls !== 'space') previous = node
    }
  }
}

function charNode(ch: string): Node {
  if (ch === '-') return sym('−', 'bin')
  return sym(ch, CHAR_CLASSES[ch] ?? 'ord')
}

function fontOf(name: string): FontName {
  switch (name) {
    case 'mathbb':
    case 'Bbb':
      return 'double'
    case 'mathcal':
    case 'mathscr':
      return 'script'
    case 'mathfrak':
      return 'fraktur'
    case 'mathbf':
    case 'boldsymbol':
    case 'bm':
    case 'mathbold':
      return 'bold'
    case 'mathsf':
      return 'sans'
    case 'mathtt':
      return 'mono'
    case 'mathit':
      return 'italic'
    default:
      return 'plain'
  }
}

function unescapeText(raw: string): string {
  return raw
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')
    .replace(/\\%/g, '%')
    .replace(/\\_/g, '_')
    .replace(/\\&/g, '&')
    .replace(/\\#/g, '#')
    .replace(/\\\$/g, '$')
    .replace(/\\ /g, ' ')
    .replace(/\\([A-Za-z]+)\b/g, '$1')
    .replace(/\\\\/g, ' ')
}

export function parseTex(tex: string): Node {
  return new Parser(tex).parse()
}

export function isBigOperator(node: Node): boolean {
  if (node.type === 'sym') return node.cls === 'op' && BIG_OPERATORS.has(node.text)
  if (node.type === 'text') return node.cls === 'op' && BIG_OPERATORS.has(node.text)
  return false
}
