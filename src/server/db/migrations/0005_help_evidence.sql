CREATE TABLE "help_evidence" (
	"report_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	CONSTRAINT "help_evidence_report_id_media_id_pk" PRIMARY KEY("report_id","media_id")
);
--> statement-breakpoint
ALTER TABLE "help_evidence" ADD CONSTRAINT "help_evidence_report_id_help_requests_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."help_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "help_evidence" ADD CONSTRAINT "help_evidence_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE no action ON UPDATE no action;