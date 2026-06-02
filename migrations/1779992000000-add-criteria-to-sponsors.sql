-- Add ranking criteria columns to sponsors table
ALTER TABLE sponsors ADD COLUMN ranking_criteria_id UUID DEFAULT NULL;
ALTER TABLE sponsors ADD COLUMN is_criteria_activated BOOLEAN DEFAULT FALSE;

-- Add indexes for better query performance
CREATE INDEX idx_sponsors_ranking_criteria_id ON sponsors(ranking_criteria_id);
CREATE INDEX idx_sponsors_is_criteria_activated ON sponsors(is_criteria_activated);
