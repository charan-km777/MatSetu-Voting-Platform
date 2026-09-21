import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useRoute } from 'wouter';
import {
  Activity as ActivityIcon, ArrowLeft, ArrowUpRight, Blocks, Camera, Check, CheckCircle2, ChevronRight,
  CircleAlert, Clock3, Copy, Database, Fingerprint, Gauge, Inbox, LayoutDashboard, LoaderCircle, Menu,
  Network, Plus, RefreshCw, Search, ShieldCheck, UserRound, UsersRound, Video, Vote, X, XCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  getGetActivityQueryKey, getGetDashboardSummaryQueryKey, getGetElectionsQueryKey,
  getGetLedgerStatusQueryKey, getGetVotersQueryKey, getHealthCheckQueryKey,
  useCreateElection, useGetActivity, useGetDashboardSummary, useGetElection,
  useGetElections, useGetLedgerStatus, useGetVoters, useHealthCheck, useRegisterVoter,
  useVerifyVoter,
} from '@workspace/api-client-react';
import type { Activity, DashboardSummary, Election, LedgerStatus, Voter } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Not recorded';
const formatTime = (value?: string) => value ? new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

const FACE_API_SCRIPT = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
const FACE_API_MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

type FaceApi = {
  nets: {
    tinyFaceDetector: { loadFromUri: (uri: string) => Promise<void> };
    faceLandmark68Net: { loadFromUri: (uri: string) => Promise<void> };
    faceRecognitionNet: { loadFromUri: (uri: string) => Promise<void> };
  };
  TinyFaceDetectorOptions: new (options?: { inputSize?: number; scoreThreshold?: number }) => unknown;
  detectSingleFace: (input: HTMLVideoElement, options: unknown) => {
    withFaceLandmarks: () => { withFaceDescriptor: () => Promise<{ descriptor: Float32Array } | undefined> };
  };
};

declare global {
  interface Window {
    faceapi?: FaceApi;
  }
}

let faceApiPromise: Promise<FaceApi> | undefined;
const loadFaceApi = () => {
  if (window.faceapi) return Promise.resolve(window.faceapi);
  if (!faceApiPromise) {
    faceApiPromise = new Promise<FaceApi>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${FACE_API_SCRIPT}"]`);
      const script = existing ?? document.createElement('script');
      script.src = FACE_API_SCRIPT;
      script.async = true;
      script.onload = () => window.faceapi ? resolve(window.faceapi) : (() => { faceApiPromise = undefined; reject(new Error('Face model library was unavailable.')); })();
      script.onerror = () => { faceApiPromise = undefined; reject(new Error('Face model library could not be loaded.')); };
      if (!existing) document.head.appendChild(script);
    });
  }
  return faceApiPromise;
};

function StatusPill({ value, tone }: { value: string; tone?: 'green' | 'amber' | 'red' | 'blue' }) {
  const inferred = tone ?? (['live', 'verified', 'success', 'deployed', 'operational'].includes(value) ? 'green' : ['pending', 'scheduled', 'compiling', 'warning', 'attention'].includes(value) ? 'amber' : ['flagged', 'offline', 'unavailable'].includes(value) ? 'red' : 'blue');
  const classes = { green: 'bg-[#dcefe5] text-[#236448]', amber: 'bg-[#faeacb] text-[#91601d]', red: 'bg-[#f8dfda] text-[#a43b32]', blue: 'bg-[#dce8ed] text-[#315a6e]' };
  return <span data-testid={`status-${value}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${classes[inferred]}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{value}</span>;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-foreground/10 ${className}`} aria-label="Loading" />;
}

