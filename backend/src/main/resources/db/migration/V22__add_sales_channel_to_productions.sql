-- Add sales channel and marketplace fee percentage to productions.
-- Existing rows default to DIRECT with 0% fee.
ALTER TABLE productions
    ADD COLUMN sales_channel  VARCHAR(50)   NOT NULL DEFAULT 'DIRECT',
    ADD COLUMN fee_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0;
