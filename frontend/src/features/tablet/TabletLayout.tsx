/* Shell for /t/:number – links the tablet to its table, keeps data live, returns to the
 * attract screen when idle, and hosts the overlays that can open from any screen. */

import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import AboutSheet from "./AboutSheet";
import ServiceSheet from "./ServiceSheet";
import { useTablet } from "./store";
import { FishMark, Icon, Toast, useT } from "./ui";

const IDLE_MS = 2 * 60 * 1000;

export default function TabletLayout() {
  const { number } = useParams();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();

  const phase = useTablet((s) => s.phase);
  const table = useTablet((s) => s.table);
  const panel = useTablet((s) => s.panel);
  const init = useTablet((s) => s.init);

  const tableNumber = Number(number);
  const home = `/t/${tableNumber}`;

  // 1. Link to the table. The key arrives once via ?key=… and is then remembered.
  useEffect(() => {
    if (!Number.isInteger(tableNumber) || tableNumber < 1) return;
    const key = search.get("key");
    void init(tableNumber, key);
    if (key) {
      search.delete("key");
      setSearch(search, { replace: true }); // don't leave the key on screen
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableNumber]);

  // 2. Live updates for this table over the shared order WebSocket, plus a slow poll as a safety net.
  useEffect(() => {
    if (!table) return;
    let ws: WebSocket | null = null;
    let retry: number | undefined;
    let closed = false;
    const s = useTablet.getState;

    const open = () => {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${window.location.host}/ws/orders`);
      ws.onopen = () => {
        void s().refreshTab();
        void s().refreshRequests();
      };
      ws.onmessage = (e) => {
        let evt: Record<string, any>;
        try {
          evt = JSON.parse(e.data);
        } catch {
          return;
        }
        if (evt.event === "menu_changed") void s().loadMenu();
        const tableId = evt.table_id ?? evt.order?.table_id ?? evt.request?.table_id;
        if (tableId !== table.id) return;
        if (evt.event === "table_cleared") {
          void s().resetSession().then(() => navigate(home, { replace: true }));
        } else if (String(evt.event).startsWith("order")) {
          void s().refreshTab();
        } else if (String(evt.event).startsWith("service_request")) {
          void s().refreshRequests();
        }
      };
      ws.onclose = () => {
        if (!closed) retry = window.setTimeout(open, 2000);
      };
    };
    open();

    const poll = window.setInterval(() => {
      void s().refreshTab();
      void s().refreshRequests();
      void s().loadMenu();
    }, 60_000);

    return () => {
      closed = true;
      window.clearTimeout(retry);
      window.clearInterval(poll);
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.id]);

  // 3. Idle → back to the attract screen (the cart is kept).
  const lastTouch = useRef(Date.now());
  useEffect(() => {
    const touch = () => (lastTouch.current = Date.now());
    window.addEventListener("pointerdown", touch);
    const timer = window.setInterval(() => {
      const onAttract = location.pathname.replace(/\/$/, "") === home;
      if (!onAttract && Date.now() - lastTouch.current > IDLE_MS) {
        useTablet.getState().setPanel(null);
        navigate(home);
      }
    }, 10_000);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.clearInterval(timer);
    };
  }, [location.pathname, home, navigate]);

  if (phase === "badKey") {
    return (
      <Fullscreen>
        <FishMark size={72} />
        <h1 className="font-display text-[34px] font-extrabold">{t.keyInvalid}</h1>
        <p className="max-w-md text-lg text-brand-muted">{t.keyInvalidBody}</p>
      </Fullscreen>
    );
  }
  if (phase === "loading" || !table) {
    return (
      <Fullscreen>
        <FishMark size={72} />
        <p className="text-lg text-brand-muted">{phase === "offline" ? t.offline : t.loadingMenu}</p>
      </Fullscreen>
    );
  }

  return (
    <div className="kiosk h-dvh w-full overflow-hidden bg-brand-cream text-brand-ink">
      <Outlet />
      {panel === "service" && <ServiceSheet />}
      {panel === "about" && <AboutSheet />}
      {phase === "offline" && (
        <div className="fixed left-1/2 top-4 z-50 flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 rounded-full bg-brand-ink px-5 py-2.5 text-[15px] font-semibold text-brand-paper">
          <Icon.Info size={18} /> {t.offline}
        </div>
      )}
      <Toast />
    </div>
  );
}

function Fullscreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="kiosk flex h-dvh w-full flex-col items-center justify-center gap-4 bg-brand-cream p-6 text-center text-brand-ink md:p-10">
      {children}
    </div>
  );
}
