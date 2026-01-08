"use client";

interface CompanyCarouselProps {
  companies: string[];
}

export default function CompanyCarousel({ companies }: CompanyCarouselProps) {
  // If no companies provided, don't render
  if (companies.length === 0) return null;

  // Duplicate the list to create a seamless loop
  // We need enough copies to ensure there's no gap when scrolling.
  // 2 sets is usually enough if the list is long, but if it's short, we might need more.
  // Since we fetch 15 companies, 2 sets is guaranteed to fill the screen (15 * ~150px > 1920px).
  const displayCompanies = [...companies, ...companies];

  return (
    <section className="py-12 sm:py-16 px-6 overflow-hidden bg-background border-t border-b border-border/40">
      <div className="max-w-7xl mx-auto mb-8 sm:mb-12 text-center">
        <h2 className="text-sm font-medium tracking-widest uppercase text-muted-foreground">
          Trusted by students at
        </h2>
      </div>

      <div
        className="flex w-full overflow-hidden mask-gradient-x"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div className="flex items-center gap-12 sm:gap-20 px-12 animate-marquee w-max">
          {displayCompanies.map((name, index) => (
            <div
              key={`${name}-${index}`}
              className="flex items-center justify-center min-w-[120px]"
            >
              <span className="text-xl sm:text-2xl font-serif text-muted-foreground/80 hover:text-foreground transition-colors duration-300">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
