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
| Adversarial judge suite | `npm run eval` | 15 named scenarios in `artifacts/evals/scenario-results.json` |
| Production compilation | `npm run build` | hashed `dist` assets |
| Runtime isolation | `npm run verify:bundles` | wallet signing fixtures absent from verifier/main chunks; raw records absent everywhere |
| Browser journey | `npm run e2e` | full two-tab flow, 390px layouts, rejection recovery |
| Complete receipt | `npm run verify` | `artifacts/release/verification.json` |

## Adversarial scenarios

The judge suite verifies:

1. valid minimum disclosure;
2. absence of raw identity values;
3. wrong-audience rejection;
4. wrong-purpose rejection;
5. expiry rejection;
6. nonce replay rejection;
7. missing-claim rejection;
8. over-disclosure rejection;
9. changed-claim rejection;
10. forged-issuer rejection;
11. post-consent envelope mutation rejection;
12. duplicate/internal claim request refusal;
13. export absent before visible human consent;
14. one-time export withdrawal and safe receipt transition;
15. absence of agent consent, approval, or submission authority.

The browser suite independently proves that two separate page registries can complete the full journey and that malformed proof remains recoverable rather than creating a false success state.
