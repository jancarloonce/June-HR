import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { campaignDescription } = await req.json()

    if (!campaignDescription) {
      return NextResponse.json({ error: "Missing campaign description" }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an AI assistant helping to generate follow-up questions for a job interview. Based on the candidate's description of their most successful campaign, create a relevant and insightful follow-up question.",
        },
        {
          role: "user",
          content: `The candidate described their most successful campaign as follows: "${campaignDescription}". Generate a follow-up question to gain more insights into their experience and skills.`,
        },
      ],
      temperature: 0.7,
    })

    const followUpQuestion = completion.choices[0].message.content

    if (!followUpQuestion) {
      throw new Error("No follow-up question generated")
    }

    return NextResponse.json({ followUpQuestion })
  } catch (error) {
    console.error("Error in generate-follow-up:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

