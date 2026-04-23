import bcrypt from "bcryptjs";

import type { PostTypeValue } from "#app/lib/post-type";
import { prisma } from "#app/utils/db.server";

let seq = 0;
function unique(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

/**
 * Test factories. Each returns the inserted row (or the row + extras we
 * produced along the way, like the plaintext password). Values are
 * realistic enough to satisfy Zod validation on any shared code paths.
 */

type CreateUserOptions = {
  email?: string;
  name?: string;
  password?: string | null;
};

export async function createUser(options: CreateUserOptions = {}) {
  const email = options.email ?? `${unique("admin")}@dzemat.ba`;
  const name = options.name ?? "Admin";
  const user = await prisma.user.create({ data: { email, name } });

  const password = options.password ?? "testtest123";
  if (password !== null) {
    const hash = await bcrypt.hash(password, 4);
    await prisma.password.create({ data: { userId: user.id, hash } });
  }

  return { user, password };
}

type CreatePostOptions = {
  authorId?: string;
  title?: string;
  slug?: string;
  body?: string;
  type?: PostTypeValue;
  featured?: boolean;
  pinned?: boolean;
  publishedAt?: Date;
  createdAt?: Date;
};

export async function createPost(options: CreatePostOptions = {}) {
  const title = options.title ?? `Objava ${unique("p")}`;
  const slug = options.slug ?? unique("post").toLowerCase();
  return prisma.post.create({
    data: {
      title,
      slug,
      body: options.body ?? "Tijelo objave.\n\nDrugi paragraf.",
      type: options.type ?? "obavijest",
      authorId: options.authorId,
      featured: options.featured,
      pinned: options.pinned,
      publishedAt: options.publishedAt,
      createdAt: options.createdAt,
    },
  });
}

type CreateSiteAnnouncementOptions = {
  message?: string;
  isActive?: boolean;
};

/** @public - factory used by future e2e + integration tests */
export async function createSiteAnnouncement(options: CreateSiteAnnouncementOptions = {}) {
  return prisma.siteAnnouncement.create({
    data: {
      message: options.message ?? "Džuma namaz u 13:00",
      isActive: options.isActive ?? true,
    },
  });
}
