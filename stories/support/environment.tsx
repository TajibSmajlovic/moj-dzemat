import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  useActionData,
  type ActionFunction,
} from "react-router";

import { MotionConfig } from "motion/react";
import { toast } from "sonner";

import { Toaster, useActionToast } from "#app/components/ui/sonner";
import { THEME_CHANGE_EVENT } from "#app/features/theme/theme";
import type { WebPushState } from "#app/features/web-push/web-push";

import { DemoPushProvider } from "../mocks/web-push";

const rootData = {
  siteName: "Moj Džemat - Primjer",
  siteUrl: "https://example.invalid",
  facebookPageUrl: undefined,
  youtubeChannelUrl: undefined,
  themePreference: "light",
  webPush: { enabled: false },
  toast: null,
};

const ContentContext = createContext<ReactNode>(null);
function StoryContent() {
  useActionToast(useActionData());

  return useContext(ContentContext);
}

export function StoryEnvironment({
  children,
  theme,
  path = "/",
  action,
  pushState,
}: {
  children: ReactNode;
  theme: "light" | "dark";
  path?: string;
  action?: ActionFunction;
  pushState?: WebPushState;
}) {
  const [router] = useState(() => {
    let lastResult: unknown = null;
    return createMemoryRouter(
      [
        {
          id: "root",
          loader: () => rootData,
          element: <Outlet />,
          hydrateFallbackElement: <p>Učitavanje primjera…</p>,
          children: [
            {
              id: "story",
              path: "*",
              element: <StoryContent />,
              loader: () => lastResult,
              action: async (args) => {
                lastResult = await (action ?? demoAction)(args);
                return lastResult;
              },
            },
          ],
        },
      ],
      // Seed loader data so built stories render before their play function starts.
      { initialEntries: [path], hydrationData: { loaderData: { root: rootData, story: null } } },
    );
  });

  useEffect(() => {
    globalThis.scrollTo(0, 0);
    document.documentElement.lang = "bs-BA";
    document.documentElement.classList.toggle("dark", theme === "dark");
    globalThis.dispatchEvent(new Event(THEME_CHANGE_EVENT));
    return () => {
      toast.dismiss();
    };
  }, [theme]);

  useEffect(
    () => () => {
      router.dispose();
    },
    [router],
  );

  return (
    <ContentContext value={children}>
      <MotionConfig reducedMotion="user">
        <DemoPushProvider initialState={pushState}>
          <div onClickCapture={simulateExternalLink}>
            <RouterProvider router={router} />
            <Toaster />
          </div>
        </DemoPushProvider>
      </MotionConfig>
    </ContentContext>
  );
}

function simulateExternalLink(event: MouseEvent<HTMLDivElement>) {
  const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (anchor instanceof HTMLAnchorElement && new URL(anchor.href).origin !== location.origin) {
    event.preventDefault();
    toast.message("Vanjski link je simuliran u ovom primjeru.");
  }
}

async function demoAction() {
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    ok: true,
    toast: {
      id: crypto.randomUUID(),
      type: "success",
      description: "Primjer je sačuvan samo u ovom prikazu.",
    },
  };
}
