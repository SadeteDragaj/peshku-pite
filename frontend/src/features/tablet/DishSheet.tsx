/* Dish detail sheet: size, add-ons, kitchen note, quantity → add to order (or save an edit). */

import { useState } from "react";
import { NOTE_CHIPS } from "./i18n";
import { eur, itemDesc, itemName, sizesDiffer, unitPrice } from "./pricing";
import { useTablet } from "./store";
import type { CartLine, MenuItem } from "./types";
import { CloseButton, DishPhoto, Icon, Modal, Stepper, primaryBtn, useT } from "./ui";

export type LineDraft = Omit<CartLine, "uid">;

export function newDraft(item: MenuItem): LineDraft {
  return {
    item,
    size: item.sizes[0]?.code ?? "",
    addonIds: [],
    chips: [],
    note: "",
    qty: 1,
  };
}

export default function DishSheet({
  initial,
  editing = false,
  onConfirm,
  onClose,
}: {
  initial: LineDraft;
  editing?: boolean;
  onConfirm: (line: LineDraft) => void;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  const [line, setLine] = useState<LineDraft>(initial);
  const { item } = line;
  const set = (patch: Partial<LineDraft>) => setLine((l) => ({ ...l, ...patch }));
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const total = unitPrice(item, line.size, line.addonIds) * line.qty;
  const name = itemName(item, lang);
  const desc = itemDesc(item, lang);
  const showSizePrices = sizesDiffer(item);

  return (
    <Modal
      label={name}
      onClose={onClose}
      className="flex h-[92dvh] flex-col !overflow-hidden sm:h-[min(704px,calc(100dvh-32px))] sm:w-[min(1080px,calc(100vw-32px))] md:flex-row"
    >
      <DishPhoto item={item} className="h-44 w-full flex-none sm:h-56 md:h-auto md:w-[38%] lg:w-[440px]" />
      <div className="scroll-thin flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 md:gap-5 md:px-8 md:py-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap gap-2">
              {item.is_signature && (
                <span className="rounded-full bg-brand-orange px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider">
                  {t.signature}
                </span>
              )}
              {item.is_popular && (
                <span className="rounded-full border border-brand-orange-deep px-2.5 py-0.5 text-[13px] font-bold text-brand-orange-deep">
                  {t.popular}
                </span>
              )}
              {item.is_alcoholic && (
                <span className="rounded-md border border-brand-orange-deep px-1.5 py-0.5 text-xs font-bold text-brand-orange-deep">
                  {t.adults}
                </span>
              )}
            </div>
            <h2 className="font-display text-[26px] font-extrabold leading-[1.05] tracking-tight md:text-[36px]">{name}</h2>
            {desc && <p className="text-base leading-normal text-brand-muted">{desc}</p>}
          </div>
          <CloseButton onClick={onClose} />
        </div>

        {item.sizes.length > 1 && (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-[15px] font-bold">{t.size}</legend>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${item.sizes.length}, minmax(0, 1fr))` }}>
              {item.sizes.map((s) => {
                const on = line.size === s.code;
                return (
                  <button
                    key={s.code}
                    onClick={() => set({ size: s.code })}
                    aria-pressed={on}
                    className={`flex h-16 items-center justify-between rounded-[14px] border-2 px-[18px] ${
                      on ? "border-brand-orange bg-brand-orange-tint" : "border-brand-line2 bg-brand-inset"
                    }`}
                  >
                    <span className="font-display text-2xl font-extrabold">{s.code}</span>
                    {showSizePrices && <span className="text-base font-semibold text-brand-muted">{eur(s.price)}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {item.addons.length > 0 && (
          <fieldset className="flex flex-col">
            <legend className="mb-2.5 text-[15px] font-bold">{t.addons}</legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {item.addons.map((a) => {
                const on = line.addonIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => set({ addonIds: toggle(line.addonIds, a.id) })}
                    aria-pressed={on}
                    className={`flex h-14 items-center gap-2.5 rounded-[14px] border-2 px-3.5 ${
                      on ? "border-brand-orange bg-brand-orange-tint" : "border-brand-line2 bg-brand-inset"
                    }`}
                  >
                    <span
                      className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md border-2 ${
                        on ? "border-brand-orange bg-brand-orange" : "border-brand-faint"
                      }`}
                    >
                      {on && <Icon.Check size={14} />}
                    </span>
                    <span className="flex-1 text-left text-[15px] font-semibold">{itemName(a, lang)}</span>
                    <span className="text-sm text-brand-muted">+{eur(a.price)}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className="flex flex-col gap-2.5">
          <label htmlFor="dish-note" className="text-[15px] font-bold">
            {t.noteLabel} <span className="font-normal text-brand-muted2">{t.optional}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {NOTE_CHIPS.map((c) => {
              const on = line.chips.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => set({ chips: toggle(line.chips, c.id) })}
                  aria-pressed={on}
                  className={`h-11 rounded-full border px-4 text-[15px] font-semibold ${
                    on ? "border-brand-ink bg-brand-ink text-brand-paper" : "border-brand-line2 bg-brand-inset text-brand-ink2"
                  }`}
                >
                  {c[lang]}
                </button>
              );
            })}
          </div>
          <input
            id="dish-note"
            type="text"
            maxLength={120}
            value={line.note}
            onChange={(e) => set({ note: e.target.value })}
            placeholder={t.notePlaceholder}
            className="h-[52px] rounded-[14px] border border-brand-line2 bg-brand-inset px-4 text-base outline-none focus:border-brand-teal"
          />
        </div>

        <div className="flex-1" />

        <div
          className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-center gap-2.5 bg-brand-paper px-4 pt-2 sm:flex-nowrap md:static md:mx-0 md:gap-4 md:px-0 md:pt-0"
          style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
        >
          <Stepper value={line.qty} onChange={(qty) => set({ qty: Math.max(1, qty) })} />
          <button
            onClick={() => onConfirm(line)}
            disabled={item.sizes.length > 0 && !line.size}
            className={`${primaryBtn} h-[60px] w-full min-w-0 justify-between px-5 sm:w-auto sm:flex-1 md:h-[68px] md:px-[26px]`}
          >
            <span className="truncate text-[17px] md:text-xl">{editing ? t.saveChanges : t.addToOrder}</span>
            <span className="font-display text-xl md:text-2xl">{eur(total)}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
