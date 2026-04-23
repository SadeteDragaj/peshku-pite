/* Zustand store for inventory management. */

import { create } from "zustand";
import { api } from "../../lib/api";
import type { InventoryItem, InventoryTransaction, PaginatedResponse } from "./types";

interface InventoryState {
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  total: number;
  loading: boolean;
  error: string | null;

  loadItems: (opts?: { lowStockOnly?: boolean; search?: string }) => Promise<void>;
  loadTransactions: (itemId: string) => Promise<void>;
  createItem: (data: Partial<InventoryItem>) => Promise<void>;
  updateItem: (id: string, data: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addTransaction: (data: {
    inventory_item_id: string;
    transaction_type: string;
    quantity_change: number;
    notes?: string;
  }) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  transactions: [],
  total: 0,
  loading: false,
  error: null,

  loadItems: async (opts) => {
    set({ loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (opts?.lowStockOnly) params.set("low_stock_only", "true");
      if (opts?.search) params.set("search", opts.search);
      params.set("page_size", "200");
      const res = await api.get<PaginatedResponse<InventoryItem>>(`/inventory/items?${params}`);
      set({ items: res.items, total: res.total, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadTransactions: async (itemId) => {
    const res = await api.get<PaginatedResponse<InventoryTransaction>>(
      `/inventory/transactions?inventory_item_id=${itemId}&page_size=50`
    );
    set({ transactions: res.items });
  },

  createItem: async (data) => {
    await api.post("/inventory/items", data);
    await get().loadItems();
  },

  updateItem: async (id, data) => {
    await api.patch(`/inventory/items/${id}`, data);
    await get().loadItems();
  },

  deleteItem: async (id) => {
    await fetch(`/api/inventory/items/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    await get().loadItems();
  },

  addTransaction: async (data) => {
    await api.post("/inventory/transactions", data);
    await get().loadItems();
    if (data.inventory_item_id) {
      await get().loadTransactions(data.inventory_item_id);
    }
  },
}));
