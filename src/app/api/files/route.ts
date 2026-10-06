import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listFiles } from "@/lib/data";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ files: await listFiles() });
}
