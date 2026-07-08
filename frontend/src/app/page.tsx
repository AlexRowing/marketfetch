export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-8 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-start gap-6">
        <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Foundation build
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          MarketFetch
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          An AI buying agent for second-hand marketplaces. It remembers what
          you like (Buyer Memory) and what things should cost (Price Memory),
          then finds you the deals worth acting on.
        </p>
        <ul className="flex flex-col gap-2 text-base text-zinc-600 dark:text-zinc-400">
          <li>🧠 Buyer Memory — preferences, sizes, budgets, saved items</li>
          <li>📉 Price Memory — price history, listing age, market averages</li>
          <li>🤖 Agent chat — grounded in CockroachDB via MCP</li>
        </ul>
        <p className="text-sm text-zinc-400 dark:text-zinc-500">
          Feed, listing detail, preferences, and chat pages land here next —
          see docs/product-spec.md for the plan.
        </p>
      </main>
    </div>
  );
}
