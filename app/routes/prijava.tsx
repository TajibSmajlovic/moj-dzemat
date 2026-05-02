import { Form, Link, data, redirect, useActionData } from "react-router";

import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { FileText, LogIn, ShieldCheck } from "lucide-react";
import { z } from "zod";

import { Field } from "#app/components/forms/field";
import { HoneypotInputs } from "#app/components/forms/honeypot";
import { PasswordField } from "#app/components/forms/password-field";
import { PublicAuthShell } from "#app/components/layout/auth-shell";
import { Alert, AlertDescription } from "#app/components/ui/alert";
import { Button } from "#app/components/ui/button";
import { formatPageTitle, getRootSiteName } from "#app/lib/branding";
import { emailField, passwordField } from "#app/lib/form-schema";
import { ROBOTS_NOINDEX } from "#app/lib/seo";
import { getAuthPageChrome } from "#app/utils/auth-page.server";
import { login } from "#app/utils/auth.server";
import { assertHoneypot, honeypotToken } from "#app/utils/honeypot.server";
import { logger } from "#app/utils/logger.server";
import { getClientIp, loginLimiter } from "#app/utils/rate-limit.server";

import type { Route } from "./+types/prijava";

const LoginSchema = z.object({
  email: emailField(),
  password: passwordField(),
  redirectTo: z.string().optional(),
});

export function meta({ matches }: Route.MetaArgs) {
  return [
    { title: formatPageTitle("Prijava", getRootSiteName(matches)) },
    { name: "robots", content: ROBOTS_NOINDEX },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  return {
    honeypot: honeypotToken(),
    ...(await getAuthPageChrome(request)),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  assertHoneypot(formData);

  const ip = getClientIp(request);
  const limit = loginLimiter.check(ip);
  if (!limit.ok) {
    logger.warn({ ip, name: loginLimiter.name }, "rate limited");
    return data(
      {
        result: null,
        formError: "Previše pokušaja. Molimo pokušajte ponovo za nekoliko minuta.",
      },
      { status: 429 },
    );
  }

  const submission = parseWithZod(formData, { schema: LoginSchema });
  if (submission.status !== "success") {
    return data(
      { result: submission.reply(), formError: null },
      { status: submission.status === "error" ? 400 : 200 },
    );
  }

  const { email, password, redirectTo } = submission.value;
  const result = await login({ request, email, password });
  if (!result.ok) {
    return data(
      {
        result: submission.reply({
          formErrors: ["Pogrešan email ili lozinka."],
        }),
        formError: null,
      },
      { status: 400 },
    );
  }

  const target = safeRedirect(redirectTo, "/admin");
  return redirect(target, { headers: result.headers });
}

export default function LoginPage({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const [form, fields] = useForm({
    id: "login-form",
    lastResult: actionData?.result ?? null,
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: LoginSchema });
    },
  });

  return (
    <PublicAuthShell
      announcement={loaderData.announcement}
      isAdminLoggedIn={loaderData.isAdminLoggedIn}
      eyebrow="Admin panel"
      title="Prijava za uredništvo"
      description="Upravljajte objavama, obavijesnom trakom i sadržajem džematske stranice iz zaštićenog administrativnog prostora."
      panelTitle="Prijavite se"
      panelDescription="Unesite administratorski email i lozinku."
      details={[
        {
          icon: <FileText className="size-4" />,
          title: "Objave i obavijesti",
          description: "Administracija je namijenjena urednicima stranice.",
        },
        {
          icon: <ShieldCheck className="size-4" />,
          title: "Zaštićen pristup",
          description: "Nalozi se aktiviraju kroz sigurni tok za postavljanje lozinke.",
        },
      ]}
    >
      {actionData?.formError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{actionData.formError}</AlertDescription>
        </Alert>
      ) : null}

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

        <PasswordField
          label="Lozinka"
          errors={fields.password.errors}
          inputProps={{
            ...getInputProps(fields.password, { type: "password" }),
            autoComplete: "current-password",
            placeholder: "••••••••",
          }}
        />

        <input
          type="hidden"
          name="redirectTo"
          defaultValue={fields.redirectTo.initialValue ?? ""}
        />

        <Button type="submit" className="w-full">
          <LogIn className="size-4" />
          Prijavi se
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          <Link
            className="hover:text-foreground underline-offset-4 hover:underline"
            to="/zaboravljena-lozinka"
          >
            Zaboravili ste lozinku?
          </Link>
        </p>
      </Form>
    </PublicAuthShell>
  );
}

function safeRedirect(to: string | undefined, fallback: string): string {
  if (!to) return fallback;
  if (!to.startsWith("/") || to.startsWith("//")) return fallback;
  return to;
}
