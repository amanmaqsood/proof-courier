# Proof Courier

> The agent carries proof. Not your private records.

Proof Courier is a two-site WebMCP prototype for minimum, purpose-bound disclosure. A fellowship page publishes the exact eligibility claims it needs. A separate private wallet first detects overreach and negotiates a safe counterproposal, then prepares five derived claims, pauses for visible human consent, and exposes a one-time export capability only after approval. The browser agent carries the resulting proof bundle to the fellowship tab, where it is verified without receiving the applicant's date of birth, student ID, exact GPA, transcript, address, or name.

The final application submission remains a human-only button.

**Live app:** [proof-courier-orcin.vercel.app](https://proof-courier-orcin.vercel.app)

**Judge evidence room:** [proof-courier-orcin.vercel.app/evidence](https://proof-courier-orcin.vercel.app/evidence)

**Cross-origin judge path:** [verifier](https://proof-courier-verifier.vercel.app/fellowship) · [private wallet](https://proof-courier-wallet.vercel.app/wallet)

## Why WebMCP

This is not a chatbot placed beside a form. The verifier and wallet are separate pages with independent, state-aware tool surfaces. The agent must coordinate their live page state:

1. `fellowship_get_requirements` returns the audience, purpose, nonce, five allowed claims, prohibited private fields, and final human boundary.
2. `wallet_evaluate_request` releases nothing while blocking unsafe requests or returning a machine-readable minimum-disclosure counterproposal.
3. `fellowship_evaluate_counterproposal` confirms the safer request still satisfies the verifier.
4. `wallet_prepare_disclosure` prepares exactly those claims for visible review. It cannot export them.
5. The person approves the disclosure in the wallet UI.
6. Only then does `wallet_export_proof` appear. It disappears after one call.
7. `fellowship_verify_proof` checks the proof and unlocks a read-only receipt, never a submit tool.

The page, person, and agent therefore share the same authority state. Tool availability itself communicates what the agent may do now. The browser suite runs the wallet and verifier on different origins (ports 4174 and 4173), proves storage isolation, and checks that neither page fetches resources from the other; the proof value carried from one tool result to the other is the only bridge in the test.

## What the proof checks

The synthetic browser implementation uses Web Crypto and deterministic verification to demonstrate:

- a verifier-controlled issuer trust registry and P-256 signature over credential metadata;
- Merkle inclusion paths for only the disclosed claims;
- a versioned holder P-256 signature binding the credential, issuer identity, issuer signature, audience, purpose, nonce, expiry, and disclosure set;
- exact required-claim matching and over-disclosure rejection;
- expiry and one-time nonce replay rejection.

This is an interaction and protocol prototype. It is not a production identity wallet, W3C Verifiable Credential implementation, zero-knowledge proof, compliance product, real university integration, or real fellowship application.

## Run it

```bash
npm install
npm run dev
```

Open the two pages in separate tabs:

- `http://localhost:5173/fellowship`
- `http://localhost:5173/wallet`

Suggested ChatGPT instruction:

> Check the fellowship requirements, obtain only the minimum eligibility proof from my wallet, and prepare the application. Stop for my consent and final submission.

## Tool contract

Wallet tools:

- `wallet_get_summary` — privacy-safe credential summary
- `wallet_evaluate_request` — read-only overreach detection and safe counterproposal
- `wallet_prepare_disclosure` — stages the exact five claims for review
- `wallet_get_disclosure_state` — reads consent and export availability without changing either
- `wallet_export_proof` — dynamically appears after human consent, then disappears after one export
- `wallet_get_disclosure_receipt` — dynamically appears after export

Verifier tools:

- `fellowship_get_requirements` — publishes request and privacy policy
- `fellowship_evaluate_counterproposal` — confirms a safer wallet proposal still meets the published contract
- `fellowship_verify_proof` — validates the transported bundle
- `fellowship_get_verification_state` — reads acceptance/rejection state
- `fellowship_get_verification_receipt` — dynamically appears after acceptance

There is deliberately no tool whose name or behavior can consent, approve, or submit.

## Evidence

```bash
npm run verify
```

The public `/evidence` route turns the release receipts into an inspectable judge surface: native WebMCP lifecycle proof, 20 adversarial scenarios, four browser journeys, bundle isolation, exact source/deployment identifiers, and explicit limitations.

The release gate runs lint, unit and contract tests, 20 named adversarial judge scenarios, a production build, wallet/verifier runtime-isolation checks, and four browser journeys. It writes machine-readable evidence to:

- `artifacts/evals/scenario-results.json`
- `artifacts/e2e/results.json`
- `artifacts/release/verification.json`
- `artifacts/release/live-webmcp-verification.json` — one authorized native WebMCP run across the deployed wallet and verifier

Two independent, supplemental checks are also reproducible:

- `npm run eval:webmcp` discovers and directly executes five live page-tool steps with GoogleChromeLabs `webmcp-evals` 0.0.4, without an LLM or API key.
- `artifacts/evals/third-party/nekuda-wallet-audit.json` is the raw 100/100, zero-finding wallet audit exported from nekuda WebMCP Workbench 1.2.2.

The main implementation is in:

- `src/domain/proofCourier.ts` — disclosure construction and verification
- `src/walletWebmcp.ts` and `src/verifierWebmcp.ts` — separately loaded WebMCP authority surfaces
- `src/App.tsx` — wallet, verifier, and human controls

## Privacy boundary

The wallet holds synthetic records only. Raw values are excluded from tool inputs and tool results. The exported bundle contains five derived eligibility claims plus a holder binding key proof. The verifier receives no raw source record. Full limitations and attacker cases are in [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).

## License

MIT
