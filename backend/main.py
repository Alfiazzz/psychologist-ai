import logging
import os
import json
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from crisis_guard import check_crisis

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
REDIS_URL = os.getenv("REDIS_URL")
REDIS_TOKEN = os.getenv("REDIS_TOKEN")
DID_API_KEY = os.getenv("DID_API_KEY")
DID_API_URL = "https://api.d-id.com"

SYSTEM_PROMPT = """Ты — Анна, виртуальный психолог-консультант. Работаешь в рамках клиент-центрированной терапии Карла Роджерса.
Ты эмпатичная, уважительная, внимательная. Говоришь просто, живо и по-человечески.
Не ставишь диагнозы, не назначаешь лечение, не осуждаешь.
Задаёшь открытые вопросы, поддерживаешь ощущение безопасности и доверия.
Структура диалога: приветствие → уточнение запроса → работа с проблемой → промежуточные итоги → мягкое завершение.
Отвечай коротко — 2-4 предложения, как в живом разговоре."""

async def get_history(session_id: str) -> list:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{REDIS_URL}/get/history:{session_id}",
            headers={"Authorization": f"Bearer {REDIS_TOKEN}"}
        )
        data = r.json()
        result = data.get("result")
        if result:
            parsed = json.loads(result)
            if isinstance(parsed, list):
                return parsed
        return []

async def save_history(session_id: str, history: list):
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{REDIS_URL}/set/history:{session_id}",
            headers={"Authorization": f"Bearer {REDIS_TOKEN}"},
            json={"value": json.dumps(history), "ex": 3600}
        )

@app.websocket("/ws/session")
async def session(websocket: WebSocket):
    await websocket.accept()
    session_id = websocket.query_params.get("session_id", "default")
    logger.info(f"WebSocket connected: {session_id}")

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            user_text = message.get("text", "")
            logger.info(f"Received: {user_text}")

            if check_crisis(user_text):
                await websocket.send_text(json.dumps({
                    "type": "crisis",
                    "text": "Я слышу, что тебе сейчас очень тяжело. Пожалуйста, обратись на телефон доверия: 8-800-2000-122 (бесплатно, круглосуточно)."
                }))
                continue

            history = await get_history(session_id)
            history.append({"role": "user", "content": user_text})
            if len(history) > 20:
                history = history[-20:]

            try:
                async with httpx.AsyncClient(timeout=60) as client:
                    response = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                            "Content-Type": "application/json",
                            "HTTP-Referer": "https://psychologist-ai.onrender.com",
                            "X-Title": "Psychologist AI"
                        },
                        json={
                            "model": "google/gemma-4-31b-it:free",
                            "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + history,
                            "max_tokens": 300,
                            "stream": True
                        }
                    )
                    logger.info(f"OpenRouter status: {response.status_code}")

                    full_reply = ""
                    async for line in response.aiter_lines():
                        if line.startswith("data: ") and line != "data: [DONE]":
                            try:
                                chunk = json.loads(line[6:])
                                token = chunk["choices"][0]["delta"].get("content", "")
                                if token:
                                    full_reply += token
                                    await websocket.send_text(json.dumps({"type": "token", "text": token}))
                            except Exception:
                                pass

                    logger.info(f"Reply: {full_reply}")
                    await websocket.send_text(json.dumps({"type": "done"}))
                    history.append({"role": "assistant", "content": full_reply})
                    await save_history(session_id, history)

            except Exception as e:
                logger.error(f"Error: {e}")
                await websocket.send_text(json.dumps({
                    "type": "token",
                    "text": "Извини, произошла ошибка. Попробуй написать ещё раз."
                }))
                await websocket.send_text(json.dumps({"type": "done"}))

    except WebSocketDisconnect:
        logger.info(f"Disconnected: {session_id}")

@app.post("/api/did/stream/create")
async def create_did_stream():
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{DID_API_URL}/talks/streams",
            headers={
                "Authorization": f"Basic {DID_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "source_url": "https://i.postimg.cc/G90Qk1mG/s2d-CF599Iwg.jpg"
            }
        )
        return response.json()

@app.post("/api/did/stream/speak")
async def speak_did_stream(request: Request):
    data = await request.json()
    stream_id = data.get("stream_id")
    session_id = data.get("session_id")
    text = data.get("text")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{DID_API_URL}/talks/streams/{stream_id}",
            headers={
                "Authorization": f"Basic {DID_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "session_id": session_id,
                "script": {
                    "type": "text",
                    "input": text,
                    "provider": {
                        "type": "microsoft",
                        "voice_id": "ru-RU-SvetlanaNeural"
                    }
                },
                "config": {"stitch": True}
            }
        )
        return response.json()

@app.get("/health")
@app.head("/health")
def health():
    return {"status": "ok"}
