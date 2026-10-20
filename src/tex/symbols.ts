// TeX command tables. The tables are deliberately plain data: the parser
// looks everything up here, and the layout engine only sees classes.

export type MathClass = 'ord' | 'op' | 'bin' | 'rel' | 'open' | 'close' | 'punct' | 'space'

export type SymbolInfo = { text: string; cls: MathClass }

const ord: Record<string, string> = {
  // Greek
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', varpi: 'ϖ',
  rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ',
  phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  // Constants and miscellaneous ordinary symbols
  partial: '∂', nabla: '∇', infty: '∞', forall: '∀', exists: '∃', nexists: '∄',
  neg: '¬', lnot: '¬', emptyset: '∅', varnothing: '∅', ell: 'ℓ', hbar: 'ℏ',
  Re: 'ℜ', Im: 'ℑ', aleph: 'ℵ', beth: 'ℶ', gimel: 'ℷ', daleth: 'ℸ',
  angle: '∠', measuredangle: '∡', sphericalangle: '∢', triangle: '△',
  triangledown: '▽', square: '□', blacksquare: '■', diamond: '◇', bullet: '•',
  top: '⊤', bot: '⊥', prime: '′', backprime: '‵', dagger: '†', ddagger: '‡',
  dots: '…', ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱', iddots: '⋰',
  vert: '|', Vert: '‖', backslash: '\\', sharp: '♯', flat: '♭', natural: '♮',
  clubsuit: '♣', diamondsuit: '♢', heartsuit: '♡', spadesuit: '♠',
  checkmark: '✓', degree: '°', circledR: '®', copyright: '©',
  // Arrows are relations in TeX; these non-arrow odds and ends stay ordinary.
  implies: '⟹', impliedby: '⟸',
  // Large delimiters are open/close; these are the bare forms.
  langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉',
  lbrace: '{', rbrace: '}', lbrack: '[', rbrack: ']',
  lvert: '|', rvert: '|', lVert: '‖', rVert: '‖',
  // Escaped punctuation handled as ordinary text by the parser.
  '%': '%', '$': '$', '#': '#', '_': '_', '&': '&', '{': '{', '}': '}',
  '|': '‖',
}

const bin: Record<string, string> = {
  cdot: '·', cdotp: '·', times: '×', div: '÷', pm: '±', mp: '∓', ast: '∗',
  star: '⋆', circ: '∘', bullet: '•', oplus: '⊕', ominus: '⊖', otimes: '⊗',
  oslash: '⊘', odot: '⊙', cup: '∪', cap: '∩', setminus: '∖', smallsetminus: '∖',
  wedge: '∧', land: '∧', vee: '∨', lor: '∨', uplus: '⊎', sqcup: '⊔',
  sqcap: '⊓', amalg: '⨿', wr: '≀', diamond: '⋄', bigtriangleup: '△',
  bigtriangledown: '▽', triangleleft: '◁', triangleright: '▷', lhd: '⊲',
  rhd: '⊳', unlhd: '⊴', unrhd: '⊵', dotplus: '∔', lt: '<', gt: '>',
}

