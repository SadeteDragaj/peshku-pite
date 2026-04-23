/* Top menu items horizontal bar chart. */

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { TopMenuItem } from "./types";

interface Props {
  data: TopMenuItem[];
}

export default function TopItemsChart({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
      <h3 className="text-lg font-semibold mb-4">Top Menu Items</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="item_name" tick={{ fontSize: 12 }} width={70} />
          <Tooltip formatter={(v: any) => [v, "Qty Sold"]} />
          <Bar dataKey="total_quantity" name="Quantity" fill="#10b981" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
