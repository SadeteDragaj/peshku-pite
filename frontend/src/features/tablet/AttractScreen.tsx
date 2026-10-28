/* Idle / attract screen: logo, rotating backdrop, "tap to order". */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTablet } from "./store";
import type { MenuItem } from "./types";
import { DishPhoto, Icon, useT } from "./ui";

const ROTATE_MS = 5000;

export default function AttractScreen() {
  const t = useT();
  const navigate = useNavigate();
  const tableNumber = useTablet((s) => s.tableNumber);
  const menu = useTablet((s) => s.menu);

  // Slide 1 is the mosaic wall; then signature & popular dishes that have a real photo.
  const dishes = useMemo<MenuItem[]>(
    () =>
      (menu ?? [])
        .flatMap((c) => c.items)
        .filter((i) => i.available && i.image_url && (i.is_signature || i.is_popular))
        .slice(0, 4),
    [menu],
  );
  const slides = 1 + dishes.length;
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (slides < 2) return;
    const id = window.setInterval(() => setSlide((s) => (s + 1) % slides), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [slides]);

  return (
    <button
      onClick={() => navigate("menu")}
      aria-label={t.tapToOrder}
      className="relative block h-full w-full overflow-hidden text-left"
    >
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${slide === 0 ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundImage: "url(/brand/tiles.jpg)" }}
      />
      {dishes.map((d, i) => (
        <DishPhoto
          key={d.id}
          item={d}
          className={`!absolute inset-0 transition-opacity duration-1000 ${slide === i + 1 ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      {/* Phones: the text sits over the photo, so cover it evenly; wider screens fade to the right */}
      <div className="absolute inset-0 bg-[rgba(243,234,216,.88)] md:hidden" />
      <div className="absolute inset-0 hidden md:block bg-[linear-gradient(90deg,rgba(243,234,216,.97)_0%,rgba(243,234,216,.86)_38%,rgba(243,234,216,.15)_72%,rgba(243,234,216,0)_100%)]" />

      <div className="relative flex h-full flex-col justify-between gap-6 px-5 py-6 md:px-12 md:py-10 lg:px-16 lg:py-14">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2.5 rounded-full border border-brand-ink/10 bg-white/70 px-[18px] py-2.5 text-lg font-semibold">
            <Icon.Table size={20} className="text-brand-orange-deep" />
            {t.table} {tableNumber}
          </span>
          <span className="rounded-full bg-white/70 px-4 py-2 text-sm text-brand-muted md:text-base">{t.openHours}</span>
        </div>

        <div className="flex max-w-[600px] flex-col items-center gap-3 text-center md:items-start md:gap-5 md:text-left">
          <h1 className="m-0 leading-none">
            <img
              src="/brand/logo-disc.png"
              alt="Peshku i Pitë"
              className="h-[170px] w-[176px] object-contain drop-shadow-[0_12px_24px_rgba(24,58,61,.25)] md:h-[252px] md:w-[260px]"
              draggable={false}
            />
          </h1>
          <p className="font-display text-[26px] font-medium text-brand-orange-deep md:text-[34px]">{t.tagline}</p>
          <p className="max-w-[460px] text-[17px] leading-normal text-brand-muted md:text-xl">{t.intro}</p>
        </div>

        <div className="flex flex-col items-center gap-5 md:flex-row md:items-end md:justify-between">
          <span className="relative flex items-center gap-4 rounded-full bg-brand-orange px-7 py-4 text-brand-ink md:px-9 md:py-[22px]">
            <span className="absolute -inset-2.5 animate-pip-ring rounded-full border-2 border-brand-orange" aria-hidden="true" />
            <Icon.Hand size={30} />
            <span className="flex flex-col">
              <span className="font-display text-2xl font-bold md:text-[28px]">{t.tapToOrder}</span>
              <span className="text-base font-medium opacity-80">Tap to order</span>
            </span>
          </span>
          {slides > 1 && (
            <span className="flex items-center gap-2.5" aria-hidden="true">
              {Array.from({ length: slides }, (_, i) => (
                <span key={i} className={`h-1.5 rounded-full ${i === slide ? "w-7 bg-brand-ink" : "w-1.5 bg-brand-ink/30"}`} />
              ))}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
