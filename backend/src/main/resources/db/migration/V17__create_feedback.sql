CREATE TYPE feedback_type AS ENUM ('BUG', 'SUGGESTION', 'FEEDBACK');

CREATE TABLE feedback (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id),
    type       feedback_type NOT NULL,
    message    TEXT         NOT NULL,
    created_at TIMESTAMP    NOT NULL
);
