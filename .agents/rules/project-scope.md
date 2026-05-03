---
trigger: always_on
---

# Wren CLI

This is a pure TypeScript module project for a CLI tool.
Wren CLI is an aggressively opinionated, terminal-first AI coding agent designed *exclusively* for the 2B–8B local model ecosystem (like Qwen 4B or Llama 3 8B). It is similar in functionality to Codex, Claude Code & OpenCode (CLI AI coding agent tools).

This CLI tool will be installed and running on a users PC, so treat everything like its not on a web server but on a user's pc (as a server-ish thing)

## Tech Stack
- Runtime: Node.js (v20+)
- Language: TypeScript (Strict mode, ES2022, `NodeNext` module resolution)
- Package Type: ESM ONLY (`"type": "module"` in package.json). No `require()`.
- CLI/UI: `ink` (React for the terminal) + `@inkjs/ui`
- State (whatever you want)


## Core Directives
- NEVER write redundant or boilerplate code. If you find yourself writing the same logic twice, abstract it into a generic utility or adapter.
- For example a great example is AI providers, make a really nicely expandable adapter where we just route to different selected models & providers etc.. (connect to LM Studio, ollama, llama.cpp, openrouter, OpenAI subsription, Deepseek API key, CrofAI api key etc..)
- Separate CLI UI code (`src/cli/`) from the Core Engine logic (`src/engine/`). They must remain decoupled so the engine can be used in an Electron app later.
- You can use dependencies if you know proper ones. We are building a nicely opinionated tool, hance we can use a lot of libs.
- When generating code, always include proper TypeScript interfaces/types.
- Never use `any`. Use `unknown` if a type is truly dynamic.
- Always use nicely formatted and designed TUI CLI interfaecs with strictly @inkjs/ui
- ALWAYS use context7 mcp if you're using libraries and dependencies, you can ground your knowledge properly with it. E.g. when using @inkjs/ui or ink.