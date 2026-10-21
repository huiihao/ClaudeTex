// @ts-nocheck -- the test kit's input types require fields the fixtures omit;
// claude plugin test runs these without type checking.
import { expect, mock, test } from 'claude-code/testing'
import { buildPreviewHtml } from '../src/preview'

test('/tex writes a KaTeX page and opens it', async ($, on) => {
  let written: { path: string; text: string } | undefined
  let opened: string[] = []

  on('session.messages', () => ({
    value: [{ role: 'assistant', text: 'The result is $x^2 + 1$. $$\\int_0^1 x\\,dx$$' }],
  }))
  mock.env(on, { WINDIR: 'C:\\Windows', TEMP: 'C:\\Temp' })
  on('fs.write', ($, e) => {
    written = { path: e.path, text: e.text }
    return { value: undefined }
  })
  on('process.run', ($, e) => {
    opened = e.argv
    return { value: { exitCode: 0, stdout: '', stderr: '' } }
  })

  const answer = await $.command.run({ command: 'tex', args: '' })
  expect(answer.text).toContain('KaTeX preview opened')
  expect(written).toBeDefined()
  expect(written!.path).toContain('claudetex-preview')
  expect(written!.path.endsWith('.html')).toBe(true)
  expect(written!.text).toContain('cdnjs.cloudflare.com')
  expect(written!.text).toContain('katex.min.js')
  expect(written!.text).toContain('integrity="sha384-')
  expect(written!.text).toContain('Content-Security-Policy')
  expect(written!.text).toContain('$x^2 + 1$')
  expect(opened[0]).toBe('explorer.exe')
})

test('/tex-preview is an alias and /tex all includes every reply', async ($, on) => {
  let written = ''
  on('session.messages', () => ({
    value: [
      { role: 'assistant', text: 'First: $a^2$.' },
      { role: 'assistant', text: 'Second: $b^2$.' },
    ],
  }))
  mock.env(on, { WINDIR: 'C:\\Windows', TEMP: 'C:\\Temp' })
  on('fs.write', ($, e) => {
    written = e.text
    return { value: undefined }
  })
  on('process.run', () => ({ value: { exitCode: 0, stdout: '', stderr: '' } }))

  const alias = await $.command.run({ command: 'tex-preview', args: '' })
  expect(alias.text).toContain('KaTeX preview opened')

  const all = await $.command.run({ command: 'tex', args: 'all' })
  expect(all.text).toContain('KaTeX preview opened')
  expect(written).toContain('Reply 1')
  expect(written).toContain('Reply 2')
})

test('/tex explains when there is no reply', async ($, on) => {
  on('session.messages', () => ({ value: [] }))
  const answer = await $.command.run({ command: 'tex', args: '' })
  expect(answer.text).toContain('No reply to preview yet')
})

test('/tex reports a failed write instead of throwing', async ($, on) => {
  on('session.messages', () => ({ value: [{ role: 'assistant', text: '$x^2$' }] }))
  mock.env(on, { WINDIR: 'C:\\Windows', TEMP: 'C:\\Temp' })
  on('fs.write', () => ({ deny: 'disk is read-only' }))
  const answer = await $.command.run({ command: 'tex', args: '' })
  expect(answer.text).toContain('Could not write the preview file')
})

test('assistant messages are transformed before drawing', async ($, on) => {
  on('ui.render', ($, e) => ({ type: 'Text', props: {}, children: [e.props.text] }))
  const ui = await $.ui.mount({
    plugin: 'tex',
    component: 'AssistantMessage',
    requestId: 'message-1',
    surface: 'terminal',
    viewport: { columns: 80, rows: 30 },
    props: { text: 'Euler: $e^{i\\pi}+1=0$.' },
  })
  const element = await ui.find({ type: 'Text' })
  expect(element).toBeDefined()
  const text = String(element!.children[0])
  expect(text).toContain('e^(iπ)')
  expect(text).not.toContain('$e')
  await ui.unmount()
})

test('display math is laid out before drawing', async ($, on) => {
  on('ui.render', ($, e) => ({ type: 'Text', props: {}, children: [e.props.text] }))
  const ui = await $.ui.mount({
    plugin: 'tex',
    component: 'AssistantMessage',
    requestId: 'message-2',
    surface: 'terminal',
    viewport: { columns: 80, rows: 30 },
    props: { text: 'Result:\n\n$$\n\\frac{a}{b}\n$$\n' },
  })
  const element = await ui.find({ type: 'Text' })
  const text = String(element!.children[0])
  expect(text).toContain('```')
  expect(text).toContain('─')
  expect(text).not.toContain('$$')
  await ui.unmount()
})

test('the preview page keeps the source in an inert template', () => {
  const html = buildPreviewHtml('before </script> and </template> after', { title: 'Test' })
  expect(html).not.toContain('before </script> and </template> after')
  expect(html).toContain('before &lt;/script&gt; and &lt;/template&gt; after')
  expect(html).toContain('<template id="markdown-source">')
  expect(html).toContain('cdnjs.cloudflare.com')
  expect(html).toContain('integrity="sha384-')
  expect(html).toContain('Content-Security-Policy')
  expect(html).toContain('Claudetex')
})

test('session.start registers /tex and /tex-preview', async ($, on) => {
  const registered: string[] = []
  on('session.start', () => ({ cwd: '/work' }))
  on('command.register', ($, e) => {
    registered.push(e.name)
    return { value: undefined }
  })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })
  expect(registered).toContain('tex')
  expect(registered).toContain('tex-preview')
})

test('the prompt note is added once per context window', async ($, on) => {
  let seen: { context?: string[] } | undefined
  on('session.surfaces', () => ({ value: ['terminal'] }))
  on('prompt.submit', ($, e) => {
    seen = e
    return { text: e.text }
  })

  await $.prompt.submit({ text: 'first' })
  expect(seen?.context).toBeDefined()
  expect(seen!.context!.join('\n')).toContain('Math in this session')

  await $.prompt.submit({ text: 'second' })
  expect(seen?.context?.length ?? 0).toBe(0)
})
