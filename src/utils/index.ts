require("dotenv").config()
import { createClient } from "@supabase/supabase-js"
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

export const OpenAIStream = async (prompt: string) => {}
