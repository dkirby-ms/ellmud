-- Colyseus room IDs are short alphanumeric strings (e.g. "NjjNA6RU9"),
-- not UUIDs. Change run_id from uuid to text to match.
-- Idempotent: only alter if column is still uuid type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'run_history' AND column_name = 'run_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE run_history ALTER COLUMN run_id TYPE text USING run_id::text;
  END IF;
END $$;
