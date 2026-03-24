"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

const STARTER_QUESTIONS = [
  "What are your ticket prices?",
  "How does manual EFT work?",
  "When do I receive my tickets?",
  "Do children aged 2 and under need a ticket?",
];

export function SupportChat(props: {
  venueName: string;
  supportEmail: string;
  enabled: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      text: `Hi! I can help with ${props.venueName} booking, ticket, EFT, and support questions.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(rawText?: string) {
    if (loading || !props.enabled) return;

    const text = (rawText ?? input).trim();
    if (!text) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      const reply = data.reply;
      if (!res.ok || !reply) {
        setError(data.error ?? "Support chat is temporarily unavailable.");
        return;
      }

      setMessages((current) => [...current, { role: "model", text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Support chat is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ask Support AI</h2>
          <p className="mt-1 text-sm text-gray-600">
            Ask about tickets, bookings, EFT, POP uploads, or getting your QR PDF.
          </p>
        </div>
        <div className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">Gemini</div>
      </div>

      {!props.enabled ? (
        <div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          Live chat is not configured yet. Please contact <span className="font-semibold">{props.supportEmail}</span>.
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {STARTER_QUESTIONS.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => void sendMessage(question)}
            disabled={loading || !props.enabled}
            className="rounded-full border px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {question}
          </button>
        ))}
      </div>

      <div className="mt-4 h-[420px] overflow-y-auto rounded border bg-gray-50 p-3">
        <div className="space-y-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-[85%] rounded-2xl bg-blue-600 px-4 py-3 text-sm text-white"
                    : "max-w-[85%] rounded-2xl bg-white px-4 py-3 text-sm text-gray-800 shadow-sm"
                }
              >
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
                  {message.role === "user" ? "You" : "Support AI"}
                </div>
                <div className="whitespace-pre-wrap leading-6">{message.text}</div>
              </div>
            </div>
          ))}

          {loading ? (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 shadow-sm">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">Support AI</div>
                Thinking...
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error} If this keeps happening, please email {props.supportEmail}.
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Ask a question about bookings, tickets, or support..."
          className="min-h-[88px] flex-1 rounded border px-3 py-2 text-sm outline-none focus:border-blue-500"
          disabled={loading || !props.enabled}
        />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={loading || !props.enabled || !input.trim()}
          className="self-end rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        The assistant answers from the website's current booking information. For missing venue-specific details, contact {props.supportEmail}.
      </p>
    </div>
  );
}
