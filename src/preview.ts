export type PreviewOptions = {
  title?: string
  subtitle?: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeScript(text: string): string {
  return text
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--')
    .replace(/-->/g, '--\\>')
}

export function buildPreviewHtml(markdown: string, options: PreviewOptions = {}): string {
  const title = options.title ?? 'Claude Code · TeX preview'
  const subtitle = options.subtitle ?? 'Rendered with KaTeX in your browser'
  const source = escapeScript(markdown)

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.css">
<style>
  :root {
    color-scheme: light dark;
    --bg: #fbfaf7;
    --paper: #ffffff;
    --ink: #1f2328;
    --muted: #6b7280;
    --line: #e5e7eb;
    --accent: #b45309;
    --accent-soft: #fef3c7;
    --code-bg: #f3f4f6;
    --quote: #f9fafb;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #111315;
      --paper: #17191c;
      --ink: #e6e6e6;
      --muted: #9aa0a6;
      --line: #2a2e33;
      --accent: #fbbf24;
      --accent-soft: #2a2415;
      --code-bg: #202327;
      --quote: #1c1f22;
    }
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Noto Sans CJK SC", sans-serif;
  }
  .wrap { max-width: 920px; margin: 0 auto; padding: 28px 22px 80px; }
  header {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding-bottom: 18px; margin-bottom: 28px; border-bottom: 1px solid var(--line);
  }
  .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .mark {
    width: 34px; height: 34px; border-radius: 9px; flex: none;
    display: grid; place-items: center;
    background: var(--accent-soft); color: var(--accent);
    font: 600 18px/1 "Cambria Math", Georgia, serif;
  }
  h1 { font-size: 17px; line-height: 1.3; margin: 0; font-weight: 600; }
  .sub { font-size: 12.5px; color: var(--muted); margin-top: 2px; }
  .tools { display: flex; gap: 8px; flex: none; }
  button {
    font: inherit; font-size: 13px; color: var(--ink); background: var(--paper);
    border: 1px solid var(--line); border-radius: 8px; padding: 6px 11px; cursor: pointer;
  }
  button:hover { border-color: var(--accent); color: var(--accent); }
  main {
    background: var(--paper); border: 1px solid var(--line); border-radius: 14px;
    padding: 30px 34px 36px; box-shadow: 0 1px 2px rgb(0 0 0 / 0.03), 0 12px 40px rgb(0 0 0 / 0.04);
  }
  main h1, main h2, main h3 { line-height: 1.3; margin: 1.4em 0 0.6em; }
  main h1 { font-size: 1.6em; } main h2 { font-size: 1.32em; } main h3 { font-size: 1.12em; }
  main p { margin: 0.8em 0; }
  main ul, main ol { padding-left: 1.5em; }
  main li { margin: 0.3em 0; }
  a { color: var(--accent); text-decoration-thickness: 1px; text-underline-offset: 2px; }
  code {
    font: 0.92em/1.5 "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
    background: var(--code-bg); padding: 0.15em 0.35em; border-radius: 5px;
  }
  pre {
    background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px;
    padding: 14px 16px; overflow: auto; line-height: 1.5;
  }
  pre code { background: none; padding: 0; font-size: 0.9em; }
  blockquote {
    margin: 1em 0; padding: 0.4em 1em; color: var(--muted);
    background: var(--quote); border-left: 3px solid var(--accent);
  }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 0.95em; }
  th, td { border: 1px solid var(--line); padding: 7px 10px; text-align: left; }
  th { background: var(--quote); }
  hr { border: 0; border-top: 1px solid var(--line); margin: 2em 0; }
  img, svg { max-width: 100%; }
  .katex-display { overflow-x: auto; overflow-y: hidden; padding: 0.3em 0; }
  #source-view {
    display: none; white-space: pre-wrap; word-break: break-word;
    font: 0.88em/1.55 "SFMono-Regular", Consolas, Menlo, monospace;
    background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px;
    padding: 16px; margin-top: 24px; color: var(--muted);
  }
  footer { color: var(--muted); font-size: 12px; text-align: center; margin-top: 22px; }
  .loading { color: var(--muted); font-size: 14px; }
  @media (max-width: 640px) {
    .wrap { padding: 18px 12px 60px; }
    main { padding: 22px 18px 28px; border-radius: 12px; }
    header { align-items: flex-start; }
    .sub { display: none; }
  }
  @media print {
    body { background: #fff; }
    header, footer, #source-view, .tools { display: none; }
    main { border: 0; box-shadow: none; padding: 0; }
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="brand">
      <div class="mark">TeX</div>
      <div>
        <h1>${escapeHtml(title)}</h1>
        <div class="sub">${escapeHtml(subtitle)}</div>
      </div>
    </div>
    <div class="tools">
      <button id="toggle-source" type="button">Source</button>
      <button id="copy-md" type="button">Copy Markdown</button>
    </div>
  </header>
  <main id="content"><p class="loading">Rendering…</p></main>
  <pre id="source-view"></pre>
  <footer>Generated by the <strong>tex</strong> mod for Claude Code · KaTeX renders locally in this page.</footer>
</div>

<script type="text/plain" id="markdown-source">${source}</script>

<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.7/purify.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/contrib/auto-render.min.js"></script>
<script>
(function () {
  var source = document.getElementById('markdown-source').textContent || '';
  var content = document.getElementById('content');
  var sourceView = document.getElementById('source-view');
  sourceView.textContent = source;

  function flashCopied() {
    var button = document.getElementById('copy-md');
    var old = button.textContent;
    button.textContent = 'Copied';
    setTimeout(function () { button.textContent = old; }, 1400);
  }

  document.getElementById('copy-md').addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(source).then(flashCopied, fallbackCopy);
    } else {
      fallbackCopy();
    }
  });

  function fallbackCopy() {
    var area = document.createElement('textarea');
    area.value = source;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); flashCopied(); } catch (error) { console.error(error); }
    document.body.removeChild(area);
  }

  document.getElementById('toggle-source').addEventListener('click', function () {
    sourceView.style.display = sourceView.style.display === 'block' ? 'none' : 'block';
  });

  if (!window.marked || !window.DOMPurify) {
    content.innerHTML = '<pre></pre>';
    content.querySelector('pre').textContent = source;
    return;
  }

  // Markdown eats the backslashes inside TeX (\\ becomes \, \, becomes ,).
  // Cut each math span out before parsing and put it back before KaTeX runs.
  var formulas = [];
  var protectedSource = source.replace(
    /\\$\\$[\\s\\S]*?\\$\\$|\\\\\\[[\\s\\S]*?\\\\\\]|\\\\\\([\\s\\S]*?\\\\\\)|\\$[^$\\n]+\\$/g,
    function (match) {
      formulas.push(match);
      return '@@TEXMATH' + (formulas.length - 1) + '@@';
    }
  );

  function escapeHtml(value) {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var html = window.marked.parse(protectedSource, { gfm: true, breaks: false });
  html = window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  html = html.replace(/@@TEXMATH(\\d+)@@/g, function (_, index) {
    return escapeHtml(formulas[Number(index)] || '');
  });
  content.innerHTML = html;

  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(content, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\\\[', right: '\\\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\\\(', right: '\\\\)', display: false }
        ],
        throwOnError: false,
        strict: false,
        trust: false,
        processEscapes: true,
        macros: {
          '\\\\R': '\\\\mathbb{R}',
          '\\\\N': '\\\\mathbb{N}',
          '\\\\Z': '\\\\mathbb{Z}',
          '\\\\Q': '\\\\mathbb{Q}',
          '\\\\C': '\\\\mathbb{C}',
          '\\\\E': '\\\\mathbb{E}',
          '\\\\Tr': '\\\\operatorname{Tr}',
          '\\\\argmax': '\\\\operatorname*{arg\\\\,max}',
          '\\\\argmin': '\\\\operatorname*{arg\\\\,min}',
          '\\\\ket': '\\\\left|#1\\\\right\\\\rangle',
          '\\\\bra': '\\\\left\\\\langle#1\\\\right|',
          '\\\\braket': '\\\\left\\\\langle#1\\\\right\\\\rangle',
          '\\\\abs': '\\\\left|#1\\\\right|',
          '\\\\norm': '\\\\left\\\\|#1\\\\right\\\\|'
        }
      });
    } catch (error) {
      console.error('KaTeX:', error);
    }
  }
})();
</script>
</body>
</html>
`
}