function EmptyState({ icon: Icon, title, detail, action }: { icon: typeof Inbox; title: string; detail: string; action?: ReactNode }) {
  return <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/45 px-6 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary"><Icon size={22} /></div><h3 className="font-display text-lg font-semibold">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{detail}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

function ErrorState({ retry, detail = 'The service did not return a usable response.' }: { retry: () => void; detail?: string }) {
  return <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-[#e5bbb4] bg-[#fff5f2] px-6 text-center"><CircleAlert className="mb-3 text-destructive" size={28} /><h3 className="font-display text-lg font-semibold text-[#762d27]">Could not load this view</h3><p className="mt-2 max-w-sm text-sm text-[#99574f]">{detail}</p><button data-testid="button-retry" onClick={retry} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#762d27] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white hover:-translate-y-0.5"><RefreshCw size={14} /> Retry</button></div>;
}

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const health = useHealthCheck();
  const nav = [
    { href: '/', label: 'Operations overview', icon: LayoutDashboard },
    { href: '/elections', label: 'Elections', icon: Vote },
    { href: '/voters', label: 'Voter registry', icon: UsersRound },
    { href: '/ledger', label: 'Ledger monitor', icon: Blocks },
  ];
  return <div className="matsetu-noise min-h-[100dvh] bg-background text-foreground">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col border-r border-sidebar-border bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 px-2"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Fingerprint size={21} strokeWidth={2.5} /></div><div><div className="font-display text-lg font-semibold tracking-tight">MatSetu</div><div className="font-mono text-[9px] uppercase tracking-[0.2em] text-sidebar-foreground/55">Election operations</div></div></div>
      <div className="mt-12 px-2 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-sidebar-foreground/40">Workspace</div>
      <nav className="mt-3 space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-${label.toLowerCase().replaceAll(' ', '-')}`} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${location === href || (href !== '/' && location.startsWith(href)) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}</Link>)}</nav>
      <div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent/45 p-4"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${health.isError ? 'bg-[#df7669]' : health.data?.status === 'ok' ? 'bg-sidebar-primary' : 'bg-[#e0a44c]'}`} /><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/70">{health.isError ? 'API unavailable' : health.data?.status === 'ok' ? 'Systems operational' : 'Checking systems'}</span></div><p className="mt-3 text-xs leading-5 text-sidebar-foreground/48">Integrity controls and audit trail are monitored continuously.</p></div>
      <div className="mt-5 flex items-center gap-2 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/35"><ShieldCheck size={13} /> Operator workspace</div>
    </aside>
    {mobileOpen && <button aria-label="Close navigation" data-testid="button-close-navigation" className="fixed inset-0 z-30 bg-sidebar/40 md:hidden" onClick={() => setMobileOpen(false)} />}
    <main className="min-h-[100dvh] md:pl-[270px]">
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-xl md:px-10"><button aria-label="Open navigation" data-testid="button-open-navigation" className="rounded-lg p-2 hover:bg-secondary md:hidden" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><span className="font-mono text-[10px] uppercase tracking-[0.16em]">MatSetu</span><ChevronRight size={13} /><span className="font-semibold text-foreground">{location === '/' ? 'Operations overview' : location.includes('elections') ? 'Elections' : location.includes('voters') ? 'Voter registry' : 'Ledger monitor'}</span></div><div className="ml-auto flex items-center gap-3"><div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${health.isError ? 'bg-destructive' : 'bg-primary'}`} /><span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{health.isError ? 'Connection issue' : 'API connected'}</span></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">OP</div></div></header>
      <div className="mx-auto max-w-[1480px] px-5 py-8 md:px-10 lg:px-14">{children}</div>
    </main>
  </div>;
}

function PageIntro({ eyebrow, title, detail, action }: { eyebrow: string; title: ReactNode; detail: string; action?: ReactNode }) {
  return <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-primary"><span className="h-px w-6 bg-primary" />{eyebrow}</div><h1 className="font-display text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{detail}</p></div>{action}</div>;
}

function MetricCard({ label, value, note, icon: Icon, accent = 'primary', loading }: { label: string; value?: number | string; note: string; icon: typeof UsersRound; accent?: 'primary' | 'amber' | 'blue' | 'red'; loading?: boolean }) {
  const colors = { primary: 'bg-primary/10 text-primary', amber: 'bg-accent/20 text-[#9d671b]', blue: 'bg-[#dce8ed] text-[#315a6e]', red: 'bg-[#f8dfda] text-destructive' };
  return <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between"><span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">{label}</span><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[accent]}`}><Icon size={17} /></span></div>{loading ? <Skeleton className="mt-5 h-9 w-28" /> : <div data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`} className="mt-5 font-display text-4xl font-semibold tracking-[-0.06em]">{value ?? '—'}</div>}<div className="mt-2 text-xs text-muted-foreground">{note}</div></div>;
}

