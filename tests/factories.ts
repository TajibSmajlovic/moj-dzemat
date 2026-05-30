import bcrypt from "bcryptjs";

import type { PostStatusValue } from "#app/features/posts/post-status";
import type { PostTypeValue } from "#app/features/posts/post-type";
import { ymdToUtcDate } from "#app/lib/date";
import { prisma } from "#app/server/db.server";

let seq = 0;
function unique(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

/**
   Test factories. Each returns the inserted row (or the row + extras we
   produced along the way, like the plaintext password). Values are
   realistic enough to satisfy Zod validation on any shared code paths.
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

  const password = options.password === undefined ? "testtest123" : options.password;
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
  status?: PostStatusValue;
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
      status: options.status,
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

type CreateImportantDateOptions = {
  title?: string;
  date?: string; // "YYYY-MM-DD"
  description?: string | null;
};

export async function createImportantDate(options: CreateImportantDateOptions = {}) {
  const date = ymdToUtcDate(options.date ?? "2026-06-16");
  if (!date) throw new Error(`Invalid factory date: ${options.date}`);

  return prisma.importantDate.create({
    data: {
      title: options.title ?? "Bajram namaz",
      date,
      description: options.description === undefined ? "Test opis." : options.description,
    },
  });
}

type CreateQuestionOptions = {
  question?: string;
  answer?: string | null;
  isHidden?: boolean;
  answeredAt?: Date | null;
  createdAt?: Date;
};

export async function createQuestion(options: CreateQuestionOptions = {}) {
  const question = options.question ?? `Pitanje ${unique("q")}?`;
  const answer = options.answer === undefined ? null : options.answer;
  const answeredAt =
    options.answeredAt === undefined ? (answer ? new Date() : null) : options.answeredAt;

  return prisma.question.create({
    data: {
      question,
      answer: answer ?? undefined,
      isHidden: options.isHidden ?? false,
      answeredAt,
      createdAt: options.createdAt,
    },
  });
}
