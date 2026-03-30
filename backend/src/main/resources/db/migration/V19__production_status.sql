ALTER TABLE productions ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX idx_productions_status ON productions(status);
