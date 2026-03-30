import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  MessageSquare,
  Upload,
  BarChart3,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/[0.04] to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.08] via-transparent to-transparent" />
        <div className="container relative mx-auto flex flex-col items-center gap-8 px-4 py-28 text-center sm:py-36">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <BookOpen className="h-4 w-4 text-primary" />
            AI-powered answers for your church
          </div>
          <h1 className="max-w-3xl font-heading text-5xl tracking-tight sm:text-6xl lg:text-7xl">
            Scripture meets your church&apos;s teaching
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Give your congregation instant access to answers grounded in the
            Bible and your own sermons, devotions, and documents.
          </p>
          <div className="flex gap-3 pt-2">
            <Button size="lg" render={<Link href="/sign-up" />}>
              Start free trial
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="#features" />}
            >
              See how it works
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">
            Features
          </p>
          <h2 className="mt-3 font-heading text-3xl sm:text-4xl">
            Everything your church needs
          </h2>
          <p className="mt-4 text-muted-foreground">
            Upload your content, let AI index it, and watch your congregation
            find answers instantly.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: MessageSquare,
              title: "AI Chat",
              description:
                "Members ask questions and receive answers cited from your church's own content and the Bible.",
            },
            {
              icon: Upload,
              title: "Document Management",
              description:
                "Upload sermons, devotions, PDFs, and YouTube videos. Everything is indexed automatically.",
            },
            {
              icon: BarChart3,
              title: "Analytics",
              description:
                "See what your congregation asks about most and where more content is needed.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-heading text-xl">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-gradient-to-b from-primary/[0.04] to-background">
        <div className="container mx-auto flex flex-col items-center gap-6 px-4 py-24 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Set up your church in minutes. Upload your first sermon and let your
            congregation start asking questions today.
          </p>
          <Button size="lg" render={<Link href="/sign-up" />}>
            Create your church
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
