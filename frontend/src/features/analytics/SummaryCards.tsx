/* KPI summary cards at the top of the analytics dashboard. */

interface Props {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalItemsSold: number;
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl border-l-4 ${color} bg-white shadow-sm p-5`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default function SummaryCards({ totalRevenue, totalOrders, avgOrderValue, totalItemsSold }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card label="Total Revenue" value={`$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} color="border-green-500" />
      <Card label="Total Orders" value={totalOrders.toLocaleString()} color="border-blue-500" />
      <Card label="Avg Order Value" value={`$${avgOrderValue.toFixed(2)}`} color="border-purple-500" />
      <Card label="Items Sold" value={totalItemsSold.toLocaleString()} color="border-orange-500" />
    </div>
  );
}
