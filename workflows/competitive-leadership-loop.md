# Competitive Leadership Loop

Status: implementation-ready — recommendations accepted  
Deadline: 2026-12-31  
Primary artifact updated by this workflow: `docs/TOP_TIER_EXECUTION_PLAN.md`

## Purpose

Continuously compare Proof Courier with the discoverable public WebMCP Challenge field, identify the highest-scoring evidence-backed gap, and update the implementation plan until Proof Courier meets the founder-approved definition of a leading public submission.

This workflow never promises a contest result. It may declare Proof Courier `PUBLIC-FIELD LEADING` only against a frozen, dated, reproducible public corpus and rubric.

## Known operating context

- Product: Proof Courier, a synthetic minimum-disclosure wallet and fellowship verifier.
- Repository: `amanmaqsood/proof-courier`.
- Deployment: Vercel.
- Agent surfaces: ChatGPT in-app browser and WebMCP-enabled Chrome.
- Research surfaces: GitHub, Devpost, public live apps, public YouTube demos, official WebMCP documentation, and challenge rules.
- Current differentiation hypothesis: request minimization, privacy-preserving counterproposal, visible human consent, one-use dynamic capability, independent issuer trust, cross-origin proof transport, replay protection, and human-only final submission.
- Current blocking defect: the verifier trusts issuer key material supplied in the proof bundle; this must be replaced by independent verifier trust before any leading claim.

## Trigger

Run on any of these events:

- a relevant public challenge repository is created or materially updated;
- a public submission, demo, article, or video reveals a stronger mechanism;
- Proof Courier completes a milestone or changes its canonical demo;
- a test, red-team, usability review, or native browser run exposes a weakness;
- the scheduled weekly sweep begins;
- the final release-candidate comparison begins.

## Inputs

- reproducible GitHub queries and their dated result set;
- Devpost project gallery and public submission pages;
- public repository commit SHAs, licences, READMEs, test evidence, and source;
- public live URLs and videos;
- the official four judging criteria and tie-break order;
- Proof Courier's current exact Git SHA, deployment IDs, test receipts, threat model, and demo recording;
- prior loop result and unresolved gaps.

## Corpus construction

1. Run the fixed discovery queries.
2. Deduplicate by repository identity.
3. Classify each result as challenge entry, likely entry, SDK/tooling, official example, unrelated, inaccessible, or uncertain.
4. Record the classification reason rather than silently excluding it.
5. Preserve repository SHA, discovery timestamp, live URL, video URL, licence, and last update.
6. Run automated static extraction over the full relevant corpus.
7. Deep-audit the highest-ranked entries and every entry adjacent to Proof Courier's privacy, identity, consent, or capability-governance thesis.
8. Runtime-test the strongest reachable live entries without logging in, submitting data, or causing external side effects.

## Evidence rubric

Score each project from public evidence only. Every score must link to source, runtime receipt, or video timestamp.

### Official criteria

- WebMCP Leverage: necessity, non-triviality, dynamic lifecycle, schemas, annotations, recovery, and native browser evidence.
- Execution: correctness, coherence, deployment reliability, tests, accessibility, performance, and finish.
- Potential Impact: credible audience, painful existing workflow, measurable improvement, and honest boundaries.
- Creativity and Ambition: mechanism novelty, conceptual reach, and differentiation from the frozen corpus.

### Cross-cutting proof quality

- human-agent shared state;
- human authority over consequential action;
- security and privacy invariants;
- failure recovery;
- judge comprehension in the first minute;
- public reproducibility;
- evidence-to-claim integrity.

## Per-run procedure

1. Freeze the current corpus and Proof Courier release candidate.
2. Run automated metadata and WebMCP-surface extraction across the corpus.
3. Recompute the public leaderboard with receipts and confidence labels.
4. Deep-audit any project that exceeds Proof Courier overall, exceeds it on WebMCP Leverage, or threatens its core differentiation.
5. Run Proof Courier's complete verification suite and native deployed journey.
6. Compare mechanism, not feature count.
7. Identify the single gap with the greatest likely effect on the official rubric.
8. Produce a decision-ready brief containing:
   - current rank range and confidence;
   - strongest competitor and why;
   - strongest Proof Courier advantage;
   - critical defect or missing evidence;
   - one recommended plan change;
   - expected rubric movement;
   - implementation cost, risk, rollback point, and acceptance gate.
