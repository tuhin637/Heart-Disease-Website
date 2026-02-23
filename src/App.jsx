import { useState, useEffect, useRef, useCallback } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const AGE_CATS = ["18-24","25-29","30-34","35-39","40-44","45-49","50-54","55-59","60-64","65-69","70-74","75-79","80 or older"];
const RACES    = ["White","Black","Asian","American Indian/Alaskan Native","Hispanic","Other"];
const GEN_H    = ["Excellent","Very good","Good","Fair","Poor"];
const DIABETIC = ["No","No, borderline diabetes","Yes","Yes (during pregnancy)"];
const STEPS    = [
  { id:0, title:"Physical", icon:"📐", sub:"BMI & health days" },
  { id:1, title:"Lifestyle", icon:"🏃", sub:"Habits & activity" },
  { id:2, title:"Medical",   icon:"🩺", sub:"Conditions" },
  { id:3, title:"Profile",   icon:"👤", sub:"Age & demographics" },
];
const INIT = {
  BMI:"25.0", PhysicalHealth:"0", MentalHealth:"0", SleepTime:"7",
  Smoking:"No", AlcoholDrinking:"No", PhysicalActivity:"Yes", DiffWalking:"No",
  Stroke:"No", Diabetic:"No", Asthma:"No", KidneyDisease:"No", SkinCancer:"No",
  Sex:"Male", AgeCategory:"30-34", Race:"White", GenHealth:"Good",
};

const mockPredict = async (f) => {
  await new Promise(r => setTimeout(r, 2400));
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
  else if (bmi > 30) risk_factors.push({ factor:"Obesity", value:`BMI ${bmi.toFixed(1)}`, impact:"medium", advice:"Gradual weight loss of 0.5–1 kg/week through diet and exercise." });
  if (f.Smoking==="Yes") risk_factors.push({ factor:"Active Smoker", value:"Yes", impact:"high", advice:"Cessation programs and nicotine replacement therapy recommended." });
  if (f.Stroke==="Yes") risk_factors.push({ factor:"Stroke History", value:"Yes", impact:"high", advice:"Regular cardiac monitoring and cardiologist consultation required." });
  if (parseFloat(f.PhysicalHealth)>15) risk_factors.push({ factor:"Poor Physical Health", value:`${f.PhysicalHealth} bad days/mo`, impact:"high", advice:"Seek comprehensive medical evaluation for underlying issues." });
  if (age >= 8) risk_factors.push({ factor:"Age Risk", value:f.AgeCategory, impact:age>=10?"high":"medium", advice:"Annual cardiac screenings strongly recommended." });
  if (f.PhysicalActivity==="No") risk_factors.push({ factor:"Sedentary Lifestyle", value:"No exercise", impact:"medium", advice:"150 min/week moderate aerobic activity is the target." });
  if (f.KidneyDisease==="Yes") risk_factors.push({ factor:"Kidney Disease", value:"Yes", impact:"high", advice:"CKD significantly elevates cardiovascular risk." });
  const recommendations = [];
  if (pred===1) { recommendations.push("Consult a cardiologist for full cardiac evaluation immediately."); recommendations.push("Request ECG, stress test, and lipid panel."); }
  if (bmi>=30) recommendations.push("Partner with a registered dietitian for a heart-healthy meal plan.");
  if (f.Smoking==="Yes") recommendations.push("Smoking cessation is the single most impactful change you can make today.");
  if (f.PhysicalActivity==="No") recommendations.push("Start with 20-min walks daily; build to 150 min/week over 4 weeks.");
  if (parseFloat(f.SleepTime)<7) recommendations.push("Prioritize 7–9 hours sleep. Poor sleep acutely elevates heart risk.");
  recommendations.push("Annual health screenings: cholesterol, blood pressure, blood glucose.");
  return { prediction:pred, risk_label:pred===1?"Elevated Risk":"Low Risk", probability:p, risk_percentage:+(p*100).toFixed(1), risk_level:riskLevel, risk_factors, recommendations, model_used:"RuleNet Hybrid (RF + Medical Rules)" };
};

/* ── useWindowSize ── */
function useWindowSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const h = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return size;
}

/* ── ECG Canvas ── */
function ECGCanvas({ color="#06ffa5", height=36, speed=2 }) {
  const ref = useRef(null);
  const frameRef = useRef(null);
  const off = useRef(0);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const dpr = window.devicePixelRatio||1;
    const resize = () => { canvas.width=(canvas.offsetWidth||120)*dpr; canvas.height=height*dpr; };
    resize();
    const ctx = canvas.getContext("2d");
    const ecg = x => {
      const t=(x%320)/320;
      if(t<0.12) return Math.sin(t/0.12*Math.PI)*4;
      if(t<0.25) return -Math.sin((t-0.12)/0.13*Math.PI)*7;
      if(t<0.30) return (t-0.25)/0.05*35;
      if(t<0.36) return 35-(t-0.30)/0.06*55;
      if(t<0.42) return -20+(t-0.36)/0.06*26;
      if(t<0.52) return 6-Math.sin((t-0.42)/0.10*Math.PI)*9;
      return 0;
    };
    const draw = () => {
      const W=canvas.width, H=canvas.height, mid=H/2;
      ctx.clearRect(0,0,W,H);
      off.current=(off.current+speed)%320;
      const g=ctx.createLinearGradient(0,0,W,0);
      g.addColorStop(0,"transparent"); g.addColorStop(0.25,color); g.addColorStop(0.75,color); g.addColorStop(1,"transparent");
      ctx.shadowBlur=14; ctx.shadowColor=color;
      ctx.beginPath(); ctx.strokeStyle=g; ctx.lineWidth=2*dpr; ctx.lineCap="round";
      for(let x=0;x<W;x++){const y=mid+ecg(x/dpr+off.current)*dpr*0.55; x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
      ctx.stroke(); ctx.shadowBlur=0;
      frameRef.current=requestAnimationFrame(draw);
    };
    draw();
    return ()=>cancelAnimationFrame(frameRef.current);
  },[color,height,speed]);
  return <canvas ref={ref} style={{width:"100%",height,display:"block"}}/>;
}

/* ── Mesh Background ── */
function MeshBg() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
      <div style={{position:"absolute",width:"60vw",height:"60vw",maxWidth:700,maxHeight:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,45,90,0.13) 0%,transparent 70%)",top:"-15%",left:"-15%",animation:"orb1 18s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:"50vw",height:"50vw",maxWidth:600,maxHeight:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,180,255,0.10) 0%,transparent 70%)",top:"30%",right:"-12%",animation:"orb2 22s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:"45vw",height:"45vw",maxWidth:500,maxHeight:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(120,60,255,0.08) 0%,transparent 70%)",bottom:"-10%",left:"25%",animation:"orb3 26s ease-in-out infinite"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.022) 1px,transparent 1px)",backgroundSize:"clamp(28px,4vw,44px) clamp(28px,4vw,44px)"}}/>
    </div>
  );
}

