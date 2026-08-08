import { redirect } from "next/navigation";
import { SignInForm } from "@/components/SignInForm";
import { SetupNotice } from "@/components/SetupNotice";
import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

export default async function SignInPage() {
  if (!isDatabaseConfigured()) return <SetupNotice />;

  const user = await getSessionUser().catch(() => null);
  if (user) redirect("/dashboard");

  return <SignInForm />;
}