const rel: Record<string, string> = {
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈',
  approxeq: '≊', equiv: '≡', sim: '∼', simeq: '≃', cong: '≅', propto: '∝',
  ll: '≪', gg: '≫', lll: '⋘', ggg: '⋙', lesssim: '≲', gtrsim: '≳',
  lessapprox: '⪅', gtrapprox: '⪆', prec: '≺', succ: '≻', preceq: '⪯',
  succeq: '⪰', precsim: '≾', succsim: '≿', subset: '⊂', subseteq: '⊆',
  subsetneq: '⊊', supset: '⊃', supseteq: '⊇', supsetneq: '⊋', in: '∈',
  notin: '∉', ni: '∋', owns: '∋', mid: '∣', nmid: '∤', parallel: '∥',
  nparallel: '∦', perp: '⊥', models: '⊨', vdash: '⊢', dashv: '⊣',
  Vdash: '⊩', Vvdash: '⊪', coloneqq: '≔', eqqcolon: '≕', triangleq: '≜',
  doteq: '≐', asymp: '≍', bowtie: '⋈', smile: '⌣', frown: '⌢',
  to: '→', rightarrow: '→', leftarrow: '←', gets: '←', Rightarrow: '⇒',
  Leftarrow: '⇐', Leftrightarrow: '⇔', iff: '⟺', implies: '⟹', impliedby: '⟸',
  mapsto: '↦', leftrightarrow: '↔', uparrow: '↑', downarrow: '↓',
  updownarrow: '↕', Uparrow: '⇑', Downarrow: '⇓', Updownarrow: '⇕',
  longrightarrow: '⟶', longleftarrow: '⟵', longleftrightarrow: '⟷',
  Longrightarrow: '⟹', Longleftarrow: '⟸', Longleftrightarrow: '⟺',
  longmapsto: '⟼', hookrightarrow: '↪', hookleftarrow: '↩', leadsto: '⇝',
  rightleftharpoons: '⇌', leftrightharpoons: '⇋', nearrow: '↗', searrow: '↘',
  swarrow: '↙', nwarrow: '↖', nrightarrow: '↛', nleftarrow: '↚',
  nRightarrow: '⇏', nLeftarrow: '⇍', nleftrightarrow: '↮', nLeftrightarrow: '⇎',
  Rrightarrow: '⇛', Lleftarrow: '⇚', twoheadrightarrow: '↠',
  twoheadleftarrow: '↞', rightsquigarrow: '⇝', leftrightsquigarrow: '↭',
}

const bigop: Record<string, string> = {
  sum: '∑', prod: '∏', coprod: '∐', int: '∫', iint: '∬', iiint: '∭',
  iiiint: '⨌', oint: '∮', oiint: '∯', oiiint: '∰', bigcup: '⋃', bigcap: '⋂',
  bigoplus: '⨁', bigotimes: '⨂', bigodot: '⨀', biguplus: '⨄', bigsqcup: '⨆',
  bigvee: '⋁', bigwedge: '⋀', bigtimes: '⨉',
}

const open: Record<string, string> = {
  langle: '⟨', lfloor: '⌊', lceil: '⌈', lvert: '|', lVert: '‖',
  lbrace: '{', lbrack: '[', lgroup: '⟮', lmoustache: '⎰',
}

const close: Record<string, string> = {
  rangle: '⟩', rfloor: '⌋', rceil: '⌉', rvert: '|', rVert: '‖',
  rbrace: '}', rbrack: ']', rgroup: '⟯', rmoustache: '⎱',
}

const punct: Record<string, string> = {}

export const SYMBOLS = new Map<string, SymbolInfo>()
for (const [name, text] of Object.entries(ord)) SYMBOLS.set(name, { text, cls: 'ord' })
for (const [name, text] of Object.entries(bin)) SYMBOLS.set(name, { text, cls: 'bin' })
for (const [name, text] of Object.entries(rel)) SYMBOLS.set(name, { text, cls: 'rel' })
for (const [name, text] of Object.entries(bigop)) SYMBOLS.set(name, { text, cls: 'op' })
for (const [name, text] of Object.entries(open)) SYMBOLS.set(name, { text, cls: 'open' })
for (const [name, text] of Object.entries(close)) SYMBOLS.set(name, { text, cls: 'close' })
for (const [name, text] of Object.entries(punct)) SYMBOLS.set(name, { text, cls: 'punct' })

// Overrides where the same command appears in more than one table.
SYMBOLS.set('colon', { text: ':', cls: 'rel' })
SYMBOLS.set('Vert', { text: '‖', cls: 'ord' })
SYMBOLS.set('vert', { text: '|', cls: 'ord' })
SYMBOLS.set('backslash', { text: '\\', cls: 'ord' })

export const SPACES: Record<string, string> = {
  quad: '  ',
  qquad: '    ',
  enspace: ' ',
  enskip: ' ',
  thinspace: ' ',
  medspace: ' ',
  thickspace: ' ',
  negthinspace: '',
  negmedspace: '',
  negthickspace: '',
  ',': ' ',
  ':': ' ',
  ';': ' ',
  '>': ' ',
  ' ': ' ',
  '!': '',
}

