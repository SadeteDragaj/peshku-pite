export interface DailySales {
  sale_date: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
  tables_served: number;
  items_sold: number;
}

export interface TopMenuItem {
  menu_item_id: string;
  item_name: string;
  total_quantity: number;
  total_revenue: number;
}

export interface AnalyticsSummary {
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_orders: number;
  avg_order_value: number;
  total_items_sold: number;
  daily: DailySales[];
  top_items: TopMenuItem[];
}
