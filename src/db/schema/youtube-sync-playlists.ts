import {
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { youtubeChannelSyncs } from "./youtube-channel-syncs";
import { folders } from "./folders";

export const youtubeSyncPlaylists = pgTable(
  "youtube_sync_playlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    syncId: uuid("sync_id")
      .notNull()
      .references(() => youtubeChannelSyncs.id, { onDelete: "cascade" }),
    playlistId: text("playlist_id").notNull(),
    playlistTitle: text("playlist_title"),
    folderId: uuid("folder_id").references(() => folders.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.syncId, table.playlistId)]
);

export const youtubeSyncPlaylistsRelations = relations(
  youtubeSyncPlaylists,
  ({ one }) => ({
    sync: one(youtubeChannelSyncs, {
      fields: [youtubeSyncPlaylists.syncId],
      references: [youtubeChannelSyncs.id],
    }),
    folder: one(folders, {
      fields: [youtubeSyncPlaylists.folderId],
      references: [folders.id],
    }),
  })
);
