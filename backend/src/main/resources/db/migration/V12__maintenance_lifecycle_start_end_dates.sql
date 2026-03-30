-- Lifecycle: start_date / end_date; status OPEN -> IN_PROGRESS

ALTER TABLE maintenances
	ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;

ALTER TABLE maintenances
	ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;

-- Backfill start_date from legacy calendar date
UPDATE maintenances
SET start_date = maintenance_date::timestamp
WHERE start_date IS NULL;

-- Fallback for any row still missing start_date
UPDATE maintenances
SET start_date = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE start_date IS NULL;

ALTER TABLE maintenances
	ALTER COLUMN start_date SET NOT NULL;

-- Align end_date with finished_at where present
UPDATE maintenances
SET end_date = finished_at
WHERE end_date IS NULL
  AND finished_at IS NOT NULL;

-- Status: OPEN -> IN_PROGRESS (enum rename)
UPDATE maintenances
SET status = 'IN_PROGRESS'
WHERE status = 'OPEN';

-- Replace partial unique index: one IN_PROGRESS per printer
DROP INDEX IF EXISTS unique_open_maintenance_per_printer;

CREATE UNIQUE INDEX unique_in_progress_maintenance_per_printer
	ON maintenances (printer_id)
	WHERE status = 'IN_PROGRESS';
