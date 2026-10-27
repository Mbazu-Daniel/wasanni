ALTER TABLE "game_session_score" RENAME TO "game_session_score_plain";--> statement-breakpoint
DROP INDEX "game_session_score_session_ux";--> statement-breakpoint
DROP INDEX "game_session_score_game_platform_score_ix";--> statement-breakpoint
DROP INDEX "game_session_score_organization_ix";--> statement-breakpoint
CREATE TABLE "game_session_score" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"external_user_id" text NOT NULL,
	"mode" text,
	"score" bigint NOT NULL,
	"status" text DEFAULT 'accepted' NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text NOT NULL,
	"archive_key" text,
	"archive_offset" bigint,
	"archive_length" bigint,
	"archive_rows" integer,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hour_bucket" timestamp with time zone NOT NULL,
	CONSTRAINT "game_session_score_id_hour_bucket_pk" PRIMARY KEY("id","hour_bucket"),
	CONSTRAINT "game_session_score_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "game_session_score_session_id_game_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."game_session"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "game_session_score_platform_id_platform_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platform"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "game_session_score_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action
) PARTITION BY RANGE ("hour_bucket");--> statement-breakpoint
CREATE TABLE "game_session_score_default" PARTITION OF "game_session_score" DEFAULT;--> statement-breakpoint
INSERT INTO "game_session_score" (
	"id", "organization_id", "session_id", "platform_id", "game_id",
	"external_user_id", "mode", "score", "status", "flagged", "flags",
	"source", "archive_key", "archive_offset", "archive_length", "archive_rows",
	"submitted_at", "created_at", "updated_at", "hour_bucket"
)
SELECT
	s."id", s."organization_id", s."session_id", s."platform_id", s."game_id",
	s."external_user_id", s."mode", s."score", s."status", s."flagged", s."flags",
	s."source", s."archive_key", s."archive_offset", s."archive_length", s."archive_rows",
	s."submitted_at", s."created_at", s."updated_at",
	date_trunc('hour', gs."started_at", 'UTC')
FROM "game_session_score_plain" s
JOIN "game_session" gs ON gs."id" = s."session_id";--> statement-breakpoint
DROP TABLE "game_session_score_plain";--> statement-breakpoint
CREATE UNIQUE INDEX "game_session_score_session_ux" ON "game_session_score" USING btree ("session_id","hour_bucket");--> statement-breakpoint
CREATE INDEX "game_session_score_game_platform_score_ix" ON "game_session_score" USING btree ("game_id","platform_id","score");--> statement-breakpoint
CREATE INDEX "game_session_score_organization_ix" ON "game_session_score" USING btree ("organization_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION ensure_hour_partition(p_hour timestamp with time zone)
RETURNS boolean
LANGUAGE plpgsql
AS $fn$
DECLARE
	v_from timestamp with time zone := date_trunc('hour', p_hour, 'UTC');
	v_to timestamp with time zone := v_from + interval '1 hour';
	v_name text := 'game_session_score_h' || to_char(v_from at time zone 'UTC', 'YYYYMMDDHH24');
BEGIN
	IF to_regclass(v_name) IS NOT NULL THEN
		RETURN false;
	END IF;

	BEGIN
		EXECUTE format(
			'CREATE TABLE %I PARTITION OF game_session_score FOR VALUES FROM (%L) TO (%L)',
			v_name, v_from, v_to
		);
		RETURN true;
	EXCEPTION WHEN check_violation THEN
		NULL;
	END;

	EXECUTE format('CREATE TABLE %I (LIKE game_session_score INCLUDING ALL)', v_name);

	EXECUTE format(
		'WITH moved AS (
			DELETE FROM game_session_score_default
			WHERE hour_bucket >= %L AND hour_bucket < %L
			RETURNING *
		)
		INSERT INTO %I SELECT * FROM moved',
		v_from, v_to, v_name
	);

	EXECUTE format(
		'ALTER TABLE game_session_score ATTACH PARTITION %I FOR VALUES FROM (%L) TO (%L)',
		v_name, v_from, v_to
	);

	RETURN true;
END;
$fn$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION ensure_hour_partitions(p_start timestamp with time zone, p_count integer)
RETURNS integer
LANGUAGE plpgsql
AS $fn$
DECLARE
	v_created integer := 0;
	i integer;
BEGIN
	FOR i IN 0 .. p_count - 1 LOOP
		IF ensure_hour_partition(p_start + make_interval(hours => i)) THEN
			v_created := v_created + 1;
		END IF;
	END LOOP;

	RETURN v_created;
END;
$fn$;
