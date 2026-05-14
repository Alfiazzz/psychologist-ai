import { useEffect, useRef, useState, useCallback } from "react";
import { SimliClient, generateSimliSessionToken } from "simli-client";

const SIMLI_API_KEY = import.meta.env.VITE_SIMLI_API_KEY;
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const FACE_ID = "afdb6a3e-3939-40aa-92df-01604c23101c";

async function textToAudio(text) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: "nova",
      response_format: "pcm",
      speed: 0.9
    })
  });
  if (!res.ok) throw new Error(`TTS error: ${res.status}`);
  const buffer = await res.arrayBuffer();
  return new Uint8Array(buffer);
}

export function useSimliAvatar({ onSpeakingChange } = {}) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const simliRef = useRef(null);
  const silenceRef = useRef(null);
  const [status, setStatus] = useState("idle");

  const startSilence = useCallback(() => {
    clearInterval(silenceRef.current);
    silenceRef.current = setInterval(() => {
      simliRef.current?.sendAudioData(new Uint8Array(3200).fill(0));
    }, 100);
  }, []);

  const stopSilence = useCallback(() => {
    clearInterval(silenceRef.current);
  }, []);

  const speak = useCallback(async (text) => {
    if (!simliRef.current) return;
    try {
      stopSilence();
      onSpeakingChange?.(true);
      setStatus("speaking");
      const audioData = await textToAudio(text);
      const chunkSize = 3200;
      for (let i = 0; i < audioData.length; i += chunkSize) {
        simliRef.current.sendAudioData(audioData.slice(i, i + chunkSize));
        await new Promise(r => setTimeout(r, 10));
      }
      const durationMs = (audioData.length / 32000) * 1000;
      setTimeout(() => {
        startSilence();
        onSpeakingChange?.(false);
        setStatus("ready");
      }, durationMs + 300);
    } catch (e) {
      console.error("TTS error:", e);
      startSilence();
      onSpeakingChange?.(false);
      setStatus("ready");
    }
  }, [startSilence, stopSilence]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (simliRef.current) return;
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

        const client = new SimliClient(
          result.session_token,
          videoRef.current,
          audioRef.current,
          null,
          "info",
          "livekit"
        );

        client.on("start", async () => {
          console.log("Simli connected!");
          simliRef.current = client;
          setStatus("ready");
          startSilence();
          await new Promise(r => setTimeout(r, 2000));
          await speak("Здравствуйте! Я Анна, ваш психолог-консультант. Расскажите, что вас беспокоит?");
        });

        client.on("speaking", () => {
          setStatus("speaking");
          onSpeakingChange?.(true);
        });

        client.on("silent", () => {
          setStatus("ready");
          onSpeakingChange?.(false);
        });

        client.on("error", (e) => {
          console.error("Simli error:", e);
          setStatus("error");
        });

        client.on("startup_error", (e) => {
          console.error("Simli startup error:", e);
          setStatus("error");
        });

        await client.start();

      } catch (e) {
        console.error("Simli init error:", e);
        setStatus("error");
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      stopSilence();
      simliRef.current?.stop();
      simliRef.current = null;
    };
  }, []);

  return { videoRef, audioRef, status, speak };
}
