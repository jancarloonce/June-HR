import type { NextApiRequest, NextApiResponse } from "next"
import { Configuration, OpenAIApi } from "openai"

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" })
  }

  const { sheetUrl } = req.body

  if (!sheetUrl) {
    return res.status(400).json({ message: "Sheet URL is required" })
  }

  try {
    // Here you would implement the logic to read the contents of the Google Sheet
    // For this example, we'll use a placeholder content
    const sheetContent = `
      A1: =SUM(B1:B5)
      B1: 10
      B2: 20
      B3: 30
      B4: 40
      B5: 50
    `

    const prompt = `
      Verify if the following spreadsheet formulas are correct:
      ${sheetContent}
      
      Respond with "PASS" if all formulas are correct, or "FAIL" if any formula is incorrect.
      Provide a brief explanation of your decision.
    `

    const completion = await openai.createCompletion({
      model: "text-davinci-002",
      prompt: prompt,
      max_tokens: 100,
    })

    const result = completion.data.choices[0].text?.trim().toUpperCase()
    const passed = result?.includes("PASS")

    return res.status(200).json({ passed, explanation: result })
  } catch (error) {
    console.error("Error verifying exam:", error)
    return res.status(500).json({ message: "Error verifying exam" })
  }
}

