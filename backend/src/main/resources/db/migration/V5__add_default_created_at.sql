-- DB-level defaults for consistency (application still sets timestamps in @PrePersist)
ALTER TABLE printers
    ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE productions
    ALTER COLUMN created_at SET DEFAULT NOW();
