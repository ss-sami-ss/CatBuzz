import { sql } from "drizzle-orm";
import { index, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, tstz } from "./_shared";
import { cats } from "./cats";
import { conversationKind, moderationState, postVisibility } from "./enums";
import { groups, users } from "./identity";

export const posts = pgTable(
  "posts",
  {
    id: id(),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    catId: uuid().references(() => cats.id),
    groupId: uuid().references(() => groups.id),
    body: text().notNull(),
    mediaIds: uuid().array().notNull().default(sql`'{}'::uuid[]`),
    visibility: postVisibility().notNull().default("public"),
    moderation: moderationState().notNull().default("visible"),
    createdAt: createdAt(),
  },
  (t) => [index("posts_feed_idx").on(t.createdAt.desc(), t.id)],
);

export const comments = pgTable("comments", {
  id: id(),
  postId: uuid()
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  authorId: uuid()
    .notNull()
    .references(() => users.id),
  body: text().notNull(),
  moderation: moderationState().notNull().default("visible"),
  createdAt: createdAt(),
});

export const reactions = pgTable(
  "reactions",
  {
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    type: text().notNull().default("like"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId, t.type] })],
);

export const conversations = pgTable("conversations", {
  id: id(),
  kind: conversationKind().notNull(),
  groupId: uuid().references(() => groups.id),
  createdAt: createdAt(),
});

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id),
    joinedAt: createdAt(),
    leftAt: tstz(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] })],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    authorId: uuid()
      .notNull()
      .references(() => users.id),
    /** Client-generated id for dedupe on reconnect/retry (T22). */
    clientMessageId: text().notNull(),
    body: text().notNull(),
    moderation: moderationState().notNull().default("visible"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("messages_client_id_key").on(t.conversationId, t.clientMessageId),
    index("messages_conversation_idx").on(t.conversationId, t.createdAt, t.id),
  ],
);
