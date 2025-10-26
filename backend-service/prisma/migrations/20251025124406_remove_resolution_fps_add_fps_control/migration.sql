/*
  Warnings:

  - You are about to drop the column `fps` on the `cameras` table. All the data in the column will be lost.
  - You are about to drop the column `resolution` on the `cameras` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cameras" DROP COLUMN "fps",
DROP COLUMN "resolution",
ADD COLUMN     "maxFPS" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "targetFPS" INTEGER NOT NULL DEFAULT 30,
ALTER COLUMN "faceDetectionEnabled" SET DEFAULT true,
ALTER COLUMN "frameSkipInterval" SET DEFAULT 2;
