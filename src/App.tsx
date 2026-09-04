import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BadgeCheck,
  Ban,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  PackageCheck,
  RotateCcw,
  Route,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stamp,
  UserRoundCheck,
  Vault,
} from 'lucide-react'
import evalReceipt from '../artifacts/evals/scenario-results.json'
import nekudaAudit from '../artifacts/evals/third-party/nekuda-wallet-audit.json'
import webmcpSmoke from '../artifacts/evals/third-party/webmcp-smoke.json'
import productionCrossOrigin from '../artifacts/release/production-cross-origin.json'
import {
  SCHOLARSHIP_AUDIENCE,
  SCHOLARSHIP_PURPOSE,
  scholarshipRequirements,
} from './domain/proofPolicy'
import { evaluateDisclosureRequest } from './domain/requestFirewall'
import {
  consentToWalletDraft,
  createVerifierState,
  createWalletState,
  expireWalletDraft,
  isWalletDraftExpired,
  revokeWalletDraft,
  submitVerifiedApplication,
  type ProofTraceEvent,
  type VerifierState,
  type WalletState,
} from './proofState'
import { IndexedDbWalletGrantStore } from './wallet/indexedDbWalletGrantStore'
import { InMemoryWalletGrantStore, type WalletGrantStore } from './wallet/walletGrantStore'
import { InMemoryChallengeStore } from './verifier/challengeStore'

type ToolStatus = { supported: boolean; toolNames: string[] }
type ToolManagerRef = ToolStatus & { sync: () => ToolStatus; dispose: () => void }
type Trace = ProofTraceEvent & { id: number }
type WalletStatus = 'no_request' | 'prepared' | 'consented' | 'exporting' | 'exported' | 'revoked' | 'expired' | 'failed_closed'
const releaseChecks = [
  { name: 'lint', command: 'npm run lint' },
  { name: 'unit and contract tests', command: 'npm test' },
  { name: 'judge scenarios', command: 'npm run eval' },
  { name: 'release-copy consistency', command: 'npm run verify:copy' },
  { name: 'production build', command: 'npm run build' },
  { name: 'production chunk content scan', command: 'npm run verify:bundles' },
  { name: 'role artifact isolation', command: 'npm run verify:roles' },
  { name: 'browser checks', command: 'npm run e2e' },
] as const
const nativeEvidence = {
  exportPassed: true,
  verificationPassed: true,
  privateFieldsDisclosed: 0,
  privateFieldsReceived: 0,
  exportBeforeConsent: false,
  exportAfterConsent: true,
  exportAfterUse: false,
  limitations: [
    'This receipt proves native WebMCP behavior in the OpenAI Codex in-app browser.',
    'It does not claim a separate natural-language ChatGPT conversation autonomously chose the tool sequence.',
    'All identities, credentials, institutions, claims, and applications are synthetic.',
    'The linked native receipt predates the IndexedDB wallet wiring; rerun it after deployment before treating reload and cross-tab behavior as production evidence.',
    'Verifier challenge and replay state remain limited to one active in-memory verifier session.',
    'The wallet and verifier use separate origins, but both currently serve the same application artifact rather than role-isolated builds.',
  ],
} as const
const nativeReceiptUrl = 'https://github.com/amanmaqsood/proof-courier/blob/main/artifacts/release/live-webmcp-verification.json'
const workbenchAuditUrl = 'https://github.com/amanmaqsood/proof-courier/blob/main/artifacts/evals/third-party/nekuda-wallet-audit.json'
const webmcpSmokeUrl = 'https://github.com/amanmaqsood/proof-courier/blob/main/artifacts/evals/third-party/webmcp-smoke.json'
const productionCrossOriginUrl = 'https://github.com/amanmaqsood/proof-courier/blob/main/artifacts/release/production-cross-origin.json'
const publicWalletUrl = import.meta.env.PROD ? 'https://proof-courier-wallet.vercel.app/wallet' : '/wallet'
const publicVerifierUrl = import.meta.env.PROD ? 'https://proof-courier-verifier.vercel.app/fellowship' : '/fellowship'
type FirewallScenario = 'safe' | 'overreach' | 'malicious'
const minimumClaimIds = scholarshipRequirements.map((item) => item.id)
const judgePrompt = 'Check the fellowship requirements, obtain only the minimum eligibility proof from my wallet, and prepare the application. Stop for my consent and final submission.'
const firewallScenarios = {
  safe: {
    label: 'Safe minimum',
    items: ['Five derived claims', 'Correct purpose', 'Session challenge', '10-minute proof'],
    request: { audience: SCHOLARSHIP_AUDIENCE, purpose: SCHOLARSHIP_PURPOSE, claimIds: minimumClaimIds, nonce: 'scenario-safe-001', ttlSeconds: 600 },
  },
  overreach: {
    label: 'Asks too much',
    items: ['Exact date of birth', 'Exact GPA', 'Home address', '24-hour reusable proof'],
    request: { audience: SCHOLARSHIP_AUDIENCE, purpose: SCHOLARSHIP_PURPOSE, claimIds: minimumClaimIds, nonce: 'scenario-overreach-001', ttlSeconds: 86_400, requestedPrivateFields: ['date_of_birth', 'exact_gpa', 'home_address'] },
  },
  malicious: {
    label: 'Malicious request',
    items: ['Unknown recipient', 'Credit-scoring purpose', 'Automatic submission', 'Raw private records'],
    request: { audience: 'unknown-verifier', purpose: 'Use this proof for credit scoring.', claimIds: minimumClaimIds, nonce: 'scenario-malicious-001', ttlSeconds: 600, requestedPrivateFields: ['date_of_birth'], requestsAutomaticSubmission: true },
  },
} as const

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

