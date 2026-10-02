'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ShoppingBag, Smartphone, Laptop, Refrigerator, ShieldCheck, LockKeyhole, Check, CheckCircle2, ScanFace, Fingerprint, CreditCard, Landmark, FileText, Wallet, CalendarDays, CircleHelp, AlertCircle, X, LoaderCircle, ChevronDown, Download, Clock3 } from 'lucide-react';
import { summarize, decide } from '../lib/engine.mjs';
import { schedule, nextDueDate } from '../lib/customer.mjs';
import './customer.css';

type Client = { id: string; name: string; segment: string; history_months: number; existing_debt: number; living_floor: number; transactions: Record<string, unknown>[] };
type Model = Parameters<typeof summarize>[1];
type AppRecord = { id: string; client_id: string; name: string; segment: string; status: string; principal: number; payment: number; term: number; created: string; reason: string; state: string; paid: number; assessed: number; product?: string; down?: number; price?: number };
type Step = 'checkout' | 'plan' | 'connect' | 'identity' | 'processing' | 'result' | 'confirm' | 'wallet';
const products = [
  { id: 'phone', name: 'Everyday Phone', detail: '128 GB · Midnight · 1 item', price: 8000000, icon: Smartphone },
  { id: 'laptop', name: 'Everyday Laptop', detail: '14-inch · Silver · 1 item', price: 18000000, icon: Laptop },
  { id: 'fridge', name: 'Home Refrigerator', detail: 'Two-door · White · 1 item', price: 12500000, icon: Refrigerator },
];
const scenarios = [
  { id: 'C001', title: 'Salaried · CIC', detail: 'Regular payroll', fraud: false },
  { id: 'C073', title: 'Salaried · no CIC', detail: 'Payroll evidence', fraud: false },
  { id: 'C117', title: 'Gig worker', detail: 'Weekly platform payments', fraud: false },
  { id: 'C145', title: 'Online merchant', detail: 'Sales settlements', fraud: false },
  { id: 'C176', title: 'First-time borrower', detail: 'More history needed', fraud: false },
  { id: 'C001', title: 'Identity mismatch', detail: 'Identity gate stops the flow', fraud: true },
];
const stages = ['Payment', 'Your plan', 'Connect', 'Verify', 'Offer'];
const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n).replace('₫', '₫ ');
const stageFor = (s: Step) => ({ checkout: 0, plan: 1, connect: 2, identity: 3, processing: 4, result: 4, confirm: 4, wallet: 5 })[s];

