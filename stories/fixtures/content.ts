import type { CommunityInfoRecord } from "#app/features/contact/contact";
import type { PostCardData } from "#app/features/posts/post-card-data";
import { getPaginationState } from "#app/lib/pagination";

const date = new Date("2026-09-01T12:00:00Z");
export const post = {
  id: "demo-post",
  slug: "susret-zajednice",
  title: "Poziv na zajedničko druženje",
  excerpt: "U subotu se okupljamo uz razgovor, čaj i aktivnosti za najmlađe. Svi su dobrodošli.",
  type: "obavijest",
  publishedAt: date,
  updatedAt: date,
  createdAt: date,
  status: "published" as const,
  body: "<p>Drage džematlije, pozivamo vas na druženje u našem dvorištu.</p><h2>Program susreta</h2><p>Razgovor o novim aktivnostima, radionica za djecu i zajedničko uređenje prostora.</p>",
  featured: false,
  pinned: false,
  notifyOnPublish: false,
  images: [
    { id: "fictional-image", altText: "Ilustracija džamije za primjer", width: 1200, height: 800 },
  ],
  thumbnailId: "fictional-image",
  videos: [],
} satisfies PostCardData & Record<string, unknown>;
export const question = {
  id: "demo-question",
  question: "Kako se mogu uključiti u aktivnosti džemata?",
  answer:
    "Javite se tokom prijemnog vremena. Dobrodošli su svi koji žele podijeliti svoje vrijeme i znanje.",
  createdAt: date,
  answeredAt: date,
  isHidden: false,
};
export const announcement = {
  id: "demo-announcement",
  message: "Dobro došli! Sve informacije u ovom prikazu su izmišljeni primjeri.",
  isActive: true,
  createdAt: date,
};
export const importantDate = {
  id: "demo-date",
  title: "Dan zajednice",
  date: new Date("2026-10-10T00:00:00Z"),
  description: "Druženje i razgovor o novim aktivnostima.",
  recursYearly: true,
  createdAt: date,
};
export const contact = {
  showAbout: true,
  showContact: true,
  showImam: true,
  showBoard: true,
  showBank: true,
  showLocation: false,
  aboutText:
    "Ovo je izmišljeni džemat za prikaz komponenti. Zajedno učimo, pomažemo komšijama i brinemo o mjestu u kojem živimo.",
  imamName: "Primjer imama",
  imamPhone: null,
  imamEmail: "imam@example.invalid",
  contactPhone: null,
  contactEmail: "kontakt@example.invalid",
  officeHours: "Radnim danima od 9 do 14 sati",
  bankAccount: "0000000000000000",
  bankBeneficiary: "Džemat Primjer",
  bankName: "Izmišljena banka",
  bankSwift: null,
  bankNote: "Račun služi samo za prikaz. Nije namijenjen uplatama.",
  boardNote: "Primjer predsjednika odbora",
  updatedAt: date,
} satisfies CommunityInfoRecord;
export const pagination = getPaginationState({ page: 1, pageSize: 10, totalItems: 24 });
export const honeypot = { website__hp: "", website__hp_ts: "fictional-token" } as const;
