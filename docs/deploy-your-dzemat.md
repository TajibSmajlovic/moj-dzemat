# Deploy Moj Džemat for Your Džemat

Each deployment serves one džemat. The upstream repository deploys Džemat
Donje Moštre; a fork for another džemat changes only the files in this guide
and keeps the rest of the code as it is.

## Scope

The app is built for džemats in Bosnia and Herzegovina that operate within the
Islamic Community in Bosnia and Herzegovina. These stay fixed in every fork:

- Bosnian interface copy and the `bs-BA` document language
- the `Europe/Sarajevo` time zone for dates
- `BA` as the country in search-engine structured data
- bank-account validation for BiH IBANs and 16-digit domestic accounts

A džemat outside this scope needs code changes, not just configuration.

## 1. Describe the džemat

Edit [app/dzemat.config.ts](../app/dzemat.config.ts). It is the only source of
the džemat's identity:

| Field           | Where it appears                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`          | After the product name everywhere: "Moj Džemat - {name}". Also used in the page descriptions, the install name, emails, and push notifications.                                                                                                              |
| `tagline`       | The short line under the name in the header and on the offline page, for example "Rijaset Islamske zajednice u BiH".                                                                                                                                         |
| `logoAlt`       | The screen-reader description of the logo.                                                                                                                                                                                                                   |
| `organizations` | The organizations the džemat operates within, from the broadest to the closest. Each needs the `name` (nominative, used for search engines) and the `nameGenitive` that completes the footer sentence "Džemat {name} djeluje u okviru …". `url` is optional. |
| `location`      | Optional. `address` is displayed with the map on the homepage and contact page; `mapQuery` is what Google Maps searches and defaults to `address`. Remove the entry to hide the map.                                                                         |
| `socialLinks`   | Optional official `facebook` and `youtube` URLs. Remove a key to hide its links.                                                                                                                                                                             |

`npm run build` refuses to build an invalid config and names each invalid
field: empty text, text with surrounding spaces, URLs that are not absolute
`http(s)` addresses, an empty organization list, or an unknown key.

Contact details, the imam, bank details, and office hours are not part of this
file. Editors manage them after deployment in the admin area under
`/admin/kontakt`.

## 2. Replace the images

| File                             | Purpose                                                                                                               | When to replace                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `public/social-card-default.jpg` | The preview shown when a page without its own image is shared on Facebook, WhatsApp, and similar apps. 1200×630 JPEG. | Always. The upstream card shows Donje Moštre's name, domain, and QR code.                                                         |
| `public/logo.svg`                | The logo in the header, footer, admin area, error pages, and offline page. It must be an SVG without scripts.         | Only for a different mark. The default emblem of the Islamic Community in Bosnia and Herzegovina fits every džemat in scope.      |
| `public/logo.png`                | The 512×512 logo for search engines and push notifications, and the source of every app icon.                         | Together with `public/logo.svg`, then run `npm run pwa:icons` to regenerate the favicon, the Apple touch icon, and the PWA icons. |

## 3. Prepare Fly.io

Production runs on [Fly.io](https://fly.io) with LiteFS and one machine.

1. In `fly.toml`, change `app` to a new, unique Fly app name. To run in another
   region, change both `primary_region` and `PRIMARY_REGION`.
2. Create the app with `fly apps create <app-name>`.
3. Set the secrets with `fly secrets set`: `APP_URL`, `SESSION_SECRET`,
   `PASSWORD_RESET_SECRET`, `HONEYPOT_SECRET`, `ADMIN_SEED_EMAILS`,
   `RESEND_API_KEY`, and `EMAIL_FROM`. The
   [environment reference](development/local-development.md#environment)
   describes each value. Cloudflare Web Analytics and Web Push are optional;
   follow the [Web Push rollout guide](design-docs/web-push.md) before enabling
   push notifications.
4. `APP_URL` is the canonical public origin. Production redirects every other
   host to it, so point your domain at the app with `fly certs add <domain>`
   before using that domain in `APP_URL`.

## 4. Deploy

Run `fly deploy` from the repository root. The first deploy creates the
`litefs` volume declared in `fly.toml`. Every boot applies database migrations
and creates the admin accounts listed in `ADMIN_SEED_EMAILS`.

For automatic deploys, add a `FLY_API_TOKEN` repository secret
(`fly tokens create deploy`) and enable GitHub Actions in the fork. The
[deployment workflow](../.github/workflows/deploy.yml) then deploys every
`master` commit that passes CI. Without the secret, automatic deploys are
skipped instead of failing.

## 5. Hand over to editors

Each admin opens `/zaboravljena-lozinka`, requests a reset link for their
address from `ADMIN_SEED_EMAILS`, and sets a password. Editors then fill in the
contact page under `/admin/kontakt` and start publishing.

## Stay up to date

Merge upstream changes into the fork regularly. Because the fork changes only
`app/dzemat.config.ts`, the images, and `fly.toml`, upstream updates rarely
conflict with it.

The footer's "Open Source" section links to the upstream project and its
maintainers in every fork, so improvements can flow back to all džemats.
