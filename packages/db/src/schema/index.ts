import {
	boolean,
	integer,
	jsonb,
	pgTable,
	serial,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

export const githubUsers = pgTable("github_users", {
	id: serial("id").primaryKey(),
	username: varchar("username", { length: 255 }).notNull().unique(),
	avatarUrl: text("avatar_url"),
	name: text("name"),
	bio: text("bio"),
	publicRepos: integer("public_repos"),
	followers: integer("followers"),
	following: integer("following"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
	rawData: jsonb("raw_data"),
});

export const telegramChannels = pgTable("telegram_channels", {
	id: serial("id").primaryKey(),
	telegramId: varchar("telegram_id", { length: 255 }).notNull().unique(),
	username: varchar("username", { length: 255 }),
	title: text("title"),
	about: text("about"),
	participantsCount: integer("participants_count"),
	verified: boolean("verified").default(false),
	broadcast: boolean("broadcast").default(false),
	megagroup: boolean("megagroup").default(false),
	postCount: integer("post_count"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const comparisons = pgTable("comparisons", {
	id: serial("id").primaryKey(),
	githubUserId: integer("github_user_id").references(() => githubUsers.id),
	telegramChannelId: integer("telegram_channel_id").references(
		() => telegramChannels.id,
	),
	notes: text("notes"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type GithubUser = typeof githubUsers.$inferSelect;
export type NewGithubUser = typeof githubUsers.$inferInsert;
export type TelegramChannel = typeof telegramChannels.$inferSelect;
export type NewTelegramChannel = typeof telegramChannels.$inferInsert;
export type Comparison = typeof comparisons.$inferSelect;
export type NewComparison = typeof comparisons.$inferInsert;
