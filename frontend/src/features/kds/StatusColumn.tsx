/* A column in the KDS grid showing all orders of a given status. */

import type { Order, OrderStatus } from "./types";
import OrderCard from "./OrderCard";

interface Props {
  title: string;
  status: OrderStatus;
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
}

const HEADER_COLORS: Record<string, string> = {
  pending: "text-yellow-700",
  preparing: "text-blue-700",
  ready: "text-green-700",
};

export default function StatusColumn({ title, status, orders, onUpdateStatus }: Props) {
  return (
    <div className="flex-1 min-w-[280px]">
      <h2 className={`text-lg font-bold mb-3 ${HEADER_COLORS[status] ?? "text-gray-700"}`}>
        {title}{" "}
        <span className="text-sm font-normal text-gray-400">({orders.length})</span>
      </h2>
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} />
        ))}
        {orders.length === 0 && (
          <p className="text-gray-400 text-sm italic">No orders</p>
        )}
      </div>
    </div>
  );
}
