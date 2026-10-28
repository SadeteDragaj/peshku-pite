/* Waiter floor view: table tiles coloured by what they need, a live alerts list,
 * and a side drawer per table (orders, serve / void / split, clear table). */

import { useEffect, useMemo, useState } from "react";
import { toMs } from "../../lib/time";
import { StaffHeader, currentUserId } from "../staff/StaffShell";
import type { Order } from "../kds/types";
import SplitBillModal from "./SplitBillModal";
import TableCard from "./TableCard";
import type { FloorStatus, ServiceRequest, TableOverview } from "./types";
import { useNotificationPermission } from "./useNotificationPermission";
import { connectWaiterSocket, useWaiterStore } from "./waiterStore";

const STYLE: Record<FloorStatus, { tile: string; label: string; legend: string }> = {
  bill: { tile: "bg-brand-ink text-brand-paper border-brand-ink", label: "Kërkoi llogarinë", legend: "bg-brand-ink" },
  called: { tile: "bg-brand-orange text-brand-ink border-brand-orange", label: "Thirri kamarierin", legend: "bg-brand-orange" },
  ready: { tile: "bg-brand-teal-tint text-brand-ink border-brand-teal", label: "Gati për shërbim", legend: "bg-brand-teal" },
  waiting: { tile: "bg-[#FFF1D6] text-brand-ink border-[#E0A21E]", label: "Pret ushqimin", legend: "bg-[#E0A21E]" },
  seated: { tile: "bg-[#DCE4F1] text-brand-ink border-brand-tile", label: "E zënë", legend: "bg-brand-tile" },
  free: { tile: "bg-brand-paper text-brand-muted2 border-dashed border-brand-faint", label: "E lirë", legend: "bg-brand-paper border-2 border-dashed border-brand-faint" },
};

function floorStatus(t: TableOverview, reqs: ServiceRequest[]): FloorStatus {
  if (reqs.some((r) => r.kind === "bill")) return "bill";
  if (reqs.some((r) => r.kind === "waiter")) return "called";
  if (t.active_orders.some((o) => o.status === "ready")) return "ready";
  if (t.active_orders.length > 0) return "waiting";
  if (t.occupied) return "seated";
  return "free";
}

const minsAgo = (iso: string, now: number) => {
  const m = Math.floor((now - toMs(iso)) / 60000);
  return m < 1 ? "tani" : `${m} min`;
};

// Backend messages the waiter can actually hit, in Albanian
const ERROR_TEXT: Record<string, string> = {
  "Table still has orders that are not served":
    "Tavolina ka ende porosi që s'janë shërbyer. Shërbejini (ose anulojini) para se ta pastroni.",
  "Can only serve orders that are ready": "Porosia s'është gati ende – prisni kuzhinën.",
  "Order already closed": "Kjo porosi është mbyllur tashmë.",
  "Target user is not a waiter": "Ky person nuk është kamarier aktiv.",
};

const REQUEST_LABEL: Record<string, string> = { waiter: "Thirri kamarierin", water: "Ujë", bill: "Kërkoi llogarinë" };

