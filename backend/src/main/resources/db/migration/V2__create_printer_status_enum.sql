-- Native PostgreSQL enum for printer status (replaces VARCHAR from V0)

CREATE TYPE printer_status AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

ALTER TABLE printers
    ALTER COLUMN status DROP DEFAULT;

ALTER TABLE printers
    ALTER COLUMN status TYPE printer_status
    USING (status::printer_status);

ALTER TABLE printers
    ALTER COLUMN status SET DEFAULT 'ACTIVE'::printer_status;
