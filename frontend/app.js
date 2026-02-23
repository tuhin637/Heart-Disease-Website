/* ═══════════════════════════════════════════
   CardioScan AI — app.js
   Handles: sliders, toggles, checkboxes,
            API call, result rendering
   ═══════════════════════════════════════════ */

// ── Config ─────────────────────────────────────────────────────────────────────
const API_BASE = window.CARDIOSCAN_API || "http://localhost:8000";
// On Vercel: set window.CARDIOSCAN_API = "https://your-render-app.onrender.com"
// via a <script> tag in index.html before this script, OR use a config.js file.

// ── DOM refs ───────────────────────────────────────────────────────────────────
const form           = document.getElementById("assessmentForm");
const submitBtn      = document.getElementById("submitBtn");
const btnText        = submitBtn.querySelector(".submit-btn__text");
const btnLoading     = submitBtn.querySelector(".submit-btn__loading");
const resultSection  = document.getElementById("resultSection");
const retakeBtn      = document.getElementById("retakeBtn");

// ── Slider hookup ──────────────────────────────────────────────────────────────
document.querySelectorAll(".slider").forEach(slider => {
  const output = slider.parentElement.querySelector(".slider-output");
  const field  = slider.name;

  const fmt = (val) => {
    if (field === "SleepTime")      return `${val} hrs`;
    if (field === "PhysicalHealth" || field === "MentalHealth") {
      return val === "0" ? "0 days" : `${val} days`;
    }
    return val;
  };

  // gradient fill
  const fill = () => {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background =
      `linear-gradient(to right, #f43f5e ${pct}%, var(--surface-3) ${pct}%)`;
    output.textContent = fmt(slider.value);
  };

  slider.addEventListener("input", fill);
  fill(); // init
});

// ── Toggle buttons (Sex) ──────────────────────────────────────────────────────
document.querySelectorAll(".toggle-group").forEach(group => {
  const hidden = document.querySelector(`input[name="${group.id.replace("-toggle","")}"]`) ||
                 group.parentElement.querySelector("input[type=hidden]");
  group.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      group.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (hidden) hidden.value = btn.dataset.value;
    });
  });
});

// ── Health scale ───────────────────────────────────────────────────────────────
document.querySelectorAll(".health-scale").forEach(scale => {
  const fieldId = scale.id.replace("-scale", "");
  const hidden  = document.getElementById(fieldId);
  scale.querySelectorAll(".scale-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      scale.querySelectorAll(".scale-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (hidden) hidden.value = btn.dataset.value;
    });
  });
});

// ── Checkbox cards ─────────────────────────────────────────────────────────────
document.querySelectorAll(".check-card").forEach(card => {
  const cb = card.querySelector(".check-input");

  // init visual state
  if (cb.checked) card.classList.add("checked");

  card.addEventListener("click", (e) => {
    if (e.target === cb) return; // let native handle it
    cb.checked = !cb.checked;
    card.classList.toggle("checked", cb.checked);
  });
  cb.addEventListener("change", () => {
    card.classList.toggle("checked", cb.checked);
  });
});

// ── Validation ─────────────────────────────────────────────────────────────────
function validate() {
  let ok = true;
  document.querySelectorAll(".error-msg").forEach(e => e.remove());
  document.querySelectorAll(".error").forEach(e => e.classList.remove("error"));

  const bmiEl = document.getElementById("bmi");
  const bmi   = parseFloat(bmiEl.value);
  if (!bmiEl.value || isNaN(bmi) || bmi < 10 || bmi > 60) {
    bmiEl.classList.add("error");
    addError(bmiEl, "Enter a valid BMI between 10 and 60");
    ok = false;
  }

  ["ageCategory","race"].forEach(id => {
    const el = document.getElementById(id);
    if (!el.value) {
      el.classList.add("error");
      addError(el, "Please select an option");
      ok = false;
    }
  });

  return ok;
}

function addError(el, msg) {
  const div = document.createElement("div");
  div.className = "error-msg"; div.textContent = msg;
  el.parentElement.appendChild(div);
}

// ── Collect form data ──────────────────────────────────────────────────────────
function collectData() {
  const yesNo = (name) => {
    const cb = document.querySelector(`input[name="${name}"]`);
    return cb && cb.checked ? "Yes" : "No";
  };

  return {
    BMI:             parseFloat(document.getElementById("bmi").value),
    Smoking:         yesNo("Smoking"),
    AlcoholDrinking: yesNo("AlcoholDrinking"),
    Stroke:          yesNo("Stroke"),
    PhysicalHealth:  parseFloat(document.getElementById("physicalHealth").value),
    MentalHealth:    parseFloat(document.getElementById("mentalHealth").value),
    DiffWalking:     yesNo("DiffWalking"),
    Sex:             document.getElementById("sex").value,
    AgeCategory:     document.getElementById("ageCategory").value,
    Race:            document.getElementById("race").value,
    Diabetic:        document.getElementById("diabetic").value,
    PhysicalActivity: yesNo("PhysicalActivity"),
    GenHealth:       document.getElementById("genHealth").value,
    SleepTime:       parseFloat(document.getElementById("sleepTime").value),
    Asthma:          yesNo("Asthma"),
    KidneyDisease:   yesNo("KidneyDisease"),
    SkinCancer:      yesNo("SkinCancer"),
  };
}

// ── API call ───────────────────────────────────────────────────────────────────
async function callAPI(payload) {
  const res = await fetch(`${API_BASE}/api/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${res.status}`);
  }
  return res.json();
}

