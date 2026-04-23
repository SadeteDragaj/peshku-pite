/* Zustand store for waiter dashboard state. */

import { create } from "zustand";
import { api } from "../../lib/api";
import type { CloseOrderResponse, SplitBillResponse, TableOverview } from "./types";

interface WaiterState {
  tables: TableOverview[];
  loading: boolean;
  error: string | null;
  connected: boolean;

  /* Actions */
  setConnected: (v: boolean) => void;
  loadTables: (mineOnly?: boolean) => Promise<void>;
  transferTable: (tableId: string, targetWaiterId: string) => Promise<void>;
  splitBill: (orderId: string, splits: string[][]) => Promise<SplitBillResponse>;
  closeOrder: (orderId: string, voidOrder: boolean) => Promise<CloseOrderResponse>;
  handleWsEvent: (data: any) => void;
}

export const useWaiterStore = create<WaiterState>((set, get) => ({
  tables: [],
  loading: false,
  error: null,
  connected: false,

  setConnected: (v) => set({ connected: v }),

  loadTables: async (mineOnly = false) => {
    set({ loading: true, error: null });
    try {
      const qs = mineOnly ? "?mine_only=true" : "";
      const tables = await api.get<TableOverview[]>(`/waiter/tables${qs}`);
      set({ tables, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  transferTable: async (tableId, targetWaiterId) => {
    await api.post(`/waiter/tables/${tableId}/transfer`, { target_waiter_id: targetWaiterId });
    await get().loadTables();
  },

  splitBill: async (orderId, splits) => {
    const res = await api.post<SplitBillResponse>(`/waiter/orders/${orderId}/split-bill`, { splits });
    await get().loadTables();
    return res;
  },

  closeOrder: async (orderId, voidOrder) => {
    const res = await api.post<CloseOrderResponse>(`/waiter/orders/${orderId}/close`, { void: voidOrder });
    await get().loadTables();
    return res;
  },

  handleWsEvent: (data) => {
    const evt = data?.event;
    if (
      evt === "order_created" ||
      evt === "order_status_changed" ||
      evt === "order_closed" ||
      evt === "order_split" ||
      evt === "table_transferred"
    ) {
      get().loadTables();
    }
  },
}));

/* --------------------------------------------------------------------------
 * WebSocket hook for waiter dashboard
 * -------------------------------------------------------------------------- */
let ws: WebSocket | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

export function connectWaiterSocket() {
  const store = useWaiterStore.getState();

  function open() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws/orders`);

    ws.onopen = () => {
      store.setConnected(true);
      store.loadTables();
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        store.handleWsEvent(data);

        // Push notification for new orders
        if (data.event === "order_created" && Notification.permission === "granted") {
          new Notification("🍽️ New Order", {
            body: `Table ${data.table_id} – Order ${String(data.order_id).slice(0, 8)}`,
            tag: data.order_id,
          });
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      store.setConnected(false);
      timer = setTimeout(open, 2000);
    };
  }

  open();

  return () => {
    if (timer) clearTimeout(timer);
    ws?.close();
  };
}
