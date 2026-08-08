import { redirect } from "next/navigation";
import { ProfileBuilder, type ProfileInitial } from "@/components/ProfileBuilder";
import { getSessionUser } from "@/lib/auth";
import { getProfile } from "@/lib/repo";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");
  if (user.role !== "freelancer") redirect("/dashboard");

  const row = await getProfile(user.id);

  const initial: ProfileInitial = {
    headlineAr: row?.headline_ar ?? "",
    headlineEn: row?.headline_en ?? "",
    bioAr: row?.bio_ar ?? "",
    bioEn: row?.bio_en ?? "",
    skills: row?.skills ?? [],
    // NUMERIC comes back from Postgres as a string to preserve precision.
    rateAmount: row?.rate_amount ? Number(row.rate_amount) : null,
    rateCurrency: row?.rate_currency ?? null,
    rateUnit: row?.rate_unit ?? null,
    sourceLang: row?.source_lang ?? user.preferredLang,
    published: row?.published ?? false,
  };

  return <ProfileBuilder initial={initial} />;
}
