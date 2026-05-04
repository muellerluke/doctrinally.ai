import type { LucideIcon } from "lucide-react";
import {
  Upload,
  BookOpen,
  Video,
  BarChart3,
  Globe,
  Sparkles,
  MessageSquare,
  Rss,
  MousePointerClick,
  UserPlus,
  Moon,
  ShieldCheck,
} from "lucide-react";

// ─── Hero ──────────────────────────────────────────────────────────

export const heroStats = [
  { value: "< 5 min", label: "To install on your site" },
  { value: "24/7", label: "Capturing prospects" },
  { value: "100%", label: "Your church's voice" },
];

// ─── Features ──────────────────────────────────────────────────────

export interface BentoFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  span: string;
  accent?: boolean;
}

export const bentoFeatures: BentoFeature[] = [
  {
    icon: Upload,
    title: "Teach your AI everything your church has taught",
    description:
      "Paste a YouTube sermon link, upload a video or PDF, or write new devotions in our built-in editor. Your AI starts learning from your teaching the moment you add it.",
    span: "lg:col-span-4 lg:row-span-2",
    accent: true,
  },
  {
    icon: Rss,
    title: "Your whole YouTube channel, synced overnight",
    description:
      "Paste your channel once. Every sermon, short, live replay, and playlist lands in the right folder — and stays fresh every week.",
    span: "lg:col-span-2 lg:row-span-1",
  },
  {
    icon: BookOpen,
    title: "Trained on your pastor, not the internet",
    description:
      "Answers come from your own sermons — not a generic model guessing at theology.",
    span: "lg:col-span-2 lg:row-span-1",
  },
  {
    icon: Video,
    title: "Citations that play",
    description:
      "Sermons embed inline. Videos jump to the moment. PDFs link to the page.",
    span: "lg:col-span-2 lg:row-span-1",
  },
  {
    icon: BarChart3,
    title: "See what your church is really asking",
    description:
      "Analytics show trending questions, ones the AI couldn't answer, and where your teaching has gaps.",
    span: "lg:col-span-3 lg:row-span-1",
  },
  {
    icon: Globe,
    title: "Share your AI with a QR code",
    description:
      "Drop it on Sunday's bulletin. Members scan and ask — no login required.",
    span: "lg:col-span-3 lg:row-span-1",
  },
];

// ─── Before / After ────────────────────────────────────────────────

export const beforeAfter = {
  before: [
    "Members ask ChatGPT questions you should be answering",
    "Visitors Google your doctrine and get answers no one at your church wrote",
    "New believers get discipled by whatever AI happens to be loudest",
    "Your church has no voice in the conversations your members are already having",
  ],
  after: [
    "Your church has its own AI, grounded in your pastor's teaching",
    "Members ask anything and hear your voice back, with citations to the source",
    "Visitors explore what YOUR church actually believes — not a stranger's take",
    "The AI your congregation is already using is finally the one you built",
  ],
};

// ─── How It Works ──────────────────────────────────────────────────

export interface HowItWorksStep {
  step: string;
  icon: LucideIcon;
  title: string;
  body: string;
}

export const howItWorksSteps: HowItWorksStep[] = [
  {
    step: "01",
    icon: Upload,
    title: "Teach your AI what your church believes",
    body: "Paste YouTube sermon links, drop in videos and PDFs, or write new devotions directly in our built-in editor.",
  },
  {
    step: "02",
    icon: MousePointerClick,
    title: "Drop Website Chat on your church site",
    body: "Paste one <script> tag we generate at signup. Your AI engages visitors in your church's voice, and warm leads land in your Prospects dashboard automatically.",
  },
  {
    step: "03",
    icon: MessageSquare,
    title: "Share Member AI with a QR code",
    body: "Members scan a QR code or visit your church's chat hub and ask anything. Cited answers, 24/7, no login required.",
  },
];

// ─── Testimonials ──────────────────────────────────────────────────

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  church: string;
  initial: string;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "Our congregation loves being able to ask questions and hear answers drawn directly from what we've actually taught from the pulpit. It's like giving every member a private appointment with the teaching team — any time, day or night.",
    name: "Zach Neumann",
    role: "Vicar",
    church: "Messiah Lutheran Church, Johns Creek",
    initial: "Z",
  },
  {
    quote:
      "Doctrinally.AI has quickly become part of how we disciple our people. Members are exploring sermons they missed, and visitors are getting a real sense of what we believe before they ever walk in the door. It's been a genuine gift to our church.",
    name: "Kostia Skorenkyi",
    role: "Pastor",
    church: "North Cross Church",
    initial: "K",
  },
];

// ─── Two-product framing (shared library, two surfaces) ───────────

export interface ProductCard {
  icon: LucideIcon;
  kicker: string;
  title: string;
  description: string;
  href: string;
  accent?: "primary" | "gold";
}

export const productSuite: ProductCard[] = [
  {
    icon: MousePointerClick,
    kicker: "Flagship · On your website",
    title: "Website Chat",
    description:
      "A chat widget that lives on your own church website. Engages visitors at the right moment, answers questions in your voice, and drops their name and email into your Prospects dashboard — while you sleep.",
    href: "/features/embedded-chat",
    accent: "gold",
  },
  {
    icon: MessageSquare,
    kicker: "Also included · For members",
    title: "Member AI",
    description:
      "Same content library, your own chat hub. Lives on your doctrinally.ai subdomain or your own custom domain — so members ask anything, anywhere, and hear your church back.",
    href: "/features#member-ai",
    accent: "primary",
  },
];

// ─── Shared product feature bullets (used by Member AI + Embedded) ─

