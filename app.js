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
  fries: JSON.parse(localStorage.getItem("fryplan-fries") || "null") || [
    {
      task: "整理第三章第一篇参考文献",
      duration: 15,
      difficulty: "低",
    },
    {
      task: "复习 10 个高频错题单词",
      duration: 15,
      difficulty: "低",
    },
    {
      task: "写出开头 120 字和 3 个小标题",
      duration: 20,
      difficulty: "低",
    },
    {
      task: "把今天最重要的目标拆成 3 个小步骤",
      duration: 15,
      difficulty: "低",
    },
    {
      task: "修改一段已经写好的内容",
      duration: 20,
      difficulty: "低",
    },
  ],
  history: JSON.parse(localStorage.getItem("fryplan-history") || "[]"),
};

const debugFries = new URLSearchParams(location.search).get("fries");
const isDebugFries = debugFries !== null;
if (isDebugFries) {
  const debugCount = Math.max(0, Number(debugFries) || 0);
  state.fries = Array.from({ length: debugCount }, (_, index) => ({
    task: `测试行动薯条 ${index + 1}`,
    duration: index % 3 === 0 ? 20 : 15,
    difficulty: "低",
  }));
}

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

const fryLayouts = [
  // Coordinates follow the reference's 442 × 487 scene, from back to front.
  { x: 45, bottom: 208, height: 218, width: 62, tilt: -5, layer: 1 },
  { x: 55, bottom: 210, height: 218, width: 62, tilt: 5, layer: 1 },
  { x: 60, bottom: 212, height: 194, width: 60, tilt: 12, layer: 2 },
  { x: 39, bottom: 209, height: 187, width: 61, tilt: -12, layer: 2 },
  { x: 50, bottom: 211, height: 190, width: 62, tilt: 0, layer: 3 },
  { x: 33, bottom: 205, height: 158, width: 56, tilt: -15, layer: 3 },
  { x: 64, bottom: 212, height: 170, width: 59, tilt: 12, layer: 4 },
  { x: 68, bottom: 209, height: 165, width: 58, tilt: 18, layer: 4 },
  { x: 45, bottom: 191, height: 175, width: 62, tilt: -5, layer: 5 },
  { x: 36, bottom: 191, height: 156, width: 60, tilt: -11, layer: 6 },
  { x: 54, bottom: 192, height: 173, width: 62, tilt: 3, layer: 6 },
  { x: 61, bottom: 190, height: 158, width: 60, tilt: 12, layer: 7 },
  { x: 47, bottom: 186, height: 149, width: 62, tilt: -8, layer: 8 },
];

const els = {
  energyText: document.querySelector("#energyText"),
  doneCount: document.querySelector("#doneCount"),
  streakCount: document.querySelector("#streakCount"),
  bestLength: document.querySelector("#bestLength"),
  buddyLevel: document.querySelector("#buddyLevel"),
  buddyLine: document.querySelector("#buddyLine"),
  homeBuddy: document.querySelector("#homeBuddy"),
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
  frySlot: document.querySelector("#frySlot"),
  overflowBadge: document.querySelector("#overflowBadge"),
  historyList: document.querySelector("#historyList"),
  insightList: document.querySelector("#insightList"),
};

function showScreen(name) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.dataset.screen === name));
  bottomButtons.forEach((button) => button.classList.toggle("active", button.dataset.nav === name));
  if (name === "home") {
    renderBuddyFries();
    renderHome();
  }
  if (name === "warehouse") renderHistory();
  if (name === "profile") renderProfile();
}

function saveHistory() {
  localStorage.setItem("fryplan-history", JSON.stringify(state.history));
}

function saveFries() {
  localStorage.setItem("fryplan-fries", JSON.stringify(state.fries));
}

function renderHome() {
  const done = state.history.length;
  const totalReward = state.history.reduce((sum, item) => sum + item.reward, 0);
  const level = getLevel(done);
  const available = state.fries.length;
  state.energy = 20 + totalReward;
  els.energyText.textContent = state.energy;
  els.doneCount.textContent = done;
  els.streakCount.textContent = done > 0 ? `${Math.min(done + 1, 28)}天` : "1天";
  els.bestLength.textContent = done > 1 ? "15分" : "20分";
  els.buddyLevel.textContent = level;
  els.profileLevel.textContent = level;
  if (available === 0) {
    els.buddyLine.textContent = "薯条盒空了，先去创建一根新的行动薯条。";
  } else if (done > 0) {
    els.buddyLine.textContent = `还有 ${available} 根行动薯条，点一根继续加热。`;
  } else {
    els.buddyLine.textContent = `${available} 根行动薯条正在等你，点一根开始。`;
  }
}

