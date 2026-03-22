-- One QR per order: nonce + issue time on Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderQrNonce" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "orderQrIssuedAt" TIMESTAMP(3);
