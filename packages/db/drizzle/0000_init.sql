CREATE TABLE IF NOT EXISTS "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage" varchar(50) DEFAULT 'ingestion' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"lead_email" varchar(255) NOT NULL,
	"lead_name" varchar(255) NOT NULL,
	"lead_company" varchar(255),
	"lead_title" varchar(255),
	"thread_id" varchar(255),
	"initial_email_id" varchar(255),
	"company_research" text,
	"prospect_research" text,
	"project_scope" text,
	"proposal" text,
	"proposal_document_id" varchar(255),
	"crm_id" varchar(255),
	"crm_synced_at" timestamp,
	"source" varchar(50) NOT NULL,
	"assigned_agent" varchar(255),
	"approval_status" varchar(50)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"industry" varchar(100),
	"service_type" varchar(100),
	"complexity" varchar(20),
	"timeline" varchar(100),
	"budget" varchar(100),
	"keywords" text,
	"features" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"deal_id" integer NOT NULL,
	"agent_type" varchar(50) NOT NULL,
	"activity_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"deal_id" integer NOT NULL,
	"template_id" varchar(255),
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"drive_id" varchar(255),
	"drive_url" text,
	"values" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"deal_id" integer NOT NULL,
	"approver_email" varchar(255) NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"item_id" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"request_comment" text,
	"response_comment" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "approvals" ADD CONSTRAINT "approvals_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
