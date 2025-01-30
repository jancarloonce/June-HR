import OpenAI from "openai"

export class OpenAIAssistant {
  private client: OpenAI | null = null
  private assistant: any = null
  private thread: any = null

  constructor() {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY
    if (!apiKey) {
      console.warn("OpenAI API key is not set in environment variables")
      return
    }
    try {
      this.client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      })
    } catch (error) {
      console.error("Error initializing OpenAI client:", error)
    }
  }

  async initialize() {
    if (!this.client) {
      console.warn("OpenAI client not initialized. Skipping assistant creation.")
      return
    }

    try {
      console.log("Creating OpenAI Assistant...")
      this.assistant = await this.client.beta.assistants.create({
        name: "June the HR Assistant",
        instructions:
          "You are June, an HR assistant for JC Company. You love reading books as a hobby. When the user mentions 'open calendar', respond with 'OPEN_CALENDAR' at the start of your message. When the user mentions 'show profile', respond with 'SHOW_PROFILE' at the start of your message. For any other requests, respond normally.",
        tools: [],
        model: "gpt-4-turbo-preview",
      })
      console.log("OpenAI Assistant created successfully")

      console.log("Creating OpenAI Thread...")
      this.thread = await this.client.beta.threads.create()
      console.log("OpenAI Thread created successfully")
    } catch (error) {
      console.error("Error initializing OpenAI Assistant:", error)
      throw new Error(
        `Failed to initialize OpenAI Assistant: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
      )
    }
  }

  async getResponse(userMessage: string): Promise<string> {
    if (!this.client || !this.assistant || !this.thread) {
      console.warn("OpenAI Assistant not fully initialized. Using fallback response.")
      return this.getFallbackResponse(userMessage)
    }

    try {
      console.log("Adding user message to thread...")
      await this.client.beta.threads.messages.create(this.thread.id, {
        role: "user",
        content: userMessage,
      })

      console.log("Creating and running assistant...")
      const run = await this.client.beta.threads.runs.create(this.thread.id, { assistant_id: this.assistant.id })

      console.log("Waiting for run to complete...")
      let runStatus = await this.client.beta.threads.runs.retrieve(this.thread.id, run.id)
      while (runStatus.status !== "completed") {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        runStatus = await this.client.beta.threads.runs.retrieve(this.thread.id, run.id)
      }

      console.log("Retrieving assistant's response...")
      const messages = await this.client.beta.threads.messages.list(this.thread.id)
      const lastMessage = messages.data.filter((msg) => msg.role === "assistant")[0]

      if (lastMessage && lastMessage.content[0].type === "text") {
        return lastMessage.content[0].text.value
      }

      return "Sorry, I couldn't process your request."
    } catch (error) {
      console.error("Error getting response from OpenAI Assistant:", error)
      return this.getFallbackResponse(userMessage)
    }
  }

  private getFallbackResponse(userMessage: string): string {
    if (userMessage.toLowerCase().includes("open calendar")) {
      return "OPEN_CALENDAR I'll open the calendar for you. Is there a specific date or event you're looking for?"
    } else if (userMessage.toLowerCase().includes("show profile")) {
      return "SHOW_PROFILE Of course! I'm pulling up your profile now. What information would you like to review or update?"
    } else {
      return "I'm here to help with any HR-related questions or tasks. How can I assist you today?"
    }
  }
}

