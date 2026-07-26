import { useEffect, useRef, useState, type ComponentType } from "react";

import { Building2, Check, Clock3, Copy, Landmark, Mail, Phone, UserRound } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "#app/components/ui/button";
import type { CommunityInfoRecord } from "#app/features/contact/contact";
import { sectionReveal, softFade } from "#app/lib/motion";

type ContactPageContentProps = {
  info: CommunityInfoRecord;
};

type CopyState = "idle" | "copied" | "failed";

function telHref(phone: string): string {
  return `tel:${phone.replaceAll(/[^\d+]/g, "")}`;
}

function formatBankAccount(account: string): string {
  if (!/^[A-Z0-9]+$/.test(account)) return account;

  return account.replaceAll(/(.{4})/g, "$1 ").trim();
}

function bankAccountLabel(account: string): string {
  return /^[A-Z]{2}\d{2}/.test(account) ? "IBAN" : "Broj računa";
}

export function ContactPageContent({ info }: ContactPageContentProps) {
  const hasContact =
    info.showContact && Boolean(info.contactPhone ?? info.contactEmail ?? info.officeHours);
  const hasImam = info.showImam && Boolean(info.imamName ?? info.imamPhone ?? info.imamEmail);
  const hasBoard = info.showBoard && Boolean(info.boardNote);
  const hasLeadership = hasImam || hasBoard;
  const hasBank =
    info.showBank &&
    Boolean(
      info.bankAccount ?? info.bankBeneficiary ?? info.bankName ?? info.bankSwift ?? info.bankNote,
    );

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.header
        {...softFade}
        className="border-border bg-card relative overflow-hidden rounded-3xl border px-5 py-7 shadow-sm sm:px-8 sm:py-10"
      >
        <div
          aria-hidden="true"
          className="bg-primary/8 absolute -top-16 -right-8 h-48 w-48 rounded-full blur-3xl"
        />
        <div
          aria-hidden="true"
          className="bg-secondary/10 absolute -bottom-20 left-1/3 h-48 w-48 rounded-full blur-3xl"
        />

        <div className="relative max-w-3xl min-w-0">
          <p className="text-secondary text-xs font-semibold tracking-[0.14em] uppercase">
            O džematu
          </p>
          <h1 className="font-display text-foreground mt-2 text-3xl font-semibold text-balance sm:text-4xl">
            O džematu i kontakt
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-base leading-7 text-pretty sm:text-lg">
            Saznajte više o našem džematu i pronađite najvažnije kontakt podatke na jednom mjestu.
          </p>

          {info.showAbout && info.aboutText ? (
            <p className="border-border/70 text-foreground/85 mt-6 max-w-3xl border-t pt-5 text-base leading-7 text-pretty wrap-anywhere whitespace-pre-line">
              {info.aboutText}
            </p>
          ) : null}
        </div>
      </motion.header>

      {hasContact || hasLeadership ? (
        <div className="grid min-w-0 gap-6 lg:grid-cols-2">
          {hasContact ? (
            <motion.section
              aria-labelledby="contact-details-heading"
              {...sectionReveal}
              className="border-border bg-card min-w-0 rounded-2xl border p-5 shadow-sm sm:p-6"
            >
              <SectionHeading
                id="contact-details-heading"
                eyebrow="Brzi kontakt"
                title="Kontaktirajte nas"
                description="Pozovite nas, pošaljite e-mail ili provjerite prijemno vrijeme."
              />

              <address className="border-border/60 mt-5 min-w-0 divide-y overflow-hidden rounded-xl border not-italic">
                {info.contactPhone ? (
                  <ContactRow
                    icon={Phone}
                    label="Telefon"
                    value={info.contactPhone}
                    href={telHref(info.contactPhone)}
                  />
                ) : null}
                {info.contactEmail ? (
                  <ContactRow
                    icon={Mail}
                    label="E-mail"
                    value={info.contactEmail}
                    href={`mailto:${info.contactEmail}`}
                  />
                ) : null}
                {info.officeHours ? (
                  <ContactRow icon={Clock3} label="Prijemno vrijeme" value={info.officeHours} />
                ) : null}
              </address>
            </motion.section>
          ) : null}

          {hasLeadership ? (
            <motion.section
              aria-labelledby="contact-people-heading"
              {...sectionReveal}
              className="border-border bg-card min-w-0 rounded-2xl border p-5 shadow-sm sm:p-6"
            >
              <SectionHeading
                id="contact-people-heading"
                eyebrow="Džematska zajednica"
                title="Kome se možete obratiti"
                description="Javno dostupni podaci imama i džematskog odbora."
              />

              <div className="mt-5 space-y-4">
                {hasImam ? <ImamCard info={info} /> : null}

                {hasBoard && info.boardNote ? (
                  <div className="bg-muted/35 border-border/60 rounded-xl border p-4">
                    <div className="text-foreground flex items-center gap-2 text-sm font-semibold">
                      <Building2 className="text-primary h-4 w-4" aria-hidden="true" />
                      Džematski odbor
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm leading-6 text-pretty whitespace-pre-line">
                      {info.boardNote}
                    </p>
                  </div>
                ) : null}
              </div>
            </motion.section>
          ) : null}
        </div>
      ) : null}

      {hasBank ? <BankDetails info={info} /> : null}
    </div>
  );
}

function SectionHeading({
  description,
  eyebrow,
  id,
  title,
}: {
  description: string;
  eyebrow: string;
  id: string;
  title: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-secondary text-xs font-semibold tracking-[0.12em] uppercase">{eyebrow}</p>
      <h2 id={id} className="font-display text-foreground mt-1 text-xl font-semibold sm:text-2xl">
        {title}
      </h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6 text-pretty">{description}</p>
    </div>
  );
}

