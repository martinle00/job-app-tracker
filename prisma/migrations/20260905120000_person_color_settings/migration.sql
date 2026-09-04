-- Person dot colour: nullable, so existing rows keep working and fall back to
-- the neutral in the UI.
ALTER TABLE "Person" ADD COLUMN "color" TEXT;

-- Tracker-wide preferences. Keyed rather than single-row so adding the next
-- preference is an insert, not a migration.
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);
