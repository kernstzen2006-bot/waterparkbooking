import { prisma } from "@/lib/prisma";
import { TicketTypeCode } from "@prisma/client";
import { dateOnlyTodayUTC } from "@/lib/dates";

export const NON_SWIMMER_COLOUR_POOL = ["Grey", "White", "Gold", "Silver"] as const;
export const SWIMMER_COLOUR_POOL = ["Green", "Pink", "Orange", "Red", "Purple"] as const;

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = copy[i];
    const b = copy[j];
    if (a === undefined || b === undefined) continue;
    copy[i] = b;
    copy[j] = a;
  }
  return copy;
}

export function wristbandKey(ticketType: TicketTypeCode, hasSwimmingPass: boolean): string {
  return `${ticketType}:${hasSwimmingPass ? "SWIM" : "NOSWIM"}`;
}

export function isWristbandRequired(ticketType: TicketTypeCode): boolean {
  return ticketType !== "UNDER3";
}

export async function ensureTodayColours(): Promise<void> {
  const today = dateOnlyTodayUTC();
  const existing = await prisma.dailyBandColour.findMany({ where: { date: today } });
  if (existing.length === 6) return;

  await regenerateTodayColours();
}

export async function regenerateTodayColours(): Promise<void> {
  const today = dateOnlyTodayUTC();

  // Remove existing for today
  await prisma.dailyBandColour.deleteMany({ where: { date: today } });

  // 6 combos: Adult/Kid/Pensioner x Swim true/false
  const combos: { ticketTypeCode: TicketTypeCode; hasSwimmingPass: boolean }[] = [
    { ticketTypeCode: "ADULT", hasSwimmingPass: false },
    { ticketTypeCode: "ADULT", hasSwimmingPass: true },
    { ticketTypeCode: "KID", hasSwimmingPass: false },
    { ticketTypeCode: "KID", hasSwimmingPass: true },
    { ticketTypeCode: "PENSIONER", hasSwimmingPass: false },
    { ticketTypeCode: "PENSIONER", hasSwimmingPass: true }
  ];

  const nonSwimmerColours = shuffled(NON_SWIMMER_COLOUR_POOL);
  const swimmerColours = shuffled(SWIMMER_COLOUR_POOL);
  let nonSwimmerIndex = 0;
  let swimmerIndex = 0;

  for (const combo of combos) {
    const colour = combo.hasSwimmingPass
      ? swimmerColours[swimmerIndex++]
      : nonSwimmerColours[nonSwimmerIndex++];
    if (colour === undefined) throw new Error("Wristband colour pool exhausted");

    await prisma.dailyBandColour.create({
      data: {
        date: today,
        ticketTypeCode: combo.ticketTypeCode,
        hasSwimmingPass: combo.hasSwimmingPass,
        colour,
      },
    });
  }
}

export async function getTodayWristband(ticketType: TicketTypeCode, hasSwimmingPass: boolean): Promise<{ label: string; colour: string | null }> {
  if (ticketType === "UNDER3") return { label: "NO_WRISTBAND", colour: null };
  const today = dateOnlyTodayUTC();

  const row = await prisma.dailyBandColour.findUnique({
    where: { date_ticketTypeCode_hasSwimmingPass: { date: today, ticketTypeCode: ticketType, hasSwimmingPass } }
  });

  if (!row) return { label: "MISSING_MAPPING", colour: null };
  return { label: "WRISTBAND", colour: row.colour };
}
