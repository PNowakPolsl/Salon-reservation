"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

type Booking = {
  id: string; person: string; date: string; startMin: number;
  durationMin: number; createdAt: string; updatedAt?: string;
};

const PEOPLE = ["Dominika", "Natalia"];
const MONTHS = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
const WEEK = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const stamp = (s: string) => new Date(s).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" });
const len = (m: number) => {
  const h = Math.floor(m / 60), r = m % 60;
  return [h ? `${h} h` : "", r ? `${r} min` : ""].filter(Boolean).join(" ");
};

const STEP = 15;                 // krok w minutach
const DAY_START = 6 * 60;        // pasek i wybór od 6:00
const DAY_END = 24 * 60;         // do 24:00
const STARTS = Array.from({ length: (DAY_END - DAY_START) / STEP }, (_, i) => DAY_START + i * STEP);
const DURATIONS = Array.from({ length: 48 }, (_, i) => (i + 1) * STEP); // 15 min – 12 h

const card = "rounded-3xl bg-white/80 shadow-[0_10px_40px_rgba(120,100,80,0.10)]";
const select = "w-full rounded-2xl border border-[#EADDCA] bg-[#FAF9F6] px-4 py-3 outline-none focus:border-[#D9A5A0]";
const tone = (p: string) => (p === "Dominika" ? "bg-[#EAD3CF]" : "bg-[#EADDCA]");
const dotTone = (p: string) => (p === "Dominika" ? "bg-[#D9A5A0]" : "bg-[#B8A07E]");
const pct = (m: number) => `${((m - DAY_START) / (DAY_END - DAY_START)) * 100}%`;

