import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileCheck2,
  FileText,
  Fingerprint,
  LockKeyhole,
  RotateCcw,
  Scale,
  Sparkles,
  UserRound,
  Undo2,
  ScanSearch,
  X,
} from 'lucide-react'
import {
  approveCase,
  compareCase,
  createSeedCase,
  getFinancialSummary,
  getEvidence,
  getReviewState,
  revertResolution,
  stageResolution,
  type Actor,
  type Discrepancy,
  type EvidenceSource,
  type ReconciliationCase,
  type SourceRecord,
} from './domain/reconciliation'
import { registerReconRoomTools } from './webmcp'

const money = (value: number) => `$${value.toFixed(2)}`

const recordLabels: Record<SourceRecord['type'], { eyebrow: string; title: string }> = {
  purchase_order: { eyebrow: 'What we ordered', title: 'Purchase order' },
  goods_receipt: { eyebrow: 'What arrived', title: 'Goods receipt' },
  supplier_invoice: { eyebrow: 'What they billed', title: 'Supplier invoice' },
}

function formatValue(field: Discrepancy['field'], value: number | null) {
  if (value === null) return '—'
  if (field === 'unitPrice') return money(value)
  if (field === 'taxRate') return `${value}%`
  return String(value)
}

function DocumentCard({ record }: { record: SourceRecord }) {
  const label = recordLabels[record.type]
  return (
    <article className="document-card">
      <div className="document-topline">
        <span className="document-icon"><FileText size={16} /></span>
        <span>{record.reference}</span>
      </div>
      <p className="eyebrow">{label.eyebrow}</p>
      <h3>{label.title}</h3>
      <dl>
        <div><dt>Quantity</dt><dd>{record.quantity}</dd></div>
        <div><dt>Unit price</dt><dd>{record.unitPrice === null ? 'Not recorded' : money(record.unitPrice)}</dd></div>
        <div><dt>Tax</dt><dd>{record.taxRate === null ? 'Not recorded' : `${record.taxRate}%`}</dd></div>
      </dl>
      {record.supplierNote && <div className="quarantined-note"><CircleAlert size={12} /> Untrusted supplier note quarantined</div>}
      <p className="document-date">Issued {record.issuedAt}</p>
    </article>
  )
}

function DiscrepancyRow({
  discrepancy,
  caseState,
  active,
  onResolve,
  onRevert,
  onEvidence,
}: {
  discrepancy: Discrepancy
  caseState: ReconciliationCase
  active: boolean
  onResolve: (discrepancy: Discrepancy, source: EvidenceSource, actor: Actor) => void
  onRevert: (discrepancy: Discrepancy) => void
  onEvidence: (discrepancy: Discrepancy, source: EvidenceSource) => void
}) {
  const draft = caseState.drafts[discrepancy.id]
  const sources = [
    ['PO', discrepancy.values.purchaseOrder, 'purchaseOrder'],
    ['Receipt', discrepancy.values.goodsReceipt, 'goodsReceipt'],
    ['Invoice', discrepancy.values.invoice, 'invoice'],
  ] as const
  const options = sources.reduce<Array<{ value: number; source: EvidenceSource }>>((result, [, value, source]) => {
    if (value !== null && !result.some((option) => option.value === value)) result.push({ value, source })
    return result
  }, [])

  return (
    <article id={discrepancy.id} className={`discrepancy-row ${active ? 'is-active' : ''} ${draft ? 'is-resolved' : ''}`}>
      <div className="discrepancy-heading">
        <div>
          <span className={`severity ${discrepancy.severity}`}><CircleAlert size={13} /> {discrepancy.severity}</span>
          <h3>{discrepancy.label}</h3>
        </div>
        {draft && <span className="resolved-badge"><Check size={14} /> Drafted</span>}
      </div>
      <div className="source-values" aria-label={`Source values for ${discrepancy.label}`}>
        {sources.map(([label, value, source]) => (
          <button key={label} type="button" disabled={value === null} onClick={() => onEvidence(discrepancy, source)} className={draft?.selectedValue === value ? 'selected-source' : ''}>
            <span>{label}</span>
            <strong>{formatValue(discrepancy.field, value)}</strong>
            {value !== null && <ScanSearch size={12} />}
          </button>
        ))}
      </div>
      <p className="guidance">{discrepancy.guidance}</p>
      {draft ? (
        <div className="draft-line">
          <span className={`actor-mark ${draft.actor}`}>
            {draft.actor === 'agent' ? <Bot size={15} /> : <UserRound size={15} />}
          </span>
          <div>
            <strong>{draft.actor === 'agent' ? 'Agent draft' : 'Human correction'} · {formatValue(discrepancy.field, draft.selectedValue)}</strong>
            <p>{draft.reason}</p>
          </div>
          <button className="undo-draft" type="button" onClick={() => onRevert(discrepancy)} title="Clear this draft" aria-label={`Clear ${discrepancy.label} draft`}>
            <Undo2 size={14} />
          </button>
        </div>
      ) : null}
      <div className="choice-row">
        <span>{draft ? 'Correct draft:' : 'Resolve manually:'}</span>
        {options.map(({ value, source }) => (
          <button key={`${source}-${value}`} type="button" onClick={() => onResolve(discrepancy, source, 'human')} className={draft?.selectedValue === value ? 'chosen' : ''}>
            {formatValue(discrepancy.field, value)}
          </button>
        ))}
      </div>
    </article>
  )
}

