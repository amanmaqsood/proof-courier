# Proof Courier: Sealed Courier Execution Plan

Status: accepted for implementation; execution gates not yet satisfied

Version: 2.0

Updated: 2026-09-04 IST

Governing decision: [ADR 0003](adr/0003-evolve-to-sealed-courier-protocol.md)

Working deadline: 2026-12-31, based on the founder's extension email. This is a planning assumption until the organizer's live page or email is independently rechecked before release.

This version supersedes the September 3 plan below. The earlier plan is retained as a historical baseline because it records how Proof Courier reached the current prototype. Where the two conflict, ADR 0003 and this v2 plan govern.

## A. Accepted outcome and evidence boundary

The north star is:

> **The agent carries a proof it cannot read.**

The fellowship remains the single polished **Golden Path**. The architecture underneath it becomes a reusable, browser-native proof-delivery protocol with issuer, wallet, verifier, showcase, hostile-verifier, protocol, SDK, and conformance boundaries.

The public project permanently uses synthetic people, institutions, credentials, applications, and source records. A person may enter test data locally to demonstrate fresh issuance, but no real personal information is uploaded to or retained by Proof Courier services. Synthetic data is not permission to simulate security behavior: issuance, signing, authenticated requests, exact authorization, encryption, replay protection, verification, rejection, and recovery must execute for real.

The target is **dated public-corpus leadership**, not a guaranteed competition rank. Proof Courier may claim leadership only against a frozen, discoverable corpus, under a published rubric, with access dates and limitations. It must never promise a 95% chance of winning or knowledge of private, future, inaccessible, or undiscoverable entries.

"95%" is reserved for a predeclared, reproducible natural-language task-completion threshold. Critical privacy, authorization, trust, replay, and final-action invariants require 100% pass rates.

## B. Why the current prototype is not yet field-leading

These are release blockers, not optional polish:

| Gap | Current consequence | Required proof of repair |
| --- | --- | --- |
| Challenge state is only in memory | The current verifier rejects unissued and reused challenges in one active session, but reloads or other instances do not share consumption state | Unknown and unissued challenges fail; issued challenges are durable and atomically consumed across instances |
| Export authority is browser-local | IndexedDB now persists one versioned grant across reloads and same-origin tabs; ten-call cross-tab and one-hundred-call same-session races yield one claim | Preserve the invariant through role isolation and define any future cross-device model explicitly |
| Public deployments share one application bundle | Local wallet, verifier, and showcase artifacts now pass role/module/content and simulated-origin route/chunk isolation, but the public aliases still serve the legacy shared artifact | Cut over three deployment projects and prove each public origin serves only its role routes/chunks; verifier cannot fetch wallet code |
| Credential, salts, and keys are fixtures | The demo does not prove issuance or key custody | Fresh synthetic issuance produces fresh commitments and non-exportable holder keys |
| Requests are not authenticated | The wallet trusts agent-supplied audience and purpose strings | Wallet verifies origin-bound signed policy and challenge before planning |
| Replay state is ephemeral | Reloads, tabs, or instances can reset safety state | Replay rejection survives reload, tabs, and horizontally separate verifier instances |
| The agent can read the encoded proof | The promised sealed courier does not exist | Agent transports verifier-bound ciphertext and has no decryption path |
| Consent is an ordinary UI event | It is not strong evidence of human presence or exact intent | Authorization binds the canonical request and claim-set digest; WebAuthn is tested where supported |
| Repeated predicates leak precision | A verifier can binary-search a hidden value | Cumulative disclosure ledger and inference policy block threshold probing |
| Trust registry is a client constant | Rotation, suspension, and revocation are not credible | Signed/versioned manifest and pinned server-side verifier configuration are tested |
| Agent evaluation is a small direct-call slice | Natural-language selection and recovery are unproven | Frozen 100+ case evaluation publishes raw redacted receipts and failure classes |
| Impact and portability are asserted | One synthetic vertical may look like a one-off | Five unfamiliar-user sessions, external reviews, and a second verifier reuse the same protocol |

No UI, README, film, or submission copy may present a row above as complete before its gate passes on the release candidate.

### 2026-09-04 implementation checkpoint

