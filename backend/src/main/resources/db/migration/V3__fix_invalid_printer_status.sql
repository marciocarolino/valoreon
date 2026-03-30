-- Normalize printer status before relying on enum invariants (safe for legacy rows)
UPDATE printers
SET status = 'ACTIVE'::printer_status
WHERE status IS NULL
   OR status::text NOT IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE');
