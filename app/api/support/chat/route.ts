import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { buildSupportChatInstruction, type SupportChatMessage } from "@/lib/supportChat";

const messageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().trim().min(1).max(2000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(12),
});

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
  };
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toGeminiContents(messages: SupportChatMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    parts: [{ text: message.text }],
  }));
}

function readGeminiText(payload: GeminiGenerateContentResponse): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text?.trim() ?? "")
    .filter(Boolean)
    .join("\n")
    .trim();
}

export async function POST(req: NextRequest) {
  if (!env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Support chat is not configured yet." }, { status: 503 });
  }

  try {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid chat payload." }, { status: 400 });
    }

    const messages = parsed.data.messages;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json({ error: "The last chat message must be from the user." }, { status: 400 });
    }

    const systemInstruction = await buildSupportChatInstruction();
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: toGeminiContents(messages),
          generationConfig: {
            temperature: 0.3,
            topP: 0.8,
            maxOutputTokens: 400,
          },
        }),
        cache: "no-store",
      }
    );

    const payload = (await geminiRes.json()) as GeminiGenerateContentResponse;
    if (!geminiRes.ok) {
      const reason = payload.error?.message || "Gemini request failed.";
      console.error("[support/chat] gemini error", {
        status: geminiRes.status,
        reason,
      });
      return NextResponse.json({ error: "Support chat is temporarily unavailable." }, { status: 502 });
    }

    const reply = readGeminiText(payload);
    if (!reply) {
      console.error("[support/chat] empty model response", {
        finishReason: payload.candidates?.[0]?.finishReason ?? "unknown",
      });
      return NextResponse.json({ error: "Support chat did not return an answer." }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown support chat error";
    console.error("[support/chat] request failed", { reason });
    return NextResponse.json({ error: "Support chat is temporarily unavailable." }, { status: 500 });
  }
}
