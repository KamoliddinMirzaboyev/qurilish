-- connect-pg-simple session store
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey'
  ) THEN
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- taklif unique: faqat faol (o'chirilmagan, WITHDRAWN emas) juftlik
DROP INDEX IF EXISTS "proposals_problemId_scientistId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "proposals_problem_scientist_active"
  ON "proposals" ("problemId", "scientistId")
  WHERE "deletedAt" IS NULL AND status <> 'WITHDRAWN';
