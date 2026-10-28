/* Review order → confirm → send to kitchen. */

import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../../lib/api";
import { LineExtras } from "./LineExtras";
import { cartCount, cartTotal, eur, itemName, lineTotal } from "./pricing";
import { useTablet } from "./store";
import { BackButton, DishPhoto, Icon, Modal, Stepper, TableChip, TopBar, primaryBtn, secondaryBtn, usePath, useT } from "./ui";
import { useAddFlow } from "./useAddFlow";

export default function ReviewScreen() {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  const cart = useTablet((s) => s.cart);
  const tab = useTablet((s) => s.tab);
  const tableNumber = useTablet((s) => s.tableNumber) ?? 0;
  const setQty = useTablet((s) => s.setQty);
  const removeLine = useTablet((s) => s.removeLine);
  const path = usePath();
  const { editLine, overlays } = useAddFlow();
  const [confirming, setConfirming] = useState(false);

  if (cart.length === 0 && !confirming) return <Navigate to={path("menu")} replace />;

  const round = (tab?.orders.length ?? 0) + 1;
  const total = cartTotal(cart);

  return (
    <div className="flex h-full flex-col">
      <TopBar
        left={
          <>
            <BackButton to={path("menu")} label={t.backToMenu} />
            <h1 className="min-w-0 truncate font-display text-lg font-extrabold tracking-tight md:text-[26px]">{t.reviewTitle}</h1>
            <TableChip />
          </>
        }
      />
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 md:p-6 lg:flex-row lg:gap-6 lg:overflow-hidden">
        <section className="scroll-thin flex min-w-0 flex-none flex-col gap-3 lg:flex-1 lg:overflow-y-auto lg:pr-1">
          {cart.map((l) => (
            <article key={l.uid} className="flex flex-wrap gap-3 rounded-[20px] border border-brand-line bg-brand-paper p-3 sm:flex-nowrap sm:gap-4 sm:p-3.5">
              <DishPhoto item={l.item} className="h-[72px] w-[72px] flex-none rounded-[14px] sm:h-[104px] sm:w-[104px]" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                <span className="text-[17px] font-bold sm:text-[19px]">
                  {itemName(l.item, lang)}
                  {l.size && ` · ${l.size}`}
                </span>
                <LineExtras line={l} className="text-[15px]" />
                <div className="flex-1" />
                <div className="flex gap-2">
                  <button
                    onClick={() => editLine(l)}
                    className="flex h-11 items-center gap-1.5 rounded-xl bg-brand-chip px-3.5 text-sm font-semibold text-brand-ink2"
                  >
                    <Icon.Edit size={16} /> {t.edit}
                  </button>
                  <button
                    onClick={() => removeLine(l.uid)}
                    className="flex h-11 items-center gap-1.5 rounded-xl bg-brand-chip px-3.5 text-sm font-semibold text-brand-orange-deep"
                  >
                    <Icon.Trash size={16} /> {t.remove}
                  </button>
                </div>
              </div>
              <div className="flex w-full flex-row-reverse items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
                <span className="font-display text-xl font-bold sm:text-[22px]">{eur(lineTotal(l))}</span>
                <Stepper value={l.qty} min={0} onChange={(q) => setQty(l.uid, q)} />
              </div>
            </article>
          ))}
          <Link
            to={path("menu")}
            className="flex h-[60px] flex-none items-center justify-center gap-2.5 rounded-[18px] border-2 border-dashed border-brand-line2 text-[17px] font-semibold text-brand-ink2"
          >
            <Icon.Plus size={20} className="text-brand-orange-deep" />
            {t.addSomething}
          </Link>
        </section>

        <aside className="flex flex-none flex-col gap-4 rounded-3xl border border-brand-line bg-brand-paper p-5 md:p-7 lg:w-[380px]">
          <h2 className="font-display text-2xl font-bold">
            {t.summary} · {t.round} {round}
          </h2>
          <div className="flex justify-between text-[17px] text-brand-muted">
            <span>{t.items(cartCount(cart))}</span>
            <span>{eur(total)}</span>
          </div>
          <div className="h-px bg-brand-line" />
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-semibold">{t.subtotal}</span>
            <span className="font-display text-[32px] font-extrabold tracking-tight md:text-[40px]">{eur(total)}</span>
          </div>
          <div className="flex gap-2.5 rounded-[14px] bg-brand-inset p-3.5 text-[15px] leading-snug text-brand-muted">
            <Icon.Info size={20} className="mt-px flex-none text-brand-teal" />
            <span>{t.payAtEnd(tableNumber)}</span>
          </div>
          <div className="hidden flex-1 lg:block" />
          <button onClick={() => setConfirming(true)} className={`${primaryBtn} h-[68px] rounded-[20px] md:h-20`}>
            <Icon.Send size={26} />
            <span className="flex flex-col text-left leading-tight">
              <span className="text-xl md:text-[22px]">{t.sendToKitchen}</span>
              {lang === "sq" && <span className="text-sm font-semibold opacity-75">Send to kitchen</span>}
            </span>
          </button>
        </aside>
      </div>
      {overlays}
      {confirming && <ConfirmSend onCancel={() => setConfirming(false)} />}
    </div>
  );
}

function ConfirmSend({ onCancel }: { onCancel: () => void }) {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  const cart = useTablet((s) => s.cart);
  const sendOrder = useTablet((s) => s.sendOrder);
  const navigate = useNavigate();
  const path = usePath();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await sendOrder();
      navigate(path("status"), { replace: true });
    } catch (e) {
      setError(e instanceof ApiError && e.status === 400 ? e.detail : t.errorGeneric);
      setSending(false);
    }
  };

  return (
    <Modal label={t.confirmTitle} onClose={sending ? undefined : onCancel} className="flex flex-col gap-5 p-6 sm:w-[620px] md:gap-[22px] md:p-10">
      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-brand-orange-tint">
        <Icon.Send size={34} className="text-brand-orange-deep" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-[26px] font-extrabold tracking-tight md:text-[34px]">{t.confirmTitle}</h2>
        <p className="text-[17px] leading-normal text-brand-muted">{t.confirmBody}</p>
      </div>
      <div className="flex max-h-[220px] flex-col gap-2.5 overflow-y-auto rounded-2xl border border-brand-line2 bg-brand-inset p-[18px] text-base">
        {cart.map((l) => (
          <div key={l.uid} className="flex justify-between gap-4">
            <span>
              {l.qty}× {itemName(l.item, lang)}
              {l.size && ` · ${l.size}`}
            </span>
            <span>{eur(lineTotal(l))}</span>
          </div>
        ))}
        <div className="my-1 h-px bg-brand-line2" />
        <div className="flex justify-between text-lg font-bold">
          <span>{t.roundTotal}</span>
          <span>{eur(cartTotal(cart))}</span>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-brand-orange-tint px-4 py-3 text-[15px] font-semibold text-brand-orange-deep">
          {error}
        </p>
      )}
      <div className="grid grid-cols-[1fr_1.4fr] gap-3">
        <button onClick={onCancel} disabled={sending} className={`${secondaryBtn} h-[60px] text-base md:h-[68px] md:text-lg`}>
          {t.confirmNo}
        </button>
        <button onClick={send} disabled={sending} className={`${primaryBtn} h-[60px] text-[17px] md:h-[68px] md:text-[19px]`}>
          {sending ? t.sending : t.confirmYes}
        </button>
      </div>
    </Modal>
  );
}
