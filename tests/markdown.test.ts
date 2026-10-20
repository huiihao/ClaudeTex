import { expect, test } from 'claude-code/testing'
import { transformMarkdown } from '../src/tex/markdown'

const options = { inline: true, display: true, maxWidth: 60 }

test('inline math is converted', () => {
  const output = transformMarkdown('Euler: $e^{i\\pi}+1=0$.', options).text
  expect(output).not.toContain('$e')
  expect(output).toContain('e^(iπ)')
})

test('currency, shell variables and code spans stay as written', () => {
  const text = 'It costs $5 and $10; use `$x^2$`; echo $PATH.'
  const output = transformMarkdown(text, options)
  expect(output.text).toBe(text)
  expect(output.changed).toBe(false)
})

test('fenced code blocks are never transformed', () => {
  const text = 'Example:\n\n```\n$$x^2 + y^2$$\n```\n'
  const output = transformMarkdown(text, options)
  expect(output.text).toBe(text)
})

test('display math becomes a fenced Unicode block', () => {
  const output = transformMarkdown('Before.\n\n$$\n\\frac{a}{b}\n$$\n\nAfter.', options).text
  expect(output).toContain('```')
  expect(output).toContain('─')
  expect(output).not.toContain('$$')
  expect(output).toContain('Before.')
  expect(output).toContain('After.')
})

test('escaped delimiters are converted', () => {
  const output = transformMarkdown('A \\(x^2\\) and \\[y^2\\].', options).text
  expect(output).toContain('x²')
  expect(output).toContain('y²')
})

test('transform is idempotent', () => {
  const once = transformMarkdown('Value $x^2$.\n\n$$\n\\frac{a}{b}\n$$', options).text
  const twice = transformMarkdown(once, options).text
  expect(twice).toBe(once)
})

test('turning both modes off leaves the text alone', () => {
  const text = 'Euler: $e^{i\\pi}+1=0$.'
  const output = transformMarkdown(text, { inline: false, display: false, maxWidth: 60 })
  expect(output.text).toBe(text)
  expect(output.count).toBe(0)
})