function Dashboard() {
  const summary = useGetDashboardSummary();
  const ledger = useGetLedgerStatus();
  const activity = useGetActivity();
  const elections = useGetElections();
  const system: DashboardSummary | undefined = summary.data;
  return <div className="matsetu-rise">
    <PageIntro eyebrow="Live command center" title={<>Ready when your institution<br className="hidden md:block" /> needs certainty.</>} detail="A plain-language view of election readiness, voter verification, and the local audit ledger." action={<Link href="/elections" data-testid="link-open-elections" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md">Open elections <ArrowUpRight size={15} /></Link>} />
    <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Active voters" value={system?.activeVoters} note="Registered in the current workspace" icon={UsersRound} loading={summary.isLoading} />
      <MetricCard label="Active elections" value={system?.activeElections} note="Live or scheduled ballots" icon={Vote} accent="amber" loading={summary.isLoading} />
      <MetricCard label="Verified transactions" value={system?.verifiedTransactions} note="Committed to the audit ledger" icon={CheckCircle2} accent="blue" loading={summary.isLoading} />
      <MetricCard label="Duplicate attempts" value={system?.duplicateAttempts} note={system?.duplicateAttempts ? 'Review recommended' : 'No suspicious repeats detected'} icon={CircleAlert} accent={system?.duplicateAttempts ? 'red' : 'primary'} loading={summary.isLoading} />
    </div>
    {summary.isError ? <ErrorState retry={() => summary.refetch()} /> : <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-display text-lg font-semibold">Readiness at a glance</h2><p className="mt-1 text-xs text-muted-foreground">Signals that matter before a ballot opens.</p></div><StatusPill value={system?.systemStatus ?? 'checking'} /></div><div className="grid gap-6 p-5 md:grid-cols-[1fr_0.9fr]"><div className="relative flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl bg-[#e8f0e9] p-8"><div className="absolute inset-0 matsetu-grid opacity-50" /><div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[10px] border-primary/20 border-t-primary border-r-primary/60"><div className="text-center"><div className="font-display text-4xl font-semibold text-primary">{system?.systemStatus === 'operational' ? '100' : '—'}<span className="text-xl">%</span></div><div className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-primary/70">ready signal</div></div></div></div><div className="space-y-4 pt-1"><ReadinessRow label="Voter registry" value={system ? `${system.activeVoters} active records` : 'Awaiting data'} ok={!summary.isLoading} /><ReadinessRow label="Election schedule" value={system ? `${system.activeElections} active elections` : 'Awaiting data'} ok={!summary.isLoading} /><ReadinessRow label="Blockchain ledger" value={ledger.data?.contractStatus ?? 'Awaiting data'} ok={ledger.data?.contractStatus === 'deployed'} /><ReadinessRow label="Service health" value={system?.systemStatus ?? 'Checking'} ok={system?.systemStatus === 'operational'} /></div></div></section>
      <section className="rounded-2xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-display text-lg font-semibold">Recent activity</h2><p className="mt-1 text-xs text-muted-foreground">A verifiable trail of operator events.</p></div><Link href="/ledger" data-testid="link-view-activity" className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline">View ledger</Link></div><ActivityList activity={activity.data?.slice(0, 5)} loading={activity.isLoading} error={activity.isError} retry={() => activity.refetch()} /></section>
    </div>}
    <div className="mt-5 grid gap-5 md:grid-cols-[0.72fr_1.28fr]"><div className="rounded-2xl bg-sidebar p-6 text-sidebar-foreground"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.17em] text-sidebar-primary"><Network size={14} /> Ledger heartbeat</div><h2 className="mt-5 font-display text-2xl leading-tight">Trust is a system,<br />not a promise.</h2><p className="mt-3 max-w-sm text-xs leading-5 text-sidebar-foreground/60">MatSetu records every verification event against your local blockchain connection so the result can be inspected later.</p><Link href="/ledger" data-testid="link-inspect-ledger" className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-sidebar-primary hover:gap-3">Inspect connection <ArrowUpRight size={14} /></Link></div><div className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-semibold">Election pulse</h2><p className="mt-1 text-xs text-muted-foreground">The most recent ballots in your workspace.</p></div><Link href="/elections" data-testid="link-browse-elections" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><ArrowUpRight size={17} /></Link></div><ElectionMiniList elections={elections.data?.slice(0, 3)} loading={elections.isLoading} /></div></div>
  </div>;
}

function ReadinessRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"><div className="flex items-center gap-3"><span className={`flex h-7 w-7 items-center justify-center rounded-lg ${ok ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-[#9d671b]'}`}>{ok ? <Check size={14} /> : <Clock3 size={14} />}</span><span className="text-xs font-semibold">{label}</span></div><span className="max-w-[150px] truncate font-mono text-[10px] text-muted-foreground">{value}</span></div>;
}