- **P0 checkpoint committed:** commit `a010611` preserves the passing authority/durability slice while leaving the owner-managed demo script outside the checkpoint. A final tagged release candidate remains open.
- **P1 correctness slice implemented for one verifier session:** `fellowship_get_requirements` now lazily issues an unpredictable active challenge; that verifier instance rejects missing, expired, policy-mismatched, and caller-chosen unissued challenges.
- **P1 wallet authority slice implemented and integrated:** same-origin IndexedDB persists the versioned grant; wallet export atomically moves from `consented` to `exporting` before signing; competing calls across real tabs cannot both proceed; reload preserves withdrawal; and an in-flight failure moves to `failed_closed` rather than silently restoring authority. BroadcastChannel transports only a version number that tells peers to reread IndexedDB.
- **P2 local artifact slice implemented:** separate wallet, verifier, and showcase entries emit role-prefixed artifacts. Build-time module-graph guards, content and source-map scans, and a three-origin 200/404 route and entry-chunk matrix pass locally. The source UI module is still shared, and no public deployment has been moved to these artifacts.
- **Current receipt:** 78 unit/contract tests, 22 named adversarial scenarios, release-copy verification, the legacy production build, three isolated role builds, bundle inspection, six Playwright product journeys, and four browser durability/concurrency checks pass locally.
- **P1 is not complete:** the verifier `ChallengeStore` seam and in-memory atomic adapter exist, but a provisioned transactional backend and deployed cross-instance proof remain open. Wallet cross-device synchronization is intentionally out of scope; role isolation must preserve the now-tested browser-local grant invariant.
- **P2 is not complete:** production preview and alias cutover, deployed 200/404 and entry-chunk checks, security-header parity, and the full isolated Golden Path remain open.

## C. Dependency graph

```text
P0 Truthful baseline
  -> P1 Atomic authority and challenge semantics
      -> P2 Role-isolated applications and key hygiene
          -> P3 Protocol v3 schemas and canonicalization
              -> P4 Fresh synthetic issuance and trust lifecycle
                  -> P5 Authenticated verifier requests
                      -> P6 Exact human authorization
                          -> P7 Sealed presentation transport
                              -> P8 Inference defence and agent recovery
                                  -> P9 Attack lab and conformance kit
                                      -> P10 Agent and browser evidence
                                          -> P11 Portability and external validation
                                              -> P12 Release, re-audit, and submission
```

Later phases may be prototyped in parallel, but none may be described as complete until all prerequisite gates pass. Performance, accessibility, threat modelling, claim discipline, and deployment receipts run through every phase rather than being deferred to the end.

## D. Phase-by-phase implementation plan

### P0 — Freeze a truthful baseline

**Judge rationale:** Execution starts with reproducibility. A sophisticated claim that cannot be tied to an exact SHA, deployment, and receipt is weaker than a modest one that can.

**Build and document**

- Preserve the last passing prototype commit and tag; do not overwrite the user-owned demo-script change.
- Record clean-checkout lint, unit, adversarial, build, bundle, browser, and live-URL results.
- Generate a claim inventory with `implemented`, `partial`, `planned`, `synthetic`, or `unsupported` status.
- Record the exact public-corpus query, access date, inclusion rules, repository SHA, live URL, and evidence source for each comparison.
- Add a threat-model baseline for malicious verifier, compromised agent, dishonest wallet input, replaying verifier, confused holder, and curious third party.

**Acceptance gate**

- A new checkout reproduces the current prototype from documented commands.
- Every public technical claim maps to an automated or manual receipt.
- The audit gaps in section B are visible rather than hidden by the previous milestone labels.

**Kill/rollback gate**

- If the baseline cannot be reproduced, stop feature work and repair the release process.
- If a claim has no receipt, remove or qualify the claim rather than inventing evidence.

### P1 — Make authority and replay atomic

**Judge rationale:** "One use" must be a concurrency invariant, not a UI effect. This is the first proof that the security story survives an adversarial implementation review.

**Build**

