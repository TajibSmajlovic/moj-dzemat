import type { PublicImportantDate } from "#app/features/important-dates/important-dates.server";
import { dateToYmd, formatYmdLong, getYmdBadgeParts } from "#app/lib/date";

type Props = {
  dates: PublicImportantDate[];
};

export function ImportantDatesHomeSection({ dates }: Props) {
  if (dates.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="important-dates-home-heading"
      className="border-border/60 mt-8 border-t border-b py-8 sm:mt-10 sm:py-10"
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_2fr] lg:gap-8">
        <div className="space-y-3">
          <p className="text-secondary text-xs font-semibold tracking-[0.14em] uppercase">
            Nadolazeći datumi
          </p>
          <h2
            id="important-dates-home-heading"
            className="font-display text-foreground text-2xl leading-tight font-semibold text-balance sm:text-3xl"
          >
            Važni datumi
          </h2>
          <p className="text-muted-foreground text-sm leading-6 sm:text-base sm:leading-7">
            Pregledajte nadolazeće važne datume u našoj zajednici.
          </p>
        </div>

        <ul className="border-border/60 bg-card divide-border/60 divide-y rounded-lg border shadow-xs">
          {dates.map((entry) => (
            <ImportantDateRow key={entry.id} entry={entry} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function ImportantDateRow({ entry }: { entry: PublicImportantDate }) {
  const ymd = dateToYmd(entry.date);
  const badge = getYmdBadgeParts(ymd);

  return (
    <li className="flex items-start gap-4 p-4 sm:p-5">
      {badge ? (
        <time
          dateTime={ymd}
          className="bg-primary/10 flex w-16 shrink-0 flex-col items-center rounded-lg px-2 py-2 text-center"
        >
          <span className="text-secondary text-[0.65rem] font-semibold tracking-[0.12em] uppercase">
            {badge.month}
          </span>
          <span className="text-primary text-2xl leading-none font-bold tabular-nums">
            {badge.day}
          </span>
          <span className="text-muted-foreground mt-0.5 text-[0.65rem] font-medium uppercase">
            {badge.weekday}
          </span>
        </time>
      ) : null}

      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="font-display text-foreground leading-snug font-semibold text-pretty">
          {entry.title}
        </h3>
        <p className="text-muted-foreground text-xs">
          <time dateTime={ymd}>{formatYmdLong(ymd)}</time>
        </p>
        {entry.description ? (
          <p className="text-muted-foreground line-clamp-2 text-sm leading-6 text-pretty">
            {entry.description}
          </p>
        ) : null}
      </div>
    </li>
  );
}
