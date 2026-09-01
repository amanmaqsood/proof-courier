# Devpost submission draft

## Project name

Recon Room

## Tagline

Where browser agents prepare the reconciliation and people keep the only approval key.

## What it does

Recon Room is a WebMCP-powered three-way reconciliation workspace. A browser agent can inspect a synthetic purchase order, goods receipt, and supplier invoice; run deterministic comparison logic; open exact evidence anchors; and stage reversible, source-bound resolution drafts. The person sees every change in the same page, can correct the agent with separate attribution, and retains the only final approval control.

The demonstration case begins with three discrepancies. The agent prepares three drafts and quantifies `$362` in pre-tax value under review. The person changes the proposed tax source from the invoice to the purchase order, then approves. Approval creates a read-only receipt, never a payment, and dynamically withdraws the two mutation tools.

## Why this is a strong fit for WebMCP

Ordinary browser automation has to infer meaning from pixels. A backend MCP server would bypass the page state the person is reviewing. WebMCP lets Recon Room expose the page's real domain actions as bounded tools, so the agent and the person share one visible, versioned case.

The experience depends on that shared state. The agent's drafts appear immediately in the human workspace. A human correction becomes the next state the agent reads. After human approval, the tool inventory itself changes: `stage_resolution` and `revert_resolution` disappear, while `get_approval_receipt` becomes available.

## What people and agents can do together

The agent handles structured preparation: locating the case, inspecting evidence, comparing records, opening exact source anchors, and staging reversible drafts. Deterministic application code owns comparison, arithmetic, concurrency checks, and state transitions. The person owns judgment, correction, and approval.

That division makes a workflow possible that is difficult with either party alone: faster preparation without hiding uncertainty or delegating consequential authority to an agent.

## How it was built

Recon Room is a React and TypeScript application deployed on Vercel. It registers native WebMCP tools through `document.modelContext.registerTool`. Every write requires the current case version and a named immutable source; the tool schema does not accept a free-form numeric value. Agent changes are drafts, every mutation records its actor, and human corrections are protected from agent reversion.

The tool inventory is state-aware. Seven review tools exist before approval. After the human approves, both mutation tools are unregistered and a read-only approval receipt is registered, leaving six capabilities. There is intentionally no tool for approval, posting, payment, credentials, or arbitrary code execution.

## Safety and evaluation

All records are synthetic. The prototype is not connected to an ERP, accounting system, bank, or payment rail.

`npm run verify` runs lint, 24 unit and contract tests, 12 adversarial judge scenarios, the production build, and three Playwright browser journeys. The adversarial cases cover instruction injection inside a supplier note, stale writes, missing source values, an unknown case, protected human corrections, lifecycle cleanup, immutable records, dynamic capability withdrawal, and a retained mutation function called after approval. The release receipt includes SHA-256 hashes for the production bundle.

## Challenges

The hardest design problem was deciding what the agent must never own. A broad "reconcile invoice" tool would hide judgment and create a dangerous approval shortcut. Recon Room instead exposes small domain primitives and keeps source evidence visible.

The second challenge was shared-state correctness. The person and agent can act between each other's turns, so every mutation is version-checked. A stale tool call fails and tells the agent to inspect again.

The third challenge was making safety demonstrable rather than aspirational. The interface shows attribution, guarded value, the approval receipt, the exact tool trace, and the post-approval capability change.

## Accomplishments

- A complete human-agent journey using page-native WebMCP tools.
- Source-bound drafts with no free-form value invention.
- A visible human correction that the agent cannot undo.
- Human-only approval with no posting or payment capability.
- Dynamic 7 → 6 capability transition after approval.
- Twelve portable judge scenarios and three real Chromium journeys.
- A second synthetic case proving the contract is not hard-coded to one discrepancy shape.

## What is next

The next product step would be a read-only connector for a real reconciliation export, followed by authenticated roles and organization-specific approval policies. Those are deliberately outside the challenge prototype: the submitted build proves the interaction and safety model without claiming a production accounting integration.
