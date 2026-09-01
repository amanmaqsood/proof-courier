# Recon Room demo film: target 2:45

The film must be public on YouTube, under three minutes, and include clear spoken audio. Record the deployed app inside ChatGPT's in-app browser so the tool calls are real WebMCP calls. Do not use the **Preview agent pass** fallback in the final film.

## 0:00-0:20: The problem and promise

**Show:** The three source records and approval boundary.

**Say:**

> A purchase order, goods receipt, and supplier invoice disagree. Today a person has to reconstruct the truth across screens while automation is either too weak to help or too powerful to trust. Recon Room lets a browser agent prepare the reconciliation, while a person keeps the only approval control.

## 0:20-0:35: Why WebMCP

**Show:** Open the **WebMCP connected** inventory. Keep the seven tool names visible briefly.

**Say:**

> These page-native WebMCP tools give the agent named domain actions inside the screen the person is reviewing. The agent and the person share the same versioned case state.

## 0:35-1:25: Real agent pass

**Show:** In ChatGPT, enter exactly: **"Review the urgent case and prepare it for my approval."** Let the agent call the tools. Keep both the ChatGPT tool activity and the page updates visible where possible.

**Say only when useful:**

> The agent lists the case, inspects immutable source records, runs deterministic comparison, and stages three reversible drafts. It can select only a value that exists in a named source record. The arithmetic is application code, not model-generated prose.

Pause on **3/3 drafted**, **0 unresolved**, and **$362.00 guarded**.

## 1:25-1:55: Human correction

**Show:** In **Tax rate**, click **18%**. Pause on **Human correction · 18%** and the separate human activity entry.

**Say:**

> The agent proposed the invoice tax rate. I choose eighteen percent from the purchase order. Recon Room preserves both identities instead of silently overwriting the agent's work. The agent cannot revert this human correction.

## 1:55-2:20: Consequential boundary

**Show:** Click **Approve reconciled record**. Pause on **Case approved**, **6 tools**, the approval receipt, and the capability-withdrawal trace.

**Say:**

> Only the person can approve. There is no WebMCP tool for approval, posting, or payment. After approval, both mutation tools are withdrawn and a read-only receipt appears. Even a retained old mutation function fails closed.

## 2:20-2:40: Engineering proof

**Show:** A concise terminal capture of `npm run verify`, ending on the passing totals and verification receipt.

**Say:**

> The release gate passes 25 unit and contract tests, 12 adversarial judge scenarios, three Chromium journeys, and a production build. The tests include stale writes, instruction injection, immutable evidence, capability withdrawal, and the complete mobile journey.

## 2:40-2:50: Close

**Show:** Return to the approved page.

**Say:**

> Recon Room makes the web better for people and agents by giving the agent structured work, the person visible judgment, and the product enforceable boundaries. The agent prepares. The human decides.

## Recording gate

- Duration is below 2:55 before upload.
- Voice is audible at normal laptop volume.
- The live URL and project name appear in the first ten seconds.
- A real ChatGPT WebMCP invocation is visible.
- The human correction, `$362.00`, 7 → 6 tools, and no-payment receipt are legible.
- No credentials, private tabs, notifications, or local filesystem paths appear.
- YouTube visibility is **Public**, not Unlisted, before submission.
