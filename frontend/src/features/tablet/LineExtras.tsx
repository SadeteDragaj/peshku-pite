/* One-line summary of a cart line's add-ons and kitchen notes, in the guest's language. */

import { NOTE_CHIPS } from "./i18n";
import { itemName } from "./pricing";
import { useTablet } from "./store";
import type { CartLine } from "./types";

export function LineExtras({ line, className = "text-[13px]" }: { line: CartLine; className?: string }) {
  const lang = useTablet((s) => s.lang);
  const addons = line.item.addons.filter((a) => line.addonIds.includes(a.id)).map((a) => `+ ${itemName(a, lang)}`);
  const notes = [...line.chips.map((id) => NOTE_CHIPS.find((c) => c.id === id)?.[lang] ?? id), line.note.trim()].filter(
    Boolean,
  );
  if (!addons.length && !notes.length) return null;
  return (
    <span className={`leading-snug text-brand-muted2 ${className}`}>
      {[...addons, ...(notes.length ? [`“${notes.join(", ")}”`] : [])].join(" · ")}
    </span>
  );
}
