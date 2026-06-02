-- Create OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "phoneNumber" VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INTEGER NOT NULL DEFAULT 0,
  "userId" VARCHAR NULL,
  purpose VARCHAR NOT NULL DEFAULT 'phone_verification'
);

-- Create indices for fast lookups
CREATE INDEX IF NOT EXISTS idx_otp_phone_created ON otp_codes("phoneNumber", "createdAt");
CREATE INDEX IF NOT EXISTS idx_otp_phone_verified ON otp_codes("phoneNumber", verified);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_codes("expiresAt");
