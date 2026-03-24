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
    { code: TicketTypeCode.ADULT, name: "Adult Day Visitor", basePrice: 10500 },
    { code: TicketTypeCode.KID, name: "Child Day Visitor (3-17 years)", basePrice: 9000 },
    { code: TicketTypeCode.PENSIONER, name: "Pensioner Day Visitor", basePrice: 9000 },
    { code: TicketTypeCode.UNDER3, name: "2 Years And Under", basePrice: 0 },
  ];

  for (const ticketType of ticketTypes) {
    await prisma.ticketType.upsert({
      where: { code: ticketType.code },
      update: { name: ticketType.name, basePrice: ticketType.basePrice, isActive: true },
      create: {
        code: ticketType.code,
        name: ticketType.name,
        basePrice: ticketType.basePrice,
        isActive: true,
      },
    });
  }

  console.log("Seed complete: AdminUser + TicketType created/updated.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
