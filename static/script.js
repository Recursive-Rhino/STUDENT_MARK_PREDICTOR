// ── State (plain JS variables, no hidden inputs) ─────────────────────────────
var state = {
  study_hours:   2.0,
  attendance:    80,
  mental_health: 5,
  sleep_hours:   7.0,
  part_time_job: 0
};

// ── Floating particles ────────────────────────────────────────────────────────
(function() {
  var container = document.getElementById("particles");
  for (var i = 0; i < 22; i++) {
    var p    = document.createElement("div");
    var size = Math.random() * 4 + 2;
    p.className = "particle";
    p.style.cssText = "width:" + size + "px;height:" + size + "px;"
      + "left:" + (Math.random() * 100) + "%;"
      + "animation-duration:" + (Math.random() * 18 + 12) + "s;"
      + "animation-delay:" + (Math.random() * -20) + "s;"
      + "opacity:" + (Math.random() * 0.4 + 0.15).toFixed(2) + ";"
      + "background:hsl(" + (Math.random() > 0.5 ? "255,70%,70%" : "200,85%,65%") + ")";
    container.appendChild(p);
  }
})();

// ── Slider helpers ────────────────────────────────────────────────────────────
function setSliderFill(input) {
  var min = parseFloat(input.min);
  var max = parseFloat(input.max);
  var val = parseFloat(input.value);
  var pct = ((val - min) / (max - min)) * 100;
  input.style.background =
    "linear-gradient(to right, #7c6aff " + pct + "%, rgba(255,255,255,0.09) " + pct + "%)";
}

function initSlider(id, suffix, decimals) {
  var input = document.getElementById(id);
  var pill  = document.getElementById("val-" + id);
  if (!input || !pill) return;

  function refresh() {
    var raw  = parseFloat(input.value);
    state[id] = raw;
    var disp = decimals === 0 ? Math.round(raw) : raw.toFixed(1);
    pill.textContent = disp + suffix;
    setSliderFill(input);
  }

  input.addEventListener("input",  refresh);
  input.addEventListener("change", refresh);
  refresh();
}

initSlider("study_hours", " hrs", 1);
initSlider("attendance",  "%",    0);
initSlider("sleep_hours", " hrs", 1);

// ── Mental Health emoji picker ─────────────────────────────────────────────
var moodBtns = document.querySelectorAll(".mood-btn");
var moodPill = document.getElementById("val-mental_health");

function setMood(val) {
  val = parseInt(val, 10);
  state.mental_health = val;
  for (var i = 0; i < moodBtns.length; i++) {
    moodBtns[i].classList.toggle("active", parseInt(moodBtns[i].dataset.val, 10) === val);
  }
  if (moodPill) moodPill.textContent = val + " / 10";
}

for (var m = 0; m < moodBtns.length; m++) {
  (function(btn) {
    btn.addEventListener("click", function() {
      setMood(btn.dataset.val);
    });
  })(moodBtns[m]);
}

setMood(5);

// ── Part-Time Job toggle ──────────────────────────────────────────────────────
var ptjNo  = document.getElementById("ptj-no");
var ptjYes = document.getElementById("ptj-yes");

function setPTJ(val) {
  state.part_time_job = val;
  if (ptjNo)  ptjNo.classList.toggle("active",  val === 0);
  if (ptjYes) ptjYes.classList.toggle("active", val === 1);
}

if (ptjNo)  ptjNo.addEventListener("click",  function() { setPTJ(0); });
if (ptjYes) ptjYes.addEventListener("click", function() { setPTJ(1); });

setPTJ(0);

// ── Predict button ────────────────────────────────────────────────────────────
var predictBtn = document.getElementById("predict-btn");

predictBtn.addEventListener("click", function() {
  var payload = {
    study_hours:   state.study_hours,
    attendance:    state.attendance,
    mental_health: state.mental_health,
    sleep_hours:   state.sleep_hours,
    part_time_job: state.part_time_job
  };

  setLoading(true);

  fetch("/predict", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload)
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.success) {
      showResult(data.score, payload);
    } else {
      alert("Prediction error: " + (data.error || "Unknown"));
    }
  })
  .catch(function(err) {
    alert("Could not reach /predict — is server.py running?\n" + err.message);
  })
  .finally(function() {
    setLoading(false);
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────
function setLoading(on) {
  var textEl = predictBtn.querySelector(".btn-text");
  var iconEl = predictBtn.querySelector(".btn-icon");
  predictBtn.disabled = on;
  predictBtn.classList.toggle("loading", on);
  if (on) {
    textEl.textContent = "Predicting…";
    iconEl.textContent = "⏳";
  } else {
    textEl.textContent = "Predict My Score";
    iconEl.textContent = "→";
  }
}

// ── Show Result ───────────────────────────────────────────────────────────────
function showResult(score, inputs) {
  var panel    = document.getElementById("result-panel");
  var numEl    = document.getElementById("score-number");
  var gradeEl  = document.getElementById("score-grade");
  var feedEl   = document.getElementById("score-feedback");
  var breakEl  = document.getElementById("score-breakdown");
  var ringFill = document.getElementById("ring-fill");

  panel.classList.add("visible");
  panel.scrollIntoView({ behavior: "smooth", block: "nearest" });

  animateCount(numEl, 0, score, 1300);

  // Ring: circumference of r=50 = 2π×50 ≈ 314
  var circumference = 314;
  var offset = circumference - (score / 100) * circumference;
  setTimeout(function() {
    ringFill.style.strokeDashoffset = offset;
  }, 100);

  var g = gradeScore(score);
  gradeEl.textContent = g.emoji + "  " + g.grade;
  feedEl.textContent  = g.feedback;

  var tips = [];
  if (inputs.study_hours   < 3)  tips.push("📚 Study more — even 1 extra hour daily helps a lot.");
  if (inputs.attendance    < 70) tips.push("🏫 Attendance below 70% — attend more classes.");
  if (inputs.mental_health < 5)  tips.push("🧠 Take care of your well-being; it impacts results.");
  if (inputs.sleep_hours   < 6)  tips.push("🌙 Aim for at least 7 hrs of sleep per night.");
  if (inputs.part_time_job === 1) tips.push("💼 Balancing a job — manage your time carefully.");
  if (tips.length === 0) tips.push("🌟 Excellent habits! Keep it up.");

  breakEl.innerHTML = tips.map(function(t) { return "<div>" + t + "</div>"; }).join("");
}

function gradeScore(s) {
  if (s >= 90) return { grade: "A+  Outstanding",  feedback: "You're absolutely crushing it!",         emoji: "🏆" };
  if (s >= 80) return { grade: "A  Excellent",      feedback: "Fantastic work — keep this energy!",     emoji: "🎯" };
  if (s >= 70) return { grade: "B  Good",           feedback: "Solid performance, push a little more.", emoji: "📈" };
  if (s >= 60) return { grade: "C  Average",        feedback: "Room for improvement — you've got this.",emoji: "💡" };
  if (s >= 50) return { grade: "D  Below Average",  feedback: "Let's build better habits step by step.",emoji: "🔧" };
               return { grade: "F  Needs Effort",   feedback: "Don't give up — small changes = big wins.",emoji: "💪" };
}

function animateCount(el, from, to, duration) {
  var start = performance.now();
  function step(now) {
    var t     = Math.min((now - start) / duration, 1);
    var eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = Math.round(to);
  }
  requestAnimationFrame(step);
}
