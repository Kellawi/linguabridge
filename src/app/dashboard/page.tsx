import { redirect } from "next/navigation";
import { Dashboard, type DashboardProposal } from "@/components/Dashboard";
import { getSessionUser } from "@/lib/auth";
import {
  getProfile,
  listEmployerJobs,
  listOpenJobs,
  listProposalsForFreelancer,
  toJobView,
} from "@/lib/repo";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");

  if (user.role === "employer") {
    const jobs = (await listEmployerJobs(user.id)).map(toJobView);
    return (
      <Dashboard
        fullName={user.fullName}
        role="employer"
        jobs={jobs}
        proposals={[]}
        profileComplete
      />
    );
  }

  const [jobs, proposalRows, profile] = await Promise.all([
    listOpenJobs(),
    listProposalsForFreelancer(user.id),
    getProfile(user.id),
  ]);

  const proposals: DashboardProposal[] = proposalRows.map((row) => ({
    id: row.id,
    jobId: row.job_id,
    jobTitleAr: row.job_title_ar ?? "",
    jobTitleEn: row.job_title_en ?? "",
    status: row.status,
  }));

  return (
    <Dashboard
      fullName={user.fullName}
      role="freelancer"
      jobs={jobs.map(toJobView)}
      proposals={proposals}
      profileComplete={Boolean(profile?.published && profile.skills.length > 0)}
    />
  );
}
