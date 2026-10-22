import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import styles from "./explore.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Explore",
  description: "Discover public questions shared with intention. Read a thread or add your perspective on UnsaidBox.",
};
const pageSize = 12;
type SearchParams = Record<string, string | string[] | undefined>;

export default async function Explore({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 200) : "";
  const openOnly = params.status === "open";
  const requestedPage = typeof params.page === "string" && /^\d{1,6}$/.test(params.page)
    ? Math.max(1, Number(params.page)) : 1;
  const where = {
    linkActive: true,
    publicVisible: true,
    discoverable: true,
    discoveryApproved: true,
    account: { status: "ACTIVE" as const, publicPageEnabled: true },
    ...(openOnly ? { acceptingResponses: true } : {}),
    ...(search ? { OR: [
      { body: { contains: search } },
      { account: { username: { contains: search.replace(/^@/, "") } } },
    ] } : {}),
  };
  const total = await db().question.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pages);
  const questions = await db().question.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      body: true,
      acceptingResponses: true,
      account: { select: { username: true } },
    },
  });
  function browseUrl(status: boolean, targetPage = 1) {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (status) query.set("status", "open");
    if (targetPage > 1) query.set("page", String(targetPage));
    return `/explore${query.size ? `?${query}` : ""}`;
  }
  const filtered = Boolean(search || openOnly);

  return (
    <SiteShell>
      <div className={`wrap ${styles.page}`}>
        <header className={styles.hero}>
          <div>
            <p className="eyebrow">A WINDOW INTO THE UNSAID</p>
            <h1>Good questions.<br /><span className="serif accent">Honest perspectives.</span></h1>
            <p className={styles.intro}>A little curiosity can open a conversation. Discover public threads, read what’s been shared, or add a perspective of your own.</p>
          </div>
          <aside className={styles.promise} aria-label="How discovery works">
            <span className={styles.icon}><Icon name="shield" /></span>
            <h2>Shared with intention.</h2>
            <p>Every thread here is opted in by its owner and reviewed for discovery. Private inboxes stay private.</p>
            <Link className="text-link" href="/safety">How privacy works <span aria-hidden="true">↗</span></Link>
          </aside>
        </header>

        <section className={styles.browse} aria-labelledby="explore-heading">
          <div className={styles.heading}>
            <div><p className="eyebrow">FIND YOUR NEXT CONVERSATION</p><h2 id="explore-heading">Explore threads</h2></div>
            <p>Thoughtful questions. Room for your voice.</p>
          </div>
          <div className={styles.toolbar}>
            <nav className={styles.filters} aria-label="Filter threads">
              <Link href={browseUrl(false)} aria-current={!openOnly ? "page" : undefined}>All threads</Link>
              <Link href={browseUrl(true)} aria-current={openOnly ? "page" : undefined}>Open for answers</Link>
            </nav>
            <form action="/explore" method="get" role="search" className={styles.search}>
              {openOnly && <input type="hidden" name="status" value="open" />}
              <label htmlFor="thread-search" className={styles.srOnly}>Search questions or usernames</label>
              <input key={search} id="thread-search" type="search" name="q" defaultValue={search} maxLength={200} placeholder="Search questions or @username" />
              <button type="submit" className="button secondary">Search</button>
            </form>
          </div>
          <div className={styles.results}>
            <p>{total} {total === 1 ? "thread" : "threads"}{search ? <> matching <span>“{search}”</span></> : " to explore"}</p>
            {filtered ? <Link className="text-link" href="/explore">Clear filters</Link> : <span>Newest first</span>}
          </div>

          {questions.length > 0 ? (
            <div className={styles.grid}>
              {questions.map((q) => (
                <article key={q.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <Link className={styles.owner} href={`/u/${q.account.username}`}><span className={styles.avatar} aria-hidden="true">{q.account.username.charAt(0).toUpperCase()}</span><span>@{q.account.username}</span></Link>
                    <span className={`${styles.status} ${q.acceptingResponses ? styles.open : ""}`}>{q.acceptingResponses ? "Open for answers" : "Answers closed"}</span>
                  </div>
                  <h3><Link href={`/q/${q.id}`}>{q.body}</Link></h3>
                  <Link className={styles.cardLink} href={`/q/${q.id}`}>Explore thread <Icon name="arrow" /></Link>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <span className={styles.icon}><Icon name={filtered ? "question" : "globe"} /></span>
              <h3>{filtered ? "No threads found just yet." : "A little quiet. Full of possibility."}</h3>
              <p>{filtered ? "Try another question or username, or browse all public threads." : "Public conversations will appear here as owners opt in and threads are approved for discovery. In the meantime, make room for honest words in your own box."}</p>
              <Link className="button" href={filtered ? "/explore" : "/start"}>{filtered ? "Browse all threads" : "Create your box"}<Icon name="arrow" /></Link>
            </div>
          )}
          {pages > 1 && <nav className={styles.pagination} aria-label="Thread pages">
            {page > 1 ? <Link className="button secondary" href={browseUrl(openOnly, page - 1)}>Previous</Link> : <span />}
            <span>Page {page} of {pages}</span>
            {page < pages ? <Link className="button secondary" href={browseUrl(openOnly, page + 1)}>Next <span aria-hidden="true">→</span></Link> : <span />}
          </nav>}
        </section>
        <aside className={styles.invitation}>
          <div><h2>What’s on their mind?</h2><p>Create your box and give people a place to tell you.</p></div>
          <Link className="button secondary" href="/start">Create your box <Icon name="arrow" /></Link>
        </aside>
      </div>
    </SiteShell>
  );
}
