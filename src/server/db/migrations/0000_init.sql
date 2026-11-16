-- Extensions first: tables below use PostGIS geometry; btree_gist backs the placement exclusion constraint (0001).
CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('submitted', 'reviewing', 'accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."assignment_status" AS ENUM('accepted', 'withdrawn', 'completed', 'removed');--> statement-breakpoint
CREATE TYPE "public"."capability" AS ENUM('feeding', 'transport', 'foster', 'trapping', 'fundraising', 'photography', 'medication');--> statement-breakpoint
CREATE TYPE "public"."care_category" AS ENUM('feeding', 'medication', 'vaccination', 'sterilization', 'treatment', 'observation', 'other');--> statement-breakpoint
CREATE TYPE "public"."care_mode" AS ENUM('host_home', 'home_visit');--> statement-breakpoint
CREATE TYPE "public"."caregiver_profile_status" AS ENUM('draft', 'pending_review', 'published', 'rejected', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."cat_age" AS ENUM('kitten', 'young', 'adult', 'senior', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."cat_custody" AS ENUM('street', 'owned');--> statement-breakpoint
CREATE TYPE "public"."cat_lifecycle" AS ENUM('active', 'missing', 'adopted', 'deceased', 'merged');--> statement-breakpoint
CREATE TYPE "public"."cat_need" AS ENUM('urgent', 'medical', 'food_water', 'adoption');--> statement-breakpoint
CREATE TYPE "public"."cat_sex" AS ENUM('female', 'male', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."claim_status" AS ENUM('open', 'reviewing', 'approved', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."contact_scope" AS ENUM('address', 'phone', 'location');--> statement-breakpoint
CREATE TYPE "public"."conversation_kind" AS ENUM('group', 'private');--> statement-breakpoint
CREATE TYPE "public"."counseling_status" AS ENUM('submitted', 'awaiting_consent', 'assigned', 'closed', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."credential_status" AS ENUM('pending', 'verified', 'rejected', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'failed', 'dead');--> statement-breakpoint
CREATE TYPE "public"."expense_review_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."fundraiser_status" AS ENUM('draft', 'pending_review', 'published', 'closed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."group_scope" AS ENUM('public', 'local');--> statement-breakpoint
CREATE TYPE "public"."group_visibility" AS ENUM('open', 'request', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."help_request_status" AS ENUM('open', 'triaged', 'in_progress', 'resolved', 'closed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."listing_kind" AS ENUM('permanent', 'foster');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('draft', 'open', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "public"."location_precision" AS ENUM('exact', 'approximate');--> statement-breakpoint
CREATE TYPE "public"."lost_found_type" AS ENUM('lost', 'found');--> statement-breakpoint
CREATE TYPE "public"."media_status" AS ENUM('quarantine', 'processing', 'ready', 'rejected', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."media_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('member', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('requested', 'active', 'left', 'removed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."mission_status" AS ENUM('open', 'full', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."mission_type" AS ENUM('transport', 'feeding', 'vet_visit', 'trapping', 'foster', 'medication', 'other');--> statement-breakpoint
CREATE TYPE "public"."moderation_report_status" AS ENUM('open', 'reviewing', 'actioned', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."moderation_state" AS ENUM('visible', 'pending', 'hidden', 'removed');--> statement-breakpoint
CREATE TYPE "public"."moderation_target" AS ENUM('user', 'cat', 'post', 'comment', 'message', 'fundraiser', 'expense', 'caregiver_profile', 'placement', 'placement_review', 'placement_report');--> statement-breakpoint
CREATE TYPE "public"."money_target_kind" AS ENUM('cat', 'mission', 'colony', 'placement');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'push', 'sms');--> statement-breakpoint
CREATE TYPE "public"."occurrence_status" AS ENUM('scheduled', 'done', 'skipped', 'missed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "public"."placement_kind" AS ENUM('permanent', 'foster', 'sitting');--> statement-breakpoint
CREATE TYPE "public"."placement_outcome" AS ENUM('returned', 'adopted', 'transferred', 'terminated_early');--> statement-breakpoint
CREATE TYPE "public"."placement_request_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."placement_status" AS ENUM('accepted', 'in_care', 'ended', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."post_visibility" AS ENUM('public', 'group', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."profession" AS ENUM('veterinarian', 'vet_technician', 'counselor');--> statement-breakpoint
CREATE TYPE "public"."record_source" AS ENUM('volunteer', 'owner', 'vet');--> statement-breakpoint
CREATE TYPE "public"."record_visibility" AS ENUM('public_summary', 'private');--> statement-breakpoint
CREATE TYPE "public"."relationship_type" AS ENUM('mother_of', 'sibling_of');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'published', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."service_kind" AS ENUM('foster', 'sitting');--> statement-breakpoint
CREATE TYPE "public"."urgency" AS ENUM('low', 'normal', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending_activation', 'active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "group_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"status" "membership_status" DEFAULT 'requested' NOT NULL,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"scope" "group_scope" NOT NULL,
	"visibility" "group_visibility" DEFAULT 'open' NOT NULL,
	"area_cell_id" text,
	"created_by" uuid NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professional_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"profession" "profession" NOT NULL,
	"evidence_media_id" uuid,
	"status" "credential_status" DEFAULT 'pending' NOT NULL,
	"verified_by" uuid,
	"verified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credential_verified_has_verifier" CHECK ("professional_credentials"."status" <> 'verified' OR ("professional_credentials"."verified_by" IS NOT NULL AND "professional_credentials"."verified_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "user_private" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"verified_email" text,
	"verified_phone" text,
	"consent_version" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text,
	"normalized_username" text,
	"status" "user_status" DEFAULT 'pending_activation' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_normalized" CHECK ("users"."normalized_username" IS NULL OR "users"."normalized_username" = lower("users"."username"))
);
--> statement-breakpoint
CREATE TABLE "volunteer_capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"capability" "capability" NOT NULL,
	"availability" text,
	"area_cell_id" text,
	"area_center" geometry(point),
	"capacity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "volunteer_capacity_positive" CHECK ("volunteer_capabilities"."capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" text,
	"status" "media_status" DEFAULT 'quarantine' NOT NULL,
	"visibility" "media_visibility" DEFAULT 'private' NOT NULL,
	"derived_from" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_size_positive" CHECK ("media"."size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "cat_media" (
	"cat_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cat_media_cat_id_media_id_pk" PRIMARY KEY("cat_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "cat_names" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cat_id" uuid NOT NULL,
	"name" text NOT NULL,
	"chosen_by" uuid,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cat_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_cat_id" uuid NOT NULL,
	"to_cat_id" uuid NOT NULL,
	"type" "relationship_type" NOT NULL,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cat_relationship_not_self" CHECK ("cat_relationships"."from_cat_id" <> "cat_relationships"."to_cat_id")
);
--> statement-breakpoint
CREATE TABLE "cats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"current_name" text,
	"sex" "cat_sex" DEFAULT 'unknown' NOT NULL,
	"age_estimate" "cat_age" DEFAULT 'unknown' NOT NULL,
	"markings" text,
	"lifecycle" "cat_lifecycle" DEFAULT 'active' NOT NULL,
	"custody" "cat_custody" DEFAULT 'street' NOT NULL,
	"owner_user_id" uuid,
	"canonical_cat_id" uuid,
	"needs" "cat_need"[] DEFAULT '{}'::cat_need[] NOT NULL,
	"public_cell_id" text,
	"public_area_label" text,
	"last_seen_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cats_owned_has_owner" CHECK (("cats"."custody" = 'owned') = ("cats"."owner_user_id" IS NOT NULL)),
	CONSTRAINT "cats_merged_has_canonical" CHECK (("cats"."lifecycle" = 'merged') = ("cats"."canonical_cat_id" IS NOT NULL)),
	CONSTRAINT "cats_not_own_canonical" CHECK ("cats"."canonical_cat_id" IS NULL OR "cats"."canonical_cat_id" <> "cats"."id")
);
--> statement-breakpoint
CREATE TABLE "colonies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"public_cell_id" text,
	"public_area_label" text,
	"location" geometry(point),
	"created_by" uuid NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "colony_caretakers" (
	"colony_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"since" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colony_caretakers_colony_id_user_id_pk" PRIMARY KEY("colony_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "colony_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"colony_id" uuid NOT NULL,
	"cat_id" uuid NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colony_membership_range" CHECK ("colony_memberships"."valid_to" IS NULL OR "colony_memberships"."valid_to" > "colony_memberships"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "name_poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "name_poll_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"voted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "name_polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cat_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"close_at" timestamp with time zone NOT NULL,
	"chosen_option_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sightings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cat_id" uuid,
	"observer_id" uuid NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"precision" "location_precision" NOT NULL,
	"location" geometry(point) NOT NULL,
	"public_cell_id" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "care_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cat_id" uuid,
	"colony_id" uuid,
	"author_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"category" "care_category" NOT NULL,
	"note" text,
	"visibility" "record_visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "care_log_has_target" CHECK ("care_logs"."cat_id" IS NOT NULL OR "care_logs"."colony_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "clinic_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"public_address" text NOT NULL,
	"location" geometry(point) NOT NULL,
	"timezone" text DEFAULT 'Asia/Tehran' NOT NULL,
	"opening_hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"public_phone" text,
	"contact_consent" text,
	"verified_status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cat_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"source" "record_source" NOT NULL,
	"category" "care_category" NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"public_summary" text,
	"visibility" "record_visibility" DEFAULT 'private' NOT NULL,
	"vet_confirmed_by" uuid,
	"vet_confirmed_at" timestamp with time zone,
	"amends_record_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_record_confirmation_pair" CHECK (("health_records"."vet_confirmed_by" IS NULL) = ("health_records"."vet_confirmed_at" IS NULL)),
	CONSTRAINT "health_record_not_self_amend" CHECK ("health_records"."amends_record_id" IS NULL OR "health_records"."amends_record_id" <> "health_records"."id")
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'volunteer' NOT NULL,
	"status" "assignment_status" DEFAULT 'accepted' NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "help_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cat_id" uuid,
	"colony_id" uuid,
	"reporter_id" uuid NOT NULL,
	"need_type" text NOT NULL,
	"urgency" "urgency" DEFAULT 'normal' NOT NULL,
	"status" "help_request_status" DEFAULT 'open' NOT NULL,
	"description" text,
	"triage_owner_id" uuid,
	"deadline_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"resolution_note" text,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "help_request_has_target" CHECK ("help_requests"."cat_id" IS NOT NULL OR "help_requests"."colony_id" IS NOT NULL),
	CONSTRAINT "help_request_resolved_has_note" CHECK ("help_requests"."status" <> 'resolved' OR ("help_requests"."resolved_at" IS NOT NULL AND "help_requests"."resolution_note" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "mission_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"event" text NOT NULL,
	"note" text,
	"evidence_media_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"help_request_id" uuid,
	"type" "mission_type" NOT NULL,
	"status" "mission_status" DEFAULT 'open' NOT NULL,
	"capacity" integer DEFAULT 1 NOT NULL,
	"accepted_count" integer DEFAULT 0 NOT NULL,
	"required_capability" "capability",
	"area_cell_id" text,
	"due_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mission_capacity_positive" CHECK ("missions"."capacity" > 0),
	CONSTRAINT "mission_accepted_within_capacity" CHECK ("missions"."accepted_count" >= 0 AND "missions"."accepted_count" <= "missions"."capacity")
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_kind" "money_target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"fundraiser_id" uuid,
	"payer_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'IRR' NOT NULL,
	"category" text NOT NULL,
	"incurred_at" timestamp with time zone NOT NULL,
	"original_invoice_media_id" uuid,
	"redacted_invoice_media_id" uuid,
	"review_status" "expense_review_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_amount_positive" CHECK ("expenses"."amount_minor" > 0),
	CONSTRAINT "expense_currency_iso" CHECK ("expenses"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "expense_independent_reviewer" CHECK ("expenses"."reviewed_by" IS NULL OR "expenses"."reviewed_by" <> "expenses"."payer_id")
);
--> statement-breakpoint
CREATE TABLE "fundraisers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_kind" "money_target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"recipient_description" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"currency" text DEFAULT 'IRR' NOT NULL,
	"goal_minor" bigint NOT NULL,
	"excess_policy" text NOT NULL,
	"status" "fundraiser_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fundraiser_goal_positive" CHECK ("fundraisers"."goal_minor" > 0),
	CONSTRAINT "fundraiser_currency_iso" CHECK ("fundraisers"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "in_kind_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pledge_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"evidence_media_id" uuid,
	CONSTRAINT "in_kind_delivery_quantity_positive" CHECK ("in_kind_deliveries"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "in_kind_pledges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_kind" "money_target_kind" NOT NULL,
	"target_id" uuid NOT NULL,
	"donor_id" uuid NOT NULL,
	"item" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" text NOT NULL,
	"status" text DEFAULT 'pledged' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "in_kind_quantity_positive" CHECK ("in_kind_pledges"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"moderation" "moderation_state" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "conversation_participants_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "conversation_kind" NOT NULL,
	"group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"client_message_id" text NOT NULL,
	"body" text NOT NULL,
	"moderation" "moderation_state" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"cat_id" uuid,
	"group_id" uuid,
	"body" text NOT NULL,
	"media_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"visibility" "post_visibility" DEFAULT 'public' NOT NULL,
	"moderation" "moderation_state" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text DEFAULT 'like' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_user_id_post_id_type_pk" PRIMARY KEY("user_id","post_id","type")
);
--> statement-breakpoint
CREATE TABLE "adoption_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"applicant_id" uuid NOT NULL,
	"private_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "application_status" DEFAULT 'submitted' NOT NULL,
	"decision_reason_private" text,
	"reviewed_by" uuid,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adoption_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cat_id" uuid NOT NULL,
	"kind" "listing_kind" NOT NULL,
	"status" "listing_status" DEFAULT 'draft' NOT NULL,
	"description" text,
	"created_by" uuid NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caregiver_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"from_date" date,
	"to_date" date,
	"weekly_pattern" jsonb,
	"timezone" text DEFAULT 'Asia/Tehran' NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "caregiver_availability_shape" CHECK (("caregiver_availability"."from_date" IS NOT NULL AND "caregiver_availability"."to_date" IS NOT NULL AND "caregiver_availability"."to_date" >= "caregiver_availability"."from_date") OR "caregiver_availability"."weekly_pattern" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "caregiver_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"service_kinds" "service_kind"[] NOT NULL,
	"modes" "care_mode"[] NOT NULL,
	"public_cell_id" text,
	"public_area_label" text,
	"location" geometry(point),
	"capacity" integer DEFAULT 1 NOT NULL,
	"pricing_type" text DEFAULT 'free' NOT NULL,
	"price_minor" integer,
	"currency" text,
	"price_unit" text,
	"home_conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"bio" text,
	"status" "caregiver_profile_status" DEFAULT 'draft' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_reason" text,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "caregiver_capacity_range" CHECK ("caregiver_profiles"."capacity" BETWEEN 1 AND 10),
	CONSTRAINT "caregiver_kinds_not_empty" CHECK (cardinality("caregiver_profiles"."service_kinds") > 0 AND cardinality("caregiver_profiles"."modes") > 0),
	CONSTRAINT "caregiver_pricing_shape" CHECK (("caregiver_profiles"."pricing_type" = 'free' AND "caregiver_profiles"."price_minor" IS NULL) OR ("caregiver_profiles"."pricing_type" = 'paid' AND "caregiver_profiles"."price_minor" > 0 AND "caregiver_profiles"."currency" ~ '^[A-Z]{3}$' AND "caregiver_profiles"."price_unit" IN ('per_day', 'per_visit')))
);
--> statement-breakpoint
CREATE TABLE "contact_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"grantee_id" uuid NOT NULL,
	"subject_user_id" uuid NOT NULL,
	"resource_kind" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"scope" "contact_scope" NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_to" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_grant_range" CHECK ("contact_grants"."valid_to" IS NULL OR "contact_grants"."valid_to" > "contact_grants"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "lost_found_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "lost_found_type" NOT NULL,
	"cat_id" uuid,
	"reporter_id" uuid NOT NULL,
	"description" text NOT NULL,
	"last_seen_at" timestamp with time zone,
	"public_cell_id" text,
	"media_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ownership_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cat_id" uuid NOT NULL,
	"claimant_id" uuid NOT NULL,
	"proof_media_id" uuid,
	"private_note" text,
	"status" "claim_status" DEFAULT 'open' NOT NULL,
	"reviewed_by" uuid,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placement_cats" (
	"placement_id" uuid NOT NULL,
	"cat_id" uuid NOT NULL,
	"period" daterange NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "placement_cats_placement_id_cat_id_pk" PRIMARY KEY("placement_id","cat_id")
);
--> statement-breakpoint
CREATE TABLE "placement_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"report_date" date NOT NULL,
	"timezone" text DEFAULT 'Asia/Tehran' NOT NULL,
	"note" text,
	"checklist" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"media_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"amends_report_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placement_request_cats" (
	"request_id" uuid NOT NULL,
	"cat_id" uuid NOT NULL,
	CONSTRAINT "placement_request_cats_request_id_cat_id_pk" PRIMARY KEY("request_id","cat_id")
);
--> statement-breakpoint
CREATE TABLE "placement_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"caregiver_profile_id" uuid NOT NULL,
	"kind" "service_kind" NOT NULL,
	"mode" "care_mode" NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"note" text,
	"status" "placement_request_status" DEFAULT 'pending' NOT NULL,
	"respond_by" timestamp with time zone,
	"decline_reason_private" text,
	"idempotency_key" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_request_range" CHECK ("placement_requests"."to_date" > "placement_requests"."from_date")
);
--> statement-breakpoint
CREATE TABLE "placement_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"subject_user_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"body" text,
	"status" "review_status" DEFAULT 'pending' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_review_rating_range" CHECK ("placement_reviews"."rating" BETWEEN 1 AND 5),
	CONSTRAINT "placement_review_not_self" CHECK ("placement_reviews"."author_id" <> "placement_reviews"."subject_user_id")
);
--> statement-breakpoint
CREATE TABLE "placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "placement_kind" NOT NULL,
	"mode" "care_mode",
	"application_id" uuid,
	"request_id" uuid,
	"caregiver_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date,
	"caregiver_handover_at" timestamp with time zone,
	"requester_handover_at" timestamp with time zone,
	"status" "placement_status" DEFAULT 'accepted' NOT NULL,
	"end_outcome" "placement_outcome",
	"ended_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "placement_single_origin" CHECK (("placements"."application_id" IS NULL) <> ("placements"."request_id" IS NULL)),
	CONSTRAINT "placement_range" CHECK ("placements"."to_date" IS NULL OR "placements"."to_date" > "placements"."from_date"),
	CONSTRAINT "placement_ended_has_outcome" CHECK (("placements"."status" = 'ended') = ("placements"."end_outcome" IS NOT NULL)),
	CONSTRAINT "placement_in_care_after_handover" CHECK ("placements"."status" NOT IN ('in_care', 'ended') OR ("placements"."caregiver_handover_at" IS NOT NULL AND "placements"."requester_handover_at" IS NOT NULL)),
	CONSTRAINT "placement_parties_differ" CHECK ("placements"."caregiver_id" <> "placements"."requester_id")
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	CONSTRAINT "delivery_attempts_non_negative" CHECK ("notification_deliveries"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "occurrence_status" DEFAULT 'scheduled' NOT NULL,
	"assignee_id" uuid,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Tehran' NOT NULL,
	"recurrence" text NOT NULL,
	"local_time" time NOT NULL,
	"starts_on" timestamp with time zone NOT NULL,
	"ends_on" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"attempted_at" timestamp with time zone NOT NULL,
	"outcome" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counseling_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"counselor_id" uuid NOT NULL,
	"consent_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "counseling_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"subject_user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"policy_version" text NOT NULL,
	"granted_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"evidence" text,
	CONSTRAINT "consent_revoked_after_grant" CHECK ("counseling_consents"."revoked_at" IS NULL OR "counseling_consents"."revoked_at" >= "counseling_consents"."granted_at")
);
--> statement-breakpoint
CREATE TABLE "counseling_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"subject_user_id" uuid,
	"topic" text NOT NULL,
	"description_private" text,
	"status" "counseling_status" DEFAULT 'submitted' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"resource_kind" text NOT NULL,
	"resource_id" uuid,
	"request_id" text,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid NOT NULL,
	"target_kind" "moderation_target" NOT NULL,
	"target_id" uuid NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"status" "moderation_report_status" DEFAULT 'open' NOT NULL,
	"moderator_id" uuid,
	"decision_reason" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"event_version" integer DEFAULT 1 NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_memberships" ADD CONSTRAINT "group_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional_credentials" ADD CONSTRAINT "professional_credentials_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_private" ADD CONSTRAINT "user_private_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_capabilities" ADD CONSTRAINT "volunteer_capabilities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_derived_from_media_id_fk" FOREIGN KEY ("derived_from") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_media" ADD CONSTRAINT "cat_media_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_media" ADD CONSTRAINT "cat_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_names" ADD CONSTRAINT "cat_names_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_names" ADD CONSTRAINT "cat_names_chosen_by_users_id_fk" FOREIGN KEY ("chosen_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_relationships" ADD CONSTRAINT "cat_relationships_from_cat_id_cats_id_fk" FOREIGN KEY ("from_cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_relationships" ADD CONSTRAINT "cat_relationships_to_cat_id_cats_id_fk" FOREIGN KEY ("to_cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cat_relationships" ADD CONSTRAINT "cat_relationships_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cats" ADD CONSTRAINT "cats_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cats" ADD CONSTRAINT "cats_canonical_cat_id_cats_id_fk" FOREIGN KEY ("canonical_cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cats" ADD CONSTRAINT "cats_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colonies" ADD CONSTRAINT "colonies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colony_caretakers" ADD CONSTRAINT "colony_caretakers_colony_id_colonies_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colonies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colony_caretakers" ADD CONSTRAINT "colony_caretakers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colony_memberships" ADD CONSTRAINT "colony_memberships_colony_id_colonies_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colonies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colony_memberships" ADD CONSTRAINT "colony_memberships_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colony_memberships" ADD CONSTRAINT "colony_memberships_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "name_poll_options" ADD CONSTRAINT "name_poll_options_poll_id_name_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."name_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "name_poll_votes" ADD CONSTRAINT "name_poll_votes_poll_id_name_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."name_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "name_poll_votes" ADD CONSTRAINT "name_poll_votes_option_id_name_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."name_poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "name_poll_votes" ADD CONSTRAINT "name_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "name_polls" ADD CONSTRAINT "name_polls_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "name_polls" ADD CONSTRAINT "name_polls_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sightings" ADD CONSTRAINT "sightings_observer_id_users_id_fk" FOREIGN KEY ("observer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_logs" ADD CONSTRAINT "care_logs_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_logs" ADD CONSTRAINT "care_logs_colony_id_colonies_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colonies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_logs" ADD CONSTRAINT "care_logs_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_staff" ADD CONSTRAINT "clinic_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_vet_confirmed_by_users_id_fk" FOREIGN KEY ("vet_confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_amends_record_id_health_records_id_fk" FOREIGN KEY ("amends_record_id") REFERENCES "public"."health_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_colony_id_colonies_id_fk" FOREIGN KEY ("colony_id") REFERENCES "public"."colonies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_requests" ADD CONSTRAINT "help_requests_triage_owner_id_users_id_fk" FOREIGN KEY ("triage_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_updates" ADD CONSTRAINT "mission_updates_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_updates" ADD CONSTRAINT "mission_updates_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_help_request_id_help_requests_id_fk" FOREIGN KEY ("help_request_id") REFERENCES "public"."help_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fundraiser_id_fundraisers_id_fk" FOREIGN KEY ("fundraiser_id") REFERENCES "public"."fundraisers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_original_invoice_media_id_media_id_fk" FOREIGN KEY ("original_invoice_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_redacted_invoice_media_id_media_id_fk" FOREIGN KEY ("redacted_invoice_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fundraisers" ADD CONSTRAINT "fundraisers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_kind_deliveries" ADD CONSTRAINT "in_kind_deliveries_pledge_id_in_kind_pledges_id_fk" FOREIGN KEY ("pledge_id") REFERENCES "public"."in_kind_pledges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_kind_deliveries" ADD CONSTRAINT "in_kind_deliveries_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_kind_deliveries" ADD CONSTRAINT "in_kind_deliveries_evidence_media_id_media_id_fk" FOREIGN KEY ("evidence_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_kind_pledges" ADD CONSTRAINT "in_kind_pledges_donor_id_users_id_fk" FOREIGN KEY ("donor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption_applications" ADD CONSTRAINT "adoption_applications_listing_id_adoption_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."adoption_listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption_applications" ADD CONSTRAINT "adoption_applications_applicant_id_users_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption_applications" ADD CONSTRAINT "adoption_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption_listings" ADD CONSTRAINT "adoption_listings_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption_listings" ADD CONSTRAINT "adoption_listings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_availability" ADD CONSTRAINT "caregiver_availability_profile_id_caregiver_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_profiles" ADD CONSTRAINT "caregiver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_profiles" ADD CONSTRAINT "caregiver_profiles_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_grants" ADD CONSTRAINT "contact_grants_grantee_id_users_id_fk" FOREIGN KEY ("grantee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_grants" ADD CONSTRAINT "contact_grants_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_reports" ADD CONSTRAINT "lost_found_reports_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_reports" ADD CONSTRAINT "lost_found_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_claims" ADD CONSTRAINT "ownership_claims_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_claims" ADD CONSTRAINT "ownership_claims_claimant_id_users_id_fk" FOREIGN KEY ("claimant_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_claims" ADD CONSTRAINT "ownership_claims_proof_media_id_media_id_fk" FOREIGN KEY ("proof_media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_claims" ADD CONSTRAINT "ownership_claims_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_cats" ADD CONSTRAINT "placement_cats_placement_id_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_cats" ADD CONSTRAINT "placement_cats_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_reports" ADD CONSTRAINT "placement_reports_placement_id_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_reports" ADD CONSTRAINT "placement_reports_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_request_cats" ADD CONSTRAINT "placement_request_cats_request_id_placement_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."placement_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_request_cats" ADD CONSTRAINT "placement_request_cats_cat_id_cats_id_fk" FOREIGN KEY ("cat_id") REFERENCES "public"."cats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_requests" ADD CONSTRAINT "placement_requests_caregiver_profile_id_caregiver_profiles_id_fk" FOREIGN KEY ("caregiver_profile_id") REFERENCES "public"."caregiver_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_reviews" ADD CONSTRAINT "placement_reviews_placement_id_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_reviews" ADD CONSTRAINT "placement_reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placement_reviews" ADD CONSTRAINT "placement_reviews_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_application_id_adoption_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."adoption_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_request_id_placement_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."placement_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_caregiver_id_users_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_schedule_id_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_assignment_id_counseling_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."counseling_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_assignments" ADD CONSTRAINT "counseling_assignments_request_id_counseling_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."counseling_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_assignments" ADD CONSTRAINT "counseling_assignments_counselor_id_users_id_fk" FOREIGN KEY ("counselor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_assignments" ADD CONSTRAINT "counseling_assignments_consent_id_counseling_consents_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."counseling_consents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_consents" ADD CONSTRAINT "counseling_consents_request_id_counseling_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."counseling_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_consents" ADD CONSTRAINT "counseling_consents_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_requests" ADD CONSTRAINT "counseling_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "counseling_requests" ADD CONSTRAINT "counseling_requests_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_moderator_id_users_id_fk" FOREIGN KEY ("moderator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_memberships_live_key" ON "group_memberships" USING btree ("group_id","user_id") WHERE "group_memberships"."status" IN ('requested', 'active');--> statement-breakpoint
CREATE INDEX "professional_credentials_user_idx" ON "professional_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_private_verified_email_key" ON "user_private" USING btree (lower("verified_email"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_normalized_username_key" ON "users" USING btree ("normalized_username");--> statement-breakpoint
CREATE UNIQUE INDEX "volunteer_capabilities_user_capability_key" ON "volunteer_capabilities" USING btree ("user_id","capability");--> statement-breakpoint
CREATE UNIQUE INDEX "media_storage_key_key" ON "media" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "media_owner_idx" ON "media" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cat_relationships_pair_key" ON "cat_relationships" USING btree ("from_cat_id","to_cat_id","type");--> statement-breakpoint
CREATE INDEX "cats_public_cell_idx" ON "cats" USING btree ("public_cell_id") WHERE "cats"."custody" = 'street' AND "cats"."lifecycle" = 'active';--> statement-breakpoint
CREATE INDEX "cats_last_seen_idx" ON "cats" USING btree ("last_seen_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE UNIQUE INDEX "colony_memberships_open_key" ON "colony_memberships" USING btree ("colony_id","cat_id") WHERE "colony_memberships"."valid_to" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "name_poll_options_poll_name_key" ON "name_poll_options" USING btree ("poll_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "name_poll_votes_poll_user_key" ON "name_poll_votes" USING btree ("poll_id","user_id");--> statement-breakpoint
CREATE INDEX "sightings_location_gist" ON "sightings" USING gist ("location");--> statement-breakpoint
CREATE INDEX "sightings_cat_observed_idx" ON "sightings" USING btree ("cat_id","observed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "care_logs_cat_idx" ON "care_logs" USING btree ("cat_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "clinics_location_gist" ON "clinics" USING gist ("location");--> statement-breakpoint
CREATE INDEX "health_records_cat_idx" ON "health_records" USING btree ("cat_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_active_key" ON "assignments" USING btree ("mission_id","user_id") WHERE "assignments"."status" = 'accepted';--> statement-breakpoint
CREATE INDEX "help_requests_open_idx" ON "help_requests" USING btree ("urgency","created_at") WHERE "help_requests"."status" IN ('open', 'triaged', 'in_progress');--> statement-breakpoint
CREATE INDEX "mission_updates_mission_idx" ON "mission_updates" USING btree ("mission_id","occurred_at");--> statement-breakpoint
CREATE INDEX "expenses_target_idx" ON "expenses" USING btree ("target_kind","target_id");--> statement-breakpoint
CREATE INDEX "fundraisers_target_idx" ON "fundraisers" USING btree ("target_kind","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_client_id_key" ON "messages" USING btree ("conversation_id","client_message_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
CREATE INDEX "posts_feed_idx" ON "posts" USING btree ("created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE UNIQUE INDEX "adoption_applications_live_key" ON "adoption_applications" USING btree ("listing_id","applicant_id") WHERE "adoption_applications"."status" IN ('submitted', 'reviewing');--> statement-breakpoint
CREATE UNIQUE INDEX "caregiver_profiles_user_key" ON "caregiver_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contact_grants_lookup_idx" ON "contact_grants" USING btree ("grantee_id","resource_kind","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ownership_claims_live_key" ON "ownership_claims" USING btree ("cat_id","claimant_id") WHERE "ownership_claims"."status" IN ('open', 'reviewing');--> statement-breakpoint
CREATE INDEX "ownership_claims_open_idx" ON "ownership_claims" USING btree ("cat_id") WHERE "ownership_claims"."status" IN ('open', 'reviewing');--> statement-breakpoint
CREATE UNIQUE INDEX "placement_reports_daily_key" ON "placement_reports" USING btree ("placement_id","report_date","author_id") WHERE "placement_reports"."amends_report_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "placement_requests_idempotency_key" ON "placement_requests" USING btree ("requester_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "placement_requests_caregiver_idx" ON "placement_requests" USING btree ("caregiver_profile_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "placement_reviews_author_key" ON "placement_reviews" USING btree ("placement_id","author_id");--> statement-breakpoint
CREATE INDEX "placement_reviews_subject_idx" ON "placement_reviews" USING btree ("subject_user_id") WHERE "placement_reviews"."status" = 'published';--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_channel_key" ON "notification_deliveries" USING btree ("notification_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_key" ON "notifications" USING btree ("recipient_id","dedupe_key");--> statement-breakpoint
CREATE INDEX "notifications_inbox_idx" ON "notifications" USING btree ("recipient_id","created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE UNIQUE INDEX "occurrences_schedule_time_key" ON "occurrences" USING btree ("schedule_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "occurrences_due_idx" ON "occurrences" USING btree ("scheduled_at") WHERE "occurrences"."status" = 'scheduled';--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_kind","resource_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_scope_key" ON "idempotency_keys" USING btree ("actor_id","endpoint","key");--> statement-breakpoint
CREATE INDEX "moderation_reports_queue_idx" ON "moderation_reports" USING btree ("status","created_at") WHERE "moderation_reports"."status" IN ('open', 'reviewing');--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("occurred_at") WHERE "outbox_events"."status" = 'pending';