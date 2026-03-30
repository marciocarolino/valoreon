-- Performance indexes (IF NOT EXISTS avoids failure on re-run; V0 may already define similar indexes under other names)
CREATE INDEX IF NOT EXISTS idx_printer_user
    ON printers (user_id);

CREATE INDEX IF NOT EXISTS idx_production_user
    ON productions (user_id);

CREATE INDEX IF NOT EXISTS idx_production_printer
    ON productions (printer_id);

CREATE INDEX IF NOT EXISTS idx_production_created_at
    ON productions (created_at);
