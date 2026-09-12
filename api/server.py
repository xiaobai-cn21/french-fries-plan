import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
import re

from deepseek_client import call_deepseek, parse_json_content, text_model, vision_model


MAX_JSON_SIZE = 8 * 1024
MAX_IMAGE_JSON_SIZE = 14_500_000

ESTIMATE_PROMPT = """你是薯条计划的任务助手。
背景信息：用户设定了一个【大目标】。你的职责是估算：一个普通用户完成这个大目标，大概需要投入多久。

估算规则：
- 估算口径：普通人以正常专注状态投入的净时长，不含睡觉、拖延、等待；
- 一次性活动按单次时长估算；
- 长期项目按完成它需要的累计专注时长估算；
- 按普通水平估算，不给范围，只给一个数。

输出格式规则：
- 单位只允许「小时」或「分钟」两种；
- 不足 1 小时用分钟，达到或超过 1 小时用小时，小时最多一位小数。

只输出 JSON，不要输出解释或 Markdown。格式固定为：
{"time":"3小时"}"""

START_FRIES_PROMPT = """你是薯条计划的任务助手。
背景信息：用户设定了一个【大目标】，但常常因为目标太大而不敢开始。你的职责是把大目标拆成 3 根「开始薯条」。

拆任务规则：
- 每根薯条必须是 10 分钟以内可以完成或启动的具体动作，门槛越低越好；
- 优先给启动型任务，例如抵达现场、打开文档、读第一页；
- 每根薯条完成后必须能拍一张照片作为成果凭证；
- 禁止纯脑内任务，例如想一想、规划一下、默背；
- title 只描述任务动作本身，不要把拍照写进标题；
- 3 根薯条按门槛从低到高排列；
- title 不超过 15 个字；
- time 格式如「3分钟」。

只输出 JSON，不要输出解释或 Markdown。格式固定为：
{"fries":[{"title":"小任务名","time":"3分钟"},{"title":"小任务名","time":"5分钟"},{"title":"小任务名","time":"10分钟"}]}"""

VERIFY_PHOTO_PROMPT = """你是薯条计划的任务助手。
背景信息：用户预先选定了一个【最小可执行任务】，用户上传图片作为该任务的成果凭证。

你的任务：
1. 识别图片全部内容，客观提炼图片中的产出成果，严禁编造图片不存在的信息。
2. 将图片成果和【最小可执行任务】做匹配度校验，判断用户是否完成本次任务。
3. 撰写简短真诚、有力量的鼓励话术，结合本次产出做针对性肯定。

评分规则：
- 图片中有与任务直接对应的实际产出，80-100；
- 能看出做了相关准备或部分完成，40-70；
- 与任务无关、或看不出任何与任务相关的产出，0-30；
- 图片模糊或无法识别时如实说明，不要猜测。

只输出 JSON，不要输出解释或 Markdown。格式固定为：
{"related":true,"score":88,"summary":"一句话概括图片中的产出内容","evaluation":"对照最小任务说明完成情况，1-2句","message":"给用户的反馈鼓励"}"""


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def short_text(value, limit):
    return isinstance(value, str) and 0 < len(value.strip()) <= limit


def normalize_goal(body):
    if not isinstance(body, dict) or not short_text(body.get("goal"), 200):
        raise ApiError(400, "goal 必须为 1～200 字。")
    return body["goal"].strip()


def validate_estimate(result):
    value = result.get("time") if isinstance(result, dict) else None
    if not short_text(value, 20) or not re.fullmatch(r"(\d+(\.\d)?)(分钟|小时)", value.strip()):
        raise ApiError(502, "AI 返回的时间不符合要求，请重试。")
    return {"time": value.strip()}


def validate_start_fries(result):
    fries = result.get("fries") if isinstance(result, dict) else None
    if not isinstance(fries, list) or len(fries) != 3:
        raise ApiError(502, "AI 返回的小薯条不符合要求，请重试。")

    normalized = []
    for item in fries:
        title = item.get("title") if isinstance(item, dict) else None
        time_text = item.get("time") if isinstance(item, dict) else None
        if not short_text(title, 15) or not short_text(time_text, 10):
            raise ApiError(502, "AI 返回的小薯条不符合要求，请重试。")
        if not re.fullmatch(r"\d{1,2}分钟", time_text.strip()):
            raise ApiError(502, "AI 返回的小薯条不符合要求，请重试。")
        minutes = int(re.search(r"\d+", time_text).group(0))
        if minutes < 1 or minutes > 10:
            raise ApiError(502, "AI 返回的小薯条不符合要求，请重试。")
        normalized.append({"title": title.strip(), "time": f"{minutes}分钟"})
    return {"fries": normalized}


