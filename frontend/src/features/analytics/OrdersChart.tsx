/* Orders per day line chart. */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { DailySales } from "./types";

interface Props {
  data: DailySales[];
}

export default function OrdersChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
      <h3 className="text-lg font-semibold mb-4">Orders per Day</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="sale_date" tick={{ fontSize: 12 }} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip labelFormatter={(l: any) => `Date: ${l}`} />
          <Line type="monotone" dataKey="order_count" name="Orders" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="items_sold" name="Items Sold" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
