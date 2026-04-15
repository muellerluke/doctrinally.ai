import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, Clock, Quote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { blogPosts, getAllSlugs, getPost } from "@/content/blog/posts";

type Params = { slug: string };

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — Doctrinally.AI`,
    description: post.description,
    alternates: { canonical: `https://www.doctrinally.ai/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  };
}

const categoryStyles: Record<string, string> = {
  "Cultural Questions": "border-primary/30 bg-primary/[0.08] text-primary",
  "Scripture & Theology": "border-gold/30 bg-gold/[0.08] text-gold",
  Platform: "border-foreground/20 bg-foreground/[0.05] text-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = blogPosts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => {
      // Prefer same-category related posts first
      if (a.category === post.category && b.category !== post.category)
        return -1;
      if (b.category === post.category && a.category !== post.category)
        return 1;
      return b.publishedAt.localeCompare(a.publishedAt);
    })
    .slice(0, 3);

  return (
    <article className="flex flex-col">
      {/* Header */}
      <header className="parchment-texture relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,_var(--tw-gradient-stops))] from-gold/[0.06] via-transparent to-transparent" />
        <div className="container relative mx-auto max-w-3xl px-4 py-20 sm:py-28">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </Link>
          <div className="mt-8 flex items-center gap-3">
            <span
              className={`rounded-full border px-3 py-0.5 text-xs font-medium ${
                categoryStyles[post.category]
              }`}
            >
              {post.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {post.readMinutes} min read
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(post.publishedAt)}
            </span>
          </div>
          <h1 className="mt-6 font-heading text-4xl leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.75rem]">
            {post.title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {post.description}
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            By{" "}
            <span className="font-medium text-foreground">{post.author}</span>
          </p>
        </div>
      </header>

      {/* Body */}
      <section className="container mx-auto max-w-3xl px-4 py-16">
        <div className="space-y-10">
          {post.sections.map((section, i) => (
            <div key={i} className="space-y-5">
              {section.heading ? (
                <h2 className="font-heading text-2xl tracking-tight sm:text-3xl">
                  {section.heading}
                </h2>
              ) : null}
              {section.paragraphs.map((p, j) => (
                <p
                  key={j}
                  className="text-[1.05rem] leading-[1.8] text-muted-foreground"
                >
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>

        {/* Church relevance callout */}
        <aside className="mt-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-gold/[0.04] to-transparent p-8 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Quote className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-xl tracking-tight sm:text-2xl">
                {post.churchRelevance.title}
              </h3>
              <p className="mt-3 text-[0.98rem] leading-relaxed text-muted-foreground">
                {post.churchRelevance.body}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button render={<Link href="/sign-up" />}>
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  render={<Link href="/how-it-works" />}
                >
                  See how it works
                </Button>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* Related posts */}
      {related.length > 0 ? (
        <section className="border-t bg-secondary/30 py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-10">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
                Keep reading
              </p>
              <h2 className="mt-3 font-heading text-3xl tracking-tight sm:text-4xl">
                Related articles
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.06]"
                >
                  <span
                    className={`inline-flex w-fit rounded-full border px-3 py-0.5 text-xs font-medium ${
                      categoryStyles[p.category]
                    }`}
                  >
                    {p.category}
                  </span>
                  <h3 className="mt-4 font-heading text-lg leading-snug tracking-tight">
                    {p.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {p.excerpt}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
                    Read article
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
