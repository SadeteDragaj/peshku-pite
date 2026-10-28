/* Kitchen display: ticket grid, oldest first, with a kitchen / bar filter. */

import { useEffect, useState } from "react";
import { toMs } from "../../lib/time";
import { StaffHeader } from "../staff/StaffShell";
import OrderCard, { visibleItems } from "./OrderCard";
import { connectKdsSocket, useKdsStore } from "./kdsStore";
import type { Order, StationFilter } from "./types";

const FILTERS: { id: StationFilter; label: string }[] = [
  { id: "kitchen", label: "Kuzhina" },
  { id: "bar", label: "Bari" },
  { id: "all", label: "Të gjitha" },
];

export default function KdsBoard() {
  const orders = useKdsStore((s) => s.orders);
  const updateStatus = useKdsStore((s) => s.updateStatus);
  const connected = useKdsStore((s) => s.connected);
  const [filter, setFilter] = useState<StationFilter>("kitchen");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => connectKdsSocket(), []);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const inProgress = Object.values(orders)
    .filter((o) => o.status === "pending" || o.status === "preparing")
    .sort((a, b) => toMs(a.created_at) - toMs(b.created_at));
  const forFilter = (f: StationFilter) => inProgress.filter((o: Order) => visibleItems(o, f).length > 0);
  const tickets = forFilter(filter);
  const readyCount = Object.values(orders).filter((o) => o.status === "ready").length;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-sand text-brand-ink">
      <StaffHeader title="Peshku i Pitë · KDS" connected={connected} large>
        <div role="group" aria-label="Filtri" className="scroll-thin flex max-w-full gap-1.5 overflow-x-auto rounded-[18px] bg-[#24504F] p-1.5">
          {FILTERS.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={on}
                className={`flex h-12 flex-none items-center gap-2.5 whitespace-nowrap rounded-[14px] px-4 text-lg font-bold md:h-[60px] md:px-6 md:text-[22px] ${
                  on ? "bg-brand-paper text-brand-ink" : "text-[#D2E4DF]"
                }`}
              >
                {f.label}
                <span
                  className={`flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[17px] ${
                    on ? "bg-brand-orange text-brand-ink" : "bg-[#2F6664] text-brand-paper"
                  }`}
                >
                  {forFilter(f.id).length}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-base text-[#D2E4DF] md:gap-4 md:text-lg">
          <Legend className="bg-brand-teal" label="0–5 min" />
          <Legend className="bg-brand-amber" label="5–10 min" />
          <Legend className="bg-brand-red" label="10+ min" />
          {readyCount > 0 && <span className="rounded-full bg-[#2F6664] px-3 py-1 font-semibold">{readyCount} gati</span>}
        </div>
      </StaffHeader>

      <main className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(min(340px,100%),1fr))] gap-3 overflow-y-auto p-3 md:gap-5 md:p-6">
        {tickets.map((order) => (
          <OrderCard key={order.id} order={order} station={filter} now={now} onUpdateStatus={updateStatus} />
        ))}
        {tickets.length === 0 && (
          <p className="col-span-full mt-24 text-center font-display text-3xl font-bold text-brand-muted">
            {connected ? "S'ka porosi në pritje" : "Po lidhet…"}
          </p>
        )}
      </main>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded ${className}`} />
      {label}
    </span>
  );
}
