# Proof Courier demo film — target 2:45

## 0:00–0:20 — the privacy problem

**DO:** Show the landing route from private wallet to verifier.

**SAY:**

> A browser agent can now work across websites, but private records should not become its clipboard. Proof Courier lets the agent carry exactly the proof a site needs, while the records stay behind.

## 0:20–0:45 — verifier publishes the contract

**DO:** Open `/fellowship` and `/wallet` in separate ChatGPT browser tabs. Ask: “Check the fellowship requirements, obtain only the minimum eligibility proof from my wallet, and prepare the application. Stop for my consent and final submission.” Let ChatGPT call `fellowship_get_requirements`.

**SAY:**

> The fellowship page publishes five minimum claims, a purpose, audience, one-time nonce, and a ban on raw records. These are live page tools, not a backend the person cannot see.

## 0:45–1:20 — capability appears only after consent

**DO:** Let ChatGPT call `wallet_get_summary` and `wallet_prepare_disclosure`. Show the exact audience, purpose, expiry, five claims, and masked private values. Show that `wallet_export_proof` is absent. Click **Approve this disclosure**. Show the export tool appear.

**SAY:**

> The agent can prepare the request, but it cannot consent. My click changes the page's authority surface: a one-time export tool appears for this disclosure only.

## 1:20–1:50 — carry and verify

**DO:** Let ChatGPT call `wallet_export_proof`, carry the returned bundle to the other tab, and call `fellowship_verify_proof`. Show the wallet export tool disappear and the verifier turn green.

**SAY:**

> Five derived claims cross. Date of birth, student ID, exact GPA, transcript, address, and name do not. The verifier checks the issuer signature, Merkle inclusion paths, holder binding, audience, purpose, expiry, and replay.

## 1:50–2:10 — final human boundary

**DO:** Show the accepted receipt and tool inventory. Point out that no submit tool exists. Click **Submit verified application** yourself.

**SAY:**

> Verification prepares the application. It never submits it. The final consequential action remains visibly human.

## 2:10–2:35 — adversarial proof

**DO:** Briefly show the eval receipt: 15 of 15. Flash wrong audience, purpose, expiry, replay, over-disclosure, forgery, mutation, and capability-lifecycle scenarios.

**SAY:**

> This is tested as a protocol, not staged as a happy path. Fifteen adversarial scenarios and a real two-tab browser journey produce machine-readable receipts.

## 2:35–2:45 — close

**DO:** Return to the landing headline.

**SAY:**

> Proof Courier gives WebMCP a privacy-native pattern: the agent carries proof, not your private records.
