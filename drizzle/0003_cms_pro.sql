ALTER TABLE `leads`
  MODIFY COLUMN `status` ENUM('new','contacted','qualified','proposal','won','lost','closed') NOT NULL DEFAULT 'new',
  ADD COLUMN `source` VARCHAR(100) DEFAULT 'website',
  ADD COLUMN `notes` TEXT NULL,
  ADD COLUMN `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cms_redirects` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `source_path` VARCHAR(250) NOT NULL UNIQUE,
 `destination` VARCHAR(2048) NOT NULL,
 `type` ENUM('301','302') NOT NULL DEFAULT '301',
 `active` INT NOT NULL DEFAULT 1,
 `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cms_media` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `file_key` VARCHAR(150) NOT NULL UNIQUE,
 `public_url` TEXT NOT NULL,
 `original_name` VARCHAR(220),
 `mime` VARCHAR(80) NOT NULL,
 `bytes` INT NOT NULL,
 `alt` VARCHAR(300),
 `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cms_audit_events` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `action` VARCHAR(80) NOT NULL,
 `subject` VARCHAR(250),
 `details` TEXT,
 `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cms_security_events` (
 `id` INT AUTO_INCREMENT PRIMARY KEY,
 `action` VARCHAR(80) NOT NULL,
 `ip_fingerprint` VARCHAR(64) NOT NULL,
 `user_agent` VARCHAR(300),
 `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
