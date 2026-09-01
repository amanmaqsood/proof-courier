# Recon Room

**Where humans and agents resolve what does not match.**

Recon Room is a WebMCP-powered three-way invoice reconciliation workspace. An in-browser agent can inspect a purchase order, goods receipt, and supplier invoice; run deterministic comparison logic; and stage reversible field-level resolutions. A person sees every change, can correct it, and retains the only final approval control.

The current entry is a challenge prototype. All records are synthetic. It is not connected to an accounting system, ERP, bank, or payment rail.

## Judge it in 60 seconds

1. Open the live app in ChatGPT's in-app browser, or Chrome 149+ with WebMCP testing enabled.
2. Ask: **“Review the urgent case and prepare it for my approval.”**
3. Watch the agent inspect `RR-1042`, compare the three records, and stage three visible Resolution Drafts. The page quantifies the pre-tax amount under review.
4. In the Tax rate discrepancy, click **18%** to correct the agent's draft. The activity trail records a human correction rather than overwriting identity.
5. Ask the agent to check whether the case is ready.
6. Press **Approve reconciled record** yourself. No agent tool can approve, post, or pay.

If a WebMCP-capable browser is unavailable, click **Preview agent pass** to exercise the same application logic and shared-state UI.

## Why WebMCP is essential

Ordinary browser automation must infer meaning from buttons and pixels. A backend MCP server would bypass the live page state. Recon Room instead registers bounded tools inside the page, so the person, page, and agent share one versioned case. Agent calls update the same visible drafts a person can correct, and the next tool call observes that correction.

This is deliberately not full automation. The agent handles comparison and preparation; deterministic code owns arithmetic and state transitions; the person owns consequential judgment and approval.

## WebMCP tools

| Tool | Purpose | Mutates state | Safety control |
| --- | --- | --- | --- |
| `list_cases` | Find visible cases and urgency | No | Bounded synthetic summary |
| `inspect_case` | Read source records, drafts, status, and version | No | Read-only + untrusted-content annotation |
| `compare_records` | Run deterministic three-way matching and focus the UI | No | No model-authored arithmetic |
| `open_evidence` | Open the exact source record, field locator, and excerpt | No | Read-only + untrusted-content annotation |
| `get_review_state` | Read unresolved items, readiness, and financial summary | No | Explicit human-only approval boundary |
| `stage_resolution` | Stage or replace one source-bound Resolution Draft | Yes, reversible | Agent chooses an immutable source, never an invented value |
| `revert_resolution` | Revert a current agent-authored draft | Yes, reversible | Cannot revert a human correction |
| `get_approval_receipt` | Read the human approval receipt after approval | No | Registered only after approval; confirms no payment |

Tool registration is implemented in [`src/webmcp.ts`](src/webmcp.ts). The shared deterministic domain logic is in [`src/domain/reconciliation.ts`](src/domain/reconciliation.ts).

The tool inventory is state-aware: seven review tools are available before approval; after the human approves, both mutation tools are unregistered and `get_approval_receipt` appears, leaving six read-only/post-approval capabilities. Every registration is bound to an `AbortSignal` for lifecycle cleanup. There is intentionally no tool for final approval, accounting-system posting, or payment.

## Architecture

```text
person ───────────────┐
                     ▼
ChatGPT agent → WebMCP tools → versioned case state → visible React UI
                                  │                    │
                                  └─ deterministic ────┘
                                     comparison rules

Human-only button → approval receipt (never payment)
```

## Run locally

Requires Node.js 20 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Verification

```bash
npm test
npm run lint
npm run build
```

Twelve automated tests cover deterministic discrepancy detection, exact evidence anchors, source-bound resolution, quantified exposure, reversible staging, protected human correction, readiness, human-only approval, stale-write rejection, WebMCP tool contracts, lifecycle cleanup, forbidden-capability absence, and dynamic capability transitions. See [`docs/EVALS.md`](docs/EVALS.md) for the agent evaluation plan.

## Challenge scope

- Built during the OpenAI WebMCP Challenge submission period.
- One complete, seeded Critical User Journey is prioritized over breadth.
- Source records are immutable; only Resolution Drafts change.
- Every mutation carries an actor and creates visible activity.
- This prototype demonstrates reconciliation workflow design, not accounting, tax, or payment advice.

## License

[MIT](LICENSE)
