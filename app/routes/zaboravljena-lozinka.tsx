import { Form, Link, data, useActionData } from "react-router";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { ArrowLeft, Clock3, MailCheck, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { Field } from "#app/components/forms/field";
import { HoneypotInputs } from "#app/components/forms/honeypot";
import { PublicAuthShell } from "#app/components/layout/auth-shell";
import { Alert, AlertDescription } from "#app/components/ui/alert";
import { Button } from "#app/components/ui/button";
import { getAuthPage } from "#app/features/auth/auth-page.server";
import { buildPasswordResetEmail } from "#app/features/auth/password-reset-email.server";
import { signResetToken } from "#app/features/auth/reset-token.server";
import { formatPageTitle, formatSiteName, getRootSiteName } from "#app/lib/branding";
import { emailField } from "#app/lib/form-schema";
import { ROBOTS_NOINDEX } from "#app/lib/seo";
import { prisma } from "#app/server/db.server";
import { sendEmail } from "#app/server/email.server";
import { env } from "#app/server/env.server";
import { assertHoneypot, honeypotToken } from "#app/server/honeypot.server";
import { logger } from "#app/server/logger.server";
import { forgotPasswordLimiter, getClientIp } from "#app/server/rate-limit.server";

import type { Route } from "./+types/zaboravljena-lozinka";

const ForgotSchema = z.object({
  email: emailField(),
});

export function meta({ matches }: Route.MetaArgs) {
  return [
    { title: formatPageTitle("Zaboravljena lozinka", getRootSiteName(matches)) },
    { name: "robots", content: ROBOTS_NOINDEX },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  return {
    honeypot: honeypotToken(),
    ...(await getAuthPage(request)),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  assertHoneypot(formData);

  const ip = getClientIp(request);
  const limit = forgotPasswordLimiter.check(ip);
  if (!limit.ok) {
    logger.warn({ ip }, "forgot-password rate limited");
    // Keep the user-facing message identical to the success case so
    // attackers can't differentiate rate-limiting from email lookup.
    return data({ result: null, sent: true } as const, { status: 429 });
  }

  const submission = parseWithZod(formData, { schema: ForgotSchema });
  if (submission.status !== "success") {
    return data({ result: submission.reply(), sent: false } as const, {
      status: 400,
    });
  }

  const { email } = submission.value;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, password: { select: { hash: true } } },
  });

  if (user) {
    const environment = env();
    const token = await signResetToken({
      userId: user.id,
      passwordHash: user.password?.hash ?? null,
    });
    const url = `${environment.APP_URL}/nova-lozinka/${token}`;
    const email = buildPasswordResetEmail({
      resetUrl: url,
      siteName: formatSiteName(environment.DZEMAT_NAME),
    });
    await sendEmail({ to: user.email, ...email });
    logger.info({ email: user.email, userId: user.id }, "password reset email sent");
  } else {
    logger.info({ email }, "forgot-password requested for unknown email");
  }

  return data({ result: submission.reply(), sent: true } as const);
}

export default function ForgotPasswordPage({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const [form, fields] = useForm({
    id: "forgot-form",
    lastResult: actionData?.result ?? null,
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: ForgotSchema });
    },
  });

  if (actionData?.sent) {
    return (
      <PublicAuthShell
        announcement={loaderData.announcement}
        isAdminLoggedIn={loaderData.isAdminLoggedIn}
        eyebrow="Siguran pristup"
        title="Provjerite email"
        description="Ako email postoji u sistemu, poslali smo link za postavljanje nove lozinke."
        panelTitle="Zahtjev je zaprimljen"
        panelDescription="Iz sigurnosnih razloga prikazujemo istu poruku bez obzira na to da li je email pronađen."
        details={[
          {
            icon: <Clock3 className="size-4" />,
            title: "Link vrijedi 10 minuta",
            description: "Nakon isteka možete zatražiti novi link istim putem.",
          },
          {
            icon: <ShieldCheck className="size-4" />,
            title: "Postojeća lozinka ostaje aktivna",
            description: "Promjena se desi tek kada otvorite link i postavite novu lozinku.",
          },
        ]}
      >
        <div className="space-y-5">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-lg">
            <MailCheck className="size-6" />
          </div>
          <p className="text-muted-foreground text-sm leading-6">
            Provjerite inbox. Ako poruka ne stigne za nekoliko minuta, pogledajte spam folder ili
            ponovo pošaljite zahtjev.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/prijava">
              <ArrowLeft className="size-4" />
              Nazad na prijavu
            </Link>
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
      title="Zaboravljena lozinka"
      description="Upišite email povezan s administratorskim nalogom. Poslat ćemo sigurni link za postavljanje nove lozinke."
      panelTitle="Pošalji link"
      panelDescription="Link za novu lozinku stiže na email i vrijedi 10 minuta."
      details={[
        {
          icon: <Clock3 className="size-4" />,
          title: "Vremenski ograničen link",
          description: "Svaki link vrijedi 10 minuta i vezan je za trenutno stanje naloga.",
        },
        {
          icon: <ShieldCheck className="size-4" />,
          title: "Bez otkrivanja naloga",
          description: "Poruka nakon slanja ostaje ista i ne otkriva da li email postoji.",
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

        <Field
          label="Email"
          errors={fields.email.errors}
          inputProps={{
            ...getInputProps(fields.email, { type: "email" }),
            autoComplete: "email",
            placeholder: "admin@dzemat.ba",
          }}
        />

        <Button type="submit" className="w-full">
          Pošalji link
        </Button>
      </Form>
    </PublicAuthShell>
  );
}
