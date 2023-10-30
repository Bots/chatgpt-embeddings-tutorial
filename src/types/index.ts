export type Text = {
  title: string
  date: string
  content: string
  tokens?: number
  chunks?: Chunk[]
}

export type Chunk = {
  text_title: string
  text_date: string
  content: string
  content_tokens: number
  embedding: number[]
}

export type JSON = {
  tokens: number
  texts: Text[]
}
