import { expect, test, type Page } from "@playwright/test";

import {
  PWA_CACHE_PREFIX,
  PWA_DATABASE_NAME,
  PWA_ICON_PATHS,
  PWA_OFFLINE_SHELL_PATH,
  PWA_POST_SNAPSHOT_LIMIT,
  PWA_POST_SNAPSHOT_STORE,
  PWA_SCOPE,
  PWA_SERVICE_WORKER_PATH,
} from "#app/features/pwa/pwa-config";

import { PWA_TEST_POSTS, type PwaTestPost } from "./fixtures";

test.beforeEach(async ({ context }, testInfo) => {
  // Every Playwright test represents an isolated browser, but the production
  // server otherwise sees all of them as the same loopback client. Give each
  // test attempt its own limiter key so rate limiting stays enabled without a
  // high-navigation test exhausting the next simulated visitor's allowance.
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `pwa-test-${testInfo.testId}-retry-${String(testInfo.retry)}`,
  });
});

test.describe("production PWA", () => {
  test("serves an installable manifest and every referenced icon", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");

    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/manifest+json");
    expect(response.headers()["cache-control"]).toBe("public, max-age=0, must-revalidate");

    const manifest = (await response.json()) as ManifestResponse;
    expect(manifest.id).toBe(PWA_SCOPE);
    expect(manifest.scope).toBe(PWA_SCOPE);
    expect(manifest.start_url).toBe(PWA_SCOPE);
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.map((icon) => icon.src)).toEqual(
      expect.arrayContaining(Object.values(PWA_ICON_PATHS)),
    );

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(icon.src);
      const iconBody = await iconResponse.body();

      expect(iconResponse.ok(), icon.src).toBe(true);
      expect(iconResponse.headers()["content-type"], icon.src).toContain("image/png");
      expect(iconBody.byteLength, icon.src).toBeGreaterThan(0);
    }
  });

  test("registers the stable worker with root scope and revalidation headers", async ({
    page,
    request,
  }) => {
    const workerResponse = await request.get(PWA_SERVICE_WORKER_PATH);

    expect(workerResponse.ok()).toBe(true);
    expect(workerResponse.headers()["content-type"]).toContain("javascript");
    expect(workerResponse.headers()["cache-control"]).toBe("no-cache, must-revalidate");

    await page.goto("/");
    const scope = await waitForPwaControl(page);

    expect(new URL(scope).pathname).toBe(PWA_SCOPE);
  });

  test("captures a post after a direct document navigation", async ({ page }) => {
    const post = PWA_TEST_POSTS[0];

    await page.goto(postPath(post));
    await expect(page.getByRole("heading", { level: 1, name: post.title })).toBeVisible();
    await expectSnapshotIds(page, [post.id]);
  });

  test("captures a post after normal React Router client navigation", async ({ page }) => {
    const post = pwaTestPost(1);

    await page.goto("/objave");
    await page.getByRole("link", { name: new RegExp(post.title) }).click();

    await expect(page).toHaveURL(new RegExp(`${postPath(post)}$`));
    await expectSnapshotIds(page, [post.id]);
  });

  test("retains 20 snapshots and evicts the first least-recently-viewed post", async ({ page }) => {
    const visitedPosts = PWA_TEST_POSTS.slice(0, PWA_POST_SNAPSHOT_LIMIT + 1);

    for (const post of visitedPosts) {
      await page.goto(postPath(post));
      await expectSnapshotIds(page, [post.id]);
    }

    const snapshots = await readSnapshots(page);
    const snapshotIds = snapshots.map((snapshot) => snapshot.id);

    expect(snapshots).toHaveLength(PWA_POST_SNAPSHOT_LIMIT);
    expect(snapshotIds).not.toContain(visitedPosts[0]?.id);
    expect(snapshotIds).toEqual(
      expect.arrayContaining(visitedPosts.slice(1).map((post) => post.id)),
    );
  });

  test("renders saved and unsaved offline routes and clears snapshots without clearing the shell", async ({
    context,
    page,
  }) => {
    const savedPost = pwaTestPost(2);

    await page.goto("/");
    await waitForPwaControl(page);
    await page.goto(postPath(savedPost));
    await expectSnapshotIds(page, [savedPost.id]);
    await page.goto("/");

    await context.setOffline(true);

    try {
      await page.goto(postPath(savedPost));
      await expect(page.getByText("Sačuvana verzija")).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: savedPost.title })).toBeVisible();
      await expect(page.getByText(/Objavljeno 20\. jul 2026\. u \d{2}:\d{2}/)).toBeVisible();
      await expect(page.getByText("M07")).toHaveCount(0);

      await page.goto("/kontakt");
      await expect(
        page.getByText("Tražena stranica nije sačuvana za čitanje bez interneta."),
      ).toBeVisible();

      await page.goto("/");
      await page.getByRole("button", { name: "Obriši sve" }).click();
      await page.getByRole("button", { name: "Potvrdi brisanje" }).click();
      await expect(page.getByText("Još nema sačuvanih objava.")).toBeVisible();
      await expect.poll(() => readSnapshots(page)).toEqual([]);

      const cacheUrls = await readPwaCacheUrls(page);
      expect(cacheUrls).toEqual([new URL(PWA_OFFLINE_SHELL_PATH, page.url()).toString()]);
    } finally {
      await context.setOffline(false);
    }
  });

  test("stores no route, data, resource, admin, auth, form, Q&A, or announcement responses", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForPwaControl(page);

    for (const pathname of [
      "/admin",
      "/admin/obavijesna-traka",
      "/prijava",
      "/zaboravljena-lozinka",
      "/kontakt",
      "/pitanja-i-odgovori",
    ]) {
      await page.goto(pathname);
    }

    await page.evaluate(async () => {
      await Promise.allSettled([
        fetch("/objave.data"),
        fetch("/resources/readiness"),
        fetch("/manifest.webmanifest"),
      ]);
    });

    expect(await readPwaCacheUrls(page)).toEqual([
      new URL(PWA_OFFLINE_SHELL_PATH, page.url()).toString(),
    ]);
  });
});

