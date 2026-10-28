/* Table detail: active orders with Serve / Void / Split, total, and transfer. */

import { useState } from "react";
import { api } from "../../lib/api";
import type { TableOverview, WaiterBrief } from "./types";

interface Props {
  table: TableOverview;
  onTransfer: (tableId: string, targetWaiterId: string) => void;
  onCloseOrder: (orderId: string, voidOrder: boolean) => void;
  onSplitBill: (orderId: string) => void;
}

const STATUS: Record<string, { label: string; dot: string }> = {
  pending: { label: "Dërguar", dot: "bg-brand-faint" },
  preparing: { label: "Në përgatitje", dot: "bg-brand-amber" },
  ready: { label: "Gati", dot: "bg-brand-teal" },
};

export default function TableCard({ table, onTransfer, onCloseOrder, onSplitBill }: Props) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [targetWaiter, setTargetWaiter] = useState("");
  const [waiters, setWaiters] = useState<WaiterBrief[]>([]);

  const openTransfer = () => {
    setShowTransfer(true);
    api.get<WaiterBrief[]>("/waiter/staff").then(setWaiters, () => setWaiters([]));
  };

  const handleTransfer = () => {
    if (targetWaiter) {
      onTransfer(table.id, targetWaiter);
      setShowTransfer(false);
      setTargetWaiter("");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-brand-line bg-brand-paper p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold">Tavolina {table.number}</span>
          <span className="text-sm text-brand-muted2">
            {table.seats} vende{table.assigned_waiter_name && ` · ${table.assigned_waiter_name}`}
          </span>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
            table.occupied ? "bg-brand-orange-tint text-brand-orange-deep" : "bg-brand-chip text-brand-muted"
          }`}
        >
          {table.occupied ? "E zënë" : "E lirë"}
        </span>
      </div>

      {table.active_orders.length > 0 ? (
        <div className="flex flex-col gap-2">
          {table.active_orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-brand-hair bg-brand-inset p-3 text-sm">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATUS[order.status]?.dot ?? "bg-brand-line"}`} />
                  {STATUS[order.status]?.label ?? order.status}
                </span>
                <span className="text-xs text-brand-faint">#{order.id.slice(0, 6)}</span>
              </div>
              <ul className="mb-2.5 text-brand-ink2">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.name || item.menu_item_id}
                    {item.size && ` · ${item.size}`}
                    {item.special_instructions && <span className="text-brand-orange-deep"> – {item.special_instructions}</span>}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-1.5">
                {order.status === "ready" && (
                  <button
                    onClick={() => onCloseOrder(order.id, false)}
                    className="h-10 rounded-lg bg-brand-teal-deep px-3 text-sm font-bold text-brand-paper"
                  >
                    Shërbeje
                  </button>
                )}
                <button
                  onClick={() => onCloseOrder(order.id, true)}
                  className="h-10 rounded-lg bg-brand-orange-tint px-3 text-sm font-bold text-brand-orange-deep"
                >
                  Anulo
                </button>
                {order.items.length > 1 && (
                  <button onClick={() => onSplitBill(order.id)} className="h-10 rounded-lg bg-brand-chip px-3 text-sm font-bold">
                    Ndaj
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-brand-faint">S'ka porosi aktive</p>
      )}

      <div className="flex items-center justify-between border-t border-brand-hair pt-2 text-sm">
        <span className="font-semibold">Në pritje: €{table.total_pending.toFixed(2)}</span>
        {!showTransfer ? (
          <button onClick={openTransfer} className="text-sm font-semibold text-brand-tile">
            Transfero
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <select
              className="h-9 w-40 rounded-lg border border-brand-line2 bg-brand-paper px-2 text-sm"
              aria-label="Kujt t'ia kalojë tavolinën"
              value={targetWaiter}
              onChange={(e) => setTargetWaiter(e.target.value)}
            >
              <option value="">Zgjidh kamarierin…</option>
              {waiters
                .filter((w) => w.id !== table.assigned_waiter_id)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
            <button onClick={handleTransfer} className="px-2 text-xs font-bold text-brand-teal-deep">
              OK
            </button>
            <button onClick={() => setShowTransfer(false)} className="px-1 text-xs text-brand-faint" aria-label="Mbyll">
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
