CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF to_regclass('public.batches') IS NOT NULL THEN
    ALTER TABLE batches ADD COLUMN IF NOT EXISTS paychangu_transaction_id VARCHAR(100);
    ALTER TABLE batches ADD COLUMN IF NOT EXISTS paychangu_reference VARCHAR(100);
    ALTER TABLE batches ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'ONEKHUSA';
  END IF;

  IF to_regclass('public.transactions') IS NOT NULL THEN
    ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paychangu_payment_status VARCHAR(50);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS paychangu_payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MWK',
  student_ids JSONB NOT NULL,
  batch_size INTEGER NOT NULL,
  transaction_id VARCHAR(100),
  reference VARCHAR(100),
  payment_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  raw_response JSONB,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paychangu_payment_intents_transaction_id
  ON paychangu_payment_intents (transaction_id);

CREATE INDEX IF NOT EXISTS idx_paychangu_payment_intents_reference
  ON paychangu_payment_intents (reference);
