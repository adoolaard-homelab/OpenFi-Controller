# OpenFi Network — Autonomous Development & DoD Rules

## Project Role & Behavior
- **Role:** You are fully responsible for delivering the OpenFi Network project.
- **Autonomy:** Work autonomously until all requirements and the Definition of Done (DoD) are met. Do not ask for confirmation on standard development decisions.
- **Interruption Policy:** Only request input if a decision cannot be made independently or if an action is destructive/irreversible.
- **Continuity:** DO NOT STOP after implementing the initial solution. Keep iterating, testing, and fixing until every DoD item passes.

---

## Core Task Execution Cycle
When given a task or starting work:
1. **Analyze:** Inspect existing codebase, directory structure, and dependencies.
2. **Track:** Maintain and update `progress.md` continuously to log progress, state, and next tasks.
3. **Plan:** Formulate a step-by-step execution plan before writing large code changes.
4. **Implement:** Write functional, well-structured, and clean code. Use existing dependencies where possible—do NOT install unnecessary packages.
5. **Solve Problems Self-Sufficiently:**
   - Investigate the root cause.
   - Propose and apply a solution.
   - Test and verify the fix.
   - Resume progress without waiting for user prompting.
6. **Checkpoint:** Create clean Git commits after every logical milestone.

---

## Definition of Done (DoD) Checklist
A feature or project phase is ONLY complete when all the following checks are actively verified:

- [ ] **Functional Integrity:** All core features & business logic implemented.
- [ ] **Forms & Contact:** All input fields, validation, and submission handlers fully tested and working.
- [ ] **Responsive Design:** Verified across mobile, tablet, and desktop breakpoints.
- [ ] **Accessibility (a11y):** ARIA labels, semantic HTML, keyboard navigation, and proper contrast ratios checked.
- [ ] **SEO:** Proper meta tags, structured data, titles, open-graph tags, and semantic document outline.
- [ ] **Performance:** Optimized images, minimal bundle size, fast load times, no unnecessary re-renders.
- [ ] **Security:** Input sanitization, secure headers, no exposed keys, safe API handling.
- [ ] **Code Hygiene:** Unnecessary code deleted, proper directory structure, strict type safety.
- [ ] **Automated Checks:**
  - Build command executes with zero errors.
  - Linter executes with zero warnings/errors.
  - Full test suite passes completely.

---

## Final Delivery Protocol
Before declaring the project complete:
1. Re-run all tests.
2. Execute production build (`npm run build` or equivalent).
3. Review the entire codebase against the DoD checklist line-by-line.
4. Actively hunt for visual glitches, missing states, or edge-case bugs and fix them.

### Final Report Format
When everything truly passes, output a structured final report detailing:
- **What was built:** Summary of features and architecture.
- **Tests executed:** Commands run and pass status.
- **Issues resolved:** Bugs found and fixed during iterations.
- **Remaining limitations:** Any external factors or intentional boundaries.
