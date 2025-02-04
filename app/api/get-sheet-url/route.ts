import { NextResponse } from "next/server"

export async function GET() {
  const sheetUrl = process.env.GOOGLE_SHEET_URL

  if (!sheetUrl) {
    console.error("Google Sheet URL is not set in environment variables")
    return NextResponse.json({ error: "Sheet URL not configured" }, { status: 500 })
  }

  try {
    // Validate the URL
    new URL(sheetUrl)

    console.log(`Returning sheet URL: ${sheetUrl}`)
    return NextResponse.json({ url: sheetUrl })
  } catch (error) {
    console.error("Invalid Google Sheet URL:", error)
    return NextResponse.json({ error: "Invalid Sheet URL" }, { status: 500 })
  }
}

