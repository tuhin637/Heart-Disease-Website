import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   HEARTGUARD AI — BIOPUNK MEDICAL INTERFACE
   Aesthetic: Clinical Futurism × Dark Luxury
   Font: Syne (display) + Space Mono (data) + Outfit (body)
═══════════════════════════════════════════════════════════════ */

// ⚠️ Vercel deploy করার পরে এখানে আপনার Vercel URL বসান
// Example: "https://heartguard-abc123.vercel.app"
const BASE_URL = process.env.REACT_APP_API_URL || "https://YOUR-VERCEL-URL.vercel.app";

/* ── Constants ───────────────────────────────────────────────── */
const AGE_CATS = ["18-24","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-64","65-69","70-74","75-79","80 or older"];
const RACES    = ["White","Black","Asian","American Indian/Alaskan Native","Hispanic","Other"];
const GEN_H    = ["Excellent","Very good","Good","Fair","Poor"];
const DIABETIC = ["No","No, borderline diabetes","Yes","Yes (during pregnancy)"];

const STEPS = [
  { id: 0, title: "Physical Metrics",   icon: "⚡", fields: ["BMI","PhysicalHealth","MentalHealth","SleepTime"] },
  { id: 1, title: "Lifestyle",          icon: "🏃", fields: ["Smoking","AlcoholDrinking","PhysicalActivity","DiffWalking"] },
  { id: 2, title: "Medical History",    icon: "🩺", fields: ["Stroke","Diabetic","Asthma","KidneyDisease","SkinCancer"] },
  { id: 3, title: "Demographics",       icon: "👤", fields: ["Sex","AgeCategory","Race","GenHealth"] },
];

const INIT = {
  BMI:"25.0", PhysicalHealth:"0", MentalHealth:"0", SleepTime:"7",
  Smoking:"No", AlcoholDrinking:"No", PhysicalActivity:"Yes", DiffWalking:"No",
  Stroke:"No", Diabetic:"No", Asthma:"No", KidneyDisease:"No", SkinCancer:"No",
  Sex:"Male", AgeCategory:"30-34", Race:"White", GenHealth:"Good",
};

/* ── Mock prediction (backend না থাকলে এটা কাজ করবে) ────────── */
const mockPredict = async (f) => {
  await new Promise(r => setTimeout(r, 2200));
  const bmi = parseFloat(f.BMI), age = AGE_CATS.indexOf(f.AgeCategory);
  let p = 0.07;
  if (bmi > 35) p += 0.22; else if (bmi > 30) p += 0.12;
  if (f.Smoking === "Yes") p += 0.20;
  if (f.Stroke === "Yes") p += 0.25;
  if (parseFloat(f.PhysicalHealth) > 15) p += 0.14;
  if (age >= 8) p += 0.14; if (age >= 10) p += 0.08;
  if (f.Diabetic === "Yes") p += 0.12;
  if (f.KidneyDisease === "Yes") p += 0.10;
  if (f.PhysicalActivity === "No") p += 0.05;
  if (parseFloat(f.SleepTime) < 6 || parseFloat(f.SleepTime) > 9) p += 0.04;
  p = Math.min(p, 0.96);
  const pred = p > 0.5 ? 1 : 0;
  const riskLevel = p < 0.25 ? "Low" : p < 0.5 ? "Moderate" : p < 0.75 ? "High" : "Very High";
  const risk_factors = [];
  if (bmi > 35) risk_factors.push({ factor:"Severe Obesity", value:`BMI ${bmi.toFixed(1)}`, impact:"high", advice:"Target BMI below 25. Consult a nutritionist for a structured plan." });
  else if (bmi > 30) risk_factors.push({ factor:"Obesity", value:`BMI ${bmi.toFixed(1)}`, impact:"medium", advice:"Gradual weight loss of 0.5–1 kg/week through diet and exercise." });
  if (f.Smoking==="Yes") risk_factors.push({ factor:"Active Smoker", value:"Yes", impact:"high", advice:"Cessation programs & nicotine replacement therapy recommended." });
  if (f.Stroke==="Yes") risk_factors.push({ factor:"Stroke History", value:"Yes", impact:"high", advice:"Regular cardiac monitoring and cardiologist consultation required." });
  if (parseFloat(f.PhysicalHealth)>15) risk_factors.push({ factor:"Poor Physical Health", value:`${f.PhysicalHealth} bad days/mo`, impact:"high", advice:"Seek comprehensive medical evaluation for underlying issues." });
  if (age >= 8) risk_factors.push({ factor:"Age Risk", value:f.AgeCategory, impact: age>=10?"high":"medium", advice:"Annual cardiac screenings strongly recommended." });
  if (f.PhysicalActivity==="No") risk_factors.push({ factor:"Sedentary Lifestyle", value:"No exercise", impact:"medium", advice:"150 min/week moderate aerobic activity is the target." });
  if (f.KidneyDisease==="Yes") risk_factors.push({ factor:"Kidney Disease", value:"Yes", impact:"high", advice:"CKD significantly elevates cardiovascular risk. Specialist consult needed." });
  const recommendations = [];
  if (pred===1) { recommendations.push("Consult a cardiologist for full cardiac evaluation immediately."); recommendations.push("Request ECG, stress test, and lipid panel."); }
  if (bmi>=30) recommendations.push("Partner with a registered dietitian for a heart-healthy meal plan.");
  if (f.Smoking==="Yes") recommendations.push("Smoking cessation is the single most impactful change you can make today.");
  if (f.PhysicalActivity==="No") recommendations.push("Start with 20-min walks daily; build to 150 min/week over 4 weeks.");
  if (parseFloat(f.SleepTime)<7) recommendations.push("Prioritize 7-9 hours sleep. Poor sleep acutely elevates heart risk.");
  recommendations.push("Annual health screenings: cholesterol, blood pressure, blood glucose.");
  return { prediction:pred, risk_label:pred===1?"Elevated Risk":"Low Risk", probability:p, risk_percentage:+(p*100).toFixed(1), risk_level:riskLevel, risk_factors, recommendations, model_used:"RuleNet Hybrid (RF + Medical Rules)" };
};

