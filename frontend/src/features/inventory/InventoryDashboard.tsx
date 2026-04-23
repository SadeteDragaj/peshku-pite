/* Main inventory management page for admins. */

import { useEffect, useState } from "react";
import { useInventoryStore } from "./inventoryStore";
import StockRow from "./StockRow";
import TransactionModal from "./TransactionModal";
import HistoryPanel from "./HistoryPanel";
import type { InventoryItem } from "./types";

export default function InventoryDashboard() {
  const items = useInventoryStore((s) => s.items);
  const loading = useInventoryStore((s) => s.loading);
  const loadItems = useInventoryStore((s) => s.loadItems);
  const createItem = useInventoryStore((s) => s.createItem);
  const addTransaction = useInventoryStore((s) => s.addTransaction);

  const [search, setSearch] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [txnModal, setTxnModal] = useState<{ item: InventoryItem; type: "purchase" | "wastage" } | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", unit: "unit", quantity_on_hand: 0, low_stock_threshold: 10, cost_per_unit: 0 });

  useEffect(() => {
    loadItems({ lowStockOnly: lowOnly, search: search || undefined });
  }, [lowOnly, search]);

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return;
    await createItem(newItem);
    setNewItem({ name: "", unit: "unit", quantity_on_hand: 0, low_stock_threshold: 10, cost_per_unit: 0 });
    setShowAdd(false);
  };

  const handleTxnConfirm = async (data: any) => {
    await addTransaction(data);
    setTxnModal(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📦 Inventory</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
        >
          + Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-sm w-64"
        />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Item</th>
              <th className="px-4 py-3 text-center">On Hand</th>
              <th className="px-4 py-3 text-center">Unit</th>
              <th className="px-4 py-3 text-center">Low Threshold</th>
              <th className="px-4 py-3 text-center">Cost/Unit</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <StockRow
                key={item.id}
                item={item}
                onPurchase={(i) => setTxnModal({ item: i, type: "purchase" })}
                onWastage={(i) => setTxnModal({ item: i, type: "wastage" })}
                onEdit={() => {}} // TODO: edit modal
                onViewHistory={(i) => setHistoryItem(i)}
              />
            ))}
          </tbody>
        </table>
        {items.length === 0 && !loading && (
          <p className="text-center text-gray-400 py-8">No inventory items found.</p>
        )}
      </div>

      {/* Add item modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-3">
            <h3 className="text-lg font-bold">Add Inventory Item</h3>
            <input placeholder="Name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" autoFocus />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Unit (kg, unit…)" value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} className="border rounded px-3 py-2 text-sm" />
              <input type="number" placeholder="Initial stock" value={newItem.quantity_on_hand || ""} onChange={(e) => setNewItem({ ...newItem, quantity_on_hand: +e.target.value })} className="border rounded px-3 py-2 text-sm" />
              <input type="number" placeholder="Low threshold" value={newItem.low_stock_threshold || ""} onChange={(e) => setNewItem({ ...newItem, low_stock_threshold: +e.target.value })} className="border rounded px-3 py-2 text-sm" />
              <input type="number" step="0.01" placeholder="Cost/unit" value={newItem.cost_per_unit || ""} onChange={(e) => setNewItem({ ...newItem, cost_per_unit: +e.target.value })} className="border rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm rounded border">Cancel</button>
              <button onClick={handleAddItem} className="px-4 py-2 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction modal */}
      {txnModal && (
        <TransactionModal
          item={txnModal.item}
          type={txnModal.type}
          onConfirm={handleTxnConfirm}
          onCancel={() => setTxnModal(null)}
        />
      )}

      {/* History panel */}
      {historyItem && (
        <HistoryPanel item={historyItem} onClose={() => setHistoryItem(null)} />
      )}
    </div>
  );
}
