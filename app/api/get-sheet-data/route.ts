import { NextResponse } from "next/server"

export async function GET() {
  try {
    const sheetData = {
      versionA: {
        totalVisits: 84073,
        totalOrders: 6574,
        conversionRate: 7.82,
        totalVisitsFormula: "=SUM(B17:B29)",
        totalOrdersFormula: "=SUM(C17:C29)",
        conversionRateFormula: "=(C29/B29)*100",
      },
      versionB: {
        totalVisits: 30341,
        totalOrders: 2666,
        conversionRate: 8.79,
        totalVisitsFormula: "=SUM(D17:D29)",
        totalOrdersFormula: "=SUM(E17:E29)",
        conversionRateFormula: "=(E29/D29)*100",
      },
    }

    return NextResponse.json({ data: sheetData })
  } catch (error) {
    console.error("Error getting sheet data:", error)
    return NextResponse.json({ error: "Failed to get sheet data" }, { status: 500 })
  }
}

