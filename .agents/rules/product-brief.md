---
trigger: always_on
---

# Wren: Project Scope

## The Product
Wren is an aggressively opinionated, terminal-first AI coding agent designed *exclusively* for the 2B–8B local model ecosystem. It relies on a ruthless scaffolding engine to make small models punch above their weight.

## Core Pillars
1. **Aggressive Context Compression:** The model never sees the whole project. It tries to compress its memory's older entries from time to time, hence sometimes wasting more tokens for re-reads but this is required for precise scope.
2. **Context7 MCP Default:** We offload library/documentation knowledge to MCP servers so the 4B model does not hallucinate APIs, so a baked in context7 mcp will be integrated.
3. **Opinionated Toolset:** A maximum of 8 perfectly engineered tools. No bloat.
4. **Terminal First:** The UI is an immersive, sticky terminal chat interface built with `ink`.

## The concept of the Dual-Agent loop
- The project builds on a concept of two agent loops existing. Existing CLI coding agents rely on 1 single model coding, planning in head in high level and also doing everything. We do this differently.
- The Coding (Worker) Agent: The one that writes the code, uses tools, runs cmd. The user interacts with this and sees this agent's replies.
- The Meta Agent: It handles the compression of the really old entries of the context window, does this at the end of each subtask or turn, and when coding and executing big stuff, it classifies and decides if an architectural high-level plan is needed and does that. Only this so doesn't really write useful code on its own. The user sees on the TUI that the meta agent is doing something but doesn't really sees stuff it does explicitly. Except plans, it should be similar to Cursor's planning system where even the user can explicitly ask before a task (or turn on something) that it's plan mode and before the worker executes, the meta agent writes a thorough plan of how to execute this (with seeing the context window). The user can see the plan, propose changes or accept it/decline it.


## What We Are NOT Building (Out of Scope)
- A full GUI/Electron app (This is Phase 2, do not build it now).
- A custom Vector Database (We use recursive markdown searches, NOT embeddings).
- A 40-tool registry. Keep it lean.

