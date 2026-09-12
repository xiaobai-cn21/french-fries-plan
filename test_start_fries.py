# 薯条计划 /api/start-fries 提示词实测
# 数据流：goal 文本 + 固定系统提示词 → deepseek-flash → JSON{fries:[{title,time}×3]}
# 用法：python tools/test_start_fries.py
import json
import os
import sys
import time
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")  # DeepSeek 平台；上线请放后端环境变量
URL = "https://api.deepseek.com/chat/completions"
MODEL = "deepseek-flash"

# ---- 后端写死的系统提示词 ----
SYSTEM_PROMPT = """你是薯条计划的任务助手。请全程使用中文，包括你的内部思考过程。
背景信息：用户设定了一个【大目标】，但常常因为目标太大而不敢开始。你的职责是把大目标拆成 3 根「开始薯条」——3 个门槛最低、最容易立刻开始的小任务。

拆任务规则：
- 每根薯条必须是 10 分钟以内可以完成或启动的具体动作，门槛越低越好；
- 优先给「启动型」任务（如：抵达现场、打开文档、读第一页），而不是要求一次做到位的完成型任务；
- 每根薯条完成后必须能「拍一张照片」作为成果凭证（例如：翻开的图书页、摆好的球拍、健身房门口的位置），后续会用照片校验任务是否完成；
- 禁止纯脑内任务（如「想一想」「规划一下」「默背」），因为无法拍照验证；
- title 只描述任务动作本身，不要把「拍照」写进标题，拍照由产品在完成后引导用户进行；
- 3 根薯条按门槛从低到高排列：第 1 根最容易（比如只是抵达、打开、看一眼），第 3 根稍微推进一步；
- title：具体、可立即执行的动词短语，不超过 15 个字；
- time：预计用时，格式如「3分钟」；
- 如果实在想不出 3 个不同的小任务，就返回重复的薯条凑满 3 根，不要编造奇怪的任务。

输出要求（非常重要）：
只输出一个 JSON 对象，禁止输出 JSON 以外的任何文字、解释或 markdown 代码块标记。字段固定为：
{"fries": [{"title": "小任务名", "time": "3分钟"}, {"title": "小任务名", "time": "5分钟"}, {"title": "小任务名", "time": "10分钟"}]}

示例：
用户 goal：「写论文第三章」
输出：{"fries": [{"title": "打开论文文档翻到第三章", "time": "3分钟"}, {"title": "列出第三章的 3 个小节标题", "time": "5分钟"}, {"title": "给每个小节写一句要点", "time": "10分钟"}]}"""


def call_model(goal):
    body = {
        "model": MODEL,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"【大目标】{goal}\n请生成 3 根开始薯条。"},
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
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")
    cost = time.time() - t0
    msg = data["choices"][0]["message"]
    return msg["content"], msg.get("reasoning_content", ""), cost, data.get("usage", {})


def parse_json(text):
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        if t.lower().startswith("json"):
            t = t[4:]
    start, end = t.find("{"), t.rfind("}")
    if start != -1 and end != -1:
        t = t[start:end + 1]
    return json.loads(t)


if __name__ == "__main__":
    GOALS = ["读完老人与海", "去健身房健身", "网球训练"]
    for i, goal in enumerate(GOALS, 1):
        print(f"\n{'=' * 62}\n【样例{i}】goal: {goal}")
        content, reasoning, cost, usage = call_model(goal)
        print(f"  耗时 {cost:.1f}s  tokens: {usage.get('total_tokens', '?')}")
        print(f"  原始返回: {content}")
        try:
            r = parse_json(content)
            print(f"  解析结果（{len(r.get('fries', []))} 根薯条）:")
            for j, f in enumerate(r.get("fries", []), 1):
                print(f"    薯条{j}: {f.get('title')}  [{f.get('time')}]")
        except Exception as e:
            print(f"  !! JSON 解析失败: {e}")
