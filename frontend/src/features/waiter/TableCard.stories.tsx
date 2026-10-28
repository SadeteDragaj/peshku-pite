import type { Meta, StoryObj } from "@storybook/react";
import TableCard from "./TableCard";
import type { TableOverview } from "./types";

const occupied: TableOverview = {
  id: "t1", number: 3, seats: 4, occupied: true, assigned_waiter_id: "w1", assigned_waiter_name: "Ana",
  total_pending: 42.50,
  active_orders: [
    {
      id: "ord-abc", table_id: "t1", status: "pending", notes: "", created_at: new Date(Date.now() - 120_000).toISOString(), updated_at: new Date().toISOString(),
      items: [
        { id: "oi1", menu_item_id: "Burger", quantity: 2, unit_price: 12.5, subtotal: 25, special_instructions: "" },
        { id: "oi2", menu_item_id: "Fries", quantity: 1, unit_price: 5, subtotal: 5, special_instructions: "Extra crispy" },
      ],
    },
    {
      id: "ord-def", table_id: "t1", status: "ready", notes: "", created_at: new Date(Date.now() - 300_000).toISOString(), updated_at: new Date().toISOString(),
      items: [{ id: "oi3", menu_item_id: "Soda", quantity: 1, unit_price: 3.5, subtotal: 3.5, special_instructions: "" }],
    },
  ],
};

const free: TableOverview = {
  id: "t2", number: 7, seats: 2, occupied: false, assigned_waiter_id: null, assigned_waiter_name: "",
  total_pending: 0, active_orders: [],
};

const meta: Meta<typeof TableCard> = {
  title: "Waiter/TableCard",
  component: TableCard,
  argTypes: {
    onTransfer: { action: "transfer" },
    onCloseOrder: { action: "closeOrder" },
    onSplitBill: { action: "splitBill" },
  },
};
export default meta;
type Story = StoryObj<typeof TableCard>;

export const OccupiedTable: Story = { args: { table: occupied } };
export const FreeTable: Story = { args: { table: free } };
