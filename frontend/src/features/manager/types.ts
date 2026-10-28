/* Manager board API shapes (backend/app/schemas/manager.py). */

export type StaffRole = "waiter" | "kitchen" | "admin";

export interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  active: boolean;
  created_at: string;
  table_numbers: number[];
}

export interface ManagerTable {
  id: string;
  number: number;
  seats: number;
  occupied: boolean;
  assigned_waiter_id: string | null;
  assigned_waiter_name: string;
  open_orders: number;
  pending_total: number;
}

export interface DaySummary {
  day: string;
  revenue: number;
  orders: number;
  avg_order: number;
  items_sold: number;
  tabs: number;
  voided_orders: number;
  voided_value: number;
  open_orders: number;
  open_requests: number;
  avg_rating: number | null;
  reviews: number;
  by_hour: { hour: number; revenue: number; orders: number }[];
  by_waiter: { waiter_id: string | null; name: string; revenue: number; orders: number }[];
  top_items: { name: string; quantity: number; revenue: number }[];
  last_7_days: { day: string; revenue: number; orders: number }[];
}

export interface Review {
  id: string;
  table_number: number | null;
  rating: number;
  tags: string[];
  comment: string;
  created_at: string;
}

export interface ReviewsOverview {
  count: number;
  average: number | null;
  distribution: number[];
  top_tags: { tag: string; count: number }[];
  reviews: Review[];
}
