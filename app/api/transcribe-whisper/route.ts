// app/api/transcribe-whisper/route.ts

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Parse the incoming form data.
    const formData = await request.formData();
    const file = formData.get("audio");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Prepare a new FormData object for the OpenAI API.
    const outgoingFormData = new FormData();
    outgoingFormData.append("file", file, file.name || "recording.webm");
    outgoingFormData.append("model", "whisper-1");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    // Call OpenAI's Whisper transcription endpoint.
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          // Do not manually set the Content-Type header;
          // the browser will set the correct boundary for multipart/form-data.
        },
        body: outgoingFormData,
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Error from OpenAI API:", data);
      return NextResponse.json({ error: data }, { status: response.status });
    }

    // Return the transcript (usually in data.text).
    return NextResponse.json({ transcript: data.text });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}
