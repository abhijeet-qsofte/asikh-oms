-- Add photo_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'photo_url') THEN
        ALTER TABLE batches ADD COLUMN photo_url VARCHAR;
    END IF;
END
$$;

-- Add latitude column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'latitude') THEN
        ALTER TABLE batches ADD COLUMN latitude FLOAT;
    END IF;
END
$$;

-- Add longitude column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batches' AND column_name = 'longitude') THEN
        ALTER TABLE batches ADD COLUMN longitude FLOAT;
    END IF;
END
$$;

-- Update existing records to have default values for the new required fields
UPDATE batches 
SET 
    latitude = 0.0,
    longitude = 0.0
WHERE 
    latitude IS NULL OR longitude IS NULL;

-- Make the columns non-nullable after setting default values
ALTER TABLE batches ALTER COLUMN latitude SET NOT NULL;
ALTER TABLE batches ALTER COLUMN longitude SET NOT NULL;
