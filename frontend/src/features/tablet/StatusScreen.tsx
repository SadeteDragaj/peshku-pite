/* Live order tracker per round: Dërguar → Në përgatitje → Gati → Shërbyer. */

import { Link } from "react-router-dom";
import { toDate } from "../../lib/time";
import { eur, round2 } from "./pricing";
import { useTablet } from "./store";
import type { Order, OrderStatus } from "./types";
import { BackButton, Icon, TableChip, TopBar, usePath, useSentName, useT } from "./ui";

const STEPS: OrderStatus[] = ["pending", "preparing", "ready", "served"];

export const hhmm = (iso: string) =>
  toDate(iso).toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit", hour12: false });

const orderTotal = (o: Order) => round2(o.items.reduce((s, i) => s + i.subtotal, 0));

export default function StatusScreen() {
  const t = useT();
  const tab = useTablet((s) => s.tab);
  const tableNumber = useTablet((s) => s.tableNumber) ?? 0;
  const path = usePath();
  const sentName = useSentName();

  const orders = tab?.orders ?? [];
  const rounds = orders.map((o, i) => ({ order: o, round: i + 1 }));
  // Feature the newest order that isn't served yet; otherwise the newest overall.
  const featured = [...rounds].reverse().find((r) => r.order.status !== "served") ?? rounds[rounds.length - 1];
  const others = rounds.filter((r) => r !== featured).reverse();

  return (
    <div className="flex h-full flex-col">
      <TopBar
        left={
          <>
            <BackButton to={path("menu")} label={t.menu} />
            <h1 className="min-w-0 truncate font-display text-lg font-extrabold tracking-tight md:text-[26px]">{t.statusTitle}</h1>
            <TableChip />
          </>
        }
      />
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 md:p-6 lg:flex-row lg:gap-6 lg:overflow-hidden">
        <section className="scroll-thin flex min-w-0 flex-none flex-col gap-4 lg:flex-1 lg:overflow-y-auto">
          {!featured ? (
            <div className="flex min-h-[240px] flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-brand-line bg-brand-paper p-6 text-center">
              <Icon.Clock size={48} className="text-brand-line2" />
              <h2 className="font-display text-[28px] font-bold">{t.noOrdersTitle}</h2>
              <p className="max-w-sm text-[17px] text-brand-muted">{t.noOrdersBody}</p>
            </div>
          ) : (
            <Featured order={featured.order} round={featured.round} />
          )}
          {others.map(({ order, round }) => (
            <div key={order.id} className="flex items-center gap-3 rounded-[20px] border border-brand-line bg-brand-inset px-4 py-4 md:gap-[18px] md:px-7 md:py-5">
              <span
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${
                  order.status === "served" ? "bg-brand-teal-tint text-brand-teal-deep" : "bg-brand-orange-tint text-brand-orange-deep"
                }`}
              >
                {order.status === "served" ? <Icon.Check size={20} /> : <Icon.Clock size={20} />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold md:text-[17px]">
                  {t.round} {round} · {t.statusName[order.status]} {hhmm(order.updated_at)}
                </span>
                <span className="line-clamp-1 text-[15px] text-brand-muted2">
                  {order.items.map((i) => `${i.quantity}× ${sentName(i)}`).join(" · ")}
                </span>
              </div>
              <span className="text-[17px] font-bold text-brand-muted">{eur(orderTotal(order))}</span>
            </div>
          ))}
        </section>

        <aside className="grid flex-none gap-3 sm:grid-cols-2 lg:flex lg:w-[360px] lg:flex-col lg:gap-4">
          <Link to={path("menu")} className="flex flex-col gap-2 rounded-3xl bg-brand-orange p-5 text-brand-ink md:gap-2.5 md:p-7">
            <Icon.Plus size={32} />
            <span className="font-display text-2xl font-extrabold leading-tight md:text-[28px]">{t.addMore}</span>
            <span className="text-base font-semibold opacity-80">{t.sameTab(tableNumber)}</span>
          </Link>
          <Link to={path("bill")} className="flex flex-col gap-1.5 rounded-3xl border border-brand-line bg-brand-paper px-5 py-5 md:px-7 md:py-6">
            <span className="text-[15px] text-brand-muted2">{t.tabSoFar}</span>
            <span className="font-display text-[32px] font-extrabold tracking-tight md:text-[40px]">{eur(tab?.total ?? 0)}</span>
            <span className="flex items-center gap-1.5 text-base font-bold text-brand-orange-deep">
              {t.viewBill} <Icon.Arrow size={18} />
            </span>
          </Link>
          <div className="hidden flex-1 lg:block" />
          <Link
            to={path("rating")}
            className="flex h-14 items-center sm:col-span-2 justify-center gap-2 rounded-2xl border border-brand-line bg-brand-inset text-base font-semibold text-brand-ink2"
          >
            <Icon.Star size={18} className="text-brand-orange" /> {t.rateEvening}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Featured({ order, round }: { order: Order; round: number }) {
  const t = useT();
  const sentName = useSentName();
  const current = STEPS.indexOf(order.status);

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-[#EBC28F] bg-brand-paper p-4 md:gap-[26px] md:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold uppercase tracking-wider text-brand-orange-deep">
            {t.round} {round} · {t.sentAt} {hhmm(order.created_at)}
          </span>
          <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-[32px]" aria-live="polite">
            {t.statusHeadline[order.status]}
          </h2>
        </div>
        <span className="font-display text-[22px] font-bold text-brand-muted">{eur(orderTotal(order))}</span>
      </div>

      {order.status !== "voided" && (
        <ol className="grid grid-cols-4" aria-label={t.status}>
          {STEPS.map((step, i) => {
            const done = i < current || (i === current && step === "served");
            const active = i === current && step !== "served";
            const time = i === 0 ? hhmm(order.created_at) : i === current ? hhmm(order.updated_at) : "—";
            return (
              <li key={step} aria-current={active ? "step" : undefined} className="flex flex-col gap-2.5">
                <div className="flex items-center">
                  {done ? (
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-teal text-brand-paper md:h-11 md:w-11">
                      <Icon.Check size={20} />
                    </span>
                  ) : active ? (
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border-4 border-brand-orange bg-brand-orange-tint md:h-11 md:w-11">
                      <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-brand-orange" />
                    </span>
                  ) : (
                    <span className="h-9 w-9 flex-none rounded-full border-[3px] border-brand-line2 md:h-11 md:w-11" />
                  )}
                  {i < STEPS.length - 1 && (
                    <span className={`h-1 flex-1 ${i < current ? "bg-brand-teal" : "bg-brand-line"}`} />
                  )}
                </div>
                <span className={`pr-1 text-[13px] font-bold leading-tight sm:text-base md:text-lg ${active ? "text-brand-orange-deep" : done ? "" : "text-brand-faint"}`}>
                  {t.statusName[step]}
                </span>
                <span className="text-xs text-brand-muted2 md:text-sm">{i <= current ? time : "—"}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap gap-2">
        {order.items.map((i) => (
          <span key={i.id} className="rounded-full border border-brand-line2 bg-brand-inset px-3.5 py-2 text-[15px]">
            {i.quantity}× {sentName(i)}
            {i.size && ` · ${i.size}`}
          </span>
        ))}
      </div>
    </div>
  );
}
