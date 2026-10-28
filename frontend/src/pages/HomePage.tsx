/* Landing page – entry points for staff; guests use the tablet on their table (/t/:number).
   In demo mode the server also hands out the table links, so the menu opens straight from here. */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface DemoTable {
  number: number;
  device_key: string;
}

const menuPath = (t: DemoTable) => `/t/${t.number}/menu?key=${encodeURIComponent(t.device_key)}`;

export default function HomePage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<DemoTable[]>([]);

  useEffect(() => {
    api.get<DemoTable[]>("/guest/demo/tables").then(setTables, () => setTables([])); // 404 outside demo mode
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-cream p-8 text-center text-brand-ink">
      <img src="/brand/logo-disc.png" alt="Peshku i Pitë" className="h-48 w-48 object-contain" />
      <p className="font-display text-2xl font-semibold text-brand-orange-deep">Fish and dish!</p>

      {tables.length > 0 && (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => navigate(menuPath(tables[0]))}
            className="flex h-16 items-center rounded-2xl bg-brand-orange px-10 text-xl font-extrabold text-brand-ink"
          >
            Menyja · Tavolina {tables[0].number}
          </button>
          <p className="text-brand-muted">ose zgjidh tavolinën:</p>
          <div className="flex max-w-md flex-wrap justify-center gap-2">
            {tables.map((t) => (
              <button
                key={t.number}
                onClick={() => navigate(menuPath(t))}
                className="h-12 w-12 rounded-xl bg-brand-paper text-lg font-bold text-brand-ink shadow-sm"
              >
                {t.number}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {[
          ["/manager", "Menaxheri"],
          ["/waiter", "Kamarieri"],
          ["/kitchen", "Kuzhina"],
          ["/menu-manager", "Menaxho menynë"],
        ].map(([to, label]) => (
          <Link key={to} to={to} className="flex h-14 items-center rounded-2xl bg-brand-ink px-6 text-lg font-bold text-brand-paper">
            {label}
          </Link>
        ))}
      </div>
      {tables.length === 0 && (
        <p className="max-w-md text-brand-muted">
          Tabletët e tavolinave hapin <code>/t/&lt;numri&gt;?key=…</code> një herë – lidhjet i printon <code>python -m app.seed</code>.
        </p>
      )}
    </div>
  );
}
