import { useRouteLoaderData } from "react-router";

export function useRootFacebookPageUrl(): string | null {
  const data = useRouteLoaderData<{ facebookPageUrl?: string }>("root");

  return data?.facebookPageUrl ?? null;
}
