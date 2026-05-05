import { useState, useRef, useCallback } from "react";

const WS_URL = import.meta.env.VITE_WS_URL;

export function useSession() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCrisis, setIsCrisis] = useState(false);
  const wsRef = useRef(null);
  const sessionId = useRef("session_" + Math.random().toString(36).slice(2));

  const connect = useCallback(() => {
    if (wsRef.current) return;
    const ws = new WebSocket(`${WS_URL}?session_id=${sessionId.current}`);
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "crisis") {
        setIsCrisis(true);
        setMessages((prev) => [...prev, { role: "assistant", text: data.text }]);
        setIsLoading(false);
      } else if (data.type === "token") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.streaming) {
            return [...prev.slice(0, -1), { ...last, text: last.text + data.text }];
          }
          return [...prev, { role: "assistant", text: data.text, streaming: true }];
        });
      } else if (data.type === "done") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.streaming) {
            return [...prev.slice(0, -1), { ...last, streaming: false }];
          }
          return prev;
        });
        setIsLoading(false);
      }
    };
    ws.onclose = () => { wsRef.current = null; };
    wsRef.current = ws;
  }, []);

  const sendMessage = useCallback((text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connect();
      setTimeout(() => sendMessage(text), 500);
      return;
    }
    setMessages((prev) => [...prev, { role: "user", text }]);
    setIsLoading(true);
    wsRef.current.send(JSON.stringify({ text }));
  }, [connect]);

  return { messages, isLoading, isCrisis, sendMessage, connect };
}