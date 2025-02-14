import { NextResponse } from "next/server"

export async function GET() {
  try {
    const sheetUrl = process.env.GOOGLE_SHEET_URL

    if (!sheetUrl) {
      throw new Error("Google Sheet URL not configured")
    }

    // Convert edit URL to embedded URL
    const embeddedUrl = sheetUrl.replace(/\/edit#gid=/, "/embed?gid=")

    // Validate the URL
    try {
      new URL(embeddedUrl)
    } catch (e) {
      console.error("Invalid sheet URL:", embeddedUrl)
      throw new Error("Invalid sheet URL")
    }

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
      theoreticalAnswer: "",
    }

    console.log("Returning sheet URL:", embeddedUrl)

    return NextResponse.json({
      url: embeddedUrl,
      data: sheetData,
    })
  } catch (error) {
    console.error("Error getting sheet data:", error)
    return NextResponse.json({ error: "Failed to get sheet data" }, { status: 500 })
  }
}

