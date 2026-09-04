# Proof Courier threat model

## Narrow claim

Proof Courier demonstrates how two WebMCP pages can let an agent transport a minimum, purpose-bound synthetic proof while preserving visible human consent and final submission boundaries.

It does not claim production identity security, W3C Verifiable Credential conformance, zero knowledge, legal compliance, secure hardware, remote key custody, real issuer connectivity, or protection from a malicious browser/device.

## Protected in this prototype

| Threat | Enforced response |
| --- | --- |
| Agent exports before consent | Export tool is not registered |
| Agent races the same active wallet grant | The grant is claimed before asynchronous signing; competing calls against that in-memory grant are blocked and the capability is withdrawn from current state |
| Verifier asks for raw records or excessive lifetime | Read-only Request Firewall releases nothing and returns a minimum counterproposal |
| Verifier requests automatic submission | Request Firewall blocks it; no consent draft is created |
| Proof sent to another verifier | Audience check rejects it |
| Proof reused for another purpose | Purpose check rejects it |
| Proof retained too long | Ten-minute expiry rejects it |
| Wallet prepares after part of the challenge lifetime has elapsed | Wallet uses the earlier of its local ten-minute cap and the verifier's absolute expiry; verifier rejects a presentation that outlives its challenge |
| Proof replayed in the active verifier session | Challenge is recorded and rejected on reuse by that in-memory verifier instance |
| Required claim removed | Missing-claim check rejects it |
| Extra private/internal claim added | Over-disclosure check rejects it |
| Claim changed | Expected-value and Merkle checks reject it |
| Credential metadata forged | Issuer signature check rejects it |
| Attacker supplies a replacement issuer key | Verifier ignores sender key material and resolves issuer ID/key ID from its own trust registry |
| Presentation changed after consent | Holder signature check rejects it |
| Consent grant widened or dated after verification | Exact session-grant and approval-time checks reject it |
| Duplicate claim masquerades as minimum disclosure | Exact claim multiset check rejects it |
| Concurrent proof replay in one tool manager | Its in-flight challenge lock allows only one verification to complete |
| Concurrent verification through two managers sharing one verifier state | Version-and-challenge compare-and-set permits one current result; the stale result is discarded |
| Wallet reset creates the same numeric version during an in-flight export | A unique export operation ID prevents the old completion or failure from consuming the new grant |
| Verifier reset or challenge rotation occurs during verification | Version-and-challenge compare-and-set discards the stale result instead of restoring old verified state |
| Malformed envelope or timestamp | Structured fail-closed result; proof lifetime is capped at ten minutes |
| Agent attempts final application | No submit tool exists; visible human button only |
| Stale tool call races current wallet state | Version precondition blocks it |

## Private source categories

The synthetic wallet contains an applicant name, date of birth, student ID, exact GPA, transcript category, and address. Those values are not accepted by WebMCP tool schemas and are absent from every tool result and proof bundle. The verifier receives only five derived claims:

- over 18;
- actively enrolled;
- eligible study field;
- GPA band at or above 3.5;
- residency eligible.

## Known prototype limitations

- All claims and cryptographic fixtures are synthetic. Wallet signing fixtures are client-side because this is a browser prototype. They are confined to the wallet-named runtime chunk, but both origins serve the same application artifact and can serve that chunk.
- Challenge, replay, and export-grant state are in memory. Reloads, other tabs, processes, or application instances do not share consumption state.
- There is one verifier-pinned demonstration issuer/key, holder, policy, and audience. The trust registry is a prototype constant, not live PKI.
- There is no authentication, revocation registry, device binding, backend, secure enclave, or cross-device wallet.
- A malicious page or compromised browser is outside this prototype's trust boundary.
- Derived claims are selectively disclosed but are not zero-knowledge range proofs.

A production implementation would use genuinely role-specific builds, move holder keys into secure user-controlled custody, use real issuer infrastructure and revocation, authenticate both sites, persist challenge and grant consumption across instances, formally version the policy, and undergo independent security/privacy review.
