const $ = (id) => document.getElementById(id);
const display = $("display");
const statusEl = $("status");
const startBtn = $("startBtn");
const resetBtn = $("resetBtn");
const lapBtn = $("lapBtn");
const dial = $("dial");
const ring = $("ring");
const lapList = $("lapList");
const lapEmpty = $("lapEmpty");
const lapCount = $("lapCount");

let elapsed = 0;       // milliseconds accumulated before the current run
let startedAt = 0;     // timestamp when the current run began
let frameId = null;
let laps = [];         // [{ split, total }]
let lastLapTotal = 0;

const pad = (n) => String(n).padStart(2, "0");

function format(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centis = Math.floor((ms % 1000) / 10);
  const main = hours ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
  return { main, cs: pad(centis) };
}

const text = (ms) => {
  const { main, cs } = format(ms);
  return `${main}.${cs}`;
};

function currentTime() {
  return frameId ? elapsed + (performance.now() - startedAt) : elapsed;
}

function render() {
  const ms = currentTime();
  const { main, cs } = format(ms);
  display.innerHTML = `${main}<span class="cs">.${cs}</span>`;
  // the ring completes one turn per minute
  ring.style.strokeDashoffset = String(100 - ((ms % 60000) / 60000) * 100);
  ring.style.opacity = ms > 0 ? "1" : "0"; // a round cap would otherwise show a dot at zero
}

function loop() {
  render();
  frameId = requestAnimationFrame(loop);
}

function setState(state) {
  const running = state === "running";
  dial.classList.toggle("running", running);
  startBtn.textContent = running ? "Pause" : state === "paused" ? "Resume" : "Start";
  startBtn.classList.toggle("is-running", running);
  lapBtn.disabled = !running;
  resetBtn.disabled = state === "idle";
  statusEl.textContent = running ? "Running" : state === "paused" ? "Paused" : "Ready";
}

function start() {
  startedAt = performance.now();
  frameId = requestAnimationFrame(loop);
  setState("running");
}

function pause() {
  elapsed += performance.now() - startedAt;
  cancelAnimationFrame(frameId);
  frameId = null;
  render();
  setState("paused");
}

function reset() {
  cancelAnimationFrame(frameId);
  frameId = null;
  elapsed = 0;
  laps = [];
  lastLapTotal = 0;
  render();
  renderLaps();
  setState("idle");
}

function toggle() {
  frameId ? pause() : start();
}

function lap() {
  if (!frameId) return;
  const total = currentTime();
  laps.unshift({ split: total - lastLapTotal, total });
  lastLapTotal = total;
  renderLaps();
}

function renderLaps() {
  lapCount.textContent = laps.length;
  lapEmpty.hidden = laps.length > 0;
  lapList.innerHTML = "";
  const splits = laps.map((l) => l.split);
  // best / worst only mean something with at least three laps
  const best = laps.length > 2 ? Math.min(...splits) : null;
  const worst = laps.length > 2 ? Math.max(...splits) : null;

  laps.forEach((l, i) => {
    const li = document.createElement("li");
    if (l.split === best) li.classList.add("best");
    if (l.split === worst) li.classList.add("worst");

    const no = document.createElement("span");
    no.className = "lap-no";
    no.textContent = `#${laps.length - i}`;

    const split = document.createElement("span");
    split.className = "lap-split";
    split.textContent = text(l.split);
    if (l.split === best || l.split === worst) {
      const tag = document.createElement("span");
      tag.className = "lap-tag";
      tag.textContent = l.split === best ? "Best" : "Slowest";
      split.appendChild(tag);
    }

    const total = document.createElement("span");
    total.className = "lap-total";
    total.textContent = text(l.total);

    li.append(no, split, total);
    lapList.appendChild(li);
  });
}

startBtn.addEventListener("click", toggle);
resetBtn.addEventListener("click", reset);
lapBtn.addEventListener("click", lap);

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === " " || key === "spacebar") {
    // let a focused button handle its own Space press
    if (document.activeElement && document.activeElement.tagName === "BUTTON") return;
    event.preventDefault();
    toggle();
  } else if (key === "l") lap();
  else if (key === "r" && !resetBtn.disabled) reset();
});

$("themeBtn").addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-bs-theme", next);
  try { localStorage.setItem("theme", next); } catch { /* storage may be unavailable */ }
});

render();
setState("idle");
renderLaps();
