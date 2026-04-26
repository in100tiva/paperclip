ALTER TABLE "user" ADD COLUMN "locale" text DEFAULT 'pt-BR' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_locale_check" CHECK ("locale" IN ('pt-BR', 'en-US'));
