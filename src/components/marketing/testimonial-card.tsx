import { Quote } from "lucide-react";
import type { Testimonial } from "@/content/marketing/data";

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export function TestimonialCard({ testimonial: t }: TestimonialCardProps) {
  return (
    <figure className="group flex flex-col rounded-2xl border bg-background p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/[0.05] sm:p-8">
      <Quote className="mb-4 h-7 w-7 text-gold/60" />
      <blockquote className="flex-1 text-base italic leading-relaxed text-foreground/90">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-7 flex items-center gap-4 border-t pt-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-heading text-base text-primary">
          {t.initial}
        </div>
        <div>
          <div className="font-heading text-[0.95rem]">{t.name}</div>
          <div className="text-xs text-muted-foreground">
            {t.role}, {t.church}
          </div>
        </div>
      </figcaption>
    </figure>
  );
}
