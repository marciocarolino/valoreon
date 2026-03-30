-- Valoreon baseline schema (aligned with JPA entities; Hibernate ddl-auto=validate)

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    public_id       UUID NOT NULL UNIQUE,
    name            VARCHAR(512) NOT NULL,
    email           VARCHAR(256) NOT NULL UNIQUE,
    password        VARCHAR(256) NOT NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL,
    updated_at      TIMESTAMP NOT NULL
);

CREATE TABLE companies (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    sector           VARCHAR(255) NOT NULL,
    monthly_revenue  NUMERIC(15, 2) NOT NULL,
    monthly_profit   NUMERIC(15, 2) NOT NULL,
    growth_rate      NUMERIC(5, 2),
    created_at       TIMESTAMP NOT NULL,
    updated_at       TIMESTAMP,
    user_id          BIGINT NOT NULL,
    CONSTRAINT fk_company_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE printers (
    id                       BIGSERIAL PRIMARY KEY,
    name                     VARCHAR(255) NOT NULL,
    brand                    VARCHAR(255) NOT NULL,
    power_consumption_watts  INTEGER NOT NULL,
    energy_cost_per_kwh      NUMERIC(10, 4) NOT NULL,
    cost_per_hour            NUMERIC(10, 4),
    status                   VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    user_id                  BIGINT NOT NULL,
    created_at               TIMESTAMP NOT NULL,
    updated_at               TIMESTAMP,
    CONSTRAINT fk_printer_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE productions (
    id                 BIGSERIAL PRIMARY KEY,
    name               VARCHAR(255) NOT NULL,
    weight             DOUBLE PRECISION NOT NULL,
    quantity           INTEGER NOT NULL,
    material           VARCHAR(255),
    color              VARCHAR(255),
    size               VARCHAR(255),
    print_time_hours   DOUBLE PRECISION NOT NULL,
    sale_price         NUMERIC(15, 2) NOT NULL,
    filament_price     NUMERIC(15, 4) NOT NULL,
    material_cost      NUMERIC(15, 4),
    energy_cost        NUMERIC(15, 4),
    total_cost         NUMERIC(15, 4),
    profit             NUMERIC(15, 4),
    margin             NUMERIC(10, 4),
    created_at         TIMESTAMP NOT NULL,
    printer_id         BIGINT NOT NULL,
    user_id            BIGINT NOT NULL,
    CONSTRAINT fk_production_printer FOREIGN KEY (printer_id) REFERENCES printers (id),
    CONSTRAINT fk_production_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_companies_user_id ON companies (user_id);
CREATE INDEX idx_printers_user_id ON printers (user_id);
CREATE INDEX idx_productions_user_id ON productions (user_id);
CREATE INDEX idx_productions_printer_id ON productions (printer_id);
