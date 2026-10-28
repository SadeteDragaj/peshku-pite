/* About us: concept, hours, address, Instagram. */

import type { ReactNode } from "react";
import { useTablet } from "./store";
import { CloseButton, FishMark, Icon, Modal, primaryBtn, useT } from "./ui";

export default function AboutSheet() {
  const t = useT();
  const close = () => useTablet.getState().setPanel(null);

  return (
    <Modal label={t.about} onClose={close} className="flex sm:w-[min(1120px,calc(100vw-32px))] md:h-[min(688px,calc(100dvh-32px))]">
      <div className="relative hidden w-[36%] flex-none bg-cover bg-center md:block lg:w-[440px]" style={{ backgroundImage: "url(/brand/tiles.jpg)" }}>
        <img
          src="/brand/logo-disc.png"
          alt=""
          className="absolute left-1/2 top-1/2 h-[290px] w-[300px] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,.35)]"
          draggable={false}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4 px-5 py-5 md:gap-[22px] md:px-11 md:py-10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <FishMark size={48} />
            <div className="flex flex-col">
              <h2 className="font-display text-[30px] font-extrabold leading-none tracking-tight md:text-[40px]">Peshku i Pitë</h2>
              <span className="font-display text-xl font-semibold text-brand-orange-deep">{t.tagline}</span>
            </div>
          </div>
          <CloseButton onClick={close} />
        </div>
        <p className="text-[17px] leading-relaxed text-brand-ink2 md:text-xl">{t.aboutIntro}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fact icon={<Icon.Clock size={26} />} label={t.hours} value={t.hoursValue} />
          <Fact icon={<Icon.Pin size={26} />} label={t.address} value={t.addressValue} />
          <Fact icon={<Icon.Instagram size={26} />} label="Instagram" value="@peshkuipite" />
          <Fact icon={<Icon.Glass size={26} />} label={t.onMenu} value={t.onMenuValue} />
        </div>
        <div className="flex-1" />
        <button onClick={close} className={`${primaryBtn} h-[60px] px-7 text-lg sm:self-start`}>
          {t.backToMenu}
        </button>
      </div>
    </Modal>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[18px] bg-brand-cream p-4 md:p-5">
      <span className="text-brand-tile">{icon}</span>
      <span className="text-sm text-brand-muted2">{label}</span>
      <span className="text-lg font-bold leading-snug">{value}</span>
    </div>
  );
}
