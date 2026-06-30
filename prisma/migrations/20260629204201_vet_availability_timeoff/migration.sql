-- CreateEnum
CREATE TYPE "AvailabilityPeriod" AS ENUM ('MORNING', 'AFTERNOON', 'NIGHT');

-- CreateTable
CREATE TABLE "VetAvailability" (
    "id" TEXT NOT NULL,
    "vetProfileId" TEXT NOT NULL,
    "weekdays" INTEGER[],
    "slotDurationMin" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VetAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetAvailabilityPeriod" (
    "id" TEXT NOT NULL,
    "availabilityId" TEXT NOT NULL,
    "period" "AvailabilityPeriod" NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "VetAvailabilityPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetTimeOff" (
    "id" TEXT NOT NULL,
    "vetProfileId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VetTimeOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VetAvailability_vetProfileId_key" ON "VetAvailability"("vetProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "VetAvailabilityPeriod_availabilityId_period_key" ON "VetAvailabilityPeriod"("availabilityId", "period");

-- CreateIndex
CREATE INDEX "VetTimeOff_vetProfileId_idx" ON "VetTimeOff"("vetProfileId");

-- AddForeignKey
ALTER TABLE "VetAvailability" ADD CONSTRAINT "VetAvailability_vetProfileId_fkey" FOREIGN KEY ("vetProfileId") REFERENCES "VetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetAvailabilityPeriod" ADD CONSTRAINT "VetAvailabilityPeriod_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES "VetAvailability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetTimeOff" ADD CONSTRAINT "VetTimeOff_vetProfileId_fkey" FOREIGN KEY ("vetProfileId") REFERENCES "VetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
