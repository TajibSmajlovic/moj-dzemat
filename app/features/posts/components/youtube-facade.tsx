import { useState } from "react";

import { Maximize2, Play } from "lucide-react";

import { youtubeEmbedUrl, youtubeThumbnailUrl } from "#app/features/posts/post-video";

export function YouTubeFacade({
  videoId,
  title,
  onExpand,
}: {
  videoId: string;
  title: string;
  onExpand?: () => void;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={youtubeEmbedUrl(videoId, { autoplay: true })}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl">
      <button
        type="button"
        aria-label={`Reprodukuj video: ${title}`}
        onClick={() => setPlaying(true)}
        className="group focus-visible:ring-ring relative block h-full w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        <img
          src={youtubeThumbnailUrl(videoId)}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="bg-background/90 text-foreground inline-flex h-14 w-14 items-center justify-center rounded-full shadow-md">
            <Play className="h-6 w-6 translate-x-0.5 fill-current" />
          </span>
        </span>
      </button>

      {onExpand ? (
        <button
          type="button"
          aria-label="Otvori video preko cijelog ekrana"
          onClick={onExpand}
          className="bg-background/90 text-foreground ring-border/60 absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm ring-1 backdrop-blur-sm"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Otvori preko cijelog ekrana</span>
        </button>
      ) : null}
    </div>
  );
}
