import { OpenAI } from "openai"
import { NextResponse } from "next/server"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { initialData, submittedData } = await req.json()

    if (!initialData || !submittedData) {
      return NextResponse.json({ error: "Both initial and submitted sheet data are required" }, { status: 400 })
    }

    // Prepare the prompt for OpenAI
    const prompt = `
    You are an expert in evaluating Google Sheets formulas and results for an e-commerce analytics exam.
    
    Context:
    - The exam is about analyzing homepage version A vs B conversion rates
    - Conversion rate = (Total Orders / Total Visits) * 100
    - Formula accuracy and final percentage results are crucial
    
    Initial Sheet Data:
    ${JSON.stringify(initialData, null, 2)}
    
    Submitted Sheet Data:
    ${JSON.stringify(submittedData, null, 2)}
    
    Please evaluate:
    1. Are the formulas correctly structured?
    2. Are the calculations accurate?
    3. Do the final results match expected values?
    4. Is the conversion rate calculation correct for both versions?
    
    Provide your evaluation in the following format:
    {
      "isCorrect": boolean,
      "feedback": string,
      "formulaAccuracy": number (0-100),
      "calculationAccuracy": number (0-100),
      "errors": string[] (if any),
      "suggestions": string[] (if any)
    }
    `

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4",
      temperature: 0,
    })

    const result = JSON.parse(completion.choices[0].message.content || "{}")

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error verifying exam:", error)
    return NextResponse.json({ error: "Error verifying exam" }, { status: 500 })
  }
}

