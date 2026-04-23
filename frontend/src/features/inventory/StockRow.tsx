/* Row in the inventory stock table. */

import type { InventoryItem } from "./types";

interface Props {
  item: InventoryItem;
  onPurchase: (item: InventoryItem) => void;
  onWastage: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onViewHistory: (item: InventoryItem) => void;
}

export default function StockRow({ item, onPurchase, onWastage, onEdit, onViewHistory }: Props) {
  return (
    <tr className={item.is_low_stock ? "bg-red-50" : ""}>
      <td className="px-4 py-3 font-medium">
        {item.name}
        {item.is_low_stock && (
          <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-red-200 text-red-800 font-bold">LOW</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">{item.quantity_on_hand}</td>
      <td className="px-4 py-3 text-center text-gray-500">{item.unit}</td>
      <td className="px-4 py-3 text-center">{item.low_stock_threshold}</td>
      <td className="px-4 py-3 text-center">${item.cost_per_unit.toFixed(2)}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1 justify-end">
          <button onClick={() => onPurchase(item)} className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200">
            + Purchase
          </button>
          <button onClick={() => onWastage(item)} className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200">
            − Wastage
          </button>
          <button onClick={() => onViewHistory(item)} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
            History
          </button>
          <button onClick={() => onEdit(item)} className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200">
            Edit
          </button>
        </div>
      </td>
    </tr>
  );
}
