import { expect, test } from 'claude-code/testing'
import { displayTex, inlineTex } from '../src/tex/layout'

test('inline math: symbols, scripts and fractions', () => {
  expect(inlineTex('E = mc^2')).toBe('E = mc²')
  expect(inlineTex('\\alpha + \\beta \\le \\gamma')).toBe('α + β ≤ γ')
  expect(inlineTex('\\frac{a+b}{c}')).toBe('(a + b)/c')
  expect(inlineTex('f(x) = \\frac{1}{2}')).toBe('f(x) = 1/2')
  expect(inlineTex('x_i^2')).toBe('xᵢ²')
  expect(inlineTex('\\sqrt{x^2+y^2}')).toBe('√(x² + y²)')
  expect(inlineTex('\\sin x')).toBe('sin x')
})

test('inline math: fonts, accents and big operators', () => {
  expect(inlineTex('\\mathbb{R}^n')).toBe('ℝⁿ')
  expect(inlineTex('\\hat{x}')).toBe('x̂')
  expect(inlineTex('\\sum_{i=1}^{n} i^2')).toBe('∑ᵢ₌₁ⁿ i²')
  expect(inlineTex('\\int_0^1 x^2 \\, dx')).toBe('∫₀¹ x² dx')
})

test('inline math: text and matrices', () => {
  expect(inlineTex('\\text{for } x > 0')).toBe('for x > 0')
  expect(inlineTex('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}')).toBe('(a  b; c  d)')
})

test('display math: stacked fraction', () => {
  const lines = displayTex('\\frac{a+b}{c}', 60)
  const text = lines.join('\n')
  expect(text).toContain('a + b')
  expect(text).toContain('─')
  expect(text).toContain('c')
  expect(lines.length).toBe(3)
})

test('display math: sum limits above and below', () => {
  const lines = displayTex('\\sum_{i=1}^n i^2', 60)
  const text = lines.join('\n')
  expect(text).toContain('∑')
  expect(text).toContain('i=1')
  expect(text).toContain('n')
  expect(lines.length).toBeGreaterThanOrEqual(3)
})

test('display math: matrix brackets', () => {
  const text = displayTex('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', 60).join('\n')
  expect(text).toContain('⎛')
  expect(text).toContain('⎝')
  expect(text).toContain('a')
  expect(text).toContain('d')
})

test('display math: aligned equations', () => {
  const lines = displayTex('\\begin{aligned} a &= b + c \\\\ d &= e \\end{aligned}', 60)
  expect(lines.length).toBe(2)
  expect(lines[0]).toContain('a = b + c')
  expect(lines[1]).toContain('d = e')
})

test('display math: boxed result', () => {
  const text = displayTex('\\boxed{x=1}', 60).join('\n')
  expect(text).toContain('┌')
  expect(text).toContain('│x = 1│')
  expect(text).toContain('└')
})

test('display math: narrow width falls back to wrapping', () => {
  const lines = displayTex('a + b + c + d + e', 10)
  expect(lines.length).toBeGreaterThan(1)
  for (const line of lines) expect(line.length).toBeLessThanOrEqual(12)
})

test('malformed input never throws', () => {
  const inputs = [
    '\\frac{1}{',
    '\\sqrt{',
    '\\begin{pmatrix} a & b',
    '\\left( x',
    '}',
    '{',
    '\\',
    '\\end{matrix}',
    '\\frac',
    '$$',
    '\\text{unclosed',
    '\\begin{aligned} a &= b',
  ]
  for (const input of inputs) {
    expect(() => inlineTex(input)).not.toThrow()
    expect(() => displayTex(input, 60)).not.toThrow()
  }
})

test('deep nesting and oversized formulas are bounded', () => {
  const deep = '\\frac{'.repeat(200) + 'x' + '}{1}'.repeat(200)
  const huge = 'x + '.repeat(5000) + 'x'
  expect(() => inlineTex(deep)).not.toThrow()
  expect(() => inlineTex(huge)).not.toThrow()
  expect(() => displayTex(deep, 60)).not.toThrow()
  expect(() => displayTex(huge, 60)).not.toThrow()
  expect(inlineTex(deep).length).toBeGreaterThan(0)
  expect(displayTex(huge, 60).length).toBeGreaterThan(0)
})

test('negation, operator names and fonts', () => {
  expect(inlineTex('x \\not\\in A')).toBe('x ∉ A')
  expect(inlineTex('\\operatorname{argmax}_x f(x)')).toContain('argmax')
  expect(inlineTex('\\mathcal{L}')).toBe('ℒ')
  expect(inlineTex('\\mathfrak{g}')).toBe('𝔤')
  expect(inlineTex('\\text{速度 } v')).toBe('速度 v')
})

test('cases environment renders with a brace', () => {
  const text = displayTex('\\begin{cases} x^2 & x \\ge 0 \\\\ -x & x < 0 \\end{cases}', 60).join('\n')
  expect(text).toContain('⎧')
  expect(text).toContain('x²')
  expect(text).toContain('x ≥ 0')
})