- Introduce an explicit wallet `AuthorizationGrantStore` with versioned `authorized -> claimed -> spent` transitions.
- Claim a grant atomically before any asynchronous signing or encryption begins.
- A failed in-flight export moves to `failed_closed`; it never silently restores the same authority.
- Introduce a verifier `ChallengeStore` with `issued -> active -> claimed -> consumed` semantics.
- Use unpredictable challenges with explicit audience, purpose, issue time, expiry, policy version, and status.
- Reject unknown, unissued, expired, mismatched, already claimed, and consumed challenges.
- Persist both stores across reloads and tabs; use a server-side uniqueness/transaction primitive for verifier-wide consumption.

**Tests**

- Two, ten, and one hundred concurrent export calls yield exactly one claim.
- Two verifier processes racing on one presentation yield at most one success.
- Reload, duplicate tab, clock skew, stale version, and interrupted-signing cases fail closed.
- A random but previously unseen nonce is rejected.

**Acceptance gate**

- Property tests prove at-most-once grant use and challenge consumption.
- The canonical success journey still completes after a fresh request.
- Receipts expose safe transition IDs, never proof contents or stable subject identifiers.

**Kill/rollback gate**

- Do not use `one-time`, `replay-safe`, or `single-use` in public copy until the concurrent, cross-instance tests pass.

### P2 — Split roles into genuinely isolated applications

**Judge rationale:** Cross-site transport is meaningful only when the sites are separate security principals and one deployment cannot load the other's secrets or implementation.

**Target workspace**

```text
apps/
  issuer/
  wallet/
  verifier/
  showcase/
  hostile-verifier/
packages/
  protocol/
  wallet-core/
  verifier-core/
  webmcp-adapters/
  telemetry/
  testkit/
```

**Build**

- Produce separate build entry points, route tables, manifests, CSPs, and deployment projects.
- Ensure wallet source, holder material, and issuance controls are absent from verifier artifacts.
- Ensure verifier signing/decryption and challenge-store secrets are absent from browser artifacts.
- Use explicit origin allowlists; deny framing and unnecessary permissions; minimize referrer data.
- Create a local multi-origin launcher and production-like cross-origin Playwright harness.
- Add an artifact manifest and forbidden-string/module checks to CI.

**Acceptance gate**

- Wallet routes and chunks return 404 from the verifier origin; verifier routes and chunks return 404 from the wallet origin.
- Source maps, static assets, build logs, and environment serialization contain no private key.
- The only presentation transport between roles in the Golden Path is the agent's tool output/input relay.
- The journey passes with storage and process isolation enabled.

**Kill/rollback gate**

- If an origin still serves both roles, call it a multi-surface prototype and remove `independent origin` or `role-isolated` claims.

### P3 — Specify and implement Protocol v3

**Judge rationale:** A reusable protocol needs deterministic bytes, bounded inputs, stable errors, and interoperability evidence—not TypeScript casts around Base64 JSON.

**Build**

- Define strict runtime schemas for policy, request, authorization grant, courier envelope, presentation plaintext, receipt, trust manifest, and error result.
- Add protocol version, schema identifier, algorithm identifiers, key IDs, media type, and critical-extension handling.
- Adopt canonical JSON or another documented deterministic serialization.
- Domain-separate every digest and signature input.
- Enforce bounds for encoded bytes, decoded bytes, nesting, arrays, disclosures, strings, clock skew, and lifetime.
- Reject duplicates, ambiguous Unicode, non-canonical encodings, unknown critical fields, and unsupported algorithms.
- Define a stable error taxonomy with `code`, `currentState`, `stateVersion`, `safeToRetry`, `nextTool`, and `requiredHumanAction`.
- Publish positive and negative browser/Node test vectors.

**Acceptance gate**

- Browser and Node generate byte-identical canonical digests.
- Fuzz and property tests cannot bypass duplicate, size, time, version, or algorithm checks.
- Every parse or verification failure is safe, bounded, and free of sensitive echo.
- A minimal independent test implementation passes the frozen vectors.

**Kill/rollback gate**

- Do not publish a protocol version or compatibility claim until two independent runtimes pass the vectors.
- Do not invent cryptographic primitives; use maintained platform or library implementations.

### P4 — Add fresh synthetic issuance and real key custody

**Judge rationale:** This turns fixed fixtures into a demonstrable trust lifecycle while keeping the public demo safe.

**Build**

