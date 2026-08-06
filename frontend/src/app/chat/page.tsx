import { ChatPanel } from "@/components/chat/ChatPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { SparkIcon } from "@/components/ui/icons";
import { getSessionUser } from "@/lib/auth";

export default async function ChatPage() {
  // Public: guests can chat, but the agent has no saved memory for them
  // (the chat route answers as a guest and nothing persists).
  const user = await getSessionUser();

  return (
    <div className="flex flex-1 flex-col bg-canvas font-sans">
      <PageHeader user={user}>
        <span className="flex items-center gap-1.5 text-sm font-medium text-ink-muted">
          <SparkIcon className="h-4 w-4 text-brand-600" />
          Agent
        </span>
      </PageHeader>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
        <ChatPanel />
      </main>
    </div>
  );
}
