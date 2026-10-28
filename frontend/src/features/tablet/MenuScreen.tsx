/* Home / menu: category rail, signature row, dish grid, and the order panel. */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cartCount, cartTotal, eur, fromPrice, hasPrice, itemDesc, itemName, lineTotal } from "./pricing";
import { useTablet } from "./store";
import type { MenuItem } from "./types";
import { LineExtras } from "./LineExtras";
import { Brand, DishPhoto, Icon, Stepper, TableChip, TopBar, primaryBtn, usePath, useT } from "./ui";
import { useAddFlow } from "./useAddFlow";

export default function MenuScreen() {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  const menu = useTablet((s) => s.menu);
  const setPanel = useTablet((s) => s.setPanel);
  const path = usePath();
  const { openItem, quickAdd, overlays } = useAddFlow();

  const categories = menu ?? [];
  const [catId, setCatId] = useState<string | null>(null);
  const current = categories.find((c) => c.id === catId) ?? categories[0];

  const signature = useMemo(
    () => categories.flatMap((c) => c.items).filter((i) => i.is_signature),
    [categories],
  );

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 }); // block body: scrollTo returns a promise in newer Chrome
  }, [current?.id]);

  return (
    <div className="flex h-full flex-col">
      <TopBar
        left={
          <>
            <Brand to={path()} />
            <TableChip />
          </>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Phones & portrait tablets: a scrolling chip row; landscape: the left rail */}
        <nav
          className="scroll-thin flex flex-none gap-1.5 overflow-x-auto border-b border-brand-line px-2 py-2 lg:w-[200px] lg:flex-col lg:gap-1 lg:overflow-visible lg:border-b-0 lg:border-r lg:px-3 lg:py-4"
          aria-label={t.menu}
        >
          {categories.map((c) => {
            const on = c.id === current?.id;
            return (
              <button
                key={c.id}
                onClick={() => setCatId(c.id)}
                aria-current={on}
                className={`flex min-h-[44px] flex-none items-center justify-between gap-2 whitespace-nowrap rounded-xl px-3.5 text-left text-[15px] font-semibold lg:min-h-[52px] lg:whitespace-normal lg:text-base ${
                  on ? "bg-brand-teal-deep text-brand-paper" : "bg-brand-chip/60 text-brand-ink2 lg:bg-transparent"
                }`}
              >
                <span>{itemName(c, lang)}</span>
                {c.items.some((i) => i.is_alcoholic) && c.items.every((i) => i.is_alcoholic) && (
                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[11px] font-bold ${
                      on ? "border-brand-paper text-brand-paper" : "border-brand-orange-deep text-brand-orange-deep"
                    }`}
                  >
                    18+
                  </span>
                )}
              </button>
            );
          })}
          <div className="hidden flex-1 lg:block" />
          <Link to={path("status")} className="flex min-h-[44px] flex-none items-center gap-2.5 whitespace-nowrap rounded-xl bg-brand-sand/60 px-3.5 text-[15px] font-semibold text-brand-ink2 lg:min-h-[52px]">
            <Icon.Clock size={18} className="text-brand-teal" />
            {t.status}
          </Link>
          <button onClick={() => setPanel("about")} className="flex min-h-[44px] flex-none items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 text-[15px] font-semibold text-brand-ink2 lg:min-h-[52px]">
            <Icon.Info size={18} className="text-brand-muted2" />
            {t.about}
          </button>
        </nav>

        <main ref={scroller} className="scroll-thin flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3 md:gap-[18px] md:px-6 md:py-5">
          {!menu ? (
            <MenuSkeleton />
          ) : (
            <>
              {current?.id === categories[0]?.id && signature.map((item) => (
                <SignatureCard key={item.id} item={item} onOpen={() => openItem(item)} onAdd={() => quickAdd(item)} />
              ))}
              {current && (
                <>
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-display text-[22px] font-bold md:text-[26px]">{itemName(current, lang)}</h2>
                    <span className="text-sm text-brand-muted2">{current.items.length}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 pb-4 sm:gap-4 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                    {current.items.map((item) => (
                      <DishCard key={item.id} item={item} lang={lang} onOpen={() => openItem(item)} onAdd={() => quickAdd(item)} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>

        <CartPanel />
      </div>
      <CartBar />
      {overlays}
    </div>
  );
}

function PriceLabel({ item, className = "" }: { item: MenuItem; className?: string }) {
  const t = useT();
  if (!hasPrice(item)) return <span className="whitespace-nowrap text-[15px] font-semibold text-brand-faint">{t.priceSoon}</span>;
  return (
    <span className={`font-display font-bold ${item.available ? "text-brand-orange-deep" : "text-brand-faint"} ${className}`}>
      {item.sizes.length > 1 && new Set(item.sizes.map((s) => s.price)).size > 1 ? `${t.from} ` : ""}
      {eur(fromPrice(item))}
    </span>
  );
}

function AddButton({ item, onAdd, size = 48 }: { item: MenuItem; onAdd: () => void; size?: number }) {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  const enabled = item.available && hasPrice(item);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onAdd();
      }}
      disabled={!enabled}
      aria-label={`${t.addToOrder}: ${itemName(item, lang)}`}
      style={{ width: size, height: size }}
      className={`flex flex-none items-center justify-center rounded-full ${
        enabled ? "bg-brand-orange text-brand-ink active:scale-95" : "bg-brand-line text-brand-faint"
      }`}
    >
      <Icon.Plus size={22} />
    </button>
  );
}

function DishCard({ item, lang, onOpen, onAdd }: { item: MenuItem; lang: "sq" | "en"; onOpen: () => void; onAdd: () => void }) {
  const t = useT();
  const desc = itemDesc(item, lang);
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[18px] border border-brand-line bg-brand-paper ${
        item.available ? "" : "bg-brand-inset"
      }`}
    >
      <button onClick={onOpen} className="flex flex-1 flex-col text-left" disabled={item.available && !hasPrice(item)}>
        <div className="relative h-[108px] w-full flex-none sm:h-[124px]">
          <DishPhoto item={item} dim={!item.available} className="h-full w-full" />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 sm:left-3 sm:top-3">
            {!item.available ? (
              <span className="rounded-full bg-brand-ink px-2.5 py-1 text-xs font-extrabold text-brand-paper">{t.soldOut}</span>
            ) : (
              item.is_popular && (
                <span className="rounded-full border border-brand-orange-deep bg-brand-paper px-2.5 py-1 text-xs font-bold text-brand-orange-deep">
                  {t.popular}
                </span>
              )
            )}
            {item.is_alcoholic && (
              <span className="rounded-md border border-brand-orange-deep bg-brand-paper px-1.5 py-0.5 text-[11px] font-bold text-brand-orange-deep">
                18+
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1 px-2.5 pb-1 pt-2.5 sm:px-3.5 sm:pt-3">
          <span className={`text-[15px] font-bold leading-tight sm:text-base ${item.available ? "" : "text-brand-faint"}`}>{itemName(item, lang)}</span>
          {desc && <span className="line-clamp-2 text-[13px] leading-snug text-brand-muted2">{desc}</span>}
        </div>
      </button>
      <div className="flex items-center justify-between gap-1 px-2.5 pb-2.5 pt-2 sm:px-3.5 sm:pb-3.5">
        <PriceLabel item={item} className="text-[17px] sm:text-[19px]" />
        <AddButton item={item} onAdd={onAdd} size={44} />
      </div>
    </div>
  );
}

function SignatureCard({ item, onOpen, onAdd }: { item: MenuItem; onOpen: () => void; onAdd: () => void }) {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  return (
    <div className="relative flex flex-none flex-col overflow-hidden rounded-[20px] border border-[#EBC28F] bg-[#FFF4E4] sm:h-44 sm:flex-row">
      <button onClick={onOpen} className="flex flex-1 flex-col text-left sm:flex-row">
        <DishPhoto item={item} dim={!item.available} className="h-40 w-full flex-none sm:h-auto sm:w-64 lg:w-80" />
        <span className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3.5 pr-20 sm:px-6 sm:pb-0 sm:pt-[22px]">
          <span className="flex items-center gap-1.5 self-start rounded-full bg-brand-orange px-2.5 py-[5px] text-xs font-extrabold uppercase tracking-wider">
            <Icon.Star size={12} filled /> {t.signature}
          </span>
          <span className="font-display text-2xl font-bold leading-tight sm:text-[30px]">{itemName(item, lang)}</span>
          <span className="line-clamp-1 text-[15px] text-brand-muted">{itemDesc(item, lang)}</span>
        </span>
      </button>
      <div className="absolute bottom-4 right-4 flex flex-col items-end justify-end gap-2 sm:static sm:gap-3 sm:p-6">
        <PriceLabel item={item} className="text-[22px]" />
        <AddButton item={item} onAdd={onAdd} size={52} />
      </div>
    </div>
  );
}

function MenuSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-[18px]" aria-hidden="true">
      <div className="h-44 rounded-[20px] bg-brand-paper/70" />
      <div className="h-6 w-40 rounded-lg bg-brand-paper/70" />
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-[252px] flex-col overflow-hidden rounded-[18px] bg-brand-paper/70">
            <div className="h-[124px] bg-brand-sand/60" />
            <div className="flex flex-col gap-2.5 p-3.5">
              <div className="h-3.5 w-4/5 rounded-md bg-brand-sand/70" />
              <div className="h-3 w-3/5 rounded-md bg-brand-sand/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartPanel() {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  const cart = useTablet((s) => s.cart);
  const tab = useTablet((s) => s.tab);
  const setQty = useTablet((s) => s.setQty);
  const path = usePath();
  const round = (tab?.orders.length ?? 0) + 1;

  return (
    <aside className="hidden w-[300px] flex-none flex-col gap-3.5 border-l border-brand-line bg-brand-sand p-5 lg:flex xl:w-[340px]">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold">{t.yourOrder}</h2>
        <span className="text-sm text-brand-muted2">
          {t.round} {round}
        </span>
      </div>

      {cart.length === 0 ? (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-3 text-center">
            <svg width="72" height="72" viewBox="0 0 32 32" fill="none" stroke="#B7A887" strokeWidth="1.4" aria-hidden="true">
              <path d="M7 16c3-5 8-8 13-8 5 0 8 4 9 8-1 4-4 8-9 8-5 0-10-3-13-8z" />
              <path d="M7 16 2 11v10z" />
              <circle cx="23" cy="14" r="1" fill="#B7A887" />
            </svg>
            <span className="font-display text-[22px] font-bold">{t.emptyTitle}</span>
            <span className="text-[15px] leading-normal text-brand-muted2">{t.emptyBody}</span>
          </div>
          <div className="flex h-16 items-center justify-center rounded-2xl bg-brand-chip text-lg font-bold text-brand-faint">{t.review}</div>
        </>
      ) : (
        <>
          <ul className="scroll-thin flex flex-1 flex-col gap-2.5 overflow-y-auto">
            {cart.map((l) => (
              <li key={l.uid} className="flex flex-col gap-2 rounded-[14px] bg-brand-paper p-3">
                <div className="flex justify-between gap-2.5">
                  <span className="text-[15px] font-bold leading-snug">
                    {itemName(l.item, lang)}
                    {l.size && ` · ${l.size}`}
                  </span>
                  <span className="whitespace-nowrap text-[15px] font-bold">{eur(lineTotal(l))}</span>
                </div>
                <LineExtras line={l} />
                <Stepper size="sm" min={0} value={l.qty} onChange={(q) => setQty(l.uid, q)} />
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between border-t border-brand-line pt-1">
            <span className="text-base text-brand-muted">{t.subtotal}</span>
            <span className="font-display text-[28px] font-bold">{eur(cartTotal(cart))}</span>
          </div>
          <Link to={path("review")} className={`${primaryBtn} h-16 text-[19px]`}>
            {t.review}
            <Icon.Arrow />
          </Link>
        </>
      )}
    </aside>
  );
}

/** Phones & portrait tablets: the cart lives in a bar pinned to the bottom; tapping it opens the review screen. */
function CartBar() {
  const t = useT();
  const cart = useTablet((s) => s.cart);
  const path = usePath();
  if (cart.length === 0) return null;
  return (
    <div className="flex-none border-t border-brand-line bg-brand-sand px-3 pt-2.5 lg:hidden" style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
      <Link to={path("review")} className={`${primaryBtn} h-14 justify-between px-5 text-[17px]`}>
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-ink px-2 text-sm text-brand-paper">{cartCount(cart)}</span>
          {t.review}
        </span>
        <span className="font-display text-xl">{eur(cartTotal(cart))}</span>
      </Link>
    </div>
  );
}
