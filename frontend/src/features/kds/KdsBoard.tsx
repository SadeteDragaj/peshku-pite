/* Main KDS board – three-column grid (Pending | Preparing | Ready). */

import { useEffect } from "react";
import { useKdsStore, connectKdsSocket } from "./kdsStore";
import StatusColumn from "./StatusColumn";

export default function KdsBoard() {
  const byStatus = useKdsStore((s) => s.byStatus);
  const updateStatus = useKdsStore((s) => s.updateStatus);
  const connected = useKdsStore((s) => s.connected);

  useEffect(() => {
    const cleanup = connectKdsSocket();
    return cleanup;
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Connection indicator */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🍳 Kitchen Display</h1>
        <span className={`flex items-center gap-1.5 text-sm ${connected ? "text-green-600" : "text-red-500"}`}>
          <span className={`inline-block w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
          {connected ? "Live" : "Reconnecting…"}
        </span>
      </div>

      {/* Three-column layout */}
      <div className="flex gap-6 overflow-x-auto">
        <StatusColumn
          title="🟡 Pending"
          status="pending"
          orders={byStatus("pending")}
          onUpdateStatus={updateStatus}
        />
        <StatusColumn
          title="🔵 Preparing"
          status="preparing"
          orders={byStatus("preparing")}
          onUpdateStatus={updateStatus}
        />
        <StatusColumn
          title="🟢 Ready"
          status="ready"
          orders={byStatus("ready")}
          onUpdateStatus={updateStatus}
        />
      </div>
    </div>
  );
}
