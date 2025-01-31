import { NextResponse } from "next/server"

export async function GET() {
  // Make sure this URL is correct and the sheet is publicly accessible
  const sheetUrl =
    "https://docs.google.com/spreadsheets/d/1UQkuSlYqaBqobS5-TTFrqxTKx_efMjAeFH1mSzcpi0c/edit?usp=sharing"

  console.log(`Returning sheet URL: ${sheetUrl}`)
  return NextResponse.json({ url: sheetUrl })
}

