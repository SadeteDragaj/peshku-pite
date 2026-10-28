/* Post-meal rating: 1–5 stars, quick tags, optional comment. */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RATING_TAGS } from "./i18n";
import { useTablet } from "./store";
import { FishMark, Icon, primaryBtn, secondaryBtn, usePath, useT } from "./ui";

export default function RatingScreen() {
  const t = useT();
  const lang = useTablet((s) => s.lang);
  const sendFeedback = useTablet((s) => s.sendFeedback);
  const navigate = useNavigate();
  const path = usePath();

  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const done = () => navigate(path(), { replace: true });
  const submit = async () => {
    setState("sending");
    try {
      await sendFeedback(
        rating,
        tags.map((id) => RATING_TAGS.find((x) => x.id === id)?.sq ?? id),
        comment,
      );
      setState("sent");
      window.setTimeout(done, 2500);
    } catch {
      setState("idle");
    }
  };

  if (state === "sent") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
        <img src="/brand/logo-disc.png" alt="" className="h-52 w-52 object-contain" draggable={false} />
        <h1 className="font-display text-5xl font-extrabold tracking-tight">{t.ratingThanks}</h1>
      </div>
    );
  }

  return (
    <div className="scroll-thin flex h-full flex-col gap-5 overflow-y-auto p-4 md:gap-8 md:p-8 lg:flex-row lg:gap-14 lg:overflow-hidden lg:p-14">
      <div className="flex flex-none flex-col justify-between gap-4 lg:w-[420px]">
        <div className="flex items-center gap-2.5">
          <FishMark />
          <span className="font-display text-2xl font-extrabold">Peshku i Pitë</span>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="font-display text-[38px] font-extrabold leading-[.98] tracking-tight md:text-[52px] lg:text-[64px]">{t.thanksTitle}</h1>
          <p className="text-[17px] leading-normal text-brand-muted md:text-xl">{t.thanksBody}</p>
        </div>
        <span className="hidden text-base text-brand-muted2 lg:inline">
          {t.findUs} <strong className="text-brand-ink">@peshkuipite</strong>
        </span>
      </div>

      <div className="flex flex-none flex-col gap-6 rounded-[28px] bg-brand-paper p-5 md:gap-7 md:p-10 lg:flex-1">
        <div className="flex flex-col gap-3.5">
          <span className="text-lg font-bold">{t.yourRating}</span>
          <div role="group" aria-label={t.yourRating} className="flex gap-2 md:gap-3">
            {[1, 2, 3, 4, 5].map((n) => {
              const on = n <= rating;
              return (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  aria-label={t.ratingOf(n)}
                  aria-pressed={n === rating}
                  className={`flex aspect-square max-w-[88px] flex-1 items-center justify-center rounded-[18px] border-2 md:h-[88px] md:w-[88px] md:flex-none md:rounded-[22px] ${
                    on ? "border-brand-orange bg-brand-orange-tint text-brand-orange" : "border-brand-line bg-brand-inset text-brand-faint"
                  }`}
                >
                  <Icon.Star size={36} filled={on} />
                </button>
              );
            })}
          </div>
          <span className="h-6 text-base font-semibold text-brand-orange-deep">{t.verdicts[rating]}</span>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-lg font-bold">
            {t.liked} <span className="font-normal text-brand-muted2">{t.optional}</span>
          </span>
          <div className="flex flex-wrap gap-2.5">
            {RATING_TAGS.map((tag) => {
              const on = tags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => setTags(on ? tags.filter((x) => x !== tag.id) : [...tags, tag.id])}
                  aria-pressed={on}
                  className={`h-12 rounded-full border-2 px-4 text-[15px] font-semibold md:h-[52px] md:px-5 md:text-base ${
                    on ? "border-brand-ink bg-brand-ink text-brand-paper" : "border-brand-line bg-brand-paper text-brand-ink2"
                  }`}
                >
                  {tag[lang]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <label htmlFor="rating-comment" className="text-lg font-bold">
            {t.comment} <span className="font-normal text-brand-muted2">{t.optional}</span>
          </label>
          <textarea
            id="rating-comment"
            rows={3}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.commentPh}
            className="resize-none rounded-2xl border border-brand-line2 bg-brand-inset p-4 text-[17px] outline-none focus:border-brand-teal"
          />
        </div>

        <div className="hidden flex-1 lg:block" />
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <button onClick={done} className={`${secondaryBtn} h-[60px] text-base md:h-[68px] md:text-lg`}>
            {t.skip}
          </button>
          <button onClick={submit} disabled={rating === 0 || state === "sending"} className={`${primaryBtn} h-[60px] text-lg md:h-[68px] md:text-xl`}>
            {t.sendRating}
          </button>
        </div>
      </div>
    </div>
  );
}
