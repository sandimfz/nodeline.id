CREATE TYPE "public"."payment_method_type" AS ENUM('bank_transfer', 'qris');--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "payment_method_type" NOT NULL,
	"name" varchar(200) NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"account_number" varchar(50),
	"account_name" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
