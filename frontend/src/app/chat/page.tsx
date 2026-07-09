import { ChatPanel } from "@/components/chat/ChatPanel";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ChatPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <PageHeader>
        <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 dark:text-zinc-500">
          <span aria-hidden>🤖</span> Agent
        </span>
      </PageHeader>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
        <ChatPanel />
      </main>
    </div>
  );
}
