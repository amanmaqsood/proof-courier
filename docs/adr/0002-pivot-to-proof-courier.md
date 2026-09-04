# ADR 0002: Pivot from Recon Room to Proof Courier (superseded)

> Superseded by ADR 0003. Retained as the decision that established the original Proof Courier prototype and its evidence boundary.

Date: 2026-09-01

Status: Superseded by ADR 0003

## Context

Founder-stated, unverified feedback from an offline judge conversation says Recon Room is an average project with no realistic winning chance. A current public-repository scan also shows multiple challenge entries with deeper deterministic decision systems, human approval gates, simulations, state-aware tools, and extensive evaluation.

The existing implementation proves useful infrastructure—versioned shared state, bounded tools, human correction, capability withdrawal, receipts, adversarial tests, and real ChatGPT in-app-browser verification—but the product promise is a narrow vertical workflow rather than a new web interaction primitive.

## Decision

Pivot to **Proof Courier**: a cross-tab WebMCP selective-disclosure workflow with the promise:

> The agent carries proof, not your private records.

One verifier page publishes the minimum claims needed for a synthetic fellowship application. A separate credential-wallet page contains private source data and issuer-committed derived claims. The agent may inspect only a safe summary, prepare the verifier's minimum disclosure request, and wait. A person reviews and approves the exact audience, purpose, expiry, and claims. Only then is a single-call export tool registered for the active wallet session. The agent carries the encoded proof bundle back to the verifier page. The verifier checks issuer signature, Merkle disclosure paths, holder binding, audience, purpose, expiry, required claims, over-disclosure, and reuse within its active in-memory session. Only the person can make the final application submission.

## Winning acceptance criteria

1. The complete journey runs through real site tools in ChatGPT's built-in browser across two tabs.
2. No exact birth date, student ID, exact GPA, transcript, name, or address appears in any tool result or proof bundle.
3. The wallet's export capability is absent before visible human consent and withdrawn from the active session state after export or revocation.
4. The verifier rejects tampering, wrong audience, wrong purpose, expiry, same-session replay, missing claims, and over-disclosure with recoverable errors.
5. The page visibly maps private source fields to five derived claims and shows exactly what crossed the tab boundary.
6. The agent cannot consent, approve disclosure, or submit the application.
7. A fresh production run, automated browser journey, adversarial receipt, public repository, and under-three-minute film all reproduce the same story.

## Kill criteria

Kill or redesign the pivot if real ChatGPT cannot reliably operate the two-tab journey, if the disclosure token leaks private source values, if the consent boundary is merely instructional rather than enforced, or if the complete mechanism cannot be understood in the first 30 seconds of the film.

## Scope boundary

All people, institutions, credentials, and applications are synthetic. The challenge build demonstrates a browser-native consent and proof-carrying interaction model. It does not claim production identity assurance, legal compliance, W3C Verifiable Credential conformance, zero knowledge, or deployment readiness for real personal data.

## Superseding audit note

The wallet and verifier were deployed on distinct origins, but both origins serve the same application artifact and both role chunks; ADR 0002 therefore established separate browser origins, not role-isolated builds. Challenge, replay, and export-authority state are in memory, so the single-call and replay controls apply only to the uninterrupted browser sessions exercised by the prototype. ADR 0003 and its execution gates require durable cross-instance state and genuinely role-specific builds before stronger terms may be used.
