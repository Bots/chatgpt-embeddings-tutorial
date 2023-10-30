import fs from "fs"
import path from "path"
import { encode } from "gpt-3-encoder"
const pdfUtil = require("pdf-to-text")

//Define chunk size, working directory, output directory
const PDF_DIR = "src/datasets"
const CHUNK_SIZE = 100
const OUTPUT_DIR = "src/datasets/JSON"

const convertPDFsToChunks = (
  pdfDir: string,
  chunkSize: number,
  outputDir: string
) => {
  try {
    // Check for output directory and create it if necessary
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Read the list of files in the PDF directory
    let files = fs.readdirSync(pdfDir)

    files = files.filter((e) => e !== "JSON")

    // For each pdf file in the pdf directory
    for (const file of files) {
      // Check if file has .pdf extension
      if (path.extname(file).toLowerCase() === ".pdf") {
        // Get the relative path to each file (src/datasets/whatever.pdf)
        const pdfPath = path.join(pdfDir, file)

        // Get the relative path to the chunked json file
        const outputJSONPath = path.join(
          outputDir,
          path.basename(file, path.extname(file)) + ".json"
        )

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

          fs.writeFileSync(outputJSONPath, JSON.stringify(textChunks))

          console.log(`Converted ${pdfPath} to ${outputJSONPath}`)
        })
      }
    }
  } catch (error) {
    console.error("Error converting PDFs to text chunks", error)
    return
  }
}

convertPDFsToChunks(PDF_DIR, CHUNK_SIZE, OUTPUT_DIR)
