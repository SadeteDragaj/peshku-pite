/* Storybook stories for StatusColumn. */

import type { Meta, StoryObj } from "@storybook/react";
import StatusColumn from "./StatusColumn";
import type { Order } from "./types";

const orders: Order[] = [
  {
    id: "ord-1", table_id: "3", status: "pending", notes: "",
    created_at: new Date(Date.now() - 300_000).toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: "oi1", menu_item_id: "Margherita Pizza", quantity: 1, unit_price: 14, subtotal: 14, special_instructions: "" },
    ],
  },
  {
    id: "ord-2", table_id: "7", status: "pending", notes: "Rush order",
    created_at: new Date(Date.now() - 60_000).toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: "oi2", menu_item_id: "Caesar Salad", quantity: 2, unit_price: 9, subtotal: 18, special_instructions: "No croutons" },
      { id: "oi3", menu_item_id: "Lemonade", quantity: 2, unit_price: 4, subtotal: 8, special_instructions: "" },
    ],
  },
];

const meta: Meta<typeof StatusColumn> = {
  title: "KDS/StatusColumn",
  component: StatusColumn,
  argTypes: { onUpdateStatus: { action: "updateStatus" } },
};
export default meta;

type Story = StoryObj<typeof StatusColumn>;

export const PendingColumn: Story = {
  args: { title: "🟡 Pending", status: "pending", orders },
};

export const EmptyColumn: Story = {
  args: { title: "🟢 Ready", status: "ready", orders: [] },
};
