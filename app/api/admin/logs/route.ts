import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass || req.headers.get("x-admin-password") !== pass)
    return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });
  const snap = await db.collection("logs").orderBy("createdAt", "desc").limit(300).get();
  return NextResponse.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}
