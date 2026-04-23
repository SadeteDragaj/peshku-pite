/* Modal to split an order's items into two groups. */

import { useState } from "react";
import type { Order } from "../kds/types";

interface Props {
  order: Order;
  onConfirm: (orderId: string, splits: string[][]) => void;
  onCancel: () => void;
}

export default function SplitBillModal({ order, onConfirm, onCancel }: Props) {
  // Each item starts in group A (0). Toggle to group B (1).
  const [groups, setGroups] = useState<Record<string, number>>(
    Object.fromEntries(order.items.map((item) => [item.id, 0]))
  );

  const toggle = (itemId: string) =>
    setGroups((g) => ({ ...g, [itemId]: g[itemId] === 0 ? 1 : 0 }));

  const groupA = order.items.filter((i) => groups[i.id] === 0);
  const groupB = order.items.filter((i) => groups[i.id] === 1);

  const totalA = groupA.reduce((s, i) => s + i.subtotal, 0);
  const totalB = groupB.reduce((s, i) => s + i.subtotal, 0);

  const canConfirm = groupA.length > 0 && groupB.length > 0;

  const handleConfirm = () => {
    onConfirm(order.id, [
      groupA.map((i) => i.id),
      groupB.map((i) => i.id),
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">
          Split Bill – Order #{order.id.slice(0, 8)}
        </h3>
        <p className="text-sm text-gray-500 mb-3">Click items to move between groups.</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Group A */}
          <div>
            <h4 className="text-sm font-semibold text-blue-700 mb-1">
              Bill A – ${totalA.toFixed(2)}
            </h4>
            {groupA.map((item) => (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className="block w-full text-left text-sm p-1.5 rounded hover:bg-blue-50 border mb-1"
              >
                {item.quantity}× {item.menu_item_id}
                <span className="float-right text-gray-400">${item.subtotal.toFixed(2)}</span>
              </button>
            ))}
          </div>

          {/* Group B */}
          <div>
            <h4 className="text-sm font-semibold text-purple-700 mb-1">
              Bill B – ${totalB.toFixed(2)}
            </h4>
            {groupB.map((item) => (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                className="block w-full text-left text-sm p-1.5 rounded hover:bg-purple-50 border mb-1"
              >
                {item.quantity}× {item.menu_item_id}
                <span className="float-right text-gray-400">${item.subtotal.toFixed(2)}</span>
              </button>
            ))}
            {groupB.length === 0 && (
              <p className="text-xs text-gray-400 italic">Move items here →</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Split Bill
          </button>
        </div>
      </div>
    </div>
  );
}
