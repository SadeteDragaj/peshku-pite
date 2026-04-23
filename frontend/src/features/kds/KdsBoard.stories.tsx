/* Storybook story for the full KdsBoard (mocked store). */

import type { Meta, StoryObj } from "@storybook/react";
import KdsBoard from "./KdsBoard";
import { useKdsStore } from "./kdsStore";
import { useEffect } from "react";
import type { Order } from "./types";

const MOCK_ORDERS: Order[] = [
  {
    id: "o1", table_id: "2", status: "pending", notes: "",
    created_at: new Date(Date.now() - 180_000).toISOString(),
    updated_at: new Date().toISOString(),
    items: [{ id: "i1", menu_item_id: "Steak", quantity: 1, unit_price: 28, subtotal: 28, special_instructions: "Medium rare" }],
  },
  {
    id: "o2", table_id: "5", status: "preparing", notes: "VIP",
    created_at: new Date(Date.now() - 300_000).toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      { id: "i2", menu_item_id: "Pasta", quantity: 2, unit_price: 16, subtotal: 32, special_instructions: "" },
      { id: "i3", menu_item_id: "Wine", quantity: 1, unit_price: 12, subtotal: 12, special_instructions: "" },
    ],
  },
  {
    id: "o3", table_id: "1", status: "ready", notes: "",
    created_at: new Date(Date.now() - 600_000).toISOString(),
    updated_at: new Date().toISOString(),
    items: [{ id: "i4", menu_item_id: "Soup", quantity: 1, unit_price: 8, subtotal: 8, special_instructions: "" }],
  },
];

/** Decorator that seeds the Zustand store with mock data. */
function WithMockData({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const state = useKdsStore.getState();
    state.setConnected(true);
    for (const o of MOCK_ORDERS) state.upsertOrder(o);
  }, []);
  return <>{children}</>;
}

const meta: Meta<typeof KdsBoard> = {
  title: "KDS/KdsBoard",
  component: KdsBoard,
  decorators: [(Story) => <WithMockData><Story /></WithMockData>],
};
export default meta;

type Story = StoryObj<typeof KdsBoard>;

export const Default: Story = {};
