/* Zustand store for waiter dashboard state. */

import { create } from "zustand";
import { api } from "../../lib/api";
import type { CloseOrderResponse, ServiceRequest, SplitBillResponse, TableOverview } from "./types";

interface WaiterState {
  tables: TableOverview[];
  requests: ServiceRequest[];
  loading: boolean;
  error: string | null;
  connected: boolean;

  /* Actions */
  setConnected: (v: boolean) => void;
  loadTables: (mineOnly?: boolean) => Promise<void>;
  loadRequests: () => Promise<void>;
  resolveRequest: (requestId: string) => Promise<void>;
  clearTable: (tableId: string) => Promise<void>;
  transferTable: (tableId: string, targetWaiterId: string) => Promise<void>;
  splitBill: (orderId: string, splits: string[][]) => Promise<SplitBillResponse>;
  closeOrder: (orderId: string, voidOrder: boolean) => Promise<CloseOrderResponse>;
  handleWsEvent: (data: any) => void;
}

export const useWaiterStore = create<WaiterState>((set, get) => ({
  tables: [],
  requests: [],
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

  loadRequests: async () => {
    try {
      set({ requests: await api.get<ServiceRequest[]>("/waiter/requests") });
    } catch {
      /* keep the last list */
    }
  },

  resolveRequest: async (requestId) => {
    await api.post(`/waiter/requests/${requestId}/done`, {});
    set({ requests: get().requests.filter((r) => r.id !== requestId) });
  },

  clearTable: async (tableId) => {
    await api.post(`/waiter/tables/${tableId}/clear`, {});
    await Promise.all([get().loadTables(), get().loadRequests()]);
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
    const evt: string = data?.event ?? "";
    if (evt.startsWith("order") || evt === "table_transferred" || evt === "table_cleared") {
      get().loadTables();
    }
    if (evt.startsWith("service_request") || evt === "table_cleared") {
      get().loadRequests();
    }
  },
}));

/* --------------------------------------------------------------------------
 * WebSocket hook for waiter dashboard
 * -------------------------------------------------------------------------- */
let ws: WebSocket | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let closedByUs = false;

const REQUEST_TEXT: Record<string, string> = {
  waiter: "Thirri kamarierin",
  water: "Kërkoi ujë",
  bill: "Kërkoi llogarinë",
};

export function connectWaiterSocket() {
  const store = useWaiterStore.getState();
  closedByUs = false;

  function open() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws/orders`);

    ws.onopen = () => {
      store.setConnected(true);
      store.loadTables();
      store.loadRequests();
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        store.handleWsEvent(data);

        if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
        if (data.event === "order_created") {
          new Notification(`Tavolina ${data.table_number ?? ""} · porosi e re`, { tag: data.order_id });
        } else if (data.event === "order_status_changed" && data.new_status === "ready") {
          new Notification(`Tavolina ${data.order?.table_number ?? ""} · porosia gati`, { tag: `${data.order_id}-ready` });
        } else if (data.event === "service_request") {
          const r = data.request;
          new Notification(`Tavolina ${r.table_number} · ${REQUEST_TEXT[r.kind] ?? r.kind}`, { tag: r.id });
        }
      } catch {
        /* ignore */
      }
    };

    ws.onclose = () => {
      store.setConnected(false);
      if (!closedByUs) timer = setTimeout(open, 2000);
    };
  }

  open();

  return () => {
    closedByUs = true;
    if (timer) clearTimeout(timer);
    ws?.close();
  };
}
