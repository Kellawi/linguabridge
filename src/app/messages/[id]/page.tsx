import { notFound, redirect } from "next/navigation";
import { ChatWorkspace } from "@/components/ChatWorkspace";
import { getSessionUser } from "@/lib/auth";
import {
  getConversationForMember,
  listGlossary,
  listMessages,
  toConversationView,
  toGlossaryView,
  toMessageView,
} from "@/lib/repo";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/signin");

  const { id } = await params;

  // getConversationForMember throws ForbiddenError for both a missing row and
  // one belonging to someone else. Rendering 404 for both keeps the two cases
  // indistinguishable from outside.
  const conversation = await getConversationForMember(id, user.id).catch(() => null);
  if (!conversation) notFound();

  const [messages, glossary] = await Promise.all([listMessages(id), listGlossary(id)]);

  return (
    <ChatWorkspace
      conversation={toConversationView(conversation)}
      initialMessages={messages.map(toMessageView)}
      initialGlossary={glossary.map(toGlossaryView)}
      currentUserId={user.id}
    />
  );
}
