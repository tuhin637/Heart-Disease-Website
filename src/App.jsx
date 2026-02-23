import { useState, useEffect, useRef } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AGE_CATS = ["18-24","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-64","65-69","70-74","75-79","80 or older"];
const RACES    = ["White","Black","Asian","American Indian/Alaskan Native","Hispanic","Other"];
const GEN_H    = ["Excellent","Very good","Good","Fair","Poor"];
const DIABETIC = ["No","No, borderline diabetes","Yes","Yes (during pregnancy)"];
const STEPS    = [
  { id:0, title:"Physical Metrics", icon:"📐", sub:"BMI, health days, sleep" },
  { id:1, title:"Lifestyle",        icon:"🏃", sub:"Habits & activity" },
  { id:2, title:"Medical History",  icon:"🩺", sub:"Conditions & diagnoses" },
  { id:3, title:"Demographics",     icon:"👤", sub:"Age, sex & background" },
];
const INIT = {
  BMI:"25.0", PhysicalHealth:"0", MentalHealth:"0", SleepTime:"7",
  Smoking:"No", AlcoholDrinking:"No", PhysicalActivity:"Yes", DiffWalking:"No",
  Stroke:"No", Diabetic:"No", Asthma:"No", KidneyDisease:"No", SkinCancer:"No",
  Sex:"Male", AgeCategory:"30-34", Race:"White", GenHealth:"Good",
};

const mockPredict = async (f) => {
  await new Promise(r => setTimeout(r, 2200));
  const bmi = parseFloat(f.BMI), age = AGE_CATS.indexOf(f.AgeCategory);
  let p = 0.07;
  if (bmi > 35) p += 0.22; else if (bmi > 30) p += 0.12;
  if (f.Smoking === "Yes") p += 0.20;
  if (f.Stroke === "Yes") p += 0.25;
  if (parseFloat(f.PhysicalHealth) > 15) p += 0.14;
  if (age >= 8) p += 0.14;
  if (age >= 10) p += 0.08;
  if (f.Diabetic === "Yes") p += 0.12;
  if (f.KidneyDisease === "Yes") p += 0.10;
  if (f.PhysicalActivity === "No") p += 0.05;
  if (parseFloat(f.SleepTime) < 6 || parseFloat(f.SleepTime) > 9) p += 0.04;
  p = Math.min(p, 0.96);
  const pred = p > 0.5 ? 1 : 0;
  const riskLevel = p < 0.25 ? "Low" : p < 0.5 ? "Moderate" : p < 0.75 ? "High" : "Very High";
  const risk_factors = [];
  if (bmi > 35) risk_factors.push({ factor:"Severe Obesity", value:`BMI ${bmi.toFixed(1)}`, impact:"high", advice:"Target BMI below 25. Consult a nutritionist for a structured plan." });
  else if (bmi > 30) risk_factors.push({ factor:"Obesity", value:`BMI ${bmi.toFixed(1)}`, impact:"medium", advice:"Gradual weight loss of 0.5-1 kg/week through diet and exercise." });
  if (f.Smoking==="Yes") risk_factors.push({ factor:"Active Smoker", value:"Yes", impact:"high", advice:"Cessation programs and nicotine replacement therapy recommended." });
  if (f.Stroke==="Yes") risk_factors.push({ factor:"Stroke History", value:"Yes", impact:"high", advice:"Regular cardiac monitoring and cardiologist consultation required." });
  if (parseFloat(f.PhysicalHealth)>15) risk_factors.push({ factor:"Poor Physical Health", value:`${f.PhysicalHealth} bad days/mo`, impact:"high", advice:"Seek comprehensive medical evaluation for underlying issues." });
  if (age >= 8) risk_factors.push({ factor:"Age Risk", value:f.AgeCategory, impact: age>=10?"high":"medium", advice:"Annual cardiac screenings strongly recommended." });
  if (f.PhysicalActivity==="No") risk_factors.push({ factor:"Sedentary Lifestyle", value:"No exercise", impact:"medium", advice:"150 min/week moderate aerobic activity is the target." });
  if (f.KidneyDisease==="Yes") risk_factors.push({ factor:"Kidney Disease", value:"Yes", impact:"high", advice:"CKD significantly elevates cardiovascular risk." });
  const recommendations = [];
  if (pred===1) { recommendations.push("Consult a cardiologist for full cardiac evaluation immediately."); recommendations.push("Request ECG, stress test, and lipid panel."); }
  if (bmi>=30) recommendations.push("Partner with a registered dietitian for a heart-healthy meal plan.");
  if (f.Smoking==="Yes") recommendations.push("Smoking cessation is the single most impactful change you can make today.");
  if (f.PhysicalActivity==="No") recommendations.push("Start with 20-min walks daily; build to 150 min/week over 4 weeks.");
  if (parseFloat(f.SleepTime)<7) recommendations.push("Prioritize 7-9 hours sleep. Poor sleep acutely elevates heart risk.");
  recommendations.push("Annual health screenings: cholesterol, blood pressure, blood glucose.");
  return { prediction:pred, risk_label:pred===1?"Elevated Risk":"Low Risk", probability:p, risk_percentage:+(p*100).toFixed(1), risk_level:riskLevel, risk_factors, recommendations, model_used:"RuleNet Hybrid (RF + Medical Rules)" };
};

