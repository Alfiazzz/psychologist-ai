import { useState, useEffect, useRef } from "react";
import { useSession } from "./useSession";
import { useVoice } from "./useVoice";

export default function App() {
  const { messages, isLoading, isCrisis, sendMessage, connect } = useSession();
  const { isRecording, isSpeaking, startRecording, stopRecording, speak, stopSpeaking } = useVoice();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const hasGreeted = useRef(false);

  useEffect(() => {
    connect();
    if (!hasGreeted.current) {
      hasGreeted.current = true;
      setTimeout(() => {
        sendMessage("Привет, я только что зашёл на сайт");
      }, 1000);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && !last.streaming) {
      speak(last.text);
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    stopSpeaking();
    sendMessage(input.trim());
    setInput("");
  };

  const handleVoice = () => {
    if (isRecording) { stopRecording(); return; }
    stopSpeaking();
    startRecording((text) => {
      sendMessage(text);
    });
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif", background: "#f7f5f0" }}>
      <aside style={{ width: 260, background: "#2d3a35", display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 1rem", gap: "1rem" }}>
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: "#3d4f48", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "3rem", border: isSpeaking ? "3px solid #7a9e87" : "3px solid transparent",
          transition: "border 0.3s"
        }}>
          🌿
        </div>
        <div style={{ color: "white", fontSize: "1.2rem", fontWeight: 500 }}>Анна</div>
        <div style={{ color: "#7a9e87", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>Психолог-консультант</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", marginTop: "auto", textAlign: "center", lineHeight: 1.5 }}>
          Консультация носит поддерживающий характер и не заменяет медицинскую помощь
        </div>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1rem 1.5rem", background: "white", borderBottom: "1px solid #e0e0e0", fontWeight: 500, color: "#2d3a35" }}>
          Сессия с Анной
        </div>

        {isCrisis && (
          <div style={{ margin: "1rem 1.5rem 0", padding: "0.9rem 1.1rem", background: "#fff8ed", border: "1px solid #f0dfc5", borderRadius: 12, fontSize: "0.85rem", color: "#7a5c2e" }}>
            <strong>Важно:</strong> Телефон доверия: <strong>8-800-2000-122</strong> (бесплатно, круглосуточно)
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "70%", padding: "0.9rem 1.2rem", borderRadius: 16, fontSize: "0.9rem", lineHeight: 1.65,
                background: msg.role === "user" ? "#7a9e87" : "white",
                color: msg.role === "user" ? "white" : "#1e2b26",
                border: msg.role === "assistant" ? "1px solid #e0e0e0" : "none",
                borderBottomRightRadius: msg.role === "user" ? 4 : 16,
                borderBottomLeftRadius: msg.role === "assistant" ? 4 : 16,
              }}>
                {msg.text}
                {msg.streaming && <span style={{ opacity: 0.5 }}>▌</span>}
              </div>
            </div>
          ))}
          {isLoading && !messages.find(m => m.streaming) && (
            <div style={{ display: "flex", gap: 6, padding: "0.75rem 1rem", background: "white", border: "1px solid #e0e0e0", borderRadius: 16, borderBottomLeftRadius: 4, width: "fit-content" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#b5cebe", animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: "1rem 1.5rem", background: "white", borderTop: "1px solid #e0e0e0", display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Напишите что-нибудь..."
            rows={1}
            style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: 16, border: "1px solid #e0e0e0", background: "#eef4f0", fontFamily: "sans-serif", fontSize: "0.9rem", resize: "none", outline: "none" }}
          />
          <button onClick={handleVoice} style={{
            width: 44, height: 44, borderRadius: "50%", border: `2px solid ${isRecording ? "#e85555" : "#7a9e87"}`,
            background: isRecording ? "#e85555" : "transparent", cursor: "pointer", fontSize: "1.1rem"
          }}>
            🎤
          </button>
          <button onClick={handleSend} style={{
            width: 44, height: 44, borderRadius: "50%", border: "none",
            background: "#7a9e87", cursor: "pointer", fontSize: "1.1rem"
          }}>
            ➤
          </button>
        </div>
      </main>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}