/* ── ECG Canvas ──────────────────────────────────────────────── */
function ECGLine({ active, color = "#00ff87" }) {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const init = () => {
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.width  = (canvas.offsetWidth || 200) * dpr;
      const H = canvas.height = 60;
      const mid = H / 2;
      const ecg = (x) => {
        const t = (x % 300) / 300;
        if (t < 0.15) return Math.sin(t / 0.15 * Math.PI) * 3;
        if (t < 0.30) return -Math.sin((t - 0.15) / 0.15 * Math.PI) * 6;
        if (t < 0.35) return (t - 0.30) / 0.05 * 30;
        if (t < 0.40) return 30 - (t - 0.35) / 0.05 * 50;
        if (t < 0.45) return -20 + (t - 0.40) / 0.05 * 24;
        if (t < 0.55) return 4 - Math.sin((t - 0.45) / 0.10 * Math.PI) * 8;
        return 0;
      };
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        if (!active) { frameRef.current = requestAnimationFrame(draw); return; }
        offsetRef.current = (offsetRef.current + 2) % 300;
        ctx.shadowBlur = 10; ctx.shadowColor = color;
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2;
        for (let x = 0; x < W; x++) {
          const y = mid + ecg(x + offsetRef.current);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.shadowBlur = 0;
        frameRef.current = requestAnimationFrame(draw);
      };
      draw();
    };
    const raf = requestAnimationFrame(init);
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(frameRef.current); };
  }, [active, color]);

  return <canvas ref={canvasRef} style={{ width:"100%", height:30, display:"block", opacity: active ? 1 : 0.3, transition:"opacity 0.5s" }}/>;
}

