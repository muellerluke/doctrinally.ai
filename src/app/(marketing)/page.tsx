import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ContactForm } from "@/components/marketing/contact-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Upload,
  BarChart3,
  ArrowRight,
  Search,
  Zap,
  Shield,
  Globe,
  Palette,
  FileText,
  Check,
  ChevronDown,
  Mail,
  MapPin,
  Quote,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload your content",
    description:
      "Add sermons, devotions, YouTube videos, PDFs, and documents. Create new content directly in the editor.",
  },
  {
    number: "02",
    icon: Zap,
    title: "AI indexes everything",
    description:
      "Our system transcribes, chunks, and indexes your content automatically. Bible passages are included by default.",
  },
  {
    number: "03",
    icon: MessageSquare,
    title: "Your congregation asks questions",
    description:
      "Share a simple link or QR code. Members get instant, cited answers grounded in your teaching and Scripture.",
  },
];

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat",
    description:
      "Members ask questions and receive answers cited directly from your church's own content and the Bible.",
  },
  {
    icon: Upload,
    title: "Document Management",
    description:
      "Upload sermons, devotions, PDFs, and YouTube videos. Everything is indexed automatically for retrieval.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "See what your congregation asks about most often and identify where more content is needed.",
  },
  {
    icon: Search,
    title: "Smart Retrieval",
    description:
      "Combines keyword and semantic search to find the most relevant passages across all your church's content.",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description:
      "Owner, admin, and member roles keep your church's administration organized and secure.",
  },
  {
    icon: FileText,
    title: "Rich Text Editor",
    description:
      "Create new documents, devotions, and study guides directly in the app with our built-in editor.",
  },
];

const standardFeatures = [
  "Subdomain on doctrinally.ai",
  "Up to 25 document uploads / month",
  "500 messages / month",
  "Doctrinally.AI branding",
  "Analytics dashboard",
  "Email support",
];

const enterpriseFeatures = [
  "Custom domain (ai.yourchurch.com)",
  "Up to 100 document uploads / month",
  "2,000 messages / month",
  "Your own logo and branding",
  "Analytics dashboard",
  "Priority support",
];

const testimonials = [
  {
    quote:
      "Our congregation loves being able to look up what Pastor James said about a topic months ago. It's like having a searchable memory of every sermon.",
    name: "Sarah Mitchell",
    role: "Church Administrator",
    church: "Grace Community Church",
  },
  {
    quote:
      "We put a QR code in our bulletin every Sunday. New visitors use it during the service to explore topics in real time.",
    name: "David Chen",
    role: "Lead Pastor",
    church: "New Life Fellowship",
  },
  {
    quote:
      "The setup took less than an hour. We uploaded our YouTube playlist and the AI had everything indexed by the next morning.",
    name: "Maria Gonzalez",
    role: "Worship Director",
    church: "Iglesia de la Esperanza",
  },
];

