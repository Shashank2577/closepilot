ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "proposal_sent_at" timestamp;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "outreach_sent_at" timestamp;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "meeting_booked_at" timestamp;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "meeting_datetime" timestamp;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "calendar_event_id" varchar(255);
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "follow_up_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "last_follow_up_at" timestamp;
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "last_activity_at" timestamp;
