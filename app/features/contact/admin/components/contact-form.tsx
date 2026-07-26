import { Form } from "react-router";

import {
  getFormProps,
  getInputProps,
  getTextareaProps,
  useForm,
  type FieldMetadata,
  type SubmissionResult,
} from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";

import { Field } from "#app/components/forms/field";
import { FormActions } from "#app/components/forms/form-actions";
import { Button } from "#app/components/ui/button";
import { Checkbox } from "#app/components/ui/checkbox";
import { Label } from "#app/components/ui/label";
import { Textarea } from "#app/components/ui/textarea";
import { ContactIntents } from "#app/features/contact/admin/contact-intents";
import type { CommunityInfoRecord } from "#app/features/contact/contact";
import {
  ABOUT_TEXT_MAX,
  BANK_ACCOUNT_MAX,
  BANK_BENEFICIARY_MAX,
  BANK_NAME_MAX,
  BANK_NOTE_MAX,
  BANK_SWIFT_MAX,
  BOARD_NOTE_MAX,
  CommunityInfoFormSchema,
  EMAIL_MAX,
  NAME_MAX,
  OFFICE_HOURS_MAX,
  PHONE_MAX,
} from "#app/features/contact/contact-schema";
import { cn } from "#app/lib/cn";
import { IntentInput } from "#app/lib/intent";

type Props = {
  info: CommunityInfoRecord;
  lastResult: SubmissionResult<string[]> | null;
  submitting: boolean;
};

