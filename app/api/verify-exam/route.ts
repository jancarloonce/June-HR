import { NextResponse } from "next/server"
import { google } from "googleapis"
import OpenAI from "openai"

const GOOGLE_SERVICE_ACCOUNT_KEY = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}")
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""
const FORCE_EXAM_RESULT = process.env.FORCE_EXAM_RESULT

const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

export async function POST(req: Request) {
  try {
    if (FORCE_EXAM_RESULT === "pass" || FORCE_EXAM_RESULT === "fail") {
      // Return a mock result based on the FORCE_EXAM_RESULT
      return NextResponse.json({
        isCorrect: FORCE_EXAM_RESULT === "pass",
        feedback: FORCE_EXAM_RESULT === "pass" ? "Test pass result" : "Test fail result",
        formulaAccuracy: FORCE_EXAM_RESULT === "pass" ? 100 : 0,
        calculationAccuracy: FORCE_EXAM_RESULT === "pass" ? 100 : 0,
        errors: FORCE_EXAM_RESULT === "pass" ? [] : ["Test error"],
        suggestions: FORCE_EXAM_RESULT === "pass" ? [] : ["Test suggestion"],
        versionA: {
          expected: 100,
          submitted: FORCE_EXAM_RESULT === "pass" ? 100 : 0,
          isCorrect: FORCE_EXAM_RESULT === "pass",
        },
        versionB: {
          expected: 100,
          submitted: FORCE_EXAM_RESULT === "pass" ? 100 : 0,
          isCorrect: FORCE_EXAM_RESULT === "pass",
        },
      })
    }

    const body = await req.json()
    const sheetUrl = body?.sheetUrl

    if (!sheetUrl || typeof sheetUrl !== "string") {
      return NextResponse.json({ error: "Valid Sheet URL is required" }, { status: 400 })
    }

    // Extract sheet ID from URL
    const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (!match || !match[1]) {
      return NextResponse.json({ error: "Invalid Google Sheet URL" }, { status: 400 })
    }
    const sheetId = match[1]

    // Authenticate with Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    })
    const sheets = google.sheets({ version: "v4", auth })

    // Fetch the problem statement (assuming it's in cell A1)
    const problemResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A1:A3",
    })

    const problemStatement =
      problemResponse.data.values?.map((row) => row[0]).join("\n") || "Problem statement not found"

    // Fetch the relevant cell ranges
    const ranges = ["B30", "D30", "C30:C31", "E30:E31"]
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ranges,
    })

    const [versionARate, versionBRate, versionAFormulas, versionBFormulas] = response.data.valueRanges || []

    // Prepare the prompt for OpenAI
    const prompt = `
    You are an expert in evaluating Google Sheets formulas and results for an e-commerce analytics exam.

    Problem Statement:
    ${problemStatement}

    Data:
    Version A Conversion Rate (B30): ${versionARate?.values?.[0]?.[0] || "N/A"}
    Version A Formulas:
    C30: ${versionAFormulas?.values?.[0]?.[0] || "N/A"}
    C31: ${versionAFormulas?.values?.[1]?.[0] || "N/A"}

    Version B Conversion Rate (D30): ${versionBRate?.values?.[0]?.[0] || "N/A"}
    Version B Formulas:
    E30: ${versionBFormulas?.values?.[0]?.[0] || "N/A"}
    E31: ${versionBFormulas?.values?.[1]?.[0] || "N/A"}

    Evaluation Criteria:
    1. Are the formulas correctly structured? (e.g., no hardcoded values, correct cell references)
    2. Do the formulas produce correct results?
    3. Are the final conversion rates calculated correctly?
    4. Is there proper handling of potential edge cases (e.g., division by zero)?

    Please provide a detailed analysis of the exam performance, including:
    - Whether each version's conversion rate is correct
    - Any errors in the formulas or calculations
    - Suggestions for improvement

    Response Format:
    {
      "isCorrect": boolean,
      "feedback": string,
      "formulaAccuracy": number (0-100),
      "calculationAccuracy": number (0-100),
      "errors": string[] (if any),
      "suggestions": string[] (if any),
      "versionA": { "expected": number, "submitted": number, "isCorrect": boolean },
      "versionB": { "expected": number, "submitted": number, "isCorrect": boolean }
    }
    `

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    })

    const aiResponse = completion.choices[0].message?.content

    if (!aiResponse) {
      throw new Error("No response from OpenAI")
    }

    const result = JSON.parse(aiResponse)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error verifying exam:", error)
    return NextResponse.json({ error: "Error verifying exam" }, { status: 500 })
  }
}