export const FUNCTIONS = new Set([
  'arccos', 'arcsin', 'arctan', 'arg', 'argmax', 'argmin', 'cos', 'cosh',
  'cot', 'coth', 'csc', 'deg', 'det', 'dim', 'exp', 'gcd', 'hom', 'inf',
  'ker', 'lg', 'lim', 'liminf', 'limsup', 'ln', 'log', 'max', 'min', 'Pr',
  'sec', 'sin', 'sinh', 'sup', 'tan', 'tanh', 'tr', 'Tr', 'rank', 'diag',
  'sgn', 'mod', 'bmod', 'pmod',
])

export const ACCENTS: Record<string, string> = {
  hat: '̂', widehat: '̂', check: '̌', bar: '̄',
  overline: '̅', tilde: '̃', widetilde: '̃', dot: '̇',
  ddot: '̈', vec: '⃗', acute: '́', grave: '̀',
  breve: '̆', mathring: '̊', underline: '̲',
}

export const TEXT_COMMANDS = new Set([
  'text', 'textrm', 'textbf', 'textit', 'textsf', 'texttt', 'textnormal',
  'emph', 'mbox', 'hbox', 'hspace',
])

export const STYLE_COMMANDS = new Set([
  'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathnormal',
  'boldsymbol', 'bm', 'mathbold', 'underline', 'boxed', 'cancel',
  'bcancel', 'xcancel', 'sout', 'overline', 'underbrace', 'overbrace',
])

export const FONT_COMMANDS = new Set([
  'mathbb', 'Bbb', 'mathcal', 'mathscr', 'mathfrak', 'mathbf', 'boldsymbol',
  'bm', 'mathbold', 'mathsf', 'mathtt', 'mathit', 'mathrm', 'mathnormal',
])

export const IGNORED = new Set([
  'displaystyle', 'textstyle', 'scriptstyle', 'scriptscriptstyle',
  'limits', 'nolimits', 'nonumber', 'notag', 'allowbreak', 'nobreak',
  'hfill', 'hfil', 'hss', 'smallskip', 'medskip', 'bigskip', 'noindent',
  'hline', 'cline', 'tiny', 'scriptsize', 'footnotesize', 'small',
  'normalsize', 'large', 'Large', 'LARGE', 'huge', 'Huge',
])

export const SKIP_ARGUMENT = new Set([
  'label', 'tag', 'color', 'phantom', 'hphantom', 'vphantom', 'rule',
  'colorbox', 'fcolorbox', 'raisebox', 'kern', 'mkern', 'mskip', 'vspace',
])

export const DELIMITER_SIZES = new Set([
  'left', 'right', 'middle', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr',
  'Bigl', 'Bigr', 'biggl', 'biggr', 'Biggl', 'Biggr', 'bigm', 'Bigm',
  'biggm', 'Biggm',
])

export const FRACTIONS = new Set(['frac', 'dfrac', 'tfrac', 'cfrac'])
export const BINOMIALS = new Set(['binom', 'dbinom', 'tbinom'])
export const STACKS = new Set(['overset', 'underset', 'stackrel'])

export const ENVIRONMENTS = new Set([
  'matrix', 'pmatrix', 'bmatrix', 'Bmatrix', 'vmatrix', 'Vmatrix',
  'smallmatrix', 'cases', 'dcases', 'rcases', 'array', 'aligned', 'align',
  'align*', 'alignedat', 'split', 'gathered', 'gather', 'gather*',
  'multline', 'multline*', 'eqnarray', 'eqnarray*', 'subarray', 'CD',
])

export const ENVIRONMENT_DELIMITERS: Record<string, [string, string]> = {
  pmatrix: ['(', ')'],
  bmatrix: ['[', ']'],
  Bmatrix: ['{', '}'],
  vmatrix: ['|', '|'],
  Vmatrix: ['‖', '‖'],
  cases: ['{', ''],
  dcases: ['{', ''],
  rcases: ['', '}'],
}

export const BIG_OPERATORS = new Set(Object.values(bigop))

