import { create } from "zustand";
import { api } from "../../lib/api";
import type { AnalyticsSummary } from "./types";

interface AnalyticsState {
  data: AnalyticsSummary | null;
  loading: boolean;
  error: string | null;
  dateRange: { from: string; to: string };
  setDateRange: (from: string, to: string) => void;
  load: () => Promise<void>;
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  data: null,
  loading: false,
  error: null,
  dateRange: defaultRange(),

  setDateRange: (from, to) => {
    set({ dateRange: { from, to } });
    get().load();
  },

  load: async () => {
    const { from, to } = get().dateRange;
    set({ loading: true, error: null });
    try {
      const data = await api.get<AnalyticsSummary>(`/analytics/daily-sales?from=${from}&to=${to}`);
      set({ data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },
}));
