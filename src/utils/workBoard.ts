/**
 * Rules for the Work area: which column an item sits in, what needs a person's attention, how a claim's lease and
 * an agent's last sign of life read, and how a Ductape component is named. Pure functions, no React.
 */

export type WorkStatus =
  | 'backlog'
  | 'ready'
  | 'claimed'
  | 'in_progress'
  | 'in_review'
  | 'blocked'
  | 'awaiting_approval'
  | 'done'
  | 'cancelled';

export interface IWorkComponent {
  type: string;
  tag: string;
  planned?: boolean;
}

export type ArtifactKind = 'commit' | 'pull_request' | 'component' | 'release' | 'deployment' | 'document' | 'test_report' | 'build' | 'file' | 'link';

export interface IWorkArtifact {
  kind: ArtifactKind;
  ref: string;
  url: string | null;
  title: string | null;
  meta: Record<string, string | number | boolean> | null;
  at: string;
  by: { type: 'user' | 'agent'; user_id: string; agent_id: string | null } | null;
  /** How Ductape knows it: checked against its own records, run by its CLI, or reported by someone. */
  source?: ArtifactSource;
  /** A checked deployment's state now, read from Deploy; `meta` keeps what it was when recorded. */
  current?: { state: string; traffic_percent: number; release: string; at: string | null };
}

export type ArtifactSource = 'ductape' | 'ductape_cli' | 'reported';

/** A person's decision on work that waited for approval. */
export interface IWorkApproval {
  decision: 'approved' | 'changes_requested';
  note: string | null;
  at: string;
  by: { type: 'user' | 'agent'; user_id: string; agent_id: string | null } | null;
}

/** Open work that may be the same as work just created, and why. */
export interface ISimilarWork {
  ref: string;
  title: string;
  status: WorkStatus;
  reason: string;
}

export interface IWorkItem {
  id: string;
  ref: string;
  number: number;
  title: string;
  body: string;
  kind: 'epic' | 'task' | 'subtask';
  status: WorkStatus;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  product: string;
  env: string | null;
  parent_id: string | null;
  assignee: { type: 'user' | 'agent'; id: string } | null;
  labels: string[];
  paths: string[];
  components: IWorkComponent[];
  /** What the work delivered. */
  artifacts?: IWorkArtifact[];
  /** Only on the answer to creating it. */
  similar?: ISimilarWork[];
  /** A person's decisions when it waited for approval, oldest first. */
  approvals?: IWorkApproval[];
  critical: boolean;
  source: string;
  plan_key: string | null;
  outcome: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface IWorkSession {
  id: string;
  agent: { id: string; client: string; name: string | null; machine: string; repo: string } | null;
  user_id: string;
  /** The person the agent works for. */
  owner?: { name: string; full_name: string } | null;
  /** How the agent reached Ductape, and the client name it gave there (evidence, not proof). */
  via?: 'mcp' | 'hook' | 'cli';
  client_name?: string | null;
  product: string | null;
  repo: string;
  branch: string | null;
  started_at: string;
  heartbeat_at: string;
  state: 'active' | 'offline';
  working_on: Array<{ item_id: string; ref: string | null; title: string | null; status: string | null; paths: string[]; expires_at: string }>;
}

export interface IWorkProduct {
  id: string;
  tag: string;
  name: string;
  envs: string[];
  components: Record<string, string[]>;
  /** Work not yet done or cancelled. */
  open_items: number;
}

/** The product the Work area opens on: the one remembered, else the one with the most open work, else the first. */
export function defaultProduct(products: IWorkProduct[], remembered: string | null): string | undefined {
  if (remembered && products.some((p) => p.tag === remembered)) return remembered;
  const busiest = [...products].sort((a, b) => b.open_items - a.open_items)[0];
  return busiest?.tag;
}

export type ColumnId = 'backlog' | 'ready' | 'working' | 'review' | 'attention' | 'done';

export interface IColumn {
  id: ColumnId;
  label: string;
  hint: string;
  statuses: WorkStatus[];
}

/** The board's columns, left to right. Blocked and waiting-for-approval work share one column: both need a person. */
export const COLUMNS: IColumn[] = [
  { id: 'backlog', label: 'Backlog', hint: 'Waiting on other work, or not planned yet', statuses: ['backlog'] },
  { id: 'ready', label: 'Ready', hint: 'Nothing blocks it; anyone may pick it up', statuses: ['ready'] },
  { id: 'working', label: 'In progress', hint: 'Claimed by a person or an agent', statuses: ['claimed', 'in_progress'] },
  { id: 'review', label: 'In review', hint: 'Waiting on a review', statuses: ['in_review'] },
  { id: 'attention', label: 'Needs a person', hint: 'Blocked, or a critical item waiting for approval', statuses: ['blocked', 'awaiting_approval'] },
  { id: 'done', label: 'Done', hint: 'Finished in the last 14 days', statuses: ['done'] },
];

const PRIORITY_ORDER: Record<IWorkItem['priority'], number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const DONE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Items grouped into the board's columns. Epics group work and are shown as the plan picker, not as cards; cancelled
 * work is left out; done work older than 14 days drops off. Within a column: priority, then oldest first, except Done,
 * which is newest first.
 */
export function groupIntoColumns(items: IWorkItem[], now = Date.now()): Record<ColumnId, IWorkItem[]> {
  const out = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as IWorkItem[]])) as Record<ColumnId, IWorkItem[]>;
  for (const item of items) {
    if (item.kind === 'epic' || item.status === 'cancelled') continue;
    const column = COLUMNS.find((c) => c.statuses.includes(item.status));
    if (!column) continue;
    if (column.id === 'done' && now - Date.parse(item.completed_at ?? item.updated_at) > DONE_WINDOW_MS) continue;
    out[column.id].push(item);
  }
  for (const column of COLUMNS) {
    out[column.id].sort((a, b) =>
      column.id === 'done'
        ? Date.parse(b.completed_at ?? b.updated_at) - Date.parse(a.completed_at ?? a.updated_at)
        : PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || Date.parse(a.created_at) - Date.parse(b.created_at),
    );
  }
  return out;
}

