// app/api/transcribe-google/route.ts

import { NextResponse } from "next/server";
import { SpeechClient, protos } from "@google-cloud/speech";

export async function POST(request: Request) {
  try {
    // Parse the incoming form data.
    const formData = await request.formData();
    const file = formData.get("audio");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Read the file as an ArrayBuffer then encode it in base64.
    const arrayBuffer = await file.arrayBuffer();
    const audioBytes = Buffer.from(arrayBuffer).toString("base64");

    // Initialize the Google Cloud Speech client using your service account credentials.
    const client = new SpeechClient({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}"),
    });

    // Configure the request.
    // Adjust 'encoding' and 'sampleRateHertz' based on your audio file format.
    const requestConfig: protos.google.cloud.speech.v1.IRecognizeRequest = {
      config: {
        encoding: "LINEAR16", // or another supported encoding based on your file
        sampleRateHertz: 16000, // adjust as needed
        languageCode: "en-US",
      },
      audio: {
        content: audioBytes,
      },
    };

    // Await the response and assert its type.
    const result = (await client.recognize(requestConfig)) as [
      protos.google.cloud.speech.v1.IRecognizeResponse,
      unknown,
      unknown
    ];
    const response = result[0];

    // Build the transcription.
    const transcription =
      response.results
        ?.map(
          (result: protos.google.cloud.speech.v1.ISpeechRecognitionResult) =>
            result.alternatives?.[0].transcript
        )
        .join(" ") || "";

    return NextResponse.json({ transcript: transcription });
  } catch (error) {
    console.error("Error transcribing audio with Google Cloud Speech-to-Text:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
