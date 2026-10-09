import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionHashVariant, TransactionStatus } from 'genlayer-js/types';
import './style.css';

const SAMPLE = [
  { id: '0', title: 'Publish open climate dataset', rubric: 'Publish a publicly accessible CSV dataset with at least 1,000 rows, a data dictionary, and a CC BY 4.0 license. The source page must link to the data and documentation.', sponsor: '0x5cA6...a39D', recipient: '0x73B2...f821', budget_wei: '2500000000000000000', deadline: String(Math.floor(Date.now() / 1000) + 86400 * 18), status: 'submitted', evidence_url: 'https://github.com/example/climate-data', decision: '' },
  { id: '1', title: 'Ship developer documentation', rubric: 'Publish setup instructions, API reference, and three reproducible examples in a public repository under an open-source license.', sponsor: '0x5cA6...a39D', recipient: '0x11D3...a72C', budget_wei: '1500000000000000000', deadline: String(Math.floor(Date.now() / 1000) + 86400 * 32), status: 'open', evidence_url: '', decision: '' },
  { id: '2', title: 'Release accessibility audit', rubric: 'Publish an accessibility audit of the project website with issue severity, reproduction steps, and remediation recommendations.', sponsor: '0x81C4...b45A', recipient: '0x22A9...de34', budget_wei: '1000000000000000000', deadline: String(Math.floor(Date.now() / 1000) + 86400 * 8), status: 'accepted', evidence_url: 'https://example.org/audit', decision: 'accepted' },
];

const icons = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  layers: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.9 1.9-.06-.06A1.7 1.7 0 0 0 16 18.4a1.7 1.7 0 0 0-1 .6H9a1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.84.38l-.06.06-1.9-1.9.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1V10a1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.38-1.84l-.06-.06 1.9-1.9.06.06A1.7 1.7 0 0 0 8 5.6a1.7 1.7 0 0 0 1-.6h6a1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.84-.38l.06-.06 1.9 1.9-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 .6 1v4a1.7 1.7 0 0 0-.6 1Z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 9V6a2 2 0 0 1 2-2h13M16 13h5"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  document: '<path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5M8 12h8M8 16h6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.4 6.6M20 4v7h-7"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const short = value => value && value.length > 16 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value || '—';
const formatGen = wei => { const n = BigInt(wei || 0); const whole = n / 10n ** 18n; const frac = ((n % 10n ** 18n) / 10n ** 15n).toString().padStart(3, '0').replace(/0+$/, ''); return `${whole}${frac ? `.${frac}` : ''} GEN`; };
const parseGen = value => { if (!/^\d+(\.\d{1,18})?$/.test(value) || Number(value) <= 0) throw Error('Enter a positive GEN amount.'); const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, '0')); };
const safeUrl = url => { try { const u = new URL(url); return u.protocol === 'https:' && !u.username && !u.password && u.hostname.includes('.') && !u.hostname.endsWith('.local') && !u.hostname.endsWith('.internal') && !/^[\d.]+$/.test(u.hostname) ? u.href : ''; } catch { return ''; } };
const explorerUrl = address => /^0x[a-fA-F0-9]{40}$/.test(address || '') ? `https://explorer-studio.genlayer.com/address/${address}` : '';
const dateText = epoch => new Date(Number(epoch) * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const CONTRACT_KEY = 'grantgate.contract.studionet.v1';
const PENDING_KEY = 'grantgate.pending.studionet.v1';
const DEFAULT_CONTRACT = '0xB979f7467dF61af3DB3346555aF98b8BC8230B1f';
const readPending = () => { try { const value = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); return /^0x[a-fA-F0-9]{64}$/.test(value?.hash || '') ? value : null; } catch { return null; } };
const state = { address: localStorage.getItem(CONTRACT_KEY) || DEFAULT_CONTRACT, account: '', milestones: [], selected: '0', view: 'overview', filter: 'all', page: 0, totalCount: 0, busy: false, error: '', history: {}, draft: {}, pending: readPending() };
const app = document.querySelector('#app');

