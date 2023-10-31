require("dotenv").config()
import { createClient } from "@supabase/supabase-js"
import { error } from "console"
import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from "eventsource-parser"

// Create a supabase client for admin operations
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const OpenAIStream = async (prompt: string) => {
  // POST request to openAI to set the mood
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "As a knowledgeable assistant, you have access to a vast database of information. Please provide concise and informative responses to questions related to the data you've ingested. Your answers should be in 3-5 sentences.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.8,
      stream: true,
    }),
  })

  if (response.status !== 200) {
    throw new Error("Error with OpenAI API call")
  }

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data

          if (data === "[DONE]") {
            controller.close()
            return
          }

          try {
            const json = JSON.parse(data)
            const text = json.choices[0].delta.content
            const queue = encoder.encode(text)
            controller.enqueue(queue)
          } catch (error) {
            controller.error(error)
          }
        }
      }

      const parser = createParser(onParse)

      for await (const chunk of response.body as any) {
        parser.feed(decoder.decode(chunk))
      }
    },
  })

  return stream
}
