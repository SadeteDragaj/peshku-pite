/* Full waiter dashboard: table grid + split-bill modal + notifications. */

import { useEffect, useState } from "react";
import { useWaiterStore, connectWaiterSocket } from "./waiterStore";
import { useNotificationPermission } from "./useNotificationPermission";
import TableCard from "./TableCard";
import SplitBillModal from "./SplitBillModal";
import type { Order } from "../kds/types";

export default function WaiterDashboard() {
  const tables = useWaiterStore((s) => s.tables);
  const loading = useWaiterStore((s) => s.loading);
  const connected = useWaiterStore((s) => s.connected);
  const transferTable = useWaiterStore((s) => s.transferTable);
  const splitBill = useWaiterStore((s) => s.splitBill);
  const closeOrder = useWaiterStore((s) => s.closeOrder);

  const [splitOrder, setSplitOrder] = useState<Order | null>(null);

  // Request notifications
  useNotificationPermission();

  // Connect WebSocket
  useEffect(() => {
    const cleanup = connectWaiterSocket();
    return cleanup;
  }, []);

  const handleSplitBill = (orderId: string) => {
    // Find the order across all tables
    for (const t of tables) {
      const order = t.active_orders.find((o) => o.id === orderId);
      if (order) {
        setSplitOrder(order);
        return;
      }
    }
  };

  const handleConfirmSplit = async (orderId: string, splits: string[][]) => {
    await splitBill(orderId, splits);
    setSplitOrder(null);
  };

  const handleCloseOrder = async (orderId: string, voidOrder: boolean) => {
    try {
      await closeOrder(orderId, voidOrder);
    } catch (e: any) {
      alert(e.message ?? "Failed to close order");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🧑‍🍳 Waiter Dashboard</h1>
        <span className={`flex items-center gap-1.5 text-sm ${connected ? "text-green-600" : "text-red-500"}`}>
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
          {connected ? "Live" : "Reconnecting…"}
        </span>
      </div>

      {loading && tables.length === 0 && (
        <p className="text-gray-400">Loading tables…</p>
      )}

      {/* Table grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            onTransfer={transferTable}
            onCloseOrder={handleCloseOrder}
            onSplitBill={handleSplitBill}
          />
        ))}
      </div>

      {tables.length === 0 && !loading && (
        <p className="text-center text-gray-400 mt-12">No tables found. Create tables via the admin panel.</p>
      )}

      {/* Split bill modal */}
      {splitOrder && (
        <SplitBillModal
          order={splitOrder}
          onConfirm={handleConfirmSplit}
          onCancel={() => setSplitOrder(null)}
        />
      )}
    </div>
  );
}
