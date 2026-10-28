/* Zustand store for KDS order state + WebSocket lifecycle. */

import { create } from "zustand";
import { api } from "../../lib/api";
import { toMs } from "../../lib/time";
import type { Order, OrderStatus, OrderWsEvent } from "./types";

const ACTIVE: OrderStatus[] = ["pending", "preparing", "ready"];

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
      .sort((a, b) => toMs(a.created_at) - toMs(b.created_at)),

  setConnected: (v) => set({ connected: v }),

  upsertOrder: (order) => set((s) => ({ orders: { ...s.orders, [order.id]: order } })),

  loadOrders: async () => {
    try {
      // Only what the kitchen still cares about – not the whole history
      const pages = await Promise.all(
        ACTIVE.map((st) => api.get<{ items: Order[] }>(`/orders/?status=${st}&page_size=100`)),
      );
      const map: Record<string, Order> = {};
      for (const page of pages) for (const o of page.items) map[o.id] = o;
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
let closedByUs = false;

export function connectKdsSocket() {
  const store = useKdsStore.getState();
  closedByUs = false;

  function open() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws/orders`);

    ws.onopen = () => {
      store.setConnected(true);
      store.loadOrders(); // auto-refresh on (re)connect
    };

    ws.onmessage = (e) => {
      try {
        const evt: OrderWsEvent & { new_status?: OrderStatus } = JSON.parse(e.data);
        if (evt.order) store.upsertOrder(evt.order);
        else if (evt.event === "order_closed" && evt.order_id && evt.new_status) {
          const existing = useKdsStore.getState().orders[evt.order_id];
          if (existing) store.upsertOrder({ ...existing, status: evt.new_status });
        } else if (evt.event === "order_split") store.loadOrders();
      } catch {
        /* ignore malformed */
      }
    };

    ws.onclose = () => {
      store.setConnected(false);
      if (!closedByUs) reconnectTimer = setTimeout(open, 2000);
    };
  }

  open();

  return () => {
    closedByUs = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
