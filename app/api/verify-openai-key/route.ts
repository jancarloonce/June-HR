import { NextResponse } from "next/server"

export async function GET() {
  const openaiKey = process.env.OPENAI_API_KEY

  if (openaiKey) {
    // Mask the key for security
    const maskedKey = `${openaiKey.slice(0, 5)}...${openaiKey.slice(-5)}`
    return NextResponse.json({ message: `OpenAI API key is set. Key starts with: ${maskedKey}` })
  } else {
    return NextResponse.json({ error: "OpenAI API key is not set" }, { status: 400 })
  }
}

