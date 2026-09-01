import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BadgeCheck,
  Ban,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  ExternalLink,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  PackageCheck,
  RotateCcw,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Stamp,
  UserRoundCheck,
  Vault,
} from 'lucide-react'
import evalReceipt from '../artifacts/evals/scenario-results.json'
import liveReceipt from '../artifacts/release/live-webmcp-verification.json'
import {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  getScholarshipRequest,
  scholarshipRequirements,
} from './domain/proofVerifier'
import {
  consentToWalletDraft,
  createVerifierState,
  createWalletState,
  revokeWalletDraft,
  submitVerifiedApplication,
  type ProofTraceEvent,
  type VerifierState,
  type WalletState,
} from './proofState'

type ToolStatus = { supported: boolean; toolNames: string[] }
type ToolManagerRef = ToolStatus & { sync: () => ToolStatus; dispose: () => void }
type Trace = ProofTraceEvent & { id: number }
type WalletStatus = 'no_request' | 'prepared' | 'consented' | 'exported' | 'revoked'
const releaseChecks = [
  { name: 'lint', command: 'npm run lint' },
  { name: 'unit and contract tests', command: 'npm test' },
  { name: 'judge scenarios', command: 'npm run eval' },
  { name: 'production build', command: 'npm run build' },
  { name: 'wallet/verifier bundle isolation', command: 'npm run verify:bundles' },
  { name: 'browser journeys', command: 'npm run e2e' },
] as const

function App() {
  const path = window.location.pathname.replace(/\/+$/u, '') || '/'
  if (path === '/wallet') return <WalletPage />
  if (path === '/fellowship') return <FellowshipPage />
  if (path === '/evidence') return <EvidencePage />
  return <LandingPage />
}

function Brand({ context }: { context?: string }) {
  return (
    <a className="brand" href="/">
      <span className="brand-stamp"><Send size={17} /></span>
      <span><strong>Proof Courier</strong>{context && <small>{context}</small>}</span>
    </a>
  )
}

function LandingPage() {
  return (
    <div className="site-shell landing-shell">
      <header className="site-header">
        <Brand context="WebMCP consent relay" />
        <div className="landing-header-actions"><a href="/evidence">Evidence room</a><span className="prototype-note">Synthetic challenge prototype</span></div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="eyebrow"><Sparkles size={14} /> A private-data handoff for browser agents</p>
            <h1>The agent carries proof.<br /><em>Not your private records.</em></h1>
            <p className="hero-lede">A fellowship website asks for eligibility. A separate wallet releases five minimum claims only after the person approves the audience, purpose, and expiry.</p>
            <div className="hero-actions">
              <a className="primary-action" href="/fellowship" target="_blank">Open verifier <ExternalLink size={15} /></a>
              <a className="secondary-action" href="/wallet" target="_blank">Open private wallet <ExternalLink size={15} /></a>
            </div>
            <a className="release-proof-link" href="/evidence"><BadgeCheck size={17} /><span><strong>Release proof passed</strong><small>Native WebMCP · 15/15 attacks · 3/3 browser journeys</small></span><ChevronRight size={15} /></a>
          </div>

          <div className="proof-route" aria-label="Private wallet to agent to verifier flow">
            <article className="route-node private-node">
              <span className="node-icon"><Vault size={20} /></span>
              <p>Private side</p>
              <h2>Credential wallet</h2>
              <ul><li>Birth date stays</li><li>Exact GPA stays</li><li>Address stays</li></ul>
            </article>
            <div className="route-courier">
              <div className="route-line" />
              <span><Send size={19} /></span>
              <strong>5 claims</strong>
              <small>purpose-bound</small>
            </div>
            <article className="route-node verifier-node">
              <span className="node-icon"><BadgeCheck size={20} /></span>
              <p>Requesting side</p>
              <h2>Fellowship verifier</h2>
              <ul><li>Issuer checked</li><li>Audience checked</li><li>Replay blocked</li></ul>
            </article>
          </div>
        </section>

        <section className="thesis-strip" aria-label="Proof Courier principles">
          <div><strong>2 tabs</strong><span>independent page tools</span></div>
          <div><strong>5 claims</strong><span>minimum disclosure</span></div>
          <div><strong>0 records</strong><span>copied into chat</span></div>
          <div><strong>Human</strong><span>consent and submission</span></div>
        </section>

        <section className="journey-section">
          <div><p className="section-kicker">Judge prompt</p><h2>One goal. Two sites. One visible consent boundary.</h2></div>
          <div className="prompt-ticket"><span>Ask ChatGPT</span><p>“Check the fellowship requirements, obtain only the minimum eligibility proof from my wallet, and prepare the application. Stop for my consent and final submission.”</p></div>
          <ol className="journey-steps">
            <li><span>01</span><strong>Read requirements</strong><p>The verifier publishes five allowed claims and prohibits raw source records.</p></li>
            <li><span>02</span><strong>Prepare disclosure</strong><p>The wallet shows the exact audience, purpose, expiry, and derived claims.</p></li>
            <li><span>03</span><strong>Person consents</strong><p>Only the human control makes the one-time export tool appear.</p></li>
            <li><span>04</span><strong>Agent carries proof</strong><p>The verifier checks issuer commitment, holder binding, expiry, and replay.</p></li>
            <li><span>05</span><strong>Person submits</strong><p>No site tool can consent or send the final application.</p></li>
          </ol>
        </section>
      </main>

      <footer><span>Proof Courier · WebMCP Challenge 2026</span><span>No real identity, university, or application system is connected.</span></footer>
    </div>
  )
}

