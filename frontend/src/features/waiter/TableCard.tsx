/* Single table card for the waiter dashboard grid. */

import { useState } from "react";
import type { TableOverview } from "./types";

interface Props {
  table: TableOverview;
  onTransfer: (tableId: string, targetWaiterId: string) => void;
  onCloseOrder: (orderId: string, voidOrder: boolean) => void;
  onSplitBill: (orderId: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-yellow-400",
  preparing: "bg-blue-400",
  ready: "bg-green-500",
};

export default function TableCard({ table, onTransfer, onCloseOrder, onSplitBill }: Props) {
  const [showTransfer, setShowTransfer] = useState(false);
  const [targetWaiter, setTargetWaiter] = useState("");

  const handleTransfer = () => {
    if (targetWaiter.trim()) {
      onTransfer(table.id, targetWaiter.trim());
      setShowTransfer(false);
      setTargetWaiter("");
    }
  };

  return (
    <div className={`rounded-xl border-2 p-4 shadow-sm transition ${
      table.occupied ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xl font-bold">Table {table.number}</span>
          <span className="ml-2 text-sm text-gray-500">{table.seats} seats</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
          table.occupied ? "bg-orange-200 text-orange-800" : "bg-gray-100 text-gray-600"
        }`}>
          {table.occupied ? "Occupied" : "Free"}
        </span>
      </div>

      {/* Active orders */}
      {table.active_orders.length > 0 ? (
        <div className="space-y-2 mb-3">
          {table.active_orders.map((order) => (
            <div key={order.id} className="bg-white rounded border p-2 text-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${STATUS_DOT[order.status] ?? "bg-gray-300"}`} />
                  <span className="font-medium capitalize">{order.status}</span>
                </div>
                <span className="text-gray-400 text-xs">#{order.id.slice(0, 8)}</span>
              </div>
              <ul className="text-gray-600 mb-2">
                {order.items.map((item) => (
                  <li key={item.id}>{item.quantity}× {item.menu_item_id}</li>
                ))}
              </ul>
              <div className="flex gap-1.5 flex-wrap">
                {order.status === "ready" && (
                  <button
                    onClick={() => onCloseOrder(order.id, false)}
                    className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                  >
                    ✓ Serve
                  </button>
                )}
                <button
                  onClick={() => onCloseOrder(order.id, true)}
                  className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                >
                  ✕ Void
                </button>
                {order.items.length > 1 && (
                  <button
                    onClick={() => onSplitBill(order.id)}
                    className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
                  >
                    ✂ Split
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic mb-3">No active orders</p>
      )}

      {/* Footer – total & transfer */}
      <div className="flex items-center justify-between pt-2 border-t text-sm">
        <span className="font-semibold">
          Total: ${table.total_pending.toFixed(2)}
        </span>
        {!showTransfer ? (
          <button
            onClick={() => setShowTransfer(true)}
            className="text-xs text-indigo-600 hover:underline"
          >
            Transfer
          </button>
        ) : (
          <div className="flex gap-1 items-center">
            <input
              className="border rounded px-1.5 py-0.5 text-xs w-28"
              placeholder="Waiter ID"
              value={targetWaiter}
              onChange={(e) => setTargetWaiter(e.target.value)}
            />
            <button onClick={handleTransfer} className="text-xs text-green-600 font-medium">Go</button>
            <button onClick={() => setShowTransfer(false)} className="text-xs text-gray-400">✕</button>
          </div>
        )}
      </div>
    </div>
  );
}
