# Proof Courier: Top-Tier WebMCP Execution Plan

Status: executing — recommendations accepted  
Prepared: 2026-09-03 IST  
Working deadline: 2026-12-31, based on the founder's extension email. Treat this as the controlling planning date and reserve the end of December for release and submission rather than feature work.

## 1. Objective

Turn Proof Courier from a polished minimum-disclosure demonstration into the clearest working reference for **negotiated, human-authorized data disclosure on the agentic web**.

The submission should make this sequence undeniable:

1. A verifier asks for more information than it needs.
2. The wallet's WebMCP policy layer blocks the overreach and exports nothing.
3. The agent negotiates a smaller set of derived eligibility claims.
4. A human sees and approves the exact purpose, recipient, claims, and lifetime.
5. Approval creates a one-use WebMCP capability that did not previously exist.
6. The agent carries the proof to the verifier.
7. The verifier checks a locally trusted issuer, integrity, holder binding, purpose, audience, freshness, minimum disclosure, and replay.
8. The export capability disappears, a safe receipt remains, and final submission stays human-only.

Positioning:

> WebMCP makes websites callable by agents. Proof Courier makes that authority minimal, inspectable, revocable, and human-owned.

## 2. What “95% confidence” may honestly mean

No plan can establish a 95% chance of winning or prove subjective superiority over every unseen or undiscoverable entry. The executable target is instead:

- at least 95% successful completion across a frozen model-evaluation suite;
- 100% pass on the critical consent, privacy, trust-anchor, replay, and capability-lifecycle invariants;
- zero known critical or high-severity defects at release;
- automated static comparison across at least 95% of the frozen discoverable challenge-repository corpus;
- deep code review of the strongest 20–30 entries and live smoke testing of the strongest reachable 10;
- evidence that no audited public entry combines Proof Courier's full mechanism: request minimization, counterproposal, visible human consent, dynamically granted one-use capability, independent issuer trust, cross-surface proof transport, replay protection, and human-only final action.

Any statement of superiority must name the benchmark and access date. It must never claim knowledge of private submissions or future judging.

## 3. Judging strategy

The four published criteria are equally weighted. Tie-break priority starts with WebMCP Leverage and then Execution.

| Criterion | Winning evidence |
| --- | --- |
| WebMCP Leverage | State-dependent tools, tool withdrawal through abort signals, cross-surface agent relay, structured negotiation, purposeful annotations, and native in-app-browser proof |
| Execution | Trusted-issuer verification, exact disclosure checks, graceful errors, deterministic reset, complete UX, independent security tests, and exact-SHA deployment receipts |
| Potential Impact | A familiar high-stakes fellowship workflow where raw records are routinely over-shared; measurable reduction from requested raw fields to necessary predicates |
| Creativity & Ambition | A browser-native disclosure negotiation protocol where human consent literally changes what an agent is capable of doing |

## 4. Competitive benchmark program

### 4.1 Freeze the public corpus

Create a dated corpus from reproducible GitHub queries including `"WebMCP Challenge"`, `"OpenAI WebMCP"`, `webmcp hackathon`, `webmcp devpost`, and `topic:webmcp`.

For every result capture:

- repository and commit SHA;
- challenge-entry relevance;
- live URL, video, licence, and last update;
- source lines and file count;
- declared and statically discovered WebMCP tools;
- annotations and dynamic registration behavior;
- test, eval, CI, accessibility, and security evidence;
- human-only boundaries and recovery behavior.

Exclude SDKs, curated lists, examples, and unrelated products from the entry comparison, but retain the exclusion reason.

### 4.2 Deep-audit the strongest field

Deep-review at least these archetypes and any later entry that scores above them:

- WebMCP Computer: breadth, dynamic nested tools, sandbox, test depth.
- No Seat Without a Route: stale-state recovery and write-capability withdrawal.
- Pawball Arena: semantic agent control, consent, and live trace.
- AgentDAW: shared human-agent state and product completeness.
- AetherDraw and Material: visual co-creation and immediate demo clarity.
- CoAuth, Formwork, and Withheld: high-stakes human gates.
- AgentDesk and VPAI AIC: capability governance and behavioral assurance.
- Evidence Desk, Referee, and data-rights/access-review workbenches: adjacent evidence/privacy collision.

### 4.3 Score without pretending objectivity

