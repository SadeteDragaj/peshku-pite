/* The add-to-order flow shared by the menu and review screens:
 * dish sheet → (first alcoholic item) age check → cart, plus the sold-out sheet. */

import { useState } from "react";
import DishSheet, { type LineDraft, newDraft } from "./DishSheet";
import { eur, fromPrice, isOrderable, itemName, needsOptions } from "./pricing";
import { useTablet } from "./store";
import type { CartLine, MenuItem } from "./types";
import { DishPhoto, Modal, primaryBtn, secondaryBtn, useT } from "./ui";

export function useAddFlow() {
  const t = useT();
  const addLine = useTablet((s) => s.addLine);
  const replaceLine = useTablet((s) => s.replaceLine);
  const needsAgeCheck = useTablet((s) => s.needsAgeCheck);
  const confirmAge = useTablet((s) => s.confirmAge);
  const showToast = useTablet((s) => s.showToast);

  const [sheet, setSheet] = useState<{ draft: LineDraft; editUid?: string } | null>(null);
  const [ageGate, setAgeGate] = useState<{ draft: LineDraft; editUid?: string } | null>(null);
  const [soldOut, setSoldOut] = useState<MenuItem | null>(null);

  const commit = (draft: LineDraft, editUid?: string) => {
    if (editUid) replaceLine(editUid, draft);
    else {
      addLine(draft);
      showToast(t.added);
    }
    setSheet(null);
    setAgeGate(null);
  };

  const tryCommit = (draft: LineDraft, editUid?: string) => {
    if (draft.item.is_alcoholic && needsAgeCheck()) {
      setSheet(null);
      setAgeGate({ draft, editUid });
    } else commit(draft, editUid);
  };

  /** Tap on a dish card. */
  const openItem = (item: MenuItem) => {
    if (!item.available) setSoldOut(item);
    else if (isOrderable(item)) setSheet({ draft: newDraft(item) });
  };

  /** Tap on a card's "+" – adds straight away when there is nothing to choose. */
  const quickAdd = (item: MenuItem) => {
    if (!isOrderable(item)) return openItem(item);
    if (needsOptions(item)) setSheet({ draft: newDraft(item) });
    else tryCommit(newDraft(item));
  };

  const editLine = (line: CartLine) => {
    const { uid, ...draft } = line;
    setSheet({ draft, editUid: uid });
  };

  const overlays = (
    <>
      {sheet && (
        <DishSheet
          initial={sheet.draft}
          editing={!!sheet.editUid}
          onConfirm={(d) => tryCommit(d, sheet.editUid)}
          onClose={() => setSheet(null)}
        />
      )}
      {ageGate && (
        <AgeCheck
          draft={ageGate.draft}
          onYes={() => {
            confirmAge();
            commit(ageGate.draft, ageGate.editUid);
          }}
          onNo={() => setAgeGate(null)}
        />
      )}
      {soldOut && (
        <SoldOutSheet
          item={soldOut}
          onPick={(item) => {
            setSoldOut(null);
            openItem(item);
          }}
          onClose={() => setSoldOut(null)}
        />
      )}
    </>
  );

  return { openItem, quickAdd, editLine, overlays };
}

function AgeCheck({ draft, onYes, onNo }: { draft: LineDraft; onYes: () => void; onNo: () => void }) {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  return (
    <Modal label={t.ageTitle} onClose={onNo} className="flex flex-col items-center gap-5 p-6 text-center sm:w-[600px] md:p-10">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-brand-orange-deep font-display text-[34px] font-extrabold text-brand-orange-deep">
        18+
      </div>
      <h2 className="font-display text-[34px] font-extrabold tracking-tight">{t.ageTitle}</h2>
      <p className="max-w-[440px] text-[17px] leading-normal text-brand-muted">{t.ageBody}</p>
      <div className="flex items-center gap-3.5 self-stretch rounded-2xl border border-brand-line2 bg-brand-inset py-3 pl-3 pr-4">
        <DishPhoto item={draft.item} className="h-14 w-14 flex-none rounded-xl" />
        <span className="flex-1 text-left text-[17px] font-bold">
          {draft.qty}× {itemName(draft.item, lang)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 self-stretch">
        <button onClick={onNo} className={`${secondaryBtn} h-16 text-lg`}>
          {t.ageNo}
        </button>
        <button onClick={onYes} className={`${primaryBtn} h-16 text-lg`}>
          {t.ageYes}
        </button>
      </div>
      <span className="text-sm text-brand-muted2">{t.ageOnce}</span>
    </Modal>
  );
}

function SoldOutSheet({ item, onPick, onClose }: { item: MenuItem; onPick: (i: MenuItem) => void; onClose: () => void }) {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  const menu = useTablet((s) => s.menu);

  // Suggest two available dishes from the same category, popular ones first.
  const suggestions = (menu?.find((c) => c.id === item.category_id)?.items ?? [])
    .filter((i) => i.id !== item.id && isOrderable(i))
    .sort((a, b) => Number(b.is_popular || b.is_signature) - Number(a.is_popular || a.is_signature))
    .slice(0, 2);

  return (
    <Modal label={t.soldOutTonight} onClose={onClose} className="flex flex-col gap-5 p-6 sm:w-[700px] md:gap-[22px] md:p-9">
      <div className="flex items-center gap-5">
        <DishPhoto item={item} dim className="h-28 w-28 flex-none rounded-[18px]" />
        <div className="flex flex-col gap-2">
          <span className="self-start rounded-full bg-brand-ink px-3 py-1 text-[13px] font-extrabold text-brand-paper">
            {t.soldOutTonight}
          </span>
          <h2 className="font-display text-[32px] font-extrabold tracking-tight">{itemName(item, lang)}</h2>
          {suggestions.length > 0 && <p className="text-[17px] text-brand-muted">{t.soldOutBody}</p>}
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              className="flex items-center gap-3.5 rounded-[18px] border border-brand-line bg-brand-inset p-3 text-left"
            >
              <DishPhoto item={s} className="h-[72px] w-[72px] flex-none rounded-xl" />
              <span className="flex flex-1 flex-col gap-1">
                <span className="text-base font-bold leading-tight">{itemName(s, lang)}</span>
                <span className="font-display text-lg font-bold text-brand-orange-deep">
                  {s.sizes.length > 1 ? `${t.from} ` : ""}
                  {eur(fromPrice(s))}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      <button onClick={onClose} className={`${secondaryBtn} h-16 text-lg`}>
        {t.okBack}
      </button>
    </Modal>
  );
}
