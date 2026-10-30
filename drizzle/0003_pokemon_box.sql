ALTER TABLE "pokemon" ADD COLUMN "in_box" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "pokemon" SET "in_box" = true WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (PARTITION BY "trainer_id" ORDER BY "position", "created_at") AS "n"
    FROM "pokemon"
  ) AS "ordered" WHERE "n" > 6
);
