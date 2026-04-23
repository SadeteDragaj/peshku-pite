/* Shared types for the Kitchen Display System. */

export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "voided";

export interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions: string;
}

export interface Order {
  id: string;
  table_id: string;
  status: OrderStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

/** Shape of WebSocket messages from the server. */
export interface OrderWsEvent {
  event: "order_created" | "order_updated";
  order: Order;
}