9. Update `docs/TOP_TIER_EXECUTION_PLAN.md` only when the recommendation has evidence and passes the founder-approved pivot rule.
10. After implementation, rerun the same frozen benchmark before claiming improvement.

## Checkpoint

Push the human checkpoint to the end of research and technical verification. Ask once, with the decision-ready brief, only when the recommendation would:

- change the product thesis;
- remove or replace the fellowship use case;
- add real personal data, real issuers, payments, accounts, or consequential submission;
- create meaningful recurring cost;
- require copying or adapting third-party code/assets;
- delay a release freeze;
- weaken an existing privacy or human-authority invariant.

Routine research, testing, documentation, refactoring inside the agreed architecture, and reversible UI iteration do not need a checkpoint.

## Non-negotiable release gates

- zero known critical or high-severity correctness, privacy, security, or authority defects;
- 100% pass on consent, issuer trust, exact disclosure, capability withdrawal, replay, and human-only final-action invariants;
- at least the founder-approved agent-task success rate on a frozen, representative natural-language eval set;
- clean-checkout reproducibility;
- exact-SHA local, repository, deployment, and evidence alignment;
- real ChatGPT in-app-browser completion of the canonical journey;
- demo video and written claims match observed behavior;
- no leading claim based solely on internal test count, repository size, or self-authored scoring.

## Leading-state rule

Declare `PUBLIC-FIELD LEADING` only when all are true for two consecutive full runs:

1. Proof Courier has the highest evidence-backed composite score among the frozen relevant public corpus.
2. It is not below the public top three on any official criterion.
3. It leads WebMCP Leverage or Creativity and Ambition outright, because an undifferentiated composite tie is not leadership.
4. No audited public project combines its complete core mechanism.
5. Independent reviewers understand the problem, mechanism, human boundary, and result without builder explanation.
6. Independent security review finds no open critical or high-severity issue.
7. All release gates pass on the deployed candidate.
8. The benchmark report states discoverability limits and never generalizes to private or unavailable entries.

## Stop conditions

- `LEADING`: the leading-state rule passes twice consecutively; move effort from features to reliability and presentation.
- `TOP-TIER, NOT LEADING`: Proof Courier is competitive but one or more public entries remain demonstrably stronger; continue the loop with the highest-value gap.
- `PIVOT REQUIRED`: the current thesis cannot lead without abandoning a core constraint; present the pivot brief to the founder.
- `EVIDENCE INSUFFICIENT`: a superiority claim cannot be supported because competitor artifacts or our own runtime evidence are missing; gather evidence rather than guessing.

## Resolved decisions

1. Leadership means the highest evidence-backed composite across the four official criteria, a public top-three position on every criterion, and an outright lead in WebMCP Leverage or Creativity and Ambition.
2. The workflow may recommend replacing the fellowship wrapper only after two consecutive audits show that it caps the product's score, while preserving the Proof Courier trust protocol and existing privacy boundaries.
3. The release target is at least 100 frozen agent-evaluation runs across three available agent configurations, ten unfamiliar human reviewers, and one independent security review. Critical invariants require a 100% pass rate.
4. The reusable protocol package and conformance CLI are conditional until the secure product and canonical journey pass their gates; they become required scope only after that point.
5. Competitor rankings stay private. Public materials present Proof Courier's evidence and methodology without naming other entries as inferior.
6. Existing and free infrastructure is the default. Combined external spending above INR 8,000 requires a founder checkpoint before commitment.

Founder receipt: “Go with your recommendation plan and make sure we are at the top. I mean we are best among all the public repos available on this hackathon.”
