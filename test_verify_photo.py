# 薯条计划 /api/verify-photo 提示词实测
# 数据流：goal + 图片 + 固定系统提示词 → 多模态模型 → JSON(related/score/summary/evaluation/message)
# 用法：python tools/test_verify_photo.py
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")  # DeepSeek 平台；上线请放后端环境变量
URL = "https://api.deepseek.com/chat/completions"
MODEL_CANDIDATES = ["deepseek-flash", "deepseek-v4-pro"]
THRESHOLD = 60  # 业务阈值：score >= 60 视为通过（示例值，可调）

# ---- 后端写死的系统提示词（用户原版 + JSON 输出格式 + 评分规则）----
SYSTEM_PROMPT = """你是薯条计划的任务助手。请全程使用中文，包括你的内部思考过程。
背景信息：用户预先选定了一个【最小可执行任务】，用户上传图片作为该任务的成果凭证。

你的任务：
1. 识别图片全部内容，客观提炼图片中的产出成果，严禁编造图片不存在的信息。
2. 将图片成果和【最小可执行任务】做匹配度校验，判断用户是否完成本次任务。
3. 撰写简短真诚、有力量的鼓励话术，结合本次产出做针对性肯定，不要空洞鸡汤。

评分规则（score：0-100 的整数，表示图片成果与最小任务的匹配度）：
- 图片中有与任务直接对应的实际产出（如成型的文稿、目录、清单等）→ 高分（80-100）；
- 能看出做了相关准备或部分完成 → 中等（40-70）；
- 与任务无关、或看不出任何与任务相关的产出 → 低分（0-30）；
- 图片模糊或无法识别时如实说明，不要猜测。

输出要求（非常重要）：
只输出一个 JSON 对象，禁止输出 JSON 以外的任何文字、解释或 markdown 代码块标记。字段固定为：
{"related": true, "score": 88, "summary": "一句话概括图片中的产出内容", "evaluation": "对照最小任务说明完成情况，1-2 句", "message": "给用户的反馈鼓励：完成了就祝贺并针对性肯定；未完成则温和指出差距，鼓励继续"}

示例：
{"related": true, "score": 90, "summary": "图片是一份列出三个条目的参考文献列表。", "evaluation": "与「整理三篇参考文献」的任务对应，三篇文献著录完整。", "message": "恭喜！三篇文献整理得整整齐齐，论文地基又稳了一分。"}"""


def call_model(model, goal, image_path):
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    body = {
        "model": model,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": "data:image/png;base64," + b64}},
                {"type": "text", "text": f"【最小可执行任务】{goal}\n请校验所上传图片是否完成了该任务。"},
            ]},
        ],
    }
    req = urllib.request.Request(
        URL, data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + API_KEY},
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")
        raise RuntimeError(f"HTTP {e.code}: {detail[:300]}")
    cost = time.time() - t0
    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return content, cost, usage


def parse_json(text):
    t = text.strip()
    if t.startswith("```"):  # 容错：剥掉代码块标记
        t = t.strip("`")
        if t.lower().startswith("json"):
            t = t[4:]
    start, end = t.find("{"), t.rfind("}")
    if start != -1 and end != -1:
        t = t[start:end + 1]
    return json.loads(t)


def pick_model(goal, image_path):
    for m in MODEL_CANDIDATES:
        try:
            call_model(m, goal, image_path)
            print(f"[model] 使用 {m}")
            return m
        except RuntimeError as e:
            print(f"[model] {m} 不可用: {str(e)[:150]}")
    raise SystemExit("没有可用的视觉模型，请检查 API Key 或模型授权")


def run_case(name, model, image, goal):
    print(f"\n{'=' * 62}\n【{name}】\n  goal: {goal}\n  image: {image}")
    content, cost, usage = call_model(model, goal, image)
    print(f"  耗时 {cost:.1f}s  tokens: {usage.get('total_tokens', '?')}")
    print(f"  原始返回: {content}")
    try:
        r = parse_json(content)
    except Exception as e:
        print(f"  !! JSON 解析失败: {e}")
        return
    verdict = "通过 ✅" if r.get("related") and r.get("score", 0) >= THRESHOLD else "不通过 ❌"
    print(f"  解析结果: related={r.get('related')} score={r.get('score')} → {verdict}（阈值 {THRESHOLD}）")
    print(f"  summary   : {r.get('summary')}")
    print(f"  evaluation: {r.get('evaluation')}")
    print(f"  message   : {r.get('message')}")


if __name__ == "__main__":
    model = pick_model("写一份论文结构目录", "测试1输入.png")
    run_case("测试1 写论文结构目录", model, "测试1输入.png", "写一份论文第三章的结构目录（大目标：完成论文第三章）")
    run_case("测试2 整理三篇参考文献", model, "测试2输入.png", "整理三篇参考文献（大目标：完成论文第三章）")
    run_case("对照组 图片与任务错配", model, "测试2输入.png", "写一份论文第三章的结构目录")
