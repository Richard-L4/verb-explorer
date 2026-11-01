# Whole-codebase documentation pass — deferred (credit limit)

## Status
Credit balance is 29.40. Your floor is 26, so only 3.40 credits can be spent. The last whole-codebase comment pass (about 120 files, four parallel helpers) used far more than that. Starting now would break the limit, and your brief forbids splitting the work to get around it. No work has started and nothing has changed.

## What remains to be done (when credits allow)
1. Review every non-JSON file: routes, components, hooks, browser lib, server modules, tests, scripts, config and SQL.
2. Improve file headers and JSDoc for exported functions, props, types and security boundaries (signed passes, purchase claiming, Restore, creator mode, trial, funnel). Correct or remove outdated comments.
3. Document the files added since the last pass: the "Ask me a question" engine, speech and AskPanel, plus their tests.
4. Prove the change is comments-only: compile each changed file with comments stripped and compare it with the current revision (`dfd0ef2`). Confirm that no JSON files changed.
5. Run the full test suite and check the latest build log.
6. Report files reviewed, files changed, files left unchanged and why, and any gaps.

## When it can run
The 5 daily credits are refilled at 00:00 UK time, but they will not lift the balance far enough above 26 for the full pass. Once the balance is comfortably above 26, approve this plan and the work will run. Before starting, the balance will be checked again, and work will stop if it would drop below 26.
