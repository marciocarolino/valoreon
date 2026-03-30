-- Keyset pagination for GET /productions (user_id + created_at DESC, id DESC)
CREATE INDEX IF NOT EXISTS idx_productions_user_created_id
    ON productions (user_id, created_at DESC, id DESC);
