import { ChevronDown } from "lucide-react";
import type { FAQ } from "@/content/marketing/data";

interface FAQAccordionProps {
  faqs: FAQ[];
  defaultOpen?: number;
}

export function FAQAccordion({ faqs, defaultOpen = 0 }: FAQAccordionProps) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <details
          key={faq.question}
          className="group rounded-xl border bg-card/40 p-5 transition-colors open:bg-card/80 hover:bg-card/60"
          {...(i === defaultOpen ? { open: true } : {})}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-[0.98rem] font-medium text-foreground">
            <span>{faq.question}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-4 pr-8 text-[0.92rem] leading-relaxed text-muted-foreground">
            {faq.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
