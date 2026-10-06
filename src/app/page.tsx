import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { Dashboard } from "@/components/dashboard";

export default async function Home() {
  if (!(await isAuthed())) redirect("/login");
  return <Dashboard />;
}
