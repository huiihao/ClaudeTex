// Development-only stubs. In a real Claude Code session the CLI writes the
// exact declarations for the running version into .claude-plugin/types/.
// This file only lets `tsc -p tsconfig.check.json` check the pure modules.

declare module 'claude-code' {
  export type Register = (on: any, options: Readonly<Record<string, unknown>>) => void
  export type EngineInterface = any
  export type RenderInput = any
}

declare module 'claude-code/testing' {
  export const expect: any
  export const mock: any
  export function test(name: string, fn: (...args: any[]) => any): void
  export function test(name: string, options: any, fn: (...args: any[]) => any): void
  export function tier(...args: any[]): void
}
