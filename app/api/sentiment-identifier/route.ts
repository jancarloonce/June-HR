import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { question, userResponse } = await req.json()

    if (!question || !userResponse) {
      return NextResponse.json({ error: "Missing question or userResponse" }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a sentiment analyzer. Given a question and a user's response, determine if the sentiment is positive (proceed) or negative (do not proceed). Respond with a JSON object containing a 'proceed' boolean and a 'reason' string.",
        },
        {
          role: "user",
          content: `Question: "${question}" User Response: "${userResponse}"`,
        },
      ],
      temperature: 0,
    })

    const content = completion.choices[0].message.content

    if (!content) {
      throw new Error("No content in OpenAI response")
    }

    try {
      const result = JSON.parse(content)
      return NextResponse.json(result)
    } catch (parseError) {
      console.error("Error parsing OpenAI response:", parseError)
      return NextResponse.json({ error: "Failed to parse OpenAI response", content }, { status: 500 })
    }
  } catch (error) {
    console.error("Error in sentiment-identifier:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

