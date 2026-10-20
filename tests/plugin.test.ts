// @ts-nocheck -- the test kit's input types require fields the fixtures omit;
// claude plugin test runs these without type checking.
import { expect, mock, test } from 'claude-code/testing'
import { buildPreviewHtml } from '../src/preview'

test('/tex-preview writes a KaTeX page and opens it', async ($, on) => {
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

  const answer = await $.command.run({ command: 'tex-preview', args: '' })
  expect(answer.text).toContain('KaTeX preview opened')
  expect(written).toBeDefined()
  expect(written!.path).toContain('claude-tex-preview')
  expect(written!.path.endsWith('.html')).toBe(true)
  expect(written!.text).toContain('cdnjs.cloudflare.com')
  expect(written!.text).toContain('katex.min.js')
  expect(written!.text).toContain('$x^2 + 1$')
  expect(opened[0]).toBe('explorer.exe')
})

test('/tex-preview explains when there is no reply', async ($, on) => {
  on('session.messages', () => ({ value: [] }))
  const answer = await $.command.run({ command: 'tex-preview', args: '' })
  expect(answer.text).toContain('No reply to preview yet')
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

test('the preview page escapes a literal closing script tag', () => {
  const html = buildPreviewHtml('before </script> after', { title: 'Test' })
  expect(html).not.toContain('before </script> after')
  expect(html).toContain('<\\/script>')
  expect(html).toContain('cdnjs.cloudflare.com')
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
