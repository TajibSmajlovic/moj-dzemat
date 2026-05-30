import { ExternalLink, MapPinned, Navigation } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "#app/components/ui/button";
import type { DzematLocation } from "#app/lib/maps";
import { scrollReveal } from "#app/lib/motion";

type DzematLocationSectionProps = {
  location: DzematLocation;
  siteName: string;
};

export function DzematLocationSection({ location, siteName }: DzematLocationSectionProps) {
  return (
    <motion.section aria-label="Lokacija džemata" {...scrollReveal} className="mt-8 sm:mt-12">
      <div className="border-border bg-card relative overflow-hidden rounded-2xl border shadow-sm">
        <div
          aria-hidden="true"
          className="absolute -top-10 left-8 h-28 w-28 rounded-full bg-[hsl(var(--secondary)/0.12)] blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute right-0 -bottom-10 h-36 w-36 rounded-full bg-[hsl(var(--emerald-glow)/0.14)] blur-3xl"
        />

        <div className="relative grid gap-0 lg:grid-cols-[0.95fr_1.25fr]">
          <div className="flex flex-col justify-between p-5 sm:p-7">
            <div>
              <span className="bg-accent text-accent-foreground mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase">
                <MapPinned className="h-3.5 w-3.5" aria-hidden="true" />
                Lokacija
              </span>

              <h2 className="font-display text-foreground text-2xl font-semibold text-balance sm:text-3xl">
                Gdje se nalazimo
              </h2>

              <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed sm:text-base">
                Ako dolazite prvi put u {siteName}, ovdje možete odmah otvoriti mapu i dobiti upute
                do džemata.
              </p>

              <div className="bg-background/75 border-border/70 mt-5 rounded-2xl border p-4 shadow-xs backdrop-blur-sm">
                <p className="text-foreground text-sm font-medium sm:text-base">Lokacija</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed text-pretty sm:text-base">
                  {location.address}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Button size="sm" className="flex-1 gap-2 sm:px-4" asChild>
                <a href={location.mapsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Otvori u Google Maps
                </a>
              </Button>

              <Button variant="outline" size="sm" className="flex-1 gap-2 sm:px-4" asChild>
                <a href={location.directionsUrl} target="_blank" rel="noreferrer">
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  Upute do džemata
                </a>
              </Button>
            </div>
          </div>

          <div className="border-border/70 bg-muted/30 relative min-h-80 border-t lg:min-h-full lg:border-t-0 lg:border-l">
            <iframe
              title={`Google mapa za ${siteName}`}
              src={location.embedUrl}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full min-h-80 w-full border-0"
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
}