Use a published rubric with source links. Each item is 0–4 and every score needs a receipt:

- meaningful WebMCP necessity;
- dynamic capability lifecycle;
- human-agent shared state;
- safety and authority boundary;
- error recovery;
- tool-schema quality;
- native browser evidence;
- repeatable evals;
- product completeness;
- visual comprehension;
- real-audience impact;
- novelty versus the frozen corpus.

Run static extraction across the corpus, manual code review on the top tier, and native smoke tests only where a public live URL is available. Publish limitations and never reuse competitor code or assets without licence review.

## 5. Product architecture: Proof Courier Trust Negotiation

### 5.1 Domain modules

Refactor toward one authoritative implementation per concept:

- `VerifierPolicy`: audience, purpose, required predicates, prohibited raw fields, accepted alternatives, expiry limit, and final-action policy.
- `RequestEvaluator`: deterministic allow, block, or counterproposal decision.
- `DisclosurePlan`: the exact derived predicates proposed for human review.
- `ConsentGrant`: recipient origin, purpose, claim-set digest, expiry, maximum use count, and approval timestamp.
- `TrustedIssuerRegistry`: verifier-owned mapping from issuer ID/key ID to pinned public key and status.
- `ProofEnvelopeV2`: credential digest, issuer ID, disclosure proofs, holder binding, consent digest, nonce, audience, purpose, and expiry.
- `VerificationEngine`: the single canonical verification path used by the app and tests.
- `SafeReceipt`: non-linkable event record containing no raw source values, proof token, holder name, or stable subject identifier.

Remove the duplicate verifier implementation currently split between `proofCourier.ts` and `proofVerifier.ts` while preserving wallet/verifier bundle isolation.

### 5.2 WebMCP tool surface

Keep the surface small and outcome-oriented.

Verifier surface:

1. `fellowship_get_requirements` — returns the purpose-bound verifier policy and nonce.
2. `fellowship_evaluate_counterproposal` — confirms whether a derived-claim alternative satisfies the policy without submitting anything.
3. `fellowship_verify_proof` — verifies and consumes a one-time proof.
4. `fellowship_get_verification_receipt` — appears only after successful verification.

Wallet surface:

1. `wallet_get_safe_summary` — lists available predicate types, never raw values.
2. `wallet_evaluate_request` — read-only Request Firewall; returns allow, blocked, or counterproposal.
3. `wallet_prepare_disclosure` — stages the accepted minimum plan for visible review.
4. `wallet_get_disclosure_state` — reads safe lifecycle state.
5. `wallet_export_proof` — appears only after human approval and disappears after one use.
6. `wallet_get_disclosure_receipt` — appears after export and contains no reusable proof.

Never expose a generic raw-record reader, a consent-setting tool, an automatic-submit tool, or a tool that silently broadens the approved claims.

### 5.3 State machine

```text
NO_REQUEST
  -> REQUEST_EVALUATED_BLOCKED
  -> REQUEST_EVALUATED_COUNTERPROPOSAL
  -> SAFE_PLAN_PREPARED
  -> HUMAN_APPROVED
  -> EXPORT_AVAILABLE
  -> EXPORTED_ONCE
  -> EXPORT_WITHDRAWN
  -> VERIFIED
  -> HUMAN_SUBMITTED
```

Invalid or stale transitions return structured recovery instructions. Tool registration must reflect the current state rather than leaving permanently callable handlers that reject later.

## 6. Implementation milestones

### Execution receipt — 2026-09-03

- M0 baseline: complete locally. An isolated branch preserves the prior `5363cd8` baseline and its passing release gate.
- M1 trusted issuer and cryptographic correctness: complete for the prototype scope. Proof Envelope v2 removes sender-supplied trust, binds the entire presentation, rejects duplicate claims and invalid lifetimes, fails closed on malformed envelopes, and serializes concurrent nonce consumption.
- M2 Request Firewall: complete locally. Both wallet and verifier expose registered read-only negotiation tools; the browser journey proves overreach -> zero export -> counterproposal -> acceptance -> human consent -> one-use proof.
- M3 origin separation: complete for the prototype. Dedicated public wallet and verifier projects return HTTP 200 with security headers; the deployed Playwright journey proves distinct origins, storage isolation, no peer-origin resource transport, and the agent-carried proof as the only bridge.
- M4 first visual slice: complete locally. The landing page now explains the Request Firewall on desktop and 390px mobile; the full Judge Mode scenario selector remains pending.
- Current honest state: `TOP-TIER CANDIDATE, NOT YET PUBLIC-FIELD LEADING`. Deployment parity, real native-browser rerun, accessibility/performance evidence, independent review, and the two consecutive benchmark passes remain open.