export default function CustomerApp() {
  const [step, setStep] = useState<Step>('checkout');
  const [clients, setClients] = useState<Client[]>([]);
  const [model, setModel] = useState<Model | null>(null);
  const [error, setError] = useState('');
  const [scenario, setScenario] = useState(0);
  const [productId, setProductId] = useState('phone');
  const [method, setMethod] = useState('pay');
  const [down, setDown] = useState(1600000);
  const [term, setTerm] = useState(6);
  const [consent, setConsent] = useState(false);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('Minh Anh');
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [apps, setApps] = useState<AppRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [notice, setNotice] = useState('');
  const [demoOpen, setDemoOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all(['/data/clients.json', '/data/model.json'].map(url => fetch(url).then(r => {
      if (!r.ok) throw new Error('load');
      return r.json();
    }))).then(([data, weights]) => {
      if (!mounted) return;
      setClients(data as Client[]); setModel(weights as Model);
      try {
        const saved = JSON.parse(localStorage.getItem('hlpay-apps') || '[]');
        if (Array.isArray(saved)) setApps(saved);
      } catch { /* An empty demo is valid. */ }
      setLoaded(true);
    }).catch(() => { if (mounted) setError('The sample account could not load. Please refresh to try again.'); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem('hlpay-apps', JSON.stringify(apps)); } catch { /* The current session still works. */ }
  }, [apps, loaded]);

  useEffect(() => {
    if (step !== 'processing') return;
    let current = 0;
    const timer = setInterval(() => {
      current += 1; setProgress(current);
      if (current >= 4) { clearInterval(timer); setStep('result'); }
    }, 850);
    return () => clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (!verifying) return;
    const timer = setTimeout(() => { setVerifying(false); setVerified(true); }, 1300);
    return () => clearTimeout(timer);
  }, [verifying]);

  const preset = scenarios[scenario];
  const client = clients.find(c => c.id === preset.id);
  const product = products.find(p => p.id === productId)!;
  const ProductIcon = product.icon;
  const evidence = useMemo(() => client && model ? summarize(client, model) : null, [client, model]);
  const decision = useMemo(() => client && evidence ? decide(client, evidence, product.price, down, term, preset.fraud) : null, [client, evidence, product.price, down, term, preset.fraud]);
  const payments = useMemo(() => decision ? schedule(decision.principal, term) : [], [decision, term]);
  const active = apps.find(a => a.id === activeId) || apps.find(a => a.state === 'Active' || a.state === 'Repaid');
  const stage = stageFor(step);
  const summaryProduct = step === 'wallet' && active ? products.find(p => p.name === active.product) || product : product;
  const SummaryIcon = summaryProduct.icon;
  const summaryPrice = step === 'wallet' && active ? active.price || summaryProduct.price : product.price;

  function go(next: Step) { setNotice(''); setError(''); setStep(next); setAccepted(false); }
  function runCheck() { if (!connected || !consent || !verified) return; setProgress(0); setPendingId(''); go('processing'); }
  function restart() {
    setStep('checkout'); setConsent(false); setConnected(false); setVerified(false); setVerifying(false);
    setAccepted(false); setProgress(0); setNotice(''); setError(''); setPendingId('');
  }
  function chooseScenario(index: number) { setScenario(index); restart(); setDown(product.price * .2); setTerm(6); setDemoOpen(false); }
  function saveApplication(state: string) {
    if (!decision || !client) return '';
    const id = 'HLP-' + Date.now().toString().slice(-8);
    const record = { id, client_id: client.id, name: name.trim() || client.name, segment: client.segment, status: decision.status, principal: decision.principal, payment: decision.payment, term, created: new Date().toISOString(), reason: decision.reasons[0], state, paid: 0, assessed: decision.assessed, product: product.name, price: product.price, down };
    setApps(previous => [record, ...previous]); return id;
  }
  function confirmPurchase() {
    if (!accepted || decision?.status !== 'Green' || submitting) return;
    setSubmitting(true);
    const id = saveApplication('Active'); setActiveId(id); setSubmitting(false); go('wallet');
    setNotice('Purchase confirmed in the demo. Merchant payout is simulated; no money has moved.');
  }
  function payNext() {
    if (!active || active.state !== 'Active') return;
    setApps(previous => previous.map(a => a.id === active.id ? { ...a, paid: Math.min(a.term, a.paid + 1), state: a.paid + 1 >= a.term ? 'Repaid' : 'Active' } : a));
    setNotice('Demo installment recorded. No bank payment was made.');
  }
  function exportSchedule() {
    if (!decision) return;
    const csv = ['Payment,due_date,principal_vnd,interest_vnd,payment_vnd,balance_vnd', ...payments.map((p: ReturnType<typeof schedule>[number], i: number) => [i + 1, nextDueDate(new Date().toISOString(), i + 1), Math.round(p.principal), Math.round(p.interest), Math.round(p.payment), Math.round(p.balance)].join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const a = document.createElement('a');
    a.href = url; a.download = 'hong-leong-pay-repayment-plan.csv'; a.click(); URL.revokeObjectURL(url);
  }

  if (!loaded || !client || !decision) return <div className="customer-app c-load"><div className="c-logo">H</div><h1>{error ? 'Unable to open checkout' : 'Opening your checkout'}</h1><p>{error || 'Preparing your sample account…'}</p>{error && <button className="c-primary" onClick={() => location.reload()}>Try again</button>}</div>;

  return <div className="customer-app">
    <div className="c-demo-banner">Interactive prototype · Synthetic accounts · No real banking transactions</div>
    <header className="c-header"><Link href="/" className="c-brand"><span className="c-logo">H</span><span>Hong Leong <b>Pay</b></span></Link><div className="c-header-actions"><button className={step === 'wallet' ? 'selected' : ''} onClick={() => go('wallet')}><Wallet size={18}/> My installments</button><a href="/admin" aria-label="Open admin product lab">Admin / Product lab</a><span className="c-user">MA</span></div></header>
    <div className="c-container">
      {step !== 'wallet' && <nav className="c-stepper" aria-label="Checkout progress">{stages.map((label, i) => <div key={label} className={i < stage ? 'complete' : i === stage ? 'current' : ''}><span>{i < stage ? <Check size={14}/> : String(i + 1).padStart(2, '0')}</span><b>{label}</b></div>)}</nav>}
      {notice && <div className="c-notice" role="status"><CheckCircle2 size={19}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={18}/></button></div>}
      <div className={'c-layout ' + (step === 'wallet' ? 'wallet-layout' : '')}>
        <section className="c-workspace" key={step}>
          {step === 'checkout' && <><div className="c-kicker">TECH HOUSE / SECURE CHECKOUT</div><h1>How would you like to pay?</h1><p className="c-intro">Your order is ready. Choose a payment method to continue.</p><div className="c-order-line"><div className="c-product-icon"><ProductIcon size={38}/></div><div><h3>{product.name}</h3><p>{product.detail}</p></div><b>{money(product.price)}</b></div><div className="c-methods" role="radiogroup" aria-label="Payment method"><button role="radio" aria-checked={method === 'pay'} className={'c-method ' + (method === 'pay' ? 'chosen' : '')} onClick={() => setMethod('pay')}><span className="c-method-logo">H</span><div><b>Hong Leong Pay <span className="c-pill">Installments</span></b><p>Pay a portion today. Spread the rest over time.</p></div><span className="c-radio">{method === 'pay' && <span/>}</span></button><button role="radio" aria-checked={method === 'card'} className={'c-method ' + (method === 'card' ? 'chosen' : '')} onClick={() => setMethod('card')}><CreditCard size={27}/><div><b>Pay in full</b><p>Use another payment method at the merchant.</p></div><span className="c-radio">{method === 'card' && <span/>}</span></button></div><div className="c-info"><ShieldCheck size={21}/><span>You will see all repayment terms before you decide. Selecting Pay does not commit you to a loan.</span></div>{method === 'card' && <p className="c-inline-message">Full payment is outside this demo. You can return to the merchant or choose Hong Leong Pay.</p>}<button className="c-primary" onClick={() => method === 'pay' ? go('plan') : setNotice('Demo handoff to merchant: choose another payment method. No payment was taken.')}>{method === 'pay' ? 'Continue with Hong Leong Pay' : 'Return to merchant'}</button><div className="c-safe"><LockKeyhole size={14}/> A bank-led installment experience</div></>}
          {step === 'plan' && <><Back onClick={() => go('checkout')}/><div className="c-kicker">YOUR PURCHASE, YOUR PLAN</div><h1>Make room in your monthly budget.</h1><p className="c-intro">Choose what to pay today and how long to spread the remaining amount.</p><div className="c-down-heading"><label htmlFor="down-payment">Pay today</label><strong>{money(down)}</strong></div><input id="down-payment" className="c-range" type="range" min={0} max={product.price - 100000} step={100000} value={down} onChange={e => setDown(Number(e.target.value))}/><div className="c-range-ends"><span>₫0</span><span>{Math.round(down / product.price * 100)}% upfront</span><span>{money(product.price - 100000)}</span></div><label className="c-label">Repayment period</label><div className="c-terms" role="radiogroup" aria-label="Repayment period">{[3, 6, 9, 12, 18, 24].map(n => <button role="radio" aria-checked={term === n} key={n} className={term === n ? 'chosen' : ''} onClick={() => setTerm(n)}><b>{n}</b><span>months</span>{term === n && <Check size={13}/>}</button>)}</div><div className="c-estimate"><span>Estimated monthly payment</span><b key={decision.payment}>{money(decision.payment)}<small>/ month</small></b><div><span>{term} monthly payments</span><span>18% p.a. illustrative rate</span></div></div><dl className="c-breakdown"><div><dt>Amount to finance</dt><dd>{money(decision.principal)}</dd></div><div><dt>Total interest</dt><dd>{money(decision.interest)}</dd></div><div><dt>Fees in this demo</dt><dd>₫0</dd></div><div className="total"><dt>Total including pay today</dt><dd>{money(decision.total + down)}</dd></div></dl><p className="c-smallprint">This is an estimate, subject to assessment. A longer term lowers the monthly payment but increases total interest. These are demonstration terms, not an official bank offer.</p><button className="c-primary" onClick={() => go('connect')}>Continue with this plan</button></>}
          {step === 'connect' && <><Back onClick={() => go('plan')}/><div className="c-kicker">A CLEARER PICTURE OF YOUR INCOME</div><h1>Connect the account you receive money into.</h1><p className="c-intro">Account activity helps assess a suitable installment plan, even when you have limited credit history.</p><div className={'c-bank-card ' + (connected ? 'connected' : '')}><div className="c-bank-icon"><Landmark size={26}/></div><div><b>Sample bank account</b><p>•••• {client.id.slice(1).padStart(4, '0')} · {name || 'Minh Anh'}</p><small>{connected ? 'Connected for this assessment' : 'A preloaded synthetic account'}</small></div>{connected ? <CheckCircle2 size={22}/> : <LockKeyhole size={19}/>}</div><h3 className="c-section-title">What you are sharing</h3><div className="c-permissions"><Permission icon={Wallet} title="Account activity" text="Incoming payments, expenses and existing debt payments."/><Permission icon={FileText} title="Available account history" text={`${client.history_months} months in this sample, used only for this installment assessment.`}/><Permission icon={ShieldCheck} title="Identity and credit-history checks" text="Used with account evidence to assess the application. These checks are simulated here."/></div><details className="c-consent-details"><summary>How your consent works <ChevronDown size={16}/></summary><p>This prototype uses synthetic account data already bundled with the app. It does not connect to a real bank or collect credentials. The proposed service would need your explicit consent for the stated assessment purpose and a bank-approved retention and withdrawal process.</p><p>You can stop before confirming the offer. The “Disconnect” action removes consent for the current demo flow; it does not delete previously saved demo applications.</p></details><label className="c-checkbox"><input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); if (!e.target.checked) { setConnected(false); setVerified(false); } }}/><span>I allow the stated data to be used for this installment assessment.</span></label>{connected ? <><div className="c-connected-message"><CheckCircle2 size={17}/> Account connected. You are ready to verify your identity.</div><button className="c-primary" onClick={() => go('identity')}>Continue to verification</button><button className="c-text-button" onClick={() => { setConsent(false); setConnected(false); setVerified(false); }}>Disconnect sample account</button></> : <button className="c-primary" disabled={!consent} onClick={() => setConnected(true)}>Connect sample account</button>}<div className="c-safe"><LockKeyhole size={14}/> No password or banking login needed for this demo</div></>}
          {step === 'identity' && <><Back onClick={() => go('connect')}/><div className="c-kicker">ONE MORE STEP</div><h1>Let’s confirm it is you.</h1><p className="c-intro">Your connected account and identity must match before the installment assessment continues.</p><label className="c-label" htmlFor="customer-name">Name displayed in this demo</label><input id="customer-name" className="c-input" maxLength={50} value={name} onChange={e => { setName(e.target.value); setVerified(false); }}/><p className="c-field-note">Use a sample name. Do not enter identity numbers or upload real documents.</p><div className={'c-verify-card ' + (verifying ? 'scanning' : '') + (verified ? 'verified' : '')}><div className="c-face-icon">{verified ? <CheckCircle2 size={56}/> : <ScanFace size={64}/>}</div><h3>{verified ? 'Demo identity check completed' : verifying ? 'Checking your sample identity…' : 'Quick identity check'}</h3><p>{verified ? 'The sample account is linked to this demo application.' : 'In the proposed service, the bank verifies your identity and account ownership.'}</p><span className="c-pill">Simulated eKYC · No camera access</span>{!verified && <button className="c-secondary" disabled={!name.trim() || verifying} onClick={() => setVerifying(true)}>{verifying ? <><LoaderCircle className="c-spin" size={17}/> Verifying</> : <><Fingerprint size={18}/> Simulate identity check</>}</button>}</div><div className="c-info"><ShieldCheck size={21}/><span>{preset.fraud ? 'This selected demo scenario contains an identity mismatch. The next step will show how the application is stopped.' : 'Your plan is assessed after verification. Nothing is signed or paid at this step.'}</span></div><button className="c-primary" disabled={!verified || !connected || !consent} onClick={runCheck}>Check my installment offer</button></>}
          {step === 'processing' && <div className="c-processing" role="status" aria-live="polite"><div className="c-processing-orbit"><div className="c-spinner"/><ShieldCheck size={43}/></div><div className="c-kicker">FINDING A SUITABLE PLAN</div><h1>A moment for your assessment.</h1><p className="c-intro">We are checking the available evidence for this purchase.</p><div className="c-process-steps">{['Confirm account and identity', 'Understand recurring income and expenses', 'Check affordability and repayment terms', 'Prepare the next step'].map((text, i) => <div key={text} className={progress > i ? 'done' : progress === i ? 'running' : ''}>{progress > i ? <CheckCircle2 size={22}/> : progress === i ? <LoaderCircle className="c-spin" size={22}/> : <span className="c-process-circle"/>}<span>{text}</span></div>)}</div><div className="c-loading-track"><div style={{ width: (progress / 4 * 100) + '%' }}/></div><p className="c-smallprint">Demo sequence using a trained transaction classifier and illustrative rules. The animation does not represent live bank processing time.</p></div>}
          {step === 'result' && <><div className={'c-result-icon ' + decision.status.toLowerCase()}>{decision.status === 'Green' ? <CheckCircle2 size={36}/> : decision.status === 'Yellow' ? <Clock3 size={36}/> : <AlertCircle size={36}/>}</div><div className="c-kicker">YOUR APPLICATION UPDATE</div><h1>{decision.status === 'Green' ? 'Your installment plan is ready.' : decision.status === 'Yellow' ? decision.review ? 'We need a little more evidence.' : 'A higher payment today could help.' : 'We cannot offer this plan right now.'}</h1><p className="c-intro">{decision.status === 'Green' ? 'Review the offer below. You can accept it or leave without continuing.' : decision.status === 'Yellow' ? decision.review ? 'The available account evidence is not enough to confirm a suitable repayment plan. A bank reviewer would need more information.' : 'The requested monthly repayment does not leave enough room in the assessed cashflow. You can increase the upfront payment and check again.' : preset.fraud ? 'The identity gate found a mismatch in this demo scenario. The application is stopped before any loan or payment.' : 'The available cashflow cannot support this request under the demonstration policy. No loan or payment has been made.'}</p>{decision.status === 'Green' && <><div className="c-ready-offer"><span>Your monthly installment</span><b>{money(decision.payment)}</b><div><span>{term} months</span><span>18% p.a.</span><span>No demo fees</span></div></div><dl className="c-breakdown"><div><dt>Pay today</dt><dd>{money(down)}</dd></div><div><dt>Amount financed</dt><dd>{money(decision.principal)}</dd></div><div><dt>Total interest</dt><dd>{money(decision.interest)}</dd></div><div className="total"><dt>Total you will pay</dt><dd>{money(down + decision.total)}</dd></div></dl><div className="c-info"><CheckCircle2 size={20}/><span>The available account evidence supports this plan under the illustrative policy. You decide whether to continue.</span></div><button className="c-primary" onClick={() => go('confirm')}>Review terms and repayment schedule</button><button className="c-text-button" onClick={() => go('plan')}>Change my plan</button></>}{decision.status === 'Yellow' && !decision.review && <><div className="c-alternative"><span>Suggested upfront payment</span><b>{money(decision.minDown)}</b><p>Same {term}-month term. Financing less may fit your available monthly cashflow.</p></div><button className="c-primary" onClick={() => { setDown(decision.minDown); setProgress(0); go('processing'); }}>Check the adjusted plan</button><button className="c-text-button" onClick={() => go('plan')}>Choose a different upfront payment</button></>}{decision.status === 'Yellow' && decision.review && <><div className="c-evidence-request"><h3>What would help a reviewer?</h3><div><FileText size={20}/><span>{client.history_months < 3 ? 'Additional months of account history showing regular earnings.' : 'Evidence that identifies the source of unclear incoming transfers.'}</span></div><div><Wallet size={20}/><span>Confirmation of ongoing income and existing debt commitments.</span></div><p>A real bank would specify the required evidence and a secure submission channel. No document uploads are collected in this prototype.</p></div><button className="c-primary" disabled={!!pendingId} onClick={() => { const id = saveApplication('Pending review'); setPendingId(id); setNotice('Demo review request saved: ' + id + '. No evidence has been submitted and no decision has been approved.'); }}>{pendingId ? 'Review requested' : 'Request a review in the demo'}</button></>}{decision.status === 'Red' && <><div className="c-evidence-request"><h3>What you can do next</h3><p>{preset.fraud ? 'Verify account ownership through the bank’s official process. This demo cannot resolve a real identity mismatch.' : 'Consider a lower-priced purchase or a larger upfront payment. A new assessment would still be required.'}</p></div><button className="c-secondary full" onClick={() => { if (!pendingId) { setPendingId(saveApplication('Declined')); } go('plan'); }}>Return to my plan</button></>}<button className="c-text-button muted" onClick={restart}>Leave checkout</button><p className="c-smallprint">All results are illustrative demo outcomes. A real decision would follow the bank’s approved credit and data policies.</p></>}
          {step === 'confirm' && <><Back onClick={() => go('result')}/><div className="c-kicker">READ BEFORE YOU CONFIRM</div><h1>Your terms, in one place.</h1><p className="c-intro">Check the amounts and dates. You are free to stop here.</p><div className="c-contract-head"><FileText size={23}/><div><b>Hong Leong Pay · Demo agreement</b><p>{name} · {product.name} · TECH HOUSE</p></div><span className="c-pill">Illustrative</span></div><dl className="c-breakdown"><div><dt>Upfront payment</dt><dd>{money(down)}</dd></div><div><dt>Loan principal</dt><dd>{money(decision.principal)}</dd></div><div><dt>Interest rate</dt><dd>18% p.a. reducing balance</dd></div><div><dt>Fees / penalty charges in this demo</dt><dd>₫0</dd></div><div><dt>Total installments</dt><dd>{money(decision.total)}</dd></div><div className="total"><dt>Total purchase cost</dt><dd>{money(down + decision.total)}</dd></div></dl><div className="c-schedule-heading"><h3>Repayment schedule</h3><button onClick={exportSchedule}><Download size={16}/> CSV</button></div><div className="c-schedule-scroll"><table className="c-schedule"><thead><tr><th>Payment / due date</th><th>Amount</th><th>Remaining principal</th></tr></thead><tbody>{payments.map((p: ReturnType<typeof schedule>[number], i: number) => <tr key={i}><td><span>{String(i + 1).padStart(2, '0')}</span>{new Date(nextDueDate(new Date().toISOString(), i + 1)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{money(p.payment)}</td><td>{money(p.balance)}</td></tr>)}</tbody></table></div><div className="c-info"><CircleHelp size={20}/><span>In a real agreement, the bank must state late-payment charges, cancellation rules and complaint channels. This demo agreement creates no legal or payment obligation.</span></div><label className="c-checkbox"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}/><span>I have reviewed the displayed plan and agree to simulate the purchase confirmation.</span></label><button className="c-primary" disabled={!accepted || submitting} onClick={confirmPurchase}>{submitting ? 'Confirming…' : 'Confirm demo purchase'}</button><button className="c-text-button" onClick={restart}>Do not continue</button></>}
          {step === 'wallet' && <><div className="c-kicker">MY INSTALLMENTS</div><h1>{active ? active.state === 'Repaid' ? 'All paid. Nicely done.' : 'Your purchase, under control.' : 'Your plans will live here.'}</h1><p className="c-intro">{active ? 'See your next payment and how much of your plan is complete.' : 'Complete a demo purchase to view your repayment plan.'}</p>{active ? <><div className="c-wallet-card"><div><span>HONG LEONG PAY</span><span>{active.state === 'Repaid' ? 'Completed' : 'Active plan'}</span></div><h3>{active.product || 'Demo purchase'}</h3><b>{money(active.payment)}<small>/ month</small></b><div><span>{active.term} months</span><span>{active.id}</span></div></div><div className="c-wallet-stats"><div><span>Paid installments</span><b>{active.paid} <small>/ {active.term}</small></b></div><div><span>Remaining payments</span><b>{money(Math.max(0, active.term - active.paid) * active.payment)}</b></div></div><div className="c-repayment-progress"><div style={{ width: (active.paid / active.term * 100) + '%' }}/></div>{active.state === 'Active' && <div className="c-next-payment"><div className="c-calendar"><CalendarDays size={24}/></div><div><span>Next scheduled payment</span><b>{new Date(nextDueDate(active.created, active.paid + 1)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</b></div><strong>{money(active.payment)}</strong></div>}<div className="c-repayment-dots">{Array.from({ length: active.term }, (_, i) => <span key={i} className={i < active.paid ? 'paid' : i === active.paid ? 'next' : ''} title={'Installment ' + (i + 1)}>{i < active.paid ? <Check size={15}/> : i + 1}</span>)}</div>{active.state === 'Active' ? <button className="c-primary" onClick={payNext}>Simulate next installment payment</button> : <div className="c-connected-message"><CheckCircle2 size={20}/> All installments recorded in the demo.</div>}<p className="c-smallprint">Payment reminders, bank transfers and credit-limit increases are not automated in this prototype. Payments shown here are simulated.</p></> : <div className="c-wallet-empty"><Wallet size={50}/><p>No confirmed purchase yet.</p><button className="c-primary" onClick={restart}>Go to checkout</button></div>}{apps.filter(a => ['Active', 'Repaid'].includes(a.state)).length > 1 && <label className="c-label">View another plan<select className="c-input" value={active?.id || ''} onChange={e => setActiveId(e.target.value)}>{apps.filter(a => ['Active', 'Repaid'].includes(a.state)).map(a => <option key={a.id} value={a.id}>{a.id} · {a.product || a.name}</option>)}</select></label>}<button className="c-text-button" onClick={restart}>Start another demo purchase</button></>}
        </section>
        <aside className="c-summary"><div className="c-summary-top"><ShoppingBag size={19}/><span>{step === 'wallet' ? 'YOUR PAY EXPERIENCE' : 'ORDER SUMMARY'}</span><span className="c-order-tag">TH</span></div><div className="c-summary-product"><div className="c-summary-icon"><SummaryIcon size={42}/></div><h3>{summaryProduct.name}</h3><p>{summaryProduct.detail}</p><span>Sold by Tech House · Demo merchant</span></div><dl><div><dt>Item price</dt><dd>{money(summaryPrice)}</dd></div><div><dt>Delivery in this demo</dt><dd>Free</dd></div><div className="c-summary-total"><dt>Order total</dt><dd>{money(summaryPrice)}</dd></div></dl>{step !== 'checkout' && step !== 'wallet' && <div className="c-summary-plan"><div><span>Pay today</span><b>{money(down)}</b></div><div><span>Then {term} months</span><b>{money(decision.payment)} / mo</b></div><small>18% p.a. · Illustrative terms</small></div>}<div className="c-summary-trust"><ShieldCheck size={24}/><div><b>You stay in control.</b><p>Review your terms before confirming. Leave checkout whenever you need.</p></div></div><div className="c-five-layers"><span>01 Checkout</span><span>02 Identity</span><span>03 Cashflow</span><span>04 Decision</span><span>05 Repayment</span></div></aside>
      </div>
      <div className="c-bottom"><span><LockKeyhole size={14}/> Hong Leong Pay · Student product concept</span><button onClick={() => setDemoOpen(!demoOpen)}><span>Demo settings</span><ChevronDown size={14}/></button></div>
      {demoOpen && <section className="c-demo-settings"><div><h3>Choose a sample journey</h3><p>Presenter controls, separate from the customer flow. Changing a scenario restarts checkout and retains saved demo plans.</p></div><div className="c-scenarios">{scenarios.map((s, i) => <button className={scenario === i ? 'chosen' : ''} onClick={() => chooseScenario(i)} key={s.title}><b>{s.title}</b><span>{s.detail}</span></button>)}</div><label className="c-label">Sample purchase<select className="c-input" value={productId} onChange={e => { const next = products.find(p => p.id === e.target.value)!; setProductId(next.id); setDown(next.price * .2); restart(); }}>{products.map(p => <option value={p.id} key={p.id}>{p.name} · {money(p.price)}</option>)}</select></label><p>Research demo only. The product lab remains available for reviewing the trained model and saved applications.</p></section>}
    </div>
  </div>;
}
function Back({ onClick }: { onClick: () => void }) { return <button className="c-back" onClick={onClick}>Back</button>; }
function Permission({ icon: Icon, title, text }: { icon: typeof Wallet; title: string; text: string }) { return <div><span><Icon size={21}/></span><div><b>{title}</b><p>{text}</p></div></div>; }
