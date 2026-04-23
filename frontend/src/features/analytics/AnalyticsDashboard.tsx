/* Full analytics dashboard page. */

import { useEffect } from "react";
import { useAnalyticsStore } from "./analyticsStore";
import SummaryCards from "./SummaryCards";
import RevenueChart from "./RevenueChart";
import OrdersChart from "./OrdersChart";
import TopItemsChart from "./TopItemsChart";

export default function AnalyticsDashboard() {
  const data = useAnalyticsStore((s) => s.data);
  const loading = useAnalyticsStore((s) => s.loading);
  const error = useAnalyticsStore((s) => s.error);
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const setDateRange = useAnalyticsStore((s) => s.setDateRange);
  const load = useAnalyticsStore((s) => s.load);

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">📊 Analytics</h1>
        <div className="flex items-center gap-2 text-sm">
          <label>From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(e.target.value, dateRange.to)}
            className="border rounded px-2 py-1"
          />
          <label>To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(dateRange.from, e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
      </div>

      {loading && <p className="text-gray-400 mb-4">Loading analytics…</p>}
      {error && <p className="text-red-500 mb-4">{error}</p>}

      {data && (
        <>
          <SummaryCards
            totalRevenue={data.total_revenue}
            totalOrders={data.total_orders}
            avgOrderValue={data.avg_order_value}
            totalItemsSold={data.total_items_sold}
          />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <RevenueChart data={data.daily} />
            <OrdersChart data={data.daily} />
          </div>
          <TopItemsChart data={data.top_items} />
        </>
      )}
    </div>
  );
}
