CREATE TABLE maintenances (
    id                 BIGSERIAL PRIMARY KEY,
    printer_id         BIGINT NOT NULL,
    user_id            BIGINT NOT NULL,
    type               VARCHAR(32) NOT NULL,
    description        TEXT NOT NULL,
    cost               NUMERIC(15, 4) NOT NULL,
    maintenance_date   DATE NOT NULL,
    notes              TEXT,
    CONSTRAINT fk_maintenance_printer FOREIGN KEY (printer_id) REFERENCES printers (id) ON DELETE CASCADE,
    CONSTRAINT fk_maintenance_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_maintenances_user ON maintenances (user_id);
CREATE INDEX idx_maintenances_printer ON maintenances (printer_id);
CREATE INDEX idx_maintenances_user_date ON maintenances (user_id, maintenance_date DESC);
