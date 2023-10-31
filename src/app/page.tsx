"use client"
import Image from "next/image"
import { useState } from "react"

export default function Home() {
  const handleAnswer = async (event: React.FormEvent<HTMLElement>) => {
    event.preventDefault()

    const [query, setQuery] = useState("")

    // Clear the answer, chunks, and loading states
  }

  return <div></div>
}