export type Tone = 'good' | 'warn' | 'bad' | 'neutral';

export interface ISummary {
  ready: number;
  working: number;
  blocked: number;
  awaitingApproval: number;
  doneThisWeek: number;
  activeAgents: number;
  offlineAgents: number;
  /** The headline for the Work area's status line. */
  label: string;
  tone: Tone;
}

/** What the header says about the product's work: anything that needs a person comes first. */
export function summarise(items: IWorkItem[], sessions: IWorkSession[], now = Date.now()): ISummary {
  const count = (s: WorkStatus[]) => items.filter((i) => i.kind !== 'epic' && s.includes(i.status)).length;
  const blocked = count(['blocked']);
  const awaitingApproval = count(['awaiting_approval']);
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const summary = {
    ready: count(['ready']),
    working: count(['claimed', 'in_progress', 'in_review']),
    blocked,
    awaitingApproval,
    doneThisWeek: items.filter((i) => i.status === 'done' && Date.parse(i.completed_at ?? i.updated_at) >= weekAgo).length,
    activeAgents: sessions.filter((s) => s.state === 'active').length,
    offlineAgents: sessions.filter((s) => s.state === 'offline').length,
  };
  const needs = blocked + awaitingApproval;
  if (awaitingApproval) {
    return { ...summary, tone: 'warn', label: `${awaitingApproval} waiting for your approval${blocked ? `, ${blocked} blocked` : ''}` };
  }
  if (blocked) return { ...summary, tone: 'warn', label: `${blocked} blocked` };
  if (summary.offlineAgents) return { ...summary, tone: 'warn', label: `${summary.offlineAgents} agent session${summary.offlineAgents > 1 ? 's' : ''} stopped answering` };
  if (!needs && summary.working) return { ...summary, tone: 'good', label: `${summary.working} in progress, nothing needs you` };
  return { ...summary, tone: 'neutral', label: summary.ready ? `${summary.ready} ready to pick up` : 'No open work' };
}

/** "4m left", "expired": how long a claim lasts without another sign of life. */
export function leaseLeft(expiresAt: string, now = Date.now()): string {
  const ms = Date.parse(expiresAt) - now;
  if (ms <= 0) return 'expired';
  const min = Math.ceil(ms / 60_000);
  return `${min}m left`;
}

