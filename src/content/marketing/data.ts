import type { LucideIcon } from "lucide-react";
import {
  Upload,
  BookOpen,
  Video,
  BarChart3,
  Globe,
  Sparkles,
  MessageSquare,
} from "lucide-react";

// ─── Hero ──────────────────────────────────────────────────────────

export const heroStats = [
  { value: "< 5 min", label: "To launch your AI" },
  { value: "24/7", label: "For every member" },
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
    icon: Sparkles,
    title: "Your AI learns your voice",
    body: "Your pastor's teaching becomes the foundation for every answer — ready for any question your congregation can ask.",
  },
  {
    step: "03",
    icon: MessageSquare,
    title: "Share it with a QR code",
    body: "Members scan, ask your church's AI anything, and get cited answers 24/7 — no login required.",
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

// ─── Pricing ───────────────────────────────────────────────────────

export const standardFeatures = [
  "Your own doctrinally.ai subdomain",
  "Unlimited document uploads",
  "1,000 member questions / month",
  "Analytics dashboard",
  "Unlimited members",
  "Email support",
];

export const enterpriseFeatures = [
  "Everything in Standard, plus:",
  "Use your own custom domain",
  "Your church's logo and branding",
  "2,000 member questions / month",
  "Priority support & onboarding",
];

// ─── FAQs ──────────────────────────────────────────────────────────

export interface FAQ {
  question: string;
  answer: string;
}

export const faqs: FAQ[] = [
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
      "YouTube sermon videos (as links), video files, PDF documents, Word documents, and rich text documents created in our built-in editor. YouTube playlist uploads are coming soon — for now, just add videos one at a time.",
  },
  {
    question: "How is this different from ChatGPT?",
    answer:
      "ChatGPT answers from the open internet. Doctrinally.AI gives your church its own private AI, trained only on the sermons, devotions, and documents you upload. Every answer is grounded in what YOUR pastors have actually taught, and every quote is cited back to the source. Your doctrine, your voice — not a stranger's guess at theology.",
  },
  {
    question: "What happens if I go over my monthly limits?",
    answer:
      "By default, message limits are hard-enforced — members simply see a friendly notice when the limit is reached, and your church is never charged extra. If you want to allow additional messages, you can opt in to overage from your billing settings and set a maximum cap so you always stay in control. Extra messages are $0.25 each, capped at whatever limit you choose. No surprises, ever.",
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
