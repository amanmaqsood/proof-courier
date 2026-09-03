# Proof Courier threat model

## Narrow claim

Proof Courier demonstrates how two WebMCP pages can let an agent transport a minimum, purpose-bound synthetic proof while preserving visible human consent and final submission boundaries.

It does not claim production identity security, W3C Verifiable Credential conformance, zero knowledge, legal compliance, secure hardware, remote key custody, real issuer connectivity, or protection from a malicious browser/device.

## Protected in this prototype

| Threat | Enforced response |
| --- | --- |
| Agent exports before consent | Export tool is not registered |
| Agent exports twice | Capability is withdrawn after one export |
| Verifier asks for raw records or excessive lifetime | Read-only Request Firewall releases nothing and returns a minimum counterproposal |
| Verifier requests automatic submission | Request Firewall blocks it; no consent draft is created |
| Proof sent to another verifier | Audience check rejects it |
| Proof reused for another purpose | Purpose check rejects it |
| Proof retained too long | Ten-minute expiry rejects it |
| Proof replayed at the verifier | Nonce is recorded and rejected on reuse |
| Required claim removed | Missing-claim check rejects it |
| Extra private/internal claim added | Over-disclosure check rejects it |
| Claim changed | Expected-value and Merkle checks reject it |
| Credential metadata forged | Issuer signature check rejects it |
| Attacker supplies a replacement issuer key | Verifier ignores sender key material and resolves issuer ID/key ID from its own trust registry |
| Presentation changed after consent | Holder signature check rejects it |
| Duplicate claim masquerades as minimum disclosure | Exact claim multiset check rejects it |
| Concurrent proof replay | In-flight nonce lock allows only one verification to complete |
| Malformed envelope or timestamp | Structured fail-closed result; proof lifetime is capped at ten minutes |
| Agent attempts final application | No submit tool exists; visible human button only |
| Stale tool call races current wallet state | Version precondition blocks it |
| Verifier page downloads wallet signing fixtures | Route-triggered code splitting keeps wallet fixtures out of verifier and main chunks; release gate scans built assets |

## Private source categories

The synthetic wallet contains an applicant name, date of birth, student ID, exact GPA, transcript category, and address. Those values are not accepted by WebMCP tool schemas and are absent from every tool result and proof bundle. The verifier receives only five derived claims:

- over 18;
- actively enrolled;
- eligible study field;
- GPA band at or above 3.5;
- residency eligible.

## Known prototype limitations

- All claims and cryptographic fixtures are synthetic. Wallet signing fixtures are client-side because this is a browser prototype, but they are isolated to the wallet runtime chunk.
- In-memory replay state resets with the verifier tab.
- There is one verifier-pinned demonstration issuer/key, holder, policy, and audience. The trust registry is a prototype constant, not live PKI.
- There is no authentication, revocation registry, device binding, backend, secure enclave, or cross-device wallet.
- A malicious page or compromised browser is outside this prototype's trust boundary.
- Derived claims are selectively disclosed but are not zero-knowledge range proofs.

A production implementation would move holder keys into secure user-controlled custody, use real issuer infrastructure and revocation, authenticate both sites, persist replay protection, formally version the policy, and undergo independent security/privacy review.
