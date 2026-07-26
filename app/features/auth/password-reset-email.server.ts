import { PASSWORD_RESET_TOKEN_TTL_LABEL } from "#app/features/auth/auth-policy";

type PasswordResetEmailOptions = {
  resetUrl: string;
  siteName: string;
};

type PasswordResetEmail = {
  subject: string;
  text: string;
  html: string;
};

const PASSWORD_RESET_SUBJECT = "Postavljanje nove lozinke";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildPasswordResetEmail({
  resetUrl,
  siteName,
}: PasswordResetEmailOptions): PasswordResetEmail {
  const escapedResetUrl = escapeHtml(resetUrl);
  const escapedSiteName = escapeHtml(siteName);
  const preheader = `Link za postavljanje nove lozinke vrijedi ${PASSWORD_RESET_TOKEN_TTL_LABEL}.`;

  return {
    subject: PASSWORD_RESET_SUBJECT,
    text: [
      "Postavite novu lozinku",
      "",
      `Otvorite sljedeći link kako biste postavili novu lozinku. Link vrijedi ${PASSWORD_RESET_TOKEN_TTL_LABEL}:`,
      "",
      resetUrl,
      "",
      "Ako niste tražili promjenu lozinke, slobodno zanemarite ovaj e-mail.",
      "",
      siteName,
    ].join("\n"),
    html: `<!doctype html>
<html lang="bs">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${PASSWORD_RESET_SUBJECT}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8f5ef;color:#17362b;font-family:Inter,'Segoe UI',Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f5ef;margin:0;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;">
            <tr>
              <td style="padding:0 0 18px;text-align:center;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;font-weight:700;color:#17362b;">
                  ${escapedSiteName}
                </div>
                <div style="margin-top:6px;font-size:12px;line-height:18px;color:#60746b;">
                  Siguran pristup admin panelu
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#fffdfa;border:1px solid #e6ded0;border-radius:16px;overflow:hidden;box-shadow:0 18px 48px rgba(23,54,43,0.10);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="background:#107945;background-image:linear-gradient(135deg,#104936,#107945 60%,#b9943f);padding:30px 32px;">
                      <div style="display:inline-block;border:1px solid rgba(255,255,255,0.26);border-radius:999px;padding:6px 10px;color:#fffdfa;font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                        Nova lozinka
                      </div>
                      <h1 style="margin:18px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;font-weight:700;color:#fffdfa;">
                        Postavite novu lozinku
                      </h1>
                      <p style="margin:12px 0 0;color:#f3eadc;font-size:15px;line-height:24px;">
                        Primili smo zahtjev za promjenu lozinke za admin pristup.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px;">
                      <p style="margin:0;color:#17362b;font-size:16px;line-height:26px;">
                        Da biste nastavili, otvorite sigurni link ispod. Link vrijedi <strong>${PASSWORD_RESET_TOKEN_TTL_LABEL}</strong>.
                      </p>

                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0;">
                        <tr>
                          <td style="border-radius:8px;background:#107945;">
                            <a href="${escapedResetUrl}" style="display:inline-block;border-radius:8px;background:#107945;color:#fffdfa;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;padding:14px 22px;">
                              Postavi novu lozinku
                            </a>
                          </td>
                        </tr>
                      </table>

                      <div style="border-left:4px solid #b9943f;background:#f7f1e7;border-radius:8px;padding:14px 16px;">
                        <p style="margin:0;color:#3f5a50;font-size:14px;line-height:22px;">
                          Ako niste tražili promjenu lozinke, zanemarite ovaj e-mail. Vaša postojeća lozinka ostaje ista.
                        </p>
                      </div>

                      <p style="margin:24px 0 8px;color:#60746b;font-size:13px;line-height:20px;">
                        Ako dugme ne radi, kopirajte ovaj link u internetski preglednik:
                      </p>
                      <p style="margin:0;word-break:break-all;color:#107945;font-size:13px;line-height:20px;">
                        <a href="${escapedResetUrl}" style="color:#107945;text-decoration:underline;">${escapedResetUrl}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px 0;text-align:center;color:#60746b;font-size:12px;line-height:18px;">
                ${escapedSiteName}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}
