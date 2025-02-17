import { NextResponse } from "next/server"
import { google } from "googleapis"
import crypto from "crypto"
import type { sheets_v4 } from "googleapis"

// Type guard function
function isValidSheet(sheet: any): sheet is sheets_v4.Schema$Sheet {
  return sheet && typeof sheet === "object" && "properties" in sheet
}

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

export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    const originalSheetUrl = process.env.GOOGLE_SHEET_URL

    if (!originalSheetUrl) {
      throw new Error("Google Sheet URL not configured")
    }

    // Initialize Google APIs
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ""),
      scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"],
    })

    const sheets = google.sheets({ version: "v4", auth })
    const drive = google.drive({ version: "v3", auth })

    // Extract file ID from the original URL
    const fileId = originalSheetUrl.match(/[-\w]{25,}/)![0]

    // Create a copy of the entire spreadsheet
    const uuid = crypto.randomUUID()
    const title = `Candidate Exam - ${name} - ${uuid}`
    const copyResponse = await drive.files.copy({
      fileId: fileId,
      requestBody: {
        name: title,
      },
    })

    const newSpreadsheetId = copyResponse.data.id

    if (!newSpreadsheetId) {
      throw new Error("Failed to create a copy of the spreadsheet")
    }

    const sheetsResponse = await sheets.spreadsheets.get({
      spreadsheetId: newSpreadsheetId,
    })

    const allSheets = sheetsResponse.data.sheets ?? []
    const sheetToKeep = allSheets.find(
      (sheet): sheet is sheets_v4.Schema$Sheet => isValidSheet(sheet) && sheet.properties?.title === "Sheet1",
    )

    if (sheetToKeep?.properties) {
      // Delete all sheets except the one we want to keep
      const deleteRequests = allSheets
        .filter(
          (sheet): sheet is sheets_v4.Schema$Sheet =>
            isValidSheet(sheet) &&
            !!sheet.properties &&
            !!sheetToKeep.properties &&
            sheet.properties.sheetId !== sheetToKeep.properties.sheetId,
        )
        .map((sheet) => ({
          deleteSheet: {
            sheetId: sheet.properties!.sheetId, // non-null assertion since we know properties exist here
          },
        }))

      if (deleteRequests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: newSpreadsheetId,
          requestBody: {
            requests: deleteRequests,
          },
        })
      }

      // Rename the remaining sheet to "Exam Sheet" if it's not already named that
      if (sheetToKeep.properties.title !== "Exam Sheet") {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: newSpreadsheetId,
          requestBody: {
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId: sheetToKeep.properties.sheetId,
                    title: "Exam Sheet",
                  },
                  fields: "title",
                },
              },
            ],
          },
        })
      }
    } else {
      console.warn("Could not find 'Sheet1' in the copied spreadsheet. The spreadsheet structure might be unexpected.")
    }

    // Set permissions for anyone with the link to edit
    await drive.permissions.create({
      fileId: newSpreadsheetId,
      requestBody: {
        role: "writer",
        type: "anyone",
      },
    })

    const newSheetUrl = `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit?usp=sharing`

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

    console.log("Returning new sheet URL:", newSheetUrl)

    return NextResponse.json({
      url: newSheetUrl,
      data: sheetData,
    })
  } catch (error) {
    console.error("Error creating or copying sheet:", error)
    return NextResponse.json({ error: "Failed to create or copy sheet" }, { status: 500 })
  }
}

