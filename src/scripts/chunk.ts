import fs from "fs"
import path from "path"
const pdfUtil = require("pdf-to-text")

//Define chunk size, working directory, output directory
const PDF_DIR = "src/datasets"
const CHUNK_SIZE = 150
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
    const files = fs.readdirSync(pdfDir)

    files.pop()

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

        const option = { from: 3, to: 157 }

        pdfUtil.pdfToText(pdfPath, option, function (error: any, data: string) {
          if (error) {
            console.error("Error extracting text from pdf file", error)
            return
          }

          console.log(data) //print text
        })
      }
    }

    // console.log(path)
  } catch (error) {
    console.error("Error converting PDFs to text chunks", error)
    return
  }
}

convertPDFsToChunks(PDF_DIR, CHUNK_SIZE, OUTPUT_DIR)
