# Proof Courier domain context

## Core nouns

**Holder**

The person whose synthetic private credential is stored in the wallet. The holder alone grants disclosure consent and final submission.

**Wallet**

A separate WebMCP page that can describe available derived claims and prepare a verifier request. It cannot export before visible consent.

**Verifier**

The fellowship WebMCP page that publishes the audience, purpose, nonce, minimum claims, prohibited raw fields, and verification policy.

**Proof request**

The verifier's bounded request: five claim identifiers plus audience, purpose, nonce, issue time, and expiry.

**Disclosure draft**

The exact request displayed to the holder before consent. Preparing it grants no export authority.

**Proof bundle**

An encoded synthetic presentation containing disclosed claim proofs, issuer metadata/signature, and a holder signature. It contains no raw source record.

**Consent**

A visible human UI action that dynamically makes one export capability available.

**Receipt**

A privacy-safe record that the proof was exported or verified. It contains claim identifiers, not private source values.

## Agent journey language

**Answer tool**

A read-only capability that reports requirements, wallet state, or receipts without changing authority or releasing proof.
_Avoid_: Info endpoint, getter

**Action tool**

A capability that prepares or verifies bounded proof while keeping consent and final submission with the holder.
_Avoid_: Automation button, API wrapper

**Sensitive disclosure capability**

The one-time export capability that exists only after visible, purpose-bound holder consent and disappears after use.
_Avoid_: Export endpoint, always-on permission

**Human-only outcome**

The consequential application submission that no WebMCP tool can perform.
_Avoid_: Agent submission, automatic filing

## State transitions

Wallet: `no_request → prepared → consented → exported`, or `prepared/consented → revoked`.

Verifier: `awaiting_proof → verified → submitted`, or `awaiting_proof → rejected → verified` after a fresh valid proof.

Only the person can cause `prepared → consented` and `verified → submitted`.
