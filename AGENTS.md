## CI/Agent notes

- To run the project's tests locally from PowerShell on Windows, use:

  pnpm run test

- The workspace's default test task depends on building the dist directory; if you run the VS Code task that runs tests it will first run the build step. If you don't have pnpm installed, install it or run the tests via your package manager of choice.

- Note: the developer will always run the test suite locally before committing or pushing changes. Use `pnpm run test` in PowerShell to run the tests.
 
- Code style: Always use semicolon-terminated lines throughout the codebase.

## Principles to follow (LLM-friendly summary)

This project follows practical rules distilled from Robert C. Martin's "Clean Code", "Clean Architecture", SOLID principles, and the KISS philosophy. Additions and edits should adhere to these concise, machine-parsable guidelines:

- SINGLE RESPONSIBILITY: Give each function, class, and module one clear reason to change. Keep helpers small and focused.
- MEANINGFUL NAMES: Use descriptive, intention-revealing identifiers. Prefer clarity over cleverness; avoid abbreviations unless standard.
- SMALL FUNCTIONS: Prefer short functions (few lines). Each function should do one thing and be easy to test.
- PURE LOGIC & MINIMAL SIDE EFFECTS: Keep functions deterministic when possible; separate I/O, DOM, or network effects from pure computation.
- EXPLICIT CONTRACTS: Annotate inputs and outputs (use TypeScript types) and validate assumptions at boundaries. Prefer explicit over implicit behavior.
- DEPENDENCY RULES: Higher-level modules should not depend on lower-level module details; depend on abstractions, not concretions.
- OPEN/CLOSED (O from SOLID): Design modules that are open for extension but closed for modification — add new behavior via composition or small adapters.
- LISKOV SUBSTITUTION: Subtypes must be substitutable for their base types without surprises; preserve expected behavior when extending.
- INTERFACE SEGREGATION: Prefer many small, client-specific interfaces over large, general-purpose ones.
- DEPENDENCY INVERSION: Depend on abstractions (interfaces/types) and inject dependencies; avoid hard-coded concrete dependencies.
- KEEP IT SIMPLE (KISS): Prefer simple, direct solutions. Avoid premature optimization and over-engineering.
- READABLE CONTROL FLOW: Favor straightforward control structures. Avoid deep nesting; return early to reduce complexity.
- YAGNI / MINIMIZE SCOPE: Don't implement features until there's a clear need. Keep APIs minimal and avoid speculative complexity.
- TESTABLE CODE: Write code that is easy to unit-test. Favor pure functions and explicit dependency injection for side-effecting parts.
- DOCUMENT INTENT: Use short comments to explain why (not what) when intent isn't obvious. Prefer self-documenting code first.
- REFUSE MAGIC: Avoid hidden behavior, global mutable state, and surprises — make transformations and side effects explicit.

When editing or adding code, follow these rules as a checklist. LLMs and humans working on the repo should reference this section for consistent, maintainable changes.