- Add a synthetic issuer application that visibly creates a fresh credential from synthetic or locally entered test values.
- Generate holder keys through Web Crypto as non-exportable keys where browser support permits.
- Store credentials and handles in IndexedDB with versioned migrations and reset semantics.
- Keep issuer signing keys server-side or in a development-only local issuer process; never ship them in browser bundles.
- Publish issuer public keys through a versioned manifest/JWKS with `kid`, validity, status, rotation, and revocation metadata.
- Generate random salts and credential identifiers for every issuance.
- Preserve explicit `Synthetic demo credential` labelling throughout the UI and receipts.

**Acceptance gate**

- Reissuing identical test values produces distinct salts, identifiers, commitments, and signatures.
- Changing one source input changes only the appropriate derived result and cryptographic commitment.
- Unknown, expired, suspended, revoked, or key-mismatched issuers fail safely.
- Secret scanning and bundle inspection find no issuer or holder private key.

**Kill/rollback gate**

- If secure key custody is unavailable in a target browser, document and visibly label the fallback; never describe an extractable fixture as a private wallet key.
- No production or public test may request real government, education, health, financial, or identity records.

### P5 — Authenticate and bind verifier requests

**Judge rationale:** The wallet should trust cryptographic provenance and policy, not a persuasive agent string.

**Build**

- Separate read-only policy discovery from state-changing challenge issuance.
- Sign each request over verifier origin, audience, purpose, policy ID/version/digest, required predicates, prohibited fields, accepted alternatives, recipient encryption key ID, challenge, issue time, and expiry.
- Validate signature, origin, key status, lifetime, schema, policy digest, and challenge status before planning.
- Bind every later plan, authorization, sealed presentation, and verification receipt to the authenticated request digest.
- Define safe recovery for expired challenge, rotated request key, changed policy, and unavailable verifier service.

**Acceptance gate**

- Copying a signed request to another origin does not make that origin an accepted recipient.
- Editing recipient, purpose, policy, predicate, challenge, expiry, or encryption key invalidates the request.
- An agent cannot substitute a safer-looking audience string or widen claims between steps.
- Policy rotation produces a clear fresh-request path rather than an ambiguous retry.

**Kill/rollback gate**

- No request may reach the authorization screen if its provenance or policy digest is unverified.

### P6 — Bind human authorization to the exact plan

**Judge rationale:** Human agency becomes an enforceable protocol fact instead of instructional copy.

**Build**

- Render the exact verifier origin, purpose, policy, predicates, lifetime, use count, credential, and privacy consequences.
- Canonically hash the authenticated request and disclosure plan into a `ConsentDigest`.
- Issue an `AuthorizationGrant` containing request hash, verifier origin, policy digest, exact claim-set digest, credential ID, issue/expiry time, maximum uses, and authorization method.
- Add passkey/WebAuthn user verification bound to the digest where supported; test a clearly labelled fallback for judge compatibility.
- Permit revocation before atomic claim; never permit widening or transfer.
- Make authorization state durable and observable through privacy-safe metadata.

**Acceptance gate**

- Adding, removing, reordering ambiguously, or changing any claim after approval invalidates the grant.
- Changing recipient, purpose, credential, expiry, policy, or use count requires a new authorization.
- A passkey assertion for one digest cannot authorize another.
- No WebMCP tool can create authorization or perform final submission.

**Kill/rollback gate**

- If WebAuthn is unreliable in the supported judge environment, retain exact digest binding and describe the fallback honestly; never claim phishing-resistant human presence without it.

### P7 — Implement the Sealed Courier mechanism

**Judge rationale:** This is the signature creative moment and the clearest improvement over the current prototype: the agent completes useful work while remaining cryptographically unable to inspect the proof it transports.

**Build**

- Create the minimum presentation from the authorized plan.
- Bind issuer evidence, pairwise holder binding, request digest, consent digest, challenge, audience, purpose, time, and exact disclosure set.
- Sign the presentation with the holder key.
- Encrypt it with maintained authenticated-encryption primitives to the recipient key authenticated in the verifier request.
- Keep only bounded routing/protocol metadata outside the ciphertext.
- Rotate recipient keys and reject unknown, expired, substituted, or algorithm-downgraded keys.
- Generate separate safe receipts for holder export and verifier verification; neither includes ciphertext or a stable cross-verifier subject handle.