export default function WaiterDashboard() {
  const tables = useWaiterStore((s) => s.tables);
  const requests = useWaiterStore((s) => s.requests);
  const loading = useWaiterStore((s) => s.loading);
  const connected = useWaiterStore((s) => s.connected);
  const { transferTable, splitBill, closeOrder, resolveRequest, clearTable } = useWaiterStore.getState();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [splitOrder, setSplitOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => setError(null), [selectedId]);
  const [now, setNow] = useState(() => Date.now());
  // null = not chosen yet: start on "my tables" if the manager assigned me any
  const [scope, setScope] = useState<"mine" | "all" | null>(null);
  const me = currentUserId();
  const myCount = tables.filter((t) => t.assigned_waiter_id === me).length;
  const effectiveScope = scope ?? (myCount > 0 ? "mine" : "all");

  useNotificationPermission();
  useEffect(() => connectWaiterSocket(), []);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const visibleTables = effectiveScope === "mine" ? tables.filter((t) => t.assigned_waiter_id === me) : tables;
  const visibleIds = new Set(visibleTables.map((t) => t.id));
  const visibleRequests = requests.filter((r) => visibleIds.has(r.table_id));

  const reqsByTable = useMemo(() => {
    const map: Record<string, ServiceRequest[]> = {};
    for (const r of requests) (map[r.table_id] ??= []).push(r);
    return map;
  }, [requests]);

  const readyOrders = visibleTables.flatMap((t) =>
    t.active_orders.filter((o) => o.status === "ready").map((o) => ({ table: t, order: o })),
  );
  const selected = tables.find((t) => t.id === selectedId) ?? null;

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      return true;
    } catch (e: any) {
      setError(ERROR_TEXT[e?.message] ?? e?.message ?? "Diçka shkoi keq");
      return false;
    }
  };

  const clear = async (t: TableOverview) => {
    if (await act(() => clearTable(t.id))) {
      setSelectedId(null);
      setNotice(`Tavolina ${t.number} u pastrua – tableti është gati për mysafirët e rinj.`);
      window.setTimeout(() => setNotice(null), 4000);
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-cream text-brand-ink">
      <StaffHeader title="Kamarieri" connected={connected} />

      {/* Phones / portrait tablets: one scrolling column (tables, then alerts); landscape: side by side */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 md:p-5 lg:flex-row lg:gap-5 lg:overflow-hidden">
        <section className="flex min-w-0 flex-none flex-col gap-3.5 lg:flex-1">
          <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-brand-ink2">
            <div role="group" aria-label="Cilat tavolina" className="flex gap-1 rounded-xl bg-brand-chip p-1">
              {(
                [
                  ["mine", `Tavolinat e mia (${myCount})`],
                  ["all", `Të gjitha (${tables.length})`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setScope(k)}
                  aria-pressed={effectiveScope === k}
                  className={`h-10 rounded-lg px-3 text-sm font-bold ${effectiveScope === k ? "bg-brand-ink text-brand-paper" : "text-brand-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {(Object.keys(STYLE) as FloorStatus[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`h-[18px] w-[18px] rounded-[5px] ${STYLE[k].legend}`} />
                {STYLE[k].label}
              </span>
            ))}
          </div>
          <div className="grid auto-rows-[100px] grid-cols-[repeat(auto-fill,minmax(100px,1fr))] content-start gap-2.5 rounded-3xl border border-brand-line bg-brand-paper p-3 md:auto-rows-[120px] md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:gap-4 md:p-5 lg:flex-1 lg:overflow-y-auto">
            {visibleTables.map((t) => {
              const reqs = reqsByTable[t.id] ?? [];
              const st = STYLE[floorStatus(t, reqs)];
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  aria-label={`Tavolina ${t.number}: ${st.label}`}
                  className={`flex flex-col justify-between rounded-2xl border-2 p-3 text-left ${st.tile} ${
                    selectedId === t.id ? "ring-4 ring-brand-tile/40" : ""
                  }`}
                >
                  <span className="flex items-start justify-between gap-1">
                    <span className="font-display text-[30px] font-extrabold leading-none">{t.number}</span>
                    {effectiveScope === "all" && t.assigned_waiter_name && t.assigned_waiter_id !== me && (
                      <span className="truncate text-xs font-semibold opacity-70">{t.assigned_waiter_name}</span>
                    )}
                    {reqs.some((r) => r.kind === "water") && (
                      <span className="rounded-full bg-[#DCE4F1] px-2 py-0.5 text-xs font-bold text-brand-tile">Ujë</span>
                    )}
                  </span>
                  <span className="flex items-end justify-between gap-1">
                    <span className="text-xs font-bold leading-tight">{st.label}</span>
                    {t.total_pending > 0 && <span className="text-xs font-semibold opacity-80">€{t.total_pending.toFixed(2)}</span>}
                  </span>
                </button>
              );
            })}
            {tables.length === 0 && !loading && (
              <p className="col-span-full mt-10 text-center text-brand-muted">
                S'ka tavolina. Ekzekutoni <code>python -m app.seed</code> në backend.
              </p>
            )}
            {tables.length > 0 && visibleTables.length === 0 && (
              <p className="col-span-full mt-10 text-center text-brand-muted">
                Nuk keni tavolina të caktuara. Menaxheri i cakton te Menaxheri → Tavolinat.
              </p>
            )}
          </div>
        </section>

        <aside aria-label="Njoftimet" className="flex flex-none flex-col gap-2.5 lg:w-[340px] lg:overflow-y-auto">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-extrabold">Njoftimet</h2>
            <span className="text-sm text-brand-muted2">{visibleRequests.length + readyOrders.length} aktive</span>
          </div>
          {visibleRequests.map((r) => (
            <Alert
              key={r.id}
              table={r.table_number ?? "?"}
              title={REQUEST_LABEL[r.kind]}
              sub={r.kind === "bill" ? (r.payment_method === "cash" ? "Para në dorë" : "Me kartë") : "Nga tableti"}
              age={minsAgo(r.created_at, now)}
              tone={r.kind === "bill" ? "ink" : r.kind === "waiter" ? "orange" : "tile"}
              action="U krye"
              onAction={() => act(() => resolveRequest(r.id))}
              onOpen={() => setSelectedId(r.table_id)}
            />
          ))}
          {readyOrders.map(({ table, order }) => (
            <Alert
              key={order.id}
              table={table.number}
              title="Porosia gati"
              sub={order.items.map((i) => `${i.quantity}× ${i.name || "?"}`).join(", ")}
              age={minsAgo(order.updated_at, now)}
              tone="teal"
              action="Shërbeje"
              onAction={() => act(() => closeOrder(order.id, false))}
              onOpen={() => setSelectedId(table.id)}
            />
          ))}
          {visibleRequests.length + readyOrders.length === 0 && (
            <p className="rounded-2xl bg-brand-paper p-5 text-center text-brand-muted">Asgjë në pritje.</p>
          )}
        </aside>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-[rgba(24,58,61,.35)]" onClick={() => setSelectedId(null)} aria-hidden="true" />
          <aside
            role="dialog"
            aria-label={`Tavolina ${selected.number}`}
            className="absolute bottom-0 right-0 top-0 flex w-full flex-col gap-4 overflow-y-auto bg-brand-cream p-4 shadow-2xl sm:w-[460px] md:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-3xl font-extrabold">Tavolina {selected.number}</h2>
              <button onClick={() => setSelectedId(null)} className="h-11 rounded-xl bg-brand-chip px-4 font-semibold">
                Mbyll
              </button>
            </div>
            {(reqsByTable[selected.id] ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-brand-paper p-3">
                <span className="font-semibold">
                  {REQUEST_LABEL[r.kind]}
                  {r.kind === "bill" && ` · ${r.payment_method === "cash" ? "para në dorë" : "kartë"}`}
                </span>
                <button onClick={() => act(() => resolveRequest(r.id))} className="h-10 rounded-lg bg-brand-chip px-3 text-sm font-bold">
                  U krye
                </button>
              </div>
            ))}
            <TableCard
              table={selected}
              onTransfer={(id, w) => act(() => transferTable(id, w))}
              onCloseOrder={(id, v) => act(() => closeOrder(id, v))}
              onSplitBill={(orderId) => setSplitOrder(selected.active_orders.find((o) => o.id === orderId) ?? null)}
            />
            <div className="flex-1" />
            {error && (
              <p role="alert" className="rounded-xl bg-brand-orange-tint p-3 text-sm font-semibold text-brand-orange-deep">
                {error}
              </p>
            )}
            <button
              onClick={() => clear(selected)}
              className="h-14 rounded-2xl bg-brand-ink text-lg font-bold text-brand-paper"
            >
              Pastro tavolinën (mysafirët ikën)
            </button>
            <p className="text-sm text-brand-muted2">
              Fillon një llogari të re në tabletin e tavolinës. Lejohet vetëm kur të gjitha porositë janë shërbyer.
            </p>
          </aside>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 w-max max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-2xl bg-brand-teal-deep px-5 py-4 text-base font-bold text-brand-paper shadow-xl md:px-6"
        >
          ✓ {notice}
        </div>
      )}

      {splitOrder && (
        <SplitBillModal
          order={splitOrder}
          onConfirm={async (orderId, splits) => {
            await act(() => splitBill(orderId, splits));
            setSplitOrder(null);
          }}
          onCancel={() => setSplitOrder(null)}
        />
      )}
    </div>
  );
}

const TONES = {
  ink: { border: "border-brand-ink", chip: "bg-brand-ink text-brand-paper" },
  orange: { border: "border-brand-orange", chip: "bg-brand-orange text-brand-ink" },
  teal: { border: "border-brand-teal", chip: "bg-brand-teal-tint text-brand-ink" },
  tile: { border: "border-brand-tile", chip: "bg-[#DCE4F1] text-brand-ink" },
};

function Alert(props: {
  table: number | string;
  title: string;
  sub: string;
  age: string;
  tone: keyof typeof TONES;
  action: string;
  onAction: () => void;
  onOpen: () => void;
}) {
  const tone = TONES[props.tone];
  return (
    <div className={`flex flex-col gap-2.5 rounded-[18px] border-2 bg-brand-paper p-3.5 ${tone.border}`}>
      <button onClick={props.onOpen} className="flex items-center gap-3 text-left">
        <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-[14px] font-display text-xl font-extrabold ${tone.chip}`}>
          {props.table}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-bold">{props.title}</span>
          <span className="truncate text-sm text-brand-muted2">{props.sub}</span>
        </span>
        <span className="text-sm font-bold text-brand-muted">{props.age}</span>
      </button>
      <button onClick={props.onAction} className="h-12 rounded-xl bg-brand-chip text-[15px] font-bold">
        {props.action}
      </button>
    </div>
  );
}
