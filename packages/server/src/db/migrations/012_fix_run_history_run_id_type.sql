-- Colyseus room IDs are short alphanumeric strings (e.g. "NjjNA6RU9"),
-- not UUIDs. Change run_id from uuid to text to match.
ALTER TABLE run_history ALTER COLUMN run_id TYPE text USING run_id::text;