function ActivityList({ activity, loading, error, retry }: { activity?: Activity[]; loading: boolean; error: boolean; retry: () => void }) {
  if (loading) return <div className="space-y-4 p-5">{[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-12 w-full" />)}</div>;
  if (error) return <div className="p-5"><ErrorState retry={retry} detail="Activity is temporarily unavailable." /></div>;
  if (!activity?.length) return <div className="p-5"><EmptyState icon={ActivityIcon} title="No activity yet" detail="Operator events will appear here as the workspace is used." /></div>;
  return <div className="divide-y divide-border/70">{activity.map((item) => <div key={item.id} data-testid={`activity-${item.id}`} className="flex gap-3 px-5 py-4"><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.status === 'success' ? 'bg-primary/10 text-primary' : item.status === 'warning' ? 'bg-accent/20 text-[#9d671b]' : 'bg-secondary text-muted-foreground'}`}>{item.type === 'verification' ? <Fingerprint size={15} /> : item.type === 'ledger' ? <Blocks size={15} /> : item.type === 'election' ? <Vote size={15} /> : <UserRound size={15} />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="truncate text-xs font-semibold">{item.label}</p><time className="shrink-0 font-mono text-[9px] text-muted-foreground">{formatTime(item.timestamp)}</time></div><p className="mt-1 truncate text-[11px] text-muted-foreground">{item.detail}</p></div></div>)}</div>;
}

function ElectionMiniList({ elections, loading }: { elections?: Election[]; loading: boolean }) {
  if (loading) return <div className="mt-5 space-y-3">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-12 w-full" />)}</div>;
  if (!elections?.length) return <p className="mt-6 text-sm text-muted-foreground">No elections have been created.</p>;
  return <div className="mt-4 divide-y divide-border/70">{elections.map((election) => <Link href={`/elections/${election.id}`} key={election.id} data-testid={`row-pulse-${election.id}`} className="flex items-center gap-3 py-3 hover:translate-x-1"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary font-mono text-[10px] font-bold text-primary">{election.title.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{election.title}</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">{election.voterCount} voters · {formatDate(election.startAt)}</span></span><StatusPill value={election.status} /></Link>)}</div>;
}

function ElectionsPage() {
  const query = useGetElections();
  const create = useCreateElection();
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const client = useQueryClient();
  const submit = (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !startAt || !endAt) return; create.mutate({ data: { title: title.trim(), startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString() } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetElectionsQueryKey() }); setModal(false); setTitle(''); setStartAt(''); setEndAt(''); } }); };
  return <div className="matsetu-rise"><PageIntro eyebrow="Ballot management" title="Elections" detail="Prepare, monitor, and inspect the ballots entrusted to your institution." action={<button data-testid="button-create-election" onClick={() => setModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-sm hover:-translate-y-0.5"><Plus size={16} /> New election</button>} />
    {query.isLoading ? <div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((n) => <Skeleton key={n} className="h-52" />)}</div> : query.isError ? <ErrorState retry={() => query.refetch()} /> : !query.data?.length ? <EmptyState icon={Vote} title="No elections in this workspace" detail="Create the first ballot when your election brief and dates are ready." action={<button data-testid="button-create-election-empty" onClick={() => setModal(true)} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground">Create an election</button>} /> : <div className="grid gap-4 lg:grid-cols-2">{query.data.map((election) => <ElectionCard key={election.id} election={election} />)}</div>}
    {modal && <Modal title="Create an election" close={() => setModal(false)}><form onSubmit={submit} className="space-y-5"><Field label="Election title"><input required minLength={3} data-testid="input-election-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Faculty Senate 2025" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Opens"><input required type="datetime-local" data-testid="input-election-start" value={startAt} onChange={(e) => setStartAt(e.target.value)} /></Field><Field label="Closes"><input required type="datetime-local" data-testid="input-election-end" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></Field></div>{create.isError && <InlineError message="The election could not be created. Check the details and try again." />}<button disabled={create.isPending} data-testid="button-submit-election" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-50">{create.isPending ? 'Creating…' : 'Create election'} <ArrowUpRight size={15} /></button></form></Modal>}
  </div>;
}

function ElectionCard({ election }: { election: Election }) {
  return <Link href={`/elections/${election.id}`} data-testid={`card-election-${election.id}`} className="group rounded-2xl border border-border bg-card p-5 shadow-sm hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary font-display text-base font-semibold text-primary">{election.title.split(' ').map((w) => w[0]).slice(0, 2).join('')}</div><StatusPill value={election.status} /></div><h2 className="mt-6 font-display text-2xl font-semibold tracking-[-0.03em]">{election.title}</h2><div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4"><DataPair label="Candidates" value={election.candidateCount} /><DataPair label="Voters" value={election.voterCount} /><DataPair label="Starts" value={formatDate(election.startAt)} /></div><div className="mt-5 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground group-hover:text-primary">Inspect ballot <ArrowUpRight size={15} /></div></Link>;
}

function ElectionDetail() {
  const [, params] = useRoute('/elections/:id');
  const id = params?.id ?? '';
  const query = useGetElection(id);
  if (query.isLoading) return <div><Skeleton className="h-9 w-28" /><Skeleton className="mt-8 h-48 w-full" /></div>;
  if (query.isError || !query.data) return <ErrorState retry={() => query.refetch()} />;
  const election = query.data;
  return <div className="matsetu-rise"><Link href="/elections" data-testid="link-back-elections" className="mb-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"><ArrowLeft size={14} /> All elections</Link><div className="rounded-3xl border border-border bg-card p-6 shadow-sm md:p-10"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-start"><div><div className="flex items-center gap-3"><span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Election brief</span><StatusPill value={election.status} /></div><h1 data-testid="text-election-title" className="mt-5 max-w-3xl font-display text-4xl font-semibold tracking-[-0.05em] md:text-6xl">{election.title}</h1><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">This ballot is represented on the local ledger and ready for operational review.</p></div><div className="rounded-2xl bg-secondary p-4 md:min-w-[220px]"><div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Ballot window</div><div className="mt-3 text-sm font-semibold">{formatDate(election.startAt)}</div><div className="text-xs text-muted-foreground">{formatTime(election.startAt)} — {formatTime(election.endAt)}</div></div></div><div className="mt-10 grid gap-4 border-t border-border pt-6 sm:grid-cols-3"><DataPair label="Candidates" value={election.candidateCount} large /><DataPair label="Registered voters" value={election.voterCount} large /><div><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Contract address</div><div className="mt-2 flex items-center gap-2"><code className="max-w-[200px] truncate text-xs font-semibold">{election.contractAddress || 'Not deployed'}</code>{election.contractAddress && <button data-testid="button-copy-contract" aria-label="Copy contract address" onClick={() => navigator.clipboard?.writeText(election.contractAddress)} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><Copy size={14} /></button>}</div></div></div></div></div>;
}

function DataPair({ label, value, large }: { label: string; value: number | string; large?: boolean }) {
  return <div><div className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div><div className={`mt-2 font-semibold ${large ? 'font-display text-3xl tracking-[-0.05em]' : 'text-xs'}`}>{value}</div></div>;
}

function VotersPage() {
  const query = useGetVoters();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'register' | 'verify' | null>(null);
  const [selected, setSelected] = useState<Voter | null>(null);
  const filtered = useMemo(() => query.data?.filter((voter) => `${voter.displayName} ${voter.identifier}`.toLowerCase().includes(search.toLowerCase())) ?? [], [query.data, search]);
  return <div className="matsetu-rise"><PageIntro eyebrow="Identity controls" title="Voter registry" detail="A clear record of who is eligible, when they registered, and the last successful verification." action={<button data-testid="button-register-voter" onClick={() => setModal('register')} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-sm hover:-translate-y-0.5"><Plus size={16} /> Register voter</button>} />
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} /><input aria-label="Search voters" data-testid="input-search-voters" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or identifier…" className="border-0 bg-transparent pl-9 shadow-none focus:ring-0" /></div><div className="flex items-center gap-2 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><UsersRound size={14} /> {query.data?.length ?? 0} records</div></div>
    {query.isLoading ? <div className="space-y-3">{[1, 2, 3, 4, 5].map((n) => <Skeleton key={n} className="h-16" />)}</div> : query.isError ? <ErrorState retry={() => query.refetch()} /> : !filtered.length ? <EmptyState icon={UsersRound} title={search ? 'No matching voters' : 'No registered voters'} detail={search ? 'Try a different name or identifier.' : 'Registration records will be listed here once your first voter is enrolled.'} action={!search ? <button data-testid="button-register-voter-empty" onClick={() => setModal('register')} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground">Start registration</button> : undefined} /> : <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="hidden grid-cols-[1.5fr_1.2fr_0.8fr_1fr_120px] gap-4 border-b border-border bg-secondary/50 px-5 py-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground md:grid"><span>Voter</span><span>Identifier</span><span>Status</span><span>Last verified</span><span /></div><div className="divide-y divide-border/70">{filtered.map((voter) => <div key={voter.id} data-testid={`row-voter-${voter.id}`} className="grid gap-3 px-5 py-4 md:grid-cols-[1.5fr_1.2fr_0.8fr_1fr_120px] md:items-center md:gap-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary font-mono text-[10px] font-bold text-primary">{initials(voter.displayName)}</span><div><div className="text-sm font-semibold">{voter.displayName}</div><div className="font-mono text-[9px] text-muted-foreground">Registered {formatDate(voter.registeredAt)}</div></div></div><code className="truncate text-xs text-muted-foreground">{voter.identifier}</code><div><StatusPill value={voter.status} /></div><div className="text-xs text-muted-foreground">{formatDate(voter.lastVerifiedAt)}</div><button data-testid={`button-verify-voter-${voter.id}`} onClick={() => { setSelected(voter); setModal('verify'); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] hover:border-primary hover:text-primary"><Fingerprint size={13} /> Verify</button></div>)}</div></div>}
    {modal === 'register' && <RegisterModal close={() => setModal(null)} />}{modal === 'verify' && selected && <VerifyModal voter={selected} close={() => { setModal(null); setSelected(null); }} />}
  </div>;
}

function RegisterModal({ close }: { close: () => void }) {
  const register = useRegisterVoter();
  const client = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const submit = (event: FormEvent) => { event.preventDefault(); if (!descriptor) return; register.mutate({ data: { displayName: displayName.trim(), identifier: identifier.trim(), descriptor } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetVotersQueryKey() }); close(); } }); };
  return <Modal title="Register a voter" close={close}><form onSubmit={submit} className="space-y-5"><Field label="Display name"><input required minLength={2} data-testid="input-voter-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Full institutional name" /></Field><Field label="Identifier"><input required minLength={2} data-testid="input-voter-identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Student or employee ID" /></Field><FaceCapture onCaptured={setDescriptor} purpose="registration" />{register.isError && <InlineError message="Registration was not accepted by the service." />}<button disabled={register.isPending || !descriptor} data-testid="button-submit-voter" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-50">{register.isPending ? 'Registering…' : 'Register voter'} <ShieldCheck size={15} /></button></form></Modal>;
}

function VerifyModal({ voter, close }: { voter: Voter; close: () => void }) {
  const verify = useVerifyVoter();
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [result, setResult] = useState<{ verified: boolean; distance: number; threshold: number; message?: string } | null>(null);
  const submit = (event: FormEvent) => { event.preventDefault(); if (!descriptor) return; verify.mutate({ id: voter.id, data: { descriptor } }, { onSuccess: (data) => setResult(data) }); };
  return <Modal title={`Verify ${voter.displayName}`} close={close}><div className="mb-5 flex items-center gap-3 rounded-xl bg-secondary p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-card font-mono text-[10px] font-bold text-primary">{initials(voter.displayName)}</span><div><div className="text-sm font-semibold">{voter.displayName}</div><div className="font-mono text-[9px] text-muted-foreground">{voter.identifier}</div></div></div>{result ? <div className={`rounded-2xl p-5 text-center ${result.verified ? 'bg-[#e8f3eb] text-[#236448]' : 'bg-[#fff0ed] text-[#a43b32]'}`}>{result.verified ? <CheckCircle2 className="mx-auto" size={30} /> : <XCircle className="mx-auto" size={30} />}<h3 className="mt-3 font-display text-xl font-semibold">{result.verified ? 'Identity verified' : 'Verification did not match'}</h3><p className="mt-2 text-xs opacity-80">{result.message ?? `Distance ${result.distance} · threshold ${result.threshold}`}</p><button type="button" data-testid="button-close-verification-result" onClick={close} className="mt-5 rounded-lg bg-current/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em]">Done</button></div> : <form onSubmit={submit} className="space-y-5"><FaceCapture onCaptured={setDescriptor} purpose="verification" />{verify.isError && <InlineError message="The verification service did not respond." />}<button disabled={verify.isPending || !descriptor} data-testid="button-submit-verification" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground disabled:opacity-50">{verify.isPending ? 'Comparing face…' : 'Run verification'} <Fingerprint size={15} /></button></form>}</Modal>;
}

function FaceCapture({ onCaptured, purpose }: { onCaptured: (descriptor: number[]) => void; purpose: 'registration' | 'verification' }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permission, setPermission] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [models, setModels] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [capture, setCapture] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setError('');
    setPermission('requesting');
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission('denied');
      setError('This browser does not support camera access.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermission('granted');
      setModels('loading');
      const api = await loadFaceApi();
      await Promise.all([
        api.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL),
        api.nets.faceLandmark68Net.loadFromUri(FACE_API_MODEL_URL),
        api.nets.faceRecognitionNet.loadFromUri(FACE_API_MODEL_URL),
      ]);
      setModels('ready');
    } catch (cause) {
      stopCamera();
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') {
        setPermission('denied');
        setModels('idle');
        setError('Camera permission was denied. Allow camera access and try again.');
      } else {
        setPermission('granted');
        setModels('error');
        setError('Camera or face models could not be started. Check your connection and try again.');
      }
    }
  };

  const captureFace = async () => {
    if (!window.faceapi || !videoRef.current || models !== 'ready') return;
    setCapture('capturing');
    setError('');
    try {
      const options = new window.faceapi.TinyFaceDetectorOptions({ inputSize:  TinyFaceDetectorInputSize, scoreThreshold: 0.5 });
      const detection = await window.faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks().withFaceDescriptor();
      if (!detection) throw new Error('No face found. Center your face in the frame and try again.');
      onCaptured(Array.from(detection.descriptor));
      setCapture('success');
    } catch (cause) {
      setCapture('error');
      setError(cause instanceof Error ? cause.message : 'Face capture failed. Try again in better lighting.');
    }
  };

  return <div className="space-y-3 rounded-2xl border border-border bg-secondary/45 p-3" data-testid={`face-capture-${purpose}`}>
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-sidebar">
      <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${permission === 'granted' ? '' : 'hidden'}`} aria-label="Live camera preview" />
      {permission !== 'granted' && <div className="flex h-full flex-col items-center justify-center px-5 text-center text-sidebar-foreground/70"><Camera size={28} className="mb-2 text-sidebar-primary" /><p className="text-xs">Camera access is required to capture a face sample.</p></div>}
      {permission === 'granted' && <div className="pointer-events-none absolute inset-6 rounded-[45%] border border-sidebar-primary/80" />}
      {capture === 'capturing' && <div className="absolute inset-0 flex items-center justify-center bg-sidebar/50 text-sidebar-foreground"><LoaderCircle className="animate-spin" size={28} /></div>}
    </div>
    {permission === 'idle' && <button type="button" data-testid={`button-start-camera-${purpose}`} onClick={startCamera} className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/35 bg-card px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-primary hover:border-primary"><Video size={15} /> Allow camera access</button>}
    {permission === 'requesting' && <p className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle size={14} className="animate-spin" /> Requesting camera permission…</p>}
    {permission === 'denied' && <button type="button" data-testid={`button-retry-permission-${purpose}`} onClick={startCamera} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] hover:border-primary hover:text-primary">Try camera access again</button>}
    {permission === 'granted' && models === 'loading' && <p className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle size={14} className="animate-spin" /> Loading face verification models…</p>}
    {permission === 'granted' && models === 'ready' && <button type="button" data-testid={`button-capture-face-${purpose}`} onClick={captureFace} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground hover:-translate-y-0.5"><Camera size={15} /> {capture === 'success' ? 'Capture again' : 'Capture face sample'}</button>}
    {models === 'error' && <><InlineError message="Face verification models are unavailable. Check your connection and try again." /><button type="button" data-testid={`button-retry-camera-${purpose}`} onClick={startCamera} className="w-full rounded-xl border border-border bg-card px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] hover:border-primary hover:text-primary">Retry camera and models</button></>}
    {capture === 'success' && <p className="text-xs font-semibold text-[#236448]">Face sample captured locally. Only its mathematical descriptor will be sent for {purpose}.</p>}
    {error && capture !== 'error' && models !== 'error' && <p className="text-xs text-[#a43b32]">{error}</p>}
    {capture === 'error' && <p className="text-xs text-[#a43b32]">{error}</p>}
  </div>;
}

const TinyFaceDetectorInputSize = 416;

function LedgerPage() {
  const ledger = useGetLedgerStatus();
  const activity = useGetActivity();
  return <div className="matsetu-rise"><PageIntro eyebrow="Audit infrastructure" title="Ledger monitor" detail="Understand the local Hardhat connection, contract readiness, and the events committed to your audit trail." action={<button data-testid="button-refresh-ledger" onClick={() => { ledger.refetch(); activity.refetch(); }} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] hover:border-primary hover:text-primary"><RefreshCw size={15} /> Refresh status</button>} />
    {ledger.isLoading ? <Skeleton className="h-64" /> : ledger.isError || !ledger.data ? <ErrorState retry={() => ledger.refetch()} detail="The local ledger connection could not be inspected." /> : <LedgerPanel ledger={ledger.data} />}
    <section className="mt-6 rounded-2xl border border-border bg-card shadow-sm"><div className="border-b border-border px-5 py-4"><h2 className="font-display text-lg font-semibold">Ledger activity</h2><p className="mt-1 text-xs text-muted-foreground">Recent events that can be traced back to the local chain.</p></div><ActivityList activity={activity.data} loading={activity.isLoading} error={activity.isError} retry={() => activity.refetch()} /></section>
  </div>;
}

function LedgerPanel({ ledger }: { ledger: LedgerStatus }) {
  const contractReady = ledger.contractStatus === 'deployed';
  const stats: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: 'Network', value: ledger.network, icon: Network },
    { label: 'Block height', value: ledger.blockNumber.toLocaleString(), icon: Blocks },
    { label: 'Response time', value: `${ledger.latencyMs} ms`, icon: Gauge },
    { label: 'RPC endpoint', value: ledger.rpcUrl, icon: Database },
  ];
  return <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"><div className="border-b border-border bg-sidebar p-6 text-sidebar-foreground md:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-primary"><Database size={14} /> Local Hardhat connection</div><h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">The record is {contractReady ? 'anchored.' : 'not ready yet.'}</h2><p className="mt-2 max-w-lg text-xs leading-5 text-sidebar-foreground/60">{contractReady ? 'The election contract is deployed and accepting verifiable events.' : 'Contract deployment must complete before ledger-backed operations can be trusted.'}</p></div><StatusPill value={ledger.contractStatus} /></div></div><div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">{stats.map(({ label, value, icon: Icon }) => <div key={label} className="bg-card p-5"><div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground"><Icon size={13} /> {label}</div><div data-testid={`ledger-${label.toLowerCase().replaceAll(' ', '-')}`} className="mt-4 truncate font-display text-xl font-semibold tracking-[-0.03em]">{value}</div></div>)}</div></div>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/55 p-4 backdrop-blur-sm"><div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl matsetu-scrollbar"><div className="mb-6 flex items-center justify-between"><div><div className="font-mono text-[9px] uppercase tracking-[0.16em] text-primary">Operator action</div><h2 className="mt-1 font-display text-2xl font-semibold tracking-[-0.03em]">{title}</h2></div><button aria-label="Close dialog" data-testid="button-close-dialog" onClick={close} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"><X size={18} /></button></div>{children}</div></div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold">{label}</span>{children}{hint && <span className="mt-2 block text-[10px] leading-4 text-muted-foreground">{hint}</span>}</label>;
}

function InlineError({ message }: { message: string }) {
  return <div className="flex items-center gap-2 rounded-lg bg-[#fff0ed] px-3 py-2 text-xs text-[#a43b32]"><CircleAlert size={14} />{message}</div>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <AppShell><RoutedErrorBoundary><Switch><Route path="/" component={Dashboard} /><Route path="/elections" component={ElectionsPage} /><Route path="/elections/:id" component={ElectionDetail} /><Route path="/voters" component={VotersPage} /><Route path="/ledger" component={LedgerPage} /><Route component={NotFound} /></Switch></RoutedErrorBoundary></AppShell>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;