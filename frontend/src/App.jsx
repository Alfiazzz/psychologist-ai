import { useState, useEffect, useRef } from "react";
import { useSession } from "./useSession";
import { useVoice } from "./useVoice";
import { useSimliAvatar } from "./SimliAvatar";

export default function App() {
  const { messages, isCrisis, sendMessage, connect } = useSession();
  const { isRecording, startRecording, stopRecording } = useVoice();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const hasGreeted = useRef(false);

  const { videoRef, audioRef, status, speak } = useSimliAvatar({
    onSpeakingChange: setIsSpeaking
  });

  useEffect(() => {
    connect();
    if (!hasGreeted.current) {
      hasGreeted.current = true;
      setTimeout(() => sendMessage("Привет, я только что зашёл на сайт"), 1500);
    }
  }, []);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && !last.streaming) {
      speak(last.text);
    }
  }, [messages]);

  const handleVoice = () => {
    if (isRecording) { stopRecording(); return; }
    startRecording((text) => sendMessage(text));
  };

  const statusText = {
    idle: "Подключаемся...",
    connecting: "Загружаем Анну...",
    ready: "Слушает",
    speaking: "Говорит...",
    error: "Ошибка подключения"
  }[status];

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#1a2420", overflow: "hidden" }}>
      <video ref={videoRef} autoPlay playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      <audio ref={audioRef} autoPlay style={{ display: "none" }} />

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }} />

      {status !== "ready" && status !== "speaking" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, zIndex: 10 }}>
          <div style={{ width: 48, height: 48, border: "3px solid #7a9e87", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <div style={{ color: "#7a9e87", fontSize: "0.85rem" }}>{statusText}</div>
        </div>
      )}

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "2rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", zIndex: 5 }}>
        <div>
          <div style={{ color: "white", fontSize: "1.4rem", fontWeight: 400 }}>Анна</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>Психолог-консультант</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.3)", borderRadius: 20, padding: "6px 14px", backdropFilter: "blur(10px)" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: isSpeaking ? "#7a9e87" : "rgba(255,255,255,0.3)", animation: isSpeaking ? "blink 1s ease-in-out infinite" : "none" }} />
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>{statusText}</div>
        </div>
      </div>

      {messages.length > 0 && (() => {
        const last = messages[messages.length - 1];
        return last.role === "assistant" ? (
          <div style={{ position: "absolute", bottom: 140, left: "50%", transform: "translateX(-50%)", width: "80%", maxWidth: 600, zIndex: 5 }}>
            <div style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", borderRadius: 16, padding: "1rem 1.25rem", color: "white", fontSize: "0.95rem", lineHeight: 1.65, textAlign: "center" }}>
              {last.text}{last.streaming && <span style={{ opacity: 0.5 }}>▌</span>}
            </div>
          </div>
        ) : null;
      })()}

      {isCrisis && (
        <div style={{ position: "absolute", top: 100, left: "50%", transform: "translateX(-50%)", width: "80%", maxWidth: 500, background: "rgba(255,248,237,0.95)", borderRadius: 12, padding: "0.9rem 1.1rem", fontSize: "0.85rem", color: "#7a5c2e", zIndex: 10, textAlign: "center" }}>
          <strong>Телефон доверия: 8-800-2000-122</strong> (бесплатно, круглосуточно)
        </div>
      )}

      <div style={{ position: "absolute", bottom: 48, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, zIndex: 5 }}>
        <button onClick={handleVoice} style={{
          width: 72, height: 72, borderRadius: "50%",
          background: isRecording ? "#e85555" : "rgba(122,158,135,0.9)",
          border: `3px solid ${isRecording ? "#e85555" : "#7a9e87"}`,
          cursor: "pointer", fontSize: "1.8rem",
          boxShadow: isRecording ? "0 0 0 8px rgba(232,85,85,0.2)" : "0 0 0 8px rgba(122,158,135,0.2)",
          transition: "all 0.2s"
        }}>🎤</button>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>
          {isRecording ? "Говорите... нажмите чтобы остановить" : "Нажмите и говорите"}
        </div>
      </div>

      <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.15)", fontSize: "0.65rem", zIndex: 5 }}>
        Консультация носит поддерживающий характер и не заменяет медицинскую помощь
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}