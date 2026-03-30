-- Ensure default for new rows (idempotent if already set in V2)
ALTER TABLE printers
    ALTER COLUMN status SET DEFAULT 'ACTIVE'::printer_status;
