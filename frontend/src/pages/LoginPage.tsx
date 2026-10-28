/* Login page for staff (waiter / kitchen / admin). */

import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, login } from "../lib/api";
import { currentRole } from "../features/staff/StaffShell";

const HOME_BY_ROLE: Record<string, string> = { kitchen: "/kitchen", waiter: "/waiter", admin: "/manager" };

export default function LoginPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      const next = search.get("next");
      navigate(next && next.startsWith("/") ? next : HOME_BY_ROLE[currentRole() ?? ""] ?? "/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Email ose fjalëkalim i gabuar." : "Nuk u lidh me serverin.");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream p-6">
      <form onSubmit={submit} className="flex w-full max-w-[420px] flex-col gap-5 rounded-[28px] bg-brand-paper p-10 shadow-sm">
        <img src="/brand/logo-disc.png" alt="Peshku i Pitë" className="mx-auto h-32 w-32 object-contain" />
        <h1 className="text-center font-display text-3xl font-extrabold">Hyrja e stafit</h1>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border border-brand-line2 bg-brand-inset px-4 text-base font-normal outline-none focus:border-brand-teal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Fjalëkalimi
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border border-brand-line2 bg-brand-inset px-4 text-base font-normal outline-none focus:border-brand-teal"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-brand-orange-tint px-4 py-3 text-sm font-semibold text-brand-orange-deep">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="h-14 rounded-2xl bg-brand-orange text-lg font-extrabold text-brand-ink disabled:opacity-60"
        >
          {busy ? "Po hyn…" : "Hyr"}
        </button>
      </form>
    </div>
  );
}
