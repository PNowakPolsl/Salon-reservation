"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

type Booking = {
  id: string; person: string; date: string; startMin: number;
  durationMin: number; createdAt: string; updatedAt?: string;
};
const PEOPLE = ["Dominika", "Natalia"];
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const stamp = (s: string) => new Date(s).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
const hours = (m: number) => `${m / 60}`.replace(".", ",") + " h";
const STARTS = Array.from({ length: 30 }, (_, i) => 7 * 60 + i * 30);
const DURATIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 30);
const card = "rounded-3xl bg-white/80 shadow-[0_10px_40px_rgba(120,100,80,0.10)]";
const select = "w-full rounded-2xl border border-[#EADDCA] bg-[#FAF9F6] px-4 py-3 outline-none focus:border-[#D9A5A0]";

export default function Home() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  }), []);
  const [person, setPerson] = useState<string | null>(null);
  const [date, setDate] = useState(iso(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [start, setStart] = useState(9 * 60);
  const [dur, setDur] = useState(120);
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/bookings?from=${iso(new Date())}`, { cache: "no-store" });
    if (r.ok) setBookings(await r.json());
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    const p = localStorage.getItem("person");
    if (p) setPerson(p);
  }, []);

  const choose = (p: string) => { setPerson(p); localStorage.setItem("person", p); setErr(""); };

  async function submit() {
    if (!person) return setErr("Najpierw wybierz, kim jesteś ✿");
    setBusy(true); setErr("");
    const r = await fetch("/api/bookings", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editId, person, date, startMin: start, durationMin: dur }),
    });
    if (!r.ok) setErr((await r.json()).error || "Coś poszło nie tak");
    else { setEditId(null); await load(); }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm("Na pewno usunąć tę rezerwację?")) return;
    await fetch("/api/bookings", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, person }),
    });
    load();
  }

  function edit(b: Booking) {
    setEditId(b.id); setDate(b.date); setStart(b.startMin); setDur(b.durationMin);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const dayList = bookings.filter((b) => b.date === date).sort((a, b) => a.startMin - b.startMin);
  const busyDates = new Set(bookings.map((b) => b.date));

  return (
    <main className="mx-auto max-w-md px-5 pb-16 pt-10 md:max-w-xl">
      {/* Logo – przytrzymaj 1,5 s, by wejść do panelu admina */}
      <header className="mb-8 text-center select-none"
        onPointerDown={() => (timer.current = setTimeout(() => router.push("/ukryty-admin"), 1500))}
        onPointerUp={() => timer.current && clearTimeout(timer.current)}
        onPointerLeave={() => timer.current && clearTimeout(timer.current)}>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl tracking-wide">Gabinet</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#B8A89A]">rezerwacje</p>
      </header>

      {/* Kim jesteś */}
      <section className="mb-6 grid grid-cols-2 gap-3">
        {PEOPLE.map((p) => (
          <button key={p} onClick={() => choose(p)}
            className={`${card} flex flex-col items-center gap-2 py-5 transition ${
              person === p ? "ring-2 ring-[#D9A5A0]" : "opacity-80"}`}>
            <span className={`flex h-14 w-14 items-center justify-center rounded-full font-[family-name:var(--font-playfair)] text-2xl ${
              p === "Dominika" ? "bg-[#EAD3CF]" : "bg-[#EADDCA]"}`}>{p[0]}</span>
            <span className="text-sm font-medium">{p}</span>
          </button>
        ))}
      </section>

      {/* Dni */}
      <section className="-mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-2">
        {days.map((d) => {
          const k = iso(d); const sel = k === date;
          return (
            <button key={k} onClick={() => setDate(k)}
              className={`relative flex min-w-[3.6rem] flex-col items-center rounded-2xl py-3 transition ${
                sel ? "bg-[#7A6252] text-[#FAF9F6] shadow-lg" : "bg-white/80 shadow-sm"}`}>
              <span className="text-[10px] uppercase opacity-70">
                {d.toLocaleDateString("pl-PL", { weekday: "short" })}
              </span>
              <span className="text-lg font-semibold">{d.getDate()}</span>
              <span className="text-[10px] opacity-60">{d.toLocaleDateString("pl-PL", { month: "short" })}</span>
              {busyDates.has(k) && (
                <span className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${sel ? "bg-[#EAD3CF]" : "bg-[#D9A5A0]"}`} />
              )}
            </button>
          );
        })}
      </section>

      {/* Formularz */}
      <section className={`${card} mb-8 space-y-4 p-6`}>
        <h2 className="font-[family-name:var(--font-playfair)] text-xl">
          {editId ? "Edytuj rezerwację" : "Nowa rezerwacja"}
        </h2>
        <p className="text-sm text-[#B8A89A]">
          {new Date(date).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-[#B8A89A]">Od
            <select className={select} value={start} onChange={(e) => setStart(+e.target.value)}>
              {STARTS.map((m) => <option key={m} value={m}>{hm(m)}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#B8A89A]">Czas trwania
            <select className={select} value={dur} onChange={(e) => setDur(+e.target.value)}>
              {DURATIONS.map((m) => <option key={m} value={m}>{hours(m)}</option>)}
            </select>
          </label>
        </div>
        <p className="text-sm">Do: <b>{start + dur <= 1440 ? hm(start + dur) : "—"}</b></p>
        {err && <p className="rounded-2xl bg-[#F6E3E0] px-4 py-2 text-sm text-[#9A5A52]">{err}</p>}
        <div className="flex gap-3">
          <button disabled={busy} onClick={submit}
            className="flex-1 rounded-2xl bg-[#7A6252] py-3 text-[#FAF9F6] shadow-md transition active:scale-95 disabled:opacity-50">
            {editId ? "Zapisz zmiany" : "Zarezerwuj"}
          </button>
          {editId && (
            <button onClick={() => setEditId(null)} className="rounded-2xl bg-[#EADDCA] px-5">Anuluj</button>
          )}
        </div>
      </section>

      {/* Lista */}
      <h2 className="mb-3 font-[family-name:var(--font-playfair)] text-xl">Zapisy na ten dzień</h2>
      <div className="space-y-3">
        <AnimatePresence>
          {dayList.length === 0 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-6 text-center text-sm text-[#B8A89A]">Gabinet wolny przez cały dzień ✿</motion.p>
          )}
          {dayList.map((b) => (
            <motion.div key={b.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} className={`${card} p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{hm(b.startMin)} – {hm(b.startMin + b.durationMin)}</p>
                  <p className="text-sm text-[#B8A89A]">{hours(b.durationMin)}</p>
                </div>
                <span className={`rounded-full px-4 py-1 text-sm ${
                  b.person === "Dominika" ? "bg-[#EAD3CF]" : "bg-[#EADDCA]"}`}>{b.person}</span>
              </div>
              <p className="mt-3 text-[10px] text-[#B8A89A]">
                Zaklepano: {stamp(b.createdAt)}{b.updatedAt && ` · edytowano: ${stamp(b.updatedAt)}`}
              </p>
              {b.person === person && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => edit(b)} className="rounded-xl bg-[#EADDCA] px-4 py-1.5 text-sm">Edytuj</button>
                  <button onClick={() => remove(b.id)} className="rounded-xl bg-[#F6E3E0] px-4 py-1.5 text-sm text-[#9A5A52]">Usuń</button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
