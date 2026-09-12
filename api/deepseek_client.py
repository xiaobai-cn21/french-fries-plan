import json
import time
import urllib.error
import urllib.request


DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"
DEEPSEEK_API_KEY = "your-api-key"
DEEPSEEK_MODEL = "deepseek-flash"
DEEPSEEK_VISION_MODEL = "deepseek-flash"


def require_api_key():
    api_key = DEEPSEEK_API_KEY.strip()
    if not api_key or api_key == "your-api-key":
        raise RuntimeError("Missing DeepSeek API key. Paste it into DEEPSEEK_API_KEY in api/deepseek_client.py.")
    return api_key


def text_model():
    return DEEPSEEK_MODEL.strip() or "deepseek-flash"


def vision_model():
    return (DEEPSEEK_VISION_MODEL or DEEPSEEK_MODEL or "deepseek-flash").strip()


def call_deepseek(messages, model=None, temperature=0.1, timeout=90, json_mode=True):
    body = {
        "model": model or text_model(),
        "temperature": temperature,
        "messages": messages,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    req = urllib.request.Request(
        DEEPSEEK_URL,
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + require_api_key(),
        },
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"DeepSeek HTTP {e.code}: {detail[:300]}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"DeepSeek request failed: {e.reason}")

    choice = (data.get("choices") or [{}])[0]
    message = choice.get("message") or {}
    return {
        "content": message.get("content", ""),
        "reasoning": message.get("reasoning_content", ""),
        "seconds": time.time() - t0,
        "usage": data.get("usage", {}),
        "finish_reason": choice.get("finish_reason"),
    }


def parse_json_content(text):
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        if t.lower().startswith("json"):
            t = t[4:]
    start, end = t.find("{"), t.rfind("}")
    if start != -1 and end != -1:
        t = t[start:end + 1]
    return json.loads(t)