### M0 — Baseline and claim discipline

Deliverables:

- create an isolated working branch;
- preserve the current passing release as a tag or exact SHA;
- record current tests, live deployment, native tools, and screenshots;
- mark every public claim as current, proposed, synthetic, or unsupported;
- remove any `cross-site`, standards-conformant credential, ZKP, production identity, or compliance wording that the implementation does not prove.

Gate:

- baseline is reproducible and no user-owned unrelated change is overwritten.

### M1 — Trusted issuer and cryptographic correctness

Deliverables:

- replace trust in `bundle.issuerPublicJwk` with a verifier-owned trusted issuer/key registry;
- carry only `issuerId` and `keyId` in the proof envelope;
- bind credential digest, issuer identity, disclosure set, consent digest, audience, purpose, nonce, issue time, and expiry into the holder signature;
- require the exact claim multiset and reject duplicates;
- validate credential lifetime, proof lifetime, future issue times, and allowed TTL;
- normalize malformed JWK, JSON, base64, signature, Merkle path, and schema failures into safe rejection results;
- centralize verification logic and preserve wallet/verifier bundle isolation.

Required adversarial tests:

- attacker replaces issuer key and re-signs;
- unknown, revoked, or mismatched issuer key ID;
- credential root or metadata changed after issuance;
- holder key or disclosure changed after consent;
- duplicated, missing, or extra claim;
- valid claim with incorrect predicate value;
- expired credential or proof;
- proof issued in the future;
- malformed proof components;
- nonce replay and concurrent replay race.

Gate:

- every defensive case fails closed; existing success path stays green; no private key or raw field is present in verifier bundles.

### M2 — Request Firewall and counterproposal protocol

Deliverables:

- implement `wallet_evaluate_request` as a deterministic, stateless policy decision;
- classify raw identifiers, excessive granularity, unrelated purpose, excessive TTL, unknown recipient, and automatic final action;
- return a structured counterproposal when a derived predicate can replace a raw field;
- allow the agent to carry that counterproposal to `fellowship_evaluate_counterproposal`;
- ensure blocked requests create no disclosure draft, consent card, or export capability;
- show an explicit `0 private fields exported` result;
- ship three deterministic scenarios: legitimate, overreaching-but-negotiable, and malicious/non-negotiable.

Gate:

- attack -> refusal -> safe counterproposal -> human consent -> one-time proof succeeds through registered WebMCP tools; the malicious scenario never creates export authority.

### M3 — Real origin separation

Deliverables:

- deploy wallet and verifier as separate origins or separate Vercel projects from the same public repository;
- ensure no shared local storage, in-memory object, query parameter, backend session, or hidden API transfers the proof;
- make the browser agent carry the opaque proof only through tool output/input;
- apply restrictive CSP, origin isolation, frame policy, referrer policy, and permission policy appropriate to each app;
- provide a local two-origin development command and automated two-origin E2E harness.

Fallback rule:

- if separate-origin deployment cannot pass the complete browser suite quickly, keep the current deployment and describe it honestly as two surfaces rather than claiming cross-origin transport.

Gate:

- the end-to-end journey works with one origin offline at a time where appropriate, and bundle analysis proves wallet-only material is absent from the verifier application.

### M4 — Judge Mode and visual explanation

Deliverables:

- one-click deterministic reset;
- one copyable judge prompt;
- a three-column trust map: Verifier Request -> Agent Relay -> Private Wallet;
- a privacy meter: raw fields requested, blocked, derived predicates shared, raw values shared;
- capability lifecycle: absent -> review -> live once -> spent;
- a live trace showing goal, tool, safe input summary, state transition, result, and recovery guidance;
- scenario selector for safe, overreaching, and malicious requests;
- concise explanation of synthetic boundaries and what production integration would require.

Design requirements:

