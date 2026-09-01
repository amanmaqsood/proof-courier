# WebMCP Challenge Entry

This context defines the language used to select, build, evaluate, and submit a competitive entry to the 2026 OpenAI WebMCP Challenge.

## Language

**Top-10 Finish**:
One of the ten submissions selected as a WebMCP Challenge winner under the official judging process.
_Avoid_: First place, grand prize, guaranteed win

**Human-Agent Loop**:
A shared workflow in which a person and an agent observe the same product state, contribute different actions or judgment, and jointly reach an outcome.
_Avoid_: Chatbot, full automation, agent feature

**Critical User Journey**:
The single important end-to-end task the entry must make demonstrably better for one specific user.
_Avoid_: Feature list, general use case

**WebMCP Tool**:
A bounded, structured capability registered by the web page for discovery and invocation by an in-browser agent.
_Avoid_: Button automation, backend MCP server, generic API endpoint

**Agent Boundary**:
The explicit limit on what state an agent can observe and what actions it can perform within the shared product.
_Avoid_: AI safety layer, permissions in general

**Winning Evidence**:
Observable proof tied to a judging criterion, such as successful fresh-session tool calls, a complete journey, user-problem evidence, or a novel interaction demonstrated live.
_Avoid_: Polish, claims, potential

**Reconciliation Case**:
One synthetic accounts-payable review that contains a purchase order, a goods receipt, a supplier invoice, and their current resolution state.
_Avoid_: Account, transaction, document bundle

**Source Record**:
One of the three immutable records being compared: purchase order, goods receipt, or supplier invoice.
_Avoid_: Truth, correct document

**Discrepancy**:
A deterministic, field-level difference between Source Records that must be accepted, corrected, or escalated before approval.
_Avoid_: AI finding, anomaly

**Resolution Draft**:
A reversible proposed value and reason staged by the agent or person for one Discrepancy. It has no accounting or payment effect.
_Avoid_: Fix, decision, approval

**Approval Receipt**:
The visible, human-created record that all Discrepancies were resolved and the Reconciliation Case was approved. It never initiates payment.
_Avoid_: Payment authorization, agent approval
