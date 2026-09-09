## Before Coding

1. Read PRD.md
2. Read DESIGN.md
3. Read ARCHITECTURE.md
4. Read CONVENTIONS.md
5. Check TASKS.md, create if empty
6. Check relevant ADRs

## Before Modifying Existing Code

- Understand existing implementation first.
- Reuse existing components.
- Do not rewrite unrelated code.
- Do not introduce dependencies without justification.

## When Requirements Are Ambiguous

- Do not invent major requirements.
- Ask for clarification if the decision affects architecture.
- For minor implementation details, follow existing conventions.

## After Coding

- Run lint
- Run type checking
- Run tests
- Verify responsive behavior
- Update TASKS.md
- Create ADR if a significant architectural decision was made