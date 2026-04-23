/* Types for inventory management. */

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity_on_hand: number;
  low_stock_threshold: number;
  cost_per_unit: number;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  inventory_item_id: string;
  transaction_type: "purchase" | "wastage" | "consumption" | "adjustment";
  quantity_change: number;
  notes: string;
  reference_order_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
