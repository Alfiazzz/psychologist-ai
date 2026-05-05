import logging
import os
import json
import httpx
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
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
            logger.info(f"Received message: {user_text}")

            if check_crisis(user_text):
                await websocket.send_text(json.dumps({
                    "type": "crisis",
                    "text": "Я слышу, что тебе сейчас очень тяжело. Пожалуйста, обратись на телефон доверия: 8-800-2000-122 (бесплатно, круглосуточно). Там тебя выслушают живые специалисты."
                }))
                continue

            history = await get_history(session_id)
            history.append({"role": "user", "content": user_text})
            if len(history) > 20:
                history = history[-20:]

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "meta-llama/llama-3.3-70b-instruct:free",
                        "messages": [{"role": "system", "content": SYSTEM_PROMPT}] + history,
                        "max_tokens": 300,
                        "stream": True
                    }
                )

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

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")

@app.get("/health")
@app.head("/health")
def health():
    return {"status": "ok"}