-- Add shipping_cost column to productions table.
-- Nullable: existing rows have no freight (treated as 0 in recalculate()).
ALTER TABLE productions
    ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(15, 2);
