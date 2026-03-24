import { TicketTypeCode } from "@prisma/client";

export const DAY_VISITOR_SWIM_ADDON_CENTS = 11000;
export const SWIM_ADDON_CENTS = DAY_VISITOR_SWIM_ADDON_CENTS;

export const SCHOOL_OUTING_SWIM_ADDON_CENTS = 5000;
export const BIRTHDAY_PARTY_HUT_CENTS = 35000;
export const BIRTHDAY_PARTY_SINGLE_TABLE_CENTS = 25000;

export const DAY_VISITOR_TYPE_ORDER: TicketTypeCode[] = ["ADULT", "KID", "PENSIONER", "UNDER3"];

export const DAY_VISITOR_TYPE_CONFIG: Record<
  TicketTypeCode,
  {
    name: string;
    basePrice: number;
    summary: string;
  }
> = {
  ADULT: {
    name: "Adult Day Visitor",
    basePrice: 10500,
    summary: "Adults",
  },
  KID: {
    name: "Child Day Visitor (3-17 years)",
    basePrice: 9000,
    summary: "Ages 3-17 years",
  },
  PENSIONER: {
    name: "Pensioner Day Visitor",
    basePrice: 9000,
    summary: "Pensioners",
  },
  UNDER3: {
    name: "2 Years And Under",
    basePrice: 0,
    summary: "2 years and under",
  },
};

export const SCHOOL_OUTING_OPTIONS = [
  {
    code: "HALF_DAY",
    label: "Half day",
    hours: "09:00 - 13:00",
    priceCents: 7500,
  },
  {
    code: "FULL_DAY",
    label: "Full day",
    hours: "09:00 - 16:00",
    priceCents: 9500,
  },
] as const;

export const BIRTHDAY_PARTY_OPTIONS = [
  {
    code: "OPTION_1",
    label: "Option 1",
    description: "R195 per child",
    priceCents: 19500,
    minimumChildren: 10,
  },
  {
    code: "OPTION_2",
    label: "Option 2",
    description: "R220 per child including a hotdog",
    priceCents: 22000,
    minimumChildren: 10,
  },
] as const;

export const BIRTHDAY_PARTY_EXTRAS = [
  {
    code: "COVERED_HUT",
    label: "Covered hut",
    priceCents: BIRTHDAY_PARTY_HUT_CENTS,
  },
  {
    code: "SINGLE_COVERED_TABLE",
    label: "Single covered table",
    priceCents: BIRTHDAY_PARTY_SINGLE_TABLE_CENTS,
  },
] as const;

type DayVisitorTypeRow = {
  code: TicketTypeCode;
  name: string;
  basePrice: number;
};

export function getConfiguredDayVisitorTypes<T extends DayVisitorTypeRow>(
  rows: T[]
): Array<Omit<T, "name" | "basePrice"> & { name: string; basePrice: number }> {
  return rows
    .map((row) => {
      const config = DAY_VISITOR_TYPE_CONFIG[row.code];
      return {
        ...row,
        name: config.name,
        basePrice: config.basePrice,
      };
    })
    .sort(
      (a, b) => DAY_VISITOR_TYPE_ORDER.indexOf(a.code) - DAY_VISITOR_TYPE_ORDER.indexOf(b.code)
    );
}
