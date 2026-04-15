interface PageHeroProps {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: PageHeroProps) {
  return (
    <section className="parchment-texture relative overflow-hidden border-b">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,_var(--tw-gradient-stops))] from-gold/[0.06] via-transparent to-transparent" />
      <div className="container relative mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
          {eyebrow}
        </p>
        <h1 className="mt-4 font-heading text-[2rem] leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
