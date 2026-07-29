-- Corrige usuários policiais já existentes sem apagar dados.
-- Policiais que possuem perfil em PoliceOfficer são operacionais.
UPDATE "User" AS u
SET "policeAccessType" = 'OPERATIONS'::"PoliceAccessType"
WHERE u."role" = 'POLICIA'
  AND u."policeAccessType" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "PoliceOfficer" AS po
    WHERE po."userId" = u."id"
  );

-- Demais usuários policiais são de fiscalização/patrulha.
UPDATE "User"
SET "policeAccessType" = 'PATROL'::"PoliceAccessType"
WHERE "role" = 'POLICIA'
  AND "policeAccessType" IS NULL;