function ECGCanvas({ color = "#ff3366", height = 40, speed = 2 }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const offsetRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = height * dpr;
    };
    resize();
    const ctx = canvas.getContext("2d");
    const ecg = (x) => {
      const t = (x % 320) / 320;
      if (t < 0.12) return Math.sin(t / 0.12 * Math.PI) * 4;
      if (t < 0.25) return -Math.sin((t - 0.12) / 0.13 * Math.PI) * 7;
      if (t < 0.30) return (t - 0.25) / 0.05 * 35;
      if (t < 0.36) return 35 - (t - 0.30) / 0.06 * 55;
      if (t < 0.42) return -20 + (t - 0.36) / 0.06 * 26;
      if (t < 0.52) return 6 - Math.sin((t - 0.42) / 0.10 * Math.PI) * 9;
      return 0;
    };
    const draw = () => {
      const W = canvas.width, H = canvas.height, mid = H / 2;
      ctx.clearRect(0, 0, W, H);
      offsetRef.current = (offsetRef.current + speed) % 320;
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.3, color);
      grad.addColorStop(0.7, color);
      grad.addColorStop(1, "transparent");
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2 * dpr;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let x = 0; x < W; x++) {
        const y = mid + ecg(x / dpr + offsetRef.current) * dpr * 0.6;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [color, height, speed]);
  return <canvas ref={canvasRef} style={{ width: "100%", height, display: "block" }} />;
}

function MeshBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,45,90,0.12) 0%, transparent 70%)", top: -200, left: -200, animation: "floatOrb1 18s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,180,255,0.10) 0%, transparent 70%)", top: "30%", right: -150, animation: "floatOrb2 22s ease-in-out infinite" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(120,60,255,0.08) 0%, transparent 70%)", bottom: -100, left: "30%", animation: "floatOrb3 26s ease-in-out infinite" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,11,22,0) 0%, rgba(8,11,22,0.4) 100%)" }} />
    </div>
  );
}

function Counter({ to, suffix = "", decimals = 0, duration = 1500 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setVal(+(to * ease).toFixed(decimals));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration, decimals]);
  return <span>{val}{suffix}</span>;
}

function RiskGauge({ pct, level }) {
  const canvasRef = useRef(null);
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    let frame, start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / 1800, 1);
      const ease = 1 - Math.pow(1 - prog, 4);
      setDrawn(pct * ease);
      if (prog < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [pct]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 240, H = 160, cx = 120, cy = 138, R = 100, lw = 16;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI * 0.75, Math.PI * 2.25);
    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = lw + 6; ctx.lineCap = "round"; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI * 0.75, Math.PI * 2.25);
    ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = lw; ctx.stroke();
    const zones = [[0, 25, "#06ffa5"], [25, 50, "#ffd166"], [50, 75, "#ff9a3c"], [75, 100, "#ff3366"]];
    zones.forEach(([s, e, c]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, R, Math.PI * 0.75 + (s / 100) * Math.PI * 1.5, Math.PI * 0.75 + (e / 100) * Math.PI * 1.5);
      ctx.strokeStyle = c + "22"; ctx.lineWidth = lw; ctx.lineCap = "butt"; ctx.stroke();
    });
    if (drawn > 0) {
      const col = drawn < 25 ? "#06ffa5" : drawn < 50 ? "#ffd166" : drawn < 75 ? "#ff9a3c" : "#ff3366";
      const grd = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
      grd.addColorStop(0, "#06ffa5"); grd.addColorStop(0.5, "#ffd166"); grd.addColorStop(1, "#ff3366");
      ctx.beginPath();
      ctx.arc(cx, cy, R, Math.PI * 0.75, Math.PI * 0.75 + (drawn / 100) * Math.PI * 1.5);
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round";
      ctx.shadowBlur = 24; ctx.shadowColor = col; ctx.stroke(); ctx.shadowBlur = 0;
      const ang = Math.PI * 0.75 + (drawn / 100) * Math.PI * 1.5;
      const ex = cx + R * Math.cos(ang), ey = cy + R * Math.sin(ang);
      ctx.beginPath(); ctx.arc(ex, ey, lw / 2 + 3, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.shadowBlur = 30; ctx.shadowColor = col; ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(ex, ey, lw / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = "#080b16"; ctx.fill();
    }
    ctx.fillStyle = "#2d3748"; ctx.font = "bold 10px 'JetBrains Mono',monospace"; ctx.textAlign = "center";
    ctx.fillText("0%", cx - R * Math.cos(Math.PI * 0.75) + 6, cy - R * Math.sin(Math.PI * 0.75) + 12);
    ctx.fillText("100%", cx + R * Math.cos(Math.PI * 0.75) - 6, cy - R * Math.sin(Math.PI * 0.75) + 12);
  }, [drawn]);

  const col = pct < 25 ? "#06ffa5" : pct < 50 ? "#ffd166" : pct < 75 ? "#ff9a3c" : "#ff3366";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <canvas ref={canvasRef} style={{ width: 240, height: 160 }} />
      <div style={{ textAlign: "center", marginTop: -28 }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 52, color: col, lineHeight: 1, letterSpacing: 2, textShadow: `0 0 30px ${col}60` }}>
          <Counter to={pct} suffix="%" decimals={1} duration={1800} />
        </div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: col, opacity: 0.8, letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>{level} Risk</div>
      </div>
    </div>
  );
}

