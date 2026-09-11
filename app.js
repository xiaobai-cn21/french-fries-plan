const screens = [...document.querySelectorAll(".screen")];
const navButtons = [...document.querySelectorAll("[data-nav]")];
const bottomButtons = [...document.querySelectorAll(".bottom-nav button")];

const state = {
  energy: 20,
  currentTask: null,
  timer: null,
  paused: false,
  remaining: 0,
  total: 0,
  history: JSON.parse(localStorage.getItem("fryplan-history") || "[]"),
};

const templates = {
  "完成毕业论文": {
    task: "整理第三章第一篇参考文献",
    reason: "推荐原因：从整理材料开始，阻力最低，也能马上产生可验证成果。",
    duration: 15,
  },
  "准备英语考试": {
    task: "复习 10 个高频错题单词",
    reason: "推荐原因：数量小、反馈快，适合把复习状态先启动起来。",
    duration: 15,
  },
  "写一篇内容草稿": {
    task: "写出开头 120 字和 3 个小标题",
    reason: "推荐原因：先产出骨架，不要求一次写完完整作品。",
    duration: 20,
  },
};

const els = {
  energyText: document.querySelector("#energyText"),
  doneCount: document.querySelector("#doneCount"),
  streakCount: document.querySelector("#streakCount"),
  bestLength: document.querySelector("#bestLength"),
  buddyLevel: document.querySelector("#buddyLevel"),
  buddyLine: document.querySelector("#buddyLine"),
  profileLevel: document.querySelector("#profileLevel"),
  profileNote: document.querySelector("#profileNote"),
  goalInput: document.querySelector("#goalInput"),
  actionCard: document.querySelector("#actionCard"),
  taskName: document.querySelector("#taskName"),
  durationSelect: document.querySelector("#durationSelect"),
  difficultySelect: document.querySelector("#difficultySelect"),
  reasonText: document.querySelector("#reasonText"),
  heatingTaskName: document.querySelector("#heatingTaskName"),
  temperatureText: document.querySelector("#temperatureText"),
  heatedFry: document.querySelector("#heatedFry"),
  timeLeft: document.querySelector("#timeLeft"),
  percentText: document.querySelector("#percentText"),
  timerRing: document.querySelector(".timer-ring"),
  pauseBtn: document.querySelector("#pauseBtn"),
  proofInput: document.querySelector("#proofInput"),
  uploadBox: document.querySelector("#uploadBox"),
  previewWrap: document.querySelector("#previewWrap"),
  proofPreview: document.querySelector("#proofPreview"),
  verifyBtn: document.querySelector("#verifyBtn"),
  resultCard: document.querySelector("#resultCard"),
  scoreText: document.querySelector("#scoreText"),
  fuelText: document.querySelector("#fuelText"),
  historyList: document.querySelector("#historyList"),
  insightList: document.querySelector("#insightList"),
};

function showScreen(name) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === name));
  bottomButtons.forEach((button) => button.classList.toggle("active", button.dataset.nav === name));
  if (name === "warehouse") renderHistory();
  if (name === "profile") renderProfile();
}

function saveHistory() {
  localStorage.setItem("fryplan-history", JSON.stringify(state.history));
}

function renderHome() {
  const done = state.history.length;
  const totalReward = state.history.reduce((sum, item) => sum + item.reward, 0);
  const level = getLevel(done);
  state.energy = 20 + totalReward;
  els.energyText.textContent = state.energy;
  els.doneCount.textContent = done;
  els.streakCount.textContent = done > 0 ? `${Math.min(done + 1, 28)}天` : "1天";
  els.bestLength.textContent = done > 1 ? "15分" : "20分";
  els.buddyLevel.textContent = level;
  els.profileLevel.textContent = level;
  els.buddyLine.textContent = done > 0 ? "上一根薯条已经成熟，下一根可以更小一点。" : "今天先做一根最容易开始的薯条。";
}

function getLevel(done) {
  if (done >= 9) return "Lv4 薯条大师";
  if (done >= 5) return "Lv3 黄金薯条";
  if (done >= 2) return "Lv2 脆皮薯条";
  return "Lv1 小薯条";
}

function splitTask() {
  const goal = els.goalInput.value.trim();
  const matchedKey = Object.keys(templates).find((key) => goal.includes(key.slice(0, 2)) || key.includes(goal));
  const plan = templates[matchedKey] || makePlan(goal);
  els.taskName.value = plan.task;
  els.durationSelect.value = String(plan.duration);
  els.difficultySelect.value = "低";
  els.reasonText.textContent = plan.reason;
  els.actionCard.classList.remove("hidden");
  els.actionCard.scrollIntoView({ behavior: "smooth", block: "center" });
}

function makePlan(goal) {
  const cleanGoal = goal || "推进一个重要目标";
  return {
    task: `为“${cleanGoal}”完成一个 15 分钟可截图的小步骤`,
    duration: 15,
    reason: "推荐原因：先把目标缩小到今天能开始、能验证的一步。",
  };
}

function acceptTask() {
  state.currentTask = {
    name: els.taskName.value.trim() || "完成一个 15 分钟小步骤",
    duration: Number(els.durationSelect.value),
    difficulty: els.difficultySelect.value,
  };
  startTimer(state.currentTask.duration);
  showScreen("heat");
}

