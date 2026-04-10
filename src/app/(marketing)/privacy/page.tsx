import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Doctrinally.AI",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-heading text-4xl tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: April 10, 2026
      </p>

      <div className="prose mt-10 max-w-none text-foreground prose-headings:font-heading prose-headings:tracking-tight prose-h2:mt-10 prose-h2:text-2xl prose-h3:mt-6 prose-h3:text-lg prose-p:leading-7 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
        <h2>1. Introduction</h2>
        <p>
          Doctrinally.AI (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
          operates an AI-powered chat platform for churches. This Privacy Policy
          describes how we collect, use, and protect information when you use our
          website, services, and applications (collectively, the
          &quot;Service&quot;).
        </p>

        <h2>2. Information We Collect</h2>

        <h3>Account Information</h3>
        <p>
          When you create an account, we collect your name, email address, and
          password. Church administrators also provide church name, address,
          phone number, and logo.
        </p>

        <h3>Chat Data</h3>
        <p>
          When members use the AI chat, we process the messages they send and
          the responses generated. For authenticated users, chat history is
          stored to enable conversation continuity. Guest users&apos; messages
          are processed but not permanently stored.
        </p>

        <h3>Uploaded Content</h3>
        <p>
          Church administrators may upload documents, videos, and other content
          to be indexed for AI retrieval. This content is stored securely and
          used solely to power the church&apos;s AI chat experience.
        </p>

        <h3>Usage Data</h3>
        <p>
          We collect anonymized usage metrics including message counts, document
          upload counts, and visitor counts for analytics and billing purposes.
          We use cookies to track unique visitors on a per-church basis.
        </p>

        <h3>Payment Information</h3>
        <p>
          Payment processing is handled by Stripe. We do not store credit card
          numbers or sensitive payment details on our servers. Stripe&apos;s
          privacy policy governs the handling of your payment information.
        </p>

        <h3>Checkout and Signup Information</h3>
        <p>
          When you begin a subscription checkout or start creating an account,
          we may collect your name, email address, and church information
          before the process is completed. If you do not finish signing up or
          subscribing, we may retain this information so we can follow up with
          you about completing your signup, answer questions, or offer
          assistance. You can ask us to stop contacting you at any time by
          replying to any such message or emailing{" "}
          <a href="mailto:luke@doctrinally.ai" className="text-primary">
            luke@doctrinally.ai
          </a>
          .
        </p>

        <h2>3. How We Use Information</h2>
        <p>We use collected information to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>
            Process messages through AI models to generate relevant responses
            grounded in church content and scripture
          </li>
          <li>Index and retrieve church-uploaded content for AI-powered chat</li>
          <li>Track usage for billing and analytics dashboards</li>
          <li>
            Classify conversation topics for analytics (using AI topic
            classification)
          </li>
          <li>Communicate with you about your account and the Service</li>
          <li>
            Contact you about products or services you have shown interest in,
            including following up on incomplete signups or checkouts and
            responding to inquiries
          </li>
          <li>Detect, prevent, and address security issues</li>
        </ul>

        <h2>4. AI Processing</h2>
        <p>
          Messages sent through the chat are processed by third-party AI models
          (currently OpenAI) to generate responses. Your messages are sent to
          these providers solely for the purpose of generating responses and are
          subject to their respective privacy policies. We do not use your
          church&apos;s content or member conversations to train AI models.
        </p>

        <h2>5. Data Sharing</h2>
        <p>We do not sell your personal information. We share data only with:</p>
        <ul>
          <li>
            <strong>AI providers</strong> (OpenAI) — for processing chat
            messages and generating responses
          </li>
          <li>
            <strong>Stripe</strong> — for payment processing
          </li>
          <li>
            <strong>Vercel</strong> — for hosting, file storage, and domain
            management
          </li>
          <li>
            <strong>Trigger.dev</strong> — for background document processing
          </li>
        </ul>

        <h2>6. Data Security</h2>
        <p>
          We implement industry-standard security measures including encrypted
          data transmission (TLS/SSL), secure password hashing, and
          role-based access controls. Church data is isolated per organization —
          one church cannot access another church&apos;s content, members, or
          conversations.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          Account data is retained for the duration of your subscription. Chat
          history is retained until the user or church administrator deletes it.
          Uploaded documents are retained until deleted by the administrator. If
          a church cancels its subscription, data is retained for 30 days
          before permanent deletion.
        </p>

        <h2>8. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your account and associated data</li>
          <li>Export your data</li>
          <li>Opt out of non-essential communications</li>
        </ul>

        <h2>9. Children&apos;s Privacy</h2>
        <p>
          The Service is not directed to children under 13. We do not knowingly
          collect personal information from children under 13. If you believe a
          child has provided us with personal information, please contact us.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of material changes by posting the updated policy on our website
          and updating the &quot;Last updated&quot; date.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at{" "}
          <a href="mailto:privacy@doctrinally.ai" className="text-primary">
            privacy@doctrinally.ai
          </a>
          .
        </p>
      </div>
    </div>
  );
}
