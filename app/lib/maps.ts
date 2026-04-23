type DzematLocationInput = {
  address?: string | null;
  query?: string | null;
};

export type DzematLocation = {
  address: string;
  query: string;
  embedUrl: string;
  mapsUrl: string;
  directionsUrl: string;
};

const GOOGLE_MAPS_BASE_URL = "https://www.google.com/maps";
export const DEFAULT_GOOGLE_MAPS_EMBED_ZOOM = "17";

function normalizeOptionalString(value?: string | null): string | undefined {
  const normalized = value?.trim();

  return normalized ?? undefined;
}

export function buildGoogleMapsEmbedUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    z: DEFAULT_GOOGLE_MAPS_EMBED_ZOOM,
    output: "embed",
  });

  return `${GOOGLE_MAPS_BASE_URL}?${params.toString()}`;
}

export function buildGoogleMapsSearchUrl(query: string): string {
  const params = new URLSearchParams({
    api: "1",
    query,
  });

  return `${GOOGLE_MAPS_BASE_URL}/search/?${params.toString()}`;
}

export function buildGoogleMapsDirectionsUrl(destination: string): string {
  const params = new URLSearchParams({
    api: "1",
    destination,
  });

  return `${GOOGLE_MAPS_BASE_URL}/dir/?${params.toString()}`;
}

export function getDzematLocation(input: DzematLocationInput): DzematLocation | null {
  const address = normalizeOptionalString(input.address);
  const query = normalizeOptionalString(input.query) ?? address;

  if (!query) {
    return null;
  }

  return {
    address: address ?? query,
    query,
    embedUrl: buildGoogleMapsEmbedUrl(query),
    mapsUrl: buildGoogleMapsSearchUrl(query),
    directionsUrl: buildGoogleMapsDirectionsUrl(query),
  };
}
