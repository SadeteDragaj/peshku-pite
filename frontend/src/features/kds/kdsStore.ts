/* Zustand store for KDS order state + WebSocket lifecycle. */

import { create } from "zustand";
import { api } from "../../lib/api";
import type { Order, OrderStatus, OrderWsEvent } from "./types";

interface KdsState {
  orders: Record<string, Order>;
  connected: boolean;

  /* Derived helpers */
  byStatus: (status: OrderStatus) => Order[];

  /* Actions */
  setConnected: (v: boolean) => void;
  upsertOrder: (order: Order) => void;
  loadOrders: () => Promise<void>;
  updateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

export const useKdsStore = create<KdsState>((set, get) => ({
  orders: {},
  connected: false,

  byStatus: (status) =>
    Object.values(get().orders)
      .filter((o) => o.status === status)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),

  setConnected: (v) => set({ connected: v }),

  upsertOrder: (order) =>
    set((s) => ({ orders: { ...s.orders, [order.id]: order } })),

  loadOrders: async () => {
    try {
      const res = await api.get<{ items: Order[] }>("/orders?page_size=200");
      const map: Record<string, Order> = {};
      for (const o of res.items) map[o.id] = o;
      set({ orders: map });
    } catch {
      /* swallow – will retry on reconnect */
    }
  },

  updateStatus: async (orderId, status) => {
    const updated = await api.patch<Order>(`/orders/${orderId}/status`, { status });
    get().upsertOrder(updated);
  },
}));

/* --------------------------------------------------------------------------
 * WebSocket connection manager (call once at mount)
 * -------------------------------------------------------------------------- */
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectKdsSocket() {
  const store = useKdsStore.getState();

  function open() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws/orders`);

    ws.onopen = () => {
      store.setConnected(true);
      store.loadOrders(); // auto-refresh on (re)connect
    };

    ws.onmessage = (e) => {
      try {
        const evt: OrderWsEvent = JSON.parse(e.data);
        if (evt.order) store.upsertOrder(evt.order);
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      store.setConnected(false);
      reconnectTimer = setTimeout(open, 2000);
    };
  }

  open();

  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