export function LandingPage() {
  const [scenarioKey, setScenarioKey] = useState<FirewallScenario>('overreach')
  const [copyStatus, setCopyStatus] = useState('Copy prompt')
  const scenario = firewallScenarios[scenarioKey]
  const firewall = evaluateDisclosureRequest({ ...scenario.request, claimIds: [...scenario.request.claimIds], requestedPrivateFields: 'requestedPrivateFields' in scenario.request ? [...scenario.request.requestedPrivateFields] : [] })
  const rawFieldCount = 'requestedPrivateFields' in scenario.request ? scenario.request.requestedPrivateFields.length : 0
  const rawFieldsBlocked = firewall.decision === 'allowed' ? 0 : rawFieldCount
  const safePlanClaims = firewall.decision === 'blocked' ? 0 : firewall.proposedRequest?.claimIds.length ?? scenario.request.claimIds.length
  const proposedItems = firewall.proposedRequest
    ? ['Age over 18', 'GPA band', 'Eligible residency', '10-minute, session-scoped proof']
    : []

  async function copyJudgePrompt() {
    try {
      await navigator.clipboard.writeText(judgePrompt)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy unavailable')
    }
  }
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
              <a className="primary-action" href={publicVerifierUrl} target="_blank">Open verifier <ExternalLink size={15} /></a>
              <a className="secondary-action" href={publicWalletUrl} target="_blank">Open private wallet <ExternalLink size={15} /></a>
            </div>
            <a className="release-proof-link" href="/evidence"><BadgeCheck size={17} /><span><strong>Release proof passed</strong><small>Native WebMCP · 22/22 attacks · 10/10 browser checks · 100/100 audit</small></span><ChevronRight size={15} /></a>
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
              <ul><li>Issuer checked</li><li>Audience checked</li><li>Session replay blocked</li></ul>
            </article>
          </div>
        </section>

        <section className="thesis-strip" aria-label="Proof Courier principles">
          <div><strong>2 tabs</strong><span>independent page tools</span></div>
          <div><strong>5 claims</strong><span>minimum disclosure</span></div>
          <div><strong>0 records</strong><span>copied into chat</span></div>
          <div><strong>Human</strong><span>consent and submission</span></div>
        </section>

        <section className="firewall-showcase" aria-labelledby="firewall-title">
          <div className="firewall-heading">
            <div><p className="section-kicker">Request Firewall</p><h2 id="firewall-title">When a site asks for too much, the agent negotiates for less.</h2></div>
            <p>Before a consent card exists, the wallet inspects audience, purpose, fields, lifetime, and submission authority. Unsafe requests release nothing. Fixable requests receive a machine-readable counterproposal.</p>
          </div>
          <div className="scenario-switcher" aria-label="Request Firewall scenarios">
            {(Object.keys(firewallScenarios) as FirewallScenario[]).map((key) => (
              <button key={key} aria-pressed={scenarioKey === key} onClick={() => setScenarioKey(key)}>{firewallScenarios[key].label}</button>
            ))}
          </div>
          <div className="firewall-flow">
            <article className={`overreach-card request-${firewall.decision}`}>
              <div><ShieldAlert size={18} /><span>Incoming request</span><strong>{scenario.label.toUpperCase()}</strong></div>
              <ul>{scenario.items.map((item) => <li key={item}>{item}</li>)}</ul>
              <small>Data released · 0 fields</small>
            </article>
            <div className="firewall-decision"><span data-testid="firewall-decision">{firewall.decision.toUpperCase()}</span><ShieldCheck size={28} /><strong>wallet_evaluate_request</strong><small>read-only · deterministic</small></div>
            <article className={`counterproposal-card result-${firewall.decision}`} aria-live="polite">
              <div><BadgeCheck size={18} /><span>Wallet result</span><strong>{firewall.proposedRequest ? 'SAFE PLAN' : 'STOP'}</strong></div>
              {firewall.proposedRequest
                ? <ul>{proposedItems.map((item) => <li key={item}>{item}</li>)}</ul>
                : <div className="no-counterproposal"><strong>No counterproposal</strong><p>The recipient, purpose, or requested authority is unsafe. Start over with the published verifier policy.</p></div>}
              <small>{firewall.summary}</small>
            </article>
          </div>
          <div className="privacy-meter" aria-label="Privacy result for selected scenario" data-testid="privacy-meter">
            <article><strong>{rawFieldCount}</strong><span>raw fields asked</span></article>
            <article><strong>{rawFieldsBlocked}</strong><span>raw fields blocked</span></article>
            <article><strong>{safePlanClaims}</strong><span>derived claims in safe plan</span></article>
            <article><strong>0</strong><span>raw values released</span></article>
          </div>
          <details className="scenario-trace">
            <summary>Inspect the decision trace <ChevronRight size={14} /></summary>
            <dl>
              <div><dt>Goal</dt><dd>Prove fellowship eligibility without releasing source records.</dd></div>
              <div><dt>Tool</dt><dd><code>wallet_evaluate_request</code></dd></div>
              <div><dt>Safe input</dt><dd>{scenario.request.claimIds.length} claim IDs, {rawFieldCount} raw field names, {scenario.request.ttlSeconds}-second lifetime</dd></div>
              <div><dt>State</dt><dd><code>NO_REQUEST → {firewall.decision === 'allowed' ? 'SAFE_REQUEST' : firewall.decision === 'counterproposal' ? 'COUNTERPROPOSAL_READY' : 'REQUEST_BLOCKED'}</code></dd></div>
              <div><dt>Result</dt><dd>{firewall.summary}</dd></div>
              <div><dt>Recovery</dt><dd>{firewall.decision === 'blocked' ? 'Return to the published verifier policy and start a new request.' : 'Prepare the safe five-claim plan for visible human review.'}</dd></div>
            </dl>
          </details>
          <div className="firewall-contract"><code>overreach → zero export → safe counterproposal → human consent → session-scoped export</code><span>Two sites can negotiate through WebMCP without copying private records into chat.</span></div>
        </section>

        <section className="journey-section">
          <div><p className="section-kicker">Judge prompt</p><h2>One goal. Two sites. One visible consent boundary.</h2></div>
          <div className="prompt-ticket"><div><span>Ask ChatGPT</span><button type="button" data-testid="copy-judge-prompt" onClick={() => void copyJudgePrompt()}><Copy size={14} />{copyStatus}</button></div><p>{judgePrompt}</p><small aria-live="polite">{copyStatus === 'Copied' ? 'Prompt copied to your clipboard.' : ''}</small></div>
          <ol className="journey-steps">
            <li><span>01</span><strong>Read requirements</strong><p>The verifier publishes five allowed claims and prohibits raw source records.</p></li>
            <li><span>02</span><strong>Prepare disclosure</strong><p>The wallet shows the exact audience, purpose, expiry, and derived claims.</p></li>
            <li><span>03</span><strong>Person consents</strong><p>Only the human control makes the session-scoped export tool appear.</p></li>
            <li><span>04</span><strong>Agent carries proof</strong><p>The verifier checks issuer commitment, holder binding, expiry, and same-session reuse.</p></li>
            <li><span>05</span><strong>Person submits</strong><p>No site tool can consent or send the final application.</p></li>
          </ol>
        </section>
      </main>

      <footer><span>Proof Courier · WebMCP Challenge 2026</span><span>No real identity, university, or application system is connected.</span></footer>
    </div>
  )
}

