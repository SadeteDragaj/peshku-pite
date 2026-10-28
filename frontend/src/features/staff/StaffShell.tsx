/* Shared chrome for staff screens: dark-teal header with section nav, and a login guard. */

import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { isLoggedIn, logout } from "../../lib/api";
import { FishMark } from "../tablet/ui";

export type StaffRole = "waiter" | "kitchen" | "admin" | "customer";

function tokenPayload(): { sub?: string; role?: StaffRole } | null {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

export function currentRole(): StaffRole | null {
  return tokenPayload()?.role ?? null;
}

export function currentUserId(): string | null {
  return tokenPayload()?.sub ?? null;
}

/** Redirects to /login unless a staff member with one of `roles` is signed in. */
export function RequireStaff({ roles, children }: { roles: StaffRole[]; children: ReactNode }) {
  const location = useLocation();
  const role = currentRole();
  if (!isLoggedIn() || !role || !roles.includes(role)) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

const NAV = [
  { to: "/manager", label: "Menaxheri", roles: ["admin"] },
  { to: "/waiter", label: "Kamarieri", roles: ["waiter", "admin"] },
  { to: "/menu-manager", label: "Menyja", roles: ["admin"] },
  { to: "/kitchen", label: "Kuzhina", roles: ["kitchen", "waiter", "admin"] },
];

export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export const clock = (d: Date) => d.toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit", hour12: false });

export function StaffHeader({ title, connected, children, large = false }: {
  title: string;
  connected?: boolean;
  children?: ReactNode;
  large?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const role = currentRole();
  const now = useClock();
  const links = NAV.filter((n) => role && n.roles.includes(role));

  return (
    <header
      className={`flex flex-none flex-wrap items-center gap-x-3 gap-y-2 bg-brand-ink px-3 py-2 text-brand-paper md:gap-x-5 md:px-6 lg:flex-nowrap lg:py-0 ${
        large ? "lg:h-[92px]" : "lg:h-[72px]"
      }`}
    >
      <div className="flex flex-none items-center gap-2.5">
        <FishMark size={large ? 40 : 32} />
        <span className={`hidden font-display font-extrabold lg:inline ${large ? "text-[30px]" : "text-[22px]"}`}>{title}</span>
      </div>
      {links.length > 1 && (
      <nav className="scroll-thin order-last flex w-full min-w-0 gap-1 overflow-x-auto rounded-[14px] bg-[#24504F] p-1 md:order-none md:w-auto">
        {links.map((n) => {
          const on = location.pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              aria-current={on ? "page" : undefined}
              className={`flex h-11 flex-none items-center whitespace-nowrap rounded-[10px] px-3 text-[15px] font-bold md:h-12 md:px-5 md:text-base ${on ? "bg-brand-paper text-brand-ink" : "text-[#D2E4DF]"}`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      )}
      {/* Below lg extra controls (e.g. kitchen filters) drop to their own row */}
      {children && (
        <div className="order-last flex w-full flex-wrap items-center gap-3 lg:order-none lg:w-auto lg:flex-nowrap">{children}</div>
      )}
      <div className="flex-1" />
      {connected !== undefined && (
        <span
          className={`flex flex-none items-center gap-2 text-sm font-semibold ${connected ? "text-[#A5CFC8]" : "text-brand-amber"}`}
          title={connected ? "Live" : "Po rilidhet…"}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-brand-teal" : "animate-pulse bg-brand-amber"}`} />
          <span className="hidden sm:inline">{connected ? "Live" : "Po rilidhet…"}</span>
        </span>
      )}
      <span className={`hidden flex-none font-display font-bold tabular-nums lg:inline ${large ? "text-[34px]" : "text-2xl"}`}>{clock(now)}</span>
      <button
        onClick={() => {
          logout();
          navigate("/login");
        }}
        className="h-11 flex-none rounded-xl px-3 text-sm font-semibold text-[#D2E4DF] hover:bg-white/10"
      >
        Dil
      </button>
    </header>
  );
}

/** Shared order WebSocket for staff screens, with reconnect. */
export function connectOrderSocket(onEvent: (evt: any) => void, onStatus: (connected: boolean) => void) {
  let ws: WebSocket | null = null;
  let retry: number | undefined;
  let closed = false;
  const open = () => {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${window.location.host}/ws/orders`);
    ws.onopen = () => onStatus(true);
    ws.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data));
      } catch {
        /* ignore malformed */
      }
    };
    ws.onclose = () => {
      onStatus(false);
      if (!closed) retry = window.setTimeout(open, 2000);
    };
  };
  open();
  return () => {
    closed = true;
    window.clearTimeout(retry);
    ws?.close();
  };
}