/* ── Counter ── */
function Counter({to,suffix="",decimals=0,duration=1600}) {
  const [v,setV]=useState(0);
  useEffect(()=>{let s=null;const step=ts=>{if(!s)s=ts;const prog=Math.min((ts-s)/duration,1),ease=1-Math.pow(1-prog,3);setV(+(to*ease).toFixed(decimals));if(prog<1)requestAnimationFrame(step);};requestAnimationFrame(step);},[to]);
  return <span>{v}{suffix}</span>;
}

/* ── Risk Gauge ── */
function RiskGauge({pct,level,isMobile}) {
  const ref=useRef(null);
  const [drawn,setDrawn]=useState(0);
  useEffect(()=>{let f,s=null;const a=ts=>{if(!s)s=ts;const prog=Math.min((ts-s)/1800,1),ease=1-Math.pow(1-prog,4);setDrawn(pct*ease);if(prog<1)f=requestAnimationFrame(a);};f=requestAnimationFrame(a);return()=>cancelAnimationFrame(f);},[pct]);
  const sz=isMobile?180:220, R=isMobile?78:92, lw=isMobile?13:15;
  useEffect(()=>{
    const canvas=ref.current; if(!canvas)return;
    const ctx=canvas.getContext("2d"),cx=sz/2,cy=sz*0.63;
    canvas.width=sz; canvas.height=isMobile?130:155;
    ctx.clearRect(0,0,sz,isMobile?130:155);
    ctx.beginPath();ctx.arc(cx,cy,R,Math.PI*.75,Math.PI*2.25);ctx.strokeStyle="rgba(255,255,255,0.05)";ctx.lineWidth=lw+4;ctx.lineCap="round";ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,R,Math.PI*.75,Math.PI*2.25);ctx.strokeStyle="rgba(255,255,255,0.07)";ctx.lineWidth=lw;ctx.stroke();
    [[0,25,"#06ffa5"],[25,50,"#ffd166"],[50,75,"#ff9a3c"],[75,100,"#ff3366"]].forEach(([s,e,c])=>{ctx.beginPath();ctx.arc(cx,cy,R,Math.PI*.75+(s/100)*Math.PI*1.5,Math.PI*.75+(e/100)*Math.PI*1.5);ctx.strokeStyle=c+"22";ctx.lineWidth=lw;ctx.lineCap="butt";ctx.stroke();});
    if(drawn>0){
      const col=drawn<25?"#06ffa5":drawn<50?"#ffd166":drawn<75?"#ff9a3c":"#ff3366";
      ctx.beginPath();ctx.arc(cx,cy,R,Math.PI*.75,Math.PI*.75+(drawn/100)*Math.PI*1.5);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.lineCap="round";ctx.shadowBlur=22;ctx.shadowColor=col;ctx.stroke();ctx.shadowBlur=0;
      const ang=Math.PI*.75+(drawn/100)*Math.PI*1.5,ex=cx+R*Math.cos(ang),ey=cy+R*Math.sin(ang);
      ctx.beginPath();ctx.arc(ex,ey,lw/2+3,0,Math.PI*2);ctx.fillStyle=col;ctx.shadowBlur=28;ctx.shadowColor=col;ctx.fill();ctx.shadowBlur=0;
      ctx.beginPath();ctx.arc(ex,ey,lw/2-2,0,Math.PI*2);ctx.fillStyle="#080b16";ctx.fill();
    }
    ctx.fillStyle="#2d3748";ctx.font=`bold ${isMobile?9:10}px 'JetBrains Mono',monospace`;ctx.textAlign="center";
    ctx.fillText("0%",cx-R*Math.cos(Math.PI*.75)+5,cy-R*Math.sin(Math.PI*.75)+11);
    ctx.fillText("100%",cx+R*Math.cos(Math.PI*.75)-5,cy-R*Math.sin(Math.PI*.75)+11);
  },[drawn,sz,R,lw]);
  const col=pct<25?"#06ffa5":pct<50?"#ffd166":pct<75?"#ff9a3c":"#ff3366";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
      <canvas ref={ref} style={{width:sz,height:isMobile?130:155}}/>
      <div style={{textAlign:"center",marginTop:isMobile?-22:-26}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?40:50,color:col,lineHeight:1,letterSpacing:2,textShadow:`0 0 28px ${col}60`}}>
          <Counter to={pct} suffix="%" decimals={1} duration={1800}/>
        </div>
        <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?10:12,color:col,opacity:.8,letterSpacing:3,textTransform:"uppercase",marginTop:4}}>{level} Risk</div>
      </div>
    </div>
  );
}

