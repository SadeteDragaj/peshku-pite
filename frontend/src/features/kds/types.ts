/* Shared types for the Kitchen Display System. */

export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "voided";

export interface OrderItem {
  id: string;
  menu_item_id: string;
  /** Item name snapshot (older orders / stories may not have it) */
  name?: string;
  /** "kitchen" | "bar" – drives the KDS filter */
  station?: string;
  size?: string;
  addons?: { id: string; name: string; price: number }[];
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions: string;
}

export interface Order {
  id: string;
  table_id: string;
  table_number?: number | null;
  session_id?: string;
  status: OrderStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

/** Shape of WebSocket messages from the server (order events carry the full order). */
export interface OrderWsEvent {
  event: "order_created" | "order_status_changed" | "order_closed" | string;
  order?: Order;
  order_id?: string;
}

export type StationFilter = "kitchen" | "bar" | "all";
