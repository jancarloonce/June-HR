import { NextResponse } from "next/server"
import { google } from "googleapis"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || ""),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })

    const sheets = google.sheets({ version: "v4", auth })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1UQkuSlYqaBqobS5-TTFrqxTKx_efMjAeFH1mSzcpi0c",
      range: "A1:Z100",
    })

    const rows = response.data.values

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No data found in the sheet" }, { status: 400 })
    }

    // Convert the sheet data to a string for AI analysis
    const sheetContent = rows.map((row) => row.join(", ")).join("\n")

    const prompt = `
      You are an AI evaluator checking the correctness of formulas in a spreadsheet exam about website metrics and conversion rates.
      Below is the content of the exam sheet:

      ${sheetContent}

      Analyze the formulas and values. Check if they correctly calculate the required metrics, verify the logic and mathematical operations, 
      and ensure they reference the correct cells. Determine if the candidate has passed the exam based on the correctness of their formulas and calculations.

      Provide your analysis in the following JSON format:
      {
        "passed": boolean,
        "score": number (percentage),
        "feedback": [array of specific feedback for each question or formula],
        "overallFeedback": "A summary of the candidate's performance"
      }

      Ensure that your response is a valid JSON object.
    `

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
    })

    console.log("OpenAI response:", text)

    try {
      const result = JSON.parse(text)
      return NextResponse.json(result)
    } catch (error) {
      console.error("Error parsing OpenAI response:", error)
      console.log("Raw OpenAI response:", text)

      // Attempt to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0])
          return NextResponse.json(extractedJson)
        } catch (extractError) {
          console.error("Error parsing extracted JSON:", extractError)
        }
      }

      // If JSON extraction fails, return a formatted error response
      return NextResponse.json({
        passed: false,
        score: 0,
        feedback: ["Error analyzing formulas. Please try again."],
        overallFeedback: "Unable to evaluate the exam due to an unexpected response format.",
      })
    }
  } catch (error) {
    console.error("Error verifying exam:", error)
    return NextResponse.json(
      {
        passed: false,
        score: 0,
        feedback: ["Error occurred while verifying the exam."],
        overallFeedback: "Unable to evaluate the exam due to a technical issue. Please try again.",
      },
      { status: 500 },
    )
  }
}