def normalize_image_data(value):
    if not isinstance(value, str):
        raise ApiError(400, "image 必须是 data URL。")
    if not re.fullmatch(r"data:image/(png|jpeg);base64,[A-Za-z0-9+/=]+", value):
        raise ApiError(400, "image 必须是 PNG 或 JPG 的 data URL。")
    if len(value) > 14_000_000:
        raise ApiError(413, "图片较大，请选择 10 MB 以内的图片。")
    return value


def validate_verification(result):
    if not isinstance(result, dict):
        raise ApiError(502, "AI 返回的图片校验结果不符合要求，请重试。")
    score = result.get("score")
    related = result.get("related")
    if (
        not isinstance(related, bool)
        or not isinstance(score, int)
        or score < 0
        or score > 100
        or not short_text(result.get("summary"), 120)
        or not short_text(result.get("evaluation"), 200)
        or not short_text(result.get("message"), 200)
    ):
        raise ApiError(502, "AI 返回的图片校验结果不符合要求，请重试。")
    return {
        "related": related,
        "score": score,
        "passed": related and score >= 60,
        "summary": result["summary"].strip(),
        "evaluation": result["evaluation"].strip(),
        "message": result["message"].strip(),
    }


def ai_json(messages, model):
    try:
        response = call_deepseek(messages, model=model)
        return parse_json_content(response["content"])
    except RuntimeError as exc:
        if "Missing DEEPSEEK_API_KEY" in str(exc):
            raise ApiError(503, "请先在服务端配置 DEEPSEEK_API_KEY。")
        raise ApiError(502, "AI 服务请求失败，请稍后重试。")
    except json.JSONDecodeError:
        raise ApiError(502, "AI 响应无法解析，请重试。")


def estimate_time(body):
    goal = normalize_goal(body)
    return validate_estimate(ai_json([
        {"role": "system", "content": ESTIMATE_PROMPT},
        {"role": "user", "content": f"【大目标】{goal}\n请估算完成这个大目标大概需要多久。"},
    ], text_model()))


def start_fries(body):
    goal = normalize_goal(body)
    return validate_start_fries(ai_json([
        {"role": "system", "content": START_FRIES_PROMPT},
        {"role": "user", "content": f"【大目标】{goal}\n请生成 3 根开始薯条。"},
    ], text_model()))


def verify_photo(body):
    goal = normalize_goal(body)
    image = normalize_image_data(body.get("image") if isinstance(body, dict) else None)
    return validate_verification(ai_json([
        {"role": "system", "content": VERIFY_PHOTO_PROMPT},
        {"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": image}},
            {"type": "text", "text": f"【最小可执行任务】{goal}\n请校验所上传图片是否完成了该任务。"},
        ]},
    ], vision_model()))


ROUTES = {
    "/api/estimate-time": estimate_time,
    "/api/start-fries": start_fries,
    "/api/verify-photo": verify_photo,
}


class Handler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_json(self, status, data):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self):
        try:
            path = self.path.split("?")[0]
            route = ROUTES.get(path)
            if route is None:
                raise ApiError(404, "接口不存在。")
            content_type = self.headers.get("Content-Type", "").split(";")[0].strip().lower()
            if content_type != "application/json":
                raise ApiError(415, "请发送 application/json。")
            length = int(self.headers.get("Content-Length", "0"))
            max_size = MAX_IMAGE_JSON_SIZE if path == "/api/verify-photo" else MAX_JSON_SIZE
            if length > max_size:
                raise ApiError(413, "请求内容过长。")
            body = json.loads(self.rfile.read(length).decode("utf-8"))
            self.send_json(200, route(body))
        except json.JSONDecodeError:
            self.send_json(400, {"error": "请求必须是有效的 JSON。"})
        except ApiError as exc:
            self.send_json(exc.status, {"error": exc.message})
        except Exception:
            self.send_json(500, {"error": "服务暂时不可用。"})

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))


def main():
    port = int(os.environ.get("PORT", "3001"))
    host = os.environ.get("HOST", "0.0.0.0")
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"FryPlan Python API: http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
