# Proof Courier domain context

Updated: 2026-09-04

Governing decision: [ADR 0003](docs/adr/0003-evolve-to-sealed-courier-protocol.md)

## North star

> The agent carries a proof it cannot read.

Proof Courier is evolving from a selective-disclosure demonstration into a reusable, browser-native proof-delivery protocol. A website may ask whether a person satisfies a policy; a private wallet prepares the minimum sufficient proof; the person authorizes the exact disclosure; and the agent transports an opaque, verifier-bound presentation. The agent receives neither the source record nor the keys needed to read or widen the presentation.

The fellowship remains the **Golden Path**: the smallest complete integration through which every protocol claim must first be demonstrated. A second, thin verifier integration may prove portability only after the Golden Path passes its correctness, privacy, and recovery gates.

## Permanent data boundary

All people, institutions, credentials, applications, and source records in the public project are synthetic. Locally entered test data may be used to demonstrate fresh issuance, but real personal information must not be uploaded to or retained by Proof Courier services.

Real protocol behavior is still required: fresh key generation, signed requests, fresh synthetic issuance, verifier-bound encryption, exact authorization, durable replay prevention, and verification must not be simulated. "Synthetic" describes the subject matter, not the security mechanism.

Proof Courier does not claim production identity assurance, legal or regulatory compliance, zero knowledge, standards certification, or suitability for real personal data unless a later, independently reviewed decision explicitly establishes those properties.

## Current prototype boundary

The version-2 implementation is not yet the target protocol described below. Its verifier issues an unpredictable challenge and rejects unissued or reused challenges within one active in-memory verifier session. Its wallet persists the authorization state in same-origin IndexedDB, atomically claims the versioned export grant before asynchronous signing, refreshes other tabs through metadata-only notifications, and fails closed across reloads. Ten-call cross-tab and one-hundred-call same-session races yield one claim. Verifier challenge consumption is still memory-bound, so durable cross-instance replay protection is not yet implemented.

The public wallet and verifier are distinct origins with separate browser storage, and the tested journey makes no peer-origin fetch. Both public origins nevertheless still serve the same application artifact containing both role routes and chunks. A local release candidate now emits independent wallet, verifier, and showcase artifacts and passes a simulated-origin 200/404 route and entry-chunk matrix, module-graph guards, content scans, and source-map checks. This is local artifact evidence, not deployed role isolation: the production aliases have not been cut over or retested. All sealed, durable, passkey-bound, standards-aligned, and cross-instance terms below describe the accepted target and may become public product claims only after their release gates pass.

## Mutual-distrust model

Every actor receives only the authority and information needed for its role:

- The **Verifier** distrusts the agent and wallet. It verifies the issuer, presentation integrity, authenticated request, policy version, audience, purpose, freshness, exact disclosure, and durable single-use challenge consumption.
- The **Wallet** distrusts the agent and verifier. It accepts only an authenticated, origin-bound request, applies deterministic minimization and inference policy, and releases nothing without an exact holder authorization.
- The **Holder** distrusts automation. The holder sees the recipient, purpose, claims, lifetime, and use limit before authorizing the exact plan. The holder alone performs the consequential final action.
- The **Agent** is an untrusted courier. It can discover requirements, carry safe counterproposals, and relay an opaque presentation, but it receives no consent-setting capability, raw source record, signing key, decryption key, or final-submission capability.
- The **Issuer** attests to a synthetic credential but cannot authorize disclosure or determine the verifier's outcome.
- The **Verifier service** holds the recipient decryption key and atomic challenge state; neither is shipped in the public verifier bundle.

Trust is therefore verified cryptographically and by state-machine invariants rather than inferred from which page or agent supplied a string.

## Core nouns

**Holder**

The person whose synthetic private credential is stored in the wallet. The holder alone authorizes an exact disclosure plan and performs final submission.

**Wallet (target)**

A role-isolated WebMCP application that stores synthetic credentials and non-exportable holder keys, verifies proof requests, computes the minimum sufficient disclosure, and prepares presentations. It cannot export before exact holder authorization.

**Verifier (target)**

A role-isolated relying application that publishes a signed, origin-bound policy and challenge, decrypts a presentation addressed to it, verifies the proof, and keeps the consequential outcome human-only.

**Issuer**

An independent role that signs freshly generated synthetic credentials. The verifier trusts an issuer only through a verifier-owned, versioned trust manifest; a presentation cannot introduce its own trust anchor.

**Golden Path**

The fellowship journey through which the complete protocol is implemented, evaluated, filmed, and released before additional verticals are considered.

**Hostile Verifier**

A test integration that deliberately attempts request forgery, over-collection, policy substitution, replay, recipient substitution, and inference attacks against the production protocol engine.

**Proof request**

An authenticated, verifier-origin-bound request containing the audience, purpose, policy identifier and digest, minimum predicates, prohibited fields, recipient encryption key, fresh challenge, issue time, and expiry.

**Verifier policy**

