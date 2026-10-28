/* Shared building blocks for the guest tablet UI. */

import type { ReactNode, SVGProps } from "react";
import { Link } from "react-router-dom";
import { STRINGS } from "./i18n";
import { useTablet } from "./store";
import type { MenuItem } from "./types";

export function useT() {
  return STRINGS[useTablet((s) => s.lang)];
}

/* ------------------------------------------------------------------ icons */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  Plus: (p: IconProps) => (
    <Svg strokeWidth={2.5} {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  Minus: (p: IconProps) => (
    <Svg strokeWidth={2.5} {...p}>
      <path d="M5 12h14" />
    </Svg>
  ),
  Close: (p: IconProps) => (
    <Svg strokeWidth={2.2} {...p}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  ),
  Back: (p: IconProps) => (
    <Svg strokeWidth={2.2} {...p}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  ),
  Arrow: (p: IconProps) => (
    <Svg strokeWidth={2.5} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
  ),
  Check: (p: IconProps) => (
    <Svg strokeWidth={3} {...p}>
      <path d="M5 12l5 5 9-10" />
    </Svg>
  ),
  Water: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
    </Svg>
  ),
  Bell: (p: IconProps) => (
    <Svg {...p}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  ),
  Receipt: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </Svg>
  ),
  Clock: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  ),
  Info: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </Svg>
  ),
  Edit: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </Svg>
  ),
  Trash: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Svg>
  ),
  Send: (p: IconProps) => (
    <Svg strokeWidth={2.2} {...p}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
    </Svg>
  ),
  Star: ({ filled, ...p }: IconProps & { filled?: boolean }) => (
    <Svg strokeWidth={1.6} fill={filled ? "currentColor" : "none"} {...p}>
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" />
    </Svg>
  ),
  Cash: (p: IconProps) => (
    <Svg {...p}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  ),
  Card: (p: IconProps) => (
    <Svg {...p}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </Svg>
  ),
  Pin: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </Svg>
  ),
  Instagram: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </Svg>
  ),
  Glass: (p: IconProps) => (
    <Svg {...p}>
      <path d="M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v7M8 21h8" />
    </Svg>
  ),
  Table: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M6 12v8M18 12v8" />
    </Svg>
  ),
  Hand: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 11V5a2 2 0 0 1 4 0v5" />
      <path d="M13 10V9a2 2 0 0 1 4 0v3" />
      <path d="M17 11a2 2 0 0 1 4 0v3a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3l-3-5a2 2 0 0 1 3-2l2 2" />
    </Svg>
  ),
};

/** Small fish mark drawn in the logo's colours (the full logo is /brand/logo-disc.png). */
export function FishMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M7 16 2 10.5v11z" fill="#E9963F" stroke="#183A3D" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 9.5c1-3 4-4 7-3l-1 3z" fill="#E9963F" stroke="#183A3D" strokeWidth="1.4" strokeLinejoin="round" />
      <path
        d="M7 16c3-5 8-8 13-8 5 0 8 4 9 8-1 4-4 8-9 8-5 0-10-3-13-8z"
        fill="#3E9A8E"
        stroke="#183A3D"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="23.5" cy="13.5" r="2.2" fill="#FFFDF8" stroke="#183A3D" strokeWidth="1" />
      <circle cx="24" cy="13.6" r="1" fill="#183A3D" />
      <path d="M14 17c1 2 3 3 5 3" fill="none" stroke="#183A3D" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ photos */

const TINTS = ["#BCD8D3", "#F6D9C8", "#DCE6C6", "#B3CAD9", "#F3CFDC", "#C7DDD5", "#E9DFC8"];

