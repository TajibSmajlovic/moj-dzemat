import type { Prisma } from "#generated/prisma/client";

import {
  MAX_VIDEOS_PER_POST,
  parseYouTubeUrl,
  type ParsedVideo,
} from "#app/features/posts/post-video";
import { FormError } from "#app/server/form-error.server";

type TxClient = Prisma.TransactionClient;

export function resolveVideoInputs(formData: FormData): ParsedVideo[] {
  const videos: ParsedVideo[] = [];
  const seen = new Set<string>();

  for (const entry of formData.getAll("videoUrl")) {
    if (typeof entry !== "string") continue;

    const trimmed = entry.trim();
    if (!trimmed) continue;

    const video = parseYouTubeUrl(trimmed);
    if (!video) {
      throw new FormError(`Neispravan YouTube link: ${trimmed}`);
    }

    if (seen.has(video.videoId)) continue;
    seen.add(video.videoId);
    videos.push(video);
  }

  if (videos.length > MAX_VIDEOS_PER_POST) {
    throw new FormError(`Možete dodati najviše ${MAX_VIDEOS_PER_POST} videa.`);
  }

  return videos;
}

export async function reconcilePostVideos(tx: TxClient, postId: string, videos: ParsedVideo[]) {
  await tx.postVideo.deleteMany({ where: { postId } });
  if (videos.length === 0) return;

  await Promise.all(
    videos.map((video, index) =>
      tx.postVideo.create({
        data: {
          postId,
          provider: video.provider,
          providerId: video.videoId,
          url: video.url,
          position: index,
        },
      }),
    ),
  );
}
