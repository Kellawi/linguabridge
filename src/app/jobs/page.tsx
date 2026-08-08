import { JobsPageHeader } from "@/components/JobsPageHeader";
import { JobList } from "@/components/JobList";
import { SetupNotice } from "@/components/SetupNotice";
import { isDatabaseConfigured } from "@/lib/db";
import { listOpenJobs, toJobView } from "@/lib/repo";

export default async function JobsPage() {
  if (!isDatabaseConfigured()) return <SetupNotice />;

  const jobs = (await listOpenJobs()).map(toJobView);

  return (
    <div className="space-y-6">
      <JobsPageHeader />
      <JobList jobs={jobs} />
    </div>
  );
}
