import { redirect } from "next/navigation";
import { JobBriefComposer } from "@/components/JobBriefComposer";
import { getSessionUser } from "@/lib/auth";

export default async function NewJobPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  if (user.role !== "employer") redirect("/dashboard");

  return <JobBriefComposer />;
}
