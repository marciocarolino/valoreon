-- EXECUTAR MANUALMENTE no banco de dados após reiniciar a aplicação
-- O Hibernate (ddl-auto=update) adiciona a coluna como nullable automaticamente.
-- Este script preenche os dados existentes e aplica a restrição NOT NULL.

-- 1. Preencher registros existentes com valor padrão
UPDATE printers SET status = 'ACTIVE' WHERE status IS NULL;

-- 2. Aplicar NOT NULL após garantir que não há nulls
ALTER TABLE printers ALTER COLUMN status SET NOT NULL;

-- 3. Adicionar constraint de validação dos valores permitidos
ALTER TABLE printers
    ADD CONSTRAINT chk_printer_status
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE'));