function startTimer(minutes) {
  clearInterval(state.timer);
  state.total = minutes * 60;
  state.remaining = state.total;
  state.paused = false;
  els.heatingTaskName.textContent = state.currentTask.name;
  els.pauseBtn.textContent = "暂停";
  els.heatedFry.className = "single-fry hot";
  tick();
  state.timer = setInterval(() => {
    if (state.paused) return;
    state.remaining = Math.max(0, state.remaining - 1);
    tick();
    if (state.remaining === 0) finishHeating();
  }, 1000);
}

function tick() {
  const elapsed = state.total - state.remaining;
  const percent = state.total ? Math.round((elapsed / state.total) * 100) : 0;
  const mins = String(Math.floor(state.remaining / 60)).padStart(2, "0");
  const secs = String(state.remaining % 60).padStart(2, "0");
  const temp = 80 + Math.round(percent * 0.9);
  els.timeLeft.textContent = `${mins}:${secs}`;
  els.percentText.textContent = `完成 ${percent}%`;
  els.temperatureText.textContent = `${temp}℃`;
  els.timerRing.style.setProperty("--progress", `${percent * 3.6}deg`);
  if (percent > 68) els.heatedFry.classList.add("done");
}

function finishHeating() {
  clearInterval(state.timer);
  state.remaining = 0;
  tick();
  els.heatedFry.classList.add("done");
  setTimeout(() => showScreen("verify"), 300);
}

function coolDown() {
  clearInterval(state.timer);
  els.heatedFry.className = "single-fry cold";
  els.percentText.textContent = "冷掉薯条：下次可以把任务切得更小";
  setTimeout(() => showScreen("home"), 700);
}

function handleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  els.proofPreview.src = URL.createObjectURL(file);
  els.previewWrap.classList.remove("hidden");
  els.verifyBtn.disabled = false;
}

function verifyResult() {
  const base = state.currentTask?.difficulty === "低" ? 88 : 82;
  const score = Math.min(98, base + Math.floor(Math.random() * 8));
  const reward = score >= 90 ? 3 : 2;
  const fuel = guessFuel(state.currentTask?.name || "");
  els.scoreText.textContent = `任务完成度：${score}%`;
  els.fuelText.textContent = `获得：${reward}根薯条 · ${fuel}`;
  els.resultCard.dataset.score = String(score);
  els.resultCard.dataset.reward = String(reward);
  els.resultCard.dataset.fuel = fuel;
  els.resultCard.classList.remove("hidden");
}

function guessFuel(task) {
  if (/论文|复习|阅读|单词|学习|参考文献/.test(task)) return "知识燃料";
  if (/运动|跑步|健身|训练/.test(task)) return "活力燃料";
  return "行动燃料";
}

function saveResult() {
  const item = {
    id: Date.now(),
    task: state.currentTask?.name || "行动薯条",
    duration: state.currentTask?.duration || 15,
    score: Number(els.resultCard.dataset.score || 90),
    reward: Number(els.resultCard.dataset.reward || 3),
    fuel: els.resultCard.dataset.fuel || "行动燃料",
    date: new Date().toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }),
  };
  state.history.unshift(item);
  saveHistory();
  resetVerify();
  renderHome();
  showScreen("warehouse");
}

function resetVerify() {
  els.proofInput.value = "";
  els.proofPreview.removeAttribute("src");
  els.previewWrap.classList.add("hidden");
  els.verifyBtn.disabled = true;
  els.resultCard.classList.add("hidden");
}

function renderHistory() {
  if (!state.history.length) {
    els.historyList.innerHTML = '<div class="empty">仓库还没有成熟薯条。先完成今天的第一根吧。</div>';
    return;
  }
  els.historyList.innerHTML = state.history
    .map(
      (item) => `
        <article class="history-item">
          <div class="thumb">🍟</div>
          <div>
            <strong>${escapeHtml(item.task)}</strong>
            <span>${item.date} · ${item.duration}分钟 · ${item.fuel}</span>
          </div>
          <em>${item.score}%</em>
        </article>
      `,
    )
    .join("");
}

function renderProfile() {
  const done = state.history.length;
  const avg = done ? Math.round(state.history.reduce((sum, item) => sum + item.score, 0) / done) : 0;
  els.profileLevel.textContent = getLevel(done);
  els.profileNote.textContent = done >= 2 ? "你的伙伴正在变成知识型薯条，适合继续推荐短学习任务。" : "完成更多真实成果后，伙伴会长出不同个性。";
  els.insightList.innerHTML = [
    done ? `${state.history[0].duration}分钟任务最近完成得最顺` : "20分钟任务完成率最高",
    done ? `平均完成度 ${avg}%` : "上午效率最高",
    done >= 2 ? "学习类任务更适合先做资料整理" : "长时间写作容易中断",
  ]
    .map((text) => `<li>${text}</li>`)
    .join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.nav;
    if (target) showScreen(target);
  });
});

document.querySelectorAll("[data-template]").forEach((button) => {
  button.addEventListener("click", () => {
    els.goalInput.value = button.dataset.template;
  });
});

document.querySelector("#splitTaskBtn").addEventListener("click", splitTask);
document.querySelector("#acceptTaskBtn").addEventListener("click", acceptTask);
document.querySelector("#finishBtn").addEventListener("click", finishHeating);
document.querySelector("#coolBtn").addEventListener("click", coolDown);
els.pauseBtn.addEventListener("click", () => {
  state.paused = !state.paused;
  els.pauseBtn.textContent = state.paused ? "继续" : "暂停";
});
els.proofInput.addEventListener("change", handleUpload);
els.verifyBtn.addEventListener("click", verifyResult);
document.querySelector("#saveResultBtn").addEventListener("click", saveResult);

renderHome();
renderHistory();
