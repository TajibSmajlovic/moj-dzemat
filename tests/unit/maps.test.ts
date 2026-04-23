import { describe, expect, it } from "vitest";

import {
  DEFAULT_GOOGLE_MAPS_EMBED_ZOOM,
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
  getDzematLocation,
} from "#app/lib/maps";

describe("Google Maps helpers", () => {
  it("builds the embed/search/directions URLs from the query", () => {
    const query = "Džamija Donje Moštre, R445, Visoko";

    expect(buildGoogleMapsEmbedUrl(query)).toContain("output=embed");
    expect(buildGoogleMapsEmbedUrl(query)).toContain(
      "D%C5%BEamija+Donje+Mo%C5%A1tre%2C+R445%2C+Visoko",
    );
    expect(buildGoogleMapsEmbedUrl(query)).toContain(`z=${DEFAULT_GOOGLE_MAPS_EMBED_ZOOM}`);

    expect(buildGoogleMapsSearchUrl(query)).toBe(
      "https://www.google.com/maps/search/?api=1&query=D%C5%BEamija+Donje+Mo%C5%A1tre%2C+R445%2C+Visoko",
    );

    expect(buildGoogleMapsDirectionsUrl(query)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=D%C5%BEamija+Donje+Mo%C5%A1tre%2C+R445%2C+Visoko",
    );
  });

  it("returns null when neither address nor query is configured", () => {
    expect(getDzematLocation({})).toBeNull();
    expect(getDzematLocation({ address: "   ", query: "" })).toBeNull();
  });

  it("falls back to the address when no explicit map query is set", () => {
    expect(getDzematLocation({ address: "Džamija Donje Moštre" })).toEqual({
      address: "Džamija Donje Moštre",
      query: "Džamija Donje Moštre",
      embedUrl: `https://www.google.com/maps?q=D%C5%BEamija+Donje+Mo%C5%A1tre&z=${DEFAULT_GOOGLE_MAPS_EMBED_ZOOM}&output=embed`,
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=D%C5%BEamija+Donje+Mo%C5%A1tre",
      directionsUrl:
        "https://www.google.com/maps/dir/?api=1&destination=D%C5%BEamija+Donje+Mo%C5%A1tre",
    });
  });

  it("uses the explicit query for maps while keeping the displayed address", () => {
    expect(
      getDzematLocation({
        address: "Džamija Donje Moštre",
        query: "Džamija Donje Moštre, R445, Visoko, Bosna i Hercegovina",
      }),
    ).toEqual({
      address: "Džamija Donje Moštre",
      query: "Džamija Donje Moštre, R445, Visoko, Bosna i Hercegovina",
      embedUrl: `https://www.google.com/maps?q=D%C5%BEamija+Donje+Mo%C5%A1tre%2C+R445%2C+Visoko%2C+Bosna+i+Hercegovina&z=${DEFAULT_GOOGLE_MAPS_EMBED_ZOOM}&output=embed`,
      mapsUrl:
        "https://www.google.com/maps/search/?api=1&query=D%C5%BEamija+Donje+Mo%C5%A1tre%2C+R445%2C+Visoko%2C+Bosna+i+Hercegovina",
      directionsUrl:
        "https://www.google.com/maps/dir/?api=1&destination=D%C5%BEamija+Donje+Mo%C5%A1tre%2C+R445%2C+Visoko%2C+Bosna+i+Hercegovina",
    });
  });
});
