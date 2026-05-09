---
trigger: always_on
---

# Coding Standards & Best Practices

## 1. DRY (Don't Repeat Yourself)
- Aggressively deduplicate code.
- File system operations (read, write, check exists) should be wrapped in a centralized `fsUtils.ts` adapter to handle errors gracefully and uniformly.
- Terminal output formatting (colors, spinners, error formatting) must be centralized in UI components, not scattered in engine logic.
- Types and interfaces should go in /src/types/<Type>.ts

## 2. The Orchestrator Is Law (State Management)
- The LLM routing must be **100% deterministic Node.js logic**. Do not use LLMs to decide which agent runs next.
- Implement a strict State Machine (e.g., `PLANNING` -> `EXECUTING` -> `REVIEWING`). State transitions are triggered *only* by successful tool calls (e.g., calling `handoff_to_executor` changes the state).
- Prevent infinite loops: The orchestrator must track iteration counts. If an agent loops > 3 times without changing file hashes, the orchestrator forces a termination and handing off to the thinker.

## 3. Tool Engineering
- Tools are the primary way agents communicate with the Orchestrator, not just the file system.

## 4. Error Handling
- Never swallow errors. 
- Use custom Error classes (e.g., `ProviderError`, `ToolExecutionError`) so the Orchestrator can decide whether to crash, retry, or ask the Meta-Agent for help.
- Return explicit success/failure objects from tools rather than throwing raw exceptions that might break the agent loop.

## 5. Asynchronous Code
- Use `async/await` exclusively. No `.then()` chaining.
- When making concurrent non-dependent calls (e.g., reading multiple memory files), use `Promise.all()` to speed up the engine.