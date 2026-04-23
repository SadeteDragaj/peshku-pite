/* Single order card displayed in the KDS grid. */

import type { Order, OrderStatus } from "./types";

interface Props {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "border-yellow-400 bg-yellow-50",
  preparing: "border-blue-400 bg-blue-50",
  ready: "border-green-400 bg-green-50",
  served: "border-gray-300 bg-gray-50",
  voided: "border-red-300 bg-red-50",
};

function timeSince(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m`;
}

export default function OrderCard({ order, onUpdateStatus }: Props) {
  const color = STATUS_COLORS[order.status] ?? "border-gray-200";

  return (
    <div className={`rounded-lg border-2 p-4 shadow-sm ${color}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-lg">Table {order.table_id}</span>
        <span className="text-xs text-gray-500">{timeSince(order.created_at)} ago</span>
      </div>

      {/* Status badge */}
      <span className="inline-block mb-3 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide bg-white/60">
        {order.status}
      </span>

      {/* Items */}
      <ul className="space-y-1 text-sm mb-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between">
            <span>
              <span className="font-medium">{item.quantity}×</span> {item.menu_item_id}
            </span>
            {item.special_instructions && (
              <span className="ml-2 text-gray-400 italic truncate max-w-[140px]">
                {item.special_instructions}
              </span>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="text-xs text-gray-500 italic mb-3">📝 {order.notes}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {order.status === "pending" && (
          <button
            onClick={() => onUpdateStatus(order.id, "preparing")}
            className="flex-1 py-1.5 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Mark Preparing
          </button>
        )}
        {order.status === "preparing" && (
          <button
            onClick={() => onUpdateStatus(order.id, "ready")}
            className="flex-1 py-1.5 rounded bg-green-600 text-white text-sm font-medium hover:bg-green-700"
          >
            Mark Ready
          </button>
        )}
      </div>
    </div>
  );
}