function reader() { return createClient({ chain: studionet }); }
async function writer() {
  if (!window.ethereum) throw Error('Install an EIP-1193 wallet to sign GenLayer transactions.');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts?.[0]) throw Error('Wallet connection was cancelled.');
  state.account = accounts[0];
  const client = createClient({ chain: studionet, account: accounts[0], provider: window.ethereum });
  await client.connect('studionet');
  return client;
}
async function refresh() {
  if (!state.address) { state.milestones = SAMPLE; state.totalCount = SAMPLE.length; state.history = {}; state.error = ''; render(); return; }
  state.busy = true; render();
  try {
    const client = reader();
    const count = Number(await client.readContract({ address: state.address, functionName: 'count', args: [], transactionHashVariant: TransactionHashVariant.LATEST_FINAL }));
    if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid milestone count returned by the contract.');
    state.totalCount = count;
    state.page = Math.min(state.page, Math.max(0, Math.ceil(count / 20) - 1));
    const ids = Array.from({ length: Math.min(20, count - state.page * 20) }, (_, i) => count - 1 - state.page * 20 - i);
    state.milestones = await Promise.all(ids.map(id => client.readContract({ address: state.address, functionName: 'get_milestone', args: [BigInt(id)], transactionHashVariant: TransactionHashVariant.LATEST_FINAL })));
    state.history = {};
    state.error = '';
    if (!state.milestones.some(m => m.id === state.selected)) state.selected = state.milestones[0]?.id || '0';
  } catch (error) { state.error = error?.message || String(error); state.milestones = []; }
  state.busy = false; render();
  if (!state.error && state.milestones.length) void loadHistory(state.selected);
}
async function loadHistory(milestoneId) {
  if (!state.address || state.history[milestoneId]) return;
  const milestone = state.milestones.find(m => m.id === milestoneId);
  if (!milestone) return;
  const address = state.address;
  state.history[milestoneId] = { loading: true, entries: [] }; render();
  try {
    const client = reader();
    const entries = [];
    let cursor = BigInt(milestone.history_head || 0);
    const seen = new Set();
    while (cursor > 0n && entries.length < 25) {
      if (seen.has(String(cursor))) throw Error('History contains a repeated pointer.');
      seen.add(String(cursor));
      const entry = await client.readContract({ address, functionName: 'get_history_entry', args: [cursor], transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
      if (entry.milestone_id !== milestoneId) throw Error('History entry belongs to a different milestone.');
      entries.push(entry);
      cursor = BigInt(entry.previous);
    }
    if (state.address === address) state.history[milestoneId] = { entries, more: cursor > 0n };
  } catch (error) { if (state.address === address) state.history[milestoneId] = { entries: [], error: error?.message || String(error) }; }
  render();
}
async function trackPending() {
  if (!state.pending) return;
  state.busy = true; render();
  try {
    const pending = state.pending;
    const result = await reader().waitForTransactionReceipt({ hash: state.pending.hash, status: TransactionStatus.FINALIZED });
    const successful = result.status_name === 'FINALIZED' && result.result_name === 'MAJORITY_AGREE' && result.consensus_data?.leader_receipt?.some(receipt => receipt.execution_result === 'SUCCESS');
    state.pending = null;
    localStorage.removeItem(PENDING_KEY);
    if (!successful) throw Error(`Transaction failed or cannot be verified: ${result.status_name || 'unknown status'} / ${result.result_name || 'unknown result'}`);
    if (pending.functionName === 'create_milestone') { state.draft = {}; state.page = 0; }
    toast('Transaction finalized on GenLayer.');
    state.view = 'overview';
    await refresh();
  } catch (error) { toast(`${error?.message || String(error)}${state.pending ? ' Your transaction ID is saved; use Resume tracking before submitting again.' : ''}`, true); }
  state.busy = false; render();
}
async function write(functionName, args) {
  if (!state.address) { toast('Set a deployed contract address in Settings first.', true); state.view = 'settings'; render(); return; }
  if (state.pending) { toast('Resume tracking the pending transaction before submitting another write.', true); return; }
  state.busy = true; render();
  try {
    const client = await writer();
    const call = { address: state.address, functionName, args };
    const hash = await client.writeContract({ ...call, value: 0n });
    state.pending = { hash, functionName, address: state.address, submittedAt: Date.now() };
    localStorage.setItem(PENDING_KEY, JSON.stringify(state.pending));
    toast('Transaction submitted. Waiting for GenLayer finality…');
    await trackPending();
  } catch (error) { toast(error?.message || String(error), true); }
  state.busy = false; render();
}
function toast(message, error = false) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div'); el.className = `toast${error ? ' error' : ''}`; el.textContent = message; document.body.append(el);
  setTimeout(() => el.remove(), 6500);
}
function navButton(view, label, glyph) { return `<button data-view="${view}" class="${state.view === view ? 'active' : ''}">${icon(glyph)}<span>${label}</span></button>`; }
function header(title, description, action = '') { return `<div class="page-heading"><div><p class="eyebrow">Public goods infrastructure</p><h1>${title}</h1><p class="subtitle">${description}</p></div>${action}</div>`; }
function badge(status) { return `<span class="badge ${escapeHtml(status)}">${escapeHtml(status.replaceAll('_', ' '))}</span>`; }

function overview() {
  const items = state.milestones.filter(m => state.filter === 'all' || m.status === state.filter);
  const total = state.milestones.reduce((sum, m) => sum + BigInt(m.budget_wei), 0n);
  const accepted = state.milestones.filter(m => m.status === 'accepted').length;
  const selected = items.find(m => m.id === state.selected) || items[0];
  const previewNote = !state.address
    ? `<div class="notice"><div><strong>Preview workspace</strong> — These records are examples. Connect a deployed Studionet contract to view real finalized records.</div><button data-view="settings">Connect a contract</button></div>`
    : state.error
      ? `<div class="notice"><div><strong>Contract unavailable.</strong> ${escapeHtml(state.error)}</div><button data-action="refresh">Retry</button></div>`
      : '';
  const list = items.length ? items.map(m => `<button class="milestone ${m.id === selected?.id ? 'selected' : ''}" data-select="${escapeHtml(m.id)}"><span class="m-icon">${icon('document')}</span><span class="m-content"><span class="m-title">${escapeHtml(m.title)}</span><span class="m-sub">Due ${dateText(m.deadline)} · #${escapeHtml(m.id)}</span><span class="m-row"><span class="m-amount">${formatGen(m.budget_wei)} proposed</span>${badge(m.status)}</span></span></button>`).join('')
    : `<div class="empty"><span class="empty-icon">${icon('layers')}</span><strong>No milestones yet</strong>Create a milestone to begin the review process.</div>`;
  return `${header('Milestone overview', 'Freeze grant criteria, submit public evidence, and let GenLayer validators record a decision.', `<button class="primary" data-view="create">${icon('plus')} New milestone</button>`)}
    ${previewNote}
    <div class="stats"><div class="stat"><div class="stat-top">Proposed budgets ${icon('wallet')}</div><div class="stat-value">${formatGen(total)}</div><div class="stat-foot">Display only; no GEN is escrowed</div></div><div class="stat"><div class="stat-top">Milestones ${icon('layers')}</div><div class="stat-value">${state.totalCount}</div><div class="stat-foot">${state.address ? 'From finalized contract state' : 'Illustrative records'}</div></div><div class="stat"><div class="stat-top">Accepted reviews ${icon('check')}</div><div class="stat-value">${accepted}</div><div class="stat-foot">On this page; no automatic payout</div></div></div>
    <div class="section-head"><div><h2>Milestones</h2><p>Each decision follows a frozen rubric and a public source.</p></div><div class="section-tools"><select class="select" id="filter" aria-label="Filter milestones"><option value="all" ${state.filter === 'all' ? 'selected' : ''}>All statuses</option><option value="open" ${state.filter === 'open' ? 'selected' : ''}>Open</option><option value="submitted" ${state.filter === 'submitted' ? 'selected' : ''}>Submitted</option><option value="accepted" ${state.filter === 'accepted' ? 'selected' : ''}>Accepted</option><option value="revision_required" ${state.filter === 'revision_required' ? 'selected' : ''}>Revision required</option><option value="inconclusive" ${state.filter === 'inconclusive' ? 'selected' : ''}>Inconclusive</option><option value="closed" ${state.filter === 'closed' ? 'selected' : ''}>Closed</option></select><button class="secondary" data-action="refresh" aria-label="Refresh milestones">${icon('refresh')}</button></div></div>
    <div class="workspace"><div class="list-panel"><div class="list-header"><span>Review queue</span><span>${state.address ? `Showing ${Math.min(state.page * 20 + 1, state.totalCount)}–${Math.min((state.page + 1) * 20, state.totalCount)} of ${state.totalCount}` : `${items.length} examples`}</span></div>${list}${state.address && state.totalCount > 20 ? `<div class="page-controls"><button class="secondary" data-action="page-prev" ${state.page === 0 ? 'disabled' : ''}>Newer</button><button class="secondary" data-action="page-next" ${(state.page + 1) * 20 >= state.totalCount ? 'disabled' : ''}>Older</button></div>` : ''}</div><div class="detail-panel">${selected ? detail(selected) : `<div class="empty"><span class="empty-icon">${icon('document')}</span><strong>Select a milestone</strong>Its criteria and evidence will appear here.</div>`}</div></div>
    <div class="footer-note">Connected mode reads finalized Studionet contract state. Budgets are proposals; this demo does not hold or transfer GEN. ${explorerUrl(state.address) ? `<a href="${explorerUrl(state.address)}" target="_blank" rel="noopener noreferrer">Verify contract on the Studionet explorer</a>` : ''}</div>`;
}

function historySection(m) {
  if (!state.address) return '';
  const record = state.history[m.id];
  if (!record || record.loading) return `<div class="tip">Loading onchain activity…</div>`;
  if (record.error) return `<div class="tip">Activity unavailable: ${escapeHtml(record.error)}</div>`;
  const events = record.entries.map(entry => {
    const evidence = safeUrl(entry.evidence_url);
    const time = new Date(Number(entry.timestamp) * 1000).toLocaleString();
    return `<div class="history-entry"><strong>${escapeHtml(entry.action.replaceAll('_', ' '))}</strong><span>${escapeHtml(time)} · event #${escapeHtml(entry.id)}</span>${entry.decision ? `<span>Decision: ${escapeHtml(entry.decision.replaceAll('_', ' '))}</span>` : ''}${evidence ? `<a href="${escapeHtml(evidence)}" target="_blank" rel="noopener noreferrer">${escapeHtml(evidence)}</a>` : ''}</div>`;
  }).join('');
  return `<hr class="detail-divider"/><p class="detail-label">Onchain activity</p>${events || `<div class="tip">No activity recorded.</div>`}${record.more ? `<div class="tip">Showing the latest 25 events. Older entries remain in contract storage.</div>` : ''}`;
}
function detail(m) {
  const evidence = safeUrl(m.evidence_url);
  const canSubmit = state.address && state.account?.toLowerCase() === m.recipient?.toLowerCase() && ['open','revision_required','inconclusive'].includes(m.status) && Number(m.deadline) >= Date.now()/1000;
  const canReview = state.address && m.status === 'submitted';
  const canClose = state.address && state.account?.toLowerCase() === m.sponsor?.toLowerCase() && !['accepted','closed'].includes(m.status) && Number(m.deadline) + 7 * 86400 < Date.now()/1000;
  return `<div class="detail-overline">Milestone #${escapeHtml(m.id)} · public record</div><div class="detail-title">${escapeHtml(m.title)}</div><div class="detail-meta">${badge(m.status)}<span class="m-amount">${formatGen(m.budget_wei)} proposed</span></div>
    <p class="detail-label">Frozen acceptance criteria</p><p class="rubric">${escapeHtml(m.rubric)}</p><hr class="detail-divider"/>
    <div class="detail-grid"><div><p class="detail-label">Recipient</p><div class="detail-value">${escapeHtml(short(m.recipient))}</div></div><div><p class="detail-label">Evidence deadline</p><div class="detail-value">${dateText(m.deadline)}</div></div><div><p class="detail-label">Sponsor</p><div class="detail-value">${escapeHtml(short(m.sponsor))}</div></div><div><p class="detail-label">Latest decision</p><div class="detail-value">${m.decision ? escapeHtml(m.decision.replaceAll('_', ' ')) : 'Awaiting review'}</div></div></div>
    <hr class="detail-divider"/><p class="detail-label">Latest evidence</p>${evidence ? `<a class="evidence-link" href="${escapeHtml(evidence)}" target="_blank" rel="noopener noreferrer">${escapeHtml(evidence)} ${icon('external')}</a>` : `<div class="tip">No evidence submitted yet.</div>`}
    ${canSubmit ? `<form id="evidence-form" data-id="${escapeHtml(m.id)}" class="detail-actions"><input required name="evidence" type="url" placeholder="https://public-evidence-url" aria-label="Public evidence URL" style="flex:1;min-width:180px;border:1px solid #dce6dc;border-radius:8px;padding:10px;font-size:11px"/><button class="primary" type="submit">Submit evidence</button></form>` : ''}
    ${canReview || canClose ? `<div class="detail-actions">${canReview ? `<button class="primary" data-review="${escapeHtml(m.id)}">${icon('shield')} Ask validators to review</button>` : ''}${canClose ? `<button class="secondary" data-close="${escapeHtml(m.id)}">Close expired milestone</button>` : ''}</div>` : ''}
    ${m.status === 'accepted' ? `<div class="tip">Validators accepted the public evidence. The proposed budget remains informational; no GEN payout occurs in this Studionet demo.</div>` : ''}
    ${!state.address ? `<div class="detail-actions"><button class="secondary" data-view="settings">Connect contract for onchain actions ${icon('arrow')}</button></div>` : ''}
    ${historySection(m)}`;
}

function createView() {
  const d = state.draft;
  return `${header('Create a milestone','Write the acceptance criteria before publishing. The rubric cannot be changed afterward.')}
    ${!state.address ? `<div class="notice"><div><strong>Contract required.</strong> You can draft a milestone here. Add a deployed Studionet contract in Settings to publish it.</div><button data-view="settings">Open settings</button></div>` : ''}
    <div class="form-layout"><div class="form-card"><h2>Milestone details</h2><p class="card-intro">Choose a public deliverable that validators can independently inspect.</p><form id="create-form">
    <div class="field"><label for="title">Milestone title</label><input id="title" name="title" required maxlength="120" value="${escapeHtml(d.title || '')}" placeholder="e.g. Publish an open climate dataset"/></div>
    <div class="field"><label for="rubric">Acceptance criteria</label><textarea id="rubric" name="rubric" required minlength="20" maxlength="3000" placeholder="Describe exactly what must be published, where validators should look, and what counts as complete.">${escapeHtml(d.rubric || '')}</textarea><div class="field-help">Be specific about required artifacts, format, license, and public access.</div></div>
    <div class="field"><label for="recipient">Recipient wallet</label><input id="recipient" name="recipient" required value="${escapeHtml(d.recipient || '')}" placeholder="0x..." pattern="0x[a-fA-F0-9]{40}"/></div>
    <div class="form-two"><div class="field"><label for="amount">Proposed budget (GEN, display only)</label><input id="amount" name="amount" required inputmode="decimal" value="${escapeHtml(d.amount || '')}" placeholder="2.5"/></div><div class="field"><label for="deadline">Evidence deadline</label><input id="deadline" name="deadline" type="date" required value="${escapeHtml(d.deadline || '')}" min="${new Date(Date.now()+86400000).toISOString().slice(0,10)}"/></div></div>
    <button class="primary" type="submit">${icon('document')} Publish milestone</button></form></div>
    <div class="setup-card"><h2>How the demo works</h2><p class="card-intro">One milestone creates one public decision path.</p><div class="info-card"><strong>Studionet demo</strong>The proposed budget is a label, not an escrow deposit. Only network transaction fees may apply. This app records evidence and validator decisions onchain; it does not pay grants.</div><div class="step"><span class="step-no">1</span><div><strong>Freeze the rubric</strong><span>The sponsor sets criteria, recipient, proposed budget, and deadline.</span></div></div><div class="step"><span class="step-no">2</span><div><strong>Submit public evidence</strong><span>The recipient adds an HTTPS source before the deadline.</span></div></div><div class="step"><span class="step-no">3</span><div><strong>Independent review</strong><span>GenLayer validators fetch the source and check the rubric.</span></div></div><div class="step"><span class="step-no">4</span><div><strong>Record the decision</strong><span>Accepted, revision required, or inconclusive is stored with an onchain history entry.</span></div></div></div></div>`;
}

function settingsView() {
  return `${header('Contract connection','Point GrantGate at its deployed Studionet Intelligent Contract.')}
    <div class="settings-layout"><div class="setup-card"><h2>GenLayer Studionet</h2><p class="card-intro">The browser reads finalized contract state through GenLayer. Wallet signatures authorize writes.</p>
    <form id="contract-form"><div class="field"><label for="contract-address">GrantGate contract address</label><div class="inline-form"><input id="contract-address" name="address" value="${escapeHtml(state.address)}" placeholder="0x..." required pattern="0x[a-fA-F0-9]{40}"/><button class="primary" type="submit">Connect</button></div></div></form>
    <div class="tip">Only use the address of this version of <code>contracts/grant_gate.py</code> deployed on Studionet. The address stays in your browser; contract storage is the source of truth. For a built-in faucet and contract debugging, open <a href="https://studio.genlayer.com/" target="_blank" rel="noopener noreferrer">GenLayer Studio</a>. Inspect finalized transactions in the <a href="https://explorer-studio.genlayer.com/" target="_blank" rel="noopener noreferrer">Studionet explorer</a>.</div><hr class="detail-divider"/>
    <button class="secondary" data-action="wallet">${icon('wallet')} ${state.account ? escapeHtml(short(state.account)) : 'Connect wallet'}</button></div></div>`;
}

function pendingNotice() {
  if (!state.pending) return '';
  return `<div class="notice"><div><strong>Transaction awaiting finality</strong> — ${escapeHtml(state.pending.functionName.replaceAll('_',' '))} · ${escapeHtml(short(state.pending.hash))}. The ID is saved in this browser. Do not submit the same action again until its result is known.</div><button data-action="resume" ${state.busy ? 'disabled' : ''}>Resume tracking</button></div>`;
}
function render() {
  app.innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand"><span class="brand-mark"><span>✦</span></span>grantgate<span class="brand-dot">.</span></div><div class="nav-label">WORKSPACE</div><nav class="nav" aria-label="Main navigation">${navButton('overview','Overview','grid')}${navButton('create','New milestone','plus')}${navButton('settings','Settings','settings')}</nav><div class="sidebar-bottom"><div class="network-box"><div class="network-title"><span class="pulse"></span> GenLayer Studionet</div>Milestone decisions are checked by independent validators.</div><div class="sidebar-foot"><span>Built on GenLayer</span><span>v0.4</span></div></div></aside><div class="main"><div class="topbar"><div class="crumb">Workspace <span style="padding:0 7px;color:#c5d0c8">/</span> <strong>${state.view === 'overview' ? 'Overview' : state.view === 'create' ? 'New milestone' : 'Settings'}</strong></div><div class="top-actions"><span class="chain-pill"><span></span> Studionet demo</span><button class="wallet-btn" data-action="wallet">${icon('wallet')} ${state.account ? escapeHtml(short(state.account)) : 'Connect wallet'}</button></div></div><main class="content ${state.busy ? 'loading' : ''}">${pendingNotice()}${state.view === 'overview' ? overview() : state.view === 'create' ? createView() : settingsView()}</main></div></div>`;
  document.querySelector('#filter')?.addEventListener('change', e => { state.filter = e.target.value; render(); });
  document.querySelector('#contract-form')?.addEventListener('submit', e => {
    e.preventDefault();
    if (state.pending) return toast('Resolve the pending transaction before changing contracts.', true);
    const address = new FormData(e.currentTarget).get('address').trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return toast('Enter a valid contract address.', true);
    state.address = address;
    state.page = 0;
    localStorage.setItem(CONTRACT_KEY, address);
    state.view = 'overview';
    void refresh();
  });
  document.querySelector('#create-form')?.addEventListener('input', e => { state.draft[e.target.name] = e.target.value; });
  document.querySelector('#create-form')?.addEventListener('submit', e => {
    e.preventDefault();
    try {
      const f = Object.fromEntries(new FormData(e.currentTarget));
      state.draft = f;
      if (f.recipient.toLowerCase() === `0x${'0'.repeat(40)}`) throw Error('Recipient cannot be the zero address.');
      const deadline = Math.floor(new Date(`${f.deadline}T23:59:59`).getTime()/1000);
      if (deadline <= Date.now()/1000) throw Error('Choose a future deadline.');
      void write('create_milestone',[f.title.trim(),f.rubric.trim(),f.recipient,BigInt(deadline),parseGen(f.amount.trim())]);
    } catch(error) { toast(error.message,true); }
  });
  document.querySelector('#evidence-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const url = new FormData(e.currentTarget).get('evidence').trim();
    if (!safeUrl(url)) return toast('Evidence must be a public HTTPS domain URL.', true);
    void write('submit_evidence',[BigInt(e.currentTarget.dataset.id),url]);
  });
}

document.addEventListener('click', async event => {
  const view = event.target.closest('[data-view]'); if (view) { state.view = view.dataset.view; render(); return; }
  const select = event.target.closest('[data-select]'); if (select) { state.selected = select.dataset.select; render(); void loadHistory(state.selected); return; }
  const review = event.target.closest('[data-review]'); if (review) { await write('review',[BigInt(review.dataset.review)]); return; }
  const close = event.target.closest('[data-close]'); if (close) { await write('close_expired',[BigInt(close.dataset.close)]); return; }
  const action = event.target.closest('[data-action]'); if (!action) return;
  if (action.dataset.action === 'refresh') await refresh();
  if (action.dataset.action === 'page-prev' && state.page > 0) { state.page--; await refresh(); }
  if (action.dataset.action === 'page-next' && (state.page + 1) * 20 < state.totalCount) { state.page++; await refresh(); }
  if (action.dataset.action === 'resume') await trackPending();
  if (action.dataset.action === 'wallet') { try { await writer(); render(); toast('Wallet connected to Studionet.'); } catch(error) { toast(error.message,true); } }
});
render();
refresh();
