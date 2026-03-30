-- STEP 1: Close duplicate OPEN maintenances (keep latest per printer)

WITH ranked AS (
	SELECT id,
		printer_id,
		ROW_NUMBER() OVER (
			PARTITION BY printer_id
			ORDER BY created_at DESC
		) AS rn
	FROM maintenances
	WHERE status = 'OPEN'
)
UPDATE maintenances
SET status = 'FINISHED',
	finished_at = NOW()
WHERE id IN (
	SELECT id FROM ranked WHERE rn > 1
);

-- STEP 2: Create unique partial index

CREATE UNIQUE INDEX unique_open_maintenance_per_printer
ON maintenances (printer_id)
WHERE status = 'OPEN';
