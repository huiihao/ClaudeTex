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

test('CRLF input is normalized and math still converts', () => {
  const output = transformMarkdown('Line\r\n\r\n$$\r\n\\frac{a}{b}\r\n$$\r\n', options)
  expect(output.text).toContain('─')
  expect(output.text).not.toContain('\r')
})

test('code spans close only on a run of the same length', () => {
  const text = 'Code ``a ` b`` and math $x^2$.'
  const output = transformMarkdown(text, options).text
  expect(output).toContain('``a ` b``')
  expect(output).toContain('x²')
})

test('display delimiters inside a sentence stay inline', () => {
  const output = transformMarkdown('The value $$x^2$$ is small.', options).text
  expect(output).toContain('x²')
  expect(output).not.toContain('```')
})

test('empty math spans are left alone', () => {
  const output = transformMarkdown('Empty $$ $$ and $$$$ plus $x$.', options).text
  expect(output).toContain('$$ $$')
  expect(output).toContain('$$$$')
  expect(output).toContain('x')
})

test('oversized replies are left untouched', () => {
  const text = '$x$ '.repeat(60_000) + 'end'
  const output = transformMarkdown(text, options)
  expect(output.changed).toBe(false)
  expect(output.text).toBe(text)
  expect(output.count).toBe(0)
})

test('escaped dollars are not math', () => {
  const text = 'Price \\$5 and \\$10.'
  expect(transformMarkdown(text, options).text).toBe(text)
})

test('prose words in dollars stay prose', () => {
  const output = transformMarkdown('Use $and$ and $the$ here, but $dx$ is math.', options).text
  expect(output).toContain('$and$')
  expect(output).toContain('$the$')
  expect(output).toContain('dx')
})

test('display math with surrounding whitespace is still display', () => {
  const output = transformMarkdown('$$\n  x  \n$$', options).text
  expect(output).toContain('```')
  expect(output).toContain('x')
})
