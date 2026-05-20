import { useEffect, useRef, useState, useCallback } from "react";
import { SimliClient, generateSimliSessionToken } from "simli-client";

const SIMLI_API_KEY = import.meta.env.VITE_SIMLI_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const FACE_ID = "afdb6a3e-3939-40aa-92df-01604c23101c";

async function textToAudio(text) {
  const res = await fetch(`${BACKEND_URL}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error(`TTS error: ${res.status}`);
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

export function useSimliAvatar({ onSpeakingChange } = {}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const clientRef = useRef(null);
  const silenceRef = useRef(null);
  const [status, setStatus] = useState("idle");

  const stopSilence = () => {
    if (silenceRef.current) {
      clearInterval(silenceRef.current);
      silenceRef.current = null;
    }
  };

  const startSilence = () => {
    stopSilence();
    silenceRef.current = setInterval(() => {
      if (clientRef.current) {
        try {
          clientRef.current.sendAudioData(new Uint8Array(3200).fill(0));
        } catch(e) {
          stopSilence();
        }
      }
    }, 200);
  };

  const speak = useCallback(async (text) => {
    if (!clientRef.current) return;
    try {
      stopSilence();
      onSpeakingChange?.(true);
      setStatus("speaking");
      console.log("Fetching TTS for:", text.substring(0, 30));
      const audioData = await textToAudio(text);
      console.log("TTS received:", audioData.length, "bytes");
      const chunkSize = 3200;
      for (let i = 0; i < audioData.length; i += chunkSize) {
        try {
          clientRef.current?.sendAudioData(audioData.slice(i, i + chunkSize));
        } catch(e) { break; }
        await new Promise(r => setTimeout(r, 10));
      }
      const durationMs = (audioData.length / 32000) * 1000;
      setTimeout(() => {
        startSilence();
        onSpeakingChange?.(false);
        setStatus("ready");
      }, durationMs + 500);
    } catch(e) {
      console.error("TTS error:", e);
      startSilence();
      onSpeakingChange?.(false);
      setStatus("ready");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setStatus("connecting");
        const result = await generateSimliSessionToken({
          apiKey: SIMLI_API_KEY,
          config: {
            faceId: FACE_ID,
            maxSessionLength: 600,
            maxIdleTime: 300,
            handleSilence: false
          }
        });

        if (cancelled) return;

        const client = new SimliClient(
          result.session_token,
          videoRef.current,
          audioRef.current,
          null,
          "error",
          "livekit"
        );

        client.on("speaking", () => { setStatus("speaking"); onSpeakingChange?.(true); });
        client.on("silent", () => { setStatus("ready"); onSpeakingChange?.(false); });
        client.on("startup_error", (e) => { console.error("startup_error:", e); setStatus("error"); });

        clientRef.current = client;

        await client.start();

        if (cancelled) return;

        console.log("client.start() done, starting silence immediately");
        startSilence();
        setStatus("ready");

        await new Promise(r => setTimeout(r, 3000));

        if (!cancelled) {
          console.log("Sending greeting...");
          await speak("Здравствуйте! Я Анна, ваш психолог-консультант. Расскажите, что вас беспокоит?");
        }

      } catch(e) {
        console.error("init error:", e);
        setStatus("error");
      }
    }

    const timer = setTimeout(init, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopSilence();
      if (clientRef.current) {
        clientRef.current.stop();
        clientRef.current = null;
      }
    };
  }, []);

  return { videoRef, audioRef, status, speak };
}
