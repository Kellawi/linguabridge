import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/SignUpForm";
import { SetupNotice } from "@/components/SetupNotice";
import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

export default async function SignUpPage() {
  if (!isDatabaseConfigured()) return <SetupNotice />;

  const user = await getSessionUser().catch(() => null);
  if (user) redirect("/dashboard");

  return <SignUpForm />;
}