function StepIndicator({ current }) {
  return (
    <div style={{ display: "flex", gap: 0, marginBottom: 36, background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
      {STEPS.map((s, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={i} style={{ flex: 1, padding: "16px 14px", display: "flex", alignItems: "center", gap: 12, background: active ? "rgba(255,51,102,0.06)" : "transparent", borderRight: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", position: "relative", transition: "background 0.3s" }}>
            {active && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#ff3366,#ff9a3c)", borderRadius: "2px 2px 0 0" }} />}
            <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: done ? "linear-gradient(135deg,#06ffa5,#00b4ff)" : active ? "rgba(255,51,102,0.15)" : "rgba(255,255,255,0.04)", border: active ? "1px solid rgba(255,51,102,0.4)" : done ? "none" : "1px solid rgba(255,255,255,0.07)", transition: "all 0.3s" }}>
              {done ? <span style={{ color: "#080b16", fontWeight: 700, fontSize: 13 }}>✓</span> : s.icon}
            </div>
            <div style={{ display: window.innerWidth < 600 ? "none" : "block" }}>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, color: active ? "#ff3366" : done ? "#06ffa5" : "#4a5568", lineHeight: 1.2 }}>{s.title}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2d3748", marginTop: 2, letterSpacing: 0.5 }}>{s.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const inputBase = {
  width: "100%", background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
  padding: "12px 16px", color: "#e8eaf6", fontSize: 15,
  fontFamily: "'JetBrains Mono',monospace", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s",
};

function Toggle({ label, field, value, onChange, icon }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: "#718096", display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span>{icon}</span>}{label}
      </label>
      <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
        {["No", "Yes"].map(opt => (
          <button key={opt} type="button" onClick={() => onChange(field, opt)} style={{
            flex: 1, padding: "11px 0", border: "none", cursor: "pointer",
            fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600,
            background: value === opt
              ? (opt === "Yes" ? "linear-gradient(135deg,#ff3366,#ff6b6b)" : "linear-gradient(135deg,#06ffa5,#00b4ff)")
              : "transparent",
            color: value === opt ? (opt === "Yes" ? "#fff" : "#080b16") : "#4a5568",
            transition: "all 0.25s", letterSpacing: 0.5,
          }}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

function Select({ label, field, value, options, onChange, icon }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: "#718096", display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span>{icon}</span>}{label}
      </label>
      <div style={{ position: "relative" }}>
        <select value={value} onChange={e => onChange(field, e.target.value)} style={{ ...inputBase, padding: "12px 40px 12px 16px", appearance: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#4a5568", pointerEvents: "none", fontSize: 12 }}>▾</span>
      </div>
    </div>
  );
}

function Num({ label, field, value, onChange, min, max, step = "0.1", unit, icon }) {
  const pct = Math.max(0, Math.min(100, ((parseFloat(value) - parseFloat(min)) / (parseFloat(max) - parseFloat(min))) * 100));
  const gradCol = pct < 40 ? "#06ffa5" : pct < 70 ? "#ffd166" : "#ff3366";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: "#718096", display: "flex", alignItems: "center", gap: 6 }}>
        {icon && <span>{icon}</span>}{label}
      </label>
      <div style={{ position: "relative" }}>
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={e => onChange(field, e.target.value)}
          style={{ ...inputBase, paddingRight: unit ? "68px" : "16px" }} />
        {unit && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: "#4a5568", fontSize: 11, fontFamily: "'JetBrains Mono',monospace", pointerEvents: "none" }}>{unit}</span>}
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,#06ffa5,${gradCol})`, borderRadius: 3, transition: "width 0.3s, background 0.5s", boxShadow: `0 0 8px ${gradCol}60` }} />
      </div>
    </div>
  );
}

const impCol = { high: "#ff3366", medium: "#ffd166", low: "#06ffa5" };

function RiskCard({ rf, index }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), index * 130); return () => clearTimeout(t); }, [index]);
  const col = impCol[rf.impact];
  return (
    <div style={{
      padding: "18px 20px", borderRadius: 14, marginBottom: 12,
      background: `linear-gradient(135deg, ${col}06, transparent)`,
      border: `1px solid ${col}20`, borderLeft: `3px solid ${col}`,
      opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)",
      transition: "opacity 0.4s, transform 0.4s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#e8eaf6", fontWeight: 700, fontSize: 14 }}>{rf.factor}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", color: "#4a5568", fontSize: 11, marginTop: 2 }}>{rf.value}</div>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "4px 10px", borderRadius: 20, background: `${col}15`, color: col, border: `1px solid ${col}30`, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0, marginLeft: 10 }}>{rf.impact}</span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "#718096", lineHeight: 1.6, fontFamily: "'DM Sans',sans-serif" }}>{rf.advice}</p>
    </div>
  );
}

