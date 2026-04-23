/* Shared types for the Waiter Dashboard. */

import type { Order } from "../kds/types";

export interface TableOverview {
  id: string;
  number: number;
  seats: number;
  occupied: boolean;
  assigned_waiter_id: string | null;
  active_orders: Order[];
  total_pending: number;
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