export default function Home() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLElement | null>(null);

  const now = useMemo(() => new Date(), []);
  const todayIso = iso(now);
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();

  const [year, setYear] = useState(curYear);
  const [month, setMonth] = useState(curMonth);
  const [date, setDate] = useState(todayIso);
  const [person, setPerson] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [start, setStart] = useState(9 * 60);
  const [dur, setDur] = useState(120);
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/bookings?from=${todayIso}`, { cache: "no-store" });
    if (r.ok) setBookings(await r.json());
  }, [todayIso]);

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

  function goTo(y: number, m: number) {
    setYear(y); setMonth(m); setEditId(null); setErr("");
    setDate(y === curYear && m === curMonth ? todayIso : iso(new Date(y, m, 1)));
  }
  const prev = () => (month === 0 ? goTo(year - 1, 11) : goTo(year, month - 1));
  const next = () => (month === 11 ? goTo(year + 1, 0) : goTo(year, month + 1));
  const atMin = year === curYear && month === curMonth;
  const atMax = year === curYear + 2 && month === 11;

  // siatka kalendarza (poniedziałek = pierwszy dzień tygodnia)
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];

  const byDate = useMemo(() => {
    const m: Record<string, Booking[]> = {};
    bookings.forEach((b) => (m[b.date] ||= []).push(b));
    return m;
  }, [bookings]);

  const dayList = (byDate[date] || []).slice().sort((a, b) => a.startMin - b.startMin);
  const over24 = start + dur > DAY_END;
  const overlap = dayList.some(
    (b) => b.id !== editId && start < b.startMin + b.durationMin && start + dur > b.startMin
  );

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
    setYear(+b.date.slice(0, 4)); setMonth(+b.date.slice(5, 7) - 1); setErr("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-16 pt-10 md:max-w-xl">
      {/* Logo – przytrzymaj 1,5 s, by wejść do panelu admina */}
      <header className="mb-8 select-none text-center"
        onPointerDown={() => (timer.current = setTimeout(() => router.push("/ukryty-admin"), 10000))}
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
            <span className={`flex h-14 w-14 items-center justify-center rounded-full font-[family-name:var(--font-playfair)] text-2xl ${tone(p)}`}>
              {p[0]}
            </span>
            <span className="text-sm font-medium">{p}</span>
          </button>
        ))}
      </section>

      {/* 1. Kalendarz miesięczny */}
      <section className={`${card} mb-6 p-5`}>
        <div className="mb-4 flex items-center gap-2">
          <button onClick={prev} disabled={atMin} aria-label="Poprzedni miesiąc"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EADDCA]/60 text-lg disabled:opacity-30">‹</button>
          <select value={month} onChange={(e) => goTo(year, +e.target.value)}
            className="min-w-0 flex-1 rounded-2xl border border-[#EADDCA] bg-[#FAF9F6] px-3 py-2 font-[family-name:var(--font-playfair)] text-lg outline-none">
            {MONTHS.map((m, i) => (
              <option key={m} value={i} disabled={year === curYear && i < curMonth}>{m}</option>
            ))}
          </select>
          <select value={year}
            onChange={(e) => {
              const y = +e.target.value;
              goTo(y, y === curYear && month < curMonth ? curMonth : month);
            }}
            className="rounded-2xl border border-[#EADDCA] bg-[#FAF9F6] px-3 py-2 text-lg outline-none">
            {[curYear, curYear + 1, curYear + 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={next} disabled={atMax} aria-label="Następny miesiąc"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EADDCA]/60 text-lg disabled:opacity-30">›</button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-[11px] uppercase tracking-wider text-[#B8A89A]">
          {WEEK.map((w) => <span key={w}>{w}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((day, i) => {
            if (!day) return <span key={`e${i}`} />;
            const k = iso(new Date(year, month, day));
            const sel = k === date;
            const past = k < todayIso;
            const people = Array.from(new Set((byDate[k] || []).map((b) => b.person)));
            return (
              <button key={k} disabled={past} onClick={() => { setDate(k); setEditId(null); setErr(""); }}
                className="flex flex-col items-center py-0.5 disabled:opacity-30">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm transition ${
                  sel ? "bg-[#7A6252] text-[#FAF9F6] shadow-md"
                    : k === todayIso ? "ring-1 ring-[#D9A5A0]" : "hover:bg-[#EADDCA]/50"}`}>
                  {day}
                </span>
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {people.map((p) => <i key={p} className={`h-1.5 w-1.5 rounded-full ${dotTone(p)}`} />)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex justify-center gap-4 text-[11px] text-[#B8A89A]">
          {PEOPLE.map((p) => (
            <span key={p} className="flex items-center gap-1">
              <i className={`h-2 w-2 rounded-full ${dotTone(p)}`} /> {p}
            </span>
          ))}
        </div>
      </section>

      {/* 2. Okno nowej rezerwacji (tuż pod kalendarzem) */}
      <section ref={formRef} className={`${card} mb-8 space-y-4 p-6`}>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#B8A89A]">
            {editId ? "Edytuj rezerwację" : "Nowa rezerwacja"}
          </p>
          <h2 className="font-[family-name:var(--font-playfair)] text-2xl first-letter:uppercase">
            {new Date(date + "T12:00:00").toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" })}
          </h2>
        </div>

        {/* Pasek zajętości */}
        <div>
          <div className="relative h-4 overflow-hidden rounded-full bg-[#EADDCA]/50">
            {dayList.map((b) => (
              <div key={b.id} className={`absolute top-0 h-full ${dotTone(b.person)}`}
                style={{ left: pct(b.startMin), width: `${(b.durationMin / (DAY_END - DAY_START)) * 100}%` }} />
            ))}
            {!over24 && (
              <div className={`absolute top-0 h-full rounded-full border-2 ${
                overlap ? "border-[#C0766B]" : "border-[#7A6252]"}`}
                style={{ left: pct(start), width: `${(dur / (DAY_END - DAY_START)) * 100}%` }} />
            )}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-[#B8A89A]">
            <span>6:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-[#B8A89A]">Od
            <select className={select} value={start} onChange={(e) => setStart(+e.target.value)}>
              {STARTS.map((m) => <option key={m} value={m}>{hm(m)}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#B8A89A]">Czas trwania
            <select className={select} value={dur} onChange={(e) => setDur(+e.target.value)}>
              {DURATIONS.map((m) => <option key={m} value={m}>{len(m)}</option>)}
            </select>
          </label>
        </div>
        <p className="text-sm">Do: <b>{over24 ? "—" : hm(start + dur)}</b></p>
        {over24 && <p className="rounded-2xl bg-[#F6E3E0] px-4 py-2 text-sm text-[#9A5A52]">Rezerwacja nie może wychodzić poza północ.</p>}
        {overlap && <p className="rounded-2xl bg-[#F6E3E0] px-4 py-2 text-sm text-[#9A5A52]">Ten termin nakłada się na inną rezerwację.</p>}
        {err && <p className="rounded-2xl bg-[#F6E3E0] px-4 py-2 text-sm text-[#9A5A52]">{err}</p>}
        <div className="flex gap-3">
          <button disabled={busy || over24 || overlap} onClick={submit}
            className="flex-1 rounded-2xl bg-[#7A6252] py-3 text-[#FAF9F6] shadow-md transition active:scale-95 disabled:opacity-40">
            {editId ? "Zapisz zmiany" : "Zarezerwuj"}
          </button>
          {editId && (
            <button onClick={() => setEditId(null)} className="rounded-2xl bg-[#EADDCA] px-5">Anuluj</button>
          )}
        </div>
      </section>

      {/* 3. Aktualne rezerwacje tego dnia */}
      <h2 className="mb-3 font-[family-name:var(--font-playfair)] text-xl">Zapisy na ten dzień</h2>
      <div className="space-y-3">
        <AnimatePresence>
          {dayList.length === 0 && (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-4 text-center text-sm text-[#B8A89A]">Gabinet wolny przez cały dzień ✿</motion.p>
          )}
          {dayList.map((b) => (
            <motion.div key={b.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }} className={`${card} p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{hm(b.startMin)} – {hm(b.startMin + b.durationMin)}</p>
                  <p className="text-sm text-[#B8A89A]">{len(b.durationMin)}</p>
                </div>
                <span className={`rounded-full px-4 py-1 text-sm ${tone(b.person)}`}>{b.person}</span>
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