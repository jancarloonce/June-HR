import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const GOOGLE_SERVICE_ACCOUNT_KEY = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
const FORCE_EXAM_RESULT = process.env.FORCE_EXAM_RESULT;

export async function POST(req: NextRequest) {
  try {
    // Forced test mode for debugging
    if (FORCE_EXAM_RESULT === "pass" || FORCE_EXAM_RESULT === "fail") {
      return NextResponse.json({
        isCorrect: FORCE_EXAM_RESULT === "pass",
        feedback: FORCE_EXAM_RESULT === "pass" ? "Test pass result" : "Test fail result",
        formulaAccuracy: FORCE_EXAM_RESULT === "pass" ? 100 : 0,
        calculationAccuracy: FORCE_EXAM_RESULT === "pass" ? 100 : 0,
        errors: FORCE_EXAM_RESULT === "pass" ? [] : ["Test error"],
        suggestions: FORCE_EXAM_RESULT === "pass" ? [] : ["Test suggestion"],
        versionA: {
          expected: 7.82,
          submitted: FORCE_EXAM_RESULT === "pass" ? 7.82 : 0,
          isCorrect: FORCE_EXAM_RESULT === "pass",
        },
      });
    }

    // Parse request body
    const body = await req.json();
    const sheetUrl = body?.sheetUrl;

    // Validate sheet URL
    if (!sheetUrl || typeof sheetUrl !== "string") {
      return NextResponse.json({ error: "Valid Sheet URL is required" }, { status: 400 });
    }

    // Extract Sheet ID from URL
    const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      return NextResponse.json({ error: "Invalid Google Sheet URL" }, { status: 400 });
    }
    const sheetId = match[1];

    // Authenticate Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    const sheets = google.sheets({ version: "v4", auth });

    // Request cell values, ensuring C33 returns the formula
    const ranges = ["C33", "B31:C31"];
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: ranges,
      valueRenderOption: "FORMULA", // Ensure formulas are returned, not values
    });

    const [conversionRateFormula, versionAData] = response.data.valueRanges || [];

    // Debugging logs
    console.log("Raw API Response:", JSON.stringify(response.data, null, 2));

    // Extract formula from C33
    const actualFormula = conversionRateFormula?.values?.[0]?.[0] || "";
    const expectedFormula = "=C31/B31";

    // Normalize formula for comparison
    const normalizeFormula = (formula: string): string => 
      formula.replace(/[\s\r\n]/g, "").toLowerCase();

    console.log("Raw Actual Formula:", actualFormula);
    console.log("Normalized Actual Formula:", normalizeFormula(actualFormula));
    console.log("Normalized Expected Formula:", normalizeFormula(expectedFormula));

    // Ensure exact formula match
    const formulaCorrect = normalizeFormula(actualFormula) === normalizeFormula(expectedFormula);
    console.log("Formula Correct?", formulaCorrect);

    // Extract conversion values (B31 = total visits, C31 = total conversions)
    const versionAValues = versionAData?.values?.[0] || [];
    const totalVisits = Number(versionAValues[0]) || 0;
    const totalConversions = Number(versionAValues[1]) || 0;

    // Expected conversion rate calculation
    const expectedRate = totalVisits > 0 ? (totalConversions / totalVisits) * 100 : 0;
    const submittedRate = Number(conversionRateFormula?.values?.[0]?.[0]) || 0;

    // Allow small floating-point differences
    const calculationCorrect = Math.abs(expectedRate - submittedRate) < 0.01;

    // Overall correctness
    const isCorrect = formulaCorrect && calculationCorrect;
    const formulaAccuracy = formulaCorrect ? 100 : 0;
    const calculationAccuracy = calculationCorrect ? 100 : 0;

    // Errors & suggestions
    const errors = [];
    const suggestions = [];

    if (!formulaCorrect) {
      errors.push("Conversion rate formula is incorrect.");
      suggestions.push("Check the conversion rate formula in cell C33. It should be =C31/B31.");
    }
    if (!calculationCorrect) {
      errors.push("Calculated conversion rate is incorrect.");
      suggestions.push("Verify your calculation for the conversion rate in cell C33.");
    }

    // Construct response object
    const result = {
      isCorrect,
      feedback: isCorrect
        ? "Congratulations! Your formula and calculation for the conversion rate are correct."
        : "There are some issues with your formula or calculation. Please check the errors and suggestions.",
      formulaAccuracy,
      calculationAccuracy,
      errors,
      suggestions,
      versionA: {
        expected: expectedRate,
        submitted: submittedRate,
        isCorrect: calculationCorrect,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error verifying exam:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: "Error verifying exam" }, { status: 500 });
  }
}
