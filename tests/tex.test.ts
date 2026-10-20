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
})