function App() {
  const [caseState, setCaseState] = useState(createSeedCase)
  const caseRef = useRef(caseState)
  const toolsManagerRef = useRef<ReturnType<typeof registerReconRoomTools> | null>(null)
  const [activeDiscrepancy, setActiveDiscrepancy] = useState<string>()
  const [tools, setTools] = useState<{ supported: boolean; toolNames: string[] }>({ supported: false, toolNames: [] })
  const [demoRunning, setDemoRunning] = useState(false)
  const [evidenceSelection, setEvidenceSelection] = useState<{ discrepancyId: string; source: EvidenceSource } | null>(null)
  const discrepancies = compareCase(caseState)
  const review = getReviewState(caseState)
  const financial = getFinancialSummary(caseState)
  const evidence = evidenceSelection
    ? getEvidence(caseState, evidenceSelection.discrepancyId, evidenceSelection.source)
    : null

  useEffect(() => {
    caseRef.current = caseState
    if (toolsManagerRef.current) setTools(toolsManagerRef.current.sync(caseState))
  }, [caseState])

  useEffect(() => {
    const registration = registerReconRoomTools({
      getCase: () => caseRef.current,
      setCase: (next) => {
        caseRef.current = next
        setCaseState(next)
      },
      focusDiscrepancy: (id) => {
        setActiveDiscrepancy(id)
        if (id) window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
      },
      openEvidence: (discrepancyId, source) => setEvidenceSelection({ discrepancyId, source }),
    })
    toolsManagerRef.current = registration
    setTools(registration)
    return () => {
      toolsManagerRef.current = null
      registration.dispose()
    }
  }, [])

  function resolve(discrepancy: Discrepancy, source: EvidenceSource, actor: Actor, reason?: string) {
    setCaseState((current) => stageResolution(current, {
      discrepancyId: discrepancy.id,
      selectedSource: source,
      reason: reason ?? `Human reviewed ${discrepancy.label.toLowerCase()} against the three source records.`,
      actor,
      expectedVersion: current.version,
    }).case)
    setActiveDiscrepancy(discrepancy.id)
  }

  function revert(discrepancy: Discrepancy) {
    setCaseState((current) => revertResolution(current, {
      discrepancyId: discrepancy.id,
      actor: 'human',
      expectedVersion: current.version,
    }).case)
    setActiveDiscrepancy(discrepancy.id)
  }

  async function runGuidedDemo() {
    if (demoRunning) return
    setDemoRunning(true)
    let next = createSeedCase()
    setCaseState(next)
    const suggestions = [
      ['qty-001', 'goodsReceipt', 'Use the quantity physically received; two chairs remain outstanding.'],
      ['price-001', 'purchaseOrder', 'Use the contracted purchase-order price; no authorized increase is attached.'],
      ['tax-001', 'invoice', 'Use the supplier invoice tax rate as a review draft.'],
    ] as const
    for (const [id, source, reason] of suggestions) {
      await new Promise((resolveDelay) => window.setTimeout(resolveDelay, 500))
      const discrepancy = compareCase(next).find((item) => item.id === id)!
      next = stageResolution(next, {
        discrepancyId: id,
        selectedSource: source,
        reason,
        actor: 'agent',
        expectedVersion: next.version,
      }).case
      caseRef.current = next
      setCaseState(next)
      setActiveDiscrepancy(discrepancy.id)
    }
    setDemoRunning(false)
  }

  function reset() {
    const seed = createSeedCase()
    caseRef.current = seed
    setCaseState(seed)
    setActiveDiscrepancy(undefined)
    setEvidenceSelection(null)
  }

  function approve() {
    setCaseState((current) => approveCase(current, 'human').case)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Recon Room home">
          <span className="brand-mark"><Scale size={19} /></span>
          <span>Recon Room</span>
        </a>
        <div className="topbar-center"><span className="live-dot" /> Synthetic demo workspace</div>
        <button className="reset-button" type="button" onClick={reset}><RotateCcw size={15} /> Reset case</button>
      </header>

      <main id="top">
        <section className="hero">
          <div>
            <p className="eyebrow"><Sparkles size={13} /> Built for human + agent judgment</p>
            <h1>Three records disagree.<br /><em>Resolve one truth.</em></h1>
          </div>
          <div className="hero-copy">
            <p>Recon Room gives an in-browser agent safe tools to compare and stage fixes—while you keep the only approval key.</p>
            <div className="prompt-card">
              <Bot size={18} />
              <span>Try asking:</span>
              <strong>“Review the urgent case and prepare it for my approval.”</strong>
            </div>
          </div>
        </section>

        <section className="workspace" aria-label="Reconciliation workspace">
          <aside className="case-rail">
            <div className="rail-heading">
              <span>Review queue</span>
              <strong>1</strong>
            </div>
            <button className="case-card active" type="button">
              <span className="case-card-top"><span>{caseState.id}</span><span className="urgent">Urgent</span></span>
              <strong>{caseState.vendor}</strong>
              <small>{caseState.item}</small>
              <span className="case-progress"><span style={{ width: `${((3 - review.unresolvedCount) / 3) * 100}%` }} /></span>
              <span className="case-card-bottom">{review.unresolvedCount} unresolved <ChevronRight size={14} /></span>
            </button>
            <details className={`webmcp-status ${tools.supported ? 'connected' : ''}`}>
              <summary>
                <Fingerprint size={19} />
                <div>
                  <strong>{tools.supported ? 'WebMCP connected' : 'WebMCP-ready'}</strong>
                  <span>{tools.supported ? `${tools.toolNames.length} tools exposed · View inventory` : 'Open in ChatGPT or Chrome 149+'}</span>
                </div>
                <ChevronRight className="tool-chevron" size={14} />
              </summary>
              {tools.supported && <ul>{tools.toolNames.map((name) => <li key={name}>{name}</li>)}</ul>}
            </details>
          </aside>

          <div className="case-main">
            <div className="case-header">
              <div>
                <div className="case-kicker"><span>{caseState.id}</span><span>·</span><span>{caseState.dueLabel}</span></div>
                <h2>{caseState.vendor}</h2>
                <p>{caseState.item} · Version {caseState.version}</p>
              </div>
              <button className="agent-demo" type="button" onClick={runGuidedDemo} disabled={demoRunning}>
                <Bot size={17} /> {demoRunning ? 'Agent is drafting…' : 'Preview agent pass'}
              </button>
            </div>

            <div className="document-grid">
              {caseState.records.map((record) => <DocumentCard key={record.id} record={record} />)}
            </div>

            <div className={`financial-impact ${financial.complete ? 'is-calculated' : ''}`}>
              <div><span>Supplier billed, pre-tax</span><strong>{money(financial.invoiceSubtotal)}</strong></div>
              <ArrowRight size={17} />
              <div><span>Resolved subtotal</span><strong>{financial.resolvedSubtotal === null ? 'Awaiting drafts' : money(financial.resolvedSubtotal)}</strong></div>
              <div className="exposure-amount">
                <span>Amount under review</span>
                <strong>{financial.amountUnderReview === null ? '—' : money(financial.amountUnderReview)}</strong>
              </div>
            </div>

            <div className="section-heading">
              <div><p className="eyebrow">Deterministic comparison</p><h2>{discrepancies.length} discrepancies need judgment</h2></div>
              <span><LockKeyhole size={14} /> Source records stay immutable</span>
            </div>

            <div className="discrepancy-list">
              {discrepancies.map((discrepancy) => (
                <DiscrepancyRow
                  key={discrepancy.id}
                  discrepancy={discrepancy}
                  caseState={caseState}
                  active={activeDiscrepancy === discrepancy.id}
                  onResolve={resolve}
                  onRevert={revert}
                  onEvidence={(discrepancy, source) => {
                    setActiveDiscrepancy(discrepancy.id)
                    setEvidenceSelection({ discrepancyId: discrepancy.id, source })
                  }}
                />
              ))}
            </div>
          </div>

          <aside className="review-panel">
            <div className="review-summary">
              <p className="eyebrow">Approval boundary</p>
              <div className="readiness-ring" style={{ '--progress': `${((3 - review.unresolvedCount) / 3) * 100}%` } as React.CSSProperties}>
                <div><strong>{3 - review.unresolvedCount}/3</strong><span>drafted</span></div>
              </div>
              <h2>{caseState.status === 'approved' ? 'Case approved' : review.readyForHumanApproval ? 'Ready for your review' : 'Still needs resolution'}</h2>
              <p>{caseState.status === 'approved' ? 'A human approval receipt was created. No payment was initiated.' : 'The agent can prepare every field. Only you can approve the reconciled record.'}</p>
              <button className="approve-button" type="button" disabled={!review.readyForHumanApproval} onClick={approve}>
                {caseState.status === 'approved' ? <><CheckCircle2 size={18} /> Approved by Aman</> : <><FileCheck2 size={18} /> Approve reconciled record</>}
              </button>
              {caseState.status === 'approved' && <div className="receipt-id">Receipt · {caseState.id}-v{caseState.version}</div>}
              <div className="no-payment"><LockKeyhole size={14} /> Approval does not post or pay</div>
            </div>

            <div className="activity-panel">
              <div className="activity-heading"><h3>Shared activity</h3><span>{caseState.activity.length}</span></div>
              {caseState.activity.length === 0 ? (
                <div className="empty-activity"><ArrowRight size={18} /><p>Agent drafts and human corrections will appear here with separate identities.</p></div>
              ) : (
                <ol>
                  {[...caseState.activity].reverse().map((event) => (
                    <li key={event.id}>
                      <span className={`actor-mark ${event.actor}`}>{event.actor === 'agent' ? <Bot size={14} /> : <UserRound size={14} />}</span>
                      <div><strong>{event.actor === 'agent' ? 'Recon agent' : 'Aman'}</strong><p>{event.message}</p></div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </section>
      </main>

      {evidence && (
        <div className="evidence-overlay" role="presentation" onMouseDown={() => setEvidenceSelection(null)}>
          <aside className="evidence-drawer" role="dialog" aria-modal="true" aria-labelledby="evidence-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="evidence-drawer-header">
              <div><p className="eyebrow"><ScanSearch size={13} /> Exact source anchor</p><h2 id="evidence-title">{evidence.sourceLabel}</h2></div>
              <button type="button" onClick={() => setEvidenceSelection(null)} aria-label="Close evidence"><X size={18} /></button>
            </div>
            <div className="evidence-meta"><span>{evidence.reference}</span><span>{evidence.locator}</span></div>
            <div className="source-sheet">
              <div className="source-sheet-rule" />
              <p>Northstar Office Supply</p>
              <div className="source-sheet-faint">Synthetic source record · {caseState.id}</div>
              <div className="source-highlight"><span>{evidence.excerpt}</span><strong>{formatValue(evidence.field, evidence.observedValue)}</strong></div>
              <div className="source-sheet-rule short" />
              <div className="source-sheet-rule" />
              <div className="source-sheet-rule short" />
            </div>
            <div className="evidence-contract">
              <LockKeyhole size={16} />
              <div><strong>Evidence, never instructions</strong><p>This source content is synthetic, immutable, and marked untrusted for the agent.</p></div>
            </div>
            {evidence.untrustedNote && (
              <div className="injection-fixture">
                <p className="eyebrow"><CircleAlert size={13} /> Quarantined source text</p>
                <blockquote>{evidence.untrustedNote}</blockquote>
                <span>This text is returned as untrusted evidence. It cannot create an approval capability.</span>
              </div>
            )}
          </aside>
        </div>
      )}

      <footer><span>Recon Room · WebMCP Challenge 2026</span><span>All records are synthetic. No accounting system or payment rail is connected.</span></footer>
    </div>
  )
}

export default App