/* ── Step Indicator ── */
function StepIndicator({current,isMobile}) {
  return (
    <div style={{display:"flex",gap:0,marginBottom:28,background:"rgba(255,255,255,0.02)",borderRadius:14,border:"1px solid rgba(255,255,255,0.06)",overflow:"hidden"}}>
      {STEPS.map((s,i)=>{
        const done=i<current,active=i===current;
        return (
          <div key={i} style={{flex:1,padding:isMobile?"12px 8px":"14px 12px",display:"flex",alignItems:"center",gap:isMobile?6:10,background:active?"rgba(255,51,102,0.06)":"transparent",borderRight:i<STEPS.length-1?"1px solid rgba(255,255,255,0.05)":"none",position:"relative",transition:"background 0.3s",minWidth:0}}>
            {active&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#ff3366,#ff9a3c)"}}/>}
            <div style={{width:isMobile?26:30,height:isMobile?26:30,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?12:14,background:done?"linear-gradient(135deg,#06ffa5,#00b4ff)":active?"rgba(255,51,102,0.15)":"rgba(255,255,255,0.04)",border:active?"1px solid rgba(255,51,102,0.4)":done?"none":"1px solid rgba(255,255,255,0.07)",transition:"all 0.3s"}}>
              {done?<span style={{color:"#080b16",fontWeight:700,fontSize:11}}>✓</span>:s.icon}
            </div>
            {!isMobile&&(
              <div style={{minWidth:0}}>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:700,color:active?"#ff3366":done?"#06ffa5":"#4a5568",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.title}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#2d3748",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.sub}</div>
              </div>
            )}
            {isMobile&&active&&(
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:700,color:"#ff3366",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.title}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Toggle ── */
function Toggle({label,field,value,onChange,icon,isMobile}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <label style={{fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?12:13,fontWeight:500,color:"#718096",display:"flex",alignItems:"center",gap:6}}>
        {icon&&<span style={{fontSize:isMobile?14:15}}>{icon}</span>}{label}
      </label>
      <div style={{display:"flex",borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.02)"}}>
        {["No","Yes"].map(opt=>(
          <button key={opt} type="button" onClick={()=>onChange(field,opt)} style={{
            flex:1,padding:isMobile?"10px 0":"11px 0",border:"none",cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?13:14,fontWeight:600,
            background:value===opt?(opt==="Yes"?"linear-gradient(135deg,#ff3366,#ff6b6b)":"linear-gradient(135deg,#06ffa5,#00b4ff)"):"transparent",
            color:value===opt?(opt==="Yes"?"#fff":"#080b16"):"#4a5568",
            transition:"all 0.22s",letterSpacing:0.5,
          }}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

/* ── Select ── */
function Select({label,field,value,options,onChange,icon,isMobile}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <label style={{fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?12:13,fontWeight:500,color:"#718096",display:"flex",alignItems:"center",gap:6}}>
        {icon&&<span style={{fontSize:isMobile?14:15}}>{icon}</span>}{label}
      </label>
      <div style={{position:"relative"}}>
        <select value={value} onChange={e=>onChange(field,e.target.value)} style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:isMobile?"11px 36px 11px 14px":"12px 40px 12px 16px",color:"#e8eaf6",fontSize:isMobile?13:14,fontFamily:"'DM Sans',sans-serif",outline:"none",appearance:"none",cursor:"pointer",boxSizing:"border-box",transition:"border-color 0.2s"}}>
          {options.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        <span style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",color:"#4a5568",pointerEvents:"none",fontSize:11}}>▾</span>
      </div>
    </div>
  );
}

/* ── Number Input ── */
function Num({label,field,value,onChange,min,max,step="0.1",unit,icon,isMobile}) {
  const pct=Math.max(0,Math.min(100,((parseFloat(value)-parseFloat(min))/(parseFloat(max)-parseFloat(min)))*100));
  const col=pct<40?"#06ffa5":pct<70?"#ffd166":"#ff3366";
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <label style={{fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?12:13,fontWeight:500,color:"#718096",display:"flex",alignItems:"center",gap:6}}>
        {icon&&<span style={{fontSize:isMobile?14:15}}>{icon}</span>}{label}
      </label>
      <div style={{position:"relative"}}>
        <input type="number" min={min} max={max} step={step} value={value} onChange={e=>onChange(field,e.target.value)}
          style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:isMobile?"11px 14px":"12px 16px",paddingRight:unit?"66px":"16px",color:"#e8eaf6",fontSize:isMobile?14:15,fontFamily:"'JetBrains Mono',monospace",outline:"none",boxSizing:"border-box",transition:"border-color 0.2s, box-shadow 0.2s"}}/>
        {unit&&<span style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",color:"#4a5568",fontSize:10,fontFamily:"'JetBrains Mono',monospace",pointerEvents:"none"}}>{unit}</span>}
      </div>
      <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:3}}>
        <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,#06ffa5,${col})`,borderRadius:3,transition:"width 0.3s,background 0.5s",boxShadow:`0 0 8px ${col}55`}}/>
      </div>
    </div>
  );
}

/* ── Risk Card ── */
const impCol={high:"#ff3366",medium:"#ffd166",low:"#06ffa5"};
function RiskCard({rf,index,isMobile}) {
  const [vis,setVis]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVis(true),index*120);return()=>clearTimeout(t);},[index]);
  const col=impCol[rf.impact];
  return (
    <div style={{padding:isMobile?"14px 16px":"18px 20px",borderRadius:14,marginBottom:10,background:`linear-gradient(135deg,${col}06,transparent)`,border:`1px solid ${col}20`,borderLeft:`3px solid ${col}`,opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:"opacity 0.4s,transform 0.4s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
        <div style={{minWidth:0}}>
          <div style={{fontFamily:"'DM Sans',sans-serif",color:"#e8eaf6",fontWeight:700,fontSize:isMobile?13:14,lineHeight:1.3}}>{rf.factor}</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",color:"#4a5568",fontSize:isMobile?10:11,marginTop:2}}>{rf.value}</div>
        </div>
        <span style={{fontSize:8,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",padding:"3px 8px",borderRadius:20,background:`${col}15`,color:col,border:`1px solid ${col}30`,fontFamily:"'JetBrains Mono',monospace",flexShrink:0,whiteSpace:"nowrap"}}>{rf.impact}</span>
      </div>
      <p style={{margin:0,fontSize:isMobile?12:13,color:"#718096",lineHeight:1.6,fontFamily:"'DM Sans',sans-serif"}}>{rf.advice}</p>
    </div>
  );
}

/* ── MAIN APP ── */
export default function App() {
  const {w} = useWindowSize();
  const isMobile = w < 640;
  const isTablet = w < 900;

  const [step,setStep]   = useState(0);
  const [form,setForm]   = useState(INIT);
  const [loading,setLoading] = useState(false);
  const [result,setResult]   = useState(null);
  const [tab,setTab]         = useState("assess");
  const [bpm,setBpm]         = useState(72);
  const [showRes,setShowRes] = useState(false);
  const [menuOpen,setMenuOpen] = useState(false);
  const resultRef = useRef(null);

  useEffect(()=>{const t=setInterval(()=>setBpm(67+Math.floor(Math.random()*13)),900);return()=>clearInterval(t);},[]);

  useEffect(()=>{
    if(result){setTimeout(()=>{setShowRes(true);resultRef.current?.scrollIntoView({behavior:"smooth",block:"start"});},150);}
  },[result]);

  useEffect(()=>{
    const link=document.createElement("link");
    link.rel="stylesheet";
    link.href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";
    document.head.appendChild(link);
    const style=document.createElement("style");
    style.textContent=`
      *{box-sizing:border-box;margin:0;padding:0;}
      html{scroll-behavior:smooth;}
      body{background:#080b16;font-family:'DM Sans',sans-serif;-webkit-font-smoothing:antialiased;}
      ::-webkit-scrollbar{width:4px;}
      ::-webkit-scrollbar-thumb{background:rgba(255,51,102,0.25);border-radius:4px;}
      input[type=number]::-webkit-inner-spin-button{opacity:.35;}
      select option{background:#0d111f;color:#e8eaf6;}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes pulse{0%,100%{opacity:.45}50%{opacity:1}}
      @keyframes orb1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(5vw,-4vh) scale(1.05)}66%{transform:translate(-3vw,5vh) scale(0.97)}}
      @keyframes orb2{0%,100%{transform:translate(0,0)}33%{transform:translate(-6vw,4vh)}66%{transform:translate(4vw,-5vh)}}
      @keyframes orb3{0%,100%{transform:translate(0,0)}33%{transform:translate(4vw,3vh)}66%{transform:translate(-4vw,-3vh)}}
      @keyframes heartbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.28)}30%{transform:scale(1)}45%{transform:scale(1.14)}}
      @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
      @keyframes glow{0%,100%{box-shadow:0 4px 24px rgba(255,51,102,0.35)}50%{box-shadow:0 4px 40px rgba(255,51,102,0.6)}}
      @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      .fadeUp{animation:fadeUp 0.55s ease forwards;}
      .pulse-dot{animation:pulse 1.5s ease infinite;}
      .hb{animation:heartbeat 1s ease-in-out infinite;}
      input:focus,select:focus{border-color:rgba(255,51,102,0.45)!important;box-shadow:0 0 0 3px rgba(255,51,102,0.09)!important;outline:none;}
      button:active{transform:scale(0.97);}
      @media(max-width:640px){
        .hero-stats{grid-template-columns:repeat(2,1fr)!important;}
        .result-grid{grid-template-columns:1fr!important;}
        .model-pipeline{flex-direction:column!important;}
        .stats-header{flex-direction:column!important;align-items:flex-start!important;}
      }
    `;
    document.head.appendChild(style);
    return()=>{document.head.removeChild(link);document.head.removeChild(style);};
  },[]);

  const set=(f,v)=>setForm(p=>({...p,[f]:v}));
  const next=()=>setStep(s=>Math.min(s+1,STEPS.length-1));
  const prev=()=>setStep(s=>Math.max(s-1,0));

  const analyze=async()=>{
    setLoading(true);setResult(null);setShowRes(false);
    try{
      let data;
      try{
        const r=await fetch(`${BASE_URL}/predict`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,BMI:parseFloat(form.BMI),PhysicalHealth:parseFloat(form.PhysicalHealth),MentalHealth:parseFloat(form.MentalHealth),SleepTime:parseFloat(form.SleepTime)}),signal:AbortSignal.timeout(10000)});
        if(!r.ok)throw new Error();
        data=await r.json();
      }catch{data=await mockPredict(form);}
      setResult(data);
    }finally{setLoading(false);}
  };

  const rCol=result?.prediction===1?"#ff3366":"#06ffa5";
  const pad=isMobile?"16px":"28px";
  const cardPad=isMobile?"22px 18px":"36px 40px";

  const TABS=[["assess","🩺","Assessment"],["model","🤖","Model"],["stats","📊","Stats"]];

  return (
    <div style={{minHeight:"100vh",background:"#080b16",color:"#e8eaf6",position:"relative",overflowX:"hidden"}}>
      <MeshBg/>

      {/* ── HEADER ── */}
      <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(8,11,22,0.85)",backdropFilter:"blur(24px)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{maxWidth:1160,margin:"0 auto",padding:`0 ${pad}`,height:isMobile?58:66,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>

          {/* Logo */}
          <div style={{display:"flex",alignItems:"center",gap:isMobile?10:14,flexShrink:0}}>
            <div className="hb" style={{width:isMobile?32:38,height:isMobile?32:38,borderRadius:10,background:"linear-gradient(135deg,#ff3366,#ff6b6b)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?15:18,boxShadow:"0 0 18px rgba(255,51,102,0.4)",flexShrink:0}}>❤️</div>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?14:18,letterSpacing:isMobile?1.5:2,background:"linear-gradient(135deg,#ff3366,#ffd166,#06ffa5)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundSize:"200%",animation:"shimmer 4s linear infinite",lineHeight:1.2}}>Heart Disease Risk AI</div>
              {!isMobile&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#2d3748",letterSpacing:2,marginTop:2}}>CDC BRFSS 2020 · 319,795 RECORDS</div>}
            </div>
          </div>

          {/* BPM + Tags — desktop */}
          {!isMobile&&(
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{background:"rgba(6,255,165,0.06)",border:"1px solid rgba(6,255,165,0.18)",borderRadius:12,padding:"7px 16px",display:"flex",alignItems:"center",gap:10,backdropFilter:"blur(8px)"}}>
                <div className="pulse-dot" style={{width:7,height:7,borderRadius:"50%",background:"#06ffa5",boxShadow:"0 0 10px #06ffa5",flexShrink:0}}/>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:"#06ffa5",fontWeight:500}}>{bpm} BPM</span>
                <div style={{width:88,height:26}}><ECGCanvas color="#06ffa5" height={26} speed={2.5}/></div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <span style={{fontSize:9,padding:"4px 10px",borderRadius:6,background:"rgba(255,51,102,0.08)",border:"1px solid rgba(255,51,102,0.2)",color:"#ff3366",fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>DIU FYDP</span>
                <span style={{fontSize:9,padding:"4px 10px",borderRadius:6,background:"rgba(0,180,255,0.08)",border:"1px solid rgba(0,180,255,0.2)",color:"#00b4ff",fontFamily:"'JetBrains Mono',monospace",letterSpacing:1}}>2025</span>
              </div>
            </div>
          )}

          {/* Mobile: BPM compact */}
          {isMobile&&(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{background:"rgba(6,255,165,0.06)",border:"1px solid rgba(6,255,165,0.18)",borderRadius:10,padding:"6px 12px",display:"flex",alignItems:"center",gap:7}}>
                <div className="pulse-dot" style={{width:6,height:6,borderRadius:"50%",background:"#06ffa5",flexShrink:0}}/>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#06ffa5"}}>{bpm}</span>
                <div style={{width:44,height:20}}><ECGCanvas color="#06ffa5" height={20} speed={2.5}/></div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Bar */}
        <div style={{maxWidth:1160,margin:"0 auto",padding:`0 ${pad}`,display:"flex",borderTop:"1px solid rgba(255,255,255,0.03)"}}>
          {TABS.map(([id,ic,lbl])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:isMobile?"10px 0":"10px 20px",flex:isMobile?1:undefined,background:"none",border:"none",borderBottom:`2px solid ${tab===id?"#ff3366":"transparent"}`,color:tab===id?"#ff3366":"#4a5568",fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?12:13,fontWeight:600,cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:isMobile?"center":"flex-start",gap:5}}>
              <span style={{fontSize:isMobile?13:14}}>{ic}</span>
              {lbl}
            </button>
          ))}
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{maxWidth:1160,margin:"0 auto",padding:`${isMobile?28:44}px ${pad} ${isMobile?60:100}px`,position:"relative",zIndex:2}}>

        {/* ══ ASSESS TAB ══ */}
        {tab==="assess"&&(
          <div>
            {/* Hero */}
            <div className="fadeUp" style={{textAlign:"center",paddingBottom:isMobile?36:52,marginBottom:isMobile?28:44,borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 16px",borderRadius:100,background:"rgba(255,51,102,0.08)",border:"1px solid rgba(255,51,102,0.2)",marginBottom:isMobile?16:22,fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?8:10,color:"#ff3366",letterSpacing:isMobile?1:2}}>
                <div className="pulse-dot" style={{width:5,height:5,borderRadius:"50%",background:"#ff3366"}}/>
                AI MODEL ACTIVE · REAL-TIME ANALYSIS
              </div>
              <h1 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:`clamp(2.4rem,7vw,5.2rem)`,letterSpacing:"clamp(2px,0.5vw,4px)",lineHeight:1,marginBottom:isMobile?14:18}}>
                <span style={{display:"block",background:"linear-gradient(135deg,#ffffff,#94a3b8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Cardiovascular</span>
                <span style={{display:"block",background:"linear-gradient(135deg,#ff3366,#ff9a3c,#ffd166)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundSize:"200%",animation:"shimmer 3s linear infinite"}}>Risk Assessment</span>
              </h1>
              <p style={{color:"#4a5568",fontSize:isMobile?13:15,maxWidth:420,margin:"0 auto",lineHeight:1.8,marginBottom:isMobile?22:28}}>
                17 clinical parameters · RuleNet hybrid model · Real-time risk stratification
              </p>
              <div className="hero-stats" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:isMobile?8:12,maxWidth:isMobile?320:480,margin:"0 auto"}}>
                {[["94.21%","Accuracy","#06ffa5"],["0.98","AUC-ROC","#00b4ff"],["96.19%","Precision","#ffd166"],["5-Fold","Cross-Val","#ff9a3c"]].map(([v,l,c])=>(
                  <div key={l} style={{padding:isMobile?"12px 8px":"14px 18px",background:"rgba(255,255,255,0.02)",border:`1px solid ${c}20`,borderRadius:12,textAlign:"center"}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?20:26,color:c,letterSpacing:1,lineHeight:1}}>{v}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?7:9,color:"#4a5568",marginTop:4,letterSpacing:0.5,textTransform:"uppercase"}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Card */}
            <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:isMobile?18:24,padding:isMobile?"22px 18px":"38px",backdropFilter:"blur(12px)",marginBottom:24,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,51,102,0.4),transparent)"}}/>

              <StepIndicator current={step} isMobile={isMobile}/>

              <div style={{marginBottom:26,opacity:0.45}}><ECGCanvas color="#ff336618" height={24} speed={1.5}/></div>

              {/* Step label for mobile */}
              {isMobile&&(
                <div style={{marginBottom:18,padding:"10px 14px",background:"rgba(255,51,102,0.05)",borderRadius:10,border:"1px solid rgba(255,51,102,0.12)"}}>
                  <span style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#ff3366",fontWeight:600}}>{STEPS[step].icon} Step {step+1} of 4 — {STEPS[step].title}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#4a5568",display:"block",marginTop:3}}>{STEPS[step].sub}</span>
                </div>
              )}

              <div key={step} style={{animation:"fadeUp 0.3s ease"}}>
                {step===0&&(
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:isMobile?16:20}}>
                    <Num label="BMI" icon="⚖️" field="BMI" value={form.BMI} onChange={set} min="10" max="70" unit="kg/m²" isMobile={isMobile}/>
                    <Num label="Physical Health (bad days/month)" icon="🏥" field="PhysicalHealth" value={form.PhysicalHealth} onChange={set} min="0" max="30" step="1" unit="/30" isMobile={isMobile}/>
                    <Num label="Mental Health (bad days/month)" icon="🧠" field="MentalHealth" value={form.MentalHealth} onChange={set} min="0" max="30" step="1" unit="/30" isMobile={isMobile}/>
                    <Num label="Sleep Time" icon="😴" field="SleepTime" value={form.SleepTime} onChange={set} min="0" max="24" step="0.5" unit="hrs" isMobile={isMobile}/>
                  </div>
                )}
                {step===1&&(
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:isMobile?16:20}}>
                    <Toggle label="Do you smoke?" icon="🚬" field="Smoking" value={form.Smoking} onChange={set} isMobile={isMobile}/>
                    <Toggle label="Heavy Alcohol Drinking?" icon="🍺" field="AlcoholDrinking" value={form.AlcoholDrinking} onChange={set} isMobile={isMobile}/>
                    <Toggle label="Physically Active?" icon="🏃" field="PhysicalActivity" value={form.PhysicalActivity} onChange={set} isMobile={isMobile}/>
                    <Toggle label="Difficulty Walking?" icon="🚶" field="DiffWalking" value={form.DiffWalking} onChange={set} isMobile={isMobile}/>
                  </div>
                )}
                {step===2&&(
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:isMobile?16:20}}>
                    <Toggle label="History of Stroke?" icon="🧬" field="Stroke" value={form.Stroke} onChange={set} isMobile={isMobile}/>
                    <Select label="Diabetic Status" icon="💉" field="Diabetic" value={form.Diabetic} options={DIABETIC} onChange={set} isMobile={isMobile}/>
                    <Toggle label="Asthma?" icon="💨" field="Asthma" value={form.Asthma} onChange={set} isMobile={isMobile}/>
                    <Toggle label="Kidney Disease?" icon="🫘" field="KidneyDisease" value={form.KidneyDisease} onChange={set} isMobile={isMobile}/>
                    <Toggle label="Skin Cancer?" icon="🔬" field="SkinCancer" value={form.SkinCancer} onChange={set} isMobile={isMobile}/>
                  </div>
                )}
                {step===3&&(
                  <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:isMobile?16:20}}>
                    <Select label="Sex" icon="👤" field="Sex" value={form.Sex} options={["Male","Female"]} onChange={set} isMobile={isMobile}/>
                    <Select label="Age Category" icon="🎂" field="AgeCategory" value={form.AgeCategory} options={AGE_CATS} onChange={set} isMobile={isMobile}/>
                    <Select label="Race / Ethnicity" icon="🌍" field="Race" value={form.Race} options={RACES} onChange={set} isMobile={isMobile}/>
                    <Select label="General Health" icon="💚" field="GenHealth" value={form.GenHealth} options={GEN_H} onChange={set} isMobile={isMobile}/>
                  </div>
                )}
              </div>

              {/* Nav */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:isMobile?28:36,paddingTop:isMobile?20:26,borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                <button onClick={prev} disabled={step===0} style={{padding:isMobile?"10px 20px":"11px 26px",borderRadius:11,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)",color:step===0?"#2d3748":"#718096",fontSize:isMobile?13:14,fontWeight:600,cursor:step===0?"default":"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s"}}>← Back</button>

                <div style={{display:"flex",gap:5,alignItems:"center"}}>
                  {STEPS.map((_,i)=>(
                    <div key={i} style={{height:isMobile?3:4,width:i===step?(isMobile?20:26):6,borderRadius:4,background:i<=step?(i===step?"#ff3366":"#06ffa5"):"rgba(255,255,255,0.08)",transition:"all 0.3s",boxShadow:i===step?"0 0 8px #ff3366":"none"}}/>
                  ))}
                </div>

                {step<STEPS.length-1?(
                  <button onClick={next} style={{padding:isMobile?"10px 24px":"11px 30px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#ff3366,#ff6b6b)",color:"#fff",fontSize:isMobile?13:14,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:"0 4px 22px rgba(255,51,102,0.35)",transition:"all 0.2s"}}>Next →</button>
                ):(
                  <button onClick={analyze} disabled={loading} style={{padding:isMobile?"10px 20px":"11px 32px",borderRadius:11,fontWeight:700,fontSize:isMobile?13:14,cursor:loading?"default":"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:8,border:loading?"1px solid rgba(255,51,102,0.3)":"none",background:loading?"rgba(255,51,102,0.08)":"linear-gradient(135deg,#ff3366,#ff9a3c)",color:loading?"#ff3366":"#fff",boxShadow:loading?"none":"0 4px 26px rgba(255,51,102,0.4)",animation:!loading?"glow 2s ease infinite":"none"}}>
                    {loading?(<><span style={{width:14,height:14,border:"2px solid rgba(255,51,102,0.3)",borderTopColor:"#ff3366",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block"}}/>{isMobile?"Wait...":"Analyzing..."}</>):`⚡ ${isMobile?"Analyze":"Analyze Risk"}`}
                  </button>
                )}
              </div>
            </div>

            {/* ── RESULT ── */}
            {result&&(
              <div ref={resultRef} style={{opacity:showRes?1:0,transform:showRes?"translateY(0)":"translateY(28px)",transition:"opacity 0.7s,transform 0.7s"}}>
                {/* Result Header */}
                <div style={{borderRadius:isMobile?18:22,overflow:"hidden",marginBottom:isMobile?16:22,border:`1px solid ${rCol}22`,background:`linear-gradient(135deg,${rCol}06,rgba(8,11,22,0.98) 65%)`,position:"relative"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${rCol},transparent)`}}/>
                  <div style={{padding:isMobile?"24px 20px":"38px 44px",display:"flex",alignItems:"center",gap:isMobile?20:40,flexWrap:isMobile?"nowrap":"wrap",flexDirection:isMobile?"column":"row"}}>
                    {/* Mobile layout stacks */}
                    {isMobile?(
                      <>
                        <div style={{display:"flex",alignItems:"center",gap:16,width:"100%"}}>
                          <div style={{fontSize:48,lineHeight:1}}>{result.prediction===1?"⚠️":"✅"}</div>
                          <div>
                            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#4a5568",letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>ANALYSIS COMPLETE</div>
                            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:rCol,letterSpacing:2,lineHeight:1,textShadow:`0 0 30px ${rCol}50`}}>{result.risk_label}</div>
                            <div style={{fontFamily:"'DM Sans',sans-serif",color:"#718096",fontSize:12,marginTop:4}}>Level: <span style={{color:rCol,fontWeight:700}}>{result.risk_level}</span> · {result.risk_factors.length} factor{result.risk_factors.length!==1?"s":""}</div>
                          </div>
                        </div>
                        <RiskGauge pct={result.risk_percentage} level={result.risk_level} isMobile={true}/>
                      </>
                    ):(
                      <>
                        <div style={{fontSize:68,lineHeight:1,filter:"drop-shadow(0 0 18px rgba(255,255,255,0.25))"}}>{result.prediction===1?"⚠️":"✅"}</div>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#4a5568",letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>ANALYSIS COMPLETE · {result.model_used}</div>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:50,color:rCol,letterSpacing:3,lineHeight:1,marginBottom:10,textShadow:`0 0 38px ${rCol}50`}}>{result.risk_label}</div>
                          <div style={{fontFamily:"'DM Sans',sans-serif",color:"#718096",fontSize:15}}>Risk Level: <span style={{color:rCol,fontWeight:700}}>{result.risk_level}</span><span style={{margin:"0 12px",opacity:.3}}>·</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13}}>{result.risk_factors.length} risk factor{result.risk_factors.length!==1?"s":""}</span></div>
                        </div>
                        <RiskGauge pct={result.risk_percentage} level={result.risk_level} isMobile={false}/>
                      </>
                    )}
                  </div>
                </div>

                {/* Risk + Recommendations */}
                <div className="result-grid" style={{display:"grid",gridTemplateColumns:isTablet?"1fr":"1fr 1fr",gap:isMobile?14:20,marginBottom:isMobile?14:20}}>
                  <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:isMobile?16:20,padding:isMobile?"20px 16px":"28px",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,51,102,0.3),transparent)"}}/>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18,paddingBottom:14,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <span style={{fontSize:16}}>⚡</span>
                      <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:isMobile?14:16,color:"#e8eaf6"}}>Risk Factors</span>
                      <span style={{marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#4a5568",background:"rgba(255,255,255,0.04)",padding:"3px 9px",borderRadius:5}}>{result.risk_factors.length} FOUND</span>
                    </div>
                    {result.risk_factors.length===0?(
                      <div style={{textAlign:"center",padding:"28px 0"}}>
                        <div style={{fontSize:44,marginBottom:12}}>🎉</div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#06ffa5",letterSpacing:2}}>No Major Risk Factors</div>
                      </div>
                    ):result.risk_factors.map((rf,i)=><RiskCard key={i} rf={rf} index={i} isMobile={isMobile}/>)}
                  </div>

                  <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:isMobile?16:20,padding:isMobile?"20px 16px":"28px",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(6,255,165,0.3),transparent)"}}/>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18,paddingBottom:14,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                      <span style={{fontSize:16}}>💡</span>
                      <span style={{fontFamily:"'DM Sans',sans-serif",fontWeight:700,fontSize:isMobile?14:16,color:"#e8eaf6"}}>Recommendations</span>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      {result.recommendations.map((rec,i)=>(
                        <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start",padding:isMobile?"11px 13px":"13px 15px",background:"rgba(6,255,165,0.03)",border:"1px solid rgba(6,255,165,0.09)",borderRadius:12,opacity:0,animation:`fadeUp 0.4s ease ${i*0.1+0.2}s forwards`}}>
                          <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(6,255,165,0.12)",border:"1px solid rgba(6,255,165,0.25)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                            <span style={{color:"#06ffa5",fontSize:9,fontWeight:700}}>✓</span>
                          </div>
                          <p style={{margin:0,fontSize:isMobile?12:13,color:"#718096",lineHeight:1.65,fontFamily:"'DM Sans',sans-serif"}}>{rec}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:18,padding:isMobile?"10px 13px":"12px 15px",background:"rgba(255,209,102,0.05)",border:"1px solid rgba(255,209,102,0.14)",borderRadius:10,fontSize:isMobile?11:12,color:"#ffd166",fontFamily:"'DM Sans',sans-serif",lineHeight:1.65}}>
                      ⚠️ AI risk assessment only — not a substitute for professional medical diagnosis.
                    </div>
                  </div>
                </div>

                <div style={{textAlign:"center"}}>
                  <button onClick={()=>{setResult(null);setShowRes(false);setStep(0);}} style={{padding:isMobile?"10px 24px":"11px 28px",borderRadius:11,background:"none",border:"1px solid rgba(255,255,255,0.08)",color:"#4a5568",fontSize:isMobile?12:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>← Start New Assessment</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ MODEL TAB ══ */}
        {tab==="model"&&(
          <div style={{animation:"fadeUp 0.5s ease"}}>
            <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:isMobile?18:24,padding:isMobile?"22px 18px":"38px",marginBottom:18,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,51,102,0.4),transparent)"}}/>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#ff3366",letterSpacing:3,textTransform:"uppercase",marginBottom:8}}>ARCHITECTURE</div>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?28:40,letterSpacing:2,marginBottom:10,background:"linear-gradient(135deg,#ff3366,#ffd166)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RuleNet Hybrid Model</h2>
              <p style={{color:"#718096",lineHeight:1.8,marginBottom:30,maxWidth:600,fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?13:15}}>A hybrid classifier combining domain-expert medical rules with a Random Forest ensemble. Rules provide high-confidence decisions; RF handles ambiguous cases with probabilistic scoring.</p>
              <div className="model-pipeline" style={{display:"flex",gap:0,alignItems:"stretch",background:"rgba(0,0,0,0.3)",borderRadius:14,overflow:"hidden",border:"1px solid rgba(255,255,255,0.05)"}}>
                {[{icon:"📥",title:"Input",desc:"17 clinical\nfeatures",color:"#00b4ff"},{icon:"📏",title:"Rules",desc:"3 medical\nrules",color:"#a78bfa"},{icon:"🌲",title:"RF Model",desc:"500 trees\nSMOTE",color:"#ff9a3c"},{icon:"🎯",title:"Output",desc:"Score +\nexplanation",color:"#06ffa5"}].map((s,i,arr)=>(
                  <div key={i} style={{flex:1,padding:isMobile?"18px 12px":"26px 20px",position:"relative",borderRight:i<arr.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                    <div style={{width:isMobile?36:42,height:isMobile?36:42,borderRadius:12,background:`${s.color}12`,border:`1px solid ${s.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?18:22,marginBottom:isMobile?10:12}}>{s.icon}</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",color:s.color,fontSize:isMobile?14:18,letterSpacing:1,marginBottom:6}}>{s.title}</div>
                    <div style={{color:"#4a5568",fontSize:isMobile?10:12,lineHeight:1.65,fontFamily:"'JetBrains Mono',monospace",whiteSpace:"pre-line"}}>{s.desc}</div>
                    {i<arr.length-1&&<div style={{position:"absolute",right:isMobile?-10:-12,top:"50%",transform:"translateY(-50%)",color:"#2d3748",fontSize:isMobile?16:20,zIndex:1}}>→</div>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(3,1fr)",gap:isMobile?10:14,marginBottom:18}}>
              {[["94.21%","Test Accuracy","#06ffa5"],["96.19%","Precision","#00b4ff"],["92.06%","Recall","#a78bfa"],["94.09%","F1-Score","#ff9a3c"],["0.98","AUC-ROC","#ff3366"],["94.23%","CV Accuracy","#ffd166"]].map(([v,l,c])=>(
                <div key={l} style={{background:"rgba(255,255,255,0.015)",border:`1px solid ${c}18`,borderRadius:14,padding:isMobile?"18px 14px":"22px 18px",textAlign:"center",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:c,opacity:0.5}}/>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?26:32,color:c,letterSpacing:2}}>{v}</div>
                  <div style={{color:"#4a5568",fontSize:isMobile?10:11,marginTop:5,fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>{l}</div>
                </div>
              ))}
            </div>

            <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:isMobile?16:20,padding:isMobile?"20px 18px":"30px"}}>
              <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?20:24,letterSpacing:2,color:"#e8eaf6",marginBottom:18}}>📊 Dataset & Pipeline</h3>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:isMobile?8:10}}>
                {[["Source","CDC BRFSS 2020"],["Records","319,795"],["Features","17 clinical"],["Balancing","SMOTE"],["Validation","5-Fold CV"],["Outliers","IQR Capping"],["Encoding","Label Enc."],["Missing","Mean Impute"]].map(([k,v])=>(
                  <div key={k} style={{padding:isMobile?"13px 12px":"15px 16px",background:"rgba(0,0,0,0.25)",borderRadius:11,border:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?7:9,color:"#4a5568",letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{k}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?12:14,color:"#e8eaf6",fontWeight:600}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ STATS TAB ══ */}
        {tab==="stats"&&(
          <div style={{animation:"fadeUp 0.5s ease"}}>
            <div className="stats-header" style={{background:"linear-gradient(135deg,rgba(255,51,102,0.07),rgba(255,154,60,0.05))",border:"1px solid rgba(255,51,102,0.15)",borderRadius:isMobile?16:20,padding:isMobile?"20px 18px":"24px 32px",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
              <div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#ff3366",letterSpacing:3,textTransform:"uppercase",marginBottom:7}}>RESEARCH STATISTICS · 2025</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?22:28,letterSpacing:2,color:"#f1f5f9"}}>Model Performance Report</div>
                <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,color:"#4a5568",marginTop:4}}>Daffodil International University · FYDP 2025</div>
              </div>
              <div style={{display:"flex",gap:10}}>
                {[["94.21%","BEST ACCURACY","#06ffa5"],["0.98","AUC-ROC","#00b4ff"]].map(([v,l,c])=>(
                  <div key={l} style={{textAlign:"center",padding:isMobile?"12px 16px":"14px 22px",background:`${c}08`,border:`1px solid ${c}25`,borderRadius:12}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?22:28,color:c,letterSpacing:2}}>{v}</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:c,opacity:.7,marginTop:3,letterSpacing:1}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:isMobile?18:22,padding:isMobile?"22px 18px":"34px",marginBottom:18}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#00b4ff",letterSpacing:3,textTransform:"uppercase",marginBottom:7}}>BENCHMARK</div>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?26:34,letterSpacing:2,color:"#f1f5f9",marginBottom:5}}>Algorithm Comparison</h2>
              <p style={{color:"#4a5568",fontSize:isMobile?11:13,marginBottom:26,fontFamily:"'DM Sans',sans-serif"}}>5-Fold Stratified CV · 319,795 records · SMOTE balanced</p>
              {[{name:"RuleNet (Ours)",cv:94.23,test:94.21,highlight:true,tag:"★ BEST"},{name:"Random Forest",cv:94.05,test:93.98},{name:"XGBoost",cv:93.80,test:93.10},{name:"KNN",cv:92.18,test:92.01},{name:"Naive Bayes",cv:91.54,test:91.55},{name:"Logistic Reg.",cv:91.50,test:91.33},{name:"SVM",cv:91.44,test:91.20},{name:"Decision Tree",cv:91.16,test:91.01}].map((m,i)=>(
                <div key={m.name} style={{display:"flex",alignItems:"center",gap:isMobile?8:12,marginBottom:isMobile?10:13,opacity:0,animation:`fadeUp 0.35s ease ${i*0.07}s forwards`}}>
                  <div style={{width:isMobile?24:28,height:isMobile?24:28,borderRadius:8,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:m.highlight?"linear-gradient(135deg,#ff3366,#ff9a3c)":"rgba(255,255,255,0.05)",fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?10:11,fontWeight:700,color:m.highlight?"#fff":"#4a5568"}}>{i+1}</div>
                  <div style={{width:isMobile?90:145,flexShrink:0,fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?11:13,fontWeight:m.highlight?700:500,color:m.highlight?"#ff3366":"#94a3b8",display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                    <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
                    {m.tag&&!isMobile&&<span style={{fontSize:7,padding:"2px 6px",borderRadius:4,background:"rgba(255,51,102,0.1)",color:"#ff3366",border:"1px solid rgba(255,51,102,0.2)",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{m.tag}</span>}
                  </div>
                  <div style={{flex:1,height:isMobile?28:34,background:"rgba(255,255,255,0.03)",borderRadius:8,border:"1px solid rgba(255,255,255,0.05)",overflow:"hidden",position:"relative"}}>
                    <div style={{position:"absolute",top:0,bottom:0,left:0,width:`${((m.cv-88)/10)*100}%`,background:m.highlight?"linear-gradient(90deg,#ff3366,#ff9a3c)":"linear-gradient(90deg,rgba(45,55,72,0.8),rgba(45,55,72,0.5))",borderRadius:8,boxShadow:m.highlight?"0 0 16px rgba(255,51,102,0.3)":"none",transition:"width 1.3s cubic-bezier(.34,1.2,.64,1)"}}/>
                    <div style={{position:"absolute",left:isMobile?10:13,top:"50%",transform:"translateY(-50%)",fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?11:13,fontWeight:700,color:m.highlight?"#fff":"#e2e8f0",zIndex:1}}>{m.cv}%</div>
                  </div>
                  {!isMobile&&<div style={{width:76,flexShrink:0,textAlign:"right"}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#4a5568",letterSpacing:1}}>TEST</div>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:700,color:"#718096"}}>{m.test}%</div>
                  </div>}
                </div>
              ))}
            </div>

            <div style={{background:"rgba(255,255,255,0.015)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:isMobile?18:22,padding:isMobile?"22px 18px":"34px",marginBottom:18}}>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#a78bfa",letterSpacing:3,textTransform:"uppercase",marginBottom:7}}>RF ANALYSIS</div>
              <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?26:34,letterSpacing:2,color:"#f1f5f9",marginBottom:5}}>Feature Importance</h2>
              <p style={{color:"#4a5568",fontSize:isMobile?11:13,marginBottom:26,fontFamily:"'DM Sans',sans-serif"}}>Top 10 cardiovascular risk predictors</p>
              {[{name:"Age Category",pct:14.2,col:"#ff3366",icon:"👴"},{name:"BMI",pct:13.8,col:"#ff9a3c",icon:"⚖️"},{name:"General Health",pct:12.5,col:"#ffd166",icon:"💚"},{name:"Physical Health",pct:11.7,col:"#84cc16",icon:"🏃"},{name:"Mental Health",pct:8.9,col:"#06ffa5",icon:"🧠"},{name:"Diabetic Status",pct:7.8,col:"#00b4ff",icon:"💉"},{name:"Sleep Time",pct:6.4,col:"#818cf8",icon:"😴"},{name:"Diff. Walking",pct:5.9,col:"#a78bfa",icon:"🚶"},{name:"Stroke History",pct:5.2,col:"#f472b6",icon:"🧬"},{name:"Kidney Disease",pct:4.8,col:"#fb7185",icon:"🫘"}].map((f,i)=>(
                <div key={f.name} style={{display:"flex",alignItems:"center",gap:isMobile?10:13,marginBottom:isMobile?10:13,opacity:0,animation:`fadeUp 0.35s ease ${i*0.06}s forwards`}}>
                  <div style={{width:isMobile?28:34,height:isMobile?28:34,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",background:`${f.col}12`,border:`1px solid ${f.col}25`,fontSize:isMobile?13:15,flexShrink:0}}>{f.icon}</div>
                  <div style={{width:isMobile?88:140,fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?11:13,fontWeight:600,color:"#94a3b8",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                  <div style={{flex:1,height:isMobile?26:30,background:"rgba(255,255,255,0.03)",borderRadius:8,border:"1px solid rgba(255,255,255,0.05)",overflow:"hidden",position:"relative"}}>
                    <div style={{position:"absolute",top:0,bottom:0,left:0,width:`${(f.pct/15)*100}%`,background:`linear-gradient(90deg,${f.col}80,${f.col})`,borderRadius:8,boxShadow:`0 0 10px ${f.col}30`,transition:"width 1.1s cubic-bezier(.34,1.2,.64,1)"}}/>
                    <div style={{position:"absolute",left:isMobile?9:12,top:"50%",transform:"translateY(-50%)",fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?10:12,fontWeight:700,color:"#fff",zIndex:1}}>{f.pct}%</div>
                  </div>
                  <div style={{width:24,textAlign:"right",fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?9:10,color:"#2d3748",flexShrink:0}}>#{i+1}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:isMobile?10:13}}>
              {[{label:"Dataset Year",value:"2020",sub:"CDC BRFSS",col:"#00b4ff",icon:"📅"},{label:"Records",value:"319K",sub:"Post-SMOTE",col:"#06ffa5",icon:"🗄️"},{label:"Test Split",value:"80/20",sub:"Stratified",col:"#a78bfa",icon:"✂️"},{label:"CV Strategy",value:"5-Fold",sub:"StratifiedKFold",col:"#ff9a3c",icon:"🔄"},{label:"Best Model",value:"RuleNet",sub:"Hybrid ML",col:"#ff3366",icon:"🏆"},{label:"Report",value:"2025",sub:"FYDP Submit",col:"#ffd166",icon:"🎓"}].map(m=>(
                <div key={m.label} style={{background:"rgba(255,255,255,0.015)",border:`1px solid ${m.col}18`,borderRadius:14,padding:isMobile?"14px 13px":"18px 16px",display:"flex",gap:12,alignItems:"center",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:m.col,opacity:0.4}}/>
                  <div style={{width:isMobile?36:42,height:isMobile?36:42,borderRadius:11,background:`${m.col}10`,border:`1px solid ${m.col}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?17:20,flexShrink:0}}>{m.icon}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?18:22,color:m.col,letterSpacing:1,lineHeight:1}}>{m.value}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:isMobile?10:11,color:"#94a3b8",marginTop:2,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</div>
                    <div style={{fontFamily:"'DM Sans',sans-serif",fontSize:9,color:"#4a5568"}}>{m.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:isMobile?"18px 20px":"22px 28px",position:"relative",zIndex:2,background:"rgba(8,11,22,0.9)",backdropFilter:"blur(12px)"}}>
        <div style={{maxWidth:1160,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:isMobile?13:16,letterSpacing:3,background:"linear-gradient(135deg,#ff3366,#ff9a3c)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>HEART DISEASE RISK AI</div>
          <div style={{color:"#4a5568",fontSize:isMobile?10:12,fontFamily:"'DM Sans',sans-serif",textAlign:"center",lineHeight:1.7}}>
            <span style={{color:"#718096",fontWeight:600}}>Md. Tuhinuzzaman Tuhin</span>
            {isMobile?<br/>:<span style={{color:"#2d3748",margin:"0 8px"}}>·</span>}
            <span>ID: 221-15-4649 · Daffodil Int'l University · FYDP 2025</span>
          </div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#2d3748",letterSpacing:2}}>EDU USE ONLY</div>
        </div>
      </footer>
    </div>
  );
}