// Characters that TeX treats as binary, relational, opening, closing or
// punctuation when they appear literally.
export const CHAR_CLASSES: Record<string, MathClass> = {
  '+': 'bin', '-': 'bin', '*': 'bin', '/': 'ord', '=': 'rel',
  '<': 'rel', '>': 'rel', ':': 'rel', ',': 'punct', ';': 'punct',
  '(': 'open', '[': 'open', '{': 'open', ')': 'close', ']': 'close',
  '}': 'close', '!': 'close', '?': 'close', '.': 'ord', '|': 'ord',
  '&': 'punct',
}

export const NEGATED: Record<string, string> = {
  '=': '≠', '∈': '∉', '⊂': '⊄', '⊆': '⊈', '⊃': '⊅', '⊇': '⊉',
  '≡': '≢', '∼': '≁', '<': '≮', '>': '≯', '≤': '≰', '≥': '≱',
  '∣': '∤', '|': '∤', '∃': '∄', '≈': '≉', '≃': '≄', '≅': '≇',
  '∝': '∦', '∥': '∦',
}

export const SUPERSCRIPTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶',
  '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '−': '⁻', '-': '⁻', '=': '⁼',
  '(': '⁽', ')': '⁾', a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ',
  g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ',
  o: 'ᵒ', p: 'ᵖ', q: 'ᑫ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ',
  w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ', A: 'ᴬ', B: 'ᴮ', C: 'ᶜ', D: 'ᴰ',
  E: 'ᴱ', F: 'ᶠ', G: 'ᴳ', H: 'ᴴ', I: 'ᴵ', J: 'ᴶ', K: 'ᴷ', L: 'ᴸ',
  M: 'ᴹ', N: 'ᴺ', O: 'ᴼ', P: 'ᴾ', Q: 'ᑫ', R: 'ᴿ', S: 'ˢ', T: 'ᵀ',
  U: 'ᵁ', V: 'ⱽ', W: 'ᵂ', X: 'ˣ', Y: 'ʸ', Z: 'ᶻ',
  'α': 'ᵅ', 'β': 'ᵝ', 'γ': 'ᵞ', 'δ': 'ᵟ', 'ε': 'ᵋ', 'ϵ': 'ᵋ',
  'θ': 'ᶿ', 'ι': 'ᶥ', 'φ': 'ᵠ', 'ϕ': 'ᵠ', 'χ': 'ᵡ', '′': '′',
  '∘': '°', '⊤': 'ᵀ', '∗': '*', '*': '*', ',': ',', '.': '˙',
}

export const SUBSCRIPTS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆',
  '7': '₇', '8': '₈', '9': '₉', '+': '₊', '−': '₋', '-': '₋', '=': '₌',
  '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ',
  l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ',
  u: 'ᵤ', v: 'ᵥ', x: 'ₓ', 'β': 'ᵦ', 'γ': 'ᵧ', 'ρ': 'ᵨ', 'φ': 'ᵩ',
  'ϕ': 'ᵩ', 'χ': 'ᵪ', ',': ',', '.': '.',
}

export const MATH_FONT_RANGES: Record<string, { upper: number; lower: number | null; digits: number | null }> = {
  bold: { upper: 0x1D400, lower: 0x1D41A, digits: 0x1D7CE },
  italic: { upper: 0x1D434, lower: 0x1D44E, digits: null },
  bolditalic: { upper: 0x1D468, lower: 0x1D482, digits: null },
  sans: { upper: 0x1D5A0, lower: 0x1D5BA, digits: 0x1D7E2 },
  sansbold: { upper: 0x1D5D4, lower: 0x1D5EE, digits: 0x1D7EC },
  mono: { upper: 0x1D670, lower: 0x1D68A, digits: 0x1D7F6 },
  double: { upper: 0x1D538, lower: 0x1D552, digits: 0x1D7D8 },
  script: { upper: 0x1D49C, lower: 0x1D4B6, digits: null },
  fraktur: { upper: 0x1D504, lower: 0x1D51E, digits: null },
}

export const FONT_SPECIAL: Record<string, Record<string, string>> = {
  double: {
    C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ',
  },
  script: {
    B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ',
    e: 'ℯ', g: 'ℊ', o: 'ℴ',
  },
  fraktur: {
    C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ',
  },
}
