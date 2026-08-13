import { PageHeader } from "@/components/ui/PageHeader";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EFFECTIVE_DATE = "August 12, 2026";
const CONTACT_EMAIL = "zhangsihanmichael@gmail.com";

export default async function PrivacyPage() {
  const user = await getSessionUser();

  return (
    <div className="flex flex-1 flex-col bg-canvas font-sans">
      <PageHeader user={user} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <header className="mb-8 border-b border-line pb-6">
          <h1 className="font-serif text-[2.25rem] font-semibold leading-[1.05] tracking-tight text-balance text-ink sm:text-[2.75rem]">
            Privacy Policy
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
            Effective {EFFECTIVE_DATE}. MarketFetch is a student hackathon
            project (CockroachDB × AWS hackathon), not a commercial company.
            This page explains, plainly and accurately, what data the app
            collects and what happens to it.
          </p>
        </header>

        <div className="flex flex-col gap-8 text-[15px] leading-relaxed text-ink-muted">
          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              1. Who runs this
            </h2>
            <p>
              MarketFetch is built and operated by a two-person student team
              for a hackathon submission. There is no company behind it. For
              any privacy question or request, email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-brand-600 underline underline-offset-2 hover:text-brand-700"
              >
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              2. What we collect
            </h2>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-ink">Account data</strong> — if you
                create an account: email address, display name, and a
                password. Passwords are never stored in plain text; we store
                a salted scrypt hash and cannot recover your original
                password.
              </li>
              <li>
                <strong className="text-ink">Preferences (&quot;Buyer
                Memory&quot;)</strong> — brands, sizes, colors, and budgets
                you set yourself, or that the agent infers from your
                behavior.
              </li>
              <li>
                <strong className="text-ink">Activity</strong> — which
                listings you view, save, reject, or unsave, each tied to your
                account and timestamped. This is used to rank your feed and
                to compute a &quot;taste&quot; vector (a numeric summary of
                the kinds of listings you engage with, not reviewed by a
                human).
              </li>
              <li>
                <strong className="text-ink">Chat messages</strong> — text
                you send to the agent chat. Chat history is kept in your
                browser (localStorage), not in our database; clearing it in
                the app or clearing your browser storage deletes it. The
                message text is still sent to Amazon Bedrock to generate a
                reply (see §4).
              </li>
              <li>
                <strong className="text-ink">Nothing beyond that</strong> —
                we do not use ad trackers, analytics pixels, or
                fingerprinting scripts, and we do not collect payment
                information (MarketFetch does not process purchases).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              3. Browsing as a guest
            </h2>
            <p>
              You can use the feed, listing pages, and chat without an
              account. Guest activity (saves, rejects, preferences, chat) is
              not written to our database and does not persist past your
              browser session — there is nothing tied to you to delete.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              4. Who else sees your data
            </h2>
            <p className="mb-2">
              We don&apos;t sell data, and we don&apos;t share it for
              advertising. Your data passes through the infrastructure that
              runs the app:
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <strong className="text-ink">CockroachDB Cloud</strong>{" "}
                stores all account, preference, activity, and listing data.
              </li>
              <li>
                <strong className="text-ink">Amazon Bedrock (AWS)</strong>{" "}
                processes chat messages (Claude) and generates the numeric
                embeddings used for search and taste-matching (Titan). Amazon
                processes this text to return a response; it is not used by
                us or Amazon to build advertising profiles.
              </li>
              <li>
                <strong className="text-ink">Hosting (Vercel)</strong> serves
                the web app and runs its API routes.
              </li>
            </ul>
            <p className="mt-2">
              We do not send your account data to marketplaces (e.g. Reverb,
              Discogs) — those are only sources we pull public listing
              data from, not destinations we send your data to.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              5. Cookies
            </h2>
            <p>
              We set exactly one cookie, <code className="rounded bg-surface px-1 py-0.5 text-[13px]">marketfetch.session</code>,
              when you log in. It&apos;s an httpOnly, signed session token
              used only to keep you logged in for up to 30 days — no
              third-party or advertising cookies are set.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              6. How long we keep data
            </h2>
            <p>
              Account and activity data is kept until you ask us to delete
              it. We don&apos;t currently have a self-service &quot;delete my
              account&quot; button in the app — email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-brand-600 underline underline-offset-2 hover:text-brand-700"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and we&apos;ll delete your account, preferences, activity
              history, and taste data by hand. We&apos;ll respond within a
              reasonable time; as a two-person team this may take a few days
              rather than being instant.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              7. Your choices
            </h2>
            <ul className="ml-5 list-disc space-y-2">
              <li>Use the app as a guest to avoid creating any stored data.</li>
              <li>
                Remove individual preferences at any time from the{" "}
                <span className="text-ink">Buyer Memory</span> page.
              </li>
              <li>
                Clear your chat history from within the chat panel, or by
                clearing your browser&apos;s local storage for this site.
              </li>
              <li>
                Request a copy of, correction to, or deletion of your data by
                emailing us.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              8. Security
            </h2>
            <p>
              Passwords are hashed with scrypt (never stored or logged in
              plain text). Session cookies are httpOnly and, in production,
              sent only over HTTPS. Database credentials and API keys are
              held as server-side environment variables and are never
              exposed to the browser. As with any project, no system is
              perfectly secure, and we can&apos;t guarantee absolute security
              of information you provide.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              9. Children
            </h2>
            <p>
              MarketFetch is not directed at children, and we do not
              knowingly collect data from anyone under 13. If you believe a
              child has created an account, contact us and we&apos;ll delete
              it.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
              10. Changes to this policy
            </h2>
            <p>
              If what we collect or how we use it changes, we&apos;ll update
              this page and its effective date above.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
