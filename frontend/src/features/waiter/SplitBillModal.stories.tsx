import type { Meta, StoryObj } from "@storybook/react";
import SplitBillModal from "./SplitBillModal";
import type { Order } from "../kds/types";

const order: Order = {
  id: "ord-abc", table_id: "t1", status: "pending", notes: "",
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  items: [
    { id: "oi1", menu_item_id: "Burger", quantity: 2, unit_price: 12.5, subtotal: 25, special_instructions: "" },
    { id: "oi2", menu_item_id: "Fries", quantity: 1, unit_price: 5, subtotal: 5, special_instructions: "" },
    { id: "oi3", menu_item_id: "Soda", quantity: 2, unit_price: 3.5, subtotal: 7, special_instructions: "" },
  ],
};

const meta: Meta<typeof SplitBillModal> = {
  title: "Waiter/SplitBillModal",
  component: SplitBillModal,
  argTypes: {
    onConfirm: { action: "confirm" },
    onCancel: { action: "cancel" },
  },
};
export default meta;
type Story = StoryObj<typeof SplitBillModal>;

export const Default: Story = { args: { order } };
