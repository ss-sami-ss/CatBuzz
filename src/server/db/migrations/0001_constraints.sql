-- Constraints Drizzle cannot express (T05).

-- A cat is never in two active placements whose date ranges overlap (docs/06, Q33).
ALTER TABLE "placement_cats"
  ADD CONSTRAINT "placement_cats_no_overlap"
  EXCLUDE USING gist ("cat_id" WITH =, "period" WITH &&) WHERE ("active");
--> statement-breakpoint

-- Append-only history tables: updates and deletes are refused.
CREATE FUNCTION "refuse_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "mission_updates_append_only" BEFORE UPDATE OR DELETE ON "mission_updates"
  FOR EACH ROW EXECUTE FUNCTION "refuse_change"();
--> statement-breakpoint
CREATE TRIGGER "audit_logs_append_only" BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "refuse_change"();
