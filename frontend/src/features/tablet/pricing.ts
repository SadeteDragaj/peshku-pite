/* Price helpers. The server re-computes every price; these are for display only. */

import type { CartLine, Lang, MenuItem } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const eur = (n: number) => `€${n.toFixed(2)}`;

/** Lowest price a guest can pay for the item (cheapest size, or base price). */
export function fromPrice(item: MenuItem): number {
  if (item.sizes.length) return Math.min(...item.sizes.map((s) => s.price));
  return item.price;
}

export const hasPrice = (item: MenuItem) => fromPrice(item) > 0;
export const isOrderable = (item: MenuItem) => item.available && hasPrice(item);
export const needsOptions = (item: MenuItem) => item.sizes.length > 0 || item.addons.length > 0;
export const sizesDiffer = (item: MenuItem) => new Set(item.sizes.map((s) => s.price)).size > 1;

export function unitPrice(item: MenuItem, size: string, addonIds: string[]): number {
  const base = item.sizes.length ? (item.sizes.find((s) => s.code === size)?.price ?? 0) : item.price;
  const extras = item.addons.filter((a) => addonIds.includes(a.id)).reduce((sum, a) => sum + a.price, 0);
  return round2(base + extras);
}

export const lineTotal = (l: CartLine) => round2(unitPrice(l.item, l.size, l.addonIds) * l.qty);
export const cartTotal = (lines: CartLine[]) => round2(lines.reduce((s, l) => s + lineTotal(l), 0));
export const cartCount = (lines: CartLine[]) => lines.reduce((s, l) => s + l.qty, 0);

export const itemName = (item: { name: string; name_en: string }, lang: Lang) =>
  lang === "en" && item.name_en ? item.name_en : item.name;

export const itemDesc = (item: MenuItem, lang: Lang) =>
  lang === "en" && item.description_en ? item.description_en : item.description;