const faqs = [
  {
    question: "Do members need to create an account to use the chat?",
    answer:
      "No. Members can use the chat without logging in. If they create an account, their conversation history is saved so they can return to previous questions.",
  },
  {
    question: "What types of content can I upload?",
    answer:
      "YouTube videos, video files, PDF documents, Word documents, and rich text documents created in our built-in editor. YouTube videos are automatically transcribed.",
  },
  {
    question: "How does the AI know what to cite?",
    answer:
      "Every piece of content you upload is chunked and indexed. When a member asks a question, the AI retrieves the most relevant passages and cites them directly in its response.",
  },
  {
    question: "Can I use my own domain?",
    answer:
      "Yes, with the Enterprise plan. Standard plan churches use a subdomain like mychurch.doctrinally.ai. Enterprise churches can use their own domain like ai.mychurch.com.",
  },
  {
    question: "What happens if I exceed my monthly limits?",
    answer:
      "You can continue using the platform. Overages are billed at $0.25 per additional document upload and $0.25 per additional message.",
  },
  {
    question: "Is my church's data secure?",
    answer:
      "Yes. Each church's data is fully isolated. Members of one church cannot access another church's content, and all data is encrypted in transit and at rest.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="parchment-texture relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.07] via-primary/[0.02] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,_var(--tw-gradient-stops))] from-gold/[0.08] via-transparent to-transparent" />
        {/* Decorative cross motif */}
        <div className="absolute left-1/2 top-12 -translate-x-1/2 opacity-[0.03]">
          <svg
            width="600"
            height="600"
            viewBox="0 0 600 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="260" y="40" width="80" height="520" rx="8" fill="currentColor" />
            <rect x="120" y="160" width="360" height="80" rx="8" fill="currentColor" />
          </svg>
        </div>
        <div className="container relative mx-auto flex flex-col items-center gap-10 px-4 py-32 text-center sm:py-44">
          <div className="animate-fade-up stagger-1">
            <Badge
              variant="outline"
              className="border-gold/30 bg-gold/[0.08] px-4 py-1.5 text-sm font-normal text-gold"
            >
              <img src="/logo-transparent-bg.png" alt="" className="mr-1.5 h-3.5 w-3.5 rounded-sm" />
              For churches that teach deeply
            </Badge>
          </div>
          <div className="animate-fade-up stagger-2 max-w-4xl space-y-4">
            <h1 className="font-heading text-5xl leading-[1.08] tracking-tight sm:text-6xl lg:text-[5rem]">
              Your sermons, searchable.
            </h1>
            <h1 className="font-heading text-5xl leading-[1.08] tracking-tight text-primary sm:text-6xl lg:text-[5rem]">
              Your Scripture, cited.
            </h1>
          </div>
          <p className="animate-fade-up stagger-3 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Doctrinally.AI turns your church&apos;s sermons, devotions, and
            documents into an AI assistant that answers your congregation&apos;s
            questions — with citations back to the source.
          </p>
          <div className="animate-fade-up stagger-4 flex flex-col gap-4 pt-2 sm:flex-row">
            <Button size="lg" render={<Link href="/sign-up" />}>
              Start free trial
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="#how-it-works" />}
            >
              See how it works
            </Button>
          </div>
          <div className="animate-fade-in stagger-5 mt-4 flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-gold" />
              Free trial
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-gold" />
              Setup in minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-gold" />
              No credit card required
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b bg-card">
        <div className="container mx-auto px-4 py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              How it works
            </p>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
              Three steps to smarter ministry
            </h2>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-12 lg:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <span className="mb-2 block font-heading text-sm text-gold">
                  Step {step.number}
                </span>
                <h3 className="mb-3 font-heading text-xl">{step.title}</h3>
                <p className="text-[0.95rem] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Features
          </p>
          <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
            Everything your church needs
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Upload your content, let AI index it, and watch your congregation
            find answers instantly.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border bg-card p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.06]"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-heading text-lg">{feature.title}</h3>
              <p className="text-[0.9rem] leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="parchment-texture relative border-y bg-gradient-to-b from-primary/[0.03] to-background"
      >
        <div className="container relative mx-auto px-4 py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              Pricing
            </p>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Start with Standard. Upgrade to Enterprise when you need custom
              branding and higher limits.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 lg:grid-cols-2">
            {/* Standard */}
            <Card className="relative shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="font-heading text-2xl">
                  Standard
                </CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-4xl">$49</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {standardFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  variant="outline"
                  render={<Link href="/sign-up" />}
                >
                  Get started
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card className="relative overflow-visible border-gold/30 shadow-lg shadow-gold/[0.06]">
              <div className="absolute -top-3 right-6">
                <Badge className="border-gold/30 bg-gold px-3 py-1 text-xs font-semibold text-gold-foreground">
                  Most popular
                </Badge>
              </div>
              <CardHeader className="pb-4">
                <CardTitle className="font-heading text-2xl">
                  Enterprise
                </CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-4xl">$99</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {enterpriseFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  render={<Link href="/sign-up" />}
                >
                  Get started
                </Button>
              </CardContent>
            </Card>
          </div>
          <p className="mx-auto mt-8 max-w-md text-center text-sm text-muted-foreground">
            Need more? Overages are billed at $0.25 per extra document upload
            and $0.25 per extra message.
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="container mx-auto px-4 py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Testimonials
          </p>
          <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
            Trusted by churches
          </h2>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card
              key={t.name}
              className="relative shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardContent className="pt-8">
                <Quote className="mb-4 h-6 w-6 text-gold/50" />
                <p className="mb-6 text-[0.95rem] italic leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="font-heading text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role}, {t.church}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t bg-card">
        <div className="container mx-auto px-4 py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
              FAQ
            </p>
            <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
              Common questions
            </h2>
          </div>
          <div className="mx-auto mt-16 max-w-3xl divide-y">
            {faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer items-center justify-between text-[0.95rem] font-medium">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-3 pr-8 text-[0.9rem] leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="container mx-auto px-4 py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Contact
          </p>
          <h2 className="mt-4 font-heading text-3xl sm:text-4xl">
            Get in touch
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Have questions? We&apos;d love to hear from you.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-lg">
          <ContactForm />
          <div className="mt-6 flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span>hello@doctrinally.ai</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Austin, TX</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="parchment-texture relative border-t bg-gradient-to-b from-primary/[0.05] to-background">
        <div className="container relative mx-auto flex flex-col items-center gap-6 px-4 py-28 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl">
            Ready to get started?
          </h2>
          <p className="max-w-xl text-lg text-muted-foreground">
            Set up your church in minutes. Upload your first sermon and let your
            congregation start asking questions today.
          </p>
          <Button size="lg" render={<Link href="/sign-up" />}>
            Create your church
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
