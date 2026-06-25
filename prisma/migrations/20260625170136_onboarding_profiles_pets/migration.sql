-- CreateEnum
CREATE TYPE "Species" AS ENUM ('DOG', 'CAT', 'BIRD', 'REPTILE');

-- CreateEnum
CREATE TYPE "VetVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PASSEADOR';

-- CreateTable
CREATE TABLE "TutorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VetProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "crmvNumber" TEXT NOT NULL,
    "crmvUf" TEXT NOT NULL,
    "specialties" TEXT[],
    "bio" TEXT,
    "servesAtClinic" BOOLEAN NOT NULL DEFAULT false,
    "servesAtHome" BOOLEAN NOT NULL DEFAULT false,
    "clinicName" TEXT,
    "clinicAddress" TEXT,
    "crmvDocUrl" TEXT,
    "verification" "VetVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalkerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "city" TEXT NOT NULL,
    "bio" TEXT,
    "petTypes" TEXT[],
    "region" TEXT NOT NULL,
    "pricePerWalk" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalkerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "Species" NOT NULL,
    "breed" TEXT,
    "ageYears" INTEGER,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "id" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "nextDoseAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorProfile_userId_key" ON "TutorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VetProfile_userId_key" ON "VetProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VetProfile_crmvNumber_crmvUf_key" ON "VetProfile"("crmvNumber", "crmvUf");

-- CreateIndex
CREATE UNIQUE INDEX "WalkerProfile_userId_key" ON "WalkerProfile"("userId");

-- CreateIndex
CREATE INDEX "Pet_ownerId_idx" ON "Pet"("ownerId");

-- CreateIndex
CREATE INDEX "Vaccination_petId_idx" ON "Vaccination"("petId");

-- AddForeignKey
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VetProfile" ADD CONSTRAINT "VetProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalkerProfile" ADD CONSTRAINT "WalkerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
