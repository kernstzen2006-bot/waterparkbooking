import { TicketTypeCode } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing ADMIN_EMAIL or ADMIN_PASSWORD.\nIn PowerShell run:\n' +
        '$env:ADMIN_EMAIL="admin@test.com"\n' +
        '$env:ADMIN_PASSWORD="StrongPass123!"\n' +
        "npm run seed"
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, isActive: true },
    create: { email, passwordHash, isActive: true },
  });

  const ticketTypes: Array<{ code: TicketTypeCode; name: string; basePrice: number }> = [
    { code: TicketTypeCode.ADULT, name: "Adult Day Pass", basePrice: 15000 },
    { code: TicketTypeCode.KID, name: "Kid Day Pass", basePrice: 10000 },
    { code: TicketTypeCode.PENSIONER, name: "Pensioner Day Pass", basePrice: 10000 },
    { code: TicketTypeCode.UNDER3, name: "Under 3 years old", basePrice: 0 },
  ];

  for (const tt of ticketTypes) {
    await prisma.ticketType.upsert({
      where: { code: tt.code },
      update: { name: tt.name, basePrice: tt.basePrice, isActive: true },
      create: { code: tt.code, name: tt.name, basePrice: tt.basePrice, isActive: true },
    });
  }

  console.log("✅ Seed complete: AdminUser + TicketType created/updated.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


