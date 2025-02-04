import { NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(req: Request) {
  try {
    const { question, userResponse } = await req.json()

    if (!question || !userResponse) {
      return NextResponse.json({ error: "Missing question or user response" }, { status: 400 })
    }

    const prompt = `
      Given the following question and user response, determine if the user's intent is to proceed or not.
      Return a JSON object with a single "proceed" key set to true if the user intends to proceed, or false if not.

      Question: "${question}"
      User Response: "${userResponse}"

      Respond with only a JSON object in this format: {"proceed": true/false}
    `

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
    })

    const result = JSON.parse(text)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in sentiment-identifier:", error)
    return NextResponse.json({ error: "Failed to process sentiment" }, { status: 500 })
  }
}