export interface ProductFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const memberAiFeatures: ProductFeature[] = [
  {
    icon: BookOpen,
    title: "Trained on your teaching",
    description:
      "Answers come from your own sermons, devotions, and documents — not a generic model guessing at theology.",
  },
  {
    icon: Video,
    title: "Citations that play",
    description:
      "Sermons embed inline, videos jump to the moment, PDFs link to the page. Members always see the source.",
  },
  {
    icon: Globe,
    title: "QR code, no login",
    description:
      "Drop the QR code on Sunday's bulletin. Members scan and ask — without needing an account.",
  },
];

// ─── Embedded AI feature bullets ──────────────────────────────────

export const embeddedChatFeatures: ProductFeature[] = [
  {
    icon: Moon,
    title: "Never miss a visitor",
    description:
      "Your website doesn't sleep — now your AI doesn't either. Every visitor gets a chance to be heard, no matter the hour.",
  },
  {
    icon: MousePointerClick,
    title: "Starts the conversation",
    description:
      "Your AI opens with a thoughtful, tailored question — not a generic 'Can I help?' One chance, no pestering.",
  },
  {
    icon: UserPlus,
    title: "Captures prospects",
    description:
      "Real conversations naturally lead to a name and email — and the lead lands in your Prospects dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Cryptographically yours",
    description:
      "Origin-locked to your domain. Other sites can't embed your widget, and spam is rate-limited at the edge and in Postgres.",
  },
];

export const embeddedChatTestimonial = {
  quote:
    "We were losing visitors the moment they hit our website. Now the widget engages them, answers their actual question, and drops their email in our inbox. It's paid for itself every month.",
  name: "Sarah Whitfield",
  role: "Communications Director",
  church: "Grace Community Church",
  initial: "S",
};

// ─── Pricing ───────────────────────────────────────────────────────

export const standardFeatures = [
  "Website Chat — capture visitors as they read, 24/7",
  "Your own doctrinally.ai subdomain",
  "Unlimited document uploads",
  "1,500 member questions / month",
  "Analytics dashboard",
  "Unlimited members",
  "Email support",
];

export const enterpriseFeatures = [
  "Everything in Standard, plus:",
  "Auto-sync your entire YouTube channel — sermons, shorts, live replays, and playlists ingested every week",
  "Use your own custom domain",
  "Your church's logo and branding",
  "3,000 member questions / month",
  "Priority support & onboarding",
];

// ─── FAQs ──────────────────────────────────────────────────────────

export interface FAQ {
  question: string;
  answer: string;
}

export const faqs: FAQ[] = [
  {
    question: "How do I install the Website Chat widget on my site?",
    answer:
      "Paste a single <script> tag your church's web admin can drop in anywhere — Wix, Squarespace, WordPress, or hand-rolled HTML. We generate a unique key for your church automatically the moment you sign up, so installation is one copy-paste away from live.",
  },
  {
    question: "What does Website Chat capture?",
    answer:
      "Visitors who engage in conversation are gently asked for their name and email. Their full transcript lands in your Prospects dashboard so you can see what they were asking about, follow up by email, and export the whole list as CSV. No CRM integration required.",
  },
  {
    question: "Is Website Chat available on the Standard plan?",
    answer:
      "Yes. Website Chat is included on every plan — Standard and Enterprise both ship with the widget enabled and a unique embed key generated for you at signup. It's our flagship feature: the first AI surface most of your visitors will ever touch.",
  },
  {
    question: "Do I need technical skills to set this up?",
    answer:
      "No. If you can paste a YouTube link and drag a PDF, you can set up Doctrinally.AI. Most churches are fully live in under 5 minutes — our onboarding walks you through each step and we'll help over email if you get stuck.",
  },
  {
    question: "Do members need an account to use the chat?",
    answer:
      "Never. Members just scan the QR code or visit your link and start asking questions. Accounts are optional — they only enable saved chat history for members who want it.",
  },
  {
    question: "What types of content can I upload?",
    answer:
      "YouTube sermon videos (as links), video files, PDF documents, Word documents, and rich text documents created in our built-in editor. Enterprise churches can also auto-sync their entire YouTube channel, and we'll keep pulling in new uploads every week.",
  },
  {
    question: "How does YouTube auto-sync work?",
    answer:
      "Paste your channel URL once. Doctrinally.AI pulls every existing sermon, short, live replay, and playlist into your library and files them into auto-generated folders. Every week at a time you choose, it checks for new uploads and imports them automatically. We never re-import a video you already have. Auto-sync is included on the Enterprise plan.",
  },
  {
    question: "How is this different from ChatGPT?",
    answer:
      "ChatGPT answers from the open internet. Doctrinally.AI gives your church its own private AI, trained only on the sermons, devotions, and documents you upload. Every answer is grounded in what YOUR pastors have actually taught, and every quote is cited back to the source. Your doctrine, your voice — not a stranger's guess at theology.",
  },
  {
    question: "What happens if I go over my monthly limits?",
    answer:
      "Document uploads are unlimited on both plans, so the only limit that matters is monthly member messages. By default, message limits are hard-enforced — members simply see a friendly notice when the limit is reached, and your church is never charged extra. If you want to allow additional messages, you can opt in to overage from your billing settings and set a maximum cap so you always stay in control. Extra messages are $0.10 each on Standard and $0.05 each on Enterprise, capped at whatever limit you choose. No surprises, ever.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. There's no long-term contract. Cancel with one click from the billing page and you won't be charged again. You can also export your content at any time.",
  },
  {
    question: "Is my church's data private?",
    answer:
      "Yes. Every church's content is fully isolated — members of one church cannot access another church's data. All content is encrypted in transit and at rest.",
  },
  {
    question: "Can I use my own domain?",
    answer:
      "Yes, on the Enterprise plan. Standard churches use a subdomain like yourchurch.doctrinally.ai; Enterprise churches can use ai.yourchurch.com with full custom branding.",
  },
];