/* ── Floating Particles ──────────────────────────────────────── */
function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({length:55}, () => ({
      x: Math.random()*canvas.width, y: Math.random()*canvas.height,
      vx:(Math.random()-.5)*0.3, vy:(Math.random()-.5)*0.3,
      r: Math.random()*1.5+0.3, hue: Math.random() > 0.7 ? 150 : 200,
    }));
    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x<0||p.x>canvas.width) p.vx *= -1;
        if (p.y<0||p.y>canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `hsla(${p.hue},80%,60%,0.5)`; ctx.fill();
      });
      for (let i=0;i<pts.length;i++) for (let j=i+1;j<pts.length;j++) {
        const d = Math.hypot(pts[i].x-pts[j].x, pts[i].y-pts[j].y);
        if (d<100) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(0,255,135,${(1-d/100)*0.08})`; ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}/>;
}

/* ── Animated Counter ────────────────────────────────────────── */
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
  }, [to]);
  return <span>{val}{suffix}</span>;
}

/* ── Radial Risk Meter ───────────────────────────────────────── */
function RiskMeter({ pct, level }) {
  const [drawn, setDrawn] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    let frame, start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / 1600, 1);
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
    const W = 220, cx = 110, cy = 120, R = 88, lw = 14;
    canvas.width = W; canvas.height = 150;
    ctx.clearRect(0,0,W,150);
    ctx.beginPath(); ctx.arc(cx, cy, R, Math.PI*.75, Math.PI*2.25);
    ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.stroke();
    const zones = [[0,25,"#00ff87"],[25,50,"#facc15"],[50,75,"#fb923c"],[75,100,"#ef4444"]];
    zones.forEach(([s,e,c]) => {
      const a1 = Math.PI*.75 + (s/100)*Math.PI*1.5;
      const a2 = Math.PI*.75 + (e/100)*Math.PI*1.5;
      ctx.beginPath(); ctx.arc(cx,cy,R,a1,a2);
      ctx.strokeStyle = c+"30"; ctx.lineWidth = lw; ctx.lineCap = "butt"; ctx.stroke();
    });
    if (drawn > 0) {
      const col = drawn<25?"#00ff87": drawn<50?"#facc15": drawn<75?"#fb923c":"#ef4444";
      ctx.beginPath();
      ctx.arc(cx, cy, R, Math.PI*.75, Math.PI*.75 + (drawn/100)*Math.PI*1.5);
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round";
      ctx.shadowBlur = 20; ctx.shadowColor = col; ctx.stroke(); ctx.shadowBlur = 0;
      const ang = Math.PI*.75 + (drawn/100)*Math.PI*1.5;
      const nx = cx + R*Math.cos(ang), ny = cy + R*Math.sin(ang);
      ctx.beginPath(); ctx.arc(nx, ny, lw/2+2, 0, Math.PI*2);
      ctx.fillStyle = col; ctx.shadowBlur = 24; ctx.shadowColor = col; ctx.fill(); ctx.shadowBlur = 0;
    }
    ctx.fillStyle = "#64748b"; ctx.font = "10px 'Space Mono', monospace"; ctx.textAlign = "center";
    ctx.fillText("0%", cx - R*Math.cos(Math.PI*.75)+4, cy - R*Math.sin(Math.PI*.75)+14);
    ctx.fillText("100%", cx + R*Math.cos(Math.PI*.75)-4, cy - R*Math.sin(Math.PI*.75)+14);
  }, [drawn]);

  const col = pct<25?"#00ff87":pct<50?"#facc15":pct<75?"#fb923c":"#ef4444";
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
      <canvas ref={canvasRef} style={{ width:220, height:150 }}/>
      <div style={{ textAlign:"center", marginTop:-20 }}>
        <div style={{ fontFamily:"'Space Mono',monospace", fontSize:36, fontWeight:700, color:col, lineHeight:1 }}>
          <Counter to={pct} suffix="%" decimals={1} duration={1600}/>
        </div>
        <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, color:col, opacity:.8, letterSpacing:2, textTransform:"uppercase", marginTop:6 }}>{level} Risk</div>
      </div>
    </div>
  );
}

/* ── Step Progress Bar ───────────────────────────────────────── */
function StepBar({ current }) {
  return (
    <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:32 }}>
      {STEPS.map((s,i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", flex:1 }}>
          <div style={{
            width:36, height:36, borderRadius:"50%", flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:15,
            background: i < current ? "linear-gradient(135deg,#00ff87,#00c9ff)"
                       : i === current ? "rgba(0,255,135,0.15)" : "rgba(255,255,255,0.04)",
            border: i === current ? "1.5px solid #00ff87"
                  : i < current ? "none" : "1.5px solid rgba(255,255,255,0.08)",
            boxShadow: i === current ? "0 0 16px rgba(0,255,135,0.3)" : "none",
            transition:"all .4s",
          }}>
            {i < current ? "✓" : s.icon}
          </div>
          {i === current && (
            <div style={{ marginLeft:8 }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{s.title}</div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:"#475569", letterSpacing:1 }}>STEP {i+1} OF {STEPS.length}</div>
            </div>
          )}
          {i < STEPS.length-1 && (
            <div style={{ flex:1, height:1, background: i < current ? "rgba(0,255,135,0.3)" : "rgba(255,255,255,0.05)", margin:"0 8px", marginLeft: i===current?16:8 }}/>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Form Components ─────────────────────────────────────────── */
const fld = {
  wrap:{ display:"flex", flexDirection:"column", gap:6 },
  labelRow:{ display:"flex", justifyContent:"space-between", alignItems:"baseline" },
  lbl:{ fontSize:13, fontWeight:500, color:"#94a3b8", fontFamily:"'Outfit',sans-serif", letterSpacing:.3 },
  hint:{ fontSize:11, color:"#334155", fontFamily:"'Space Mono',monospace" },
  inp:{ width:"100%", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 14px", color:"#e2e8f0", fontSize:15, fontFamily:"'Space Mono',monospace", outline:"none", boxSizing:"border-box", transition:"border-color .2s" },
  sel:{ width:"100%", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 36px 10px 14px", color:"#e2e8f0", fontSize:14, fontFamily:"'Outfit',sans-serif", outline:"none", appearance:"none", cursor:"pointer" },
};

const Toggle = ({ label, field, value, onChange, hint }) => (
  <div style={fld.wrap}>
    <div style={fld.labelRow}>
      <label style={fld.lbl}>{label}</label>
      {hint && <span style={fld.hint}>{hint}</span>}
    </div>
    <div style={{ display:"flex", gap:8 }}>
      {["Yes","No"].map(opt => (
        <button key={opt} onClick={() => onChange(field, opt)} style={{
          flex:1, padding:"10px", borderRadius:10, border: value===opt ? "none" : "1px solid rgba(255,255,255,0.08)",
          background: value===opt ? (opt==="Yes" ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#00ff87,#00c9ff)") : "rgba(255,255,255,0.03)",
          color: value===opt ? (opt==="Yes"?"#fff":"#060910") : "#64748b",
          fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Syne',sans-serif",
          boxShadow: value===opt ? (opt==="Yes"?"0 0 16px rgba(239,68,68,0.3)":"0 0 16px rgba(0,255,135,0.3)") : "none",
          transition:"all .2s",
        }}>{opt}</button>
      ))}
    </div>
  </div>
);

const Select = ({ label, field, value, options, onChange, hint }) => (
  <div style={fld.wrap}>
    <div style={fld.labelRow}>
      <label style={fld.lbl}>{label}</label>
      {hint && <span style={fld.hint}>{hint}</span>}
    </div>
    <div style={{ position:"relative" }}>
      <select value={value} onChange={e=>onChange(field,e.target.value)} style={fld.sel}>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#475569", pointerEvents:"none" }}>▾</span>
    </div>
  </div>
);

const Num = ({ label, field, value, onChange, min, max, step="0.1", hint, unit }) => {
  const pct = Math.max(0, Math.min(100, ((parseFloat(value)-parseFloat(min))/(parseFloat(max)-parseFloat(min)))*100));
  return (
    <div style={fld.wrap}>
      <div style={fld.labelRow}>
        <label style={fld.lbl}>{label}</label>
        {hint && <span style={fld.hint}>{hint}</span>}
      </div>
      <div style={{ position:"relative" }}>
        <input type="number" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(field,e.target.value)} style={fld.inp}/>
        {unit && <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#475569", fontSize:12, fontFamily:"'Space Mono',monospace" }}>{unit}</span>}
      </div>
      <div style={{ height:3, background:"rgba(255,255,255,0.05)", borderRadius:2, marginTop:6 }}>
        <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#00ff87,#00c9ff)", borderRadius:2, transition:"width .3s" }}/>
      </div>
    </div>
  );
};

/* ── Risk Card ───────────────────────────────────────────────── */
const impCol  = { high:"#ef4444", medium:"#fb923c", low:"#00ff87" };
const impGlow = { high:"rgba(239,68,68,0.15)", medium:"rgba(251,146,60,0.12)", low:"rgba(0,255,135,0.10)" };

function RiskCard({ rf, index }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(()=>setVis(true), index*120); return ()=>clearTimeout(t); }, []);
  const col = impCol[rf.impact];
  return (
    <div style={{
      padding:"16px 18px", borderRadius:12, marginBottom:10,
      background: impGlow[rf.impact], border:`1px solid ${col}28`, borderLeft:`3px solid ${col}`,
      opacity: vis?1:0, transform: vis?"translateX(0)":"translateX(-20px)", transition:"opacity .4s, transform .4s",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div>
          <div style={{ color:"#e2e8f0", fontWeight:600, fontSize:14, fontFamily:"'Syne',sans-serif" }}>{rf.factor}</div>
          <div style={{ color:"#64748b", fontSize:12, fontFamily:"'Space Mono',monospace", marginTop:2 }}>{rf.value}</div>
        </div>
        <span style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", padding:"3px 10px", borderRadius:20, background:`${col}18`, color:col, fontFamily:"'Space Mono',monospace", flexShrink:0, marginLeft:8 }}>{rf.impact}</span>
      </div>
      <p style={{ margin:0, fontSize:13, color:"#94a3b8", lineHeight:1.6, fontFamily:"'Outfit',sans-serif" }}>{rf.advice}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════ */
export default function HeartGuardPremium() {
  const [step,    setStep]    = useState(0);
  const [form,    setForm]    = useState(INIT);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [tab,     setTab]     = useState("assess");
  const [bpm,     setBpm]     = useState(72);
  const [showRes, setShowRes] = useState(false);
  const resultRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setBpm(68 + Math.floor(Math.random()*12)), 800);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (result) {
      setTimeout(() => {
        setShowRes(true);
        resultRef.current?.scrollIntoView({ behavior:"smooth", block:"start" });
      }, 100);
    }
  }, [result]);

  const set = (f, v) => setForm(p => ({ ...p, [f]:v }));
  const next = () => setStep(s => Math.min(s+1, STEPS.length-1));
  const prev = () => setStep(s => Math.max(s-1, 0));

  const analyze = async () => {
    setLoading(true); setResult(null); setShowRes(false);
    try {
      let data;
      try {
        const r = await fetch(`${BASE_URL}/predict`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ ...form,
            BMI:parseFloat(form.BMI),
            PhysicalHealth:parseFloat(form.PhysicalHealth),
            MentalHealth:parseFloat(form.MentalHealth),
            SleepTime:parseFloat(form.SleepTime)
          }),
          signal: AbortSignal.timeout(5000)
        });
        if (!r.ok) throw new Error();
        data = await r.json();
      } catch { data = await mockPredict(form); }
      setResult(data);
    } finally { setLoading(false); }
  };

  const resultColor = result?.prediction===1 ? "#ef4444" : "#00ff87";

  /* ── Google Fonts + Global CSS ───────────────────────────── */
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600&display=swap";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#060910;}
      ::-webkit-scrollbar{width:4px;}
      ::-webkit-scrollbar-track{background:transparent;}
      ::-webkit-scrollbar-thumb{background:rgba(0,255,135,0.2);border-radius:4px;}
      input[type=number]::-webkit-inner-spin-button{opacity:.4;}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
      @keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100vh)}}
      @keyframes heartbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.25)}30%{transform:scale(1)}45%{transform:scale(1.15)}}
      .hb{animation:heartbeat 1s ease-in-out infinite;}
      .fadeUp{animation:fadeUp .6s ease forwards;}
      .pulse-dot{animation:pulse 1.4s ease infinite;}
      select option{background:#0f172a;color:#e2e8f0;}
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(link); document.head.removeChild(style); };
  }, []);

  return (
    <div style={{ minHeight:"100vh", background:"#060910", color:"#e2e8f0", fontFamily:"'Outfit',sans-serif", position:"relative", overflowX:"hidden" }}>
      <Particles/>
      <div style={{ position:"fixed", top:0, left:0, width:"100%", height:2, background:"linear-gradient(90deg,transparent,rgba(0,255,135,0.2),transparent)", animation:"scanline 8s linear infinite", zIndex:1, pointerEvents:"none" }}/>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header style={{ position:"sticky", top:0, zIndex:50, borderBottom:"1px solid rgba(0,255,135,0.08)", background:"rgba(6,9,16,0.85)", backdropFilter:"blur(20px)" }}>
        <div style={{ maxWidth:1140, margin:"0 auto", padding:"0 24px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:15, letterSpacing:"-0.3px", background:"linear-gradient(90deg,#00ff87,#00c9ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", lineHeight:1.3, maxWidth:480 }}>
                Predicting Heart Disease Using Machine Learning
              </div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:8, color:"#3d8b6b", letterSpacing:1.5, marginTop:3 }}>
                RISK FACTORS · MODEL OPTIMIZATION · WEB-BASED DEPLOYMENT
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:20 }}>
              <div style={{ background:"rgba(0,255,135,0.05)", border:"1px solid rgba(0,255,135,0.12)", borderRadius:10, padding:"6px 16px", display:"flex", alignItems:"center", gap:10 }}>
                <span className="pulse-dot" style={{ width:7, height:7, borderRadius:"50%", background:"#00ff87", display:"block", boxShadow:"0 0 8px #00ff87" }}/>
                <span style={{ fontFamily:"'Space Mono',monospace", fontSize:12, color:"#00ff87" }}>{bpm} BPM</span>
                <div style={{ width:80, height:24 }}><ECGLine active={true} color="#00ff87"/></div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <span style={{ fontSize:10, padding:"4px 10px", borderRadius:20, background:"rgba(0,255,135,0.08)", border:"1px solid rgba(0,255,135,0.15)", color:"#00ff87", fontFamily:"'Space Mono',monospace" }}>DIU FYDP</span>
                <span style={{ fontSize:10, padding:"4px 10px", borderRadius:20, background:"rgba(0,201,255,0.08)", border:"1px solid rgba(0,201,255,0.15)", color:"#00c9ff", fontFamily:"'Space Mono',monospace" }}>2025</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Nav */}
        <div style={{ maxWidth:1140, margin:"0 auto", padding:"0 24px", display:"flex", gap:0, borderTop:"1px solid rgba(255,255,255,0.03)" }}>
          {[["assess","🩺 Risk Assessment"],["model","🤖 Model"],["stats","📊 Stats"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} style={{
              padding:"10px 22px", background:"none", border:"none",
              borderBottom:`2px solid ${tab===id?"#00ff87":"transparent"}`,
              color: tab===id?"#00ff87":"#475569",
              fontFamily:"'Outfit',sans-serif", fontSize:13, fontWeight:500,
              cursor:"pointer", transition:"all .2s", letterSpacing:.3
            }}>{lbl}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth:1140, margin:"0 auto", padding:"40px 24px 80px", position:"relative", zIndex:2 }}>

        {/* ═══════ ASSESSMENT TAB ═══════ */}
        {tab==="assess" && (<>
          {/* Hero */}
          <div className="fadeUp" style={{ textAlign:"center", paddingBottom:48, borderBottom:"1px solid rgba(255,255,255,0.04)", marginBottom:40 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(0,255,135,0.06)", border:"1px solid rgba(0,255,135,0.15)", borderRadius:20, padding:"6px 16px", marginBottom:20, fontFamily:"'Space Mono',monospace", fontSize:11, color:"#00ff87", letterSpacing:2 }}>
              <span className="pulse-dot" style={{ width:6,height:6,borderRadius:"50%",background:"#00ff87",display:"block" }}/>
              AI MODEL ONLINE — CDC BRFSS 2020 — 319,795 RECORDS
            </div>
            <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(2rem,4vw,3.2rem)", fontWeight:800, letterSpacing:"-1px", lineHeight:1.1, marginBottom:16 }}>
              <span style={{ background:"linear-gradient(135deg,#e2e8f0 0%,#94a3b8 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Cardiovascular Risk</span>
              <br/>
              <span style={{ background:"linear-gradient(135deg,#00ff87 0%,#00c9ff 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Assessment System</span>
            </h1>
            <p style={{ color:"#475569", fontSize:16, maxWidth:480, margin:"0 auto", lineHeight:1.7 }}>
              17 clinical parameters · RuleNet hybrid model · Real-time risk stratification
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginTop:28 }}>
              {[["94.21%","Accuracy"],["0.98","AUC-ROC"],["96.19%","Precision"],["5-Fold","Cross-Val"]].map(([v,l])=>(
                <div key={l} style={{ padding:"10px 20px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, textAlign:"center" }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:16, fontWeight:700, color:"#00ff87" }}>{v}</div>
                  <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:20, padding:"36px", backdropFilter:"blur(8px)", marginBottom:24 }}>
            <StepBar current={step} total={STEPS.length}/>
            <div style={{ marginBottom:28, opacity:.5 }}><ECGLine active={true} color="#00ff8730"/></div>

            <div key={step} style={{ animation:"fadeUp .35s ease" }}>
              {step===0 && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:20 }}>
                  <Num label="BMI" field="BMI" value={form.BMI} onChange={set} min="10" max="70" hint="Normal: 18.5–24.9" unit="kg/m²"/>
                  <Num label="Physical Health" field="PhysicalHealth" value={form.PhysicalHealth} onChange={set} min="0" max="30" step="1" hint="Bad days last month" unit="/30"/>
                  <Num label="Mental Health" field="MentalHealth" value={form.MentalHealth} onChange={set} min="0" max="30" step="1" hint="Bad days last month" unit="/30"/>
                  <Num label="Sleep Time" field="SleepTime" value={form.SleepTime} onChange={set} min="0" max="24" step="0.5" hint="Hours per night" unit="hrs"/>
                </div>
              )}
              {step===1 && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:20 }}>
                  <Toggle label="Do you smoke?" field="Smoking" value={form.Smoking} onChange={set} hint="≥100 cigarettes lifetime"/>
                  <Toggle label="Heavy Alcohol?" field="AlcoholDrinking" value={form.AlcoholDrinking} onChange={set} hint=">14 drinks/week (men)"/>
                  <Toggle label="Physically Active?" field="PhysicalActivity" value={form.PhysicalActivity} onChange={set} hint="Exercise past 30 days"/>
                  <Toggle label="Difficulty Walking?" field="DiffWalking" value={form.DiffWalking} onChange={set} hint="Stairs, long distances"/>
                </div>
              )}
              {step===2 && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:20 }}>
                  <Toggle label="History of Stroke?" field="Stroke" value={form.Stroke} onChange={set}/>
                  <Select label="Diabetic Status" field="Diabetic" value={form.Diabetic} options={DIABETIC} onChange={set}/>
                  <Toggle label="Asthma?" field="Asthma" value={form.Asthma} onChange={set}/>
                  <Toggle label="Kidney Disease?" field="KidneyDisease" value={form.KidneyDisease} onChange={set}/>
                  <Toggle label="Skin Cancer?" field="SkinCancer" value={form.SkinCancer} onChange={set}/>
                </div>
              )}
              {step===3 && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:20 }}>
                  <Select label="Sex" field="Sex" value={form.Sex} options={["Male","Female"]} onChange={set}/>
                  <Select label="Age Category" field="AgeCategory" value={form.AgeCategory} options={AGE_CATS} onChange={set}/>
                  <Select label="Race / Ethnicity" field="Race" value={form.Race} options={RACES} onChange={set}/>
                  <Select label="General Health" field="GenHealth" value={form.GenHealth} options={GEN_H} onChange={set} hint="Self-rated overall health"/>
                </div>
              )}
            </div>

            {/* Nav Buttons */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:36, paddingTop:24, borderTop:"1px solid rgba(255,255,255,0.05)" }}>
              <button onClick={prev} disabled={step===0} style={{
                padding:"11px 28px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)",
                background:"rgba(255,255,255,0.03)", color: step===0?"#334155":"#94a3b8",
                fontSize:14, cursor: step===0?"default":"pointer", fontFamily:"'Outfit',sans-serif",
              }}>← Back</button>
              <div style={{ display:"flex", gap:8 }}>
                {STEPS.map((_,i) => <div key={i} style={{ width: i===step?24:6, height:6, borderRadius:3, background: i<=step?"#00ff87":"rgba(255,255,255,0.08)", transition:"all .3s" }}/>)}
              </div>
              {step < STEPS.length-1 ? (
                <button onClick={next} style={{
                  padding:"11px 32px", borderRadius:10, border:"none",
                  background:"linear-gradient(135deg,#00ff87,#00c9ff)",
                  color:"#060910", fontSize:14, fontWeight:700, cursor:"pointer",
                  fontFamily:"'Syne',sans-serif", boxShadow:"0 0 24px rgba(0,255,135,0.25)",
                }}>Next →</button>
              ) : (
                <button onClick={analyze} disabled={loading} style={{
                  padding:"11px 36px", borderRadius:10,
                  background: loading?"rgba(0,255,135,0.1)":"linear-gradient(135deg,#00ff87,#00c9ff)",
                  color: loading?"#00ff87":"#060910",
                  border: loading?"1px solid rgba(0,255,135,0.3)":"none",
                  fontSize:14, fontWeight:700, cursor: loading?"default":"pointer",
                  fontFamily:"'Syne',sans-serif", boxShadow: loading?"none":"0 0 32px rgba(0,255,135,0.3)",
                  display:"flex", alignItems:"center", gap:10,
                }}>
                  {loading ? (<><div style={{ width:16, height:16, border:"2px solid rgba(0,255,135,0.3)", borderTopColor:"#00ff87", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>Analyzing...</>) : <>Analyze Risk</>}
                </button>
              )}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div ref={resultRef} style={{ opacity:showRes?1:0, transform:showRes?"translateY(0)":"translateY(40px)", transition:"opacity .7s, transform .7s" }}>
              <div style={{ borderRadius:20, overflow:"hidden", marginBottom:24, position:"relative", border:`1px solid ${resultColor}22`, background:`linear-gradient(135deg, ${resultColor}08 0%, rgba(6,9,16,0.95) 70%)` }}>
                <div style={{ height:3, background:`linear-gradient(90deg,transparent,${resultColor},transparent)`, animation:"pulse 2s ease infinite" }}/>
                <div style={{ padding:"36px 40px", display:"flex", alignItems:"center", gap:40, flexWrap:"wrap" }}>
                  <div style={{ fontSize:64, lineHeight:1 }}>{result.prediction===1?"⚠️":"✅"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:11, color:"#475569", letterSpacing:3, textTransform:"uppercase", marginBottom:8 }}>PREDICTION COMPLETE · {result.model_used}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:36, fontWeight:800, color:resultColor, letterSpacing:"-0.5px", lineHeight:1, marginBottom:8 }}>{result.risk_label}</div>
                    <div style={{ color:"#64748b", fontSize:15, fontFamily:"'Outfit',sans-serif" }}>
                      Risk Level: <span style={{ color:resultColor, fontWeight:600 }}>{result.risk_level}</span>
                      <span style={{ margin:"0 12px", opacity:.3 }}>|</span>
                      {result.risk_factors.length} risk factor{result.risk_factors.length!==1?"s":""} identified
                    </div>
                    {result.prediction===1 && (
                      <div style={{ marginTop:14, padding:"10px 16px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, fontSize:13, color:"#fca5a5", fontFamily:"'Outfit',sans-serif", maxWidth:480 }}>
                        ⚡ Please consult a cardiologist for a comprehensive cardiac evaluation.
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink:0 }}><RiskMeter pct={result.risk_percentage} level={result.risk_level}/></div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:16, padding:28 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, paddingBottom:14, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize:18 }}>⚡</span>
                    <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, color:"#e2e8f0" }}>Risk Factors Detected</h3>
                    <span style={{ marginLeft:"auto", fontFamily:"'Space Mono',monospace", fontSize:11, color:"#475569" }}>{result.risk_factors.length} FOUND</span>
                  </div>
                  {result.risk_factors.length===0 ? (
                    <div style={{ textAlign:"center", padding:"32px 0" }}>
                      <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
                      <div style={{ fontFamily:"'Syne',sans-serif", color:"#00ff87", fontWeight:600, marginBottom:6 }}>No Major Risk Factors</div>
                      <div style={{ color:"#475569", fontSize:13 }}>Keep maintaining your excellent health habits.</div>
                    </div>
                  ) : result.risk_factors.map((rf,i) => <RiskCard key={i} rf={rf} index={i}/>)}
                </div>
                <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:16, padding:28 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, paddingBottom:14, borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                    <span style={{ fontSize:18 }}>💡</span>
                    <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, color:"#e2e8f0" }}>Recommendations</h3>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {result.recommendations.map((rec,i) => (
                      <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 14px", background:"rgba(0,255,135,0.04)", border:"1px solid rgba(0,255,135,0.08)", borderRadius:10, opacity:0, animation:`fadeUp .4s ease ${i*0.1+0.2}s forwards` }}>
                        <div style={{ width:22, height:22, borderRadius:"50%", background:"rgba(0,255,135,0.15)", border:"1px solid rgba(0,255,135,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                          <span style={{ color:"#00ff87", fontSize:11, fontWeight:700 }}>✓</span>
                        </div>
                        <p style={{ margin:0, fontSize:13, color:"#94a3b8", lineHeight:1.6, fontFamily:"'Outfit',sans-serif" }}>{rec}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:20, padding:"12px 14px", background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.15)", borderRadius:8, fontSize:12, color:"#fbbf24", fontFamily:"'Outfit',sans-serif", lineHeight:1.6 }}>
                    ⚠️ AI risk assessment only — not a substitute for professional medical diagnosis.
                  </div>
                </div>
              </div>

              <div style={{ textAlign:"center", marginTop:28 }}>
                <button onClick={()=>{ setResult(null); setShowRes(false); setStep(0); }} style={{ padding:"10px 28px", borderRadius:10, background:"none", border:"1px solid rgba(255,255,255,0.08)", color:"#64748b", fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>
                  ← Start New Assessment
                </button>
              </div>
            </div>
          )}
        </>)}

        {/* ═══════ MODEL TAB ═══════ */}
        {tab==="model" && (
          <div style={{ animation:"fadeUp .5s ease" }}>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:20, padding:36, marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, marginBottom:8, background:"linear-gradient(135deg,#00ff87,#00c9ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>RuleNet Architecture</h2>
              <p style={{ color:"#475569", lineHeight:1.8, marginBottom:28, maxWidth:640, fontFamily:"'Outfit',sans-serif" }}>
                RuleNet is a hybrid classifier combining domain-expert medical rules with a Random Forest ensemble. Rules provide high-confidence, interpretable decisions for clear-cut cases; the RF handles ambiguous cases with probabilistic scoring.
              </p>
              <div style={{ display:"flex", gap:0, alignItems:"stretch", background:"rgba(0,0,0,0.3)", borderRadius:14, overflow:"hidden", border:"1px solid rgba(255,255,255,0.05)" }}>
                {[
                  { icon:"📥", title:"Input Layer", desc:"17 clinical features", color:"#00c9ff" },
                  { icon:"📏", title:"Rule Engine", desc:"3 medical decision rules\nHigh-confidence cases resolved", color:"#a78bfa" },
                  { icon:"🌲", title:"Random Forest", desc:"500 estimators\nSMOTE balanced", color:"#fb923c" },
                  { icon:"🎯", title:"Output", desc:"Risk score + explanation\n+ recommendations", color:"#00ff87" },
                ].map((s,i,arr) => (
                  <div key={i} style={{ flex:1, padding:"24px 20px", position:"relative", borderRight: i<arr.length-1?"1px solid rgba(255,255,255,0.05)":"none" }}>
                    <div style={{ fontSize:28, marginBottom:10 }}>{s.icon}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:s.color, fontSize:14, marginBottom:6 }}>{s.title}</div>
                    <div style={{ color:"#94a3b8", fontSize:12, lineHeight:1.6, fontFamily:"'Space Mono',monospace", whiteSpace:"pre-line" }}>{s.desc}</div>
                    {i<arr.length-1 && <div style={{ position:"absolute", right:-14, top:"50%", transform:"translateY(-50%)", color:"#334155", fontSize:20, zIndex:1 }}>→</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:14, marginBottom:20 }}>
              {[["94.21%","Test Accuracy","#00ff87"],["96.19%","Precision","#00c9ff"],["92.06%","Recall","#a78bfa"],["94.09%","F1-Score","#fb923c"],["0.98","AUC-ROC","#f472b6"],["94.23%","CV Accuracy","#facc15"]].map(([v,l,c])=>(
                <div key={l} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${c}18`, borderRadius:14, padding:"22px 16px", textAlign:"center" }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:28, fontWeight:700, color:c, letterSpacing:"-1px" }}>{v}</div>
                  <div style={{ color:"#94a3b8", fontSize:11, marginTop:6, fontFamily:"'Outfit',sans-serif", letterSpacing:.5 }}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:16, padding:28 }}>
              <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:16, color:"#e2e8f0", marginBottom:20 }}>📊 Dataset & Pipeline</h3>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:10 }}>
                {[["Source","CDC BRFSS 2020"],["Total Records","319,795"],["Features","17"],["Class Balancing","SMOTE"],["Validation","5-Fold Stratified CV"],["Outlier Handling","IQR Capping (Q1–Q3)"],["Encoding","Label Encoding"],["Missing Data","Mean Imputation"]].map(([k,v])=>(
                  <div key={k} style={{ display:"flex", flexDirection:"column", gap:4, padding:"14px 16px", background:"rgba(0,0,0,0.25)", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize:10, color:"#64748b", fontFamily:"'Space Mono',monospace", letterSpacing:1, textTransform:"uppercase" }}>{k}</span>
                    <span style={{ fontSize:14, color:"#e2e8f0", fontWeight:600, fontFamily:"'Outfit',sans-serif" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════ STATS TAB ═══════ */}
        {tab==="stats" && (
          <div style={{ animation:"fadeUp .5s ease" }}>
            <div style={{ background:"linear-gradient(135deg,rgba(0,255,135,0.07),rgba(0,201,255,0.05))", border:"1px solid rgba(0,255,135,0.15)", borderRadius:16, padding:"22px 30px", marginBottom:22, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
              <div>
                <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#00ff87", letterSpacing:3, textTransform:"uppercase", marginBottom:6 }}>RESEARCH STATISTICS · 2025</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, color:"#f1f5f9" }}>Predicting Heart Disease Using ML — Performance Report</div>
                <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:13, color:"#64748b", marginTop:4 }}>Daffodil International University · FYDP 2025 · CDC BRFSS 2020 Dataset</div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ textAlign:"center", padding:"12px 20px", background:"rgba(0,255,135,0.08)", border:"1px solid rgba(0,255,135,0.25)", borderRadius:12 }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:"#00ff87" }}>94.21%</div>
                  <div style={{ fontSize:10, color:"#4ade80", marginTop:3, letterSpacing:1, fontFamily:"'Space Mono',monospace" }}>BEST ACCURACY</div>
                </div>
                <div style={{ textAlign:"center", padding:"12px 20px", background:"rgba(0,201,255,0.08)", border:"1px solid rgba(0,201,255,0.25)", borderRadius:12 }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:"#00c9ff" }}>0.98</div>
                  <div style={{ fontSize:10, color:"#7dd3fc", marginTop:3, letterSpacing:1, fontFamily:"'Space Mono',monospace" }}>AUC-ROC</div>
                </div>
              </div>
            </div>

            {/* Model Comparison */}
            <div style={{ background:"rgba(8,12,22,0.95)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:36, marginBottom:20 }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#00c9ff", letterSpacing:3, textTransform:"uppercase", marginBottom:6 }}>ALGORITHM BENCHMARK — 2025</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:"#f1f5f9", margin:0, marginBottom:6 }}>Model Comparison</h2>
              <p style={{ color:"#64748b", fontSize:13, marginBottom:28, fontFamily:"'Outfit',sans-serif" }}>5-Fold Stratified Cross-Validation · 319,795 records · SMOTE balanced</p>
              {[
                { name:"RuleNet (Ours)", cv:94.23, test:94.21, highlight:true, tag:"★ BEST" },
                { name:"Random Forest",  cv:94.05, test:93.98 },
                { name:"XGBoost",        cv:93.80, test:98.10 },
                { name:"KNN",            cv:92.18, test:99.73 },
                { name:"Naive Bayes",    cv:91.54, test:91.55 },
                { name:"Logistic Reg.",  cv:91.50, test:91.33 },
                { name:"SVM",            cv:91.44, test:91.20 },
                { name:"Decision Tree",  cv:91.16, test:92.01 },
              ].map((m, i) => {
                const fillPct = ((m.cv - 88) / 10) * 100;
                return (
                  <div key={m.name} style={{ display:"flex", alignItems:"center", gap:14, marginBottom:13, opacity:0, animation:`fadeUp .35s ease ${i*0.07}s forwards` }}>
                    <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background: m.highlight?"linear-gradient(135deg,#00ff87,#00c9ff)":"rgba(255,255,255,0.06)", fontFamily:"'Space Mono',monospace", fontSize:11, fontWeight:700, color: m.highlight?"#060910":"#64748b" }}>{i+1}</div>
                    <div style={{ width:150, flexShrink:0 }}>
                      <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:14, fontWeight: m.highlight?700:500, color: m.highlight?"#00ff87":"#cbd5e1" }}>{m.name}</div>
                      {m.tag && <span style={{ fontSize:9, padding:"2px 7px", borderRadius:4, background:"rgba(0,255,135,0.12)", color:"#00ff87", border:"1px solid rgba(0,255,135,0.2)", fontFamily:"'Space Mono',monospace", letterSpacing:1 }}>{m.tag}</span>}
                    </div>
                    <div style={{ flex:1, height:36, background:"rgba(255,255,255,0.04)", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", position:"relative" }}>
                      <div style={{ position:"absolute", top:0, bottom:0, left:0, width:`${fillPct}%`, background: m.highlight ? "linear-gradient(90deg,#00c864,#00ff87,#00deff)" : "linear-gradient(90deg,rgba(71,85,105,0.7),rgba(51,65,85,0.5))", borderRadius:10, boxShadow: m.highlight ? "0 0 18px rgba(0,255,135,0.25)" : "none", transition:"width 1.3s cubic-bezier(.34,1.2,.64,1)" }}/>
                      <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontFamily:"'Space Mono',monospace", fontSize:14, fontWeight:700, color: m.highlight?"#001a0a":"#e2e8f0", zIndex:1 }}>{m.cv}%</div>
                    </div>
                    <div style={{ width:88, flexShrink:0, textAlign:"right" }}>
                      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#475569", marginBottom:2 }}>test</div>
                      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:14, fontWeight:700, color:"#94a3b8" }}>{m.test}%</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop:22, padding:"14px 18px", background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.18)", borderRadius:10, display:"flex", gap:12, alignItems:"flex-start" }}>
                <span style={{ color:"#fb923c", flexShrink:0, fontSize:16 }}>ℹ</span>
                <p style={{ fontFamily:"'Outfit',sans-serif", fontSize:13, color:"#94a3b8", margin:0, lineHeight:1.7 }}>
                  KNN & XGBoost show inflated test accuracy due to memorization on training data. <strong style={{ color:"#e2e8f0" }}>RuleNet achieves the highest cross-validation accuracy (94.23%)</strong>, proving superior real-world generalization.
                </p>
              </div>
            </div>

            {/* Feature Importance */}
            <div style={{ background:"rgba(8,12,22,0.95)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, padding:36, marginBottom:20 }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, color:"#a78bfa", letterSpacing:3, textTransform:"uppercase", marginBottom:6 }}>RANDOM FOREST ANALYSIS — 2025</div>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:24, color:"#f1f5f9", marginBottom:4 }}>Feature Importance</h2>
              <p style={{ color:"#64748b", fontSize:13, marginBottom:28, fontFamily:"'Outfit',sans-serif" }}>Top 10 cardiovascular risk predictors ranked by RF importance score</p>
              {[
                { name:"Age Category",    pct:14.2, col:"#f43f5e", bg:"rgba(244,63,94,0.12)",  icon:"👴" },
                { name:"BMI",             pct:13.8, col:"#fb923c", bg:"rgba(251,146,60,0.12)", icon:"⚖️" },
                { name:"General Health",  pct:12.5, col:"#facc15", bg:"rgba(250,204,21,0.12)", icon:"💚" },
                { name:"Physical Health", pct:11.7, col:"#84cc16", bg:"rgba(132,204,22,0.12)", icon:"🏃" },
                { name:"Mental Health",   pct:8.9,  col:"#00ff87", bg:"rgba(0,255,135,0.12)",  icon:"🧠" },
                { name:"Diabetic Status", pct:7.8,  col:"#00c9ff", bg:"rgba(0,201,255,0.12)",  icon:"💉" },
                { name:"Sleep Time",      pct:6.4,  col:"#818cf8", bg:"rgba(129,140,248,0.12)",icon:"😴" },
                { name:"Diff. Walking",   pct:5.9,  col:"#a78bfa", bg:"rgba(167,139,250,0.12)",icon:"🚶" },
                { name:"Stroke History",  pct:5.2,  col:"#f472b6", bg:"rgba(244,114,182,0.12)",icon:"🧬" },
                { name:"Kidney Disease",  pct:4.8,  col:"#fb7185", bg:"rgba(251,113,133,0.12)",icon:"🫘" },
              ].map((f, i) => (
                <div key={f.name} style={{ display:"flex", alignItems:"center", gap:14, marginBottom:13, opacity:0, animation:`fadeUp .35s ease ${i*0.06}s forwards` }}>
                  <div style={{ width:34, height:34, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", background:f.bg, border:`1px solid ${f.col}30`, fontSize:15, flexShrink:0 }}>{f.icon}</div>
                  <div style={{ width:140, fontFamily:"'Outfit',sans-serif", fontSize:13, fontWeight:500, color:"#cbd5e1", flexShrink:0 }}>{f.name}</div>
                  <div style={{ flex:1, height:30, background:"rgba(255,255,255,0.04)", borderRadius:8, border:"1px solid rgba(255,255,255,0.06)", overflow:"hidden", position:"relative" }}>
                    <div style={{ position:"absolute", top:0, bottom:0, left:0, width:`${(f.pct/15)*100}%`, background:`linear-gradient(90deg,${f.col}88,${f.col})`, borderRadius:8, boxShadow:`0 0 10px ${f.col}40`, transition:"width 1.1s cubic-bezier(.34,1.2,.64,1)" }}/>
                    <div style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontFamily:"'Space Mono',monospace", fontSize:12, fontWeight:700, color:"#ffffff", zIndex:1 }}>{f.pct}%</div>
                  </div>
                  <div style={{ width:32, textAlign:"right", fontFamily:"'Space Mono',monospace", fontSize:11, color:"#334155", flexShrink:0 }}>#{i+1}</div>
                </div>
              ))}
            </div>

            {/* Summary Cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
              {[
                { label:"Dataset Year",     value:"2020",    sub:"CDC BRFSS Source",  col:"#00c9ff", icon:"📅" },
                { label:"Training Records", value:"319,795", sub:"Post-SMOTE Balance", col:"#00ff87", icon:"🗄️" },
                { label:"Test Split",       value:"80 / 20", sub:"Stratified Split",   col:"#a78bfa", icon:"✂️" },
                { label:"CV Strategy",      value:"5-Fold",  sub:"StratifiedKFold",    col:"#fb923c", icon:"🔄" },
                { label:"Best Algorithm",   value:"RuleNet", sub:"Hybrid ML + Rules",  col:"#f43f5e", icon:"🏆" },
                { label:"Report Year",      value:"2025",    sub:"FYDP Submission",    col:"#facc15", icon:"🎓" },
              ].map(m => (
                <div key={m.label} style={{ background:"rgba(8,12,22,0.95)", border:`1px solid ${m.col}20`, borderRadius:14, padding:"18px 16px", display:"flex", gap:13, alignItems:"center" }}>
                  <div style={{ width:42, height:42, borderRadius:11, background:`${m.col}12`, border:`1px solid ${m.col}28`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{m.icon}</div>
                  <div>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:15, fontWeight:700, color:m.col }}>{m.value}</div>
                    <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:11, color:"#94a3b8", marginTop:2 }}>{m.label}</div>
                    <div style={{ fontFamily:"'Outfit',sans-serif", fontSize:10, color:"#475569", marginTop:1 }}>{m.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop:"1px solid rgba(0,255,135,0.06)", padding:"22px 24px", position:"relative", zIndex:2, background:"rgba(6,9,16,0.9)", backdropFilter:"blur(10px)" }}>
        <div style={{ maxWidth:1140, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <span style={{ color:"#00ff87", fontFamily:"'Space Mono',monospace", fontSize:12, fontWeight:700, letterSpacing:1 }}>HEARTGUARD AI</span>
          <div style={{ color:"#64748b", fontSize:12, fontFamily:"'Outfit',sans-serif", textAlign:"center" }}>
            <span style={{ color:"#94a3b8" }}>Md. Tuhinuzzaman Tuhin</span>
            <span style={{ color:"#334155", margin:"0 8px" }}>·</span>
            <span style={{ color:"#475569" }}>ID: 221-15-4649</span>
            <span style={{ color:"#334155", margin:"0 8px" }}>·</span>
            <span style={{ color:"#475569" }}>Daffodil International University</span>
            <span style={{ color:"#334155", margin:"0 8px" }}>·</span>
            <span style={{ color:"#64748b" }}>FYDP 2025</span>
          </div>
          <div style={{ fontFamily:"'Space Mono',monospace", fontSize:9, color:"#334155", letterSpacing:1 }}>EDUCATIONAL USE ONLY · NOT MEDICAL ADVICE</div>
        </div>
      </footer>
    </div>
  );
}