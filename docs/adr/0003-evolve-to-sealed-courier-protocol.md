# ADR 0003: Evolve Proof Courier into the Sealed Courier protocol

Date: 2026-09-04

Status: Accepted for implementation

Supersedes: ADR 0002 as the governing product and architecture decision. ADR 0002 remains the record of the first selective-disclosure prototype.

## Context

The current Proof Courier prototype demonstrates a valuable interaction: a verifier asks for minimum derived claims, a wallet prepares them, a person grants visible purpose-bound consent, a single-call WebMCP export capability appears for the active wallet session, the agent carries a proof between browser surfaces, and final submission remains human-only.

A dated audit of discoverable public WebMCP repositories and the local implementation showed that this is not yet a defensible public-field leader. Other entries individually demonstrate stronger multi-origin federation, zero-knowledge proof construction, passkey-bound authorization, cross-origin capability leases, concurrency assurance, fuzz testing, reusable packages, or unusually ambitious interfaces. The local audit also found foundational gaps: an unissued fresh nonce may be accepted, export is not atomically one-use under concurrency, the deployed roles are not bundle-isolated, private keys and credential material are fixtures, proof requests are not authenticated, replay state is not durable, and the agent can read the encoded presentation it carries.

The phrase "best among all projects" cannot be verified. Private, future, inaccessible, and undiscoverable entries are unknown, and judging remains subjective. The useful target is leadership against a frozen, dated, discoverable public corpus under the published judging criteria, with every comparative claim tied to reproducible evidence.

## Decision

### 1. Adopt the Sealed Courier north star

The central product promise is:

> The agent carries a proof it cannot read.

The agent will relay a minimum presentation that is signed by the holder and encrypted to a verifier key authenticated by the request. The agent will not receive raw source records, plaintext claims, consent authority, signing keys, decryption keys, or final-submission authority.

This does not imply zero knowledge. Public language will distinguish minimum disclosure, encryption in transit through the courier, selective disclosure, and zero-knowledge proofs.

### 2. Build a reusable protocol around one Golden Path

Proof Courier will become a small reusable protocol and conformance profile with role-isolated issuer, wallet, verifier, showcase, and hostile-verifier applications. The fellowship journey remains the single polished Golden Path and receives correctness, accessibility, evaluation, and release priority.

A second thin verifier will demonstrate portability only after the Golden Path passes its release gates. It must reuse protocol and SDK code without fellowship-specific branching.

### 3. Make mutual distrust explicit

- The wallet authenticates verifier requests, applies deterministic minimization and inference limits, and releases nothing without an exact holder authorization.
- The verifier authenticates the issuer and holder presentation and owns durable, atomic challenge consumption.
- The person authorizes the exact recipient, purpose, policy, claim-set digest, lifetime, and one-use limit; the consequential final action remains human-only.
- The agent is an untrusted courier and cannot inspect or widen the sealed presentation.
- Trust anchors come from a verifier-owned, versioned manifest rather than the presentation itself.

### 4. Keep a permanent synthetic-data boundary

Public deployments and shared services will use synthetic people, institutions, credentials, applications, and source records. Locally entered test data may drive fresh issuance, but Proof Courier will not request, upload, or retain real personal information.

The data is synthetic; the protocol behavior is real. Key generation, issuance, request authentication, exact authorization, encryption, challenge consumption, verification, rejection, recovery, and receipts must execute rather than be animated or hard-coded.

### 5. Define public-field leadership honestly

The objective is to lead a dated, frozen, discoverable public-repository corpus under a published rubric. No document, UI, README, submission, or presentation may promise a 95% chance of winning or superiority over all submissions.

"95%" may describe only a predeclared, reproducible evaluation threshold such as natural-language task completion. Privacy, consent, replay, trust, and final-action invariants require 100% pass rates.

### 6. Require external validation

Before a field-leadership claim, Proof Courier will seek:

- at least five unfamiliar-user comprehension sessions;
- one practitioner or privacy-domain review;
- one independent security/privacy review;
- a dated competitor re-audit using the same published rubric;
- machine-readable evaluation receipts and documented negative results.

External reviews are evidence, not endorsements. Synthetic or invented testimonials, certifications, user results, impact numbers, or review outcomes are prohibited.

## Consequences

### Positive

- The project gains a concise, demonstrable mechanism beyond generic data minimization.
- The WebMCP role becomes essential: an agent negotiates and transports an opaque capability across independent web applications while authority remains with the person.
- Role isolation, authenticated requests, atomic replay protection, and exact authorization align the product claim with its implementation.
- A conformance profile and second verifier can demonstrate credible reuse without turning the submission into a broad platform demo.
- A hostile verifier and benchmark make negative behavior visible and testable rather than relying on safety copy.

### Negative

- The architecture now requires multiple independently built applications and a small durable verifier service.
- Correct key custody, authenticated encryption, canonicalization, WebAuthn, persistence, concurrency, and migration behavior substantially increase implementation risk.
- External validation and real natural-language agent runs cannot be manufactured by code and may constrain the strength of release claims.
- The agent cannot inspect the sealed payload for debugging; observability must use privacy-safe metadata and receipts.

## Rejected alternatives

### Keep the current proof bundle and improve only the presentation

Rejected because the agent can still read and correlate the carried proof, and foundational nonce, concurrency, isolation, request-authentication, and key-custody gaps would remain.

### Compete through more tools or more verticals

Rejected because tool count and surface breadth do not repair the core privacy claim. One complete Golden Path plus a thin portability proof is more credible.

### Build a custom zero-knowledge circuit first

Rejected for the primary path because it creates cryptographic and review risk, collides with strong public implementations, and is not necessary to prove the sealed-courier interaction. A later ADR may adopt an independently reviewed standard or narrow proof system if it materially improves the use case.

### Upload real participant data to prove realism

Rejected because it creates needless privacy and compliance risk. Fresh synthetic issuance and local test input can prove the mechanism without collecting real PII.

### Claim a 95% chance of winning

Rejected because private entries, future entries, and subjective judging cannot be observed or probabilistically validated.

## Validation and reversal

The implementation proceeds only through the gates in `docs/TOP_TIER_EXECUTION_PLAN.md`. If verifier-bound encryption, exact human authorization, native WebMCP transport, or role-isolated deployment cannot be made reliable, the release must revert to the last honestly verified prototype and narrow its claims. A failed ambitious gate is not permission to simulate the feature.
