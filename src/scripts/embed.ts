require("dotenv").config()
import { Chunk } from "@/types/index"
import { supabaseAdmin } from "@/utils"
import fs from "fs"
import openAI from "openai"
import moment from "moment"

// Define the size of a chunk, in tokens
const CHUNK_SIZE: number = 100

// Create a new instance of the OpenAI client
const openai = new openAI({ apiKey: process.env.OPENAI_API_KEY })

const processEmbeds = async () => {
  // For each file in the JSON folder
  const files = fs.readdirSync("src/datasets/JSON/")

  for (const file of files) {
    let index: number = 1

    try {
      // Read the JSON file
      const textChunksData = fs.readFileSync(
        `src/datasets/JSON/${file}`,
        "utf8"
      )

      const textChunks: Chunk[] = JSON.parse(textChunksData).map(
        (data: any) => {
          const chunk: Chunk = {
            text_title: `${file}_${index}`,
            text_date: moment().format(),
            content: data.text,
            content_tokens: data.tokens,
            embedding: [],
          }
          index++
          return chunk
        }
      )

      if (textChunks.length > 1) {
        for (let i = 1; i < textChunks.length; i++) {
          const chunk = textChunks[i]
          const prevChunk = textChunks[i - 1]

          if (chunk.content_tokens < 50 && prevChunk) {
            prevChunk.content += ` ${chunk.content}`
            prevChunk.content_tokens =
              chunk.content_tokens + prevChunk.content_tokens
            textChunks.splice(i, 1)
            i--
          }
        }
      }

      // Process each chunk and save the embedding on supabase
      for (const chunk of textChunks) {
        try {
          console.log(`Creating embedding for: ${chunk.text_title}`)

          // Create the embedding for the chunk
          const embed = await openai.embeddings.create({
            input: chunk.content,
            model: "text-embedding-ada-002",
          })

          chunk.embedding = embed.data[0].embedding

          console.log("Uploading chunk to supabase")

          // Save the complete chunk to supabase vector database
          const { data, error } = await supabaseAdmin
            .from("embeddings")
            .upsert([chunk])

          if (error) {
            console.error("Something went wrong uploading to supabase: ", error)
            return null
          }

          console.log(`Embedding saved to supabase: ${chunk.text_title}`)
        } catch (error) {
          console.error("Something went wrong getting embedding")
          return
        }
      }
    } catch (error) {
      console.error("Something went wrong getting/uploading embeds", error)
      return
    }
  }
}

processEmbeds()