**Acceptance gate**

- Searching or decoding the courier envelope exposes no claim values, salts, source fields, holder public key reused across verifiers, or private identifiers.
- The wrong verifier and the agent cannot decrypt it.
- Modification, truncation, rewrapping, recipient substitution, downgrade, and replay fail closed.
- A successful verifier can explain which policy predicates passed without exposing the underlying source values to the agent.
- The deployed ChatGPT agent transports the opaque envelope across isolated origins successfully.

**Kill/rollback gate**

- Do not use the words `sealed`, `opaque to the agent`, or `cannot read` until bundle inspection, wrong-recipient tests, and the deployed native-agent journey all pass.
- Do not call the mechanism zero knowledge unless a separately reviewed proof system establishes that property.

### P8 — Defend against cumulative inference and make recovery deterministic

**Judge rationale:** Strong privacy fails if a verifier can reconstruct an exact value through repeated yes/no requests, or if the agent must guess how to recover.

**Build**

- Maintain a privacy ledger scoped by verifier relationship, purpose family, predicate family, credential, and retention window.
- Detect narrowing threshold sequences, overlapping intervals, exhaustive category probes, and purpose churn.
- Return a bounded refusal or coarser counterproposal without revealing which secret caused the block.
- Use pairwise holder keys or pseudonyms to reduce cross-verifier correlation.
- Centralize `ToolResult<T>` and `DomainError` across UI and WebMCP.
- Await tool registration/removal and reconcile desired versus confirmed tool inventory.
- Define one safe recovery for every expected state/version, challenge, policy, grant, encryption, verification, and network failure.

**Acceptance gate**

- Binary-search, interval-narrowing, and cross-purpose probe suites fail without leaking a more precise bound.
- A legitimate fresh request after refusal can still succeed.
- Every supported error identifies whether retry is safe and exactly one valid next step.
- UI, domain state, and callable tool inventory agree after reload, rejection, cancellation, and interrupted calls.

**Kill/rollback gate**

- If a refusal itself reveals the protected value, fail closed with a less specific response.
- Do not expose an always-on generic query tool as a shortcut around the privacy ledger.

### P9 — Build a real attack lab and reusable conformance kit

**Judge rationale:** Judges can see safety mechanisms operate, while other builders can verify the protocol without trusting the demo narration.

**Build**

- Create a hostile-verifier application using the same production protocol engine.
- Demonstrate forged request, over-collection, post-authorization widening, threshold probing, tampered ciphertext, wrong recipient, expired request, revoked issuer, concurrent export, and replay.
- Give every attack a stable error code, safe explanation, non-sensitive receipt, and fresh legitimate recovery path.
- Extract framework-neutral protocol, wallet, verifier, and WebMCP adapter packages.
- Publish a conformance CLI for schemas, annotations, capability lifecycle, authorization invariants, request provenance, encryption, verification, replay, recovery, and forbidden secret leakage.
- Generate a signed or exact-SHA machine-readable compatibility report for the live deployment.

**Acceptance gate**

- Attack demonstrations execute real production code; no red/green result is hard-coded.
- A clean checkout can run conformance with one documented command.
- Failure snapshots contain no raw source value, plaintext presentation, key, or reusable token.
- The Golden Path passes the same conformance suite used by the hostile verifier.

**Kill/rollback gate**

- Cut any attack card that cannot be reproduced deterministically.
- Do not describe workspace packages as a reusable SDK until a separate integration consumes them.

### P10 — Prove natural-language agent behavior and WebMCP value

**Judge rationale:** The challenge rewards a better agentic web, not merely callable functions. Evidence must show that real agents discover, sequence, stop, resume, and recover safely.

**Natural-language evaluation**

- Freeze at least 100 prompts across normal, ambiguous, adversarial, stale-state, interrupted, policy-change, replay, and recovery cases.
- Record prompt, model/version, browser/version, discovered inventory, tool selection, arguments, state transitions, result, recovery, final state, latency, and privacy invariant status.
- Predeclare the scoring method and classify every failure.
- Target at least 95% end-to-end task completion and 100% critical-invariant compliance.