@app.post("/api/did/stream/answer")
async def did_stream_answer(request: Request):
    data = await request.json()
    stream_id = data.get("stream_id")
    session_id = data.get("session_id")
    answer = data.get("answer")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"{DID_API_URL}/talks/streams/{stream_id}/sdp",
            headers={
                "Authorization": f"Basic {DID_API_KEY}",
                "Content-Type": "application/json"
            },
            json={"session_id": session_id, "answer": answer}
        )
        return response.json()

@app.post("/api/simli/session")
async def create_simli_session(request: Request):
    data = await request.json()
    text = data.get("text", "")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            "https://api.simli.ai/textToVideoStream",
            headers={
                "x-simli-key": os.getenv("SIMLI_API_KEY"),
                "Content-Type": "application/json"
            },
            json={
                "faceId": "afdb6a3e-3939-40aa-92df-01604c23101c",
                "ttsAPIKey": os.getenv("OPENROUTER_API_KEY"),
                "userText": text,
                "voiceId": "ru-RU-SvetlanaNeural",
                "quality": "high"
            }
        )
        return response.json()

@app.post("/api/tts")
  async def tts(request: Request):
      data = await request.json()
      text = data.get("text", "")
      async with httpx.AsyncClient(timeout=30) as client:
          response = await client.post(
              "https://api.openai.com/v1/audio/speech",
              headers={
                  "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                  "Content-Type": "application/json"
              },
              json={
                  "model": "tts-1",
                  "input": text,
                  "voice": "nova",
                  "response_format": "pcm",
                  "speed": 0.9
              }
          )
          from fastapi.responses import Response
          return Response(
              content=response.content,
              media_type="audio/pcm"
          )
  EOF
cat > /workspaces/psychologist-ai/frontend/src/SimliAvatar.jsx << 'EOF'
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
  const connectedRef = useRef(false);
  const startedRef = useRef(false);
  const [status, setStatus] = useState("idle");

  const stopSilence = useCallback(() => {
    clearInterval(silenceRef.current);
    silenceRef.current = null;
  }, []);

  const startSilence = useCallback(() => {
    stopSilence();
    silenceRef.current = setInterval(() => {
      if (clientRef.current && connectedRef.current) {
        try {
          clientRef.current.sendAudioData(new Uint8Array(3200).fill(0));
        } catch(e) {
          stopSilence();
        }
      }
    }, 200);
  }, [stopSilence]);

  const speak = useCallback(async (text) => {
    if (!clientRef.current || !connectedRef.current) return;
    try {
      stopSilence();
      onSpeakingChange?.(true);
      setStatus("speaking");
      console.log("Fetching TTS...");
      const audioData = await textToAudio(text);
      console.log("TTS received:", audioData.length, "bytes");
      if (!connectedRef.current) return;
      const chunkSize = 3200;
      for (let i = 0; i < audioData.length; i += chunkSize) {
        if (!connectedRef.current) break;
        try {
          clientRef.current.sendAudioData(audioData.slice(i, i + chunkSize));
        } catch(e) { break; }
        await new Promise(r => setTimeout(r, 10));
      }
      const durationMs = (audioData.length / 32000) * 1000;
      setTimeout(() => {
        startSilence();
        onSpeakingChange?.(false);
        setStatus("ready");
      }, durationMs + 500);
    } catch (e) {
      console.error("TTS error:", e);
      startSilence();
      onSpeakingChange?.(false);
      setStatus("ready");
    }
  }, [startSilence, stopSilence]);

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

        client.on("start", () => { console.log("START!"); });
        client.on("speaking", () => { setStatus("speaking"); onSpeakingChange?.(true); });
        client.on("silent", () => { if (status !== "connecting") { setStatus("ready"); onSpeakingChange?.(false); } });
        client.on("error", (e) => {
          console.error("Simli error:", e);
          connectedRef.current = false;
          stopSilence();
        });
        client.on("startup_error", (e) => {
          console.error("Simli startup error:", e);
          setStatus("error");
        });

        clientRef.current = client;
        await client.start();

        if (cancelled) return;

        connectedRef.current = true;
        startSilence();

        await new Promise(r => setTimeout(r, 2500));
        if (!cancelled && !startedRef.current) {
          startedRef.current = true;
          setStatus("ready");
          console.log("Sending greeting...");
          await speak("Здравствуйте! Я Анна, ваш психолог-консультант. Расскажите, что вас беспокоит?");
        }

      } catch (e) {
        console.error("Simli init error:", e);
        setStatus("error");
      }
    }

    const timer = setTimeout(init, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopSilence();
      connectedRef.current = false;
      if (clientRef.current) {
        clientRef.current.stop();
        clientRef.current = null;
      }
      startedRef.current = false;
    };
  }, []);

  return { videoRef, audioRef, status, speak };
}
