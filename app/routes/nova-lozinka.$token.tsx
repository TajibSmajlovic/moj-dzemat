import { Form, href, Link, data, redirect } from "react-router";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { AlertTriangle, CheckCircle2, Clock3, KeyRound, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { HoneypotInputs } from "#app/components/forms/honeypot";
import { PasswordField } from "#app/components/forms/password-field";
import { PublicAuthShell } from "#app/components/layout/auth-shell";
import { Alert, AlertDescription } from "#app/components/ui/alert";
import { Button } from "#app/components/ui/button";
import { getActiveAnnouncement } from "#app/features/announcements/site-announcement.server";
import {
  MIN_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH_MESSAGE,
  PASSWORD_RESET_TOKEN_TTL_LABEL,
} from "#app/features/auth/auth-policy";
import { DEFAULT_LOGGED_IN_REDIRECT } from "#app/features/auth/auth-routes";
import { hashPassword, startSessionFor, validateNewPassword } from "#app/features/auth/auth.server";
import { verifyResetToken } from "#app/features/auth/reset-token.server";
import { formatPageTitle, getRootSiteName } from "#app/lib/branding";
import { passwordField, requiredString } from "#app/lib/form-schema";
import { buildNoindexMeta } from "#app/lib/seo";
import { prisma } from "#app/server/db.server";
import { assertHoneypot, honeypotToken } from "#app/server/honeypot.server";
import { logger } from "#app/server/logger.server";

import type { Route } from "./+types/nova-lozinka.$token";

const NewPasswordSchema = z
  .object({
    password: passwordField({
      minLength: MIN_PASSWORD_LENGTH,
      minLengthMessage: MIN_PASSWORD_LENGTH_MESSAGE,
    }),
    confirmPassword: requiredString("Potvrdite lozinku.", { trim: false }),
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Lozinke se ne podudaraju.",
  });

export function meta({ matches }: Route.MetaArgs) {
  return buildNoindexMeta(formatPageTitle("Nova lozinka", getRootSiteName(matches)));
}

export async function loader({ params }: Route.LoaderArgs) {
  const [verification, announcement] = await Promise.all([
    verifyResetToken(params.token),
    getActiveAnnouncement(),
  ]);

  if (!verification.ok) {
    logger.warn({ reason: verification.reason }, "password reset page opened with invalid token");

    return data(
      { invalid: true as const, honeypot: honeypotToken(), announcement },
      { status: 400 },
    );
  }
  return { invalid: false as const, honeypot: honeypotToken(), announcement };
}

export async function action({ params, request }: Route.ActionArgs) {
  const formData = await request.formData();
  assertHoneypot(formData);

  const verification = await verifyResetToken(params.token);
  if (!verification.ok) {
    logger.warn({ reason: verification.reason }, "password reset rejected");
    throw new Response("Link nije važeći ili je istekao.", { status: 400 });
  }

  const submission = parseWithZod(formData, { schema: NewPasswordSchema });
  if (submission.status !== "success") {
    return data({ result: submission.reply() }, { status: 400 });
  }

  const problem = await validateNewPassword(submission.value.password);
  if (problem) {
    const message =
      problem.kind === "too-short"
        ? MIN_PASSWORD_LENGTH_MESSAGE
        : "Ova lozinka se pojavljuje u javno objavljenim bazama ukradenih podataka. Odaberite drugu.";

    return data(
      {
        result: submission.reply({ fieldErrors: { password: [message] } }),
      },
      { status: 400 },
    );
  }

  const hash = await hashPassword(submission.value.password);
  await prisma.$transaction([
    prisma.password.upsert({
      where: { userId: verification.userId },
      create: { userId: verification.userId, hash },
      update: { hash },
    }),
    prisma.session.deleteMany({ where: { userId: verification.userId } }),
  ]);

  // Log the admin in immediately. Rotate the session id so any
  // pre-existing cookie is replaced after all old sessions were revoked.
  const headers = await startSessionFor(request, verification.userId);
  logger.info({ userId: verification.userId }, "password reset completed");

  return redirect(DEFAULT_LOGGED_IN_REDIRECT, { headers });
}

export default function NewPasswordPage({ actionData, loaderData }: Route.ComponentProps) {
  const [form, fields] = useForm({
    id: "new-password-form",
    lastResult: actionData && "result" in actionData ? actionData.result : null,
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: NewPasswordSchema });
    },
  });

  if (loaderData.invalid) {
    return (
      <PublicAuthShell
        announcement={loaderData.announcement}
        eyebrow="Siguran pristup"
        title="Link nije važeći"
        description="Ovaj link je istekao, već iskorišten ili više ne odgovara trenutnom stanju naloga."
        panelTitle="Zatražite novi link"
        panelDescription="Novi link za postavljanje lozinke možete poslati na istu e-mail adresu povezanu s admin nalogom."
        details={[
          {
            icon: <Clock3 className="size-4" />,
            title: `Link vrijedi ${PASSWORD_RESET_TOKEN_TTL_LABEL}`,
            description: "Istekli linkovi se odbijaju automatski.",
          },
          {
            icon: <ShieldCheck className="size-4" />,
            title: "Promjena lozinke poništava stare linkove",
            description: "Ako je lozinka već promijenjena, raniji link više nije upotrebljiv.",
          },
        ]}
      >
        <div className="space-y-5">
          <div className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-lg">
            <AlertTriangle className="size-6" />
          </div>
          <p className="text-muted-foreground text-sm leading-6">
            Pošaljite novi zahtjev i otvorite najnoviji e-mail koji primite.
          </p>
          <Button asChild className="w-full">
            <Link to={href("/zaboravljena-lozinka")}>Pošalji novi link</Link>
          </Button>
        </div>
      </PublicAuthShell>
    );
  }

  return (
    <PublicAuthShell
      announcement={loaderData.announcement}
      eyebrow="Admin pristup"
      title="Postavite novu lozinku"
      description="Odaberite novu lozinku za admin nalog. Kada je sačuvate, odmah ćemo vas prijaviti."
      panelTitle="Nova lozinka"
      panelDescription={`Koristite najmanje ${MIN_PASSWORD_LENGTH} znakova. Provjerit ćemo i da lozinka nije poznata iz javnih curenja podataka.`}
      details={[
        {
          icon: <KeyRound className="size-4" />,
          title: `Minimalno ${MIN_PASSWORD_LENGTH} znakova`,
          description: "Duža jedinstvena lozinka je bolja od kratke i složene.",
        },
        {
          icon: <CheckCircle2 className="size-4" />,
          title: "Automatska prijava",
          description: "Nakon što sačuvate lozinku, bit ćete preusmjereni u admin panel.",
        },
      ]}
    >
      {form.errors?.length ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{form.errors[0]}</AlertDescription>
        </Alert>
      ) : null}

      <Form method="post" {...getFormProps(form)} className="space-y-4">
        <HoneypotInputs token={loaderData.honeypot} />

        <PasswordField
          label="Nova lozinka"
          errors={fields.password.errors}
          hint={`Minimalno ${MIN_PASSWORD_LENGTH} znakova.`}
          inputProps={{
            ...getInputProps(fields.password, { type: "password" }),
            autoComplete: "new-password",
          }}
        />

        <PasswordField
          label="Potvrdite lozinku"
          errors={fields.confirmPassword.errors}
          inputProps={{
            ...getInputProps(fields.confirmPassword, { type: "password" }),
            autoComplete: "new-password",
          }}
        />

        <Button type="submit" className="w-full">
          Sačuvaj i prijavi se
        </Button>
      </Form>
    </PublicAuthShell>
  );
}
