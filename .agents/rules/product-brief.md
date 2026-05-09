---
trigger: always_on
---

# Wren: Project Scope

## The Product
Wren is an aggressively opinionated, terminal-first AI coding agent designed *exclusively* for the 2B–8B local model ecosystem. It relies on a ruthless scaffolding engine to make small models punch above their weight.

## Core Pillars
1. **The `.brain/` Structured Markdown File System (SMFS):** We abandon that agents forget everything about the project domain knowledge when opening a new chat. Projects use a localized `.brain/` folder containing `project_brief.md` (static goals, changes when the product is steered in any direction) and `system_patterns.md` (dynamic architectural rules that the agents learn over time). 
2. **Aggressive Context Compression:** The model never sees the whole project. It tries to compress its memory's older entries from time to time, hence sometimes wasting more tokens for re-reads but this is required for precise scope.
3. **Deterministic Dual-Agent Loop:** We strictly split cognitive load. The Thinker does not write code; the Executor does not architect systems. 
4. **Artifact-Driven Context Handoffs:** The 2 agents never "chat" with each other. They communicate via artifacts (Markdown checklists, Git diffs). The Node.js Orchestrator stitches these artifacts into strict `system` or `user` prompts.
5. **Surgical Retrieval (No Vector DBs):** Small models drown in large file dumps. We use exact-match/regex hybrid search, followed by tools that read *specific lines or symbols*, keeping the context window pristine.
6. **Context7 MCP Default:** We offload library/documentation knowledge to MCP servers so the 4B model does not hallucinate APIs, so a baked in context7 mcp will be integrated.
7. **Opinionated Toolset:** A maximum of 8 perfectly engineered tools. No bloat.
8. **Terminal First:** The UI is an immersive, sticky terminal chat interface built with `ink`.
9. **Observability as Trust:** The terminal UI exposes the internal dialogue and handoffs between the agents in real-time, proving to the user that a rigorous methodology is being followed.


## The Dual-Agent Loop
Existing CLI coding agents rely on 1 single agent loop to plan, code, and review. Small models fail at this. We split the roles (while both using the same loaded model):

### 1. The Thinker (Architect)
- **Role:** System design, context gathering, and constraint management.
- **Abilities:** Can search files, read snippets, query MCP docs, and on-the-go update `system_patterns.md + project_brief.md`. 
- **Constraint:** NEVER allowed to edit user source code. 
- **Output:** Generates an ephemeral `plan.md` containing strict steps and tagged `.brain/` rules.

### 2. The Executor (Coder)
- **Role:** Pure execution of the Thinker's plan.
- **Abilities:** Reads files, edits user source code, runs terminal commands (linting/tests).
- **Constraint:** NEVER allowed to touch `.brain/` memory files or change the overarching project architecture.
- **Output:** Produces code diffs and execution summaries to hand back to the Thinker for review. (Code diffs are produced by the harness).

The goal is that when the executor finishes, the thinker gets another round to think about if everything was done correctly compared to the plan it set up and seeing what commands the executor ran, what the executor edited etc.. If it is deemed successful, the turn ends and the user can prompt again. If not successful, can create a plan.md on what else to build and hands it over to the coder agent, and the loop starts again.

The user's prompt will only land at the Thinker who refines it and finds everything for it to start the loop.
A single chat session means 2 agent loops contained in 2 different variable, so the two agents never listen into each other's message history / context.
The user can always start new chat sessions.

## What We Are NOT Building (Out of Scope)
- A full GUI/Electron app (This is Phase 2, do not build it now).
- An LLM-based "Router" (Routing is hardcoded Node.js logic).
- A Vector Database/Heavy RAG pipeline.
- A 40-tool registry. Keep it lean and heavily gated by persona.