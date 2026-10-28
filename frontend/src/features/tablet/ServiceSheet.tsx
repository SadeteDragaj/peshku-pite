/* Service actions, reachable from every screen: call waiter, water, request the bill. */

import { useState } from "react";
import { eur } from "./pricing";
import { useTablet } from "./store";
import type { PaymentMethod, RequestKind } from "./types";
import { CloseButton, Icon, primaryBtn, usePath, useT } from "./ui";
import { Link } from "react-router-dom";

export default function ServiceSheet() {
  const t = useT();
  const requests = useTablet((s) => s.requests);
  const tab = useTablet((s) => s.tab);
  const tableNumber = useTablet((s) => s.tableNumber) ?? 0;
  const setPanel = useTablet((s) => s.setPanel);
  const createRequest = useTablet((s) => s.createRequest);
  const cancelRequest = useTablet((s) => s.cancelRequest);
  const path = usePath();

  const open = (k: RequestKind) => requests.find((r) => r.kind === k);
  const billReq = open("bill");
  const [method, setMethod] = useState<PaymentMethod>(billReq?.payment_method || "card");
  const [busy, setBusy] = useState<RequestKind | null>(null);
  const [error, setError] = useState(false);

  const run = async (kind: RequestKind, fn: () => Promise<void>) => {
    setBusy(kind);
    setError(false);
    try {
      await fn();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const toggle = (kind: "waiter" | "water") =>
    run(kind, () => (open(kind) ? cancelRequest(kind) : createRequest(kind)));

  const close = () => setPanel(null);
  const waiter = open("waiter");
  const water = open("water");
  const tile = (on: boolean) =>
    `flex h-[116px] flex-col items-start justify-between rounded-[20px] border-2 p-4 text-left md:h-[132px] md:p-5 ${
      on ? "border-brand-teal bg-brand-teal-tint" : "border-brand-line2 bg-brand-inset"
    }`;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 animate-pip-fade bg-[rgba(24,58,61,.42)]" onClick={close} aria-hidden="true" />

      {waiter && (
        <div role="status" className="absolute bottom-4 left-4 right-4 z-10 flex animate-pip-in sm:bottom-auto sm:left-8 sm:right-auto sm:top-8 sm:w-[520px] items-center gap-3.5 rounded-[18px] border border-[#A5CFC8] bg-brand-teal-tint px-5 py-[18px]">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-teal text-brand-paper">
            <Icon.Check size={22} />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-lg font-bold">{t.waiterNotified}</span>
            <span className="text-[15px] text-[#2C5E55]">{t.waiterComing(tableNumber)}</span>
          </span>
        </div>
      )}

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t.helpTitle}
        className="scroll-thin absolute bottom-0 right-0 top-0 flex w-full animate-pip-in flex-col gap-4 overflow-y-auto border-l border-brand-line2 bg-brand-paper p-4 shadow-[-40px_0_80px_rgba(24,58,61,.18)] sm:w-[600px] md:gap-[18px] md:p-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[26px] font-extrabold tracking-tight md:text-[32px]">{t.helpTitle}</h2>
          <CloseButton onClick={close} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => toggle("waiter")} disabled={busy === "waiter"} aria-pressed={!!waiter} className={tile(!!waiter)}>
            <Icon.Bell size={32} className="text-brand-orange-deep" />
            <span className="flex flex-col gap-0.5">
              <span className="text-xl font-extrabold">{t.waiter}</span>
              <span className="text-sm text-brand-muted2">{waiter ? t.waiterActive : t.waiterIdle}</span>
            </span>
          </button>
          <button onClick={() => toggle("water")} disabled={busy === "water"} aria-pressed={!!water} className={tile(!!water)}>
            <Icon.Water size={32} className="text-brand-tile" />
            <span className="flex flex-col gap-0.5">
              <span className="text-xl font-extrabold">{t.water}</span>
              <span className="text-sm text-brand-muted2">{water ? t.waterActive : t.waterIdle}</span>
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-[22px] border-2 border-brand-orange bg-brand-inset p-4 md:p-6">
          <div className="flex items-center gap-3">
            <Icon.Receipt size={30} className="text-brand-orange-deep" />
            <span className="flex-1 text-[22px] font-extrabold">{t.bill}</span>
            <span className="font-display text-2xl font-extrabold">{eur(tab?.total ?? 0)}</span>
          </div>
          {billReq ? (
            <div className="flex items-center gap-2.5 rounded-2xl bg-brand-teal-tint p-4 text-[17px] font-bold">
              <Icon.Check size={20} className="text-brand-teal-deep" />
              {t.billRequested} · {billReq.payment_method === "cash" ? t.cash : t.card}
            </div>
          ) : (
            <>
              <span className="text-[15px] text-brand-muted2">{t.payHow}</span>
              <div className="grid grid-cols-2 gap-2.5">
                {(["cash", "card"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    aria-pressed={method === m}
                    className={`flex h-[72px] items-center justify-center gap-2.5 rounded-2xl border-2 text-lg font-bold ${
                      method === m ? "border-brand-orange bg-brand-orange-tint" : "border-brand-line2 bg-brand-paper"
                    }`}
                  >
                    {m === "cash" ? <Icon.Cash size={24} /> : <Icon.Card size={24} />}
                    {m === "cash" ? t.cash : t.card}
                  </button>
                ))}
              </div>
            </>
          )}
          <Link
            to={path("bill")}
            onClick={close}
            className="flex h-[52px] items-center justify-center rounded-[14px] bg-brand-chip text-base font-semibold"
          >
            {t.viewSplit}
          </Link>
          {!billReq && (
            <button
              onClick={() => run("bill", () => createRequest("bill", method))}
              disabled={busy === "bill" || (tab?.total ?? 0) <= 0}
              className={`${primaryBtn} h-[68px] text-xl`}
            >
              {t.sendBillRequest} · {method === "cash" ? t.cash : t.card}
            </button>
          )}
        </div>

        {billReq && (
          <Link
            to={path("rating")}
            onClick={close}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-brand-line bg-brand-inset text-base font-semibold"
          >
            <Icon.Star size={18} className="text-brand-orange" /> {t.rateEvening}
          </Link>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-brand-orange-tint px-4 py-3 text-[15px] font-semibold text-brand-orange-deep">
            {t.errorGeneric}
          </p>
        )}
      </aside>
    </div>
  );
}
