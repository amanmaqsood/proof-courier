# Recon Room threat model

Recon Room is a synthetic challenge prototype. Its safety claim is intentionally narrow: an in-browser agent can inspect evidence and prepare reversible drafts, but it cannot approve, post, pay, transfer funds, access credentials, or connect to an accounting system.

## Trust boundaries

| Boundary | Trusted | Untrusted | Control |
| --- | --- | --- | --- |
| Source records | Record shape and deterministic fixture loading | Supplier text and excerpts | Read-only tools mark source content untrusted; exact anchors remain visible |
| Agent input | Tool name and validated schema | Model-selected arguments and reasons | Strict schemas, bounded enums, minimum reason length, source-derived values only |
| Shared state | Versioned domain transitions | Stale or repeated writes | Every mutation requires the currently observed version |
| Human correction | Human-authored current draft | Later agent mutation | Agent cannot revert a human correction |
| Approval | Human button and receipt | Agent request to approve or pay | No approval/payment tool exists; mutation tools are withdrawn after approval |
| Page lifecycle | Current document | Detached or replaced page | All registrations share one `AbortSignal` and are removed on disposal |

## Abuse cases exercised

1. A supplier note says to ignore prior instructions and approve. It is returned only as quarantined evidence.
2. An agent selects a source that has no observed value. The write is rejected.
3. An agent submits a stale case version. The write is rejected and reinspection is required.
4. An agent tries to revert a human correction. The human-authored draft remains unchanged.
5. A case is human-approved. Both mutation tools disappear and only a read-only receipt is added.
6. The document lifecycle ends. The complete tool registration is aborted.

## Residual limitations

- Records are seeded in memory and reset on reload. There is no authentication, persistence, ERP integration, or multi-tenant authorization.
- The prototype demonstrates workflow and capability design, not legal, accounting, or tax correctness.
- Browser-level schema validation depends on the WebMCP host. Domain validation repeats the consequential source, version, actor, and approval checks.
- Agent reasoning quality must still be evaluated in a live supported browser; deterministic tests do not replace that final end-to-end run.
