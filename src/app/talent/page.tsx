import { TalentList } from "@/components/TalentList";
import { SetupNotice } from "@/components/SetupNotice";
import { isDatabaseConfigured } from "@/lib/db";
import { listPublishedProfiles, toProfileView } from "@/lib/repo";

export default async function TalentPage() {
  if (!isDatabaseConfigured()) return <SetupNotice />;

  const profiles = (await listPublishedProfiles()).map(toProfileView);
  return <TalentList profiles={profiles} />;
}
