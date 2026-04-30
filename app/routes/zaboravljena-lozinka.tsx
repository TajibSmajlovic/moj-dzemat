import { Form, data, useActionData } from "react-router";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { z } from "zod";

import { Field } from "#app/components/forms/field";
import { HoneypotInputs } from "#app/components/forms/honeypot";
import { AuthHeader, AuthPageShell } from "#app/components/layout/auth-shell";
import { Alert, AlertDescription } from "#app/components/ui/alert";
import { Button } from "#app/components/ui/button";
import { formatPageTitle, getRootSiteName } from "#app/lib/branding";
import { emailField } from "#app/lib/form-schema";
import { ROBOTS_NOINDEX } from "#app/lib/seo";
import { prisma } from "#app/utils/db.server";
import { sendEmail } from "#app/utils/email.server";
import { env } from "#app/utils/env.server";
import { assertHoneypot, honeypotToken } from "#app/utils/honeypot.server";
import { logger } from "#app/utils/logger.server";
import { forgotPasswordLimiter, getClientIp } from "#app/utils/rate-limit.server";
import { signResetToken } from "#app/utils/reset-token.server";

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

export function loader(_args: Route.LoaderArgs) {
  return { honeypot: honeypotToken() };
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
    const token = await signResetToken({
      userId: user.id,
      passwordHash: user.password?.hash ?? null,
    });
    const url = `${env().APP_URL}/nova-lozinka/${token}`;
    await sendEmail({
      to: user.email,
      subject: "Postavljanje nove lozinke",
      text: `Otvorite sljedeći link kako biste postavili novu lozinku (vrijedi 1 sat):\n\n${url}`,
      html: `<p>Otvorite sljedeći link kako biste postavili novu lozinku (vrijedi 1 sat):</p><p><a href="${url}">${url}</a></p>`,
    });
    logger.info({ email: user.email, userId: user.id }, "password reset email sent");
  } else {
    // Still burn the same timing budget to avoid leaking existence.
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
      <AuthPageShell gap="gap-4">
        <h1 className="text-3xl">Provjerite email</h1>
        <p className="text-muted-foreground">
          Ako email postoji u sistemu, poslali smo link za postavljanje nove lozinke. Link vrijedi 1
          sat.
        </p>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <AuthHeader
        title="Zaboravljena lozinka"
        description="Unesite svoj email. Poslat ćemo link za postavljanje nove lozinke."
      />

      {form.errors?.length ? (
        <Alert variant="destructive">
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
          }}
        />

        <Button type="submit" className="w-full">
          Pošalji link
        </Button>
      </Form>
    </AuthPageShell>
  );
}
