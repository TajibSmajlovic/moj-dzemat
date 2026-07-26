import { HONEYPOT_FIELD, HONEYPOT_TIMESTAMP_FIELD, type HoneypotToken } from "#app/lib/honeypot";

type HoneypotInputsProps = {
  token: HoneypotToken;
};

/**
 * Hidden fields a bot's form-filler will populate but a human's browser
 * will leave alone. The timestamp carries an HMAC (see
 * `honeypot.server.ts`) so the pair is replay-resistant.
 *
 * The visible-but-visually-hidden pattern below keeps the fields in the
 * tab order of nothing (tabIndex=-1) and hidden from screen readers
 * (aria-hidden) while still being submitted with the form.
 */
export function HoneypotInputs({ token }: HoneypotInputsProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-10000px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
      }}
    >
      <label>
        Web-stranica
        <input
          type="text"
          name={HONEYPOT_FIELD}
          defaultValue={token[HONEYPOT_FIELD]}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      <input
        type="hidden"
        name={HONEYPOT_TIMESTAMP_FIELD}
        defaultValue={token[HONEYPOT_TIMESTAMP_FIELD]}
      />
    </div>
  );
}
