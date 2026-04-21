import { Form, data, redirect, useActionData } from "react-router";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { z } from "zod";

import { Field } from "#app/components/forms/field";
import { HoneypotInputs } from "#app/components/forms/honeypot";
import { Alert, AlertDescription } from "#app/components/ui/alert";
import { Button } from "#app/components/ui/button";
import { formatPageTitle, getSiteNameFromMatches } from "#app/lib/branding";
import { passwordField, requiredString } from "#app/lib/form-schema";
import { hashPassword, validateNewPassword } from "#app/utils/auth.server";
import { prisma } from "#app/utils/db.server";
import { assertHoneypot, honeypotToken } from "#app/utils/honeypot.server";
import { logger } from "#app/utils/logger.server";
import { verifyResetToken } from "#app/utils/reset-token.server";
import { commitSession, getSession } from "#app/utils/session.server";

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
    { title: formatPageTitle("Nova lozinka", getSiteNameFromMatches(matches)) },
    { name: "robots", content: "noindex" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const verification = await verifyResetToken(params.token);
  if (!verification.ok) {
    logger.warn({ reason: verification.reason }, "password reset page opened with invalid token");
    return data({ invalid: true as const, honeypot: honeypotToken() }, { status: 400 });
  }
  return { invalid: false as const, honeypot: honeypotToken() };
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

  // Log the admin in immediately.
  const cookieSession = await getSession(request.headers.get("Cookie"));
  cookieSession.set("userId", verification.userId);

  const headers = new Headers();
  headers.append("Set-Cookie", await commitSession(cookieSession));
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
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-12">
        <h1 className="text-3xl">Link nije važeći</h1>
        <p className="text-muted-foreground">
          Ovaj link je istekao ili je već iskorišten. Zatražite novi putem{" "}
          <a className="underline" href="/zaboravljena-lozinka">
            stranice za zaboravljenu lozinku
          </a>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl">Nova lozinka</h1>
        <p className="text-muted-foreground text-sm">
          Odaberite lozinku. Minimalno 10 znakova; provjerili smo i da ne postoji u javnim curenjima
          podataka.
        </p>
      </header>

      {form.errors?.length ? (
        <Alert variant="destructive">
          <AlertDescription>{form.errors[0]}</AlertDescription>
        </Alert>
      ) : null}

      <Form method="post" {...getFormProps(form)} className="space-y-4">
        <HoneypotInputs token={loaderData.honeypot} />

        <Field
          label="Nova lozinka"
          errors={fields.password.errors}
          hint="Minimalno 10 znakova."
          inputProps={{
            ...getInputProps(fields.password, { type: "password" }),
            autoComplete: "new-password",
          }}
        />

        <Field
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
    </main>
  );
}
