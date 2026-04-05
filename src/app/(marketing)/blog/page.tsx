import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { blogPosts } from "@/content/blog/posts";

export const metadata: Metadata = {
  title: "Blog — Honest answers to the questions your church is asking",
  description:
    "Neutral, thoroughly argued takes on the cultural and theological questions Christians are wrestling with today — and how your church can be part of the answer.",
  alternates: { canonical: "https://www.doctrinally.ai/blog" },
};

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

export default function BlogIndexPage() {
  const sorted = [...blogPosts].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  const [featured, ...rest] = sorted;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="parchment-texture relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_var(--tw-gradient-stops))] from-gold/[0.08] via-transparent to-transparent" />
        <div className="container relative mx-auto max-w-4xl px-4 py-24 text-center sm:py-32">
          <Badge
            variant="outline"
            className="border-gold/30 bg-gold/[0.08] px-4 py-1.5 text-sm font-normal text-gold"
          >
            The Doctrinally Blog
          </Badge>
          <h1 className="mt-8 font-heading text-5xl leading-[1.08] tracking-tight sm:text-6xl">
            Hard questions.
            <span className="block text-primary">Honest answers.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Your members are already asking these questions somewhere. These are
            careful, neutral walkthroughs of what faithful Christians actually
            believe — and why your church&apos;s voice belongs in the answer.
          </p>
        </div>
      </section>

      {/* Featured post */}
      <section className="container mx-auto max-w-6xl px-4 py-20">
        <Link
          href={`/blog/${featured.slug}`}
          className="group relative block overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.06]"
        >
          <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
            <div className="relative hidden bg-gradient-to-br from-primary/[0.15] via-gold/[0.08] to-transparent lg:block">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center p-12">
                <svg
                  width="220"
                  height="220"
                  viewBox="0 0 600 600"
                  fill="none"
                  className="opacity-[0.12] text-primary"
                >
                  <rect
                    x="260"
                    y="40"
                    width="80"
                    height="520"
                    rx="8"
                    fill="currentColor"
                  />
                  <rect
                    x="120"
                    y="160"
                    width="360"
                    height="80"
                    rx="8"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <div className="absolute bottom-8 left-8">
                <p className="font-heading text-sm uppercase tracking-[0.2em] text-gold">
                  Featured
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center p-8 sm:p-12">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-medium ${
                    categoryStyles[featured.category]
                  }`}
                >
                  {featured.category}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {featured.readMinutes} min read
                </span>
              </div>
              <h2 className="mt-5 font-heading text-3xl leading-tight tracking-tight sm:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {featured.excerpt}
              </p>
              <div className="mt-8 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(featured.publishedAt)}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  Read article
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* Rest of posts */}
      <section className="container mx-auto max-w-6xl px-4 pb-28">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              More articles
            </p>
            <h2 className="mt-3 font-heading text-3xl tracking-tight sm:text-4xl">
              Keep reading
            </h2>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.06]"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-medium ${
                    categoryStyles[post.category]
                  }`}
                >
                  {post.category}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {post.readMinutes} min
                </span>
              </div>
              <h3 className="mt-4 font-heading text-xl leading-snug tracking-tight">
                {post.title}
              </h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {post.excerpt}
              </p>
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <span className="text-xs text-muted-foreground">
                  {formatDate(post.publishedAt)}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
