import { describe, expect, it } from "vitest";

import { getPaginationState, parsePageParam } from "#app/lib/pagination";

describe("parsePageParam", () => {
  it("falls back to page 1 for missing and invalid values", () => {
    expect(parsePageParam(null)).toBe(1);
    expect(parsePageParam("")).toBe(1);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-1")).toBe(1);
    expect(parsePageParam("2.5")).toBe(1);
    expect(parsePageParam("neispravno")).toBe(1);
  });

  it("accepts positive integers", () => {
    expect(parsePageParam("1")).toBe(1);
    expect(parsePageParam("2")).toBe(2);
    expect(parsePageParam("15")).toBe(15);
  });
});

describe("getPaginationState", () => {
  it("calculates the metadata for a full middle page", () => {
    const pagination = getPaginationState({ page: 2, pageSize: 20, totalItems: 45 });

    expect(pagination).toMatchObject({
      page: 2,
      pageSize: 20,
      totalItems: 45,
      totalPages: 3,
      skip: 20,
      rangeStart: 21,
      rangeEnd: 40,
      hasPreviousPage: true,
      hasNextPage: true,
    });
  });

  it("caps the end of the range on the last partial page", () => {
    const pagination = getPaginationState({ page: 3, pageSize: 20, totalItems: 45 });

    expect(pagination).toMatchObject({
      totalPages: 3,
      skip: 40,
      rangeStart: 41,
      rangeEnd: 45,
      hasPreviousPage: true,
      hasNextPage: false,
    });
  });

  it("returns zeroed ranges for an empty result set", () => {
    const pagination = getPaginationState({ page: 1, pageSize: 20, totalItems: 0 });

    expect(pagination).toMatchObject({
      page: 1,
      totalPages: 0,
      skip: 0,
      rangeStart: 0,
      rangeEnd: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });
  });
});