function ContactRow({
  href,
  icon: Icon,
  label,
  value,
}: {
  href?: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  const content = (
    <>
      <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="text-muted-foreground block text-xs font-medium">{label}</span>
        <span className="text-foreground mt-0.5 block text-sm leading-5 font-medium wrap-anywhere whitespace-pre-line">
          {value}
        </span>
      </span>
    </>
  );
  const className =
    "focus-visible:ring-ring flex min-w-0 items-start gap-3 px-4 py-3.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset";

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <a href={href} className={`${className} hover:bg-accent/60`}>
      {content}
    </a>
  );
}

function ImamCard({ info }: { info: CommunityInfoRecord }) {
  return (
    <div className="bg-primary/4 border-primary/15 min-w-0 rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium">Imam džemata</p>
          <p className="font-display text-foreground mt-0.5 text-lg font-semibold wrap-anywhere">
            {info.imamName ?? "Imam"}
          </p>
          <div className="mt-1 flex min-w-0 flex-col">
            {info.imamPhone ? (
              <a
                href={telHref(info.imamPhone)}
                className="text-primary hover:text-primary/80 inline-flex min-h-7 max-w-full items-center gap-2 text-sm font-medium wrap-anywhere"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                {info.imamPhone}
              </a>
            ) : null}
            {info.imamEmail ? (
              <a
                href={`mailto:${info.imamEmail}`}
                className="text-primary hover:text-primary/80 inline-flex min-h-7 max-w-full items-center gap-2 text-sm font-medium wrap-anywhere"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {info.imamEmail}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function BankDetails({ info }: { info: CommunityInfoRecord }) {
  return (
    <motion.section
      aria-labelledby="contact-bank-heading"
      {...sectionReveal}
      className="border-border bg-card min-w-0 overflow-hidden rounded-2xl border shadow-sm"
    >
      <div className="grid min-w-0 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="border-border/60 bg-accent/25 border-b p-5 sm:p-6 lg:border-r lg:border-b-0">
          <span className="bg-background/80 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase shadow-xs">
            <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
            Uplate
          </span>
          <h2
            id="contact-bank-heading"
            className="font-display text-foreground mt-4 text-2xl font-semibold"
          >
            Podaci za uplatu
          </h2>
          <p className="text-muted-foreground mt-2 text-sm leading-6 text-pretty">
            Podaci za članarinu, sadaku i druge uplate džematu.
          </p>
        </div>

        <dl className="divide-border/60 min-w-0 divide-y p-5 sm:p-6">
          {info.bankBeneficiary ? (
            <BankDetail label="Primalac" value={info.bankBeneficiary} />
          ) : null}
          {info.bankName ? <BankDetail label="Banka" value={info.bankName} /> : null}
          {info.bankAccount ? <BankAccountCopy account={info.bankAccount} /> : null}
          {info.bankSwift ? <BankDetail label="SWIFT / BIC" value={info.bankSwift} mono /> : null}
          {info.bankNote ? <BankDetail label="Napomena" value={info.bankNote} multiline /> : null}
        </dl>
      </div>
    </motion.section>
  );
}

function BankDetail({
  label,
  mono = false,
  multiline = false,
  value,
}: {
  label: string;
  mono?: boolean;
  multiline?: boolean;
  value: string;
}) {
  return (
    <div className="grid min-w-0 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-xs font-medium sm:pt-0.5">{label}</dt>
      <dd
        className={[
          "text-foreground min-w-0 text-sm font-medium wrap-anywhere",
          mono ? "font-mono tracking-wide tabular-nums" : "",
          multiline ? "leading-6 whitespace-pre-line" : "",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

function BankAccountCopy({ account }: { account: string }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const label = bankAccountLabel(account);

  useEffect(
    () => () => {
      if (resetTimerRef.current) globalThis.clearTimeout(resetTimerRef.current);
    },
    [],
  );

  function copyAccount() {
    void navigator.clipboard.writeText(account).then(
      () => {
        setCopyState("copied");
        if (resetTimerRef.current) globalThis.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = globalThis.setTimeout(() => setCopyState("idle"), 2000);
      },
      () => setCopyState("failed"),
    );
  }

  const buttonLabel =
    copyState === "copied"
      ? "Kopirano"
      : copyState === "failed"
        ? "Pokušaj ponovo"
        : `Kopiraj ${label.toLowerCase()}`;

  return (
    <div className="grid min-w-0 gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[8rem_1fr] sm:gap-4">
      <dt className="text-muted-foreground text-xs font-medium sm:pt-2">{label}</dt>
      <dd className="flex min-w-0 items-center justify-between gap-2">
        <span className="text-foreground min-w-0 overflow-x-auto font-mono text-sm font-medium tracking-wide whitespace-nowrap tabular-nums sm:text-base">
          {formatBankAccount(account)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 min-w-11 shrink-0 gap-2 self-start"
          aria-label={buttonLabel}
          title={buttonLabel}
          onClick={copyAccount}
        >
          {copyState === "copied" ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden xl:inline">{buttonLabel}</span>
        </Button>
        <span className="sr-only" aria-live="polite">
          {copyState === "copied"
            ? `${label} je kopiran.`
            : copyState === "failed"
              ? `Kopiranje nije uspjelo.`
              : ""}
        </span>
      </dd>
    </div>
  );
}