- the mechanism is understandable within 15 seconds;
- no terminal-style decoration unless it explains a real event;
- keyboard operation, visible focus, non-color status cues, reduced-motion support, responsive layout, and accessible announcements;
- animations reinforce state transitions and never obscure evidence.

Gate:

- five unfamiliar reviewers can correctly answer: what was requested, what was blocked, what the human approved, what was exported, and what the agent still cannot do.

### M5 — Agent experience and recovery

Deliverables:

- every tool description states outcome, precondition, non-effect, and next recovery step;
- schemas use enums, bounds, uniqueness, `additionalProperties: false`, and meaningful parameter descriptions;
- annotations correctly identify read-only, mutating, external/untrusted, and idempotent behavior;
- abort signals withdraw capabilities without cancelling an in-flight tool before its result settles;
- structured error codes distinguish stale version, policy mismatch, consent required, expired grant, already used, wrong origin, and malformed proof;
- UI and WebMCP call the same domain operations and produce the same state.

Gate:

- an agent can discover the path from tool descriptions alone, recover from every expected failure, and never need DOM guessing for the demonstrated task.

### M6 — Evaluation and security evidence

Evaluation layers:

1. Unit and property tests for canonicalization, policy evaluation, signatures, Merkle proofs, time, exact disclosure, and receipts.
2. State-machine tests proving which tools exist in every state.
3. Adversarial suite covering prompt-like untrusted text, over-parameterization, stale state, replay, forgery, malformed input, and race behavior.
4. Browser E2E for manual, WebMCP, keyboard, reset, failure, recovery, and post-export withdrawal paths.
5. GoogleChromeLabs `webmcp-evals` smoke and tool-selection datasets.
6. Real ChatGPT in-app-browser runs on the deployed origins.
7. Independent production-bundle inspection and exact-SHA deployment verification.

Release thresholds:

- 100% critical invariant pass rate;
- at least 95% natural-language agent-task completion on the frozen eval set, with every failure classified;
- zero critical/high security findings;
- no console errors in the canonical journey;
- accessibility and performance budgets measured on the deployed judge path;
- all claims in the Evidence Room generated from machine-readable receipts where possible.

Gate:

- a clean checkout can reproduce the evidence with one documented verification command.

### M7 — Reusable protocol kit and conformance lab

The challenge entry remains a complete web product, but the underlying mechanism should be reusable rather than a one-off set of fellowship conditionals.

Deliverables:

- publish a small `@proof-courier/webmcp` package or repository workspace package containing the policy schema, request evaluator, canonical proof envelope, lifecycle helpers, and safe receipt types;
- provide framework-neutral browser APIs plus one React adapter;
- ship a verifier integration example that can declare required predicates and accepted privacy-preserving alternatives;
- ship a wallet integration example that can evaluate requests without exposing credential contents;
- publish a conformance CLI that checks tool schemas, annotations, state-dependent registration, consent invariants, proof verification, and replay behavior;
- generate a machine-readable compatibility report for the live Proof Courier deployment;
- version the protocol and document extension points without claiming standard status.

Gate:

- a clean example website can add a verifier policy and pass the conformance suite without importing fellowship-specific UI or state.

### M8 — External validation, red-team, and competitor re-audit

Deliverables:

- attack the release as a malicious verifier, dishonest issuer, replaying verifier, impatient agent, and confused human;
- rerun the frozen public-repository scan;
- rescore Proof Courier and every top-tier competitor using the same rubric;
- document where competitors remain stronger;
- change the product only when a gap affects a judging criterion and can be demonstrated reliably.

Gate:

- no unmitigated critical objection remains from customer, brand, operations, or risk lenses; every comparative claim is scoped and receipted.

### M9 — Release candidate and submission package

Deliverables:

- public live URLs tested logged out in ChatGPT's in-app browser and supported Chrome;
- public repository with visible licence, architecture, threat model, eval documentation, limitations, and exact judge path;
- public YouTube demo below three minutes with clear audio;
- Devpost copy that answers the four required questions without inflated claims;
- final screenshots and social preview that show the privacy mechanism rather than a generic dashboard;
- exact submitted Git SHA and deployment IDs recorded;
- post-submission freeze plan.

Gate:

- another person can follow the submitted instructions without help; Devpost shows `Submitted`, not `Draft`; repository and deployment are frozen after the controlling deadline.

## 7. Demonstration script

The canonical video and judge path should be one story:

