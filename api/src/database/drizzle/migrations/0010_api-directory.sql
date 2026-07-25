CREATE TYPE "public"."api_service_pricing_type" AS ENUM('FREE', 'FREEMIUM', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."api_service_status" AS ENUM('ACTIVE', 'MAINTENANCE', 'DEPRECATED');--> statement-breakpoint
CREATE TYPE "public"."api_subscription_status" AS ENUM('ACTIVE', 'CANCELLED', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "api_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"short_description" varchar(300),
	"category" varchar(50) NOT NULL,
	"base_url" varchar(500) NOT NULL,
	"logo_url" varchar(500),
	"pricing_type" "api_service_pricing_type" DEFAULT 'FREE' NOT NULL,
	"status" "api_service_status" DEFAULT 'ACTIVE' NOT NULL,
	"version" varchar(20) DEFAULT 'v1' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "api_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"method" varchar(10) NOT NULL,
	"path" varchar(200) NOT NULL,
	"summary" varchar(300),
	"description" text,
	"request_example" jsonb,
	"response_example" jsonb,
	"is_premium" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL,
	"requests_per_day" integer,
	"requests_per_minute" integer DEFAULT 60 NOT NULL,
	"features" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "api_subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"quota_used_today" integer DEFAULT 0 NOT NULL,
	"quota_reset_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"cancelled_at" timestamp,
	CONSTRAINT "api_subscriptions_key_service_unique" UNIQUE("api_key_id","service_id")
);
--> statement-breakpoint
ALTER TABLE "api_endpoints" ADD CONSTRAINT "api_endpoints_service_id_api_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."api_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_plans" ADD CONSTRAINT "api_plans_service_id_api_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."api_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_subscriptions" ADD CONSTRAINT "api_subscriptions_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_subscriptions" ADD CONSTRAINT "api_subscriptions_service_id_api_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."api_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_subscriptions" ADD CONSTRAINT "api_subscriptions_plan_id_api_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."api_plans"("id") ON DELETE no action ON UPDATE no action;