**WebMCP comparative evaluation**

- Run identical seeded tasks through WebMCP, DOM/accessibility-tree automation, and screenshot/computer-use automation where those modes are available.
- Compare completion, interactions, latency, recovery, unsafe-action attempts, and unnecessary private-field access.
- Publish environment, repetitions, confidence intervals where meaningful, raw redacted receipts, and negative results.

**Acceptance gate**

- Two consecutive clean runs meet the predeclared thresholds.
- At least one real deployed ChatGPT in-app-browser run covers success, consent pause/resume, replay rejection, and recovery.
- Results are generated from receipts rather than typed into the UI.
- The comparison supports a specific WebMCP advantage for this journey; unsupported metrics are omitted.

**Kill/rollback gate**

- A failing or flaky run is classified and published, not deleted.
- If the 95% task threshold is not met, state the observed rate and narrow the claim.

### P11 — Prove portability, usability, and independent credibility

**Judge rationale:** A second integration establishes that the mechanism is a protocol rather than fellowship conditionals; unfamiliar humans and independent reviewers establish credible impact and usability.

**Build and validate**

- Build one thin second verifier, such as synthetic rental eligibility or age-gated membership, without changing protocol or wallet-core code.
- Run at least five unfamiliar-user sessions with a fixed script and consent to collect non-sensitive feedback.
- Ask each participant to identify what was requested, refused, approved, exported, unreadable to the agent, and left human-only.
- Measure completion time, errors, comprehension, trust calibration, and recovery success.
- Obtain one practitioner or privacy-domain review and one independent security/privacy review.
- Track findings, severity, disposition, reviewer independence, and limitations without turning review into an endorsement.
- Complete keyboard, VoiceOver, 200% zoom, 320/390px, forced-colours, reduced-motion, focus, announcements, contrast, and axe checks on the deployed Golden Path.

**Acceptance gate**

- The second verifier passes conformance without fellowship imports or wallet-core branching.
- Five of five unfamiliar users correctly identify the consequential human-only action; at least four of five correctly explain the disclosure and agent boundary without coaching.
- No unresolved critical/high independent security finding remains.
- The complete journey is operable by keyboard and understandable through a supported screen reader.

**Kill/rollback gate**

- If the second integration requires protocol exceptions, fix the abstraction or remove the reuse claim.
- If external validation is unavailable, report that limitation; never invent people, quotes, results, certifications, or partnerships.

### P12 — Re-audit, freeze, release, and submit

**Judge rationale:** A field-leading build can still lose through a stale deployment, broken public link, inflated claim, confusing film, or draft submission.

**Build and verify**

- Freeze and rerun the dated public corpus using unchanged inclusion rules and rubric; document where competitors remain stronger.
- Run a clean-checkout release command covering lint, unit/property/fuzz, adversarial, conformance, build, forbidden-artifact, browser, accessibility, and benchmark gates.
- Verify exact Git SHA against every deployed role and inspect each role logged out through direct HTTP, Chrome, and ChatGPT's in-app browser.
- Freeze protocol/API, then release candidate, before recording.
- Update architecture, threat model, limitations, evidence room, judge path, diagrams, SDK/conformance instructions, and synthetic-data boundary.
- Record an under-three-minute film with one story: overreaching request, refusal/counterproposal, exact human authorization, ciphertext visibly unreadable to the agent, successful verification, attack rejection, human-only final action.
- Reconcile Devpost text, repository, live deployments, video, screenshots, licence, terms, and exact SHA.
- Have another person follow the submitted judge path without assistance.

**Acceptance gate**

- Zero known critical/high defects; every required release command passes twice from clean state.
- All public links return the intended content while logged out.
- Devpost shows `Submitted`, not `Draft`, and the recorded SHA/deployments match the reviewed candidate.
- Any leadership statement names the corpus freeze date, rubric, coverage, and unknowns.

**Kill/rollback gate**

- Ship the last secure, coherent, fully verified candidate if an ambitious feature misses a gate.
- After release-candidate freeze, accept only verified correctness, accessibility, reliability, deployment, or submission fixes.
- Never weaken a privacy or authority invariant to preserve the demo script.

