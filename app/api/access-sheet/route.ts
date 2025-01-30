import { google } from "googleapis"
import { NextResponse } from "next/server"

const SHEET_ID = "1UQkuSlYqaBqobS5-TTFrqxTKx_efMjAeFH1mSzcpi0c"

// Parse the service account key from environment variable
const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}")

export async function GET() {
  try {
    // Configure auth client
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    // Create sheets client
    const sheets = google.sheets({ version: "v4", auth })

    // Get sheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "Sheet1", // Adjust range as needed
    })

    return NextResponse.json({ data: response.data.values }, { status: 200 })
  } catch (error) {
    console.error("Error accessing Google Sheet:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to access Google Sheet" },
      { status: 500 },
    )
  }
}

