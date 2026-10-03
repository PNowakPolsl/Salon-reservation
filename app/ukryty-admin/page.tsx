"use client";
import { useState } from "react";

type Log = { id: string; person: string; action: string; details: string; ip: string; createdAt: string };

export default function Admin() {
  const [pass, setPass] = useState("");
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [err, setErr] = useState("");

  async function enter() {
    const r = await fetch("/api/admin/logs", { headers: { "x-admin-password": pass }, cache: "no-store" });
    if (!r.ok) return setErr("Błędne hasło");
    setErr(""); setLogs(await r.json());
  }

  if (!logs)
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-6">
        <h1 className="text-center font-[family-name:var(--font-playfair)] text-2xl">Panel</h1>
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enter()} placeholder="Hasło"
          className="rounded-2xl border border-[#EADDCA] bg-white px-4 py-3 outline-none" />
        {err && <p className="text-center text-sm text-[#9A5A52]">{err}</p>}
        <button onClick={enter} className="rounded-2xl bg-[#7A6252] py-3 text-[#FAF9F6]">Wejdź</button>
      </main>
    );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 font-[family-name:var(--font-playfair)] text-3xl">Logi operacji</h1>
      <div className="overflow-x-auto rounded-3xl bg-white/80 shadow-[0_10px_40px_rgba(120,100,80,0.10)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#EADDCA] text-xs uppercase tracking-wider">
            <tr><th className="p-4">Kto</th><th className="p-4">Co</th><th className="p-4">Szczegóły</th>
              <th className="p-4">Kiedy</th><th className="p-4">IP</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-[#EADDCA]">
                <td className="p-4 font-medium">{l.person}</td>
                <td className="p-4">{l.action}</td>
                <td className="p-4">{l.details}</td>
                <td className="whitespace-nowrap p-4">
                  {new Date(l.createdAt).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}
                </td>
                <td className="p-4 font-mono text-xs">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