## E. Cross-cutting release scorecard

| Area | Minimum release evidence | Leadership evidence |
| --- | --- | --- |
| WebMCP leverage | State-dependent tools, cross-origin opaque relay, deterministic recovery, human-only final action | WebMCP beats two browser-control baselines on predeclared journey metrics |
| Cryptographic correctness | Authenticated request, exact authorization, recipient-bound encryption, trusted issuer, atomic replay | Published vectors, fuzz/property results, independent review |
| Privacy | No raw record in tools; agent cannot decrypt; cumulative probing blocked | Pairwise binding, privacy ledger, hostile-verifier evidence |
| Execution | Clean-checkout and exact-SHA release passes | Two consecutive full gates and independent unaided judge-path run |
| Impact | Problem and minimization benefit are explained honestly | Measured unfamiliar-user comprehension and practitioner review |
| Creativity | Sealed Courier moment works in the deployed agent journey | Attack lab and second integration show the mechanism is deep, not theatrical |
| Accessibility | Automated and manual canonical-path checks | Screen-reader and unfamiliar-user evidence integrated into release |
| Competitive claim | Dated reproducible corpus and limitations | Same rubric re-audit shows no audited entry combines the complete mechanism |

## F. Work-in-progress rules

- One phase may have only one canonical implementation for each domain operation.
- Every pull request or change set names the invariant, test, and judge criterion it advances.
- No phase advances with a known critical defect in a prerequisite.
- UI demonstrations call the same domain implementation as tools and tests.
- Machine-readable receipts generate scorecards wherever possible; evidence is not hand-entered into the product.
- New features that do not improve a published judging criterion or repair a named threat are cut.
- Source, assets, and ideas from public competitors require licence review and attribution; no competitor code or visual identity is copied merely to close a score gap.
- The permanent synthetic-data boundary and human-only final action cannot be traded for apparent realism.

## G. Three-month sequencing

Calendar dates are planning aids; gates, not elapsed time, authorize progress.

| Window | Primary phases | Required exit |
| --- | --- | --- |
| Sep 4–10 | P0–P1 | Truthful baseline; arbitrary nonce and concurrent-use failures fixed |
| Sep 11–21 | P2–P3 | Real role isolation; protocol schemas, canonicalization, bounds, and vectors pass |
| Sep 22–Oct 5 | P4–P5 | Fresh synthetic issuance; key custody; authenticated origin-bound requests |
| Oct 6–19 | P6–P7 | Exact authorization and Sealed Courier work in isolated local origins |
| Oct 20–Nov 2 | P8–P9 | Inference defence, deterministic recovery, attack lab, conformance kit |
| Nov 3–16 | P10 first pass | Frozen agent and WebMCP comparative evaluations produce reproducible receipts |
| Nov 17–30 | P11 | Second verifier, unfamiliar-user sessions, external reviews, accessibility closure |
| Dec 1–10 | P10 second pass, P12 re-audit | Two consecutive evaluation passes and dated competitor delta |
| Dec 11–17 | P12 documentation and rehearsal | Another person completes the judge path unaided |
| Dec 18–20 | Release-candidate freeze | Exact SHA passes every release gate |
| Dec 21–27 | Film, uploads, Devpost dry run | All public assets verified logged out |
| Dec 28–31 | Submission buffer | Submitted state verified; candidate remains frozen |

If organizer dates differ from the planning assumption, compress presentation breadth and the second example before compromising P1–P8 correctness or P10 evidence.

## H. Explicit non-goals

- No generic chatbot, broad identity wallet, payment rail, automatic application, or production identity integration.
- No dozens of thin tools, extra verticals, dashboard decoration, blockchain, or custom cryptography for spectacle.
- No real PII in public services or shared evaluation receipts.
- No zero-knowledge, W3C VC, compliance, certification, partnership, or production-readiness claim without separate implementation and evidence.
- No guaranteed rank, universal superiority, or 95% win-probability claim.

---

## Historical v1 plan — superseded 2026-09-04

The remaining document is the September 3 plan and execution snapshot. It is retained for decision history. Its milestone-completion statements describe the prototype standard used at that time; they do not satisfy the v2 Sealed Courier gates above.

## 1. Objective

