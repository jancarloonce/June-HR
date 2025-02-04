import { type NextRequest, NextResponse } from "next/server"

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY

export async function POST(req: NextRequest) {
  console.log("API route called: Attempting to fetch HeyGen token")
  try {
    if (!HEYGEN_API_KEY) {
      console.error("HeyGen API key is missing from environment variables")
      return NextResponse.json({ error: "HeyGen API key is missing" }, { status: 500 })
    }

    console.log("HeyGen API key found, length:", HEYGEN_API_KEY.length)

    const res = await fetch("https://api.heygen.com/v1/streaming.create_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": HEYGEN_API_KEY,
      },
    })

    console.log("HeyGen API Response status:", res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.error("HeyGen API Error response:", errorText)
      return NextResponse.json(
        { error: `API request failed with status ${res.status}: ${errorText}` },
        { status: res.status },
      )
    }

    const data = await res.json()
    console.log("HeyGen API Response data structure:", JSON.stringify(data, null, 2))

    if (!data.data || !data.data.token) {
      console.error("Unexpected response structure:", JSON.stringify(data, null, 2))
      return NextResponse.json({ error: "Token not found in API response" }, { status: 500 })
    }

    console.log("Successfully retrieved HeyGen token")
    return NextResponse.json({ token: data.data.token }, { status: 200 })
  } catch (error) {
    console.error("Error retrieving HeyGen access token:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to retrieve access token",
        details: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      },
      { status: 500 },
    )
  }
}

