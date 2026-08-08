import { redirect } from "next/navigation";
import { Landing } from "@/components/Landing";
import { SetupNotice } from "@/components/SetupNotice";
import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

export default async function HomePage() {
  if (!isDatabaseConfigured()) return <SetupNotice />;

  const user = await getSessionUser().catch(() => null);
  if (user) redirect("/dashboard");

  return <Landing />;
}
