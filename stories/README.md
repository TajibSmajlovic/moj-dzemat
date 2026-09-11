# Moj Džemat component catalogue

The public catalogue ships with the app at `/storybook/`. It uses the real
components and styles with fictional records and bundled media. It requires no
login. Technical documentation is in English; rendered product examples use
Bosnian.

## Run and verify

- `npm run storybook`: local catalogue on port 6006, without app credentials or a database.
- `npm run build:storybook`: static files in `build/storybook`.
- `npm run test:storybook`: Chromium interaction and accessibility checks in both themes.
- `npm run test:pwa`: built catalogue URLs, headers, assets and app worker coexistence.
- `npm run docs:check`: documentation links, anchors and npm commands, including these guides.
- `npm run agent:verify`: all required app and catalogue checks.

Install Chromium with `npx playwright install chromium` if it is unavailable.
Storybook has its own Vite configuration; the React Router SSR plugin belongs to
the app build. Normal `npm run build` and the existing Docker image include the
catalogue. Build output is generated, never committed.

Use the sidebar to select a component and state. Controls edit supported props;
the toolbar changes theme and viewport. Copy the browser URL to share that
state. Docs pages render examples in separate iframes so providers, portals and
local state do not overlap.

## Add a story

Add a typed `*.stories.tsx` file under the matching section here. Import the
owning visual component, not its route module. Keep product components inside
their feature. Include the default state and the states that change what a user
can understand or do: empty data, errors, long text, pending actions, optional
media, or disabled controls. Update [coverage.md](coverage.md) when adding a
component or changing its demonstration.

Use fixed fixture dates and IDs. Example records, rich text and media must be
fictional; do not copy production responses, uploaded images, credentials or
personal details. Fixtures must not depend on the database or `tests/`, which is
excluded from Docker builds. The architecture checker follows browser imports
through story helpers and forbids app/server imports of story code.

Add a `play` function for meaningful interactions, using `storybook/test`.
Wait for visible outcomes when transitions or actions are asynchronous. Query
portals through `within(document.body)`. Do not disable accessibility rules to
make a check pass. Automated checks cover both themes; manually inspect narrow
layouts, focus and motion when their behavior changes.

## Router and browser effects

[StoryEnvironment](support/environment.tsx) supplies fictional root loader data,
a fresh memory router, Motion, the app toaster and a simulated push provider.
`parameters.demo.path` selects a starting route. `parameters.demo.action` supplies
a local React Router action; its result becomes the child loader data on
revalidation. The default action delays briefly and displays a demo confirmation.
List fixtures remain unchanged unless the story binds its result to rendered
state, as the optimistic-toggle stories do. Navigation stays in memory.

Forms use their real client validation. Route forms that take `submitting` or
`lastResult` need a small story wrapper when demonstrating an action response.
Static saving/error stories can supply those props directly. Client examples do
not replace server authorization, validation or integration tests.

The narrow aliases in [.storybook/vite.config.ts](../.storybook/vite.config.ts)
replace only browser effect contracts:

| Contract                    | Catalogue behavior                                                      |
| --------------------------- | ----------------------------------------------------------------------- |
| Brand logo                  | App logo from the catalogue’s copied public assets                      |
| Post image URLs             | Bundled fictional SVG                                                   |
| Video thumbnails and embeds | Bundled SVG and inert local HTML                                        |
| Current date                | Fixed example date; other date helpers stay real                        |
| Theme preference            | Preview DOM only; no app cookie/storage writes                          |
| Clipboard and sharing       | Recorded mock calls; no clipboard writes or popups                      |
| Web Push                    | Local provider transitions; no permission, registration or subscription |

Location examples also use the bundled HTML instead of a map service. External
links are intercepted with an explanatory toast. Do not mount the live root,
service-worker registration, snapshot capture, analytics or push provider in a
story. Recheck production network isolation when adding a new browser effect.

## Production behavior

Express serves the static directory before the app catch-all. `/storybook`
redirects to `/storybook/` with its query intact. Missing files return 404 and
unsupported methods return 405. HTML/index/manager files revalidate; fingerprinted
preview assets are immutable. The catalogue permits same-origin frames and the
inline scripts/styles generated by Storybook. Main-site framing protection is
unchanged. The catalogue is marked `noindex` and is absent from public navigation
and the sitemap.

The app worker excludes the catalogue. An older worker can still forward online
requests during its normal update lifecycle; offline catalogue access is not
supported. Visiting Storybook does not unregister workers or clear saved posts.

The catalogue shares Fly availability, release cadence and startup with the app.
Deploy and roll back through the existing app image workflow. No separate runtime,
database migration, environment variable or hosted Storybook account is needed.
