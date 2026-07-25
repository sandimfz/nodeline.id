-- Fix candles table: ensure composite primary key exists for ON CONFLICT to work.
-- Error 42P10 (infer_arbiter_indexes) means PG can't find a unique index matching ON CONFLICT clause.

-- Drop existing primary key if it's wrong (single column), then recreate as composite.
-- If candles table was created without PK or with wrong PK, this fixes it.

DO $$
BEGIN
  -- Check if the constraint exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candles_pkey' AND conrelid = 'candles'::regclass
  ) THEN
    -- Drop existing PK
    ALTER TABLE "candles" DROP CONSTRAINT "candles_pkey";
  END IF;
END $$;

-- Recreate composite primary key
ALTER TABLE "candles" ADD CONSTRAINT "candles_pkey" PRIMARY KEY ("symbol", "interval", "timestamp");