1. The fellowship asks for DOB, address, transcript, exact GPA, student ID, and automatic submission.
2. The agent asks the wallet to evaluate the request.
3. The Request Firewall blocks it, exports zero fields, and proposes five derived predicates.
4. The verifier confirms that those predicates are sufficient.
5. The wallet prepares the exact disclosure, but export remains absent.
6. The human approves the recipient, purpose, five claims, expiry, and one-use limit.
7. `wallet_export_proof` appears; the agent calls it once.
8. The tool disappears and a safe receipt appears.
9. The verifier validates against its pinned issuer registry and accepts the proof.
10. A replay or substituted issuer is rejected.
11. The application is ready, but only the person can submit.

The closing line:

> Proof Courier does not ask people to trust an agent with their wallet. It gives the agent one narrow capability, for one recipient and purpose, then takes it away.

## 8. Three-month execution calendar

The schedule deliberately completes the product before the deadline month. Dates are working targets; milestone gates, not calendar optimism, authorize the next phase.

| Window | Focus | Exit condition |
| --- | --- | --- |
| Sep 4–10 | M0 baseline, architecture decision records, frozen competitor corpus | Current product and public field are reproducible from dated receipts |
| Sep 11–24 | M1 trusted issuer, proof-envelope v2, verifier consolidation | All trust, tampering, time, malformed-input, and replay attacks fail closed |
| Sep 25–Oct 8 | M2 Request Firewall and privacy-preserving counterproposal | Unsafe request is blocked; negotiable request reaches safe human review |
| Oct 9–22 | M3 true origin separation and transport isolation | Wallet and verifier run independently; the agent is the only proof courier |
| Oct 23–Nov 5 | M4 Judge Mode, trust map, privacy meter, and design system | An unfamiliar reviewer understands the mechanism without narration |
| Nov 6–19 | M5 agent experience, lifecycle semantics, and recovery | Agents complete and recover from the entire journey from tool contracts alone |
| Nov 20–Dec 3 | M6 evaluation laboratory and production evidence | Critical invariants are 100%; frozen agent eval is at least 95% successful |
| Dec 4–10 | M7 reusable protocol package and conformance CLI | A second example integration passes without fellowship-specific code |
| Dec 11–17 | M8 external usability, accessibility, security red-team, competitor re-audit | No open critical/high issue; comparative claims have dated evidence |
| Dec 18–20 | Release candidate freeze and full rehearsal | Exact SHA passes clean-checkout, deployed-browser, and in-app-browser gates |
| Dec 21–24 | Final video, screenshots, README, Devpost copy | Submission package is complete and independently reviewed |
| Dec 25–27 | Upload, Devpost dry run, logged-out verification | Public assets resolve and another person completes the judge path unaided |
| Dec 28–31 | Submission buffer and freeze | Devpost shows Submitted; exact repo and deployment remain unchanged |

### Weekly operating rhythm

Every week ends with:

1. a working deployed increment;
2. updated threat-model and architecture receipts;
3. unit, adversarial, browser, and WebMCP eval results appropriate to that increment;
4. a five-minute judge rehearsal by someone who did not build the feature;
5. a competitor-delta note explaining whether the change improved one of the four official criteria;
6. an explicit keep, repair, or cut decision.

No milestone advances with a known critical defect. No public superiority claim advances without a frozen comparison corpus and cited evidence.

### December change policy

- December 1 is the feature-completeness target.
- December 10 is the protocol/API freeze target.
- December 18 is the release-candidate freeze target.
- After December 18, only verified fixes to correctness, accessibility, reliability, submission materials, or deployment are allowed.
- Preserve the final four days as operational buffer. Do not use them for new features.

## 9. Kill list

Do not add:

- a generic chat interface;
- blockchain, ZKP, W3C VC, production identity, or regulatory-compliance claims not fully implemented;
- broad wallet account management;
- payments, real applications, or real personal records;
- dozens of thin tools;
- a new framework or unnecessary backend;
- competitor UI/assets/code without explicit licence review;
- features absent from the canonical demo;
- a score or win-probability claim that cannot be reproduced.

## 10. Final release decision

Ship the ambitious version only if all critical gates pass. Otherwise ship the last secure, coherent, exactly verified version. A smaller trustworthy submission scores better than a larger system whose core privacy or signature claim is false.