function tintFor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** The dish photo, or a soft striped placeholder until the owner uploads one. */
export function DishPhoto({ item, className = "", dim = false }: { item: MenuItem; className?: string; dim?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-brand-cream ${className}`}>
      {item.image_url ? (
        <img
          src={item.image_url}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${dim ? "opacity-40 grayscale" : ""}`}
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div className={`photo-stripes absolute inset-0 ${dim ? "opacity-40" : ""}`} style={{ backgroundColor: tintFor(item.id) }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ chrome */

const chip =
  "flex h-11 flex-none items-center gap-2 rounded-[14px] bg-brand-chip px-3 text-[15px] font-semibold text-brand-ink active:scale-[0.98] md:h-[52px] md:px-4";

export function TopBar({ left }: { left: ReactNode }) {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  const setLang = useTablet((s) => s.setLang);
  const setPanel = useTablet((s) => s.setPanel);
  const requests = useTablet((s) => s.requests);
  const has = (k: string) => requests.some((r) => r.kind === k);

  return (
    <header className="flex h-[60px] flex-none items-center gap-2 border-b border-brand-line bg-[#FBF6EC] pl-2 pr-2 md:h-[76px] md:gap-4 md:pl-4 md:pr-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">{left}</div>
      {/* Phones: one service button (all three open the same sheet) */}
      <button className={`${chip} md:hidden`} onClick={() => setPanel("service")} aria-label={`${t.water} / ${t.waiter} / ${t.bill}`}>
        <Icon.Bell size={20} className="text-brand-orange-deep" />
        {requests.length > 0 && <Dot />}
      </button>
      <button className={`${chip} hidden md:flex`} onClick={() => setPanel("service")} aria-label={t.water}>
        <Icon.Water size={20} className="text-brand-tile" />
        <span className="hidden lg:inline">{t.water}</span>
        {has("water") && <Dot />}
      </button>
      <button className={`${chip} hidden md:flex`} onClick={() => setPanel("service")} aria-label={t.waiter}>
        <Icon.Bell size={20} className="text-brand-orange-deep" />
        <span className="hidden lg:inline">{t.waiter}</span>
        {has("waiter") && <Dot />}
      </button>
      <button className={`${chip} hidden md:flex`} onClick={() => setPanel("service")} aria-label={t.bill}>
        <Icon.Receipt size={20} className="text-brand-orange-deep" />
        <span className="hidden lg:inline">{t.bill}</span>
        {has("bill") && <Dot />}
      </button>
      {/* Phones: a single toggle showing the other language */}
      <button
        onClick={() => setLang(lang === "sq" ? "en" : "sq")}
        aria-label="Gjuha / Language"
        className={`${chip} w-11 justify-center px-0 font-bold md:hidden`}
      >
        {lang === "sq" ? "EN" : "SQ"}
      </button>
      <div className="hidden flex-none gap-1 rounded-[14px] bg-brand-chip p-1 md:flex" role="group" aria-label="Gjuha / Language">
        {(["sq", "en"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            aria-pressed={lang === l}
            className={`h-11 w-[52px] rounded-[10px] text-[15px] font-bold ${
              lang === l ? "bg-brand-ink text-brand-paper" : "text-brand-muted"
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}

function Dot() {
  return <span className="h-2.5 w-2.5 rounded-full bg-brand-teal" aria-hidden="true" />;
}

export function Brand({ to }: { to: string }) {
  return (
    <Link to={to} className="flex flex-none items-center gap-2.5" aria-label="Peshku i Pitë">
      <FishMark />
      <span className="hidden font-display text-2xl font-extrabold tracking-tight sm:inline">Peshku i Pitë</span>
    </Link>
  );
}

export function TableChip() {
  const t = useT();
  const n = useTablet((s) => s.tableNumber);
  return (
    <span className="flex-none whitespace-nowrap rounded-full bg-brand-chip px-3 py-1.5 text-sm font-semibold text-brand-ink2 md:px-3.5 md:py-2 md:text-[15px]">
      {t.table} {n}
    </span>
  );
}

export function BackButton({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} aria-label={label} className={`${chip} w-11 justify-center px-0 text-base md:w-auto md:justify-start md:pl-3 md:pr-[18px]`}>
      <Icon.Back />
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}

export function Modal({
  label,
  onClose,
  children,
  className = "",
}: {
  label: string;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-pip-fade bg-[rgba(24,58,61,.45)]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative max-h-[100dvh] w-full animate-pip-in overflow-y-auto rounded-t-[28px] border border-brand-line2 bg-brand-paper shadow-[0_40px_80px_rgba(24,58,61,.22)] sm:max-h-[calc(100dvh-32px)] sm:w-auto sm:max-w-full sm:rounded-[28px] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      aria-label={t.close}
      className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-brand-chip"
    >
      <Icon.Close />
    </button>
  );
}

export function Stepper({
  value,
  onChange,
  min = 1,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  size?: "sm" | "md";
}) {
  const t = useT();
  const btn =
    size === "sm"
      ? "h-11 w-11 rounded-xl bg-brand-line"
      : "h-14 w-14 rounded-[14px] bg-brand-line";
  return (
    <div className={`flex items-center gap-1 ${size === "md" ? "rounded-[18px] border border-brand-line2 bg-brand-inset p-1.5" : ""}`}>
      <button className={`${btn} flex items-center justify-center`} aria-label={t.less} onClick={() => onChange(value - 1)} disabled={value <= min}>
        <Icon.Minus size={size === "sm" ? 18 : 22} />
      </button>
      <span className={`text-center font-display font-extrabold ${size === "sm" ? "w-9 text-[17px]" : "w-11 text-[26px]"}`}>{value}</span>
      <button className={`${btn} flex items-center justify-center`} aria-label={t.more} onClick={() => onChange(value + 1)}>
        <Icon.Plus size={size === "sm" ? 18 : 22} />
      </button>
    </div>
  );
}

export function Toast() {
  const toast = useTablet((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed bottom-24 left-1/2 z-50 flex w-max max-w-[calc(100vw-32px)] -translate-x-1/2 animate-pip-in items-center gap-3 rounded-2xl bg-brand-ink px-5 py-3.5 text-base font-semibold text-brand-paper shadow-xl md:bottom-8 md:px-6 md:py-4 md:text-[17px]"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-teal">
        <Icon.Check size={16} className="text-brand-paper" />
      </span>
      {toast}
    </div>
  );
}

export const primaryBtn =
  "flex items-center justify-center gap-2.5 rounded-[18px] bg-brand-orange font-extrabold text-brand-ink active:scale-[0.99] disabled:opacity-50";
export const secondaryBtn =
  "flex items-center justify-center gap-2 rounded-[18px] bg-brand-line font-bold text-brand-ink active:scale-[0.99]";

/** Absolute paths inside the tablet app: usePath()("menu") → "/t/7/menu". */
export function usePath() {
  const n = useTablet((s) => s.tableNumber);
  return (sub = "") => `/t/${n}${sub ? `/${sub}` : ""}`;
}

/** Display name for an item that was already sent: the kitchen snapshot is Albanian,
 *  so in EN mode look up the English name from the current menu. */
export function useSentName() {
  const lang = useTablet((s) => s.lang);
  const menu = useTablet((s) => s.menu);
  return (line: { menu_item_id: string; name: string }) => {
    if (lang !== "en") return line.name;
    for (const c of menu ?? []) {
      const found = c.items.find((i) => i.id === line.menu_item_id);
      if (found) return found.name_en || line.name;
    }
    return line.name;
  };
}
