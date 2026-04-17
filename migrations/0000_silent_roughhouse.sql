CREATE TABLE `handmade_info` (
	`item_id` text PRIMARY KEY NOT NULL,
	`production_start` text,
	`production_end` text,
	`notes` text,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `item_materials` (
	`item_id` text NOT NULL,
	`material_id` text NOT NULL,
	PRIMARY KEY(`item_id`, `material_id`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `item_tags` (
	`item_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`item_id`, `tag_id`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`series` text,
	`is_handmade` integer,
	`is_public` integer DEFAULT 0 NOT NULL,
	`purchase_info_public` integer DEFAULT 0 NOT NULL,
	`handmade_info_public` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'owned' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_preset` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `materials_name_unique` ON `materials` (`name`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`r2_key_orig` text NOT NULL,
	`r2_key_thumb` text NOT NULL,
	`is_cover` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `purchase_info` (
	`item_id` text PRIMARY KEY NOT NULL,
	`store_name` text,
	`event_name` text,
	`purchase_date` text,
	`purchase_price` integer,
	`maker` text,
	`artist_name` text,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);

-- プリセット素材データ
INSERT INTO materials (id, name, is_preset) VALUES
  (lower(hex(randomblob(16))), '石粉粘土', 1),
  (lower(hex(randomblob(16))), 'エポキシパテ', 1),
  (lower(hex(randomblob(16))), 'スカルピー', 1),
  (lower(hex(randomblob(16))), 'レジン', 1),
  (lower(hex(randomblob(16))), 'ポリパテ', 1),
  (lower(hex(randomblob(16))), 'プラ板', 1),
  (lower(hex(randomblob(16))), '真鍮線', 1),
  (lower(hex(randomblob(16))), 'エアブラシ', 1),
  (lower(hex(randomblob(16))), '筆塗り', 1),
  (lower(hex(randomblob(16))), '缶スプレー', 1),
  (lower(hex(randomblob(16))), '水性アクリル塗料', 1),
  (lower(hex(randomblob(16))), 'Mr.カラー', 1),
  (lower(hex(randomblob(16))), 'ラッカー塗料', 1),
  (lower(hex(randomblob(16))), 'ウォッシング', 1),
  (lower(hex(randomblob(16))), 'デカール', 1),
  (lower(hex(randomblob(16))), '3Dプリンター', 1),
  (lower(hex(randomblob(16))), 'ルーター', 1);