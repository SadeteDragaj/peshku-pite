/* Manager board: Sot (today's money) · Stafi (add / edit / remove) · Tavolinat (table → waiter) · Vlerësimet (reviews).
 * The "Sot" tab refreshes live from the shared order socket. */

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../../lib/api";
import { toDate } from "../../lib/time";
import { StaffHeader, connectOrderSocket, currentUserId } from "../staff/StaffShell";
import type { DaySummary, ManagerTable, ReviewsOverview, StaffMember, StaffRole } from "./types";

type Tab = "today" | "staff" | "tables" | "reviews";

const TABS: [Tab, string][] = [
  ["today", "Sot"],
  ["staff", "Stafi"],
  ["tables", "Tavolinat"],
  ["reviews", "Vlerësimet"],
];

const ROLE_LABEL: Record<StaffRole, string> = { waiter: "Kamarier", kitchen: "Kuzhinë", admin: "Menaxher" };

export const eur = (n: number) => `€${n.toFixed(2)}`;
const localIsoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const WEEKDAY = ["Di", "Hë", "Ma", "Më", "En", "Pr", "Sh"];
const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()}`;
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Diçka shkoi keq");

export default function ManagerBoard() {
  const [tab, setTab] = useState<Tab>("today");
  const [connected, setConnected] = useState(false);
  // Bumped on every live order/table event so the open tab can refetch
  const [tick, setTick] = useState(0);

  useEffect(
    () =>
      connectOrderSocket((evt) => {
        const e = String(evt?.event ?? "");
        if (e.startsWith("order") || e.startsWith("table") || e.startsWith("service_request") || e === "staff_changed") {
          setTick((t) => t + 1);
        }
      }, setConnected),
    [],
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-cream text-brand-ink">
      <StaffHeader title="Stafi" connected={connected} />
      <nav className="scroll-thin flex flex-none gap-1 overflow-x-auto border-b border-brand-line bg-brand-paper px-3 py-2 md:px-6" aria-label="Seksionet e menaxherit">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`h-11 flex-none rounded-xl px-4 text-base font-bold md:px-5 ${tab === id ? "bg-brand-ink text-brand-paper" : "text-brand-muted hover:bg-brand-inset"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-5">
        {tab === "today" && <Today tick={tick} />}
        {tab === "staff" && <Staff tick={tick} />}
        {tab === "tables" && <Tables tick={tick} />}
        {tab === "reviews" && <Reviews />}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ shared bits */

function useLoad<T>(path: string, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(
    () =>
      api.get<T>(path).then(
        (d) => {
          setData(d);
          setError(null);
        },
        (e) => setError(errMsg(e)),
      ),
    [path],
  );
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, ...deps]);
  return { data, error, setError, reload };
}

function Card({ title, aside, children, className = "" }: { title?: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 rounded-[22px] border border-brand-line bg-brand-paper p-4 md:p-5 ${className}`}>
      {title && (
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

function ErrorNote({ text }: { text: string | null }) {
  if (!text) return null;
  return <p role="alert" className="rounded-xl bg-brand-orange-tint px-4 py-3 text-sm font-semibold text-brand-orange-deep">{text}</p>;
}

function Stat({ label, value, sub, hero = false }: { label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-[18px] p-4 ${hero ? "bg-brand-ink text-brand-paper" : "border border-brand-line bg-brand-paper"}`}>
      <span className={`text-sm font-semibold ${hero ? "text-[#A5CFC8]" : "text-brand-muted2"}`}>{label}</span>
      <span className={`font-display font-extrabold tabular-nums ${hero ? "text-[36px] leading-none md:text-[44px]" : "text-[24px] leading-tight md:text-[28px]"}`}>{value}</span>
      {sub && <span className={`text-sm ${hero ? "text-[#D2E4DF]" : "text-brand-muted"}`}>{sub}</span>}
    </div>
  );
}

/** Single-series bar chart: one teal, 4px rounded tops on the baseline, hover tooltip per bar,
 *  only the peak bar labelled directly. */
