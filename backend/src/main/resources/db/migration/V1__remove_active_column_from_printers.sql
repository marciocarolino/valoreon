-- Legacy column redundant with printers.status (ACTIVE / INACTIVE / MAINTENANCE)
ALTER TABLE printers DROP COLUMN IF EXISTS active;
