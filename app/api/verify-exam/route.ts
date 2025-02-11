import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

// Constants
const GOOGLE_SERVICE_ACCOUNT_KEY = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
const FORCE_EXAM_RESULT = process.env.FORCE_EXAM_RESULT;
const EXPECTED_FORMULA = "=C31/B31";
const CELL_RANGES = ["C33", "B31:C31"];
const FLOATING_POINT_TOLERANCE = 0.01;

// Types
type ExamResult = {
  isCorrect: boolean;
  feedback: string;
  formulaAccuracy: number;
  calculationAccuracy: number;
  errors: string[];
  suggestions: string[];
  versionA: {
    expected: number;
    submitted: number;
    isCorrect: boolean;
  };
  followUp: Array<{ question: string; answer: string }>;
};

// Helper functions
const normalizeFormula = (formula: string): string => 
  formula.replace(/[\s\r\n]/g, "").toLowerCase();

const extractSheetId = (url: string): string | null => {
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

const calculateConversionRate = (visits: number, conversions: number): number =>
  visits > 0 ? (conversions / visits) * 100 : 0;

const createGoogleSheetsClient = async () => {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_SERVICE_ACCOUNT_KEY,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
};

// Main handler
export async function POST(req: NextRequest) {
  try {
    if (FORCE_EXAM_RESULT === "pass" || FORCE_EXAM_RESULT === "fail") {
      return handleForcedExamResult();
    }

    const body = await req.json();
    const sheetUrl = body?.sheetUrl;

    if (!sheetUrl || typeof sheetUrl !== "string") {
      return NextResponse.json({ error: "Valid Sheet URL is required" }, { status: 400 });
    }

    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      return NextResponse.json({ error: "Invalid Google Sheet URL" }, { status: 400 });
    }

    const sheets = await createGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: sheetId,
      ranges: CELL_RANGES,
      valueRenderOption: "FORMULA",
    });

    const [conversionRateFormula, versionAData] = response.data.valueRanges || [];

    const actualFormula = conversionRateFormula?.values?.[0]?.[0] || "";
    const formulaCorrect = normalizeFormula(actualFormula) === normalizeFormula(EXPECTED_FORMULA);

    const versionAValues = versionAData?.values?.[0] || [];
    const totalVisits = Number(versionAValues[0]) || 0;
    const totalConversions = Number(versionAValues[1]) || 0;

    const expectedRate = calculateConversionRate(totalVisits, totalConversions);
    const submittedRate = Number(conversionRateFormula?.values?.[0]?.[0]) || 0;

    const calculationCorrect = Math.abs(expectedRate - submittedRate) < FLOATING_POINT_TOLERANCE;

    const result = generateExamResult(formulaCorrect, calculationCorrect, expectedRate, submittedRate, body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error verifying exam:", error);
    return NextResponse.json({ error: "Error verifying exam" }, { status: 500 });
  }
}

function handleForcedExamResult(): NextResponse {
  const isPass = FORCE_EXAM_RESULT === "pass";
  return NextResponse.json({
    isCorrect: isPass,
    feedback: isPass ? "Test pass result" : "Test fail result",
    formulaAccuracy: isPass ? 100 : 0,
    calculationAccuracy: isPass ? 100 : 0,
    errors: isPass ? [] : ["Test error"],
    suggestions: isPass ? [] : ["Test suggestion"],
    versionA: {
      expected: 7.82,
      submitted: isPass ? 7.82 : 0,
      isCorrect: isPass,
    },
  });
}

function generateExamResult(
  formulaCorrect: boolean,
  calculationCorrect: boolean,
  expectedRate: number,
  submittedRate: number,
  body: any
): ExamResult {
  const isCorrect = formulaCorrect && calculationCorrect;
  const errors: string[] = [];
  const suggestions: string[] = [];

  if (!formulaCorrect) {
    errors.push("Conversion rate formula is incorrect.");
    suggestions.push(`Check the conversion rate formula in cell C33. It should be ${EXPECTED_FORMULA}.`);
  }
  if (!calculationCorrect) {
    errors.push("Calculated conversion rate is incorrect.");
    suggestions.push("Verify your calculation for the conversion rate in cell C33.");
  }

  const followUpQuestion = body?.followUpQuestion || "Can you describe the most effective strategy you used?";
  const followUpResponse = body?.followUpResponse || "I added targeted ads.";

  return {
    isCorrect,
    feedback: isCorrect
      ? "Congratulations! Your formula and calculation for the conversion rate are correct."
      : "There are some issues with your formula or calculation. Please check the errors and suggestions.",
    formulaAccuracy: formulaCorrect ? 100 : 0,
    calculationAccuracy: calculationCorrect ? 100 : 0,
    errors,
    suggestions,
    versionA: {
      expected: expectedRate,
      submitted: submittedRate,
      isCorrect: calculationCorrect,
    },
    followUp: [
      { question: "Follow-up Question", answer: followUpQuestion },
      { question: "Follow-up Response", answer: followUpResponse },
    ],
  };
}