export function WalletPage() {
  const [wallet, setWallet] = useState<WalletState>(createWalletState)
  const walletRef = useRef(wallet)
  const grantStoreRef = useRef<WalletGrantStore | null>(null)
  const managerRef = useRef<ToolManagerRef | null>(null)
  const traceId = useRef(0)
  const [tools, setTools] = useState<ToolStatus>({ supported: false, toolNames: [] })
  const [traces, setTraces] = useState<Trace[]>([])
  const [grantStoreReady, setGrantStoreReady] = useState(false)
  const [grantStorageMode, setGrantStorageMode] = useState<'loading' | 'durable' | 'session'>('loading')

  const addTrace = useCallback((event: ProofTraceEvent) => {
    traceId.current += 1
    setTraces((items) => [...items, { ...event, id: traceId.current }].slice(-8))
  }, [])

  const showWalletState = useCallback((next: WalletState) => {
    walletRef.current = next
    setWallet(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined
    let store: WalletGrantStore
    let storageMode: 'durable' | 'session'
    try {
      store = new IndexedDbWalletGrantStore()
      storageMode = 'durable'
    } catch {
      store = new InMemoryWalletGrantStore(walletRef.current)
      storageMode = 'session'
    }
    grantStoreRef.current = store

    const readCurrent = async () => {
      const next = await store.read()
      if (!cancelled) showWalletState(next)
    }

    void (async () => {
      try {
        await readCurrent()
      } catch {
        store.close()
        store = new InMemoryWalletGrantStore(walletRef.current)
        storageMode = 'session'
        grantStoreRef.current = store
        await readCurrent()
        if (!cancelled) {
          addTrace({ toolName: 'wallet_storage', status: 'blocked', summary: 'Durable browser storage was unavailable. Authority remains limited to this session.', createdAt: new Date().toISOString() })
        }
      }
      if (cancelled) return
      unsubscribe = store.subscribe(() => { void readCurrent() })
      setGrantStorageMode(storageMode)
      setGrantStoreReady(true)
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
      store.close()
      if (grantStoreRef.current === store) grantStoreRef.current = null
    }
  }, [addTrace, showWalletState])

  useEffect(() => {
    if (!grantStoreReady || !grantStoreRef.current) return
    let cancelled = false
    let manager: ToolManagerRef | null = null
    void import('./walletWebmcp').then(({ registerWalletTools }) => {
      manager = registerWalletTools({
        getState: () => walletRef.current,
        setState: showWalletState,
        focusConsent: () => window.setTimeout(() => document.getElementById('consent-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80),
        recordTrace: addTrace,
        grantStore: grantStoreRef.current ?? undefined,
      })
      if (cancelled) return manager.dispose()
      managerRef.current = manager
      setTools(manager)
    })
    return () => { cancelled = true; managerRef.current = null; manager?.dispose() }
  }, [addTrace, grantStoreReady, showWalletState])

  useEffect(() => {
    walletRef.current = wallet
    if (managerRef.current) setTools(managerRef.current.sync())
  }, [wallet])

  useEffect(() => {
    const draft = wallet.draft
    if (!draft || !['prepared', 'consented'].includes(draft.status)) return
    const expiresAt = Date.parse(draft.request.expiresAt)
    const delay = Number.isFinite(expiresAt) ? Math.max(0, expiresAt - Date.now()) : 0
    const timer = window.setTimeout(() => {
      void (async () => {
      const current = walletRef.current
      const next = expireWalletDraft(current)
      if (next === current) return
      try {
        const committed = grantStoreRef.current
          ? await grantStoreRef.current.compareAndSet(current.version, next)
          : next
        showWalletState(committed)
      } catch {
        const latest = await grantStoreRef.current?.read()
        if (latest) showWalletState(latest)
        return
      }
      addTrace({ toolName: 'wallet_request_expired', status: 'blocked', summary: 'The disclosure expired. A fresh verifier request and human approval are required.', createdAt: new Date().toISOString() })
      })()
    }, Math.min(delay + 10, 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [addTrace, showWalletState, wallet.draft])

  async function approve() {
    try {
      if (isWalletDraftExpired(walletRef.current)) {
        const current = walletRef.current
        const next = expireWalletDraft(current)
        const committed = next !== current && grantStoreRef.current
          ? await grantStoreRef.current.compareAndSet(current.version, next)
          : next
        showWalletState(committed)
        addTrace({ toolName: 'human_consent', status: 'blocked', summary: 'The disclosure expired before approval. Read a fresh verifier request.', createdAt: new Date().toISOString() })
        return
      }
      const current = walletRef.current
      const next = consentToWalletDraft(current)
      const committed = grantStoreRef.current
        ? await grantStoreRef.current.compareAndSet(current.version, next)
        : next
      showWalletState(committed)
      addTrace({ toolName: 'human_consent', status: 'succeeded', summary: 'Person approved five claims for one audience and purpose.', createdAt: new Date().toISOString() })
    } catch {
      const latest = await grantStoreRef.current?.read()
      if (latest) showWalletState(latest)
      addTrace({ toolName: 'human_consent', status: 'blocked', summary: 'Wallet authority changed in another tab. The latest state was restored without granting new authority.', createdAt: new Date().toISOString() })
    }
  }

  async function revoke() {
    try {
      const current = walletRef.current
      const next = revokeWalletDraft(current)
      const committed = grantStoreRef.current
        ? await grantStoreRef.current.compareAndSet(current.version, next)
        : next
      showWalletState(committed)
      addTrace({ toolName: 'human_revoke', status: 'succeeded', summary: 'Person revoked the disclosure before export.', createdAt: new Date().toISOString() })
    } catch {
      const latest = await grantStoreRef.current?.read()
      if (latest) showWalletState(latest)
      addTrace({ toolName: 'human_revoke', status: 'blocked', summary: 'Wallet authority changed in another tab. The latest state was restored.', createdAt: new Date().toISOString() })
    }
  }

  async function reset() {
    try {
      const current = walletRef.current
      const next: WalletState = { version: current.version + 1 }
      const committed = grantStoreRef.current
        ? await grantStoreRef.current.compareAndSet(current.version, next)
        : next
      showWalletState(committed)
      setTraces([])
    } catch {
      const latest = await grantStoreRef.current?.read()
      if (latest) showWalletState(latest)
      addTrace({ toolName: 'wallet_reset', status: 'blocked', summary: 'Wallet state changed in another tab. Reset did not overwrite the newer authority state.', createdAt: new Date().toISOString() })
    }
  }

  const status: WalletStatus = wallet.draft?.status ?? 'no_request'

  return (
    <div className="site-shell app-page wallet-page">
      <header className="site-header app-header">
        <Brand context="Private credential wallet" />
        <ToolInventory tools={tools} />
        <span className="prototype-note">{grantStorageMode === 'durable' ? 'Reload-safe wallet authority' : grantStorageMode === 'session' ? 'Session-only fallback' : 'Opening wallet storage…'}</span>
        <button className="reset-link" onClick={() => { void reset() }}><RotateCcw size={14} /> Reset</button>
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
              <MaskedField label="Transcript" value="32 courses hidden" />
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
                {status === 'prepared' && <div className="consent-actions"><button className="approve-consent" onClick={() => { void approve() }}><UserRoundCheck size={17} /> Approve this disclosure</button><button className="reject-consent" onClick={() => { void revoke() }}>Reject</button></div>}
                {status === 'consented' && <div className="consent-result ready"><KeyRound size={19} /><div><strong>One-use export unlocked</strong><p>ChatGPT may atomically claim <code>wallet_export_proof</code> across same-origin wallet tabs. This granted no broader access.</p></div></div>}
                {status === 'exporting' && <div className="consent-result ready"><KeyRound size={19} /><div><strong>Session export claimed</strong><p>This grant is in flight; another call with the same state version is blocked.</p></div></div>}
                {status === 'exported' && <div className="consent-result exported"><PackageCheck size={19} /><div><strong>Proof exported</strong><p>The export tool is durably withdrawn from this browser wallet. Five claims crossed; zero private records crossed.</p></div></div>}
                {status === 'failed_closed' && <div className="consent-result revoked"><Ban size={19} /><div><strong>Export failed closed</strong><p>The claimed authority was withdrawn. Prepare and approve a fresh request before retrying.</p></div></div>}
                {status === 'expired' && <div className="consent-result revoked"><Ban size={19} /><div><strong>Disclosure expired</strong><p>No export occurred. Read a fresh verifier request before asking for consent again.</p></div></div>}
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
      <footer><a href={publicVerifierUrl} target="_blank">Open fellowship verifier <ExternalLink size={13} /></a><span>Synthetic wallet · private values are illustrative</span></footer>
    </div>
  )
}

export function FellowshipPage() {
  const [verifier, setVerifier] = useState<VerifierState>(createVerifierState)
  const [challengeStore] = useState(() => new InMemoryChallengeStore())
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
        challengeStore,
      })
      if (cancelled) return manager.dispose()
      managerRef.current = manager
      setTools(manager)
    })
    return () => { cancelled = true; managerRef.current = null; manager?.dispose() }
  }, [addTrace, challengeStore])

  useEffect(() => () => challengeStore.close(), [challengeStore])

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
              <div><dt>Challenge</dt><dd>Issued through WebMCP</dd></div>
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
      <footer><a href={publicWalletUrl} target="_blank">Open private wallet <ExternalLink size={13} /></a><span>All people, credentials, and applications are synthetic.</span></footer>
    </div>
  )
}

