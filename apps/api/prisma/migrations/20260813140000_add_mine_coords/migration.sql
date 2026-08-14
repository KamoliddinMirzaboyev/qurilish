ALTER TABLE "mines" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "mines" ADD COLUMN "lng" DOUBLE PRECISION;

UPDATE "mines" SET "lat" = 41.3897, "lng" = 69.4653 WHERE "name" = 'Qibray Toshkoni' AND "lat" IS NULL;
UPDATE "mines" SET "lat" = 39.9608, "lng" = 68.3956 WHERE "name" = 'Zomin Ohaykoni' AND "lat" IS NULL;