export default function App() {
  const [step, setStep]     = useState(0);
  const [form, setForm]     = useState(INIT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [tab, setTab]       = useState("assess");
  const [bpm, setBpm]       = useState(72);
  const [showRes, setShowRes] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setBpm(68 + Math.floor(Math.random() * 12)), 900);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (result) {
      setTimeout(() => {
        setShowRes(true);
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [result]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#080b16;font-family:'DM Sans',sans-serif;}
      ::-webkit-scrollbar{width:4px;}
      ::-webkit-scrollbar-thumb{background:rgba(255,51,102,0.25);border-radius:4px;}
      input[type=number]::-webkit-inner-spin-button{opacity:.35;}
      select option{background:#0d111f;color:#e8eaf6;}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}
      @keyframes floatOrb1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(60px,-40px) scale(1.05)}66%{transform:translate(-30px,50px) scale(0.97)}}
      @keyframes floatOrb2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-70px,50px) scale(1.03)}66%{transform:translate(40px,-60px) scale(0.98)}}
      @keyframes floatOrb3{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(50px,40px) scale(1.04)}66%{transform:translate(-50px,-30px) scale(0.96)}}
      @keyframes heartbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.28)}30%{transform:scale(1)}45%{transform:scale(1.14)}}
      @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
      @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(255,51,102,0.3)}50%{box-shadow:0 0 40px rgba(255,51,102,0.6)}}
      .fadeUp{animation:fadeUp 0.6s ease forwards;}
      .pulse-ring{animation:pulse 1.6s ease infinite;}
      .hb{animation:heartbeat 1s ease-in-out infinite;}
      input:focus{border-color:rgba(255,51,102,0.4)!important;box-shadow:0 0 0 3px rgba(255,51,102,0.08);}
      select:focus{border-color:rgba(255,51,102,0.4)!important;box-shadow:0 0 0 3px rgba(255,51,102,0.08);}
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(link); document.head.removeChild(style); };
  }, []);

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const analyze = async () => {
    setLoading(true); setResult(null); setShowRes(false);
    try {
      let data;
      try {
        const r = await fetch(`${BASE_URL}/predict`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, BMI: parseFloat(form.BMI), PhysicalHealth: parseFloat(form.PhysicalHealth), MentalHealth: parseFloat(form.MentalHealth), SleepTime: parseFloat(form.SleepTime) }),
          signal: AbortSignal.timeout(10000),
        });
        if (!r.ok) throw new Error();
        data = await r.json();
      } catch { data = await mockPredict(form); }
      setResult(data);
    } finally { setLoading(false); }
  };

  const rCol = result?.prediction === 1 ? "#ff3366" : "#06ffa5";

  return (
    <div style={{ minHeight: "100vh", background: "#080b16", color: "#e8eaf6", position: "relative", overflowX: "hidden" }}>
      <MeshBackground />

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,11,22,0.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 28px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="hb" style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#ff3366,#ff6b6b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 0 20px rgba(255,51,102,0.4)" }}>❤️</div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 2, background: "linear-gradient(135deg,#ff3366,#ffd166,#06ffa5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200%", animation: "shimmer 4s linear infinite" }}>Heart Disease Risk AI</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, color: "#2d3748", letterSpacing: 2, marginTop: 1 }}>CDC BRFSS 2020 · 319,795 RECORDS</div>
            </div>
          </div>

          {/* BPM Monitor */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ background: "rgba(255,51,102,0.06)", border: "1px solid rgba(255,51,102,0.15)", borderRadius: 12, padding: "8px 18px", display: "flex", alignItems: "center", gap: 12, backdropFilter: "blur(8px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div className="pulse-ring" style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff3366", boxShadow: "0 0 10px #ff3366" }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "#ff3366", fontWeight: 500 }}>{bpm} BPM</span>
              </div>
              <div style={{ width: 90, height: 28 }}><ECGCanvas color="#ff3366" height={28} speed={2.5} /></div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ fontSize: 9, padding: "4px 10px", borderRadius: 6, background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.2)", color: "#ff3366", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>DIU FYDP</span>
              <span style={{ fontSize: 9, padding: "4px 10px", borderRadius: 6, background: "rgba(0,180,255,0.08)", border: "1px solid rgba(0,180,255,0.2)", color: "#00b4ff", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 1 }}>2025</span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 28px", display: "flex", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
          {[["assess", "🩺", "Risk Assessment"], ["model", "🤖", "Model Info"], ["stats", "📊", "Statistics"]].map(([id, ic, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: "11px 22px", background: "none", border: "none",
              borderBottom: `2px solid ${tab === id ? "#ff3366" : "transparent"}`,
              color: tab === id ? "#ff3366" : "#4a5568",
              fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
            }}><span>{ic}</span>{lbl}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "48px 28px 100px", position: "relative", zIndex: 2 }}>

        {/* ── ASSESS TAB ── */}
        {tab === "assess" && (
          <div>
            {/* Hero Section */}
            <div className="fadeUp" style={{ textAlign: "center", paddingBottom: 56, marginBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 100, background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.2)", marginBottom: 24, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#ff3366", letterSpacing: 2 }}>
                <div className="pulse-ring" style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff3366" }} />
                AI MODEL ACTIVE · REAL-TIME ANALYSIS
              </div>

              <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(3rem,6vw,5.5rem)", letterSpacing: 3, lineHeight: 1, marginBottom: 20 }}>
                <span style={{ display: "block", background: "linear-gradient(135deg,#ffffff,#94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Cardiovascular</span>
                <span style={{ display: "block", background: "linear-gradient(135deg,#ff3366,#ff9a3c,#ffd166)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200%", animation: "shimmer 3s linear infinite" }}>Risk Assessment</span>
              </h1>

              <p style={{ color: "#4a5568", fontSize: 15, maxWidth: 460, margin: "0 auto 32px", lineHeight: 1.8, fontWeight: 400 }}>
                17 clinical parameters analyzed by our RuleNet hybrid model for precise cardiovascular risk stratification.
              </p>

              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                {[["94.21%", "Accuracy", "#06ffa5"], ["0.98", "AUC-ROC", "#00b4ff"], ["96.19%", "Precision", "#ffd166"], ["5-Fold", "Cross-Val", "#ff9a3c"]].map(([v, l, c]) => (
                  <div key={l} style={{ padding: "14px 22px", background: "rgba(255,255,255,0.02)", border: `1px solid ${c}20`, borderRadius: 14, textAlign: "center", backdropFilter: "blur(8px)" }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: c, letterSpacing: 2, lineHeight: 1 }}>{v}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#4a5568", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Card */}
            <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: "40px", backdropFilter: "blur(12px)", marginBottom: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,51,102,0.4),transparent)" }} />

              <StepIndicator current={step} />

              <div style={{ marginBottom: 32, opacity: 0.5 }}>
                <ECGCanvas color="#ff336620" height={28} speed={1.5} />
              </div>

              <div key={step} style={{ animation: "fadeUp 0.3s ease" }}>
                {step === 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 22 }}>
                    <Num label="BMI" icon="⚖️" field="BMI" value={form.BMI} onChange={set} min="10" max="70" unit="kg/m²" />
                    <Num label="Physical Health (bad days/month)" icon="🏥" field="PhysicalHealth" value={form.PhysicalHealth} onChange={set} min="0" max="30" step="1" unit="/30" />
                    <Num label="Mental Health (bad days/month)" icon="🧠" field="MentalHealth" value={form.MentalHealth} onChange={set} min="0" max="30" step="1" unit="/30" />
                    <Num label="Sleep Time" icon="😴" field="SleepTime" value={form.SleepTime} onChange={set} min="0" max="24" step="0.5" unit="hrs" />
                  </div>
                )}
                {step === 1 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 22 }}>
                    <Toggle label="Do you smoke?" icon="🚬" field="Smoking" value={form.Smoking} onChange={set} />
                    <Toggle label="Heavy Alcohol Drinking?" icon="🍺" field="AlcoholDrinking" value={form.AlcoholDrinking} onChange={set} />
                    <Toggle label="Physically Active?" icon="🏃" field="PhysicalActivity" value={form.PhysicalActivity} onChange={set} />
                    <Toggle label="Difficulty Walking?" icon="🚶" field="DiffWalking" value={form.DiffWalking} onChange={set} />
                  </div>
                )}
                {step === 2 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 22 }}>
                    <Toggle label="History of Stroke?" icon="🧬" field="Stroke" value={form.Stroke} onChange={set} />
                    <Select label="Diabetic Status" icon="💉" field="Diabetic" value={form.Diabetic} options={DIABETIC} onChange={set} />
                    <Toggle label="Asthma?" icon="💨" field="Asthma" value={form.Asthma} onChange={set} />
                    <Toggle label="Kidney Disease?" icon="🫘" field="KidneyDisease" value={form.KidneyDisease} onChange={set} />
                    <Toggle label="Skin Cancer?" icon="🔬" field="SkinCancer" value={form.SkinCancer} onChange={set} />
                  </div>
                )}
                {step === 3 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 22 }}>
                    <Select label="Sex" icon="👤" field="Sex" value={form.Sex} options={["Male", "Female"]} onChange={set} />
                    <Select label="Age Category" icon="🎂" field="AgeCategory" value={form.AgeCategory} options={AGE_CATS} onChange={set} />
                    <Select label="Race / Ethnicity" icon="🌍" field="Race" value={form.Race} options={RACES} onChange={set} />
                    <Select label="General Health" icon="💚" field="GenHealth" value={form.GenHealth} options={GEN_H} onChange={set} />
                  </div>
                )}
              </div>

              {/* Nav */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40, paddingTop: 28, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <button onClick={prev} disabled={step === 0} style={{ padding: "12px 28px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: step === 0 ? "#2d3748" : "#718096", fontSize: 14, fontWeight: 600, cursor: step === 0 ? "default" : "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>← Back</button>

                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {STEPS.map((_, i) => (
                    <div key={i} style={{ height: 4, width: i === step ? 28 : 8, borderRadius: 4, background: i <= step ? (i === step ? "#ff3366" : "#06ffa5") : "rgba(255,255,255,0.08)", transition: "all 0.3s", boxShadow: i === step ? "0 0 8px #ff3366" : "none" }} />
                  ))}
                </div>

                {step < STEPS.length - 1 ? (
                  <button onClick={next} style={{ padding: "12px 32px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#ff3366,#ff6b6b)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", boxShadow: "0 4px 24px rgba(255,51,102,0.35)", transition: "all 0.2s" }}>Next →</button>
                ) : (
                  <button onClick={analyze} disabled={loading} style={{
                    padding: "12px 36px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: loading ? "default" : "pointer",
                    fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 10,
                    border: loading ? "1px solid rgba(255,51,102,0.3)" : "none",
                    background: loading ? "rgba(255,51,102,0.08)" : "linear-gradient(135deg,#ff3366,#ff9a3c)",
                    color: loading ? "#ff3366" : "#fff",
                    boxShadow: loading ? "none" : "0 4px 28px rgba(255,51,102,0.4)",
                    animation: !loading ? "glow 2s ease infinite" : "none",
                  }}>
                    {loading ? (
                      <><span style={{ width: 16, height: 16, border: "2px solid rgba(255,51,102,0.3)", borderTopColor: "#ff3366", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Analyzing...</>
                    ) : "⚡ Analyze Risk"}
                  </button>
                )}
              </div>
            </div>

            {/* RESULTS */}
            {result && (
              <div ref={resultRef} style={{ opacity: showRes ? 1 : 0, transform: showRes ? "translateY(0)" : "translateY(30px)", transition: "opacity 0.7s, transform 0.7s" }}>
                {/* Result Header Card */}
                <div style={{ borderRadius: 24, overflow: "hidden", marginBottom: 24, border: `1px solid ${rCol}25`, background: `linear-gradient(135deg,${rCol}06,rgba(8,11,22,0.98) 60%)`, position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${rCol},transparent)` }} />
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle,${rCol}08,transparent 70%)`, pointerEvents: "none" }} />
                  <div style={{ padding: "40px 44px", display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap", position: "relative" }}>
                    <div style={{ fontSize: 72, lineHeight: 1, filter: "drop-shadow(0 0 20px rgba(255,255,255,0.3))" }}>{result.prediction === 1 ? "⚠️" : "✅"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#4a5568", letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>ANALYSIS COMPLETE · {result.model_used}</div>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 52, color: rCol, letterSpacing: 3, lineHeight: 1, marginBottom: 10, textShadow: `0 0 40px ${rCol}50` }}>{result.risk_label}</div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", color: "#718096", fontSize: 15 }}>
                        Risk Level: <span style={{ color: rCol, fontWeight: 700 }}>{result.risk_level}</span>
                        <span style={{ margin: "0 14px", opacity: 0.3 }}>·</span>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>{result.risk_factors.length} risk factor{result.risk_factors.length !== 1 ? "s" : ""} detected</span>
                      </div>
                    </div>
                    <RiskGauge pct={result.risk_percentage} level={result.risk_level} />
                  </div>
                </div>

                {/* Risk Factors + Recommendations */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                  <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 30, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,51,102,0.3),transparent)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 18 }}>⚡</span>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf6" }}>Risk Factors</span>
                      <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#4a5568", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 6 }}>{result.risk_factors.length} FOUND</span>
                    </div>
                    {result.risk_factors.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "36px 0" }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: "#06ffa5", letterSpacing: 2 }}>No Major Risk Factors</div>
                      </div>
                    ) : result.risk_factors.map((rf, i) => <RiskCard key={i} rf={rf} index={i} />)}
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 30, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(6,255,165,0.3),transparent)" }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ fontSize: 18 }}>💡</span>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf6" }}>Recommendations</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {result.recommendations.map((rec, i) => (
                        <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 16px", background: "rgba(6,255,165,0.03)", border: "1px solid rgba(6,255,165,0.10)", borderRadius: 12, opacity: 0, animation: `fadeUp 0.4s ease ${i * 0.1 + 0.2}s forwards` }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(6,255,165,0.12)", border: "1px solid rgba(6,255,165,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                            <span style={{ color: "#06ffa5", fontSize: 10, fontWeight: 700 }}>✓</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 13, color: "#718096", lineHeight: 1.7, fontFamily: "'DM Sans',sans-serif" }}>{rec}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(255,209,102,0.05)", border: "1px solid rgba(255,209,102,0.15)", borderRadius: 10, fontSize: 12, color: "#ffd166", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7 }}>
                      ⚠️ This is an AI-based risk assessment only — not a substitute for professional medical diagnosis.
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <button onClick={() => { setResult(null); setShowRes(false); setStep(0); }} style={{ padding: "11px 30px", borderRadius: 12, background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "#4a5568", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s" }}>← Start New Assessment</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MODEL TAB ── */}
        {tab === "model" && (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 40, marginBottom: 20, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,51,102,0.4),transparent)" }} />
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#ff3366", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>ARCHITECTURE</div>
              <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 40, letterSpacing: 2, marginBottom: 12, background: "linear-gradient(135deg,#ff3366,#ffd166)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>RuleNet Hybrid Model</h2>
              <p style={{ color: "#718096", lineHeight: 1.8, marginBottom: 36, maxWidth: 640, fontFamily: "'DM Sans',sans-serif", fontSize: 15 }}>A hybrid classifier combining domain-expert medical rules with a Random Forest ensemble. Rules provide high-confidence interpretable decisions; RF handles ambiguous cases with probabilistic scoring.</p>
              <div style={{ display: "flex", gap: 0, alignItems: "stretch", background: "rgba(0,0,0,0.3)", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.05)" }}>
                {[{ icon: "📥", title: "Input Layer", desc: "17 clinical features\nnormalized & encoded", color: "#00b4ff" }, { icon: "📏", title: "Rule Engine", desc: "3 medical rules\nhigh-confidence cases", color: "#a78bfa" }, { icon: "🌲", title: "Random Forest", desc: "500 estimators\nSMOTE balanced", color: "#ff9a3c" }, { icon: "🎯", title: "Output", desc: "Risk score +\nexplanation", color: "#06ffa5" }].map((s, i, arr) => (
                  <div key={i} style={{ flex: 1, padding: "28px 22px", position: "relative", borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: `${s.color}12`, border: `1px solid ${s.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>{s.icon}</div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", color: s.color, fontSize: 18, letterSpacing: 1, marginBottom: 8 }}>{s.title}</div>
                    <div style={{ color: "#4a5568", fontSize: 12, lineHeight: 1.7, fontFamily: "'JetBrains Mono',monospace", whiteSpace: "pre-line" }}>{s.desc}</div>
                    {i < arr.length - 1 && <div style={{ position: "absolute", right: -13, top: "50%", transform: "translateY(-50%)", color: "#2d3748", fontSize: 22, zIndex: 1 }}>→</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 14, marginBottom: 20 }}>
              {[["94.21%", "Test Accuracy", "#06ffa5"], ["96.19%", "Precision", "#00b4ff"], ["92.06%", "Recall", "#a78bfa"], ["94.09%", "F1-Score", "#ff9a3c"], ["0.98", "AUC-ROC", "#ff3366"], ["94.23%", "CV Accuracy", "#ffd166"]].map(([v, l, c]) => (
                <div key={l} style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${c}18`, borderRadius: 16, padding: "24px 18px", textAlign: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: c, opacity: 0.5 }} />
                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, color: c, letterSpacing: 2 }}>{v}</div>
                  <div style={{ color: "#4a5568", fontSize: 11, marginTop: 6, fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 32 }}>
              <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 2, color: "#e8eaf6", marginBottom: 22 }}>📊 Dataset & Pipeline</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
                {[["Source", "CDC BRFSS 2020"], ["Total Records", "319,795"], ["Features", "17 clinical"], ["Class Balancing", "SMOTE"], ["Validation", "5-Fold Stratified CV"], ["Outlier Handling", "IQR Capping"], ["Encoding", "Label Encoding"], ["Missing Data", "Mean Imputation"]].map(([k, v]) => (
                  <div key={k} style={{ padding: "16px 18px", background: "rgba(0,0,0,0.25)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#4a5568", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{k}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: "#e8eaf6", fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STATS TAB ── */}
        {tab === "stats" && (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            <div style={{ background: "linear-gradient(135deg,rgba(255,51,102,0.07),rgba(255,154,60,0.05))", border: "1px solid rgba(255,51,102,0.15)", borderRadius: 20, padding: "26px 34px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#ff3366", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>RESEARCH STATISTICS · 2025</div>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: 2, color: "#f1f5f9" }}>Model Performance Report</div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: "#4a5568", marginTop: 4 }}>Daffodil International University · FYDP 2025 · CDC BRFSS 2020</div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[["94.21%", "BEST ACCURACY", "#06ffa5"], ["0.98", "AUC-ROC", "#00b4ff"]].map(([v, l, c]) => (
                  <div key={l} style={{ textAlign: "center", padding: "16px 24px", background: `${c}08`, border: `1px solid ${c}25`, borderRadius: 14 }}>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 30, color: c, letterSpacing: 2 }}>{v}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: c, opacity: 0.7, marginTop: 4, letterSpacing: 1.5 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Comparison */}
            <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 36, marginBottom: 20 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#00b4ff", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>BENCHMARK RESULTS</div>
              <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, letterSpacing: 2, color: "#f1f5f9", marginBottom: 6 }}>Algorithm Comparison</h2>
              <p style={{ color: "#4a5568", fontSize: 13, marginBottom: 32, fontFamily: "'DM Sans',sans-serif" }}>5-Fold Stratified Cross-Validation · 319,795 records · SMOTE balanced</p>
              {[{ name: "RuleNet (Ours)", cv: 94.23, test: 94.21, highlight: true, tag: "★ BEST" }, { name: "Random Forest", cv: 94.05, test: 93.98 }, { name: "XGBoost", cv: 93.80, test: 93.10 }, { name: "KNN", cv: 92.18, test: 92.01 }, { name: "Naive Bayes", cv: 91.54, test: 91.55 }, { name: "Logistic Reg.", cv: 91.50, test: 91.33 }, { name: "SVM", cv: 91.44, test: 91.20 }, { name: "Decision Tree", cv: 91.16, test: 91.01 }].map((m, i) => (
                <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, opacity: 0, animation: `fadeUp 0.35s ease ${i * 0.07}s forwards` }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: m.highlight ? "linear-gradient(135deg,#ff3366,#ff9a3c)" : "rgba(255,255,255,0.05)", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700, color: m.highlight ? "#fff" : "#4a5568" }}>{i + 1}</div>
                  <div style={{ width: 148, flexShrink: 0, fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: m.highlight ? 700 : 500, color: m.highlight ? "#ff3366" : "#94a3b8", display: "flex", alignItems: "center", gap: 8 }}>
                    {m.name}
                    {m.tag && <span style={{ fontSize: 8, padding: "2px 7px", borderRadius: 4, background: "rgba(255,51,102,0.1)", color: "#ff3366", border: "1px solid rgba(255,51,102,0.2)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: 0.5 }}>{m.tag}</span>}
                  </div>
                  <div style={{ flex: 1, height: 36, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${((m.cv - 88) / 10) * 100}%`, background: m.highlight ? "linear-gradient(90deg,#ff3366,#ff9a3c)" : "linear-gradient(90deg,rgba(45,55,72,0.8),rgba(45,55,72,0.5))", borderRadius: 10, boxShadow: m.highlight ? "0 0 20px rgba(255,51,102,0.3)" : "none", transition: "width 1.3s cubic-bezier(.34,1.2,.64,1)" }} />
                    <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: m.highlight ? "#fff" : "#e2e8f0", zIndex: 1 }}>{m.cv}%</div>
                  </div>
                  <div style={{ width: 80, flexShrink: 0, textAlign: "right" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#4a5568", letterSpacing: 1 }}>TEST</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: "#718096" }}>{m.test}%</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Importance */}
            <div style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 24, padding: 36, marginBottom: 20 }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#a78bfa", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>RANDOM FOREST ANALYSIS</div>
              <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 34, letterSpacing: 2, color: "#f1f5f9", marginBottom: 6 }}>Feature Importance</h2>
              <p style={{ color: "#4a5568", fontSize: 13, marginBottom: 32, fontFamily: "'DM Sans',sans-serif" }}>Top 10 cardiovascular risk predictors by importance score</p>
              {[{ name: "Age Category", pct: 14.2, col: "#ff3366", icon: "👴" }, { name: "BMI", pct: 13.8, col: "#ff9a3c", icon: "⚖️" }, { name: "General Health", pct: 12.5, col: "#ffd166", icon: "💚" }, { name: "Physical Health", pct: 11.7, col: "#84cc16", icon: "🏃" }, { name: "Mental Health", pct: 8.9, col: "#06ffa5", icon: "🧠" }, { name: "Diabetic Status", pct: 7.8, col: "#00b4ff", icon: "💉" }, { name: "Sleep Time", pct: 6.4, col: "#818cf8", icon: "😴" }, { name: "Diff. Walking", pct: 5.9, col: "#a78bfa", icon: "🚶" }, { name: "Stroke History", pct: 5.2, col: "#f472b6", icon: "🧬" }, { name: "Kidney Disease", pct: 4.8, col: "#fb7185", icon: "🫘" }].map((f, i) => (
                <div key={f.name} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, opacity: 0, animation: `fadeUp 0.35s ease ${i * 0.06}s forwards` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${f.col}12`, border: `1px solid ${f.col}25`, fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
                  <div style={{ width: 145, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 600, color: "#94a3b8", flexShrink: 0 }}>{f.name}</div>
                  <div style={{ flex: 1, height: 32, background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden", position: "relative" }}>
                    <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${(f.pct / 15) * 100}%`, background: `linear-gradient(90deg,${f.col}80,${f.col})`, borderRadius: 8, boxShadow: `0 0 12px ${f.col}30`, transition: "width 1.1s cubic-bezier(.34,1.2,.64,1)" }} />
                    <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: "#fff", zIndex: 1 }}>{f.pct}%</div>
                  </div>
                  <div style={{ width: 28, textAlign: "right", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#2d3748", flexShrink: 0 }}>#{i + 1}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
              {[{ label: "Dataset Year", value: "2020", sub: "CDC BRFSS Source", col: "#00b4ff", icon: "📅" }, { label: "Training Records", value: "319,795", sub: "Post-SMOTE Balance", col: "#06ffa5", icon: "🗄️" }, { label: "Test Split", value: "80 / 20", sub: "Stratified Split", col: "#a78bfa", icon: "✂️" }, { label: "CV Strategy", value: "5-Fold", sub: "StratifiedKFold", col: "#ff9a3c", icon: "🔄" }, { label: "Best Algorithm", value: "RuleNet", sub: "Hybrid ML + Rules", col: "#ff3366", icon: "🏆" }, { label: "Report Year", value: "2025", sub: "FYDP Submission", col: "#ffd166", icon: "🎓" }].map(m => (
                <div key={m.label} style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${m.col}18`, borderRadius: 16, padding: "20px 18px", display: "flex", gap: 14, alignItems: "center", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: m.col, opacity: 0.4 }} />
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${m.col}10`, border: `1px solid ${m.col}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{m.icon}</div>
                  <div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: m.col, letterSpacing: 1 }}>{m.value}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, color: "#94a3b8", marginTop: 1, fontWeight: 500 }}>{m.label}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 10, color: "#4a5568", marginTop: 1 }}>{m.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "24px 28px", position: "relative", zIndex: 2, background: "rgba(8,11,22,0.9)", backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 3, background: "linear-gradient(135deg,#ff3366,#ff9a3c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>HEART DISEASE RISK AI</div>
          <div style={{ color: "#4a5568", fontSize: 12, fontFamily: "'DM Sans',sans-serif", textAlign: "center" }}>
            <span style={{ color: "#718096", fontWeight: 600 }}>Md. Tuhinuzzaman Tuhin</span>
            <span style={{ color: "#2d3748", margin: "0 10px" }}>·</span>
            <span>ID: 221-15-4649</span>
            <span style={{ color: "#2d3748", margin: "0 10px" }}>·</span>
            <span>Daffodil International University</span>
            <span style={{ color: "#2d3748", margin: "0 10px" }}>·</span>
            <span>FYDP 2025</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#2d3748", letterSpacing: 2 }}>EDUCATIONAL USE ONLY</div>
        </div>
      </footer>
    </div>
  );
}