export function EvidencePage() {
  const livePassed = nativeEvidence.exportPassed && nativeEvidence.verificationPassed
  const releasePassed = livePassed && evalReceipt.success

  return (
    <div className="site-shell evidence-page">
      <header className="site-header">
        <Brand context="Judge evidence room" />
        <a className="evidence-open-demo" href={publicVerifierUrl} target="_blank">Open live flow <ExternalLink size={14} /></a>
      </header>

      <main className="evidence-main">
        <section className="evidence-hero">
          <div>
            <p className="eyebrow"><ShieldCheck size={14} /> Inspectable release evidence</p>
            <h1>Trust should be visible,<br /><em>not promised.</em></h1>
            <p>These receipts connect the product claim to native WebMCP behavior, adversarial tests, browser journeys, independent live-tool probes, and the exact limits of what was verified.</p>
          </div>
          <div className={`release-seal ${livePassed && releasePassed ? 'passed' : ''}`}>
            <BadgeCheck size={34} />
            <span>Release gate</span>
            <strong>{releasePassed ? 'PASSED' : 'REVIEW'}</strong>
            <small>Machine receipt linked below</small>
          </div>
        </section>

        <section className="evidence-metrics" aria-label="Release evidence summary">
          <article><strong>{evalReceipt.passed}/{evalReceipt.total}</strong><span>adversarial scenarios</span><small>Audience, purpose, expiry, session replay, tampering, authority</small></article>
          <article><strong>10/10</strong><span>browser checks</span><small>Six product journeys · four durability and concurrency checks</small></article>
          <article><strong>{nekudaAudit.score}/100</strong><span>independent tool audit</span><small>Zero findings across definitions, schemas, toolset, and safety</small></article>
          <article><strong>0 → 1 → 0</strong><span>wallet capability</span><small>Absent, human-unlocked, then atomically withdrawn across wallet tabs</small></article>
        </section>

        <section className="evidence-section lifecycle-evidence">
          <div className="evidence-section-heading"><div><p className="section-kicker">Native WebMCP proof</p><h2>A capability recorded for one call in one browser session.</h2></div><p>Captured across two separate live tabs in the OpenAI Codex in-app browser. The page adds and removes the actual WebMCP tool as in-memory authority changes.</p></div>
          <div className="capability-timeline">
            <article><span>01 · Before consent</span><strong>ABSENT</strong><code>wallet_export_proof</code><p>The agent can prepare a disclosure, but it cannot export one.</p></article>
            <div className="timeline-arrow"><ChevronRight size={20} /><small>human click</small></div>
            <article className="capability-live"><span>02 · Approved</span><strong>LIVE</strong><code>wallet_export_proof</code><p>One purpose-bound export becomes available in the recorded wallet session. No broader wallet access.</p></article>
            <div className="timeline-arrow"><ChevronRight size={20} /><small>one session call</small></div>
            <article><span>03 · Exported</span><strong>WITHDRAWN</strong><code>wallet_get_disclosure_receipt</code><p>The export tool disappears and only a safe receipt remains.</p></article>
          </div>
          <div className="live-receipt-line"><BadgeCheck size={18} /><strong>Live receipt confirms:</strong><span>before {String(nativeEvidence.exportBeforeConsent)}</span><span>after consent {String(nativeEvidence.exportAfterConsent)}</span><span>after export {String(nativeEvidence.exportAfterUse)}</span><a href={nativeReceiptUrl} target="_blank">Inspect machine receipt <ExternalLink size={12} /></a></div>
          <div className="live-receipt-line"><BadgeCheck size={18} /><strong>Deployed origin proof:</strong><span>{productionCrossOrigin.success ? 'passed' : 'review'}</span><span>wallet and verifier storage isolated</span><span>no peer-origin fetches</span><a href={productionCrossOriginUrl} target="_blank">Inspect cross-origin receipt <ExternalLink size={12} /></a></div>
        </section>

        <section className="evidence-grid">
          <article className="evidence-card verifier-proof-card">
            <p className="section-kicker">Verifier receipt</p>
            <h2>Five claims arrived. Zero records arrived.</h2>
            <ul>
              <li><Check size={15} />Issuer and holder binding verified</li>
              <li><Check size={15} />Audience, purpose, expiry, and nonce verified</li>
              <li><Check size={15} />Private fields disclosed: {nativeEvidence.privateFieldsDisclosed}</li>
              <li><Check size={15} />Private fields received: {nativeEvidence.privateFieldsReceived}</li>
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
          <div className="evidence-section-heading"><div><p className="section-kicker">Release gate</p><h2>Every claim has a corresponding check.</h2></div><p>The first-party gate runs together with <code>npm run verify</code>. Independent Workbench and GoogleChromeLabs probes are supplemental rather than certifications.</p></div>
          <div className="release-check-grid">{releaseChecks.map((check) => <article key={check.name}><BadgeCheck size={18} /><div><strong>{check.name}</strong><code>{check.command}</code></div><span>passed</span></article>)}</div>
          <div className="live-receipt-line"><BadgeCheck size={18} /><strong>Local role isolation:</strong><span>21/21 route and entry-chunk checks</span><span>production cutover pending</span><a href="https://github.com/amanmaqsood/proof-courier/blob/main/artifacts/release/role-builds.json" target="_blank">Role-build receipt <ExternalLink size={12} /></a></div>
          <div className="live-receipt-line"><BadgeCheck size={18} /><strong>Independent probes:</strong><span>{webmcpSmoke.passedSteps}/{webmcpSmoke.totalSteps} live tool steps</span><span>{nekudaAudit.score}/100 audit</span><a href={webmcpSmokeUrl} target="_blank">Smoke receipt <ExternalLink size={12} /></a><a href={workbenchAuditUrl} target="_blank">Audit receipt <ExternalLink size={12} /></a></div>
        </section>

        <section className="evidence-limitations">
          <ShieldCheck size={22} />
          <div><p className="section-kicker">Truthful boundary</p><h2>What this evidence does not claim</h2><ul>{nativeEvidence.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className="source-receipt"><span>Exact source and deployment</span><a href={nativeReceiptUrl} target="_blank">Open native WebMCP receipt <ExternalLink size={12} /></a><span>Release artifact hashes</span><a href="https://github.com/amanmaqsood/proof-courier/blob/main/artifacts/release/verification.json" target="_blank">Open release receipt <ExternalLink size={12} /></a></div>
        </section>

        <section className="evidence-cta"><div><p className="section-kicker">Run the proof</p><h2>Open both sites and watch authority change.</h2></div><div className="hero-actions"><a className="primary-action" href={publicVerifierUrl} target="_blank">Open verifier <ExternalLink size={15} /></a><a className="secondary-action" href={publicWalletUrl} target="_blank">Open wallet <ExternalLink size={15} /></a></div></section>
      </main>

      <footer><span>Proof Courier · Evidence room</span><span>Receipts are bundled from the public repository and contain synthetic data only.</span></footer>
    </div>
  )
}

function CapabilityGate({ status }: { status: WalletStatus }) {
  const state = status === 'consented' ? 'live' : ['exporting', 'exported', 'failed_closed'].includes(status) ? 'withdrawn' : ['revoked', 'expired'].includes(status) ? 'revoked' : 'absent'
  const label = status === 'exporting' ? 'CLAIMED · EXPORT IN PROGRESS' : status === 'failed_closed' ? 'WITHDRAWN · FRESH APPROVAL REQUIRED' : status === 'expired' ? 'EXPIRED · FRESH REQUEST REQUIRED' : state === 'live' ? 'LIVE FOR ONE DURABLE CLAIM' : state === 'withdrawn' ? 'WITHDRAWN IN THIS BROWSER WALLET' : state === 'revoked' ? 'REVOKED' : 'ABSENT UNTIL CONSENT'
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
  if (status === 'exporting') return 'Preparing the approved proof'
  if (status === 'exported') return 'Proof left the wallet'
  if (status === 'failed_closed') return 'Fresh approval required'
  if (status === 'expired') return 'Request expired'
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
