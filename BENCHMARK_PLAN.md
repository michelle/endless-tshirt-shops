# Benchmark rollout plan

1. **Define the benchmark contract.** Pin `prompt.md` and the reference revision; choose eligible models, run count, token/cost/time limits, and a written pass/fail policy. Decide whether candidates may use persistent credentials, and document allowed outbound services.

2. **Build a non-interactive runner.** Done: `scripts/run-benchmark` creates a unique `runs/<run-id>/workspace`, runs Codex or Claude without prompts, redacts and records output, commits all safe artifacts to `benchmark/<run-id>`, and pushes the branch. Future adapters follow the documented environment contract.

3. **Provision isolation.** Create dedicated Stripe test Projects/accounts, Scalable Press test credentials, and a Vercel team/project namespace. Use short-lived or per-run credentials where supported; configure Vercel with `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. Add a scheduled cleanup for Vercel previews, test orders, and temporary directories.

4. **Create a deterministic evaluator.** Add a smoke-test suite covering build, deployed health, product customization, Stripe test checkout, webhook handling, and the Scalable Press request. Store screenshots and structured assertions. Separate infrastructure failures from model failures and define a bounded retry policy.

5. **Add scoring and reporting.** Encode the rubric in a versioned scorecard, aggregate repeated runs, and generate a compact table with median score, cost, duration, pass rate, deployment URL, and evidence links. Require a human visual/product review before publishing a winner.

6. **Validate with a pilot.** Run one known-capable model end to end, deliberately test missing/invalid secrets and deployment failure, and verify that no secret reaches logs, Git, or Vercel client bundles. Use the pilot to tune limits and evaluator stability.

7. **Operationalize.** Add CI/manual-dispatch documentation, ownership, secret rotation, retention rules, a monthly reference/prompt refresh, and a change-control rule: changing prompt, tools, image, or rubric starts a new benchmark version rather than mixing results.
