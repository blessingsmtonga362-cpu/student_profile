-- Add email as the recipient for newly issued application OTPs.
-- Keep phoneNumber and its historical rows intact for existing installations.
ALTER TABLE otp_codes
  ADD COLUMN IF NOT EXISTS email VARCHAR(254);

ALTER TABLE otp_codes
  ALTER COLUMN "phoneNumber" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_otp_email_created
  ON otp_codes(email, "createdAt");

CREATE INDEX IF NOT EXISTS idx_otp_email_verified
  ON otp_codes(email, verified);

ALTER TABLE otp_codes
  ALTER COLUMN purpose SET DEFAULT 'application_submission';