function WalletPage() {
  const [wallet, setWallet] = useState<WalletState>(createWalletState)
  const walletRef = useRef(wallet)
  const managerRef = useRef<ToolManagerRef | null>(null)
  const traceId = useRef(0)
  const [tools, setTools] = useState<ToolStatus>({ supported: false, toolNames: [] })
  const [traces, setTraces] = useState<Trace[]>([])

  const addTrace = useCallback((event: ProofTraceEvent) => {
    traceId.current += 1
    setTraces((items) => [...items, { ...event, id: traceId.current }].slice(-8))
  }, [])

  useEffect(() => {
    let cancelled = false
    let manager: ToolManagerRef | null = null
    void import('./walletWebmcp').then(({ registerWalletTools }) => {
      manager = registerWalletTools({
        getState: () => walletRef.current,
        setState: (next) => { walletRef.current = next; setWallet(next) },
        focusConsent: () => window.setTimeout(() => document.getElementById('consent-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80),
        recordTrace: addTrace,
      })
      if (cancelled) return manager.dispose()
      managerRef.current = manager
      setTools(manager)
    })
    return () => { cancelled = true; managerRef.current = null; manager?.dispose() }
  }, [addTrace])

  useEffect(() => {
    walletRef.current = wallet
    if (managerRef.current) setTools(managerRef.current.sync())
  }, [wallet])

  function approve() {
    const next = consentToWalletDraft(walletRef.current)
    walletRef.current = next
    setWallet(next)
    addTrace({ toolName: 'human_consent', status: 'succeeded', summary: 'Person approved five claims for one audience and purpose.', createdAt: new Date().toISOString() })
  }

  function revoke() {
    const next = revokeWalletDraft(walletRef.current)
    walletRef.current = next
    setWallet(next)
    addTrace({ toolName: 'human_revoke', status: 'succeeded', summary: 'Person revoked the disclosure before export.', createdAt: new Date().toISOString() })
  }

  function reset() {
    const next = createWalletState()
    walletRef.current = next
    setWallet(next)
    setTraces([])
  }

  const status: WalletStatus = wallet.draft?.status ?? 'no_request'

  return (
    <div className="site-shell app-page wallet-page">
      <header className="site-header app-header">
        <Brand context="Private credential wallet" />
        <ToolInventory tools={tools} />
        <button className="reset-link" onClick={reset}><RotateCcw size={14} /> Reset</button>
      </header>

      <main className="workspace">
        <section className="workspace-title">
          <div><p className="eyebrow"><LockKeyhole size={14} /> Local private side</p><h1>Your credential wallet</h1><p>ChatGPT can ask for derived eligibility claims. It cannot export them until you approve the exact disclosure here.</p></div>
          <div className="wallet-seal"><ShieldCheck size={24} /><strong>Issuer committed</strong><span>Openbridge University Demo Registry</span></div>
        </section>

        <div className="wallet-layout">
          <section className="private-record panel">
            <div className="panel-heading"><div><span>Private source record</span><h2>Values that do not cross</h2></div><LockKeyhole size={20} /></div>
            <div className="masked-fields">
              <MaskedField label="Date of birth" value="••••-••-18" />
              <MaskedField label="Student ID" value="••••••••••" />
              <MaskedField label="Exact GPA" value="•.••" />
              <MaskedField label="Transcript" value="32 courses sealed" />
              <MaskedField label="Home address" value="••••••••••••" />
            </div>
            <div className="privacy-rule"><Ban size={16} /><p>These private fields are not accepted by any wallet tool and are absent from exported proof bundles.</p></div>
          </section>

          <section id="consent-card" className={`consent-panel panel state-${status}`}>
            <div className="panel-heading"><div><span>Disclosure request</span><h2>{consentHeading(status)}</h2></div><span className="state-dot"><CircleDot size={18} /></span></div>
            {!wallet.draft ? (
              <div className="empty-request"><Route size={34} /><strong>No request yet</strong><p>Ask ChatGPT to read the fellowship requirements in the other tab and prepare only the minimum disclosure.</p></div>
            ) : (
              <>
                <dl className="request-meta">
                  <div><dt>Audience</dt><dd>{wallet.draft.request.audience}</dd></div>
                  <div><dt>Purpose</dt><dd>{wallet.draft.request.purpose}</dd></div>
                  <div><dt>Expires</dt><dd>{new Date(wallet.draft.request.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</dd></div>
                </dl>
                <div className="claim-stack">{scholarshipRequirements.map((claim) => <ClaimRow key={claim.id} label={claim.label} privateAlternative={claim.privateAlternative} />)}</div>
                {status === 'prepared' && <div className="consent-actions"><button className="approve-consent" onClick={approve}><UserRoundCheck size={17} /> Approve this disclosure</button><button className="reject-consent" onClick={revoke}>Reject</button></div>}
                {status === 'consented' && <div className="consent-result ready"><KeyRound size={19} /><div><strong>One-time export unlocked</strong><p>ChatGPT can now call <code>wallet_export_proof</code>. This granted no broader access.</p></div></div>}
                {status === 'exported' && <div className="consent-result exported"><PackageCheck size={19} /><div><strong>Minimum proof exported once</strong><p>The export tool has been withdrawn. Five claims crossed; zero private records crossed.</p></div></div>}
                {status === 'revoked' && <div className="consent-result revoked"><Ban size={19} /><div><strong>Disclosure revoked</strong><p>No proof was exported. Ask ChatGPT to prepare a fresh request if needed.</p></div></div>}
              </>
            )}
            <CapabilityGate status={status} />
          </section>

          <aside className="agent-rail panel">
            <div className="panel-heading"><div><span>Browser agent</span><h2>Authority now</h2></div><Fingerprint size={19} /></div>
            <ul className="tool-list">{tools.toolNames.map((name) => <li key={name}><Check size={13} />{name}</li>)}</ul>
            <TraceList traces={traces} empty="Tool calls and human consent will appear here." />
          </aside>
        </div>
      </main>
      <footer><a href="/fellowship" target="_blank">Open fellowship verifier <ExternalLink size={13} /></a><span>Synthetic wallet · private values are illustrative</span></footer>
    </div>
  )
}

function FellowshipPage() {
  const [verifier, setVerifier] = useState<VerifierState>(createVerifierState)
  const verifierRef = useRef(verifier)
  const managerRef = useRef<ToolManagerRef | null>(null)
  const traceId = useRef(0)
  const [tools, setTools] = useState<ToolStatus>({ supported: false, toolNames: [] })
  const [traces, setTraces] = useState<Trace[]>([])

  const addTrace = useCallback((event: ProofTraceEvent) => {
    traceId.current += 1
    setTraces((items) => [...items, { ...event, id: traceId.current }].slice(-8))
  }, [])

  useEffect(() => {
    let cancelled = false
    let manager: ToolManagerRef | null = null
    void import('./verifierWebmcp').then(({ registerVerifierTools }) => {
      manager = registerVerifierTools({
        getState: () => verifierRef.current,
        setState: (next) => { verifierRef.current = next; setVerifier(next) },
        focusResult: () => window.setTimeout(() => document.getElementById('verification-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80),
        recordTrace: addTrace,
      })
      if (cancelled) return manager.dispose()
      managerRef.current = manager
      setTools(manager)
    })
    return () => { cancelled = true; managerRef.current = null; manager?.dispose() }
  }, [addTrace])

  useEffect(() => {
    verifierRef.current = verifier
    if (managerRef.current) setTools(managerRef.current.sync())
  }, [verifier])

  function submit() {
    const next = submitVerifiedApplication(verifierRef.current)
    verifierRef.current = next
    setVerifier(next)
    addTrace({ toolName: 'human_submission', status: 'succeeded', summary: 'Person submitted the synthetic application after verification.', createdAt: new Date().toISOString() })
  }

  function reset() {
    const next = createVerifierState()
    verifierRef.current = next
    setVerifier(next)
    setTraces([])
  }

  const request = getScholarshipRequest()

  return (
    <div className="site-shell app-page fellowship-page">
      <header className="site-header app-header">
        <Brand context="Open Web Fellowship" />
        <ToolInventory tools={tools} />
        <button className="reset-link" onClick={reset}><RotateCcw size={14} /> Reset</button>
      </header>

      <main className="workspace">
        <section className="workspace-title fellowship-title">
          <div><p className="eyebrow"><Stamp size={14} /> Requesting side</p><h1>Prove eligibility without sending the file.</h1><p>This verifier accepts five derived claims. Full transcripts, exact grades, birth dates, IDs, and addresses are prohibited.</p></div>
          <div className="deadline-card"><span>Application</span><strong>OWF · 2026</strong><small>Human submission required</small></div>
        </section>

        <div className="verifier-layout">
          <section className="requirements-panel panel">
            <div className="panel-heading"><div><span>Published contract</span><h2>Minimum requirements</h2></div><ClipboardCheck size={20} /></div>
            <div className="requirements-list">{scholarshipRequirements.map((requirement) => <article key={requirement.id}><span><Check size={14} /></span><div><strong>{requirement.label}</strong><p>Accept <code>{requirement.id}</code>, not {requirement.privateAlternative.toLowerCase()}.</p></div></article>)}</div>
            <dl className="contract-meta">
              <div><dt>Audience</dt><dd>{SCHOLARSHIP_AUDIENCE}</dd></div>
              <div><dt>Purpose</dt><dd>{SCHOLARSHIP_PURPOSE}</dd></div>
              <div><dt>Nonce</dt><dd>{request.nonce}</dd></div>
            </dl>
          </section>

          <section id="verification-result" className={`verification-panel panel verifier-${verifier.status}`}>
            <div className="panel-heading"><div><span>Proof checkpoint</span><h2>{verifierHeading(verifier.status)}</h2></div><ShieldCheck size={20} /></div>
            <div className="human-boundary"><UserRoundCheck size={18} /><div><span>Permanent human boundary</span><strong>No consent or submission tool exists</strong></div><small>{verifier.status === 'verified' ? 'Human button unlocked' : 'Submission stays locked'}</small></div>
            {verifier.status === 'awaiting_proof' && <div className="empty-request"><Send size={34} /><strong>Waiting for the courier</strong><p>Ask ChatGPT to obtain a consented proof from the wallet tab and bring it here for verification.</p></div>}
            {verifier.status === 'rejected' && <div className="verification-error"><Ban size={21} /><div><strong>{verifier.result?.code}</strong><p>{verifier.result?.summary}</p></div></div>}
            {(verifier.status === 'verified' || verifier.status === 'submitted') && (
              <>
                <div className="verified-seal"><BadgeCheck size={31} /><div><strong>Issuer and holder proof verified</strong><p>Five required claims arrived. Zero private records arrived.</p></div></div>
                <div className="verification-grid">{scholarshipRequirements.map((item) => <span key={item.id}><Check size={13} />{item.label}</span>)}</div>
                <div className="zero-records"><LockKeyhole size={17} /><strong>Not received:</strong><span>birth date · student ID · exact GPA · transcript · address</span></div>
                {verifier.status === 'verified' && <button className="submit-application" onClick={submit}><UserRoundCheck size={17} /> Submit verified application</button>}
                {verifier.status === 'submitted' && <div className="submission-receipt"><PackageCheck size={20} /><div><strong>Application submitted by the person</strong><p>Receipt version {verifier.version}. No submission tool exists.</p></div></div>}
              </>
            )}
          </section>

          <aside className="agent-rail panel">
            <div className="panel-heading"><div><span>Browser agent</span><h2>Authority now</h2></div><Fingerprint size={19} /></div>
            <ul className="tool-list">{tools.toolNames.map((name) => <li key={name}><Check size={13} />{name}</li>)}</ul>
            <TraceList traces={traces} empty="Requirement reads, proof checks, and blocked calls will appear here." />
          </aside>
        </div>
      </main>
      <footer><a href="/wallet" target="_blank">Open private wallet <ExternalLink size={13} /></a><span>All people, credentials, and applications are synthetic.</span></footer>
    </div>
  )
}

function EvidencePage() {
  const livePassed = liveReceipt.export.status === 'passed' && liveReceipt.verification.status === 'passed'
  const releasePassed = livePassed && evalReceipt.success

  return (
    <div className="site-shell evidence-page">
      <header className="site-header">
        <Brand context="Judge evidence room" />
        <a className="evidence-open-demo" href="/fellowship" target="_blank">Open live flow <ExternalLink size={14} /></a>
      </header>

      <main className="evidence-main">
        <section className="evidence-hero">
          <div>
            <p className="eyebrow"><ShieldCheck size={14} /> Inspectable release evidence</p>
            <h1>Trust should be visible,<br /><em>not promised.</em></h1>
            <p>These receipts connect the product claim to native WebMCP behavior, adversarial tests, browser journeys, and the exact limits of what was verified.</p>
          </div>
          <div className={`release-seal ${livePassed && releasePassed ? 'passed' : ''}`}>
            <BadgeCheck size={34} />
            <span>Release gate</span>
            <strong>{releasePassed ? 'PASSED' : 'REVIEW'}</strong>
            <small>Captured {new Date(liveReceipt.capturedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</small>
          </div>
        </section>

        <section className="evidence-metrics" aria-label="Release evidence summary">
          <article><strong>{evalReceipt.passed}/{evalReceipt.total}</strong><span>adversarial scenarios</span><small>Audience, purpose, expiry, replay, tampering, authority</small></article>
          <article><strong>4/4</strong><span>browser journeys</span><small>Cross-tab flow, recovery, evidence, 390px viewport</small></article>
          <article><strong>5 → 0</strong><span>claims to private fields</span><small>Only derived eligibility crosses the boundary</small></article>
          <article><strong>0 → 1 → 0</strong><span>export capability</span><small>Absent, human-unlocked, then withdrawn</small></article>
        </section>

        <section className="evidence-section lifecycle-evidence">
          <div className="evidence-section-heading"><div><p className="section-kicker">Native WebMCP proof</p><h2>A capability that lives for exactly one call.</h2></div><p>Captured across two separate live tabs in the OpenAI Codex in-app browser. The page adds and removes the actual WebMCP tool as authority changes.</p></div>
          <div className="capability-timeline">
            <article><span>01 · Before consent</span><strong>ABSENT</strong><code>wallet_export_proof</code><p>The agent can prepare a disclosure, but it cannot export one.</p></article>
            <div className="timeline-arrow"><ChevronRight size={20} /><small>human click</small></div>
            <article className="capability-live"><span>02 · Approved</span><strong>LIVE</strong><code>wallet_export_proof</code><p>One purpose-bound export becomes available. No broader wallet access.</p></article>
            <div className="timeline-arrow"><ChevronRight size={20} /><small>one call</small></div>
            <article><span>03 · Exported</span><strong>WITHDRAWN</strong><code>wallet_get_disclosure_receipt</code><p>The export tool disappears and only a safe receipt remains.</p></article>
          </div>
          <div className="live-receipt-line"><BadgeCheck size={18} /><strong>Live receipt confirms:</strong><span>before {String(liveReceipt.export.exportCapabilityPresentBeforeHumanConsent)}</span><span>after consent {String(liveReceipt.export.exportCapabilityPresentAfterHumanConsent)}</span><span>after export {String(liveReceipt.export.exportCapabilityPresentAfterExport)}</span></div>
        </section>

        <section className="evidence-grid">
          <article className="evidence-card verifier-proof-card">
            <p className="section-kicker">Verifier receipt</p>
            <h2>Five claims arrived. Zero records arrived.</h2>
            <ul>
              <li><Check size={15} />Issuer and holder binding verified</li>
              <li><Check size={15} />Audience, purpose, expiry, and nonce verified</li>
              <li><Check size={15} />Private fields disclosed: {liveReceipt.export.privateFieldsDisclosed.length}</li>
              <li><Check size={15} />Private fields received: {liveReceipt.verification.privateFieldsReceived.length}</li>
              <li><Check size={15} />Agent submission capability: absent</li>
            </ul>
            <div className="human-proof"><UserRoundCheck size={18} /><span><strong>The agent prepares.</strong> The person consents and submits.</span></div>
          </article>

          <article className="evidence-card eval-card">
            <p className="section-kicker">Adversarial judge suite</p>
            <h2>{evalReceipt.passed} attacks and boundary checks passed.</h2>
            <div className="eval-list">{evalReceipt.scenarios.map((scenario) => <div key={scenario.id}><span>{scenario.id}</span><p>{scenario.title}</p><BadgeCheck size={15} /></div>)}</div>
          </article>
        </section>

        <section className="evidence-section release-checks">
          <div className="evidence-section-heading"><div><p className="section-kicker">Release gate</p><h2>Every claim has a corresponding check.</h2></div><p>Executed together by <code>npm run verify</code>. The machine-readable release receipt remains outside the app bundle so its artifact hashes are not self-referential. Public evidence is a test receipt, not a security certification.</p></div>
          <div className="release-check-grid">{releaseChecks.map((check) => <article key={check.name}><BadgeCheck size={18} /><div><strong>{check.name}</strong><code>{check.command}</code></div><span>passed</span></article>)}</div>
        </section>

        <section className="evidence-limitations">
          <ShieldCheck size={22} />
          <div><p className="section-kicker">Truthful boundary</p><h2>What this evidence does not claim</h2><ul>{liveReceipt.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className="source-receipt"><span>Verified source</span><code>{liveReceipt.sourceCommit.slice(0, 12)}</code><span>Deployment</span><code>{liveReceipt.deploymentId}</code></div>
        </section>

        <section className="evidence-cta"><div><p className="section-kicker">Run the proof</p><h2>Open both sites and watch authority change.</h2></div><div className="hero-actions"><a className="primary-action" href="/fellowship" target="_blank">Open verifier <ExternalLink size={15} /></a><a className="secondary-action" href="/wallet" target="_blank">Open wallet <ExternalLink size={15} /></a></div></section>
      </main>

      <footer><span>Proof Courier · Evidence room</span><span>Receipts are bundled from the public repository and contain synthetic data only.</span></footer>
    </div>
  )
}

function CapabilityGate({ status }: { status: WalletStatus }) {
  const state = status === 'consented' ? 'live' : status === 'exported' ? 'withdrawn' : status === 'revoked' ? 'revoked' : 'absent'
  const label = state === 'live' ? 'LIVE FOR ONE CALL' : state === 'withdrawn' ? 'WITHDRAWN AFTER USE' : state === 'revoked' ? 'REVOKED' : 'ABSENT UNTIL CONSENT'
  return (
    <div className={`capability-gate capability-${state}`}>
      <div><KeyRound size={16} /><span>Dynamic capability</span><code>wallet_export_proof</code></div>
      <strong>{label}</strong>
    </div>
  )
}

function ToolInventory({ tools }: { tools: ToolStatus }) {
  return (
    <details className={`tool-inventory ${tools.supported ? 'connected' : ''}`}>
      <summary><Fingerprint size={15} /><span>{tools.supported ? 'Site tools connected' : 'Site tools ready'}</span><small>{tools.supported ? `${tools.toolNames.length} tools` : 'Open in ChatGPT'}</small><ChevronRight size={13} /></summary>
      {tools.supported && <div><strong>Available on this page</strong><ul>{tools.toolNames.map((name) => <li key={name}>{name}</li>)}</ul></div>}
    </details>
  )
}

function MaskedField({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong><LockKeyhole size={13} /></div>
}

function ClaimRow({ label, privateAlternative }: { label: string; privateAlternative: string }) {
  return <div><span><Check size={13} /></span><strong>{label}</strong><small>instead of {privateAlternative.toLowerCase()}</small></div>
}

function TraceList({ traces, empty }: { traces: Trace[]; empty: string }) {
  return (
    <div className="trace-block">
      <h3>Live trace <span>{traces.length}</span></h3>
      {traces.length === 0 ? <p className="trace-empty">{empty}</p> : <ol>{[...traces].reverse().map((trace) => <li key={trace.id} className={trace.status}><span>{trace.status}</span><strong>{trace.toolName}</strong><p>{trace.summary}</p></li>)}</ol>}
    </div>
  )
}

function consentHeading(status: WalletStatus) {
  if (status === 'prepared') return 'Review five derived claims'
  if (status === 'consented') return 'Consent granted'
  if (status === 'exported') return 'Proof left the wallet'
  if (status === 'revoked') return 'Request closed'
  return 'Waiting for a request'
}

function verifierHeading(status: VerifierState['status']) {
  if (status === 'verified') return 'Minimum proof verified'
  if (status === 'rejected') return 'Proof rejected safely'
  if (status === 'submitted') return 'Human submission complete'
  return 'No private file required'
}

export default App