type SnapshotSummary = {
  id: string;
  slug: string;
};

type ManifestResponse = {
  id: string;
  scope: string;
  start_url: string;
  display: string;
  icons: {
    src: string;
  }[];
};

async function waitForPwaControl(page: Page): Promise<string> {
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;

    return registration.scope;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  return scope;
}

async function expectSnapshotIds(page: Page, expectedIds: readonly string[]): Promise<void> {
  await expect
    .poll(async () => {
      const snapshots = await readSnapshots(page);

      return expectedIds.every((id) => snapshots.some((snapshot) => snapshot.id === id));
    })
    .toBe(true);
}

async function readSnapshots(page: Page): Promise<SnapshotSummary[]> {
  return page.evaluate(
    async ({ databaseName, storeName }) => {
      const databases = await indexedDB.databases();
      if (!databases.some((database) => database.name === databaseName)) return [];

      return new Promise<SnapshotSummary[]>((resolve, reject) => {
        const openRequest = indexedDB.open(databaseName);

        openRequest.addEventListener("error", () => {
          reject(openRequest.error ?? new Error("Could not open the PWA test database."));
        });
        openRequest.addEventListener("success", () => {
          const database = openRequest.result;
          const transaction = database.transaction(storeName, "readonly");
          const recordsRequest = transaction.objectStore(storeName).getAll();

          recordsRequest.addEventListener("error", () => {
            database.close();
            reject(recordsRequest.error ?? new Error("Could not read PWA test snapshots."));
          });
          recordsRequest.addEventListener("success", () => {
            const snapshots = recordsRequest.result.map((record: SnapshotSummary) => ({
              id: record.id,
              slug: record.slug,
            }));

            database.close();
            resolve(snapshots);
          });
        });
      });
    },
    {
      databaseName: PWA_DATABASE_NAME,
      storeName: PWA_POST_SNAPSHOT_STORE,
    },
  );
}

async function readPwaCacheUrls(page: Page): Promise<string[]> {
  return page.evaluate(async (cachePrefix) => {
    const allCacheNames = await caches.keys();
    const cacheNames = allCacheNames.filter((name) => name.startsWith(cachePrefix));
    const cachedRequests = await Promise.all(
      cacheNames.map(async (cacheName) => {
        const cache = await caches.open(cacheName);

        return cache.keys();
      }),
    );

    return cachedRequests.flat().map((request) => request.url);
  }, PWA_CACHE_PREFIX);
}

function postPath(post: PwaTestPost): string {
  return `/objave/${post.slug}`;
}

function pwaTestPost(index: number): PwaTestPost {
  const post = PWA_TEST_POSTS[index];
  if (!post) throw new Error(`Missing PWA test post at index ${String(index)}.`);

  return post;
}
