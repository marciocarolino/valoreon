-- =============================================================================
-- Migração segura: remover coluna legada "active" da tabela printers
-- =============================================================================
--
-- Contexto:
--   O estado da impressora é controlado apenas por "status" (ACTIVE, INACTIVE,
--   MAINTENANCE). A coluna "active" é redundante e pode ser removida sem perda
--   de informação semântica, desde que "status" já exista e esteja preenchido.
--
-- Execução:
--   Rodar manualmente no PostgreSQL (psql, DBeaver, etc.).
--   NÃO usar ddl-auto=create para isso — apagaria todo o banco.
--
-- Idempotência:
--   IF EXISTS evita erro caso a coluna já tenha sido removida.
--
-- =============================================================================

ALTER TABLE printers DROP COLUMN IF EXISTS active;