function TextareaField({
  label,
  hint,
  field,
  maxLength,
  rows,
  placeholder,
}: {
  label: string;
  hint?: string;
  field: FieldMetadata<string | null>;
  maxLength: number;
  rows: number;
  placeholder: string;
}) {
  const hintId = hint ? `${field.id}-hint` : undefined;
  const errorId = field.errors?.length ? `${field.id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.id}>{label}</Label>
      <Textarea
        {...getTextareaProps(field)}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={errorId ? true : undefined}
        aria-describedby={describedBy}
        className={cn(errorId && "border-destructive")}
      />
      {hint ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {errorId ? (
        <p id={errorId} className="text-destructive text-xs">
          {field.errors?.[0]}
        </p>
      ) : null}
    </div>
  );
}

function VisibilityToggle({
  field,
  sectionTitle,
}: {
  field: FieldMetadata<unknown>;
  sectionTitle: string;
}) {
  return (
    <label
      htmlFor={field.id}
      className="text-muted-foreground flex min-h-10 cursor-pointer items-center gap-2 text-sm font-medium"
    >
      <Checkbox
        id={field.id}
        name={field.name}
        value="on"
        defaultChecked={field.initialValue === "on"}
        aria-label={`Prikaži sekciju ${sectionTitle} na javnoj stranici`}
      />
      <span>Prikaži na stranici</span>
    </label>
  );
}

function SectionHeader({
  description,
  title,
  visibilityField,
}: {
  description: string;
  title: string;
  visibilityField: FieldMetadata<unknown>;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-display text-foreground text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <VisibilityToggle field={visibilityField} sectionTitle={title} />
    </div>
  );
}

export function ContactForm({ info, lastResult, submitting }: Props) {
  const [form, fields] = useForm({
    id: "community-info",
    lastResult,
    defaultValue: {
      showAbout: info.showAbout ? "on" : "",
      showContact: info.showContact ? "on" : "",
      showImam: info.showImam ? "on" : "",
      showBoard: info.showBoard ? "on" : "",
      showBank: info.showBank ? "on" : "",
      showLocation: info.showLocation ? "on" : "",
      aboutText: info.aboutText ?? "",
      imamName: info.imamName ?? "",
      imamPhone: info.imamPhone ?? "",
      imamEmail: info.imamEmail ?? "",
      contactPhone: info.contactPhone ?? "",
      contactEmail: info.contactEmail ?? "",
      officeHours: info.officeHours ?? "",
      bankAccount: info.bankAccount ?? "",
      bankBeneficiary: info.bankBeneficiary ?? "",
      bankName: info.bankName ?? "",
      bankSwift: info.bankSwift ?? "",
      bankNote: info.bankNote ?? "",
      boardNote: info.boardNote ?? "",
    },
    shouldValidate: "onBlur",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: CommunityInfoFormSchema });
    },
  });

  return (
    <Form method="post" {...getFormProps(form)} className="space-y-8">
      <IntentInput intent={ContactIntents.Save} />

      <section className="border-border bg-card space-y-5 rounded-2xl border p-5 shadow-xs sm:p-6">
        <SectionHeader
          title="O džematu"
          description="Kratak uvod koji posjetioci vide na stranici 'Kontakt'."
          visibilityField={fields.showAbout}
        />

        <TextareaField
          label="Tekst o džematu"
          field={fields.aboutText}
          maxLength={ABOUT_TEXT_MAX}
          rows={5}
          placeholder="Npr. Džemat okuplja vjernike ovog kraja i radi na vjerskom i društvenom životu zajednice…"
        />
      </section>

      <section className="border-border bg-card space-y-5 rounded-2xl border p-5 shadow-xs sm:p-6">
        <SectionHeader
          title="Kontakt"
          description="Telefon, e-mail i prijemno vrijeme za opći kontakt s džematom."
          visibilityField={fields.showContact}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Telefon"
            errors={fields.contactPhone.errors}
            inputProps={{
              ...getInputProps(fields.contactPhone, { type: "tel" }),
              maxLength: PHONE_MAX,
              placeholder: "+387 …",
              autoComplete: "tel",
            }}
          />
          <Field
            label="E-mail"
            errors={fields.contactEmail.errors}
            inputProps={{
              ...getInputProps(fields.contactEmail, { type: "email" }),
              maxLength: EMAIL_MAX,
              placeholder: "kontakt@dzemat.ba",
              autoComplete: "email",
            }}
          />
        </div>

        <TextareaField
          label="Radno / prijemno vrijeme"
          hint="Kratko — npr. radnim danima od 9 do 14 sati ili nakon namaza."
          field={fields.officeHours}
          maxLength={OFFICE_HOURS_MAX}
          rows={3}
          placeholder="Radnim danima od 9 do 14 sati"
        />
      </section>

      <section className="border-border bg-card space-y-5 rounded-2xl border p-5 shadow-xs sm:p-6">
        <SectionHeader
          title="Imam"
          description="Podaci o imamu džemata ostaju sačuvani i kada je prikaz isključen."
          visibilityField={fields.showImam}
        />

        <Field
          label="Ime i prezime"
          errors={fields.imamName.errors}
          inputProps={{
            ...getInputProps(fields.imamName, { type: "text" }),
            maxLength: NAME_MAX,
            placeholder: "npr. hfz. Ime Prezime",
            autoComplete: "name",
          }}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Telefon imama"
            errors={fields.imamPhone.errors}
            inputProps={{
              ...getInputProps(fields.imamPhone, { type: "tel" }),
              maxLength: PHONE_MAX,
              placeholder: "+387 …",
            }}
          />
          <Field
            label="E-mail imama"
            errors={fields.imamEmail.errors}
            inputProps={{
              ...getInputProps(fields.imamEmail, { type: "email" }),
              maxLength: EMAIL_MAX,
              placeholder: "imam@dzemat.ba",
            }}
          />
        </div>
      </section>

      <section className="border-border bg-card space-y-5 rounded-2xl border p-5 shadow-xs sm:p-6">
        <SectionHeader
          title="Džematski odbor"
          description="Javne informacije o predsjedniku odbora ili muteveliji."
          visibilityField={fields.showBoard}
        />

        <TextareaField
          label="Džematski odbor / mutevelija (nije obavezno)"
          hint="Navedite samo javne informacije, npr. ime predsjednika odbora ili mutevelije."
          field={fields.boardNote}
          maxLength={BOARD_NOTE_MAX}
          rows={3}
          placeholder="Npr. Predsjednik odbora: …"
        />
      </section>

      <section className="border-border bg-card space-y-5 rounded-2xl border p-5 shadow-xs sm:p-6">
        <SectionHeader
          title="Žiro račun"
          description="Podaci za članarinu, sadaku i druge uplate džematu."
          visibilityField={fields.showBank}
        />

        <Field
          label="IBAN / broj računa"
          hint="Podržan je međunarodni IBAN ili domaći transakcijski račun."
          errors={fields.bankAccount.errors}
          inputProps={{
            ...getInputProps(fields.bankAccount, { type: "text" }),
            maxLength: BANK_ACCOUNT_MAX,
            placeholder: "npr. BA391290079401028494 ili 1011320053423595",
            autoComplete: "off",
            spellCheck: false,
          }}
        />

        <Field
          label="Primalac"
          errors={fields.bankBeneficiary.errors}
          inputProps={{
            ...getInputProps(fields.bankBeneficiary, { type: "text" }),
            maxLength: BANK_BENEFICIARY_MAX,
            placeholder: "npr. Džemat Donje Mostre",
          }}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Banka (nije obavezno)"
            errors={fields.bankName.errors}
            inputProps={{
              ...getInputProps(fields.bankName, { type: "text" }),
              maxLength: BANK_NAME_MAX,
              placeholder: "npr. Bosna Bank International",
            }}
          />
          <Field
            label="SWIFT / BIC (nije obavezno)"
            hint="Koristi se uglavnom za međunarodne uplate."
            errors={fields.bankSwift.errors}
            inputProps={{
              ...getInputProps(fields.bankSwift, { type: "text" }),
              maxLength: BANK_SWIFT_MAX,
              placeholder: "npr. BBIBBA22",
              autoCapitalize: "characters",
              autoComplete: "off",
              spellCheck: false,
            }}
          />
        </div>

        <TextareaField
          label="Napomena uz uplatu"
          field={fields.bankNote}
          maxLength={BANK_NOTE_MAX}
          rows={3}
          placeholder="npr. U svrhu uplate navedite: članarina / sadaka"
        />
      </section>

      <section className="border-border bg-card rounded-2xl border p-5 shadow-xs sm:p-6">
        <SectionHeader
          title="Lokacija"
          description="Adresa i mapa podešavaju se u postavkama okruženja, a ovdje možete isključiti njihov javni prikaz."
          visibilityField={fields.showLocation}
        />
      </section>

      <FormActions sticky className="justify-between">
        <p className="text-muted-foreground hidden text-sm sm:block">
          Promjene postaju javne tek kada ih sačuvate.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full sm:w-auto sm:min-w-40"
        >
          {submitting ? "Spremanje…" : "Spremi izmjene"}
        </Button>
      </FormActions>
    </Form>
  );
}
