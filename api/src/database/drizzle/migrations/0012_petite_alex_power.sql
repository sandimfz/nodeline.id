CREATE TYPE "public"."subscription_order_status" AS ENUM('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "subscription_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_order_status" DEFAULT 'PENDING_PAYMENT' NOT NULL,
	"total_cents" integer NOT NULL,
	"payment_proof_url" varchar(500),
	"payment_note" text,
	"cancellation_note" text,
	"confirmed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_service_id_api_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."api_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_plan_id_api_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."api_plans"("id") ON DELETE no action ON UPDATE no action;