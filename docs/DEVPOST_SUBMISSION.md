# Devpost submission copy

## Project name

Proof Courier

## Tagline

The agent carries proof. Not your private records.

## What it does

Proof Courier is a WebMCP prototype for privacy-preserving agent workflows. A fellowship verifier publishes five minimum eligibility claims. If it asks for raw records or keeps proof for too long, the wallet releases nothing and offers a safer counterproposal. The wallet then pauses for visible consent and exposes a proof export tool only after approval. Its versioned grant is persisted in same-origin IndexedDB and atomically claimed across tested reload and two-tab races. An agent can carry the proof between the sites, but it never receives the applicant's date of birth, student ID, exact GPA, transcript, home address, or name. Only the person can submit the application.

## The problem

Agents that work across websites create a new privacy problem: the easiest way to prove something is often to copy the entire source record into chat. That is unnecessary and unsafe. A scholarship may need to know that an applicant is over 18 and above a GPA threshold; it does not need their birth date or exact grades.

## How WebMCP is used

Proof Courier makes authority part of the live page state. The verifier exposes requirements, counterproposal review, and proof verification. The wallet exposes a safe summary, a Request Firewall, and disclosure preparation, but no export capability. When the person approves the exact audience, purpose, expiry, and five claims in the visible UI, `wallet_export_proof` appears. The first atomic IndexedDB claim withdraws it from every same-origin wallet tab, and a read-only receipt takes its place. Successful verification adds another receipt, never a submission tool.

This is difficult to reproduce with ordinary pixel automation because the agent needs structured page meaning, dynamic capability discovery, and the same state the person is reviewing.

## How it works

The synthetic proof bundle uses browser Web Crypto:

- a P-256 issuer signature authenticates credential metadata;
- Merkle inclusion paths reveal only the requested claims;
- a holder P-256 signature binds audience, purpose, challenge, expiry, disclosure set, approval time, and the claimed wallet grant;
- deterministic policy rejects missing claims and over-disclosure;
- expiry and consumed challenges reject stale or replayed presentations within the active in-memory verifier session.

The wallet, verifier, and showcase deploy as independent production artifacts. Each canonical origin serves only its own routes and entry chunk. Peer role routes and peer entry chunks return 404. The release gate also rejects forbidden role modules and content, disables source maps, and checks six security headers on every role.

The verifier checks all of these before showing a human submission control.

## What makes it original

Most agent safety demos add a confirmation dialog before a powerful action. Proof Courier changes both the object and the authority. The agent carries a narrow proof instead of a private record. In the tested browser session, the export capability does not exist before consent and is withdrawn from state after its call. Two WebMCP origins complete the journey with separate browser storage and no peer-origin fetches. Their production artifacts cannot serve each other's role routes or entry chunks.

## How it was tested

The repository contains 22 named adversarial scenarios covering request overreach, consent widening or future-dating, issuer trust, wrong audience or purpose, expiry, replay, missing or extra claims, tampering, and dynamic authority. 10 Playwright checks include six complete product journeys across separate wallet and verifier origins plus four wallet durability and concurrency checks. They exercise all three Request Firewall scenarios, reload and two-tab races, the evidence room and 390px layouts, malformed-proof recovery, and serious/critical accessibility scans on every judge-facing route. A separate role-build matrix records 21 role-isolation outcomes across three local artifacts: 12 role routes and nine owner/peer entry-chunk responses. 1 isolated-artifact browser journey then completes request negotiation, visible consent, atomic export, proof verification, and the human-only final-action boundary against those builds on separate processes. `npm run verify` emits machine-readable receipts. A native WebMCP run in the OpenAI Codex in-app browser tested the deployed build. In that recorded session, five synthetic claims crossed, zero private fields crossed, export disappeared after use, verification passed, and no agent submission tool appeared. The public `/evidence` route links the receipts, source revision, and limits behind each claim.

## Scope and limits

All people, institutions, credentials, and applications are synthetic. Wallet export authority is durable only within same-origin browser storage. Verifier challenge and replay state remain in memory and reset across reloads or application instances. Proof Courier is not a production identity wallet, W3C Verifiable Credential implementation, zero-knowledge proof, compliance product, or real university or fellowship integration. Its submitted claim is the WebMCP interaction pattern and its explicitly tested browser boundaries.

## Built with

React, TypeScript, WebMCP (`document.modelContext.registerTool`), Web Crypto, Vitest, Playwright, Vite, and Vercel.

## Links to add after verification

- Live app: https://proof-courier-orcin.vercel.app
- Judge evidence room: https://proof-courier-orcin.vercel.app/evidence
- Public repository: https://github.com/amanmaqsood/proof-courier
- Demo video: https://youtu.be/S5y_iFPjlSw
