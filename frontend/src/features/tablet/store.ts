/* Zustand store for the guest tablet: table identity, menu, cart, tab and service requests. */

import { create } from "zustand";
import { ApiError, api } from "../../lib/api";
import { NOTE_CHIPS } from "./i18n";
import type {
  CartLine,
  Category,
  GuestTable,
  Lang,
  Order,
  PaymentMethod,
  RequestKind,
  ServiceRequest,
  Tab,
} from "./types";

const keyStorage = (n: number) => `pip.tableKey.${n}`;
const AGE_STORAGE = "pip.ageConfirmedSession";

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode – the key then lives only in memory */
  }
}

let uidCounter = 0;
const nextUid = () => `l${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

export type Phase = "loading" | "ready" | "badKey" | "offline";
export type Panel = null | "service" | "about";

interface TabletState {
  tableNumber: number | null;
  key: string | null;
  table: GuestTable | null;
  phase: Phase;
  lang: Lang;
  menu: Category[] | null;
  cart: CartLine[];
  tab: Tab | null;
  requests: ServiceRequest[];
  ageOkSession: string | null;
  panel: Panel;
  toast: string | null;

  init: (tableNumber: number, keyFromUrl: string | null) => Promise<void>;
  setLang: (lang: Lang) => void;
  setPanel: (panel: Panel) => void;
  showToast: (text: string) => void;

  loadMenu: () => Promise<void>;
  refreshTab: () => Promise<void>;
  refreshRequests: () => Promise<void>;
  /** Called when staff clear the table: fresh session, empty cart. */
  resetSession: () => Promise<void>;

  confirmAge: () => void;
  needsAgeCheck: () => boolean;

  addLine: (line: Omit<CartLine, "uid">) => void;
  replaceLine: (uid: string, line: Omit<CartLine, "uid">) => void;
  setQty: (uid: string, qty: number) => void;
  removeLine: (uid: string) => void;
  sendOrder: () => Promise<Order>;

  createRequest: (kind: RequestKind, method?: PaymentMethod) => Promise<void>;
  cancelRequest: (kind: RequestKind) => Promise<void>;
  sendFeedback: (rating: number, tags: string[], comment: string) => Promise<void>;
}

export const useTablet = create<TabletState>((set, get) => {
  const headers = () => ({ "X-Table-Key": get().key ?? "" });
  const base = () => `/guest/tables/${get().tableNumber}`;

  /** Run a table-scoped call; flips the screen to "bad key" / "offline" when needed. */
  async function guarded<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      const result = await fn();
      if (get().phase === "offline") set({ phase: "ready" });
      return result;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) set({ phase: "badKey" });
      else if (!(e instanceof ApiError)) set({ phase: "offline" });
      return undefined;
    }
  }

  return {
    tableNumber: null,
    key: null,
    table: null,
    phase: "loading",
    lang: "sq",
    menu: null,
    cart: [],
    tab: null,
    requests: [],
    ageOkSession: readStorage(AGE_STORAGE),
    panel: null,
    toast: null,

    init: async (tableNumber, keyFromUrl) => {
      if (keyFromUrl) writeStorage(keyStorage(tableNumber), keyFromUrl);
      const key = keyFromUrl ?? readStorage(keyStorage(tableNumber));
      set({ tableNumber, key, phase: key ? "loading" : "badKey" });
      if (!key) return;

      try {
        const table = await api.get<GuestTable>(`/guest/tables/${tableNumber}`, headers());
        set({ table, phase: "ready" });
      } catch (e) {
        const badKey = e instanceof ApiError && e.status === 401;
        set({ phase: badKey ? "badKey" : "offline" });
        // The offline screen promises a retry – keep trying until the server answers.
        if (!badKey) window.setTimeout(() => void get().init(tableNumber, null), 3000);
        return;
      }
      await Promise.all([get().loadMenu(), get().refreshTab(), get().refreshRequests()]);
    },

    setLang: (lang) => set({ lang }),
    setPanel: (panel) => set({ panel }),
    showToast: (text) => {
      set({ toast: text });
      window.setTimeout(() => {
        if (get().toast === text) set({ toast: null });
      }, 1800);
    },

    loadMenu: async () => {
      const menu = await guarded(() => api.get<Category[]>("/guest/menu"));
      if (menu) set({ menu });
    },
    refreshTab: async () => {
      const tab = await guarded(() => api.get<Tab>(`${base()}/tab`, headers()));
      if (tab) set({ tab });
    },
    refreshRequests: async () => {
      const requests = await guarded(() => api.get<ServiceRequest[]>(`${base()}/requests`, headers()));
      if (requests) set({ requests });
    },
    resetSession: async () => {
      const table = await guarded(() => api.get<GuestTable>(base(), headers()));
      set({ cart: [], tab: null, requests: [], panel: null, lang: "sq", ...(table ? { table } : {}) });
      await get().refreshTab();
    },

    confirmAge: () => {
      const session = get().table?.session_id ?? null;
      if (session) writeStorage(AGE_STORAGE, session);
      set({ ageOkSession: session });
    },
    needsAgeCheck: () => {
      const { table, ageOkSession } = get();
      return !table || ageOkSession !== table.session_id;
    },

    addLine: (line) => {
      // Merge with an identical line instead of listing it twice
      const same = get().cart.find(
        (l) =>
          l.item.id === line.item.id &&
          l.size === line.size &&
          l.note === line.note &&
          l.addonIds.join() === line.addonIds.join() &&
          l.chips.join() === line.chips.join(),
      );
      if (same) get().setQty(same.uid, same.qty + line.qty);
      else set({ cart: [...get().cart, { ...line, uid: nextUid() }] });
    },
    replaceLine: (uid, line) => set({ cart: get().cart.map((l) => (l.uid === uid ? { ...line, uid } : l)) }),
    setQty: (uid, qty) =>
      set({
        cart:
          qty <= 0
            ? get().cart.filter((l) => l.uid !== uid)
            : get().cart.map((l) => (l.uid === uid ? { ...l, qty: Math.min(qty, 50) } : l)),
      }),
    removeLine: (uid) => set({ cart: get().cart.filter((l) => l.uid !== uid) }),

    sendOrder: async () => {
      const items = get().cart.map((l) => ({
        menu_item_id: l.item.id,
        quantity: l.qty,
        size: l.size,
        addon_ids: l.addonIds,
        special_instructions: [
          ...l.chips.map((id) => NOTE_CHIPS.find((c) => c.id === id)?.sq ?? id),
          l.note.trim(),
        ]
          .filter(Boolean)
          .join(", "),
      }));
      try {
        const order = await api.post<Order>(`${base()}/orders`, { items }, headers());
        set({ cart: [] });
        await get().refreshTab();
        return order;
      } catch (e) {
        // An item may have sold out while the guest was choosing
        if (e instanceof ApiError && e.status === 400) await get().loadMenu();
        throw e;
      }
    },

    createRequest: async (kind, method = "") => {
      await api.post(`${base()}/requests`, { kind, payment_method: method }, headers());
      await get().refreshRequests();
    },
    cancelRequest: async (kind) => {
      const req = get().requests.find((r) => r.kind === kind);
      if (!req) return;
      await api.del(`${base()}/requests/${req.id}`, headers());
      await get().refreshRequests();
    },
    sendFeedback: async (rating, tags, comment) => {
      await api.post(`${base()}/feedback`, { rating, tags, comment }, headers());
    },
  };
});

