import { prisma } from "@/lib/prisma";
import { getPublicRuntimeSnapshot } from "@/lib/runtimeChecks";

export async function getAdminOverview() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [orders, todayCount, eftQueueCount, paidOrdersCount] = await Promise.all([
    prisma.order.findMany({
      select: {
        id: true,
        customerEmail: true,
        visitDate: true,
        status: true,
        totalCents: true,
      },
      orderBy: { createdAt: "desc" },
      take: 25
    }),
    prisma.ticket.count({ where: { visitDate: today } }),
    prisma.order.count({ where: { status: { in: ["PENDING_EFT", "EFT_REVIEW"] } } }),
    prisma.order.count({ where: { status: "PAID" } })
  ]);

  return {
    orders: orders.map((order) => ({
      ...order,
      visitDate: order.visitDate.toISOString()
    })),
    todayCount,
    eftQueueCount,
    paidOrdersCount,
    runtime: getPublicRuntimeSnapshot()
  };
}

export async function getEftQueueOrders() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      customerEmail: true,
      status: true,
      updatedAt: true,
      manualEftPopUrl: true,
    },
    where: { status: { in: ["PENDING_EFT", "EFT_REVIEW"] } },
    orderBy: { updatedAt: "desc" },
    take: 50
  });

  return orders.map((order) => ({
    ...order,
    updatedAt: order.updatedAt.toISOString()
  }));
}
