import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
const PEOPLE = ["Dominika", "Natalia"];

const getIp = (r: NextRequest) =>
  r.headers.get("x-forwarded-for")?.split(",")[0].trim() || "nieznany";
const hm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

async function log(person: string, action: string, details: string, ip: string) {
  await db.collection("logs").add({
    person, action, details, ip, createdAt: new Date().toISOString(),
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function valid(b: any) {
  return (
    PEOPLE.includes(b?.person) &&
    /^\d{4}-\d{2}-\d{2}$/.test(b?.date) &&
    Number.isInteger(b?.startMin) && Number.isInteger(b?.durationMin) &&
    b.startMin % 15 === 0 && b.durationMin % 15 === 0 &&
    b.durationMin >= 15 && b.startMin >= 0 && b.startMin + b.durationMin <= 1440
  );
}

async function conflict(date: string, start: number, end: number, exceptId?: string) {
  const snap = await db.collection("bookings").where("date", "==", date).get();
  return snap.docs.some((d) => {
    const x = d.data();
    return d.id !== exceptId && start < x.startMin + x.durationMin && end > x.startMin;
  });
}

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from") || "2000-01-01";
  const snap = await db.collection("bookings").where("date", ">=", from).orderBy("date").get();
  return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!valid(b)) return NextResponse.json({ error: "Niepoprawne dane" }, { status: 400 });
  if (await conflict(b.date, b.startMin, b.startMin + b.durationMin))
    return NextResponse.json({ error: "Ten termin się nakłada na inną rezerwację" }, { status: 409 });

  await db.collection("bookings").add({
    person: b.person, date: b.date, startMin: b.startMin,
    durationMin: b.durationMin, createdAt: new Date().toISOString(),
  });
  await log(b.person, "Dodała rezerwację", `${b.date} ${hm(b.startMin)}–${hm(b.startMin + b.durationMin)}`, getIp(req));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const b = await req.json();
  if (!valid(b) || !b.id) return NextResponse.json({ error: "Niepoprawne dane" }, { status: 400 });
  const ref = db.collection("bookings").doc(b.id);
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  if (doc.data()!.person !== b.person)
    return NextResponse.json({ error: "To nie Twoja rezerwacja" }, { status: 403 });
  if (await conflict(b.date, b.startMin, b.startMin + b.durationMin, b.id))
    return NextResponse.json({ error: "Ten termin się nakłada na inną rezerwację" }, { status: 409 });

  await ref.update({
    date: b.date, startMin: b.startMin, durationMin: b.durationMin,
    updatedAt: new Date().toISOString(),
  });
  await log(b.person, "Edytowała rezerwację", `${b.date} ${hm(b.startMin)}–${hm(b.startMin + b.durationMin)}`, getIp(req));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id, person } = await req.json();
  const ref = db.collection("bookings").doc(id);
  const doc = await ref.get();
  if (!doc.exists) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  const x = doc.data()!;
  if (x.person !== person) return NextResponse.json({ error: "To nie Twoja rezerwacja" }, { status: 403 });

  await ref.delete();
  await log(person, "Usunęła rezerwację", `${x.date} ${hm(x.startMin)}–${hm(x.startMin + x.durationMin)}`, getIp(req));
  return NextResponse.json({ ok: true });
}
