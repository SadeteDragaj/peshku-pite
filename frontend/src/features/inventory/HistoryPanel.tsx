/* Slide-over panel showing transaction history for an inventory item. */

import { useEffect } from "react";
import { useInventoryStore } from "./inventoryStore";
import type { InventoryItem } from "./types";

interface Props {
  item: InventoryItem;
  onClose: () => void;
}

const TYPE_BADGE: Record<string, string> = {
  purchase: "bg-green-100 text-green-800",
  wastage: "bg-red-100 text-red-800",
  consumption: "bg-blue-100 text-blue-800",
  adjustment: "bg-yellow-100 text-yellow-800",
};

export default function HistoryPanel({ item, onClose }: Props) {
  const transactions = useInventoryStore((s) => s.transactions);
  const loadTransactions = useInventoryStore((s) => s.loadTransactions);

  useEffect(() => {
    loadTransactions(item.id);
  }, [item.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="bg-white w-full max-w-md h-full shadow-xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{item.name} – History</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {transactions.length === 0 ? (
          <p className="text-gray-400 italic text-sm">No transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((txn) => (
              <li key={txn.id} className="border rounded p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TYPE_BADGE[txn.transaction_type] ?? ""}`}>
                    {txn.transaction_type}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {new Date(txn.created_at).toLocaleString()}
                  </span>
                </div>
                <p className={`font-medium ${txn.quantity_change >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {txn.quantity_change >= 0 ? "+" : ""}{txn.quantity_change} {item.unit}
                </p>
                {txn.notes && <p className="text-gray-500 text-xs mt-1">{txn.notes}</p>}
                {txn.reference_order_id && (
                  <p className="text-gray-400 text-xs">Order: #{txn.reference_order_id.slice(0, 8)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
