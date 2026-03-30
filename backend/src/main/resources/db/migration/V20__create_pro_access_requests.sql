CREATE TABLE pro_access_requests (
    id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name       VARCHAR(512) NOT NULL,
    email      VARCHAR(256) NOT NULL,
    source     VARCHAR(64)  NOT NULL DEFAULT 'dashboard',
    status     VARCHAR(32)  NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);