function renderBuddyFries() {
  const visibleLimit = fryLayouts.length;
  const count = Math.min(state.fries.length, visibleLimit);
  const planIndexes = Array.from({ length: count }, (_, index) => index);
  els.homeBuddy.classList.toggle("empty", state.fries.length === 0);
  els.homeBuddy.classList.toggle("few", state.fries.length > 0 && state.fries.length <= 3);
  els.homeBuddy.classList.toggle("crowded", state.fries.length >= 8);
  els.homeBuddy.setAttribute("aria-label", `薯条伙伴：${state.fries.length} 根可用行动薯条`);
  els.frySlot.innerHTML = "";
  els.overflowBadge.textContent = state.fries.length > visibleLimit ? `+${state.fries.length - visibleLimit}` : "";
  els.overflowBadge.classList.toggle("visible", state.fries.length > visibleLimit);
  planIndexes.forEach((planIndex, index) => {
    const plan = state.fries[planIndex];
    const layout = getFryLayout(count, index);
    const fry = document.createElement("button");
    fry.className = "fry";
    fry.type = "button";
    fry.textContent = "1";
    fry.dataset.randomFry = "";
    fry.dataset.planIndex = String(planIndex);
    fry.setAttribute("aria-label", `抽取行动薯条：${plan.task}`);
    fry.style.setProperty("--fry-x", `${layout.x}%`);
    fry.style.setProperty("--fry-bottom", `${layout.bottom / 487 * 100}%`);
    fry.style.setProperty("--fry-height", `${layout.height / 487 * 100}%`);
    fry.style.setProperty("--fry-width", `${layout.width / 442 * 100}%`);
    fry.style.setProperty("--fry-tilt", `${layout.tilt}deg`);
    fry.style.setProperty("--fry-layer", String(layout.layer));
    els.frySlot.appendChild(fry);
  });
}

function getFryLayout(count, index) {
  if (count === 1) return fryLayouts[10];
  if (count === 2) return [fryLayouts[9], fryLayouts[10]][index];
  if (count === 3) return [fryLayouts[9], fryLayouts[10], fryLayouts[11]][index];
  if (count < fryLayouts.length) {
    const spread = [0, 1, 9, 10, 11, 3, 7, 8, 12, 4, 6, 5];
    return fryLayouts[spread[index]];
  }
  return fryLayouts[index];
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

function addTaskToFries() {
  state.fries.unshift({
    task: els.taskName.value.trim() || "完成一个 15 分钟小步骤",
    duration: Number(els.durationSelect.value),
    difficulty: els.difficultySelect.value,
  });
  saveFries();
  renderBuddyFries();
  els.actionCard.classList.add("hidden");
  els.goalInput.value = "";
  showScreen("home");
  els.buddyLine.textContent = "新薯条已经加入，点角色上的薯条开始。";
}

function drawRandomFry(button) {
  const planIndex = Number(button.dataset.planIndex);
  const plan = state.fries[planIndex] || state.fries[Math.floor(Math.random() * state.fries.length)];
  if (!plan) return;
  document.querySelectorAll("[data-random-fry]").forEach((fry) => fry.classList.remove("selected"));
  button.classList.add("selected");
  els.buddyLine.textContent = `抽中了：${plan.task}`;
  state.currentTask = {
    name: plan.task,
    duration: plan.duration,
    difficulty: plan.difficulty,
  };
  if (Number.isInteger(planIndex) && !isDebugFries) {
    state.fries.splice(planIndex, 1);
    saveFries();
  }
  setTimeout(() => {
    button.classList.remove("selected");
    renderBuddyFries();
    startTimer(state.currentTask.duration);
    showScreen("heat");
  }, 650);
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

els.homeBuddy.addEventListener("click", (event) => {
  const fry = event.target.closest("[data-random-fry]");
  if (fry) drawRandomFry(fry);
});

document.querySelector("#splitTaskBtn").addEventListener("click", splitTask);
document.querySelector("#acceptTaskBtn").addEventListener("click", addTaskToFries);
document.querySelector("#finishBtn").addEventListener("click", finishHeating);
document.querySelector("#coolBtn").addEventListener("click", coolDown);
els.pauseBtn.addEventListener("click", () => {
  state.paused = !state.paused;
  els.pauseBtn.textContent = state.paused ? "继续" : "暂停";
});
els.proofInput.addEventListener("change", handleUpload);
els.verifyBtn.addEventListener("click", verifyResult);
document.querySelector("#saveResultBtn").addEventListener("click", saveResult);

renderBuddyFries();
renderHome();
renderHistory();