function Bars({ data, label }: { data: { key: string; label: string; value: number; detail: string }[]; label: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  const peak = data.find((d) => d.value === max && max > 0)?.key;
  if (max === 0) return <p className="py-10 text-center text-brand-muted">Ende pa shitje.</p>;
  return (
    <div role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${d.detail}`).join("; ")}`}>
      <div className="relative flex h-44 items-end gap-[2px] border-b border-brand-line">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-brand-hair" />
        <span className="pointer-events-none absolute -top-2.5 right-0 bg-brand-paper pl-1 text-xs text-brand-faint">{eur(max)}</span>
        {data.map((d) => (
          <div
            key={d.key}
            className="relative flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(d.key)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover(d.key)}
          >
            <div
              className={`w-full rounded-t ${hover && hover !== d.key ? "bg-brand-chart/40" : "bg-brand-chart"}`}
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 0 }}
            />
            {(hover === d.key || (!hover && d.key === peak)) && (
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-brand-ink px-2.5 py-1.5 text-xs font-semibold text-brand-paper shadow">
                {hover === d.key ? `${d.label} · ${d.detail}` : eur(d.value)}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[11px] text-brand-muted2">
        {data.map((d, i) => (
          <span key={d.key} className="flex-1 text-center">
            {data.length <= 8 || i % 2 === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Sot */

function Today({ tick }: { tick: number }) {
  const [day, setDay] = useState(localIsoDate());
  const { data: s, error } = useLoad<DaySummary>(`/manager/summary?day=${day}`, [tick]);
  const isToday = day === localIsoDate();

  // Hours from first to last sale (at least 10:00–23:00), so quiet hours show as gaps
  const hours = s?.by_hour ?? [];
  const from = Math.min(10, ...hours.map((h) => h.hour));
  const to = Math.max(23, ...hours.map((h) => h.hour));
  const hourBars = Array.from({ length: to - from + 1 }, (_, i) => {
    const h = hours.find((x) => x.hour === from + i);
    return {
      key: String(from + i),
      label: `${from + i}`,
      value: h?.revenue ?? 0,
      detail: `${eur(h?.revenue ?? 0)} · ${h?.orders ?? 0} porosi`,
    };
  });

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold">{isToday ? "Sot" : dayLabel(day)}</h1>
        <input
          type="date"
          value={day}
          max={localIsoDate()}
          onChange={(e) => e.target.value && setDay(e.target.value)}
          aria-label="Zgjidh ditën"
          className="h-11 rounded-xl border border-brand-line2 bg-brand-paper px-3 font-semibold"
        />
        {!isToday && (
          <button onClick={() => setDay(localIsoDate())} className="h-11 rounded-xl bg-brand-chip px-4 font-semibold">
            Kthehu te sot
          </button>
        )}
      </div>
      <ErrorNote text={error} />
      {s && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="col-span-2">
              <Stat hero label={isToday ? "Fitimi sot (shitjet)" : "Shitjet e ditës"} value={eur(s.revenue)} sub={`${s.orders} porosi · mesatarisht ${eur(s.avg_order)}`} />
            </div>
            <Stat label="Pjata & pije të shitura" value={String(s.items_sold)} sub={`${s.tabs} grupe mysafirësh`} />
            <Stat
              label="Vlerësimi"
              value={s.avg_rating != null ? `${s.avg_rating.toFixed(1)} ★` : "–"}
              sub={`${s.reviews} vlerësime`}
            />
            <Stat label="Porosi të hapura tani" value={String(s.open_orders)} sub="në kuzhinë ose për t'u shërbyer" />
            <Stat label="Kërkesa në pritje" value={String(s.open_requests)} sub="kamarier / ujë / llogari" />
            <Stat label="Anuluar" value={String(s.voided_orders)} sub={s.voided_value > 0 ? `${eur(s.voided_value)} jo të llogaritura` : "asgjë e anuluar"} />
            <Stat label="Mesatarja për porosi" value={eur(s.avg_order)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Shitjet sipas orës">
              <Bars data={hourBars} label="Shitjet sipas orës" />
            </Card>
            <Card title="7 ditët e fundit">
              <Bars
                label="Shitjet 7 ditët e fundit"
                data={s.last_7_days.map((d) => ({
                  key: d.day,
                  label: dayLabel(d.day),
                  value: d.revenue,
                  detail: `${eur(d.revenue)} · ${d.orders} porosi`,
                }))}
              />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Sipas kamarierit">
              {s.by_waiter.length === 0 ? (
                <p className="text-brand-muted">Ende pa shitje.</p>
              ) : (
                <table className="w-full text-left">
                  <thead className="text-xs uppercase tracking-wider text-brand-muted2">
                    <tr>
                      <th className="pb-2 font-bold">Kamarieri</th>
                      <th className="pb-2 text-right font-bold">Porosi</th>
                      <th className="pb-2 text-right font-bold">Shitjet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.by_waiter.map((w) => (
                      <tr key={w.waiter_id ?? "none"} className="border-t border-brand-hair">
                        <td className="py-2.5 font-semibold">{w.name || <span className="text-brand-muted">Pa kamarier</span>}</td>
                        <td className="py-2.5 text-right tabular-nums">{w.orders}</td>
                        <td className="py-2.5 text-right font-bold tabular-nums">{eur(w.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
            <Card title="Më të shiturat">
              {s.top_items.length === 0 ? (
                <p className="text-brand-muted">Ende pa shitje.</p>
              ) : (
                <ol className="flex flex-col">
                  {s.top_items.map((it, i) => (
                    <li key={it.name} className="flex items-center gap-3 border-t border-brand-hair py-2.5 first:border-t-0">
                      <span className="w-6 text-right font-display font-extrabold text-brand-muted2">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{it.name}</span>
                      <span className="tabular-nums text-brand-muted">{it.quantity}×</span>
                      <span className="w-20 text-right font-bold tabular-nums">{eur(it.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
          <p className="text-sm text-brand-muted2">
            Shitjet = të gjitha porositë e ditës përveç atyre të anuluara (përfshin porositë që ende s'janë paguar).
          </p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Stafi */

const inputCls = "h-12 rounded-xl border border-brand-line2 bg-brand-inset px-3 text-base outline-none focus:border-brand-teal";

function Staff({ tick }: { tick: number }) {
  const { data: staff, error, setError, reload } = useLoad<StaffMember[]>("/manager/staff", [tick]);
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const me = currentUserId();

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const list = (staff ?? []).filter((m) => showInactive || m.active);
  const inactiveCount = (staff ?? []).filter((m) => !m.active).length;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold">Stafi</h1>
      <ErrorNote text={error} />
      <AddStaff onAdd={(body) => act(() => api.post("/manager/staff", body))} />
      <Card
        title={`Ekipi (${list.length})`}
        aside={
          inactiveCount > 0 && (
            <label className="flex items-center gap-2 text-sm font-semibold text-brand-muted2">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-5 w-5" />
              Shfaq të hequrit ({inactiveCount})
            </label>
          )
        }
      >
        <div className="flex flex-col">
          {list.map((m) => (
            <div key={m.id} className={`flex flex-wrap items-center gap-3 border-t border-brand-hair py-3 first:border-t-0 ${m.active ? "" : "opacity-60"}`}>
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-teal-tint font-display text-lg font-extrabold text-brand-teal-deep">
                {(m.full_name || m.email)[0]?.toUpperCase()}
              </span>
              <span className="flex min-w-[180px] flex-1 flex-col">
                <span className="font-bold">
                  {m.full_name || m.email.split("@")[0]} {m.id === me && <span className="text-sm font-semibold text-brand-muted">(ju)</span>}
                </span>
                <span className="text-sm text-brand-muted2">{m.email}</span>
              </span>
              <span className="rounded-full bg-brand-chip px-3 py-1 text-sm font-bold">{ROLE_LABEL[m.role] ?? m.role}</span>
              <span className="text-sm text-brand-muted2 sm:w-40">
                {m.role === "kitchen" ? "" : m.table_numbers.length ? `Tavolinat ${m.table_numbers.join(", ")}` : "Pa tavolina"}
              </span>
              {m.active ? (
                <>
                  <button onClick={() => setEditing(m)} className="h-11 rounded-xl bg-brand-chip px-4 font-semibold">
                    Ndrysho
                  </button>
                  {m.id !== me && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Ta heq ${m.full_name || m.email}? Nuk do të mund të hyjë më; tavolinat e tij/saj lirohen.`))
                          void act(() => api.del(`/manager/staff/${m.id}`));
                      }}
                      className="h-11 rounded-xl bg-brand-orange-tint px-4 font-semibold text-brand-orange-deep"
                    >
                      Hiq
                    </button>
                  )}
                </>
              ) : (
                <button onClick={() => act(() => api.patch(`/manager/staff/${m.id}`, { active: true }))} className="h-11 rounded-xl bg-brand-teal-tint px-4 font-semibold text-brand-teal-deep">
                  Rikthe
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
      {editing && (
        <EditStaff
          member={editing}
          isMe={editing.id === me}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            await act(() => api.patch(`/manager/staff/${editing.id}`, body));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function AddStaff({ onAdd }: { onAdd: (body: { full_name: string; email: string; password: string; role: StaffRole }) => Promise<void> }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "waiter" as StaffRole });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await onAdd({ ...form, email: form.email.trim() });
    setForm({ full_name: "", email: "", password: "", role: form.role });
  };

  return (
    <Card title="Shto anëtar të stafit">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_160px_auto]">
        <input required placeholder="Emri" aria-label="Emri" value={form.full_name} onChange={set("full_name")} className={inputCls} />
        <input required type="email" placeholder="Email (për hyrje)" aria-label="Email" value={form.email} onChange={set("email")} className={inputCls} />
        <input
          required
          minLength={8}
          type="text"
          placeholder="Fjalëkalimi (min. 8)"
          aria-label="Fjalëkalimi"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          className={inputCls}
        />
        <select aria-label="Roli" value={form.role} onChange={set("role")} className={inputCls}>
          {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <button type="submit" className="h-12 rounded-xl bg-brand-orange px-6 font-extrabold text-brand-ink">
          Shto
        </button>
      </form>
    </Card>
  );
}

function EditStaff({
  member,
  isMe,
  onClose,
  onSave,
}: {
  member: StaffMember;
  isMe: boolean;
  onClose: () => void;
  onSave: (body: Record<string, string>) => Promise<void>;
}) {
  const [name, setName] = useState(member.full_name);
  const [role, setRole] = useState<StaffRole>(member.role);
  const [password, setPassword] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, string> = {};
    if (name.trim() && name.trim() !== member.full_name) body.full_name = name.trim();
    if (role !== member.role) body.role = role;
    if (password) body.password = password;
    void onSave(body);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(24,58,61,.35)] p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-label={`Ndrysho ${member.full_name}`}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-[24px] bg-brand-paper p-6 shadow-2xl"
      >
        <h2 className="font-display text-2xl font-extrabold">Ndrysho: {member.full_name || member.email}</h2>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Emri
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Roli
          <select value={role} disabled={isMe} onChange={(e) => setRole(e.target.value as StaffRole)} className={inputCls}>
            {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Fjalëkalim i ri (bosh = pa ndryshim)
          <input type="text" minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-xl bg-brand-chip px-5 font-semibold">
            Anulo
          </button>
          <button type="submit" className="h-12 rounded-xl bg-brand-orange px-6 font-extrabold text-brand-ink">
            Ruaj
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ Tavolinat */

function Tables({ tick }: { tick: number }) {
  const { data: tables, error, setError, reload } = useLoad<ManagerTable[]>("/manager/tables", [tick]);
  const { data: staff } = useLoad<StaffMember[]>("/manager/staff", [tick]);
  const [bulkWaiter, setBulkWaiter] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const waiters = (staff ?? []).filter((m) => m.active && (m.role === "waiter" || m.role === "admin"));

  const assign = async (tableIds: string[], waiterId: string | null) => {
    setError(null);
    try {
      await Promise.all(tableIds.map((id) => api.put(`/manager/tables/${id}/waiter`, { waiter_id: waiterId })));
      setPicked(new Set());
      await reload();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
      <h1 className="font-display text-3xl font-extrabold">Tavolinat & kamarierët</h1>
      <ErrorNote text={error} />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold">
            {picked.size > 0 ? `${picked.size} tavolina të zgjedhura →` : "Zgjidh disa tavolina (✓) për t'i caktuar njëherësh →"}
          </span>
          <select value={bulkWaiter} onChange={(e) => setBulkWaiter(e.target.value)} aria-label="Kamarieri" className={inputCls}>
            <option value="">Pa kamarier</option>
            {waiters.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name || w.email}
              </option>
            ))}
          </select>
          <button
            disabled={picked.size === 0}
            onClick={() => assign([...picked], bulkWaiter || null)}
            className="h-12 rounded-xl bg-brand-orange px-5 font-extrabold text-brand-ink disabled:opacity-40"
          >
            Cakto
          </button>
          {picked.size > 0 && (
            <button onClick={() => setPicked(new Set())} className="h-12 rounded-xl bg-brand-chip px-4 font-semibold">
              Pastro zgjedhjen
            </button>
          )}
        </div>
        {waiters.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 text-sm">
            {waiters.map((w) => {
              const n = (tables ?? []).filter((t) => t.assigned_waiter_id === w.id).map((t) => t.number);
              return (
                <span key={w.id} className="rounded-full bg-brand-inset px-3 py-1.5">
                  <b>{w.full_name || w.email}</b>: {n.length ? n.join(", ") : "–"}
                </span>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
        {(tables ?? []).map((t) => (
          <div
            key={t.id}
            className={`flex flex-col gap-2.5 rounded-[18px] border-2 bg-brand-paper p-4 ${picked.has(t.id) ? "border-brand-orange" : "border-brand-line"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-[28px] font-extrabold leading-none">{t.number}</span>
              <label className="flex items-center gap-1.5 text-sm text-brand-muted2">
                <input type="checkbox" checked={picked.has(t.id)} onChange={() => toggle(t.id)} className="h-5 w-5" aria-label={`Zgjidh tavolinën ${t.number}`} />
              </label>
            </div>
            <span className="text-sm text-brand-muted2">
              {t.seats} vende · {t.occupied || t.open_orders ? <b className="text-brand-orange-deep">e zënë</b> : "e lirë"}
              {t.open_orders > 0 && ` · ${t.open_orders} porosi (${eur(t.pending_total)})`}
            </span>
            <select
              value={t.assigned_waiter_id ?? ""}
              onChange={(e) => assign([t.id], e.target.value || null)}
              aria-label={`Kamarieri i tavolinës ${t.number}`}
              className={`${inputCls} ${t.assigned_waiter_id ? "" : "text-brand-muted"}`}
            >
              <option value="">Pa kamarier</option>
              {waiters.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name || w.email}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Vlerësimet */

const Stars = ({ n }: { n: number }) => (
  <span aria-label={`${n} nga 5 yje`} className="tracking-tight text-brand-amber">
    {"★".repeat(n)}
    <span className="text-brand-line">{"★".repeat(5 - n)}</span>
  </span>
);

function Reviews() {
  const [days, setDays] = useState(30);
  const [onlyLow, setOnlyLow] = useState(false);
  const { data: r, error } = useLoad<ReviewsOverview>(`/manager/reviews?days=${days}`, []);
  const maxDist = Math.max(1, ...(r?.distribution ?? []));
  const list = (r?.reviews ?? []).filter((x) => !onlyLow || x.rating <= 3);

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold">Vlerësimet e mysafirëve</h1>
        <div className="flex gap-1 rounded-xl bg-brand-chip p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`h-10 rounded-lg px-3 text-sm font-bold ${days === d ? "bg-brand-paper" : "text-brand-muted"}`}
            >
              {d} ditë
            </button>
          ))}
        </div>
      </div>
      <ErrorNote text={error} />
      {r && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[260px_1fr_1fr]">
            <Stat hero label="Mesatarja" value={r.average != null ? `${r.average.toFixed(1)} ★` : "–"} sub={`${r.count} vlerësime`} />
            <Card title="Shpërndarja">
              <div className="flex flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = r.distribution[star - 1];
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm" title={`${star} yje: ${n}`}>
                      <span className="w-8 font-semibold">{star}★</span>
                      <span className="h-3 flex-1 rounded-full bg-brand-inset">
                        <span className="block h-3 rounded-full bg-brand-chart" style={{ width: `${(n / maxDist) * 100}%` }} />
                      </span>
                      <span className="w-8 text-right tabular-nums text-brand-muted2">{n}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card title="Çfarë përmendin">
              {r.top_tags.length === 0 ? (
                <p className="text-brand-muted">Asnjë etiketë ende.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {r.top_tags.map((t) => (
                    <span key={t.tag} className="rounded-full bg-brand-teal-tint px-3 py-1.5 text-sm font-semibold text-brand-ink">
                      {t.tag} <span className="text-brand-muted2">· {t.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card
            title="Komentet"
            aside={
              <label className="flex items-center gap-2 text-sm font-semibold text-brand-muted2">
                <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="h-5 w-5" />
                Vetëm 3★ e poshtë
              </label>
            }
          >
            {list.length === 0 ? (
              <p className="text-brand-muted">S'ka vlerësime për këtë periudhë.</p>
            ) : (
              <ul className="flex flex-col">
                {list.map((x) => (
                  <li key={x.id} className="flex flex-col gap-1 border-t border-brand-hair py-3 first:border-t-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <Stars n={x.rating} />
                      <span className="text-sm font-semibold">Tavolina {x.table_number ?? "?"}</span>
                      <span className="text-sm text-brand-muted2">
                        {toDate(x.created_at).toLocaleString("sq-AL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
                      </span>
                      {x.tags.map((t) => (
                        <span key={t} className="rounded-full bg-brand-inset px-2.5 py-0.5 text-xs font-semibold">
                          {t}
                        </span>
                      ))}
                    </div>
                    {x.comment && <p className="text-brand-ink2">“{x.comment}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
