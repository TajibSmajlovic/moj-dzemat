import { Form, Link, data, redirect, useActionData } from "react-router";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { AlertTriangle, CheckCircle2, Clock3, KeyRound, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { HoneypotInputs } from "#app/components/forms/honeypot";
import { PasswordField } from "#app/components/forms/password-field";
import { PublicAuthShell } from "#app/components/layout/auth-shell";
import { Alert, AlertDescription } from "#app/components/ui/alert";
import { Button } from "#app/components/ui/button";
import { formatPageTitle, getRootSiteName } from "#app/lib/branding";
import { passwordField, requiredString } from "#app/lib/form-schema";
import { ROBOTS_NOINDEX } from "#app/lib/seo";
import { getAuthPage } from "#app/utils/auth-page.server";
import { hashPassword, startSessionFor, validateNewPassword } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { assertHoneypot, honeypotToken } from "#app/utils/honeypot.server";
import { logger } from "#app/utils/logger.server";
import { verifyResetToken } from "#app/utils/reset-token.server";

import type { Route } from "./+types/nova-lozinka.$token";

const NewPasswordSchema = z
  .object({
    password: passwordField({
      minLength: 10,
      minLengthMessage: "Lozinka mora imati najmanje 10 znakova.",
    }),
    confirmPassword: requiredString("Potvrdite lozinku.", { trim: false }),
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Lozinke se ne podudaraju.",
  });

export function meta({ matches }: Route.MetaArgs) {
  return [
    { title: formatPageTitle("Nova lozinka", getRootSiteName(matches)) },
    { name: "robots", content: ROBOTS_NOINDEX },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const [verification, chrome] = await Promise.all([
    verifyResetToken(params.token),
    getAuthPage(request),
  ]);

  if (!verification.ok) {
    logger.warn({ reason: verification.reason }, "password reset page opened with invalid token");

    return data({ invalid: true as const, honeypot: honeypotToken(), ...chrome }, { status: 400 });
  }
  return { invalid: false as const, honeypot: honeypotToken(), ...chrome };
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
        ? "Lozinka mora imati najmanje 10 znakova."
        : "Lozinka je zabilježena u javnim curenjima podataka. Odaberite drugu.";

    return data(
      {
        result: submission.reply({ fieldErrors: { password: [message] } }),
      },
      { status: 400 },
    );
  }

  const hash = await hashPassword(submission.value.password);
  await prisma.password.upsert({
    where: { userId: verification.userId },
    create: { userId: verification.userId, hash },
    update: { hash },
  });

  // Log the admin in immediately. Rotate the session id so any
  // pre-existing cookie from the same browser is invalidated alongside
  // the password change.
  const headers = await startSessionFor(request, verification.userId);
  logger.info({ userId: verification.userId }, "password reset completed");

  return redirect("/admin", { headers });
}

export default function NewPasswordPage({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
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
        isAdminLoggedIn={loaderData.isAdminLoggedIn}
        eyebrow="Siguran pristup"
        title="Link nije važeći"
        description="Ovaj link je istekao, već iskorišten ili više ne odgovara trenutnom stanju naloga."
        panelTitle="Zatražite novi link"
        panelDescription="Novi link za postavljanje lozinke možete poslati na isti administratorski email."
        details={[
          {
            icon: <Clock3 className="size-4" />,
            title: "Link vrijedi 10 minuta",
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
            Pošaljite novi zahtjev i otvorite najnoviji email koji primite.
          </p>
          <Button asChild className="w-full">
            <Link to="/zaboravljena-lozinka">Pošalji novi link</Link>
          </Button>
        </div>
      </PublicAuthShell>
    );
  }

  return (
    <PublicAuthShell
      announcement={loaderData.announcement}
      isAdminLoggedIn={loaderData.isAdminLoggedIn}
      eyebrow="Admin pristup"
      title="Postavite novu lozinku"
      description="Odaberite novu lozinku za administratorski nalog. Nakon uspješnog spremanja odmah ćemo vas prijaviti."
      panelTitle="Nova lozinka"
      panelDescription="Koristite najmanje 10 znakova. Provjerit ćemo i da lozinka nije poznata iz javnih curenja podataka."
      details={[
        {
          icon: <KeyRound className="size-4" />,
          title: "Minimalno 10 znakova",
          description: "Duža jedinstvena lozinka je bolja od kratke i složene.",
        },
        {
          icon: <CheckCircle2 className="size-4" />,
          title: "Automatska prijava",
          description: "Nakon spremanja lozinke nastavljate direktno u admin panel.",
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
          hint="Minimalno 10 znakova."
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
          Spremi i prijavi se
        </Button>
      </Form>
    </PublicAuthShell>
  );
}
