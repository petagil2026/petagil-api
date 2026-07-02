-- CreateEnum
CREATE TYPE "PetSex" AS ENUM ('MALE', 'FEMALE');

-- AlterTable
ALTER TABLE "Pet" ADD COLUMN     "neutered" BOOLEAN,
ADD COLUMN     "sex" "PetSex",
ADD COLUMN     "weightKg" DOUBLE PRECISION;