/** "just now", "3m ago", "2h ago", "4d ago". */
export function ago(at: string | null | undefined, now = Date.now()): string {
  if (!at) return '';
  const s = Math.max(0, Math.round((now - Date.parse(at)) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86_400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86_400)}d ago`;
}

const CLIENT_NAMES: Record<string, string> = { 'claude-code': 'Claude Code', codex: 'Codex', cursor: 'Cursor', other: 'Agent' };

/** The name an agent client is shown under. */
export const clientName = (client: string | undefined | null): string => CLIENT_NAMES[client ?? ''] ?? 'Agent';

/** An agent as the board names it: its client and the person it works for. */
export interface IAgentInfo {
  client: string;
  owner: { id: string; name: string } | null;
}

/** Every agent the page knows of, from open sessions and from the items' own agent directory. */
export function agentDirectory(sessions: IWorkSession[], fromItems: Record<string, IAgentInfo> = {}): Map<string, IAgentInfo> {
  const out = new Map<string, IAgentInfo>(Object.entries(fromItems));
  for (const s of sessions) {
    if (!s.agent) continue;
    out.set(s.agent.id, { client: s.agent.client, owner: s.owner ? { id: s.user_id, name: s.owner.name } : out.get(s.agent.id)?.owner ?? null });
  }
  return out;
}

/** "Your Claude Code", "Ada's Claude Code", or just "Claude Code" when the person is not known. */
export function agentLabel(info: IAgentInfo | undefined, meId?: string, client?: string | null): string {
  const name = clientName(info?.client ?? client);
  if (!info?.owner) return name;
  if (meId && info.owner.id === meId) return `Your ${name}`;
  return `${info.owner.name}${info.owner.name.endsWith('s') ? "'" : "'s"} ${name}`;
}

/** How an agent session reached Ductape, as shown beside it. */
export function viaLabel(session: Pick<IWorkSession, 'via' | 'client_name'>): string {
  const how = session.via === 'mcp' ? 'MCP' : session.via === 'hook' ? 'hooks' : 'the CLI';
  return session.client_name ? `via ${how} (${session.client_name})` : `via ${how}`;
}

/**
 * Sessions worth a row: working, or holding work. One that stopped answering with nothing claimed is quiet: a closed
 * window, kept out of the way until Ductape ends it after an hour.
 */
export function splitSessions<T extends Pick<IWorkSession, 'state' | 'working_on'>>(sessions: T[]): { live: T[]; quiet: T[] } {
  const live: T[] = [];
  const quiet: T[] = [];
  for (const s of sessions) (s.state === 'offline' && !s.working_on.length ? quiet : live).push(s);
  return { live, quiet };
}

/** The line under an agent's name: the name it was given when that says more than the label, and its machine. */
export function agentWhere(agent: { name: string | null; machine: string } | null, label: string): string {
  if (!agent) return '';
  // A default name ("Ada's Cursor") says nothing the label does not; a given one ("refunds bot") does.
  const client = label.replace(/^(Your |.*?'s? )/, '');
  const given = agent.name && agent.name !== label && !agent.name.endsWith(`'s ${client}`) && !agent.name.endsWith(`' ${client}`) ? agent.name : null;
  return [given, agent.machine].filter(Boolean).join(' · ');
}

export const SOURCE_LABEL: Record<ArtifactSource, string> = {
  ductape: 'Checked by Ductape',
  ductape_cli: 'Run by the Ductape CLI',
  reported: 'Reported',
};

/** A ref short enough for one line: hashes and ids cut down, a test run named by its commit and time. */
export function shortRef(a: Pick<IWorkArtifact, 'kind' | 'ref'>): string {
  const ref = a.ref;
  if (a.kind === 'test_report' && ref.includes(' @ ')) return ref.slice(ref.lastIndexOf(' @ ') + 3).replace(/T(\d\d:\d\d):\d\dZ$/, ' $1 UTC');
  const hash = /^(sha256:)?([a-f0-9]{16,})$/i.exec(ref);
  if (hash) return `${hash[1] ?? ''}${hash[2].slice(0, 12)}`;
  return ref.length > 60 ? `${ref.slice(0, 57)}...` : ref;
}

/** An artifact's details in words: "47 passed, 1 failed", "prd, live, 100% of traffic". */
export function artifactDetail(a: Pick<IWorkArtifact, 'kind' | 'meta' | 'current'>): string {
  const m = a.meta ?? {};
  if (a.kind === 'deployment' && a.current) {
    const now = `${a.current.state.replace(/_/g, ' ')}, ${a.current.traffic_percent}% of traffic`;
    const then = `${String(m.state ?? '').replace(/_/g, ' ')}, ${m.traffic_percent}% of traffic`;
    if (now === then) return [m.env, now].filter(Boolean).join(', ');
    return [m.env, `now ${a.current.state.replace(/_/g, ' ')} at ${a.current.traffic_percent}%`, `was ${String(m.state ?? '').replace(/_/g, ' ')} at ${m.traffic_percent}%`].filter(Boolean).join(', ');
  }
  if (a.kind === 'test_report' && m.passed !== undefined) return `${m.passed} passed, ${m.failed ?? 0} failed${m.result === 'failed' && !Number(m.failed) ? ` (exit ${m.exit_code})` : ''}`;
  if (a.kind === 'test_report' && m.result) return m.result === 'passed' ? 'passed' : `failed (exit ${m.exit_code})`;
  if (a.kind === 'deployment') return [m.env, m.state, m.traffic_percent !== undefined ? `${m.traffic_percent}% of traffic` : null].filter((v) => v !== undefined && v !== null && v !== '').join(', ');
  if (a.kind === 'build' && m.status) return String(m.status);
  if (a.kind === 'release' && m.version) return m.deployable === 'service' ? 'service' : '';
  return Object.entries(m).map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(', ');
}

/** How a component reads on a chip: its type and tag, as the SDK and the CLI name it. */
export const componentLabel = (c: IWorkComponent): string => `${c.type}:${c.tag}`;

/** The order component chips are shown in: what the work creates last, otherwise by type. */
export function sortComponents(components: IWorkComponent[]): IWorkComponent[] {
  return [...components].sort((a, b) => Number(Boolean(a.planned)) - Number(Boolean(b.planned)) || a.type.localeCompare(b.type) || a.tag.localeCompare(b.tag));
}

/** Parses the "type:tag" list a person types when creating work; "+" at the end marks one the work will create. */
export function parseComponentList(text: string): IWorkComponent[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const at = s.indexOf(':');
      const planned = s.endsWith('+');
      const tag = (at > 0 ? s.slice(at + 1) : '').replace(/\+$/, '').trim();
      return { type: at > 0 ? s.slice(0, at).trim() : s, tag, planned };
    });
}

export interface IGraphNode {
  id: string;
  ref: string;
  title: string;
  status: WorkStatus;
  x: number;
  y: number;
}

/**
 * Positions for an execution graph of a plan: each item sits one column right of the latest item it waits on, so
 * the graph reads left to right in the order work can happen. Rows within a column follow the plan's order.
 */
export function layoutGraph(items: IWorkItem[], edges: Array<{ from: string; to: string }>, cell = { w: 260, h: 110 }): IGraphNode[] {
  const work = items.filter((i) => i.kind !== 'epic');
  const ids = new Set(work.map((i) => i.id));
  const incoming = new Map<string, string[]>();
  for (const e of edges) if (ids.has(e.from) && ids.has(e.to)) incoming.set(e.to, [...(incoming.get(e.to) ?? []), e.from]);
  const depth = new Map<string, number>();
  const visit = (id: string, seen: Set<string>): number => {
    if (depth.has(id)) return depth.get(id) as number;
    if (seen.has(id)) return 0;
    seen.add(id);
    const d = Math.max(-1, ...(incoming.get(id) ?? []).map((p) => visit(p, seen))) + 1;
    depth.set(id, d);
    return d;
  };
  for (const i of work) visit(i.id, new Set());
  const rows = new Map<number, number>();
  return [...work]
    .sort((a, b) => a.number - b.number)
    .map((i) => {
      const col = depth.get(i.id) ?? 0;
      const row = rows.get(col) ?? 0;
      rows.set(col, row + 1);
      return { id: i.id, ref: i.ref, title: i.title, status: i.status, x: col * cell.w, y: row * cell.h };
    });
}

/** Counters for a product's Work entry: work not finished, and how much of it needs a person. */
export function workTotals(items: IWorkItem[]): { open: number; attention: number } {
  const work = items.filter((i) => i.kind !== 'epic' && i.status !== 'done' && i.status !== 'cancelled');
  return { open: work.length, attention: work.filter((i) => i.status === 'blocked' || i.status === 'awaiting_approval').length };
}

/** Ids of everything under an item: its subtasks, theirs, and so on. */
export function descendantIds(items: IWorkItem[], rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const i of items) if (i.parent_id) children.set(i.parent_id, [...(children.get(i.parent_id) ?? []), i.id]);
  const out = new Set<string>();
  const stack = [...(children.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop() as string;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(children.get(id) ?? []));
  }
  return out;
}

export interface IEpicSummary {
  epic: IWorkItem;
  total: number;
  done: number;
  working: number;
  attention: number;
  /** Done out of everything not cancelled, 0 to 1. */
  progress: number;
}

/** Every epic with how far its work has got, unfinished epics first, then by most work left. */
export function epicSummaries(items: IWorkItem[]): IEpicSummary[] {
  return items
    .filter((i) => i.kind === 'epic' && i.status !== 'cancelled')
    .map((epic) => {
      const ids = descendantIds(items, epic.id);
      const work = items.filter((i) => ids.has(i.id) && i.kind !== 'epic' && i.status !== 'cancelled');
      const done = work.filter((i) => i.status === 'done').length;
      return {
        epic,
        total: work.length,
        done,
        working: work.filter((i) => ['claimed', 'in_progress', 'in_review'].includes(i.status)).length,
        attention: work.filter((i) => i.status === 'blocked' || i.status === 'awaiting_approval').length,
        progress: work.length ? done / work.length : 0,
      };
    })
    .sort((a, b) => Number(a.total > 0 && a.done === a.total) - Number(b.total > 0 && b.done === b.total) || (b.total - b.done) - (a.total - a.done));
}

const ARTIFACT_ORDER: ArtifactKind[] = ['component', 'release', 'deployment', 'pull_request', 'commit', 'test_report', 'build', 'document', 'file', 'link'];
export const ARTIFACT_LABEL: Record<ArtifactKind, string> = {
  component: 'Ductape components',
  release: 'Releases',
  deployment: 'Deployments',
  pull_request: 'Pull requests',
  commit: 'Commits',
  test_report: 'Test reports',
  build: 'Builds',
  document: 'Documents',
  file: 'Files',
  link: 'Links',
};

/**
 * What a piece of work delivered, grouped by kind in the order a reader cares about: the product's components first,
 * then what shipped, then the code, then the evidence. For an epic, pass its own artifacts and those of all its work;
 * each entry keeps the ref of the item that produced it.
 */
export function groupArtifacts(sources: Array<{ ref: string; artifacts?: IWorkArtifact[] }>): Array<{ kind: ArtifactKind; label: string; entries: Array<IWorkArtifact & { from: string }> }> {
  const byKind = new Map<ArtifactKind, Array<IWorkArtifact & { from: string }>>();
  const seen = new Set<string>();
  for (const s of sources) {
    for (const a of s.artifacts ?? []) {
      const key = `${a.kind}|${a.ref}`;
      if (seen.has(key)) continue;
      seen.add(key);
      byKind.set(a.kind, [...(byKind.get(a.kind) ?? []), { ...a, from: s.ref }]);
    }
  }
  return ARTIFACT_ORDER.filter((k) => byKind.has(k)).map((kind) => ({ kind, label: ARTIFACT_LABEL[kind], entries: byKind.get(kind)! }));
}

/** How long something has waited, in the largest whole unit: "12m", "3h", "2d". */
export function waited(since: string, now = Date.now()): string {
  const m = Math.max(0, Math.floor((now - Date.parse(since)) / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h}h` : `${Math.floor(h / 24)}d`;
}
