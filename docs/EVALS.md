# Proof Courier evaluation plan

Proof Courier is evaluated as a capability system, not as a visual demo. A valid presentation must pass every relevant cryptographic and policy check; a failed check must remain visible and must not unlock human submission.

## Independent WebMCP checks

Proof Courier also carries two supplemental checks that use third-party WebMCP tooling:

- `artifacts/evals/third-party/nekuda-wallet-audit.json` is the raw wallet audit exported by nekuda WebMCP Workbench 1.2.2. It scored 100/100 with no findings after schema and naming fixes.
- `npm run eval:webmcp` starts a temporary local app when needed, then runs the pinned GoogleChromeLabs `webmcp-evals` 0.0.4 smoke runner against the wallet and verifier. This layer directly discovers and executes live page tools without an LLM or API key.

These are supplemental checks, not certifications. The project-owned adversarial and Playwright suites remain the release gate because they cover the two-tab consent lifecycle and negative cases that a fresh-page smoke runner cannot represent.

## Release gates

| Gate | Command | Evidence |
| --- | --- | --- |
| Static quality | `npm run lint` | zero ESLint errors |
| Domain and tool contracts | `npm test` | proof construction, verification, dynamic tools, stale writes |
| Adversarial judge suite | `npm run eval` | 22 named scenarios in `artifacts/evals/scenario-results.json` |
| Release-copy consistency | `npm run verify:copy` | public counts match machine receipts |
| Production compilation | `npm run build` | hashed `dist` assets |
| Production chunk content | `npm run verify:bundles` | signing fixtures confined to the wallet-named chunk; listed raw record values absent from every chunk; does not prove role-specific deployment isolation |
| Browser journey | `npm run e2e` | six checks covering the two-origin flow, scenario lab, evidence room, rejection recovery, 390px layouts, and automated accessibility |
| Complete receipt | `npm run verify` | `artifacts/release/verification.json` |

## Adversarial scenarios

The judge suite verifies:

1. valid minimum disclosure;
2. absence of raw identity values;
3. wrong-audience rejection;
4. wrong-purpose rejection;
5. expiry rejection;
6. nonce replay rejection within one active verifier session;
7. missing-claim rejection;
8. over-disclosure rejection;
9. changed-claim rejection;
10. forged-issuer rejection;
11. post-consent envelope mutation rejection;
12. duplicate/internal claim request refusal;
13. export absent before visible human consent;
14. atomic export withdrawal and safe receipt transition from a versioned wallet grant;
15. absence of agent consent, approval, or submission authority;
16. rejection of an issuer identity outside the verifier trust registry;
17. raw-field requests receive a derived-claim counterproposal;
18. repurposing is blocked before a consent draft exists;
19. automatic submission requests are blocked;
20. excessive proof lifetime is reduced to ten minutes without releasing data;
21. consent cannot be widened after approval;
22. consent dated after verification time is rejected.

The browser suite independently proves that two separate origins can complete the full journey with separate browser storage and no peer-origin fetches during the tested path, that malformed proof remains recoverable rather than creating a false success state, and that every judge-facing route has no serious or critical axe findings. It also proves same-origin wallet-grant persistence across reload, one atomic claim across two real wallet tabs, and metadata-only cross-tab refresh notification. Because both origins serve the same application artifact and both role chunks, this suite does not claim role-specific build isolation. It does not prove verifier replay consumption across reloads, processes, or application instances, or wallet synchronization across devices or browser profiles.
