"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type VapiType from "@vapi-ai/web";
import type { AnalysisResult } from "@/lib/types";

interface Props {
  result: AnalysisResult;
}

// idle → connecting → agent-speaking ↔ listening → idle
type CallState = "idle" | "connecting" | "agent-speaking" | "listening" | "error";

function buildSystemPrompt(result: AnalysisResult): string {
  const missing = result.missing_high_risk.join(", ") || "none";
  const present  = result.present_high_risk.join(", ") || "none";
  return [
    "You are LeaseIQ, an AI legal assistant specialising in commercial lease risk.",
    `The user has just analysed a lease. Risk verdict: ${result.risk_label}.`,
    `HIGH risk probability: ${result.prob_high.toFixed(1)}%.`,
    `Missing critical clauses: ${missing}.`,
    `Present critical clauses: ${present}.`,
    "Keep answers concise — 2-3 sentences max unless the user asks for detail.",
    "Always remind the user to consult a licensed attorney before signing.",
  ].join(" ");
}

export default function VoiceButton({ result }: Props) {
  const [state, setState]           = useState<CallState>("idle");
  const [transcript, setTranscript] = useState<{ speaker: string; text: string }[]>([]);
  const vapiRef  = useRef<VapiType | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_VAPI_KEY ?? "";

  useEffect(() => {
    return () => { vapiRef.current?.stop(); };
  }, []);

  async function startCall() {
    if (!publicKey) { setState("error"); return; }
    setState("connecting");
    setTranscript([]);
    try {
      const Vapi = (await import("@vapi-ai/web")).default;
      const vapi  = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start",  () => setState("agent-speaking"));
      vapi.on("speech-start", () => setState("agent-speaking"));
      vapi.on("speech-end",   () => setState("listening"));
      vapi.on("call-end",     () => { setState("idle"); vapiRef.current = null; });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapi.on("error", (err: any) => {
        console.error("[Vapi error]", err);
        setState("error");
        vapiRef.current = null;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapi.on("message", (msg: any) => {
        // Only append final transcripts to avoid partial-transcript spam
        if (msg?.type === "transcript" && msg?.transcriptType === "final" && msg?.transcript) {
          const speaker = msg.role === "assistant" ? "LeaseIQ" : "You";
          setTranscript(prev => [...prev.slice(-10), { speaker, text: msg.transcript }]);
        }
      });

      const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

      if (assistantId) {
        // Use dashboard assistant (inherits Soniox STT + all account settings),
        // but override the system prompt so it knows this specific lease's results.
        await vapi.start(assistantId, {
          model: {
            messages: [{ role: "system", content: buildSystemPrompt(result) }],
          },
        } as Parameters<typeof vapi.start>[1]);
      } else {
        // Fallback: inline config
        await vapi.start({
          transcriber: { provider: "talkscriber", model: "whisper", language: "en" },
          model: {
            provider: "anthropic",
            model: "claude-haiku-4-5-20251001",
            messages: [{ role: "system", content: buildSystemPrompt(result) }],
          },
          voice: { provider: "vapi", voiceId: "Elliot" },
          name: "LeaseIQ Voice Agent",
          firstMessage: "Hi! I've analysed your lease. What would you like to know?",
        });
      }
    } catch (err) {
      console.error("[Vapi start failed]", err);
      setState("error");
      vapiRef.current = null;
    }
  }

  function stopCall() {
    vapiRef.current?.stop();
    setState("idle");
  }

  const isLive    = state === "agent-speaking" || state === "listening";
  const RISK_COLOR = { HIGH: "#B83232", MEDIUM: "#C47820", LOW: "#2D7A4F" }[result.risk_label];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 18 }}
      className="rounded-2xl border border-[#1e2220] bg-card overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-[#1e2220]">
        <h3 className="font-display text-lg text-paper">Voice Q&amp;A</h3>
        <p className="text-xs text-muted mt-0.5">Ask LeaseIQ about this lease in plain English</p>
      </div>

      <div className="p-6 flex flex-col items-center gap-6">

        {/* Mic / stop button */}
        <div className="relative">
          {/* Listening pulse — shows when it's the user's turn */}
          {state === "listening" && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: "2px solid #22c55e" }}
              animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            />
          )}
          {/* Agent-speaking pulse */}
          {state === "agent-speaking" && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ border: `2px solid ${RISK_COLOR}` }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
          )}

          <button
            onClick={isLive ? stopCall : startCall}
            disabled={state === "connecting"}
            className="relative w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all focus:outline-none disabled:opacity-50"
            style={{
              background:  state === "listening"      ? "rgba(34,197,94,0.08)"
                         : state === "agent-speaking" ? `${RISK_COLOR}18`
                         : "rgba(192,154,71,0.06)",
              borderColor: state === "listening"      ? "#22c55e"
                         : state === "agent-speaking" ? RISK_COLOR
                         : "rgba(192,154,71,0.4)",
            }}
          >
            {state === "connecting" ? (
              <motion.div
                className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
              />
            ) : isLive ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="6" width="12" height="12" rx="2"
                  fill={state === "listening" ? "#22c55e" : RISK_COLOR} />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="#C09A47" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8"  y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
        </div>

        {/* Status label */}
        <AnimatePresence mode="wait">
          {state === "idle" && !publicKey && (
            <motion.p key="no-key" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-stamp text-center max-w-xs">
              Set <code className="bg-lift px-1 py-0.5 rounded text-[10px]">NEXT_PUBLIC_VAPI_KEY</code> to enable voice Q&amp;A.
            </motion.p>
          )}
          {state === "idle" && publicKey && (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-muted text-center">
              Tap the mic — ask <em>&ldquo;What&apos;s my biggest risk?&rdquo;</em>
            </motion.p>
          )}
          {state === "connecting" && (
            <motion.p key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-gold text-center">
              Connecting…
            </motion.p>
          )}
          {state === "agent-speaking" && (
            <motion.p key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-center" style={{ color: RISK_COLOR }}>
              LeaseIQ is speaking…
            </motion.p>
          )}
          {state === "listening" && (
            <motion.p key="listening" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-green-500 text-center font-semibold">
              🎙 Your turn — speak now
            </motion.p>
          )}
          {state === "error" && (
            <motion.p key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs text-stamp text-center">
              {publicKey ? "Could not start the call. Check your Vapi key." : "Set NEXT_PUBLIC_VAPI_KEY to enable voice Q&A."}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Live transcript */}
        {transcript.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="w-full max-w-md rounded-xl border border-[#1e2220] bg-lift/50 p-4 space-y-2 overflow-hidden"
          >
            {transcript.map((line, i) => (
              <p key={i}
                className={`text-[11px] leading-relaxed ${
                  line.speaker === "LeaseIQ" ? "text-gold" : "text-stone-600"
                }`}>
                <span className="font-semibold">{line.speaker}:</span> {line.text}
              </p>
            ))}
          </motion.div>
        )}

        {isLive && (
          <p className="text-[10px] text-muted text-center">Tap the square to end the call</p>
        )}
      </div>
    </motion.div>
  );
}
