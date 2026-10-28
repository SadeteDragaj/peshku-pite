/* Shared types for the Waiter Dashboard. */

import type { Order } from "../kds/types";

export interface TableOverview {
  id: string;
  number: number;
  seats: number;
  occupied: boolean;
  assigned_waiter_id: string | null;
  assigned_waiter_name: string;
  active_orders: Order[];
  total_pending: number;
}

export interface WaiterBrief {
  id: string;
  name: string;
}

export interface SplitBillResponse {
  original_order_id: string;
  new_orders: Order[];
}

export interface CloseOrderResponse {
  order_id: string;
  new_status: string;
  table_freed: boolean;
}

/** A guest request from a table tablet. */
export interface ServiceRequest {
  id: string;
  table_id: string;
  table_number: number | null;
  kind: "waiter" | "water" | "bill";
  payment_method: "" | "cash" | "card";
  status: "open" | "done" | "cancelled";
  created_at: string;
}

/** What a floor tile shows, most urgent first. */
export type FloorStatus = "bill" | "called" | "ready" | "waiting" | "seated" | "free";
