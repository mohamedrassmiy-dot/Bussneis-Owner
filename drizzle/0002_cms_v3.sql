CREATE TABLE IF NOT EXISTS `cms_pages` (
`id` int AUTO_INCREMENT PRIMARY KEY,
`content_key` varchar(120) NOT NULL,
`locale` enum('ar','en') NOT NULL,
`slug` varchar(180) NOT NULL,
`title` varchar(300) NOT NULL,
`summary` text,
`featured_image` text,
`image_alt` varchar(300),
`sections` json NOT NULL,
`seo_title` varchar(300),
`seo_description` text,
`canonical_url` text,
`robots` varchar(100) DEFAULT 'index,follow',
`og_image` text,
`schema_json` text,
`status` enum('draft','published') NOT NULL DEFAULT 'draft',
`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
UNIQUE KEY `cms_pages_locale_slug_unique` (`locale`,`slug`),
UNIQUE KEY `cms_pages_key_locale_unique` (`content_key`,`locale`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cms_posts` (
`id` int AUTO_INCREMENT PRIMARY KEY,
`content_key` varchar(120) NOT NULL,
`locale` enum('ar','en') NOT NULL,
`slug` varchar(180) NOT NULL,
`title` varchar(300) NOT NULL,
`excerpt` text NOT NULL,
`body` text NOT NULL,
`category` varchar(120),
`featured_image` text,
`image_alt` varchar(300),
`embeds` json,
`seo_title` varchar(300),
`seo_description` text,
`canonical_url` text,
`robots` varchar(100) DEFAULT 'index,follow',
`og_image` text,
`schema_json` text,
`status` enum('draft','published') NOT NULL DEFAULT 'draft',
`published_at` timestamp NULL,
`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
UNIQUE KEY `cms_posts_locale_slug_unique` (`locale`,`slug`),
UNIQUE KEY `cms_posts_key_locale_unique` (`content_key`,`locale`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cms_settings` (
`key` varchar(120) PRIMARY KEY,
`value` text NOT NULL,
`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
