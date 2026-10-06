import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { buildData } from "@/lib/data";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  return NextResponse.json(await buildData());
}
