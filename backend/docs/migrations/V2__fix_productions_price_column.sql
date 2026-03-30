-- Remove a coluna legada "price" criada por versão anterior da entidade
ALTER TABLE productions DROP COLUMN IF EXISTS price;

-- Garante que sale_price é NOT NULL (caso tenha sido criada como nullable)
ALTER TABLE productions ALTER COLUMN sale_price SET NOT NULL;
