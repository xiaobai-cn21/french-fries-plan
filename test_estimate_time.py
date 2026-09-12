# 薯条计划 /api/estimate-time 提示词实测
# 数据流：goal 文本 + 固定系统提示词 → deepseek-flash → JSON{"time": "..."}
# 用法：python tools/test_estimate_time.py
import sys

from api.deepseek_client import call_deepseek, parse_json_content, text_model

sys.stdout.reconfigure(encoding="utf-8")

MODEL = text_model()

# ---- 后端写死的系统提示词 ----
SYSTEM_PROMPT = """你是薯条计划的任务助手。请全程使用中文，包括你的内部思考过程。
背景信息：用户设定了一个【大目标】。你的职责是估算：一个普通用户完成这个大目标，大概需要投入多久。

估算规则：
- 估算口径：普通人以正常专注状态投入的「净时长」（不含睡觉、拖延、等待），而不是日历天数；
- 一次性活动（健身一次、网球训练一次）按单次时长估算；
- 长期项目（读完一本书、写完一章论文）按完成它需要的累计专注时长估算；
- 按普通水平估算，不给范围，只给一个数。

输出格式规则：
- 单位只允许「小时」或「分钟」两种；
- 不足 1 小时用分钟（如「45分钟」），达到或超过 1 小时用小时（如「2.5小时」，最多一位小数）。

输出要求（非常重要）：
只输出一个 JSON 对象，禁止输出 JSON 以外的任何文字、解释或 markdown 代码块标记。字段固定为：
{"time": "3小时"}

示例：
用户 goal：「写论文第三章」
输出：{"time": "3小时"}"""


def call_model(goal):
    result = call_deepseek(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"【大目标】{goal}\n请估算完成这个大目标大概需要多久。"},
        ],
        model=MODEL,
        json_mode=True,
    )
    return result["content"], result["seconds"], result["usage"]


def parse_json(text):
    return parse_json_content(text)


if __name__ == "__main__":
    GOALS = ["读完老人与海", "去健身房健身", "网球训练"]
    for i, goal in enumerate(GOALS, 1):
        print(f"\n{'=' * 62}\n【样例{i}】goal: {goal}")
        content, cost, usage = call_model(goal)
        print(f"  耗时 {cost:.1f}s  tokens: {usage.get('total_tokens', '?')}")
        print(f"  原始返回: {content}")
        try:
            r = parse_json(content)
            print(f"  解析结果: time = {r.get('time')}")
        except Exception as e:
            print(f"  !! JSON 解析失败: {e}")
