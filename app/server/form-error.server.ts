/**
   Form-submission failure shared by server-side helpers that run
   inside an action. Carries an optional `fieldErrors` map so the
   action layer can translate the throw straight into Conform's
   `submission.reply(...)` shape without losing field context.

   Intentionally minimal: just a message plus optional field-level
   errors. Anything bigger (status codes, error kinds, etc.) belongs
   at a different layer.
 */
export class FormError extends Error {
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, options?: { fieldErrors?: Record<string, string[]> }) {
    super(message);
    this.name = "FormError";
    this.fieldErrors = options?.fieldErrors;
  }
}