Turn Proof Courier from a polished minimum-disclosure demonstration into the clearest working reference for **negotiated, human-authorized data disclosure on the agentic web**.

The target submission should make this sequence undeniable after the durable P1 gates pass:

1. A verifier asks for more information than it needs.
2. The wallet's WebMCP policy layer blocks the overreach and exports nothing.
3. The agent negotiates a smaller set of derived eligibility claims.
4. A human sees and approves the exact purpose, recipient, claims, and lifetime.
5. Approval creates a durably single-use WebMCP capability that did not previously exist.
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
- evidence that no audited public entry combines the release candidate's full verified mechanism: request minimization, counterproposal, exact human authorization, dynamically granted durable single-use capability, independent issuer trust, cross-surface proof transport, cross-instance replay protection, and human-only final action.

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

Remove the duplicate verifier implementation currently split between `proofCourier.ts` and `proofVerifier.ts` while preserving the current runtime-chunk fixture-placement checks until role-specific builds replace them.

### 5.2 WebMCP tool surface

Keep the surface small and outcome-oriented.

Verifier surface:

1. `fellowship_get_requirements` — returns the purpose-bound verifier policy and nonce.
2. `fellowship_evaluate_counterproposal` — confirms whether a derived-claim alternative satisfies the policy without submitting anything.
3. `fellowship_verify_proof` — currently verifies and consumes a challenge within one active verifier session; the target store makes consumption durable across instances.
4. `fellowship_get_verification_receipt` — appears only after successful verification.

Wallet surface:

1. `wallet_get_safe_summary` — lists available predicate types, never raw values.
2. `wallet_evaluate_request` — read-only Request Firewall; returns allow, blocked, or counterproposal.
3. `wallet_prepare_disclosure` — stages the accepted minimum plan for visible review.
4. `wallet_get_disclosure_state` — reads safe lifecycle state.
5. `wallet_export_proof` — appears only after human approval and is atomically withdrawn across tested same-origin wallet tabs and reloads; the remaining durability target is verifier-wide challenge consumption, not cross-device wallet synchronization.
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
- M1 trusted issuer and cryptographic correctness: partially complete for the prototype scope. Proof Envelope v2 removes sender-supplied trust, binds the entire presentation, rejects duplicate claims and invalid lifetimes, and fails closed on malformed envelopes. Challenge issuance and competing-call rejection now work within one verifier instance; durable cross-instance consumption remains open.
- M2 Request Firewall: complete locally for the session prototype. Both wallet and verifier expose registered read-only negotiation tools; the browser journey proves overreach -> zero export -> counterproposal -> acceptance -> human consent -> one call against the active wallet grant.
- M3 origin separation: distinct public origins exist and return HTTP 200 with security headers. The deployed Playwright journey proves separate browser storage and no peer-origin fetches on the tested path. Separate local release-candidate artifacts now pass role/module/content and simulated-origin route/chunk isolation, but the public origins still serve the legacy shared artifact; deployed role isolation remains open.
- M4 automated Judge Mode slice: complete locally. The landing page now runs the real Request Firewall across safe, overreaching, and malicious scenarios, with a privacy meter, copyable judge prompt, and inspectable goal-to-recovery trace. All judge-facing routes pass desktop, 390px mobile, and zero serious/critical automated accessibility checks; the primary focus and activation path is keyboard-tested. Five-person comprehension review remains open.
- Consent binding hardening: complete locally for the session prototype. Proof Envelope v2 signs the exact approved claim set, approval time, and active session grant; widened or temporally impossible consent is rejected. Same-origin wallet grant persistence now passes reload and tab-race checks; verifier-wide durability remains open.
- Current honest state: `TOP-TIER CANDIDATE, NOT YET PUBLIC-FIELD LEADING`. Deployment parity and a real native-browser rerun of the hardened envelope now pass. Independent human/security review, the 100-run multi-agent evaluation target, and two consecutive benchmark passes remain open.

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
- centralize verification logic and preserve the current runtime-chunk fixture-placement checks until role-specific builds land.

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

- attack -> refusal -> safe counterproposal -> human consent -> one session-scoped proof succeeds through registered WebMCP tools; the malicious scenario never creates export authority.

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
