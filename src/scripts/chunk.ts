require("dotenv").config()
import { Chunk } from "@/types/index"
import { supabaseAdmin } from "@/utils"
import { encode } from "gpt-3-encoder"
import moment from "moment"
import openAI from "openai"
import path from "path"
import fs from "fs"
const pdfUtil = require("pdf-to-text")

// Create a new instance of the OpenAI client
const openai = new openAI({ apiKey: process.env.OPENAI_API_KEY })

//Define chunk size, working directory, output directory
const PDF_DIR = "src/datasets"
const CHUNK_SIZE = 100

const convertPDFsToChunks = (pdfDir: string, chunkSize: number) => {
  try {
    // Read the list of files in the PDF directory
    let files = fs.readdirSync(pdfDir)

    // For each pdf file in the pdf directory
    for (const file of files) {
      // Check if file has .pdf extension
      if (path.extname(file).toLowerCase() === ".pdf") {
        // Get the relative path to each file (src/datasets/whatever.pdf)
        const pdfPath = path.join(pdfDir, file)

        // Get the relative path to the chunked json file
        // const outputJSONPath = path.join(
        //   outputDir,
        //   path.basename(file, path.extname(file)) + ".json"
        // )

        const option = { from: 0, to: -1 }

        pdfUtil.pdfToText(pdfPath, option, function (error: any, data: string) {
          if (error) {
            console.error("Error extracting text from pdf file", error)
            return
          }

          // Clean up text, remove linebreaks
          const text = data.replace(/\n/g, " ").replace(/\s+/g, " ")

          const textChunks: any[] = []
          let currentChunk: string = ""
          let currentTokenCount: number = 0

          // Split the text into chunks according to the max token variable
          for (const sentence of text.split(".")) {
            // Figure out how many tokens each sentence is
            const sentenceTokenCount = encode(sentence).length

            if (currentTokenCount + sentenceTokenCount <= chunkSize) {
              currentChunk += sentence + ". "
              currentTokenCount += sentenceTokenCount
            } else {
              textChunks.push({
                text: currentChunk.trim(),
                tokens: currentTokenCount,
              })
              currentChunk = sentence + ". "
              currentTokenCount = sentenceTokenCount
            }
          }

          // Add the last chunk
          if (currentChunk) {
            textChunks.push({
              text: currentChunk.trim(),
              tokens: currentTokenCount,
            })
          }

          processEmbeds(textChunks, path.basename(file))
        })
      }
    }
  } catch (error) {
    console.error("Error converting PDFs to text chunks", error)
    return
  }
}

const processEmbeds = async (textChunks: any[], filename: string) => {
  console.log("filename", filename)

  try {
    textChunks = textChunks.map((data: any, index: number) => {
      const chunk: Chunk = {
        text_title: `${filename}_${index}`,
        text_date: moment().format(),
        content: data.text,
        content_tokens: data.tokens,
        embedding: [],
      }
      index++
      return chunk
    })

    console.log("textChunks", textChunks)

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
        console.error("Something went wrong getting embedding", error)
        return
      }
    }
  } catch (error) {
    console.error("Something went wrong getting/uploading embeds", error)
    return
  }
  // }
}

const textChunks = convertPDFsToChunks(PDF_DIR, CHUNK_SIZE)
