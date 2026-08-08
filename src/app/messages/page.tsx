import { redirect } from "next/navigation";
import { ConversationList } from "@/components/ConversationList";
import { getSessionUser } from "@/lib/auth";
import { listConversations, toConversationView } from "@/lib/repo";

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/signin");

  const conversations = (await listConversations(user.id)).map(toConversationView);

  return <ConversationList conversations={conversations} />;
}
