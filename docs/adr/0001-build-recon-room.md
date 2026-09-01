# ADR 0001: Build Recon Room

Date: 2026-09-01

Status: Accepted

## Context

The OpenAI WebMCP Challenge rewards non-trivial WebMCP leverage, execution, credible impact, and creativity. Current official examples and visible entries already cover shopping, travel, creative editors, games, form filling, developer tools, accessibility verification, and generic financial-record queries.

A three-way invoice match is a real review workflow: a purchase order, goods receipt, and supplier invoice are compared before an invoice is approved. The useful agent role is to inspect the shared case, explain deterministic discrepancies, and stage reversible resolutions. The human must retain final judgment and approval.

The entry must be built by one person before the submission deadline. It cannot depend on production accounting credentials, private financial data, or a live payment rail.

## Decision

Build **Recon Room**, a seeded, synthetic three-way reconciliation workspace with one excellent Critical User Journey:

1. The person asks the in-browser agent to review the urgent case.
2. The agent discovers WebMCP tools and inspects the three Source Records.
3. Deterministic application logic identifies quantity, price, tax, or reference Discrepancies.
4. The agent stages field-level Resolution Drafts with reasons; each change appears visibly and is attributed to the agent.
5. The person corrects at least one draft in the UI.
6. The agent reads the updated shared state and prepares the case for review.
7. Only the person can press the final approval control, producing an Approval Receipt.

The initial WebMCP surface will be small and state-aware:

- `list_cases`: find available cases and their status;
- `inspect_case`: read bounded Source Record and discrepancy data;
- `compare_records`: run the deterministic three-way comparison;
- `stage_resolution`: create or replace one reversible Resolution Draft;
- `get_review_state`: read current drafts, unresolved items, and readiness.

There will be no WebMCP tool for payment, posting to an accounting system, or final human approval.

## Consequences

### Positive

- WebMCP is essential to a visible, multi-turn Human-Agent Loop rather than decorative automation.
- The workflow is specific, credible, and understandable in under 30 seconds.
- Synthetic seeded data makes the demo reliable and legally safe.
- Deterministic comparison, version checks, attribution, visible receipts, and a human-only approval boundary provide strong technical evidence.

### Negative

- The prototype demonstrates the workflow rather than integration with a real ERP.
- Impact claims must remain illustrative unless separately supported by evidence.
- A single seeded case limits breadth, but protects completion quality and demo reliability.

## Rejected alternatives

- Generic finance dashboard: collided with visible LedgerAgent-style entries and weak human-agent interleaving.
- Evidence/claim workspace: adjacent products and accessibility-verification entries already set a high collision bar.
- Incident handoff: credible but less visually immediate and harder to demonstrate without risky domain claims.
- Shopping, travel, games, coding, and creative editors: heavily represented in official examples or visible submissions.
