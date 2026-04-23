/* Revenue per day bar chart using Recharts. */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { DailySales } from "./types";

interface Props {
  data: DailySales[];
}

export default function RevenueChart({ data }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
      <h3 className="text-lg font-semibold mb-4">Revenue per Day</h3>
      {data.length === 0 ? (
        <p className="text-gray-400 text-sm italic text-center py-8">No data for this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="sale_date"
              tick={{ fontSize: 12 }}
              tickFormatter={(v: string) => v.slice(5)} /* MM-DD */
            />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
            <Tooltip
              formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
              labelFormatter={(label: any) => `Date: ${label}`}
            />
            <Legend />
            <Bar dataKey="total_revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
