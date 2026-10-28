/* Types for the guest table tablet – mirror backend/app/schemas/{menu,order,guest}.py */

export type Lang = "sq" | "en";

export interface SizeOption {
  code: string;
  price: number;
}

export interface AddonOption {
  id: string;
  name: string;
  name_en: string;
  price: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  price: number;
  image_url: string;
  available: boolean;
  sort_order: number;
  is_popular: boolean;
  is_signature: boolean;
  is_alcoholic: boolean;
  station: "kitchen" | "bar" | string;
  sizes: SizeOption[];
  addons: AddonOption[];
}

export interface Category {
  id: string;
  name: string;
  name_en: string;
  sort_order: number;
  items: MenuItem[];
}

export type OrderStatus = "pending" | "preparing" | "ready" | "served" | "voided";

export interface OrderItem {
  id: string;
  menu_item_id: string;
  name: string;
  station: string;
  size: string;
  addons: { id: string; name: string; price: number }[];
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions: string;
}

export interface Order {
  id: string;
  table_id: string;
  table_number: number | null;
  session_id: string;
  status: OrderStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface Tab {
  table_number: number;
  session_id: string;
  orders: Order[];
  total: number;
}

export interface GuestTable {
  id: string;
  number: number;
  seats: number;
  session_id: string;
}

export type RequestKind = "waiter" | "water" | "bill";
export type PaymentMethod = "" | "cash" | "card";

export interface ServiceRequest {
  id: string;
  table_id: string;
  table_number: number | null;
  kind: RequestKind;
  payment_method: PaymentMethod;
  status: "open" | "done" | "cancelled";
  created_at: string;
}

/** A line in the guest's not-yet-sent order. */
export interface CartLine {
  uid: string;
  item: MenuItem;
  size: string;
  addonIds: string[];
  /** Note chip ids (sent to the kitchen in Albanian) */
  chips: string[];
  /** Free-text note, sent as typed */
  note: string;
  qty: number;
}
