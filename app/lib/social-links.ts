import { useRootLoaderData } from "#app/lib/root-loader-data";

export function useRootFacebookPageUrl(): string | null {
  const data = useRootLoaderData();

  return data?.facebookPageUrl ?? null;
}
