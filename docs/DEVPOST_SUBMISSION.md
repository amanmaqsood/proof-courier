# Devpost draft: do not submit

## Project name

Proof Courier

## Tagline

The agent carries proof. Not your private records.

## What it does

Proof Courier is a two-site WebMCP prototype for privacy-preserving agent workflows. A fellowship verifier publishes five minimum eligibility claims. If it asks for raw records or keeps proof for too long, the wallet releases nothing and offers a safer counterproposal. The wallet then pauses for visible consent and exposes a one-time proof export tool only after approval. ChatGPT can carry that proof between the sites, but it never receives the applicant's date of birth, student ID, exact GPA, transcript, home address, or name. Only the person can submit the application.

## The problem

Agents that work across websites create a new privacy problem: the easiest way to prove something is often to copy the entire source record into chat. That is unnecessary and unsafe. A scholarship may need to know that an applicant is over 18 and above a GPA threshold; it does not need their birth date or exact grades.

## How WebMCP is used

Proof Courier makes authority part of the live page state. The verifier exposes requirements, counterproposal review, and proof verification. The wallet exposes a safe summary, a Request Firewall, and disclosure preparation, but no export capability. When the person approves the exact audience, purpose, expiry, and five claims in the visible UI, `wallet_export_proof` appears. After one call it disappears and a read-only receipt takes its place. Successful verification adds another receipt, never a submission tool.

This is difficult to reproduce with ordinary pixel automation because the agent needs structured page meaning, dynamic capability discovery, and the same state the person is reviewing.

## How it works

The synthetic proof bundle uses browser Web Crypto:

- a P-256 issuer signature authenticates credential metadata;
- Merkle inclusion paths reveal only the requested claims;
- a holder P-256 signature binds audience, purpose, nonce, expiry, disclosure set, approval time, and one-use consent grant;
- deterministic policy rejects missing claims and over-disclosure;
- expiry and consumed nonces reject stale or replayed presentations.

The wallet and verifier tool surfaces are loaded as separate runtime chunks. The release gate scans the production assets to prove that wallet signing fixtures do not ship to the verifier or shared bundle, and that raw synthetic record values ship nowhere.

The verifier checks all of these before showing a human submission control.

## What makes it original

Most agent safety demos add a confirmation dialog before a powerful action. Proof Courier changes both the object and the authority. The agent carries a narrow proof instead of a private record. The export capability does not exist before consent and does not survive after use. Two WebMCP sites cooperate without sharing storage or fetching resources from each other.

## How it was tested

The repository contains 22 named adversarial scenarios covering request overreach, consent widening or future-dating, issuer trust, wrong audience or purpose, expiry, replay, missing or extra claims, tampering, and dynamic authority. 6 Playwright checks run the full journey across separate wallet and verifier origins, exercise all three Request Firewall scenarios, check the evidence room and 390px layouts, recover from malformed proof, and scan every judge-facing route for serious or critical accessibility findings. `npm run verify` emits machine-readable receipts. A fresh native WebMCP run in the OpenAI Codex in-app browser tested the deployed build. Five synthetic claims crossed, zero private fields crossed, export disappeared after use, verification passed, and no agent submission tool appeared. The public `/evidence` route links the receipts, source revision, and limits behind each claim.

## Scope and limits

All people, institutions, credentials, and applications are synthetic. Proof Courier is not a production identity wallet, W3C Verifiable Credential implementation, zero-knowledge proof, compliance product, or real university/fellowship integration. Its submitted claim is the WebMCP interaction pattern and its executable privacy boundaries.

## Built with

React, TypeScript, WebMCP (`document.modelContext.registerTool`), Web Crypto, Vitest, Playwright, Vite, and Vercel.

## Links to add after verification

- Live app: https://proof-courier-orcin.vercel.app
- Judge evidence room: https://proof-courier-orcin.vercel.app/evidence
- Public repository: https://github.com/amanmaqsood/proof-courier
- Demo video: [pending real ChatGPT recording]
