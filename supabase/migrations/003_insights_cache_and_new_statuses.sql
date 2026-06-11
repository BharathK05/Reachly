-- Add insights_cache column to campaigns table
-- Stores AI-generated insights so re-visiting the insights page doesn't re-generate

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS insights_cache TEXT DEFAULT NULL;

-- Add read and converted to existing communication_logs status check constraint
-- (If the constraint exists, we drop and recreate it to include the new values)
ALTER TABLE communication_logs
  DROP CONSTRAINT IF EXISTS communication_logs_status_check;

ALTER TABLE communication_logs
  ADD CONSTRAINT communication_logs_status_check
  CHECK (status IN ('pending','sent','delivered','read','opened','clicked','converted','failed'));
