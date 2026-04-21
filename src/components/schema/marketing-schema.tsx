const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Doctrinally.AI",
  url: "https://www.doctrinally.ai",
  logo: "https://www.doctrinally.ai/logo-light-mode.png",
  description:
    "AI-powered chat platform for churches. Turns sermons, devotions, and documents into an AI assistant that answers congregation questions with citations back to the source.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Austin",
    addressRegion: "TX",
    addressCountry: "US",
  },
  sameAs: [],
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Doctrinally.AI",
  url: "https://www.doctrinally.ai",
  description:
    "AI-powered chat platform for churches. Upload sermons and let your congregation find answers from Scripture and your own content.",
};

const softwareApplication = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Doctrinally.AI",
  url: "https://www.doctrinally.ai",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered chat platform for churches. Upload sermons, devotions, YouTube videos, and documents. Members ask questions and receive cited answers grounded in Scripture and your church's own teaching.",
  featureList: [
    "AI chat with citations",
    "Sermon and document upload",
    "YouTube video transcription",
    "Semantic and keyword search",
    "Analytics dashboard",
    "Role-based access control",
    "Custom domain support (Enterprise)",
    "Bible passage retrieval (BSB)",
  ],
  offers: [
    {
      "@type": "Offer",
      name: "Standard Plan",
      price: "49.00",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "49.00",
        priceCurrency: "USD",
        unitCode: "MON",
      },
      url: "https://www.doctrinally.ai/pricing",
    },
    {
      "@type": "Offer",
      name: "Enterprise Plan",
      price: "99.00",
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "99.00",
        priceCurrency: "USD",
        unitCode: "MON",
      },
      url: "https://www.doctrinally.ai/pricing",
    },
  ],
};

const faqPage = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do members need to create an account to use the chat?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Members can use the chat without logging in. If they create an account, their conversation history is saved so they can return to previous questions.",
      },
    },
    {
      "@type": "Question",
      name: "What types of content can I upload?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "YouTube videos, video files, PDF documents, Word documents, and rich text documents created in our built-in editor. YouTube videos are automatically transcribed.",
      },
    },
    {
      "@type": "Question",
      name: "How does the AI know what to cite?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every piece of content you upload is chunked and indexed. When a member asks a question, the AI retrieves the most relevant passages and cites them directly in its response.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use my own domain?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, with the Enterprise plan. Standard plan churches use a subdomain like mychurch.doctrinally.ai. Enterprise churches can use their own domain like ai.mychurch.com.",
      },
    },
    {
      "@type": "Question",
      name: "What happens if I exceed my monthly limits?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Document uploads are unlimited on both plans, so there is no upload overage. If you opt in to message overage, extra messages beyond your monthly limit are billed at $0.10 each on the Standard plan and $0.05 each on the Enterprise plan, capped at whatever limit you configure.",
      },
    },
    {
      "@type": "Question",
      name: "Is my church's data secure?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Each church's data is fully isolated. Members of one church cannot access another church's content, and all data is encrypted in transit and at rest.",
      },
    },
  ],
};

const schemas = [organization, website, softwareApplication, faqPage];

export function MarketingSchema() {
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