// ── Render result ──────────────────────────────────────────────────────────────
function renderResult(data) {
  const isHigh    = data.prediction === 1;
  const pct       = Math.round(data.probability * 100);
  const levelMap  = {
    "Low":       { icon: "💚", cls: "verdict-card--safe",   lvlCls: "verdict-level--safe" },
    "Moderate":  { icon: "⚠️", cls: "verdict-card--warn",   lvlCls: "verdict-level--warn" },
    "High":      { icon: "⚠️", cls: "verdict-card--danger", lvlCls: "verdict-level--danger" },
    "Very High": { icon: "🚨", cls: "verdict-card--danger", lvlCls: "verdict-level--danger" },
  };
  const lm = levelMap[data.risk_level] || levelMap["High"];

  // Verdict card
  const card     = document.getElementById("verdictCard");
  const iconEl   = document.getElementById("verdictIcon");
  const levelEl  = document.getElementById("verdictLevel");
  const modelEl  = document.getElementById("verdictModel");

  card.className = `verdict-card ${lm.cls}`;
  iconEl.textContent  = lm.icon;
  levelEl.textContent = data.risk_level;
  levelEl.className   = `verdict-level ${lm.lvlCls}`;
  modelEl.textContent = `Analyzed by ${data.model_used} · Confidence: ${data.confidence}`;

  // Gauge
  const gaugeFill = document.getElementById("gaugeFill");
  const gaugePct  = document.getElementById("gaugePct");
  const circ = 2 * Math.PI * 48; // ≈ 301.6
  const dashOffset = circ * (1 - data.probability);

  // color
  const gaugeColor = pct >= 50 ? "#f43f5e" : pct >= 25 ? "#f59e0b" : "#10b981";
  gaugeFill.style.stroke = gaugeColor;

  // animate after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      gaugeFill.style.strokeDashoffset = dashOffset;
    });
  });

  // counter animation
  let count = 0;
  const step = Math.ceil(pct / 40);
  const timer = setInterval(() => {
    count = Math.min(count + step, pct);
    gaugePct.textContent = `${count}%`;
    if (count >= pct) clearInterval(timer);
  }, 25);

  // Risk factors
  const riskList = document.getElementById("riskList");
  const noRisks  = document.getElementById("noRisks");
  riskList.innerHTML = "";

  if (data.risk_factors.length === 0) {
    noRisks.hidden = false;
  } else {
    noRisks.hidden = true;
    data.risk_factors.forEach((rf, i) => {
      const item = document.createElement("div");
      item.className = `risk-item risk-item--${rf.severity}`;
      item.style.animationDelay = `${i * 0.06}s`;
      item.innerHTML = `
        <div class="risk-sev-dot risk-sev-dot--${rf.severity}"></div>
        <div class="risk-body">
          <div class="risk-name">
            ${rf.factor}
            <span class="risk-value">${rf.value}</span>
          </div>
          <div class="risk-desc">${rf.description}</div>
        </div>`;
      riskList.appendChild(item);
    });
  }

  // Recommendations
  const recList = document.getElementById("recList");
  recList.innerHTML = "";
  data.recommendations.forEach((rec, i) => {
    const item = document.createElement("div");
    item.className = `rec-item rec-item--${rec.priority}`;
    item.style.animationDelay = `${i * 0.05}s`;
    item.innerHTML = `
      <div class="rec-head">
        <span class="rec-icon">${rec.icon}</span>
        <span class="rec-title">${rec.title}</span>
        <span class="rec-priority rec-priority--${rec.priority}">${rec.priority}</span>
      </div>
      <p class="rec-desc">${rec.description}</p>`;
    recList.appendChild(item);
  });

  // Meta chips
  document.getElementById("metaModel").textContent      = data.model_used;
  document.getElementById("metaConfidence").textContent = `Confidence: ${data.confidence}`;

  // Show result, hide form
  form.closest("form") && (form.style.display = "none");
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Toast ──────────────────────────────────────────────────────────────────────
function showToast(msg, isError = false) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast${isError ? " toast--error" : ""}`;
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      ${isError
        ? `<circle cx="8" cy="8" r="7" stroke="#f43f5e" stroke-width="1.3"/>
           <path d="M8 4v4M8 10.5v.5" stroke="#f43f5e" stroke-width="1.3" stroke-linecap="round"/>`
        : `<circle cx="8" cy="8" r="7" stroke="#10b981" stroke-width="1.3"/>
           <path d="M5 8l2 2 4-4" stroke="#10b981" stroke-width="1.3" stroke-linecap="round"/>`
      }
    </svg>
    ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

// ── Loading state ──────────────────────────────────────────────────────────────
function setLoading(on) {
  submitBtn.disabled = on;
  btnText.hidden     = on;
  btnLoading.hidden  = !on;
}

// ── Form submit ────────────────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) {
    showToast("Please fix the highlighted fields", true);
    return;
  }

  setLoading(true);
  try {
    const payload = collectData();
    const result  = await callAPI(payload);
    renderResult(result);
  } catch (err) {
    showToast(err.message || "Could not reach the prediction server. Make sure the backend is running.", true);
    console.error(err);
  } finally {
    setLoading(false);
  }
});

// ── Retake ─────────────────────────────────────────────────────────────────────
retakeBtn.addEventListener("click", () => {
  resultSection.hidden = true;
  form.style.display   = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// ── Keyboard: Enter on select should not submit ────────────────────────────────
document.querySelectorAll("select, input[type=range]").forEach(el => {
  el.addEventListener("keydown", e => { if (e.key === "Enter") e.preventDefault(); });
});

// ── Init: mark active checkbox cards ──────────────────────────────────────────
document.querySelectorAll(".check-input:checked").forEach(cb => {
  cb.closest(".check-card")?.classList.add("checked");
});
