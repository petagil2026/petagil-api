-- AlterTable: CNPJ da clínica (responsável técnico mantém CRMV).
ALTER TABLE "VetProfile" ADD COLUMN "cnpj" TEXT;

-- CreateIndex: uma clínica por CNPJ (nulls permitidos para linhas pré-pivô).
CREATE UNIQUE INDEX "VetProfile_cnpj_key" ON "VetProfile"("cnpj");
