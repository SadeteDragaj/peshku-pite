/* Modal for recording a purchase or wastage transaction. */

import { useState } from "react";
import type { InventoryItem } from "./types";

interface Props {
  item: InventoryItem;
  type: "purchase" | "wastage";
  onConfirm: (data: { inventory_item_id: string; transaction_type: string; quantity_change: number; notes: string }) => void;
  onCancel: () => void;
}

export default function TransactionModal({ item, type, onConfirm, onCancel }: Props) {
  const [qty, setQty] = useState("");
  const [notes, setNotes] = useState("");

  const title = type === "purchase" ? `Add Purchase – ${item.name}` : `Record Wastage – ${item.name}`;
  const color = type === "purchase" ? "green" : "red";

  const handleSubmit = () => {
    const num = parseFloat(qty);
    if (isNaN(num) || num <= 0) return;
    onConfirm({
      inventory_item_id: item.id,
      transaction_type: type,
      quantity_change: num,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-gray-500">
          Current stock: {item.quantity_on_hand} {item.unit}
        </p>
        <input
          type="number"
          min="0.01"
          step="any"
          placeholder={`Quantity (${item.unit})`}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
          autoFocus
        />
        <input
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded border hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSubmit}
            className={`px-4 py-2 text-sm rounded text-white bg-${color}-600 hover:bg-${color}-700`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