A versioned declaration of the minimum acceptable predicates, permitted alternatives, prohibited raw fields, maximum lifetime, recipient origin, and human-only outcome.

**Challenge (target)**

A verifier-issued, unpredictable, expiring value stored in a durable active challenge registry and consumed atomically exactly once across supported instances. An unissued value is never a valid challenge. The current prototype implements issuance and reuse rejection only within one in-memory verifier session.

**Disclosure plan**

The deterministic, minimum set of derived predicates proposed to satisfy one authenticated request. It is a proposal, not authority to export.

**Disclosure draft**

The human-readable rendering of the disclosure plan: recipient, purpose, exact predicates, lifetime, use limit, and consequences. Preparing it grants no export authority.

**Authorization grant (target)**

A purpose-bound, expiring, one-use authorization over the digest of one exact disclosure plan and request. It records the authorization method and cannot be widened, transferred, revived, or reused. This term supersedes using the generic word "consent" for the protocol artifact; consent remains the holder's human decision.

**Proof bundle**

The version-2 prototype's encoded synthetic presentation containing disclosed claim proofs, issuer metadata/signature, and a holder signature. It contains no raw source record but is not opaque to the courier. Retained as a historical term for the current implementation.

**Sealed presentation**

The target protocol artifact: a signed minimum presentation encrypted to the authenticated verifier key. The agent may relay the ciphertext but cannot inspect its claims, salts, subject identifiers, or proofs.

**Courier envelope**

The agent-safe transport wrapper around a sealed presentation. It contains routing and protocol metadata required for delivery, bounded ciphertext, and no secret decryption material.

**Consent digest**

The canonical digest binding the authenticated request, verifier origin, policy, exact claim set, credential, lifetime, and one-use limit to the holder's authorization.

**Pairwise holder binding**

A holder key or identifier scoped to one verifier relationship so presentations to different verifiers do not expose a stable cross-site correlation handle.

**Inference budget**

A wallet policy limit on cumulative disclosures to one verifier. It prevents a series of individually minimal threshold questions from reconstructing a more precise private value.

**Trust manifest**

A verifier-owned, signed and versioned registry of accepted issuer and recipient keys, validity periods, status, rotation, and revocation information.

**Consent**

The holder's informed human decision. In the target protocol, that decision creates an Authorization Grant bound to one exact canonical plan; an ordinary DOM click alone is not evidence of strong human presence.

**Receipt**

A privacy-safe record that a state transition occurred. It may contain policy and claim identifiers but never the source record, presentation ciphertext, reusable proof, stable subject identifier, or secret key.

**Conformance profile**

A versioned set of protocol schemas, test vectors, invariants, tool-lifecycle requirements, and error semantics that an independent wallet or verifier integration can run without importing fellowship-specific code.

## Agent journey language

**Answer tool**

A read-only capability that reports requirements, wallet state, or receipts without changing authority or releasing proof.
_Avoid_: Info endpoint, getter

**Action tool**

A capability that prepares or verifies bounded proof while keeping consent and final submission with the holder.
_Avoid_: Automation button, API wrapper

**Sensitive disclosure capability (target)**

The durably single-use export capability that exists only after an Authorization Grant is active and disappears after it is atomically claimed, revoked, expired, or spent. The current prototype now persists this authority in same-origin IndexedDB and has browser evidence for reload and cross-tab consumption. It does not claim cross-device synchronization or durable verifier-wide challenge consumption.
_Avoid_: Export endpoint, always-on permission

**Human-only outcome**

The consequential application submission that no WebMCP tool can perform.
_Avoid_: Agent submission, automatic filing

## Target state transitions

### Wallet disclosure session

`no_request → request_authenticated → plan_prepared → awaiting_authorization → authorized → grant_claimed → sealed → exported → spent`

Terminal or recovery transitions:

- `request_authenticated/plan_prepared/awaiting_authorization/authorized → revoked`
- `request_authenticated/plan_prepared/awaiting_authorization/authorized → expired`
- `grant_claimed → failed_closed`; recovery requires a fresh request and authorization rather than reviving the grant

Only the holder can cause `awaiting_authorization → authorized`. The export operation must atomically claim the grant before any asynchronous signing or encryption begins, so concurrent calls cannot both succeed.

### Verifier challenge

`issued → active → claimed → verified → consumed`

Failure transitions:

- `issued/active → expired`
- `claimed → rejected → consumed`

Unknown or unissued challenges are invalid. Claiming and consuming a challenge must be durable across reloads, tabs, and application instances.

### Application outcome

`awaiting_proof → proof_verified → ready_for_human → submitted`

or `awaiting_proof → proof_rejected → awaiting_fresh_proof`.

Only the person can cause `ready_for_human → submitted`.

### Capability lifecycle

`absent → offered_for_review → authorized → callable_once → in_flight → withdrawn`

The UI state, domain state, and registered WebMCP tool inventory must agree. Every error reports a stable code, current state and version, whether retry is safe, and the next valid tool or required human action.
