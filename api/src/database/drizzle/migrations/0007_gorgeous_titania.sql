CREATE TYPE "public"."api_key_plan" AS ENUM('FREE', 'PRO', 'ENTERPRISE');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_prefix" varchar(20) NOT NULL,
	"hashed_key" varchar(64) NOT NULL,
	"plan" "api_key_plan" DEFAULT 'FREE' NOT NULL,
	"allowed_symbols" varchar(1000),
	"rate_limit_per_min" integer DEFAULT 60 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"endpoint" varchar(100) NOT NULL,
	"status_code" integer NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_logs" ADD CONSTRAINT "api_usage_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;