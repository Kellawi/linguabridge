import { notFound } from "next/navigation";
import { JobDetail } from "@/components/JobDetail";
import { SetupNotice } from "@/components/SetupNotice";
import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getJob,
  getProposalFor,
  listProposalsForJob,
  toJobView,
  toProposalView,
} from "@/lib/repo";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return <SetupNotice />;

  const { id } = await params;

  // A malformed id would otherwise reach Postgres and raise a uuid cast error.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const row = await getJob(id);
  if (!row) notFound();

  const user = await getSessionUser().catch(() => null);
  const isOwner = user?.role === "employer" && user.id === row.employer_id;

  const [existing, proposals] = await Promise.all([
    user?.role === "freelancer" ? getProposalFor(id, user.id) : Promise.resolve(null),
    isOwner ? listProposalsForJob(id) : Promise.resolve([]),
  ]);

  return (
    <JobDetail
      job={toJobView(row)}
      viewerRole={user?.role ?? null}
      isOwner={isOwner}
      existingProposal={existing ? toProposalView(existing) : null}
      proposals={proposals.map(toProposalView)}
    />
  );
}
