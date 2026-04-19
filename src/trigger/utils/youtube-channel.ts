import { Supadata } from "@supadata/js";
import { withRetry } from "./youtube";

export class YouTubeChannelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YouTubeChannelError";
  }
}

export type ChannelKind = "video" | "short" | "live";

export type ChannelVideoListing = {
  videoId: string;
  kind: ChannelKind;
};

export type ResolvedChannel = {
  channelId: string;
  handle?: string;
  title: string;
  thumbnail?: string;
};

export type ResolvedPlaylist = {
  playlistId: string;
  title: string;
  videoIds: string[];
};

function getClient(): Supadata {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new YouTubeChannelError(
      "SUPADATA_API_KEY is not set — cannot use YouTube channel sync"
    );
  }
  return new Supadata({ apiKey });
}

/**
 * Extracts a YouTube channel id (`UC…`), handle (`@foo`), custom name, or
 * bare id from a URL or raw string. Returns whichever value we found, which
 * Supadata will accept for the channel endpoint.
 */
export function parseChannelInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new YouTubeChannelError("Channel input is empty");

  // Pure channel id
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) return trimmed;
  // Handle like @grace
  if (/^@[a-zA-Z0-9._-]+$/.test(trimmed)) return trimmed;

  // youtube.com/channel/UCxxxx
  const idMatch = trimmed.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  if (idMatch) return idMatch[1];

  // youtube.com/@handle
  const handleMatch = trimmed.match(/youtube\.com\/(@[a-zA-Z0-9._-]+)/);
  if (handleMatch) return handleMatch[1];

  // youtube.com/c/customname or youtube.com/user/legacyname
  const customMatch = trimmed.match(/youtube\.com\/(?:c|user)\/([a-zA-Z0-9_-]+)/);
  if (customMatch) return `@${customMatch[1]}`;

  // Fall back: let Supadata try whatever we got.
  return trimmed;
}

/**
 * Parses a YouTube playlist input (full URL or bare PL… id) into the
 * playlist id Supadata expects.
 */
export function parsePlaylistInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new YouTubeChannelError("Playlist input is empty");
  if (/^PL[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/[?&]list=(PL[a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  throw new YouTubeChannelError(`Could not extract playlist id from: ${input}`);
}

export async function resolveChannel(
  channelInput: string
): Promise<ResolvedChannel> {
  const supadata = getClient();
  const id = parseChannelInput(channelInput);

  const channel = await withRetry(
    () => supadata.youtube.channel({ id }),
    { label: "Supadata channel" }
  );

  return {
    channelId: channel.id,
    handle: channel.handle,
    title: channel.name,
    thumbnail: channel.thumbnail,
  };
}

/**
 * Fetch every video on a channel, classified by kind. Supadata caps `limit`
 * at 5000 which is far more than any real church channel.
 */
export async function fetchChannelVideos(
  channelId: string,
  limit = 5000
): Promise<ChannelVideoListing[]> {
  const supadata = getClient();

  const result = await withRetry(
    () => supadata.youtube.channel.videos({ id: channelId, limit, type: "all" }),
    { label: "Supadata channel videos" }
  );

  const out: ChannelVideoListing[] = [];
  for (const id of result.videoIds ?? []) out.push({ videoId: id, kind: "video" });
  for (const id of result.shortIds ?? []) out.push({ videoId: id, kind: "short" });
  for (const id of result.liveIds ?? []) out.push({ videoId: id, kind: "live" });
  return out;
}

export async function resolvePlaylist(
  playlistInput: string,
  limit = 5000
): Promise<ResolvedPlaylist> {
  const supadata = getClient();
  const id = parsePlaylistInput(playlistInput);

  const [meta, videos] = await Promise.all([
    withRetry(() => supadata.youtube.playlist({ id }), {
      label: "Supadata playlist meta",
    }),
    withRetry(
      () => supadata.youtube.playlist.videos({ id, limit }),
      { label: "Supadata playlist videos" }
    ),
  ]);

  return {
    playlistId: meta.id,
    title: meta.title,
    videoIds: [
      ...(videos.videoIds ?? []),
      ...(videos.shortIds ?? []),
      ...(videos.liveIds ?? []),
    ],
  };
}

/**
 * Build a canonical YouTube URL appropriate for each kind. Matches the
 * patterns `extractVideoId()` understands so downstream `process-youtube`
 * doesn't care how the row got inserted.
 */
export function buildYouTubeUrl(videoId: string, kind: ChannelKind): string {
  if (kind === "short") return `https://www.youtube.com/shorts/${videoId}`;
  if (kind === "live") return `https://www.youtube.com/live/${videoId}`;
  return `https://www.youtube.com/watch?v=${videoId}`;
}
