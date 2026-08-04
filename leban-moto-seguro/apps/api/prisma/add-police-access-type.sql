DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'PoliceAccessType'
  ) THEN
    CREATE TYPE "PoliceAccessType" AS ENUM ('PATROL', 'OPERATIONS');
  END IF;
END
$$;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "policeAccessType" "PoliceAccessType";
