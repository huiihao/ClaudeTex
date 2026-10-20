import type { MathClass } from './symbols'

export type FontName =
  | 'plain'
  | 'bold'
  | 'italic'
  | 'bolditalic'
  | 'sans'
  | 'sansbold'
  | 'mono'
  | 'double'
  | 'script'
  | 'fraktur'

export type EnvRow = Node[][]

export type Node =
  | { type: 'row'; items: Node[]; cls?: MathClass }
  | { type: 'sym'; text: string; cls: MathClass }
  | { type: 'text'; text: string; cls?: MathClass }
  | { type: 'space'; width: number }
  | { type: 'frac'; num: Node; den: Node; bar: boolean }
  | { type: 'sqrt'; index?: Node; body: Node }
  | { type: 'script'; base: Node; sup?: Node; sub?: Node; limits?: boolean }
  | { type: 'accent'; mark: string; body: Node }
  | { type: 'boxed'; body: Node }
  | { type: 'styled'; font: FontName; body: Node }
  | { type: 'env'; env: string; rows: EnvRow[]; spec?: string }
  | { type: 'newline' }
  | { type: 'phantom'; body: Node }

export function row(items: Node[]): Node {
  if (items.length === 1) return items[0]!
  return { type: 'row', items }
}

export function classOf(node: Node): MathClass {
  switch (node.type) {
    case 'sym':
      return node.cls
    case 'text':
      return node.cls ?? 'ord'
    case 'row':
      return node.cls ?? 'ord'
    case 'space':
    case 'newline':
      return 'space'
    case 'script':
      return classOf(node.base) === 'op' ? 'op' : 'ord'
    default:
      return 'ord'
  }
}

/** The plain text of a simple node, for `\not` and negation lookup. */
export function simpleText(node: Node): string | null {
  switch (node.type) {
    case 'sym':
    case 'text':
      return node.text
    case 'row':
      return node.items.length === 1 ? simpleText(node.items[0]!) : null
    case 'styled':
      return simpleText(node.body)
    default:
      return null
  }
}
