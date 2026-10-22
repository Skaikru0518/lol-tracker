ALTER TABLE "Account" ADD COLUMN "platform" TEXT;
UPDATE "Account" SET "platform" = 'eune';
