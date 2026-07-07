"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { answerQuestion } from "@/lib/poolBot";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hey! 🎱 I'm Osso. Ask me anything about the scoreboard — like \"who is winning?\" or \"why is Brian in front of Alvin?\"",
    },
  ]);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(e) {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);

    // Always answer from fresh data so the bot never lags the table.
    const { data } = await supabase.from("results").select("*");
    const reply = answerQuestion(question, data ?? []);
    setMessages((m) => [...m, { role: "bot", text: reply }]);
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn-glow fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        title="Ask Osso"
      >
        {open ? "✕" : "🎱"}
      </button>

      {open && (
        <div
          className="glass fixed bottom-24 right-5 z-30 flex h-[480px] max-h-[70vh] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl"
          style={{ background: "rgba(3, 18, 11, 0.92)" }}
        >
          <div className="border-b border-white/10 px-5 py-4">
            <div className="font-bold tracking-tight">
              <span className="serif-accent text-lg">Osso</span> 🎱
            </div>
            <div className="text-xs text-emerald-100/50">
              Knows everything on the scoreboard
            </div>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-emerald-400/90 text-emerald-950 shadow-[inset_0_2px_2px_rgba(255,255,255,0.3)]"
                    : "bg-white/8 text-emerald-50 ring-1 ring-white/10"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the standings…"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-sm outline-none placeholder:text-emerald-100/30 focus:border-emerald-400/60"
            />
            <button
              type="submit"
              className="btn-glow shrink-0 rounded-xl px-4 text-sm font-bold"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
