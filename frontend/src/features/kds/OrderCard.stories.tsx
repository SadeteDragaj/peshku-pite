/* Storybook stories for OrderCard. */

import type { Meta, StoryObj } from "@storybook/react";
import OrderCard from "./OrderCard";
import type { Order } from "./types";

const baseOrder: Order = {
  id: "ord-1",
  table_id: "5",
  status: "pending",
  notes: "",
  created_at: new Date(Date.now() - 120_000).toISOString(),
  updated_at: new Date().toISOString(),
  items: [
    { id: "oi1", menu_item_id: "Burger", quantity: 2, unit_price: 12.5, subtotal: 25, special_instructions: "" },
    { id: "oi2", menu_item_id: "Fries", quantity: 1, unit_price: 5, subtotal: 5, special_instructions: "Extra crispy" },
  ],
};

const meta: Meta<typeof OrderCard> = {
  title: "KDS/OrderCard",
  component: OrderCard,
  argTypes: {
    onUpdateStatus: { action: "updateStatus" },
  },
};
export default meta;

type Story = StoryObj<typeof OrderCard>;

export const Pending: Story = {
  args: { order: { ...baseOrder, status: "pending" } },
};

export const Preparing: Story = {
  args: { order: { ...baseOrder, id: "ord-2", status: "preparing" } },
};

export const Ready: Story = {
  args: { order: { ...baseOrder, id: "ord-3", status: "ready" } },
};

export const WithNotes: Story = {
  args: {
    order: { ...baseOrder, id: "ord-4", status: "pending", notes: "Nut allergy – no peanut oil!" },
  },
};
