/* Running tab for the table, with an even or by-item split preview. */

import { useState } from "react";
import { eur, round2 } from "./pricing";
import { hhmm } from "./StatusScreen";
import { useTablet } from "./store";
import { BackButton, Icon, TableChip, TopBar, primaryBtn, usePath, useSentName, useT } from "./ui";

type Mode = "whole" | "even" | "items";
const LETTERS = "ABCDEF";
// Distinguishable by lightness as well as hue
const PERSON_STYLES = [
  "border-brand-orange bg-brand-orange-tint text-brand-orange-deep",
  "border-brand-tile bg-[#DCE4F1] text-brand-tile",
  "border-brand-teal bg-brand-teal-tint text-brand-teal-deep",
  "border-brand-ink bg-brand-ink text-brand-paper",
  "border-[#8F6A2E] bg-[#F1E2C4] text-[#6E4F1C]",
  "border-brand-muted bg-brand-chip text-brand-ink",
];

export default function BillScreen() {
  const t = useT();
  const tab = useTablet((s) => s.tab);
  const setPanel = useTablet((s) => s.setPanel);
  const path = usePath();
  const sentName = useSentName();

  const [mode, setMode] = useState<Mode>("even");
  const [people, setPeople] = useState(2);
  const [who, setWho] = useState<Record<string, number>>({});

  const orders = tab?.orders ?? [];
  const total = tab?.total ?? 0;
  const lines = orders.flatMap((o) => o.items);
  const personOf = (id: string) => (who[id] ?? 0) % people;
  const perPerson = Array.from({ length: people }, (_, p) =>
    round2(lines.filter((l) => personOf(l.id) === p).reduce((s, l) => s + l.subtotal, 0)),
  );
  // Round each share up to the cent so the shares never come out short
  const each = Math.ceil((total / people) * 100) / 100;

  return (
    <div className="flex h-full flex-col">
      <TopBar
        left={
          <>
            <BackButton to={path("status")} label={t.back} />
            <h1 className="min-w-0 truncate font-display text-lg font-extrabold tracking-tight md:text-[26px]">{t.billTitle}</h1>
            <TableChip />
            {orders[0] && (
              <span className="hidden text-[15px] text-brand-muted2 lg:inline">
                {t.openSince} {hhmm(orders[0].created_at)}
              </span>
            )}
          </>
        }
      />
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 md:p-6 lg:flex-row lg:gap-6 lg:overflow-hidden">
        <section className="scroll-thin flex min-w-0 flex-none flex-col rounded-3xl border border-brand-line bg-brand-paper px-4 py-2 md:px-6 lg:flex-1 lg:overflow-y-auto">
          {orders.length === 0 && <p className="py-10 text-center text-lg text-brand-muted">{t.billEmpty}</p>}
          {orders.map((o, ri) => (
            <div key={o.id}>
              <div className="flex justify-between pb-2 pt-[18px] text-[13px] font-bold uppercase tracking-wider text-brand-muted2">
                <span>
                  {t.round} {ri + 1} · {hhmm(o.created_at)}
                </span>
                <span>{eur(round2(o.items.reduce((s, i) => s + i.subtotal, 0)))}</span>
              </div>
              {o.items.map((l) => (
                <div key={l.id} className="flex min-h-[56px] items-center gap-2.5 border-b border-brand-hair py-1.5 md:min-h-[60px] md:gap-3.5">
                  <span className="w-[30px] flex-none text-base font-bold text-brand-muted2">{l.quantity}×</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-base font-semibold md:text-[17px]">
                      {sentName(l)}
                      {l.size && ` · ${l.size}`}
                    </span>
                    {(l.addons.length > 0 || l.special_instructions) && (
                      <span className="text-sm text-brand-muted2">
                        {[...l.addons.map((a) => `+ ${a.name}`), l.special_instructions].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  {mode === "items" && (
                    <button
                      onClick={() => setWho({ ...who, [l.id]: (personOf(l.id) + 1) % people })}
                      aria-label={`${t.person} ${LETTERS[personOf(l.id)]}`}
                      className={`h-12 w-12 flex-none rounded-xl border-2 text-base font-extrabold ${PERSON_STYLES[personOf(l.id)]}`}
                    >
                      {LETTERS[personOf(l.id)]}
                    </button>
                  )}
                  <span className="w-[68px] flex-none text-right text-base font-bold md:w-[76px] md:text-[17px]">{eur(l.subtotal)}</span>
                </div>
              ))}
            </div>
          ))}
        </section>

        <aside className="flex flex-none flex-col gap-4 rounded-3xl bg-brand-sand p-5 md:gap-[18px] md:p-7 lg:w-[400px]">
          <div className="flex flex-col gap-1">
            <span className="text-[15px] text-brand-muted">{t.total}</span>
            <span className="font-display text-[44px] font-extrabold leading-none tracking-tight md:text-[56px]">{eur(total)}</span>
          </div>

          <div role="group" className="grid grid-cols-3 gap-1 rounded-2xl bg-brand-paper p-1">
            {(
              [
                ["whole", t.splitWhole],
                ["even", t.splitEven],
                ["items", t.splitItems],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`h-[52px] rounded-xl text-[15px] font-bold ${mode === m ? "bg-brand-ink text-brand-paper" : "text-brand-ink2"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "whole" && <div className="rounded-2xl bg-brand-paper p-[18px] text-base text-brand-muted">{t.splitWholeBody}</div>}

          {mode !== "whole" && (
            <div className="flex flex-col gap-3.5 rounded-2xl bg-brand-paper p-[18px]">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">{t.people}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPeople(Math.max(2, people - 1))}
                    aria-label={t.less}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-chip"
                  >
                    <Icon.Minus size={20} />
                  </button>
                  <span className="w-10 text-center font-display text-[26px] font-extrabold">{people}</span>
                  <button
                    onClick={() => setPeople(Math.min(6, people + 1))}
                    aria-label={t.more}
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-chip"
                  >
                    <Icon.Plus size={20} />
                  </button>
                </div>
              </div>
              {mode === "even" ? (
                <div className="flex items-baseline justify-between border-t border-brand-hair pt-3">
                  <span className="text-base text-brand-muted">{t.eachPays}</span>
                  <span className="font-display text-[32px] font-extrabold text-brand-orange-deep">{eur(each)}</span>
                </div>
              ) : (
                <>
                  <span className="text-sm text-brand-muted2">{t.tapToAssign}</span>
                  {perPerson.map((amount, p) => (
                    <div key={p} className="flex items-center justify-between">
                      <span className="flex items-center gap-2.5 text-[17px] font-bold">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 text-sm ${PERSON_STYLES[p]}`}>
                          {LETTERS[p]}
                        </span>
                        {t.person} {LETTERS[p]}
                      </span>
                      <span className="font-display text-2xl font-extrabold">{eur(amount)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <div className="hidden flex-1 lg:block" />
          <button onClick={() => setPanel("service")} disabled={total <= 0} className={`${primaryBtn} h-16 rounded-[20px] text-xl md:h-[72px]`}>
            <Icon.Receipt size={24} /> {t.bill}
          </button>
        </aside>
      </div>
    </div>
  );
}
