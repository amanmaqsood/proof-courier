# Devpost draft — do not submit

## Project name

Proof Courier

## Tagline

The agent carries proof. Not your private records.

## What it does

Proof Courier is a two-site WebMCP prototype for privacy-preserving agent workflows. A fellowship verifier publishes five minimum eligibility claims and explicitly prohibits raw records. A separate credential wallet prepares those derived claims, pauses for the person's visible consent, and only then exposes a one-time proof export tool. ChatGPT can carry the proof bundle between the tabs and verify it, but it never receives the applicant's date of birth, student ID, exact GPA, transcript, home address, or name. The final application submission is human-only.

## The problem

Agents that work across websites create a new privacy problem: the easiest way to prove something is often to copy the entire source record into chat. That is unnecessary and unsafe. A scholarship may need to know that an applicant is over 18 and above a GPA threshold; it does not need their birth date or exact grades.

## How WebMCP is used

Proof Courier makes authority part of the live page state. The verifier tab exposes requirements and verification tools. The wallet tab exposes summary and preparation tools, but no export capability. When the person approves the exact audience, purpose, expiry, and five-claim disclosure in the visible UI, `wallet_export_proof` is dynamically registered. After one call it is withdrawn and replaced with a read-only receipt. On the verifier, acceptance similarly unlocks a receipt but never a submission tool.

This is difficult to reproduce with ordinary pixel automation because the agent needs structured page meaning, dynamic capability discovery, and the same state the person is reviewing.

## How it works

The synthetic proof bundle uses browser Web Crypto:

- a P-256 issuer signature authenticates credential metadata;
- Merkle inclusion paths reveal only the requested claims;
- a holder P-256 signature binds audience, purpose, nonce, expiry, and disclosure set;
- deterministic policy rejects missing claims and over-disclosure;
- expiry and consumed nonces reject stale or replayed presentations.

The wallet and verifier tool surfaces are loaded as separate runtime chunks. The release gate scans the production assets to prove that wallet signing fixtures do not ship to the verifier or shared bundle, and that raw synthetic record values ship nowhere.

The verifier checks all of these before showing a human submission control.

## What makes it original

Most agent safety demos add a confirmation dialog before a powerful action. Proof Courier changes the object the agent carries and makes permission temporary and discoverable. The agent transports a narrow proof instead of a private record; the export capability does not exist before consent and does not survive after use. Two independent WebMCP pages cooperate without merging their trust boundaries.

## How it was tested

The repository contains 15 named adversarial scenarios covering wrong audience, wrong purpose, expiry, replay, missing claims, over-disclosure, changed claims, forged issuer signatures, post-consent mutation, unsafe claim requests, and dynamic authority. A Playwright suite executes the full journey across separate wallet and verifier page registries, checks 390px layouts, and verifies malformed-proof recovery. `npm run verify` emits machine-readable receipts. An additional authorized run used native WebMCP in the OpenAI Codex in-app browser against the public deployment: five synthetic claims crossed, zero private fields crossed, export disappeared after use, verification passed, and no agent submission capability appeared.

## Scope and limits

All people, institutions, credentials, and applications are synthetic. Proof Courier is not a production identity wallet, W3C Verifiable Credential implementation, zero-knowledge proof, compliance product, or real university/fellowship integration. Its submitted claim is the WebMCP interaction pattern and its executable privacy boundaries.

## Built with

React, TypeScript, WebMCP (`document.modelContext.registerTool`), Web Crypto, Vitest, Playwright, Vite, and Vercel.

## Links to add after verification

- Live app: https://proof-courier-orcin.vercel.app
- Public repository: https://github.com/amanmaqsood/proof-courier
- Demo video: [pending real ChatGPT recording]
