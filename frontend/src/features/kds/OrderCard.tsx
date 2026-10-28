/* One kitchen ticket: table, age (colour shifts as it waits), items with sizes & notes, Fillo → Gati. */

import { toMs } from "../../lib/time";
import type { Order, OrderItem, OrderStatus, StationFilter } from "./types";

interface Props {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  /** Show only kitchen or bar lines of the order */
  station?: StationFilter;
  /** Current time, passed in so all tickets tick together */
  now?: number;
}

/** 0–5 min teal, 5–10 amber, 10+ red. Bands differ in lightness too, not only hue. */
export function ageBand(minutes: number) {
  if (minutes >= 10) return { bg: "bg-brand-red", fg: "text-brand-paper" };
  if (minutes >= 5) return { bg: "bg-brand-amber", fg: "text-brand-ink" };
  return { bg: "bg-brand-teal", fg: "text-brand-paper" };
}

export const visibleItems = (order: Order, station: StationFilter = "all"): OrderItem[] =>
  station === "all" ? order.items : order.items.filter((i) => (i.station ?? "kitchen") === station);

function mmss(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

const STATE_LABEL: Partial<Record<OrderStatus, string>> = { pending: "E re", preparing: "Në përgatitje", ready: "Gati" };

export default function OrderCard({ order, onUpdateStatus, station = "all", now = Date.now() }: Props) {
  const age = now - toMs(order.created_at);
  const band = ageBand(age / 60000);
  const items = visibleItems(order, station);
  const table = order.table_number ?? order.table_id;
  const hasOtherStation = items.length < order.items.length;

  return (
    <article
      aria-label={`Tavolina ${table}`}
      className="flex flex-col overflow-hidden rounded-[22px] bg-brand-paper shadow-[0_2px_0_rgba(24,58,61,.08)]"
    >
      <div className={`flex items-center justify-between px-5 py-4 ${band.bg} ${band.fg}`}>
        <div className="flex flex-col">
          <span className="font-display text-[40px] font-extrabold leading-none">T{table}</span>
          <span className="text-base font-bold opacity-90">#{order.id.slice(0, 4)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-display text-[34px] font-extrabold tabular-nums">{mmss(age)}</span>
          <span className="text-[15px] font-bold opacity-90">{STATE_LABEL[order.status] ?? order.status}</span>
        </div>
      </div>

      <ul className="flex flex-col gap-3 px-5 py-3.5">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2.5">
              <span className="min-w-9 font-display text-[26px] font-extrabold">{item.quantity}×</span>
              <span className="text-[21px] font-bold leading-tight">{item.name || item.menu_item_id}</span>
            </div>
            {(item.size || (item.addons?.length ?? 0) > 0) && (
              <span className="ml-[46px] text-lg text-brand-muted">
                {[item.size && `Madhësia ${item.size}`, ...(item.addons ?? []).map((a) => `+ ${a.name}`)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
            {item.special_instructions && (
              <span className="ml-[46px] self-start rounded-lg bg-brand-orange-tint px-2.5 py-1 text-lg font-extrabold uppercase text-[#8F4512]">
                {item.special_instructions}
              </span>
            )}
          </li>
        ))}
        {hasOtherStation && (
          <li className="text-[15px] font-semibold text-brand-faint">
            + {order.items.length - items.length} {station === "kitchen" ? "nga bari" : "nga kuzhina"}
          </li>
        )}
      </ul>

      {order.notes && <p className="mx-5 mb-3 rounded-lg bg-brand-inset px-3 py-2 text-base font-semibold">{order.notes}</p>}

      <div className="mt-auto px-4 pb-4">
        {order.status === "pending" && (
          <button
            onClick={() => onUpdateStatus(order.id, "preparing")}
            className="h-[72px] w-full rounded-2xl bg-brand-chip text-2xl font-extrabold text-brand-ink active:scale-[0.99]"
          >
            Fillo
          </button>
        )}
        {order.status === "preparing" && (
          <button
            onClick={() => onUpdateStatus(order.id, "ready")}
            className="h-[72px] w-full rounded-2xl bg-brand-ink text-2xl font-extrabold text-brand-paper active:scale-[0.99]"
          >
            Gati
          </button>
        )}
        {order.status === "ready" && (
          <div className="flex h-[72px] items-center justify-center rounded-2xl bg-brand-teal-tint text-xl font-bold text-brand-teal-deep">
            Pret kamarierin
          </div>
        )}
      </div>
    </article>
  );
}
