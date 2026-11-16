import { pgEnum } from "drizzle-orm/pg-core";

export const userStatus = pgEnum("user_status", ["pending_activation", "active", "suspended", "deleted"]);
export const credentialStatus = pgEnum("credential_status", ["pending", "verified", "rejected", "expired", "revoked"]);
export const profession = pgEnum("profession", ["veterinarian", "vet_technician", "counselor"]);
export const capability = pgEnum("capability", ["feeding", "transport", "foster", "trapping", "fundraising", "photography", "medication"]);
export const groupScope = pgEnum("group_scope", ["public", "local"]);
export const groupVisibility = pgEnum("group_visibility", ["open", "request", "hidden"]);
export const memberRole = pgEnum("member_role", ["member", "moderator", "admin"]);
export const membershipStatus = pgEnum("membership_status", ["requested", "active", "left", "removed", "rejected"]);

export const catSex = pgEnum("cat_sex", ["female", "male", "unknown"]);
export const catAge = pgEnum("cat_age", ["kitten", "young", "adult", "senior", "unknown"]);
export const catLifecycle = pgEnum("cat_lifecycle", ["active", "missing", "adopted", "deceased", "merged"]);
export const catCustody = pgEnum("cat_custody", ["street", "owned"]);
export const catNeed = pgEnum("cat_need", ["urgent", "medical", "food_water", "adoption"]);
export const locationPrecision = pgEnum("location_precision", ["exact", "approximate"]);
export const relationshipType = pgEnum("relationship_type", ["mother_of", "sibling_of"]);
export const verificationStatus = pgEnum("verification_status", ["unverified", "pending", "verified", "rejected"]);

export const mediaStatus = pgEnum("media_status", ["quarantine", "processing", "ready", "rejected", "deleted"]);
export const mediaVisibility = pgEnum("media_visibility", ["public", "private"]);

export const recordSource = pgEnum("record_source", ["volunteer", "owner", "vet"]);
export const recordVisibility = pgEnum("record_visibility", ["public_summary", "private"]);
export const careCategory = pgEnum("care_category", ["feeding", "medication", "vaccination", "sterilization", "treatment", "observation", "other"]);

export const urgency = pgEnum("urgency", ["low", "normal", "high", "critical"]);
export const helpRequestStatus = pgEnum("help_request_status", ["open", "triaged", "in_progress", "resolved", "closed", "rejected"]);
export const missionType = pgEnum("mission_type", ["transport", "feeding", "vet_visit", "trapping", "foster", "medication", "other"]);
export const missionStatus = pgEnum("mission_status", ["open", "full", "in_progress", "completed", "cancelled"]);
export const assignmentStatus = pgEnum("assignment_status", ["accepted", "withdrawn", "completed", "removed"]);

export const fundraiserStatus = pgEnum("fundraiser_status", ["draft", "pending_review", "published", "closed", "rejected"]);
export const expenseReviewStatus = pgEnum("expense_review_status", ["pending", "approved", "rejected"]);
export const moneyTargetKind = pgEnum("money_target_kind", ["cat", "mission", "colony", "placement"]);

export const postVisibility = pgEnum("post_visibility", ["public", "group", "hidden"]);
export const moderationState = pgEnum("moderation_state", ["visible", "pending", "hidden", "removed"]);
export const conversationKind = pgEnum("conversation_kind", ["group", "private"]);

export const listingKind = pgEnum("listing_kind", ["permanent", "foster"]);
export const listingStatus = pgEnum("listing_status", ["draft", "open", "paused", "closed"]);
export const applicationStatus = pgEnum("application_status", ["submitted", "reviewing", "accepted", "rejected", "withdrawn"]);
export const serviceKind = pgEnum("service_kind", ["foster", "sitting"]);
export const careMode = pgEnum("care_mode", ["host_home", "home_visit"]);
export const placementKind = pgEnum("placement_kind", ["permanent", "foster", "sitting"]);
export const caregiverProfileStatus = pgEnum("caregiver_profile_status", ["draft", "pending_review", "published", "rejected", "suspended"]);
export const placementRequestStatus = pgEnum("placement_request_status", ["pending", "accepted", "declined", "cancelled", "expired"]);
export const placementStatus = pgEnum("placement_status", ["accepted", "in_care", "ended", "cancelled"]);
export const placementOutcome = pgEnum("placement_outcome", ["returned", "adopted", "transferred", "terminated_early"]);
export const reviewStatus = pgEnum("review_status", ["pending", "published", "hidden"]);
export const contactScope = pgEnum("contact_scope", ["address", "phone", "location"]);
export const lostFoundType = pgEnum("lost_found_type", ["lost", "found"]);
export const claimStatus = pgEnum("claim_status", ["open", "reviewing", "approved", "rejected", "withdrawn"]);

export const occurrenceStatus = pgEnum("occurrence_status", ["scheduled", "done", "skipped", "missed", "cancelled"]);
export const notificationChannel = pgEnum("notification_channel", ["in_app", "email", "push", "sms"]);
export const deliveryStatus = pgEnum("delivery_status", ["pending", "sent", "failed", "dead"]);

export const counselingStatus = pgEnum("counseling_status", ["submitted", "awaiting_consent", "assigned", "closed", "withdrawn"]);
export const moderationTarget = pgEnum("moderation_target", ["user", "cat", "post", "comment", "message", "fundraiser", "expense", "caregiver_profile", "placement", "placement_review", "placement_report"]);
export const moderationReportStatus = pgEnum("moderation_report_status", ["open", "reviewing", "actioned", "dismissed"]);
export const outboxStatus = pgEnum("outbox_status", ["pending", "published", "failed"]);
