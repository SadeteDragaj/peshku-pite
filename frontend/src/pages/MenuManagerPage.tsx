/* Manager: mark dishes sold out ("E shitur"), and edit prices and photos.
 * Every change reaches the table tablets immediately (menu_changed event). */

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { RequireStaff, StaffHeader } from "../features/staff/StaffShell";
import type { Category, MenuItem, SizeOption } from "../features/tablet/types";
import { DishPhoto } from "../features/tablet/ui";

export default function MenuManagerPage() {
  return (
    <RequireStaff roles={["admin"]}>
      <MenuManager />
    </RequireStaff>
  );
}

function MenuManager() {
  const [menu, setMenu] = useState<Category[] | null>(null);
  const [catId, setCatId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get<Category[]>("/guest/menu").then(setMenu).catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);

  const current = menu?.find((c) => c.id === catId) ?? menu?.[0];
  const soldCount = menu?.flatMap((c) => c.items).filter((i) => !i.available).length ?? 0;

  const patch = async (item: MenuItem, body: Partial<MenuItem>) => {
    setError(null);
    // Optimistic update so toggles feel instant on a tablet
    setMenu((m) => m?.map((c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, ...body } : i)) })) ?? m);
    try {
      await api.patch(`/menu/items/${item.id}`, body);
    } catch (e: any) {
      setError(`${item.name}: ${e.message}`);
      void load();
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-brand-cream text-brand-ink">
      <StaffHeader title="Stafi">
        <span className="hidden text-[15px] text-[#D2E4DF] lg:inline">Ndryshimet shfaqen menjëherë në tabletët e tavolinave</span>
      </StaffHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 px-3 py-3 md:px-6 md:py-5">
        <div className="scroll-thin flex flex-none items-center gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
          {menu?.map((c) => {
            const on = c.id === current?.id;
            return (
              <button
                key={c.id}
                onClick={() => setCatId(c.id)}
                className={`h-11 flex-none whitespace-nowrap rounded-full border px-4 text-[15px] font-bold md:h-12 md:px-[18px] ${
                  on ? "border-brand-ink bg-brand-ink text-brand-paper" : "border-brand-line bg-brand-paper text-brand-ink2"
                }`}
              >
                {c.name}
              </button>
            );
          })}
          <div className="flex-1" />
          <span className="flex-none whitespace-nowrap text-[15px] font-semibold text-brand-orange-deep">{soldCount} të shitura sonte</span>
        </div>
        {error && <p className="rounded-xl bg-brand-orange-tint px-4 py-3 text-sm font-semibold text-brand-orange-deep">{error}</p>}

        <div role="table" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-brand-line bg-brand-paper">
          <div
            role="row"
            className="hidden h-12 flex-none grid-cols-[88px_minmax(0,1fr)_240px_260px] items-center gap-4 bg-brand-inset px-5 text-[13px] font-bold uppercase tracking-wider text-brand-muted2 lg:grid"
          >
            <span role="columnheader">Foto</span>
            <span role="columnheader">Pjata</span>
            <span role="columnheader">Çmimi (€)</span>
            <span role="columnheader">Disponueshmëria</span>
          </div>
          <div className="overflow-y-auto">
            {current?.items.map((item) => <Row key={item.id} item={item} onPatch={(b) => patch(item, b)} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ item, onPatch }: { item: MenuItem; onPatch: (body: Partial<MenuItem>) => void }) {
  const off = !item.available;
  const [editingPhoto, setEditingPhoto] = useState(false);

  return (
    <div
      role="row"
      className={`grid min-h-[76px] grid-cols-[72px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 border-t border-brand-hair px-3 py-3 md:px-5 lg:grid-cols-[88px_minmax(0,1fr)_240px_260px] lg:gap-4 lg:py-2 ${
        off ? "bg-[#FFF4E4]" : ""
      }`}
    >
      <button onClick={() => setEditingPhoto((v) => !v)} aria-label={`Ndrysho foton: ${item.name}`} className="relative h-14 w-[72px]">
        <DishPhoto item={item} className="h-14 w-[72px] rounded-[10px]" />
        <span className="absolute -bottom-1.5 -right-1.5 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-brand-ink text-[13px] text-brand-paper">
          ✎
        </span>
      </button>
      <div className="flex min-w-0 flex-col gap-1">
        <span className={`text-[17px] font-bold ${off ? "text-brand-faint" : ""}`}>{item.name}</span>
        <span className="text-sm text-brand-muted2">
          {[item.sizes.map((s) => s.code).join(", "), item.is_popular && "Popullore", item.is_signature && "Signature", item.is_alcoholic && "18+"]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {editingPhoto && (
          <input
            type="url"
            defaultValue={item.image_url}
            placeholder="https://… (lidhja e fotos)"
            aria-label={`Lidhja e fotos: ${item.name}`}
            onBlur={(e) => {
              setEditingPhoto(false);
              if (e.target.value !== item.image_url) onPatch({ image_url: e.target.value.trim() });
            }}
            className="h-10 rounded-lg border border-brand-line2 bg-brand-inset px-3 text-sm"
            autoFocus
          />
        )}
      </div>
      <div className="col-span-2 flex flex-wrap gap-1.5 lg:col-span-1">
        {item.sizes.length > 0 ? (
          item.sizes.map((s, i) => (
            <PriceInput
              key={s.code}
              label={s.code}
              value={s.price}
              onSave={(price) =>
                onPatch({ sizes: item.sizes.map((x, j): SizeOption => (j === i ? { ...x, price } : x)), price: i === 0 ? price : item.price })
              }
            />
          ))
        ) : (
          <PriceInput value={item.price} onSave={(price) => onPatch({ price })} />
        )}
      </div>
      <div role="group" aria-label={`Disponueshmëria: ${item.name}`} className="col-span-2 grid grid-cols-2 gap-1 rounded-[14px] bg-brand-cream p-1 lg:col-span-1">
        <button
          onClick={() => onPatch({ available: true })}
          aria-pressed={!off}
          className={`h-12 rounded-[10px] text-[15px] font-bold ${!off ? "bg-brand-teal text-brand-paper" : "text-brand-muted"}`}
        >
          Në dispozicion
        </button>
        <button
          onClick={() => onPatch({ available: false })}
          aria-pressed={off}
          className={`h-12 rounded-[10px] text-[15px] font-bold ${off ? "bg-brand-ink text-brand-paper" : "text-brand-muted"}`}
        >
          E shitur
        </button>
      </div>
    </div>
  );
}

function PriceInput({ value, label, onSave }: { value: number; label?: string; onSave: (v: number) => void }) {
  const [text, setText] = useState(value > 0 ? value.toFixed(2) : "");
  useEffect(() => setText(value > 0 ? value.toFixed(2) : ""), [value]);
  const commit = () => {
    const n = Math.round(parseFloat(text.replace(",", ".")) * 100) / 100;
    if (Number.isFinite(n) && n > 0 && n !== value) onSave(n);
    else setText(value > 0 ? value.toFixed(2) : "");
  };
  return (
    <label className="flex items-center gap-1.5">
      {label && <span className="text-sm font-bold text-brand-muted">{label}</span>}
      <input
        type="text"
        inputMode="decimal"
        value={text}
        placeholder="[çmimi]"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={`h-[52px] rounded-xl border border-brand-line2 bg-brand-inset px-3 text-lg font-bold ${label ? "w-[84px]" : "w-[130px]"}`}
      />
    </label>
  );
}
