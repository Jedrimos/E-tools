import { useState, useRef, useCallback, useEffect } from "react";

// ── Stammdaten ──
const STD_SICHERUNGEN = [
  { id:"B6",     label:"B6",     te:1, ampere:6,  phase:1 },
  { id:"B10",    label:"B10",    te:1, ampere:10, phase:1 },
  { id:"B13",    label:"B13",    te:1, ampere:13, phase:1 },
  { id:"B16",    label:"B16",    te:1, ampere:16, phase:1 },
  { id:"B20",    label:"B20",    te:1, ampere:20, phase:1 },
  { id:"B25",    label:"B25",    te:1, ampere:25, phase:1 },
  { id:"B32",    label:"B32",    te:1, ampere:32, phase:1 },
  { id:"C16",    label:"C16",    te:1, ampere:16, phase:1 },
  { id:"C20",    label:"C20",    te:1, ampere:20, phase:1 },
  { id:"C25",    label:"C25",    te:1, ampere:25, phase:1 },
  { id:"B16_3P", label:"B16 3P", te:3, ampere:16, phase:3 },
  { id:"B20_3P", label:"B20 3P", te:3, ampere:20, phase:3 },
  { id:"B25_3P", label:"B25 3P", te:3, ampere:25, phase:3 },
  { id:"B32_3P", label:"B32 3P", te:3, ampere:32, phase:3 },
  { id:"B63_3P", label:"B63 3P", te:3, ampere:63, phase:3 },
];

const FI_BEMESSUNG   = [25, 40, 63];
const FI_TYPEN_LISTE = ["AC","A","F","B"];
const FI_FEHLERSTROM = [10, 30, 100, 300, 500];
const FI_POLE        = [2, 4];

const fiMaxTE         = (pole) => pole === 4 ? 8 : 10;
const fiPhasenschiene = (pole) => pole === 4 ? "3-phasig" : "1-phasig";
const fiBeschreibung  = (fi)   => `FI ${fi.bemessung}A Typ ${fi.fiTyp} ${fi.fehlerstrom}mA ${fi.pole}P`;

// ── Toast Notification ──
const Toast = ({toasts}) => (
  <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
    {toasts.map(t=>(
      <div key={t.id} style={{background:t.type==="error"?"#2a1515":t.type==="success"?"#0f2a1a":"var(--bg3)",
        border:`1px solid ${t.type==="error"?"var(--red)":t.type==="success"?"var(--green)":"var(--border2)"}`,
        borderRadius:10,padding:"10px 16px",color:t.type==="error"?"var(--red)":t.type==="success"?"var(--green)":"var(--text2)",
        fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8,
        animation:"slideIn 0.2s ease",boxShadow:"0 4px 20px rgba(0,0,0,0.4)",minWidth:200,maxWidth:320}}>
        <span>{t.type==="error"?"⚠":"✓"}</span>
        <span>{t.msg}</span>
      </div>
    ))}
  </div>
);

const STD_STOCKWERKE = ["KG","EG","OG","OG1","OG2","DG","Außen","Technik"];
const STD_RAEUME = ["Küche","Wohnzimmer","Esszimmer","Schlafzimmer","Kinderzimmer","Bad","WC","Gäste-WC","Flur","Diele","Keller","Garage","Hauswirtschaft","Büro","Technikraum","Sauna","Terrasse","Carport"];
const PHASEN = ["Auto","L1","L2","L3"];

const KABEL_TYP_OPTIONEN = ["NYM-J","NYY-J","H07V-K","LIYY"];
const KABEL_QS_OPTIONEN  = ["1.5","2.5","4","6","10","16"];
const STD_ADERN          = [3,5,7,10];

function kabelId(typ, adern, qs)    { return `${typ}_${adern}x${qs}`; }
function kabelLabel(typ, adern, qs) { return `${typ} ${adern}×${qs}mm²`; }
function kabelInfoFromId(id) {
  if (!id) return { typ:"NYM-J", adern:3, qs:"1.5" };
  const m = id.match(/^(.+?)_(\d+)x(.+)$/);
  if (m) return { typ:m[1], adern:Number(m[2]), qs:m[3] };
  return { typ:"NYM-J", adern:3, qs:"2.5" };
}

// Legacy-IDs aus alten Projekten mappen
const KABEL_LEGACY = {
  "1.5":"NYM-J_3x1.5","2.5":"NYM-J_3x2.5","4":"NYM-J_3x4","6":"NYM-J_3x6","10":"NYM-J_3x10","16":"NYM-J_3x16",
  "nym3x15":"NYM-J_3x1.5","nym3x25":"NYM-J_3x2.5","nym5x25":"NYM-J_5x2.5","nym5x6":"NYM-J_5x6",
  "nym7x15":"NYM-J_7x1.5","nym7x25":"NYM-J_7x2.5",
};
function resolveKabeltyp(id) { return KABEL_LEGACY[id] || id || "NYM-J_3x1.5"; }

const SW_COLOR_DEFAULT = { KG:"var(--purple)",EG:"var(--svp)",OG:"#34c98a",OG1:"var(--green)",OG2:"#4bc8e8",DG:"var(--red)",Außen:"#e87040",Technik:"var(--text2)" };
const SW_COLOR_PALETTE = ["var(--purple)","var(--svp)","var(--green)","#4bc8e8","var(--red)","#e87040","#d45db5","#5bc4a8","#a0c43a","#f06060","#60a0f0","#c07a30","var(--text2)"];
function randSwColor(used=[]) {
  const avail = SW_COLOR_PALETTE.filter(x=>!used.includes(x));
  return avail.length ? avail[Math.floor(Math.random()*avail.length)] : SW_COLOR_PALETTE[Math.floor(Math.random()*SW_COLOR_PALETTE.length)];
}
const PH_COLOR = { L1:"#ff6b6b", L2:"#f5a040", L3:"#4bc8e8" };
const PH_BG    = { L1:"rgba(255,107,107,0.12)", L2:"rgba(245,160,64,0.12)", L3:"rgba(75,200,232,0.12)" };
const PH_BORDER= { L1:"rgba(255,107,107,0.4)",  L2:"rgba(245,160,64,0.4)",  L3:"rgba(75,200,232,0.4)" };

function uid() { return Math.random().toString(36).slice(2,9); }

// Kabel = einzelne Ader/Leitung ohne Sicherungs-Zuordnung
const mkKabel = (sw="EG") => ({
  id: uid(), bezeichnung:"", raum:"", stockwerk:sw,
  kabelTyp:"NYM-J", kabelAdern:3, kabelQs:"1.5",
});

// Sicherung = Leitungsschutzschalter mit 1–n Kabeln
const mkSicherung = () => ({
  id: uid(), kabelIds:[], sicherung:"B16", phase:"Auto", istFILS:false, dreipolig:false,
  filsBemessung:40, filsTyp:"A", filsFehlerstrom:30, filsPole:4,
});

const mkFI = () => ({ id:uid(), bemessung:40, fiTyp:"A", fehlerstrom:30, pole:4, phasenschiene:true });

// ── Planverteilung ──
function verteile(sicherungen, fiKonfigs) {
  const normal = sicherungen.filter(s => !s.istFILS);
  const fils   = sicherungen.filter(s =>  s.istFILS);
  const warnungen = [];
  const gruppen = fiKonfigs.map(f => ({ ...f, stromkreise:[], belegteTE:0, lastA:0, phasen:{L1:0,L2:0,L3:0} }));
  if (!fiKonfigs.length || !normal.length) return { gruppen, fils:fils.map(s=>({...s,assignedPhase:"3P"})), warnungen };

  const swFIs={}, raumFIs={};
  const sortiert = [...normal].sort((a,b) => {
    const sa=STD_SICHERUNGEN.find(x=>x.id===a.sicherung), sb=STD_SICHERUNGEN.find(x=>x.id===b.sicherung);
    if ((sb?.phase||1)!==(sa?.phase||1)) return (sb?.phase||1)-(sa?.phase||1);
    return (sb?.ampere||0)-(sa?.ampere||0);
  });

  for (const sk of sortiert) {
    const sInfo = STD_SICHERUNGEN.find(s=>s.id===sk.sicherung);
    const te=sInfo?.te||1, amp=sInfo?.ampere||16;
    const rKey = sk.raumKey||"";
    const kands = gruppen.map((g,i)=>({g,i})).filter(({g})=>g.belegteTE+te<=fiMaxTE(g.pole));
    let ziel = -1;
    if (kands.length > 0) {
      ziel = kands.map(({g,i}) => {
        let s=0;
        if (raumFIs[rKey]?.has(i)) s+=1000;
        if (swFIs[sk.stockwerkKey]?.has(i)) s+=100;
        s+=(g.belegteTE/fiMaxTE(g.pole))*50;
        return {i,s};
      }).sort((a,b)=>a.s-b.s)[0].i;
    } else {
      warnungen.push(`⚠️ Kein Platz für "${sk.label||sk.sicherung}" – TE-Limit erreicht!`);
      ziel = gruppen.reduce((b,g,i)=>g.belegteTE<gruppen[b].belegteTE?i:b,0);
    }
    const is3p=(sInfo?.phase||1)===3;
    const assignedPhase=sk.phase==="Auto"
      ? (is3p?"3P":Object.entries(gruppen[ziel].phasen).reduce((a,b)=>a[1]<=b[1]?a:b)[0])
      : sk.phase;
    gruppen[ziel].stromkreise.push({...sk, assignedPhase, is3p, overflow:kands.length===0});
    gruppen[ziel].belegteTE+=te; gruppen[ziel].lastA+=amp;
    if (is3p) { gruppen[ziel].phasen.L1+=amp; gruppen[ziel].phasen.L2+=amp; gruppen[ziel].phasen.L3+=amp; }
    else gruppen[ziel].phasen[assignedPhase]+=amp;
    if (!swFIs[sk.stockwerkKey]) swFIs[sk.stockwerkKey]=new Set();
    swFIs[sk.stockwerkKey].add(ziel);
    if (!raumFIs[rKey]) raumFIs[rKey]=new Set();
    raumFIs[rKey].add(ziel);
  }
  return { gruppen, fils:fils.map(s=>({...s,assignedPhase:"3P"})), warnungen };
}

// ── Stückliste ──
// Klemmen werden NACH ADERN berechnet, nicht nach Sicherungsausgängen:
//   3-adrig  → 1× mit PE
//   5-adrig  → 1× mit PE + 1× ohne PE (N) + N-Schieber
//   7-adrig  → 1× mit PE + 2× ohne PE
//   10-adrig → 1× mit PE + 3× ohne PE
//   usw. jede weitere gerade Ader = 1× ohne PE
// Pro FI-Block: N-Einspeiseklemme + Kabelklemmen + Abdeckkappe + N-Endklemme
// N-Durchgang ist in die Reihenklemme mit PE integriert (kein separates Bauteil)
// TODO: Klemmensystem wählbar machen (Phoenix Contact, Weidmüller, WAGO) mit jeweiligem Rastermaß
//   Phoenix Contact: 6,2mm · Weidmüller: 6mm · WAGO 281: 5,2mm
// TODO: Brückenlänge N-Einspeisung → N-Endklemme = (Anzahl Klemmen + Anzahl Abdeckkappen) × Rastermaß
//   Abdeckkappen sind sehr flach (~1-2mm, messen!), müssen aber trotzdem addiert werden
// KNX: zusätzlich 1× Reserveklemme mit PE + Abdeckkappe pro FI-Block
// FILS: 1× Reihenklemme mit PE (kein N-Einspeisung/Endklemme), dann Kabelklemmen nach Adern
function klemmenFuerKabel(adern) {
  // Klemme ohne PE ist 2-polig → nimmt 2 Adern auf
  // 3-adrig (L,N,PE)     → 1x mit PE, 0x ohne PE
  // 5-adrig (L1-3,N,PE)  → 1x mit PE, 1x ohne PE
  // 7-adrig              → 1x mit PE, 2x ohne PE
  // Formel: ohnePE = floor((adern-3)/2)
  const a = Math.max(3, adern||3);
  return { mitPE:1, ohnePE:Math.floor((a-3)/2) };
}

function berechneStueckliste(plan, mitRK, alleKabel, istKNX=false) {
  if (!plan) return [];
  const items={};
  const add=(key,label,menge,kat)=>{ if(!items[key])items[key]={label,menge:0,kat}; items[key].menge+=menge; };
  const sichCount={};

  plan.gruppen.forEach(fi => {
    // FI-Schutzschalter
    add(`fi_${fi.bemessung}_${fi.fiTyp}_${fi.fehlerstrom}_${fi.pole}`,`FI-Schutzschalter ${fiBeschreibung(fi)}`,1,"FI-Schutzschalter");
    // Phasenschiene
    if (fi.phasenschiene) {
      add(`ps_${fi.pole}p`,`Phasenschiene ${fiPhasenschiene(fi.pole)}`,1,"Phasenschiene");
      add("abdeckung_ps","Abdeckung Phasenschiene (links+rechts)",2,"Phasenschiene");
      const leer=Math.max(0,fiMaxTE(fi.pole)-fi.belegteTE);
      if (leer>0) add("abdeckkappe_pol","Abdeckkappe (leere Polstelle)",leer,"Phasenschiene");
    }
    // LSS zählen
    fi.stromkreise.forEach(sk => {
      const sInfo=STD_SICHERUNGEN.find(s=>s.id===sk.sicherung);
      const sKey=`sich_${sk.sicherung}`;
      if (!sichCount[sKey]) sichCount[sKey]={label:`Leitungsschutzschalter ${sInfo?.label}`,count:0,kat:"Leitungsschutzschalter"};
      sichCount[sKey].count++;
    });
    // Reihenklemmen pro FI-Block — exakt wie buildSeq
    if (mitRK) {
      // Immer: PE-Einspeisung + N-Einspeisung
      add("pe_einspeisung","PE-Einspeiseklemme (Erdung)",1,"Reihenklemmen");
      add("n_einspeisung","N-Einspeiseklemme",1,"Reihenklemmen");
      // Kabelklemmen
      let hatKlemmen=0;
      fi.stromkreise.forEach(sk => {
        (sk.kabelIds||[]).forEach(kid => {
          const k = alleKabel.find(x=>x.id===kid);
          if (!k) return;
          const {mitPE,ohnePE} = klemmenFuerKabel(k.kabelAdern);
          add("rk_mit_pe","Reihenklemme mit PE (3-polig)",mitPE,"Reihenklemmen");
          if (ohnePE>0) add("rk_ohne_pe","Reihenklemme ohne PE (2-polig)",ohnePE,"Reihenklemmen");
          hatKlemmen++;
        });
      });
      // KNX: erst Kappe, dann Reserve, dann eigene Kappe
      if (istKNX) {
        add("abdeckkappe_orange","Abdeckkappe orange (Trennschutz)",1,"Reihenklemmen");
        add("rk_reserve_knx","Reserveklemme mit PE (KNX)",1,"Reihenklemmen");
      }
      // Abdeckkappe wenn Klemmen oder KNX vorhanden
      if (hatKlemmen>0||istKNX) {
        add("abdeckkappe_orange","Abdeckkappe orange (Endschutz Klemmenblock)",1,"Reihenklemmen");
      }
      // N-Endklemme: immer (weil N-Einspeisung immer da ist)
      add("n_endklemme","N-Endklemme",1,"Reihenklemmen");
    }
  });

  // FILS — exakt wie buildSeq FILS-Zweig
  plan.fils.forEach(sk => {
    const sInfo=STD_SICHERUNGEN.find(s=>s.id===sk.sicherung);
    const sKey=`sich_fils_${sk.sicherung}`;
    if (!sichCount[sKey]) sichCount[sKey]={label:`Leitungsschutzschalter ${sInfo?.label} (FILS)`,count:0,kat:"FILS"};
    sichCount[sKey].count++;
    const filsBem=sk.filsBemessung||40, filsTyp=sk.filsTyp||"A", filsFs=sk.filsFehlerstrom||30, filsPole=sk.filsPole||4;
    add(`fi_fils_${filsBem}_${filsTyp}_${filsFs}_${filsPole}`,
        `FI-Schutzschalter ${filsBem}A Typ ${filsTyp} ${filsFs}mA ${filsPole}P (FILS)`,1,"FILS");
    if (mitRK) {
      // FILS: PE-Einspeiseklemme, dann Kabelklemmen, dann Kappe wenn Klemmen vorhanden
      add("pe_einspeisung","PE-Einspeiseklemme (Erdung)",1,"Reihenklemmen");
      let hatKlemmen=0;
      (sk.kabelIds||[]).forEach(kid => {
        const k = alleKabel.find(x=>x.id===kid);
        if (!k) return;
        const {mitPE,ohnePE} = klemmenFuerKabel(k.kabelAdern);
        add("rk_mit_pe","Reihenklemme mit PE (3-polig)",mitPE,"Reihenklemmen");
        if (ohnePE>0) add("rk_ohne_pe","Reihenklemme ohne PE (2-polig)",ohnePE,"Reihenklemmen");
        hatKlemmen++;
      });
      if (hatKlemmen>0) add("abdeckkappe_orange","Abdeckkappe orange (Endschutz Klemmenblock)",1,"Reihenklemmen");
    }
  });

  Object.entries(sichCount).forEach(([key,val])=>add(key,val.label,val.count,val.kat));
  const order=["FI-Schutzschalter","Leitungsschutzschalter","FILS","Phasenschiene","Reihenklemmen"];
  return Object.values(items).sort((a,b)=>order.indexOf(a.kat)-order.indexOf(b.kat));
}

// ── Empfohlene Sicherung anhand der stärksten Ader ──
// dreipolig wird von der Sicherung gesteuert, nicht vom Kabel
function empfehleSicherung(kabelIds, alleKabel, dreipolig=false) {
  const kabel = kabelIds.map(id=>alleKabel.find(k=>k.id===id)).filter(Boolean);
  if (!kabel.length) return dreipolig ? "B16_3P" : "B16";
  const maxQs = Math.max(...kabel.map(k=>parseFloat(k.kabelQs)||1.5));
  if (dreipolig) {
    if (maxQs>=6) return "B32_3P";
    if (maxQs>=4) return "B20_3P";
    return "B16_3P";
  }
  if (maxQs>=6)  return "B32";
  if (maxQs>=4)  return "B20";
  if (maxQs>=2.5) return "B16";
  return "B10";
}

// ── Persistenz ──
function loadProjekte() { try { return JSON.parse(localStorage.getItem("svp_projekte")||"[]"); } catch { return []; } }
function saveProjekte(p) { localStorage.setItem("svp_projekte", JSON.stringify(p)); }

// ── API ──
const API_DEFAULTS = { url:"https://api.anthropic.com/v1/messages", model:"claude-sonnet-4-20250514", apiKey:"", format:"openai" };
function ladeApiConfig() { try { return { ...API_DEFAULTS, ...JSON.parse(localStorage.getItem("svp_api_config")||"{}") }; } catch { return {...API_DEFAULTS}; } }
function speichereApiConfig(cfg) { localStorage.setItem("svp_api_config", JSON.stringify(cfg)); }

async function callVisionAPI(base64, prompt) {
  const cfg = ladeApiConfig();
  const headers = {"Content-Type":"application/json"};
  if (cfg.apiKey) headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  if (cfg.url.includes("anthropic.com")) {
    headers["x-api-key"]=cfg.apiKey; headers["anthropic-version"]="2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"]="true";
    delete headers["Authorization"];
  }
  let body;
  if (cfg.url.includes("anthropic.com") && cfg.url.includes("/messages")) {
    body=JSON.stringify({model:cfg.model,max_tokens:2000,messages:[{role:"user",content:[
      {type:"image",source:{type:"base64",media_type:"image/jpeg",data:base64}},
      {type:"text",text:prompt}
    ]}]});
  } else {
    body=JSON.stringify({model:cfg.model,max_tokens:2000,messages:[{role:"user",content:[
      {type:"image_url",image_url:{url:`data:image/jpeg;base64,${base64}`}},
      {type:"text",text:prompt}
    ]}]});
  }
  const resp = await fetch(cfg.url,{method:"POST",headers,body});
  if (!resp.ok) { const e=await resp.text(); throw new Error(`API ${resp.status}: ${e.slice(0,200)}`); }
  const json = await resp.json();
  return json?.choices?.[0]?.message?.content || json?.content?.[0]?.text || json?.message?.content || "";
}

// ── Kleine UI-Komponenten ──
function ACInput({ value, onChange, suggestions, placeholder, style={}, onCommit }) {
  const [open, setOpen] = useState(false);
  const filtered = (suggestions||[]).filter(s=>!value||s.toLowerCase().includes(value.toLowerCase()));
  return (
    <div style={{position:"relative"}}>
      <input value={value} onChange={e=>{onChange(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)}
        onBlur={()=>{setTimeout(()=>setOpen(false),150);if(onCommit&&value&&value.trim().length>1)onCommit(value.trim());}}
        placeholder={placeholder}
        style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,padding:"7px 9px",color:"var(--text)",fontSize:13,...style}}/>
      {open&&filtered.length>0&&(
        <div style={{position:"absolute",top:"calc(100% + 3px)",left:0,right:0,background:"var(--bg3)",border:"1px solid #1a7abf55",borderRadius:7,zIndex:300,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}}>
          {filtered.map(s=>(
            <div key={s} onMouseDown={()=>{onChange(s);setOpen(false);if(onCommit)onCommit(s);}}
              style={{padding:"8px 10px",cursor:"pointer",fontSize:13,borderBottom:"1px solid #111",color:"var(--text)"}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--border2)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

const I = (props) => <input {...props} style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",color:"var(--text)",fontSize:13,transition:"border-color 0.15s",...props.style}}/>;
const S = ({children,...props}) => <select {...props} style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",color:"var(--text)",fontSize:13,appearance:"none",WebkitAppearance:"none",transition:"border-color 0.15s",...props.style}}>{children}</select>;
const Card = ({title,sub,icon,children}) => <div className="fade-in" style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"20px",marginBottom:16}}>{(title||icon)&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:sub?5:16}}>{icon&&<span style={{fontSize:18}}>{icon}</span>}<div style={{fontWeight:700,fontSize:15,color:"var(--text)"}}>{title}</div></div>}{sub&&<div style={{fontSize:12,color:"var(--text3)",marginBottom:16,lineHeight:1.5}}>{sub}</div>}{children}</div>;
const F = ({label,children}) => <div style={{marginBottom:10}}><div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>{label}</div>{children}</div>;
const G2 = ({children}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{children}</div>;
const St = ({label,val,color="var(--text2)"}) => <div><div style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px"}}>{label}</div><div style={{fontSize:18,fontWeight:800,color,marginTop:1}}>{val}</div></div>;

const bPrimary={background:"var(--svp)",border:"none",color:"#fff",borderRadius:8,padding:"11px 20px",cursor:"pointer",fontSize:13,fontWeight:700,transition:"opacity 0.15s,transform 0.15s"};
const bSec={background:"transparent",border:"1px solid var(--border2)",color:"var(--text2)",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:12,transition:"border-color 0.15s,color 0.15s"};
const bSec2={background:"transparent",border:"1px solid var(--border)",color:"var(--text3)",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11};
const bDanger={background:"transparent",border:"1px solid rgba(255,107,107,0.25)",color:"#ff6b6b",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11};
const bDash={background:"transparent",border:"1px dashed var(--border2)",color:"var(--text3)",borderRadius:8,padding:"9px",cursor:"pointer",fontSize:12,transition:"border-color 0.15s,color 0.15s"};

// ── API Settings Modal ──
function ApiSettingsModal({ onClose }) {
  const [cfg, setCfg] = useState(ladeApiConfig);
  const [ok, setOk] = useState(false);
  const presets=[
    {label:"Ollama (lokal)",url:"http://localhost:11434/v1/chat/completions",model:"llava",format:"openai"},
    {label:"Anthropic Claude",url:"https://api.anthropic.com/v1/messages",model:"claude-sonnet-4-20250514",format:"openai"},
    {label:"OpenAI",url:"https://api.openai.com/v1/chat/completions",model:"gpt-4o",format:"openai"},
    {label:"LM Studio",url:"http://localhost:1234/v1/chat/completions",model:"llava",format:"openai"},
  ];
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.92)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,width:"100%",maxWidth:480,padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:16,fontWeight:800}}>⚙️ KI-API Einstellungen</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text3)",fontSize:20,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {presets.map(p=><button key={p.label} onClick={()=>setCfg(c=>({...c,...p}))}
            style={{background:"var(--border)",border:"1px solid var(--border2)",borderRadius:7,padding:"5px 10px",color:"var(--text2)",fontSize:11,cursor:"pointer"}}>{p.label}</button>)}
        </div>
        <F label="API Endpoint URL"><I value={cfg.url} onChange={e=>setCfg(c=>({...c,url:e.target.value}))} style={{fontFamily:"var(--mono)",fontSize:11}}/></F>
        <F label="Modell"><I value={cfg.model} onChange={e=>setCfg(c=>({...c,model:e.target.value}))} style={{fontFamily:"var(--mono)",fontSize:11}}/></F>
        <F label="API Key (optional)"><I type="password" value={cfg.apiKey} onChange={e=>setCfg(c=>({...c,apiKey:e.target.value}))} placeholder="sk-... oder leer"/></F>
        <div style={{background:"rgba(33,150,201,0.06)",border:"1px solid #1a7abf33",borderRadius:8,padding:"10px",marginBottom:16,fontSize:11,color:"var(--blue)"}}>
          💡 Für lokale Nutzung: <code style={{background:"#0a0a0a",padding:"1px 4px",borderRadius:3}}>OLLAMA_ORIGINS=* ollama serve</code> · dann <code style={{background:"#0a0a0a",padding:"1px 4px",borderRadius:3}}>ollama pull llava</code>
        </div>
        <button onClick={()=>{speichereApiConfig(cfg);setOk(true);setTimeout(()=>setOk(false),2000);}}
          style={{...bPrimary,width:"100%"}}>{ok?"✓ Gespeichert!":"Speichern"}</button>
      </div>
    </div>
  );
}

// ── Foto Import Modal ──
function FotoImportModal({ onClose, onImport }) {
  const [preview, setPreview] = useState(null);
  const [base64, setBase64] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [ergebnis, setErgebnis] = useState(null);
  const [fehler, setFehler] = useState("");
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setBase64(e.target.result.split(",")[1]);
      setPhase("idle");
    };
    reader.readAsDataURL(file);
  };

  const analysiere = async () => {
    if (!base64) return;
    setPhase("loading"); setFehler("");
    try {
      const prompt = `Du bist Elektrotechnik-Experte. Analysiere diese handgeschriebene Kabelliste.
Jede Zeile ist ein einzelnes Kabel/eine Leitung, z.B.:
- "Küche Steckdose 3x2,5"  → ein Kabel
- "Herd 5x2,5"             → ein Kabel (3-phasig)

Gib JSON-Array zurück, ein Objekt pro Kabel:
- "bezeichnung": Name/Beschreibung (z.B. "Steckdosen Küche")
- "raum": Raumname oder ""
- "stockwerk": KG/EG/OG1/OG2/DG oder "EG"
- "kabelTyp": "NYM-J" standard, sonst wie angegeben
- "kabelAdern": Zahl (3 einphasig, 5 dreiphasig)
- "kabelQs": Querschnitt als String ("1.5","2.5","4","6")
- "dreipolig": true wenn 5+ Adern oder Herd/Wallbox/Sauna

NUR JSON, keine Backticks, kein Text davor/danach.`;
      const text = await callVisionAPI(base64, prompt);
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setErgebnis(parsed.map(item=>({...item,_sel:true})));
      setPhase("result");
    } catch(e) {
      setFehler("Analyse fehlgeschlagen: " + e.message);
      setPhase("error");
    }
  };

  const toggle = (idx) => setErgebnis(e=>e.map((x,i)=>i===idx?{...x,_sel:!x._sel}:x));
  const anzahl = ergebnis?.filter(x=>x._sel).length||0;

  const importieren = (ersetzen) => {
    const sel = ergebnis.filter(x=>x._sel);
    onImport(sel, ersetzen);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.92)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,width:"100%",maxWidth:600,maxHeight:"92vh",overflow:"auto",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:16,fontWeight:800}}>📷 Kabelliste aus Foto importieren</div>
            <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>Handgeschriebenes Blockblatt fotografieren und einlesen</div>
          </div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:22}}>×</button>
        </div>
        <div style={{padding:20,flex:1,overflow:"auto"}}>
          <div onClick={()=>inputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}
            style={{border:`2px dashed ${preview?"rgba(33,150,201,0.2)":"var(--border2)"}`,borderRadius:12,padding:preview?"10px":"28px",textAlign:"center",cursor:"pointer",marginBottom:14,background:"var(--bg2)"}}>
            {preview
              ? <><img src={preview} style={{maxWidth:"100%",maxHeight:180,borderRadius:8,objectFit:"contain"}} alt=""/><div style={{fontSize:11,color:"var(--blue)",marginTop:6}}>Anderes Foto wählen</div></>
              : <><div style={{fontSize:36,marginBottom:8}}>📋</div><div style={{fontSize:14,color:"var(--text3)",fontWeight:600}}>Foto antippen oder reinziehen</div><div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>JPG oder PNG · Blockblatt mit Kabelliste</div></>
            }
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>handleFile(e.target.files[0])} style={{display:"none"}}/>
          </div>
          {preview&&phase!=="result"&&(
            <button onClick={analysiere} disabled={phase==="loading"}
              style={{...bPrimary,width:"100%",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:phase==="loading"?0.6:1}}>
              {phase==="loading"?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⏳</span> Analysiere...</>:"🔍 Kabelliste analysieren"}
            </button>
          )}
          {phase==="error"&&<div style={{background:"#200000",border:"1px solid #e05252",borderRadius:8,padding:"10px 14px",marginBottom:12,color:"var(--red)",fontSize:12}}>⚠ {fehler}</div>}
          {phase==="result"&&ergebnis&&(
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{fontSize:13,color:"var(--green)",fontWeight:700}}>✓ {ergebnis.length} Kabel erkannt</div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>setErgebnis(e=>e.map(x=>({...x,_sel:true})))} style={{...bSec2,color:"var(--green)"}}>Alle</button>
                  <button onClick={()=>setErgebnis(e=>e.map(x=>({...x,_sel:false})))} style={bSec2}>Keine</button>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:280,overflowY:"auto",marginBottom:14}}>
                {ergebnis.map((item,idx)=>(
                  <div key={idx} onClick={()=>toggle(idx)}
                    style={{display:"flex",gap:10,alignItems:"center",background:item._sel?"var(--bg3)":"#0f0f0f",border:`1px solid ${item._sel?"rgba(33,150,201,0.15)":"var(--bg3)"}`,borderRadius:8,padding:"8px 12px",cursor:"pointer",opacity:item._sel?1:0.45}}>
                    <div style={{width:18,height:18,borderRadius:4,border:`2px solid ${item._sel?"var(--blue)":"var(--text3)"}`,background:item._sel?"var(--blue)":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {item._sel&&<span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:"var(--text)"}}>{item.bezeichnung||item.kabel}</div>
                      <div style={{fontSize:10,color:"var(--text3)",marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                        {item.raum&&<span style={{color:"rgba(33,150,201,0.6)"}}>{item.raum}</span>}
                        <span>{item.stockwerk}</span>
                        <span style={{color:"rgba(33,150,201,0.5)",fontFamily:"monospace"}}>{item.kabelTyp||"NYM-J"} {item.kabelAdern}×{item.kabelQs}mm²</span>
                        {item.dreipolig&&<span style={{color:"var(--purple)",fontWeight:600}}>3-phasig</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>importieren(false)} style={{...bPrimary,flex:2,opacity:anzahl===0?0.4:1}}>+ Hinzufügen ({anzahl})</button>
                <button onClick={()=>importieren(true)} style={{flex:1,background:"transparent",border:"1px solid #e0525244",color:"var(--red)",borderRadius:9,padding:"11px",cursor:"pointer",fontSize:12,fontWeight:600,opacity:anzahl===0?0.4:1}}>⚠ Ersetzen</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ── Hauptkomponente ──
// ══════════════════════════════════════════
export default function App() {
  const [step, setStep] = useState(1);
  const [projekt, setProjekt]     = useState({ name:"", adresse:"" });
  const [kabel, setKabel]         = useState([mkKabel()]);          // Step 2: Kabel
  const [sicherungen, setSicherungen] = useState([]);               // Step 3: Sicherungsgruppen
  const [fiKonfigs, setFiKonfigs] = useState([mkFI(), mkFI()]);     // Step 4: FI-Planung
  const [plan, setPlan]           = useState(null);                  // Step 5: Plan
  const [stockwerke, setStockwerke] = useState([]);
  const [raeume, setRaeume]       = useState([]);
  const [planTyp, setPlanTyp]     = useState("visuell");
  const [activeTab, setActiveTab] = useState("plan");
  const [mitRK, setMitRK]         = useState(null);
  const [istKNX, setIstKNX]         = useState(false);
  const [showKlemmen, setShowKlemmen] = useState(false);
  const [mitQV, setMitQV]           = useState(false);
  const [mitNBruecke, setMitNBruecke] = useState(false);
  const [editKabelId, setEditKabelId] = useState(null);
  const [showBeschriftung, setShowBeschriftung] = useState(false);
  const [showStueckliste, setShowStueckliste] = useState(false);
  const [showFoto, setShowFoto]   = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [projekte, setProjekte]   = useState(loadProjekte);
  const [showSave, setShowSave]   = useState(false);
  const [showLoad, setShowLoad]   = useState(false);
  const [saveName, setSaveName]   = useState("");
  const [newSW, setNewSW]         = useState("");
  const [newSWColor, setNewSWColor] = useState("var(--green)");
  const [showSWInput, setShowSWInput] = useState(false);
  const [swColorMap, setSwColorMap]  = useState({...SW_COLOR_DEFAULT});
  const [newRaum, setNewRaum]     = useState("");
  const [showRaumInput, setShowRaumInput] = useState(false);

  // ── Toast ──
  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((msg, type="success", dur=2500) => {
    const id = Date.now();
    setToasts(t=>[...t, {id, msg, type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), dur);
  }, []);

  // ── Undo (letzte Kabel/Sicherungs-Aktion) ──
  const [undoStack, setUndoStack] = useState([]);
  const pushUndo = useCallback((label, restoreFn) => {
    setUndoStack(s=>[...s.slice(-9), {label, restoreFn}]);
  }, []);
  const doUndo = () => {
    if(!undoStack.length) return;
    const last = undoStack[undoStack.length-1];
    last.restoreFn();
    setUndoStack(s=>s.slice(0,-1));
    showToast(`"${last.label}" wiederhergestellt`);
  };
  // Keyboard shortcut Ctrl+Z
  useEffect(()=>{
    const handler = (e) => {
      if((e.ctrlKey||e.metaKey) && e.key==='z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
    };
    window.addEventListener('keydown', handler);
    return ()=>window.removeEventListener('keydown', handler);
  }, [undoStack]);

  // Drag refs – Step 2 (Kabel sortieren) + Step 3 (Kabel auf Sicherungen ziehen)
  const dragKabelId   = useRef(null);
  const dragOverId    = useRef(null);
  const dragFromSich  = useRef(null); // null = aus Kabel-Pool, sonst sicherung.id
  // Plan-Drag
  const planDragSK = useRef(null), planDragFI = useRef(null);
  // Touch Drag
  const touchKabelId = useRef(null);
  const touchLastZone = useRef(null);
  const onTouchStartKabel = (e,kId) => { touchKabelId.current=kId; };
  const onTouchMoveKabel = (e) => {
    if(!touchKabelId.current) return;
    e.preventDefault();
    const t=e.touches[0];
    if(touchLastZone.current) touchLastZone.current.classList.remove('touch-over');
    const zone=document.elementFromPoint(t.clientX,t.clientY)?.closest?.('[data-sichid]');
    if(zone){ zone.classList.add('touch-over'); touchLastZone.current=zone; }
  };
  const onTouchEndKabel = (e) => {
    if(!touchKabelId.current) return;
    if(touchLastZone.current) touchLastZone.current.classList.remove('touch-over');
    const t=e.changedTouches[0];
    const zone=document.elementFromPoint(t.clientX,t.clientY)?.closest?.('[data-sichid]');
    if(zone){ weiseKabelZu(touchKabelId.current, zone.dataset.sichid); }
    touchKabelId.current=null; touchLastZone.current=null;
  };

  const swColor = sw => swColorMap[sw] || "#a0a0a0";
  const ensureRaum = r => { if(r&&r.trim().length>1&&!raeume.includes(r.trim())) setRaeume(rv=>[...rv,r.trim()]); };

  const addSW = () => {
    const v=newSW.trim();
    if(v&&!stockwerke.includes(v)){
      setStockwerke(s=>[...s,v]);
      setSwColorMap(m=>({...m,[v]:newSWColor}));
    }
    setNewSW(""); setShowSWInput(false);
    // precompute next random color
    setNewSWColor(c=>randSwColor(Object.values(swColorMap)));
  };
  const remSW = sw => setStockwerke(s=>s.filter(x=>x!==sw));
  const addRaum = () => { const v=newRaum.trim(); if(v&&!raeume.includes(v)) setRaeume(r=>[...r,v]); setNewRaum(""); setShowRaumInput(false); };
  const remRaum = r => setRaeume(rv=>rv.filter(x=>x!==r));

  // ── Kabel CRUD ──
  const addKabel = (sw) => { setKabel(k=>[...k, mkKabel(sw||k[k.length-1]?.stockwerk||"EG")]); };
  const remKabel = id => {
    const k0=kabel.find(x=>x.id===id);
    const kSnap=[...kabel]; const sSnap=[...sicherungen];
    setKabel(k=>k.filter(x=>x.id!==id));
    setSicherungen(s=>s.map(si=>({...si,kabelIds:si.kabelIds.filter(kid=>kid!==id)})));
    if(k0) { pushUndo(k0.bezeichnung||k0.raum||"Kabel", ()=>{setKabel(kSnap);setSicherungen(sSnap);}); showToast(`"${k0.bezeichnung||k0.raum||"Kabel"}" gelöscht — Ctrl+Z zum Rückgängig`,"error",3500); }
  };
  const updKabel = (id,k,v) => setKabel(ks=>ks.map(x=>{
    if(x.id!==id) return x;
    return {...x,[k]:v};
  }));
  const dupKabel = id => {
    const k=kabel.find(x=>x.id===id), idx=kabel.findIndex(x=>x.id===id);
    setKabel(ks=>[...ks.slice(0,idx+1),{...k,id:uid(),bezeichnung:k.bezeichnung?k.bezeichnung+"+":""},...ks.slice(idx+1)]);
  };

  // ── Sicherungen CRUD ──
  const addSicherung = () => setSicherungen(s=>[...s, mkSicherung()]);
  const remSicherung = id => {
    const s0=sicherungen.find(x=>x.id===id);
    const sSnap=[...sicherungen];
    setSicherungen(s=>s.filter(x=>x.id!==id));
    if(s0) { pushUndo(`Sicherung LS${sicherungen.indexOf(s0)+1}`, ()=>setSicherungen(sSnap)); showToast(`Sicherung gelöscht — Ctrl+Z zum Rückgängig`,"error",3500); }
  };
  const updSicherung = (id,k,v) => setSicherungen(s=>s.map(x=>x.id===id?{...x,[k]:v}:x));

  // Kabel einer Sicherung zuweisen (aus Pool oder aus anderer Sicherung)
  const weiseKabelZu = (kabelId, zielSichId) => {
    const zKabel=kabel.find(k=>k.id===kabelId);
    setSicherungen(s=>s.map(si=>{
      const ohneKabel = si.kabelIds.filter(id=>id!==kabelId);
      if(si.id===zielSichId && !si.kabelIds.includes(kabelId)) {
        const neueIds = [...ohneKabel, kabelId];
        // Auto-suggest: if no label yet, use first cable's Raum as hint
        return {...si, kabelIds:neueIds, sicherung:empfehleSicherung(neueIds,kabel,si.dreipolig)};
      }
      return {...si, kabelIds:ohneKabel};
    }));
  };

  const entferneKabelAusSicherung = (kabelId, sichId) => {
    setSicherungen(s=>s.map(si=>{
      if(si.id!==sichId) return si;
      const neueIds = si.kabelIds.filter(id=>id!==kabelId);
      return {...si, kabelIds:neueIds, sicherung: neueIds.length>0 ? empfehleSicherung(neueIds,kabel,si.dreipolig) : si.sicherung};
    }));
  };

  // FI CRUD
  const addFI = () => setFiKonfigs(f=>[...f,mkFI()]);
  const remFI = id => setFiKonfigs(f=>f.filter(x=>x.id!==id));
  const updFI = (id,k,v) => setFiKonfigs(f=>f.map(x=>x.id===id?{...x,[k]:v}:x));

  // Kabel-Drag (Step 2: Reihenfolge sortieren)
  const onKabelDragStart = (e,id) => { dragKabelId.current=id; e.dataTransfer.effectAllowed="move"; };
  const onKabelDragOver  = (e,id) => { e.preventDefault(); dragOverId.current=id; };
  const onKabelDrop      = ()     => {
    if(!dragKabelId.current||!dragOverId.current||dragKabelId.current===dragOverId.current)return;
    setKabel(ks=>{const a=[...ks],from=a.findIndex(x=>x.id===dragKabelId.current),to=a.findIndex(x=>x.id===dragOverId.current);const[item]=a.splice(from,1);a.splice(to,0,item);return a;});
    dragKabelId.current=null; dragOverId.current=null;
  };

  // Plan-Drag (Step 5) – verschiebt Sicherung von einer FI-Gruppe in eine andere
  const onPlanDragStart=(skId,fiId)=>{planDragSK.current=skId; planDragFI.current=fiId;};
  const verschiebeImPlan=(skId,vonIdx,zuIdx)=>{
    if(vonIdx===zuIdx||vonIdx<0||zuIdx<0)return;
    setPlan(p=>{
      const gruppen=[...p.gruppen.map(g=>({...g,stromkreise:[...g.stromkreise]}))];
      const von=gruppen[vonIdx], zu=gruppen[zuIdx];
      const skIdx=von.stromkreise.findIndex(s=>s.id===skId);
      if(skIdx<0)return p;
      const [sk]=von.stromkreise.splice(skIdx,1);
      zu.stromkreise.push(sk);
      const sInfo=STD_SICHERUNGEN.find(s=>s.id===sk.sicherung);
      const te=sInfo?.te||1, amp=sInfo?.ampere||16;
      von.belegteTE-=te; von.lastA-=amp;
      zu.belegteTE+=te;  zu.lastA+=amp;
      return {...p,gruppen};
    });
  };
  const onPlanDrop=targetIdx=>{
    if(!planDragSK.current)return;
    const vonIdx=plan.gruppen.findIndex(g=>g.id===planDragFI.current);
    verschiebeImPlan(planDragSK.current,vonIdx,targetIdx);
    planDragSK.current=null; planDragFI.current=null;
  };

  // Speichern/Laden
  const speichere = () => {
    if(!saveName.trim())return;
    const entry={id:uid(),name:saveName.trim(),datum:new Date().toLocaleDateString("de-DE"),projekt,fiKonfigs,kabel,sicherungen,stockwerke,raeume,swColorMap};
    const neu=[entry,...projekte.filter(p=>p.name!==saveName.trim())];
    setProjekte(neu); saveProjekte(neu); setShowSave(false); setSaveName("");
  };
  const lade = p => {
    setProjekt(p.projekt||{name:"",adresse:""});
    setFiKonfigs(p.fiKonfigs||[mkFI(),mkFI()]);
    // Legacy: alte Projekte hatten stromkreise, neue haben kabel+sicherungen
    if (p.kabel) {
      setKabel(p.kabel); setSicherungen(p.sicherungen||[]);
    } else if (p.stromkreise) {
      // Migration: alte stromkreise → kabel
      const migKabel = p.stromkreise.map(sk=>({
        id:sk.id, bezeichnung:sk.kabel||"", raum:sk.raum||"", stockwerk:sk.stockwerk||"EG",
        kabelTyp:sk.kabelTyp||"NYM-J", kabelAdern:sk.kabelAdern||3, kabelQs:sk.kabelQs||"2.5",
        dreipolig:!!sk.dreipolig,
      }));
      setKabel(migKabel);
      // jedes alte Kabel = eigene Sicherung (1:1 Migration)
      setSicherungen(p.stromkreise.map(sk=>({
        id:uid(), kabelIds:[sk.id], sicherung:sk.sicherung||"B16",
        phase:sk.phase||"Auto", istFILS:!!sk.istFILS,
      })));
    }
    setStockwerke(p.stockwerke||[]);
    if(p.swColorMap) setSwColorMap({...SW_COLOR_DEFAULT,...p.swColorMap});
    setRaeume(p.raeume||[]);
    setPlan(null); setMitRK(null); setStep(1); setShowLoad(false);
  };

  // ── WhatsApp Clipboard Export ──
  const [kopiert, setKopiert] = useState(null); // "stueckliste" | "beschriftung"
  const kopiereInZwischenablage = (text, typ) => {
    navigator.clipboard.writeText(text).then(()=>{
      setKopiert(typ);
      setTimeout(()=>setKopiert(null), 2500);
    }).catch(()=>{
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setKopiert(typ);
      setTimeout(()=>setKopiert(null), 2500);
    });
  };

  const buildStuecklisteText = () => {
    if(!plan||mitRK===null) return "";
    const sl = stueckliste;
    const datum = new Date().toLocaleDateString("de-DE");
    let txt = `⚡ *Stückliste – ${projekt.name||"Projekt"}*\n`;
    if(projekt.adresse) txt += `📍 ${projekt.adresse}\n`;
    txt += `📅 ${datum}\n`;
    txt += `\n`;
    let lastKat = "";
    sl.forEach(item => {
      if(item.kat !== lastKat){
        txt += `\n▸ *${item.kat}*\n`;
        lastKat = item.kat;
      }
      txt += `  ${item.menge}× ${item.label}\n`;
    });
    txt += `\n– SVP Elektrotechnik`;
    return txt;
  };

  const buildBeschriftungText = () => {
    if(!plan) return "";
    const datum = new Date().toLocaleDateString("de-DE");
    let txt = `🏷️ *Beschriftungsplan – ${projekt.name||"Projekt"}*\n`;
    if(projekt.adresse) txt += `📍 ${projekt.adresse}\n`;
    txt += `📅 ${datum}\n`;
    txt += `\n`;
    plan.gruppen.forEach((fi, fiIdx) => {
      const qNr = fiIdx+1;
      txt += `\n*Q${qNr}* – ${fiBeschreibung(fi)}\n`;
      fi.stromkreise.forEach((si, siIdx) => {
        const fLabel = `${qNr}F${siIdx+1}`;
        const sInfo = STD_SICHERUNGEN.find(s=>s.id===si.sicherung);
        const siKabel = si.kabel||[];
        const bezeichnung = siKabel.map(k=>k.bezeichnung||k.raum||"?").join(" + ")||"—";
        const raum = [...new Set(siKabel.map(k=>k.raum).filter(Boolean))].join(", ");
        txt += `  ${fLabel}  ${sInfo?.label||""}  ${bezeichnung}`;
        if(raum) txt += `  (${raum})`;
        txt += `\n`;
      });
    });
    if(plan.fils?.length>0){
      plan.fils.forEach((si, i) => {
        const qNr = plan.gruppen.length+i+1;
        txt += `\n*Q${qNr}* – FILS\n`;
        const sInfo = STD_SICHERUNGEN.find(s=>s.id===si.sicherung);
        const siKabel = si.kabel||[];
        const bezeichnung = siKabel.map(k=>k.bezeichnung||k.raum||"?").join(" + ")||"—";
        txt += `  ${qNr}F1  ${sInfo?.label||""}  ${bezeichnung}\n`;
      });
    }
    txt += `\n– SVP Elektrotechnik`;
    return txt;
  };
  const loescheProjekt = id => { const p=projekte.find(x=>x.id===id); const neu=projekte.filter(x=>x.id!==id); setProjekte(neu); if(p) showToast(`"${p.name}" gelöscht`,"error"); saveProjekte(neu); };

  // Foto-Import
  const handleFotoImport = (liste, ersetzen) => {
    const neueKabel = liste.map(item=>({
      id:uid(),
      bezeichnung: item.bezeichnung||item.kabel||"",
      raum:        item.raum||"",
      stockwerk:   item.stockwerk||"EG",
      kabelTyp:    item.kabelTyp||"NYM-J",
      kabelAdern:  Math.max(3,Math.min(20,Number(item.kabelAdern)||3)),
      kabelQs:     item.kabelQs||"2.5",
      dreipolig:   !!item.dreipolig,
    }));
    neueKabel.forEach(k=>{ if(k.raum)ensureRaum(k.raum); });
    if(ersetzen) { setKabel(neueKabel); setSicherungen([]); }
    else setKabel(ks=>[...ks.filter(x=>x.bezeichnung||x.raum),...neueKabel]);
    setShowFoto(false);
  };

  // Sicherungen vorbereiten für Verteilung
  const buildSicherungenFuerPlan = () => {
    return sicherungen.map(si=>{
      const kbs = si.kabelIds.map(id=>kabel.find(k=>k.id===id)).filter(Boolean);
      const hat3p = si.dreipolig; // von der Sicherung gesteuert
      const stockwerke_ = [...new Set(kbs.map(k=>k.stockwerk))];
      const raeume_ = [...new Set(kbs.map(k=>k.raum).filter(Boolean))];
      const label = kbs.map(k=>k.bezeichnung||k.raum||"?").join(" + ");
      return {
        ...si,
        label,
        kabel: kbs,
        is3p: hat3p,
        raumKey: raeume_[0]||"",
        stockwerkKey: stockwerke_[0]||"EG",
      };
    });
  };

  // Auto-Berechnung wie viele FIs benötigt werden
  const berechneOptimaleFIs = () => {
    const te = sicherungen.filter(s=>!s.istFILS).reduce((sum,si)=>sum+(STD_SICHERUNGEN.find(x=>x.id===si.sicherung)?.te||1),0);
    const pole = 4; // Standard 4P
    const teProFI = fiMaxTE(pole);
    const anzahl = Math.max(1, Math.ceil((te + 2) / teProFI)); // +2 TE Reserve
    return Array.from({length:anzahl},()=>mkFI());
  };

  const geheZuFIPlanung = () => {
    setFiKonfigs(berechneOptimaleFIs());
    setStep(4);
  };

  const generiere = () => { showToast("Plan erfolgreich generiert ⚡");
    const sichFuerPlan = buildSicherungenFuerPlan();
    setPlan(verteile(sichFuerPlan, fiKonfigs));
    setStep(5); setActiveTab("plan"); setMitRK(null);
  };

  // Aufklapp-Status für Sicherungs-Karten (Step 3)
  const [sichOffen, setSichOffen] = useState({});
  const toggleSichOffen = id => setSichOffen(o=>({...o,[id]:!(o[id]??true)}));
  const isSichOffen = id => sichOffen[id]??true;

  // Plan-Edit-Modal (Step 5): { typ:"fi"|"ls", fiId, siId }
  const [planEdit, setPlanEdit] = useState(null);
  const openPlanEditFI  = (fiId)      => setPlanEdit({typ:"fi", fiId});
  const openPlanEditLS  = (fiId,siId) => setPlanEdit({typ:"ls", fiId, siId});
  const closePlanEdit   = ()          => setPlanEdit(null);
  const updPlanFI = (fiId,k,v) => setPlan(p=>({...p, gruppen:p.gruppen.map(g=>g.id===fiId?{...g,[k]:v}:g)}));
  const updPlanLS = (fiId,siId,k,v) => setPlan(p=>({...p, gruppen:p.gruppen.map(g=>g.id!==fiId?g:{...g, stromkreise:g.stromkreise.map(s=>s.id!==siId?s:{...s,[k]:v})})}));

  // Berechnungen
  const kabelImPool = kabel.filter(k=>!sicherungen.some(s=>s.kabelIds.includes(k.id)));
  const teBenoetigt = sicherungen.filter(s=>!s.istFILS).reduce((sum,si)=>sum+(STD_SICHERUNGEN.find(x=>x.id===si.sicherung)?.te||1),0);
  const teVerfuegbar = fiKonfigs.reduce((s,f)=>s+fiMaxTE(f.pole),0);
    const alleRaeume  = [...new Set([...raeume,...STD_RAEUME])].sort();

  // Klemmenleiste Visualisierung – Konstanten und Hilfsfunktion
  const KLEMME_STYLES = {
    "pe_einspeisung": {bg:"rgba(82,217,138,0.12)",border:"rgba(82,217,138,0.5)",label:"PE",color:"var(--green)",w:22},
    "rk_mit_pe":     {bg:"#1a2e1a",border:"rgba(82,217,138,0.25)",label:"PE",color:"var(--green)",w:22},
    "rk_ohne_pe":    {bg:"#181818",border:"#44444466",label:"",color:"var(--text3)",w:22},
    "n_einspeisung": {bg:"rgba(33,150,201,0.1)",border:"rgba(33,150,201,0.35)",label:"NE",color:"var(--blue)",w:22},
    "n_endklemme":   {bg:"rgba(33,150,201,0.05)",border:"rgba(33,150,201,0.2)",label:"NX",color:"var(--text3)",w:22},
    "rk_reserve_knx":{bg:"#2a1a2a",border:"#d45db5",label:"R",color:"#d45db5",w:22},
    "abdeckkappe_orange":{bg:"#a84828",border:"#e87040",label:"",color:"#e87040",w:4},
  };
  // buildSeq returns groups: [{kabelLabel, kabelColor, klemmen:[{type,...}]}]
  // Special entries (NE, NX, Kappe, Reserve) get kabelLabel=null
  const buildSeq = (stromkreise, isFils, filsSk) => {
    const groups=[];
    const addSpecial=(type,lbl=null)=>groups.push({kabelLabel:null,kabelColor:null,klemmen:[{type,label:lbl}]});
    if(!isFils){
      // Immer: PE-Einspeisung + N-Einspeisung pro FI-Block
      addSpecial("pe_einspeisung","PE-Einsp.");
      addSpecial("n_einspeisung","N-Einsp.");
      let hatKlemmen=0;
      stromkreise.forEach(sk=>{
        (sk.kabelIds||[]).forEach(kid=>{
          const k=kabel.find(x=>x.id===kid);
          if(!k)return;
          const {mitPE,ohnePE}=klemmenFuerKabel(k.kabelAdern);
          const lbl=k.bezeichnung||k.raum||"?";
          const col=swColor(k.stockwerk);
          const klemmen=[];
          for(let i=0;i<mitPE;i++) klemmen.push({type:"rk_mit_pe",label:lbl});
          for(let i=0;i<ohnePE;i++) klemmen.push({type:"rk_ohne_pe",label:lbl});
          groups.push({kabelLabel:lbl, kabelColor:col, klemmen, sicherung:sk.sicherung});
          hatKlemmen++;
        });
      });
      // KNX-Reserve (mit eigener Kappe davor)
      if(istKNX){
        addSpecial("abdeckkappe_orange");
        groups.push({kabelLabel:"KNX",kabelColor:"var(--purple)",klemmen:[{type:"rk_reserve_knx",label:"KNX Reserve"}]});
      }
      // Abdeckkappe + N-Endklemme: immer wenn mind. eine Klemme ODER KNX, oder immer nach NE
      if(hatKlemmen>0||istKNX){
        addSpecial("abdeckkappe_orange");
      }
      // N-Endklemme: immer (weil N-Einspeisung immer da ist)
      addSpecial("n_endklemme","N-End.");
    } else {
      // FILS: kein NE/NX, aber PE-Klemme am Anfang
      addSpecial("pe_einspeisung","FILS PE");
      let hatKlemmen=0;
      (filsSk.kabelIds||[]).forEach(kid=>{
        const k=kabel.find(x=>x.id===kid);
        if(!k)return;
        const {mitPE,ohnePE}=klemmenFuerKabel(k.kabelAdern);
        const lbl=k.bezeichnung||k.raum||"?";
        const col=swColor(k.stockwerk);
        const klemmen=[];
        for(let i=0;i<mitPE;i++) klemmen.push({type:"rk_mit_pe",label:lbl});
        for(let i=0;i<ohnePE;i++) klemmen.push({type:"rk_ohne_pe",label:lbl});
        groups.push({kabelLabel:lbl, kabelColor:col, klemmen});
        hatKlemmen++;
      });
      if(hatKlemmen>0) addSpecial("abdeckkappe_orange");
    }
    return groups;
  };

  // ── Querverbinder-Berechnung ──
  // Pro Sicherung mit n>=2 Kabeln → je 1x n-fach QV für L (Phase) + 1x für N
  const berechneQuerverbinder = () => {
    if(!plan) return [];
    const result=[];
    plan.gruppen.forEach((fi,fiIdx)=>{
      fi.stromkreise.forEach((sk,skIdx)=>{
        const kids=sk.kabelIds||[];
        if(kids.length<2) return;
        // Anzahl rk_mit_pe Klemmen dieser Sicherung = Klemmen die L+N führen
        let mitPE_total=0, ohnePE_total=0;
        kids.forEach(kid=>{
          const k=kabel.find(x=>x.id===kid);
          if(!k) return;
          const {mitPE,ohnePE}=klemmenFuerKabel(k.kabelAdern);
          mitPE_total+=mitPE;
          ohnePE_total+=ohnePE;
        });
        const fLabel=`Q${fiIdx+1} / ${fiIdx+1}F${skIdx+1}`;
        const skLabel=sk.kabel?.map(k=>k.bezeichnung||k.raum||'?').join(' + ')
                      || kids.map(id=>kabel.find(x=>x.id===id)).filter(Boolean).map(k=>k.bezeichnung||k.raum||'?').join(' + ');
        // L-Querverbinder (mitPE Klemmen haben L-Ader)
        if(mitPE_total>=2){
          result.push({fLabel, skLabel, ports:mitPE_total, typ:'L', color:'#ff6b6b'});
          result.push({fLabel, skLabel, ports:mitPE_total, typ:'N', color:'rgba(33,150,201,0.9)'});
        }
        // Extra N-QV für ohnePE Klemmen (Neutralleiter-Querverbinder)
        if(ohnePE_total>=2){
          result.push({fLabel, skLabel, ports:ohnePE_total, typ:'N (2-pol)', color:'rgba(33,150,201,0.6)'});
        }
      });
    });
    return result;
  };

  const querverbinder = (showKlemmen&&mitQV) ? berechneQuerverbinder() : [];

  // QV Stückliste: gruppiert nach Ports-Anzahl
  const qvStueckliste = (() => {
    if(!showKlemmen||!mitQV||!querverbinder.length) return [];
    const counts={};
    querverbinder.forEach(q=>{ counts[q.ports]=(counts[q.ports]||0)+1; });
    return Object.entries(counts).map(([p,n])=>({ports:Number(p),anzahl:n})).sort((a,b)=>a.ports-b.ports);
  })();
const stueckliste = (() => {
    if(mitRK===null||!plan) return [];
    const base = berechneStueckliste(plan,mitRK,kabel,istKNX);
    if(!mitRK) return base;
    // Querverbinder hinzufügen wenn aktiviert
    if(mitQV && querverbinder.length>0) {
      qvStueckliste.forEach(({ports,anzahl})=>{
        base.push({label:`Querverbinder / Klemmbrücke ${ports}-fach`, menge:anzahl, kat:"Reihenklemmen"});
      });
    }
    // N-Brücke hinzufügen wenn aktiviert (1 pro FI-Block)
    if(mitNBruecke && plan.gruppen.length>0) {
      base.push({label:`N-Brücke (Querverbinder NE→NX)`, menge:plan.gruppen.length, kat:"Reihenklemmen"});
    }
    return base;
  })();

  // ══ RENDER ══
  return (
    <div style={{fontFamily:"'Outfit',sans-serif",background:"#111416",minHeight:"100vh",color:"#e8e4de"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        :root{
          --bg: #111416;
          --bg2: #181c1f;
          --bg3: #1e2327;
          --border: #2a3035;
          --border2: #333b42;
          --svp: #2196C9;
          --svp2: #1a82b4;
          --blue: #2196C9;
          --green: #52d98a;
          --red: #ff6b6b;
          --purple: #a78bfa;
          --text: #e8e4de;
          --text2: #9aa3ad;
          --text3: #5a6370;
          --mono: 'JetBrains Mono', monospace;
        }
        *{box-sizing:border-box;}
        input,select{font-family:'Outfit',sans-serif!important;}
        input:focus,select:focus{outline:none!important;border-color:var(--svp)!important;box-shadow:0 0 0 2px rgba(33,150,201,0.12)!important;}
        input::placeholder{color:var(--text3);}
        .sichzone{transition:background 0.15s,border-color 0.15s,box-shadow 0.15s;}
        .sichzone.dragover{background:rgba(33,150,201,0.05)!important;border-color:var(--svp)!important;box-shadow:0 0 0 2px rgba(33,150,201,0.15)!important;}
        .sichzone.touch-over{background:rgba(33,150,201,0.05)!important;border-color:var(--svp)!important;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px;}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
        .fade-in{animation:fadeIn 0.2s ease forwards;}
        .main-wrap{max-width:960px;margin:0 auto;padding:20px 16px;}
        .step3-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .header-nav{display:flex;gap:4px;margin-left:8px;flex-wrap:wrap;}
        .btn-hover:hover{opacity:0.85;transform:translateY(-1px);}
        .card-hover:hover{border-color:var(--border2)!important;box-shadow:0 4px 20px rgba(0,0,0,0.3);}
        .fi-zone:hover{border-color:var(--border2)!important;}
        button{transition:all 0.15s;}
        button:active{transform:scale(0.97);}
        .step-indicator{display:flex;align-items:center;gap:0;}
        @media(max-width:640px){
          .step3-grid{grid-template-columns:1fr;}
          .header-nav button{padding:5px 8px!important;font-size:10px!important;}
          .nav-label-long{display:none;}
          .nav-label-short{display:inline!important;}
          .main-wrap{padding:12px 10px;}
          .header-actions .btn-label{display:none;}
        }
        @media(min-width:641px){
          .nav-label-short{display:none;}
          .nav-label-long{display:inline;}
        }
        @media(min-width:1024px){
          .main-wrap{max-width:1100px;padding:24px 28px;}
        }
        @media print{
          *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
          .no-print{display:none!important;}
          body{background:#fff!important;color:#000!important;margin:0;}
        }
      `}</style>

      {/* ── HEADER ── */}
      <div className="no-print" style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)",padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
          <svg width="120" height="38" viewBox="0 0 120 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* SVP Icon - geometric square with circuit dots */}
            <rect x="0" y="2" width="14" height="14" rx="2" fill="#2196C9"/>
            <rect x="0" y="18" width="6" height="6" rx="1" fill="#2196C9"/>
            <rect x="8" y="18" width="6" height="6" rx="1" fill="#2196C9"/>
            {/* S */}
            <text x="20" y="16" fontFamily="'Outfit',sans-serif" fontWeight="800" fontSize="18" fill="white" letterSpacing="-1">SVP</text>
            {/* ELEKTROTECHNIK */}
            <text x="20" y="28" fontFamily="'Outfit',sans-serif" fontWeight="500" fontSize="8.5" fill="rgba(255,255,255,0.6)" letterSpacing="2.5">ELEKTROTECHNIK</text>
          </svg>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <div className="header-nav">
            {[["1","Projekt","Proj"],["2","Kabel","Kabel"],["3","Sicherungen","Sich"],["4","FI-Planung","FI"],["5","Belegungsplan","Plan"]].map(([n,l,s])=>{
              const ni=Number(n); const active=step===ni; const done=step>ni;
              return <button key={n} onClick={()=>{if(ni<=2||(ni===3&&kabel.some(k=>k.bezeichnung||k.raum))||(ni===4)||(ni===5&&plan))setStep(ni);}}
                style={{background:active?"var(--svp)":done?"rgba(33,150,201,0.1)":"transparent",border:`1px solid ${active?"var(--svp)":done?"rgba(33,150,201,0.3)":"var(--border)"}`,color:active?"#fff":done?"var(--svp)":"var(--text3)",borderRadius:7,padding:"5px 11px",cursor:"pointer",fontSize:11,fontWeight:active?700:done?600:400,transition:"all 0.15s",display:"flex",alignItems:"center",gap:4}}>
                {done&&!active&&<span style={{fontSize:8}}>✓</span>}
                <span className="nav-label-long">{l}</span>
                <span className="nav-label-short">{s}</span>
              </button>;
            })}
          </div>
          <div style={{width:1,height:20,background:"var(--border)",margin:"0 4px"}}/>
          <button onClick={()=>setShowLoad(true)} style={{...bSec,fontSize:11,padding:"5px 10px",display:"flex",alignItems:"center",gap:5}}>
            <span>📂</span><span className="btn-label">Laden</span>
            {projekte.length>0&&<span style={{background:"var(--svp)",color:"var(--bg2)",borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:800}}>{projekte.length}</span>}
          </button>
          <button onClick={()=>{setSaveName(projekt.name||"");setShowSave(true);}} style={{...bSec,fontSize:11,padding:"5px 10px"}}>💾 <span className="btn-label">Speichern</span></button>
          {undoStack.length>0&&<button onClick={doUndo} title={`Rückgängig: ${undoStack[undoStack.length-1]?.label}`} style={{...bSec,fontSize:11,padding:"5px 10px",color:"var(--svp)",borderColor:"rgba(33,150,201,0.3)"}}>↩ Rückgängig</button>}
          <button onClick={()=>setShowApiSettings(true)} style={{...bSec,fontSize:11,padding:"5px 10px"}}>⚙️</button>
          <button onClick={()=>setShowFoto(true)} style={{...bSec,fontSize:11,padding:"5px 10px"}}>📷</button>
        </div>
      </div>

      <div className="main-wrap">
        {/* Step progress bar */}
        <div className="no-print" style={{display:"flex",alignItems:"center",gap:0,marginBottom:20}}>
          {[1,2,3,4,5].map((n,i)=>{
            const active=step===n; const done=step>n;
            const labels=["Projekt","Kabel","Sicherungen","FI-Planung","Belegungsplan"];
            return <div key={n} style={{display:"flex",alignItems:"center",flex:n<5?1:"none"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:done||active?"pointer":"default"}}
                onClick={()=>{if(n<=2||(n===3&&kabel.some(k=>k.bezeichnung||k.raum))||(n===4)||(n===5&&plan))setStep(n);}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:active?"var(--svp)":done?"rgba(33,150,201,0.15)":"var(--bg3)",border:`2px solid ${active?"var(--svp)":done?"rgba(33,150,201,0.4)":"var(--border)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:active?"#fff":done?"var(--svp)":"var(--text3)",transition:"all 0.2s",flexShrink:0}}>
                  {done?<span style={{fontSize:10}}>✓</span>:n}
                </div>
                <div style={{fontSize:9,color:active?"var(--svp)":done?"var(--svp)":"var(--text3)",fontWeight:active?700:done?500:400,whiteSpace:"nowrap",letterSpacing:"0.3px",transition:"color 0.2s"}} className="nav-label-long">{labels[i]}</div>
              </div>
              {n<5&&<div style={{flex:1,height:2,background:done?"rgba(33,150,201,0.3)":"var(--border)",margin:"0 4px",marginBottom:16,borderRadius:2,transition:"background 0.3s"}}/>}
            </div>;
          })}
        </div>

        {/* ══ STEP 1: PROJEKT ══ */}
        {step===1&&<>
          <Card title="Projektdaten" icon="🏗️">
            <G2>
              <F label="Projektname / Kunde"><I value={projekt.name} onChange={e=>setProjekt(p=>({...p,name:e.target.value}))} placeholder="z.B. EFH Müller, München"/></F>
              <F label="Adresse"><I value={projekt.adresse} onChange={e=>setProjekt(p=>({...p,adresse:e.target.value}))} placeholder="Musterstr. 12, 80333 München"/></F>
            </G2>
          </Card>

          <Card title="Stockwerke" icon="🏢" sub="Klick zum Aktivieren/Deaktivieren:">
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
              {STD_STOCKWERKE.map(sw=>{
                const aktiv=stockwerke.includes(sw);
                const col=swColor(sw);
                return(
                  <button key={sw} onClick={()=>aktiv?remSW(sw):setStockwerke(s=>[...s,sw])}
                    style={{background:aktiv?col+"18":"var(--bg2)",border:`1px solid ${aktiv?col+"55":"var(--border)"}`,color:aktiv?col:"var(--text3)",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:aktiv?700:400,display:"flex",alignItems:"center",gap:5}}>
                    {aktiv&&<div style={{width:6,height:6,borderRadius:1,background:col,flexShrink:0}}/>}
                    {aktiv?"✓ ":""}{sw}
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {stockwerke.filter(sw=>!STD_STOCKWERKE.includes(sw)).map(sw=>{
                const col=swColor(sw);
                return(
                  <div key={sw} style={{display:"flex",alignItems:"center",gap:4,background:col+"18",border:`1px solid ${col}44`,borderRadius:6,padding:"4px 8px"}}>
                    <div style={{width:7,height:7,borderRadius:1,background:col}}/>
                    <span style={{fontSize:12,color:col,fontWeight:600}}>{sw}</span>
                    <button onClick={()=>remSW(sw)} style={{background:"transparent",border:"none",color:col,cursor:"pointer",fontSize:14,padding:"0 0 0 2px",opacity:0.5}}>×</button>
                  </div>
                );
              })}
              {showSWInput
                ? <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                    <input value={newSW} onChange={e=>setNewSW(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSW()} placeholder="z.B. Garage" autoFocus
                      style={{background:"var(--bg)",border:`1px solid ${newSWColor}66`,borderRadius:6,padding:"4px 8px",color:newSWColor,fontSize:12,width:110,fontWeight:700}}/>
                    <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                      {SW_COLOR_PALETTE.map(col=>(
                        <button key={col} onClick={()=>setNewSWColor(col)}
                          style={{width:18,height:18,borderRadius:3,background:col,border:`2px solid ${newSWColor===col?"#fff":"transparent"}`,cursor:"pointer",padding:0,flexShrink:0}}/>
                      ))}
                    </div>
                    <button onClick={addSW} style={{background:"var(--blue)",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:700,color:"#fff"}}>+</button>
                    <button onClick={()=>{setShowSWInput(false);setNewSW("");}} style={bSec2}>✕</button>
                  </div>
                : <button onClick={()=>{setShowSWInput(true);setNewSWColor(randSwColor(Object.values(swColorMap)));}} style={bDash}>+ Eigenes Stockwerk</button>}
            </div>
          </Card>

          <Card title="Räume">
            <div style={{fontSize:10,color:"var(--text3)",marginBottom:8}}>Klick zum Aktivieren/Deaktivieren:</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
              {STD_RAEUME.map(r=>{
                const aktiv=raeume.includes(r);
                return(
                  <button key={r} onClick={()=>aktiv?remRaum(r):setRaeume(rv=>[...rv,r])}
                    style={{background:aktiv?"rgba(33,150,201,0.08)":"var(--bg2)",border:`1px solid ${aktiv?"rgba(33,150,201,0.2)":"var(--border)"}`,color:aktiv?"var(--blue)":"var(--text3)",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:aktiv?700:400}}>
                    {aktiv?"✓ ":""}{r}
                  </button>
                );
              })}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
              {raeume.filter(r=>!STD_RAEUME.includes(r)).map(r=>(
                <div key={r} style={{display:"flex",alignItems:"center",gap:4,background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:6,padding:"4px 8px"}}>
                  <span style={{fontSize:12,color:"var(--text2)"}}>{r}</span>
                  <button onClick={()=>remRaum(r)} style={{background:"transparent",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:14,padding:"0 0 0 2px"}}>×</button>
                </div>
              ))}
              {showRaumInput
                ? <div style={{display:"flex",gap:4}}>
                    <input value={newRaum} onChange={e=>setNewRaum(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addRaum()} placeholder="Eigener Raum" autoFocus style={{background:"var(--bg)",border:"1px solid #1a7abf",borderRadius:6,padding:"4px 8px",color:"var(--text)",fontSize:12,width:130}}/>
                    <button onClick={addRaum} style={{background:"var(--blue)",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:700,color:"#fff"}}>+</button>
                    <button onClick={()=>{setShowRaumInput(false);setNewRaum("");}} style={bSec2}>✕</button>
                  </div>
                : <button onClick={()=>setShowRaumInput(true)} style={bDash}>+ Eigener Raum</button>}
            </div>
          </Card>

          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
            <button onClick={()=>setShowFoto(true)} style={{display:"flex",alignItems:"center",gap:8,background:"var(--bg2)",border:"1px solid #1a7abf44",borderRadius:9,padding:"11px 18px",color:"var(--blue)",cursor:"pointer",fontSize:13,fontWeight:600}}>
              📷 Kabelliste aus Foto / Scan importieren
            </button>
          </div>
          {/* Completion hint */}
          {projekt.name&&stockwerke.length>0&&(
            <div style={{background:"rgba(82,217,138,0.06)",border:"1px solid rgba(82,217,138,0.2)",borderRadius:10,padding:"10px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16}}>✓</span>
              <span style={{fontSize:13,color:"var(--green)",fontWeight:600}}>Projekt "{projekt.name}" · {stockwerke.length} Stockwerk{stockwerke.length!==1?"e":""} konfiguriert</span>
            </div>
          )}
          <button onClick={()=>setStep(2)} style={bPrimary}>Weiter → Kabel erfassen</button>
        </>}

        {/* ══ STEP 2: KABEL ERFASSEN ══ */}
        {step===2&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:16,fontWeight:700}}>Kabel erfassen</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:1,display:"flex",gap:10}}><span>{kabel.length} Kabel</span>{sicherungen.length>0&&<span style={{color:"var(--svp)"}}>· {kabel.filter(k=>sicherungen.some(s=>s.kabelIds.includes(k.id))).length} zugewiesen</span>}</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setStep(1)} style={bSec}>← Zurück</button>
              <button onClick={()=>setShowFoto(true)} style={{...bSec,color:"var(--blue)",borderColor:"rgba(33,150,201,0.15)"}}>📷 Foto</button>
              <button onClick={()=>setStep(3)} style={bPrimary}>Weiter → Sicherungen planen</button>
            </div>
          </div>

          {kabel.map((k,idx)=>{
            const swC=swColor(k.stockwerk);
            return(
              <div key={k.id}
                draggable data-kabelid={k.id}
                onDragStart={e=>onKabelDragStart(e,k.id)} onDragOver={e=>onKabelDragOver(e,k.id)} onDrop={onKabelDrop}
                onTouchStart={e=>{dragKabelId.current=k.id;}}
                onTouchMove={e=>{e.preventDefault();const t=e.touches[0];const el=document.elementFromPoint(t.clientX,t.clientY)?.closest("[data-kabelid]");if(el)dragOverId.current=el.dataset.kabelid;}}
                onTouchEnd={onKabelDrop}
                style={{marginBottom:6,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px",cursor:"grab"}}>
                <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
                  <div style={{color:"var(--border2)",fontSize:14,userSelect:"none",flexShrink:0}}>⠿</div>
                  <div style={{flex:"0 0 24px",fontFamily:"var(--mono)",fontSize:10,color:"var(--text3)",fontWeight:700}}>{idx+1}</div>
                  <input value={k.bezeichnung} onChange={e=>updKabel(k.id,"bezeichnung",e.target.value)} onKeyDown={e=>e.key==="Enter"&&addKabel(k.stockwerk)} placeholder="Bezeichnung (z.B. Steckdosen Küche)"
                    style={{flex:2,background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,padding:"7px 9px",color:"var(--text)",fontSize:13}}/>
                  <div style={{flex:"0 0 90px",position:"relative"}}>
                    <select value={k.stockwerk} onChange={e=>updKabel(k.id,"stockwerk",e.target.value)}
                      style={{width:"100%",background:"var(--bg)",border:`1px solid ${swC}44`,borderRadius:6,padding:"7px 9px",color:swC,fontSize:12,fontWeight:700,appearance:"none",WebkitAppearance:"none",paddingRight:18}}>
                      {stockwerke.map(sw=><option key={sw} value={sw}>{sw}</option>)}
                    </select>
                    <div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",color:swC,fontSize:8}}>▼</div>
                  </div>
                  <div style={{flex:1}}>
                    <ACInput value={k.raum} onChange={v=>updKabel(k.id,"raum",v)} onCommit={v=>ensureRaum(v)} suggestions={alleRaeume} placeholder="Raum..."/>
                  </div>
                  <button onClick={()=>dupKabel(k.id)} title="Duplizieren"
                    style={{flexShrink:0,width:30,height:30,borderRadius:6,border:"1px solid var(--border2)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.color="var(--blue)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text3)"}>⎘</button>
                  <button onClick={()=>remKabel(k.id)} title="Löschen"
                    style={{flexShrink:0,width:30,height:30,borderRadius:6,border:"1px solid var(--border2)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.color="var(--red)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text3)"}>✕</button>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"flex-end",paddingLeft:34}}>
                  {/* Kabeltyp */}
                  <div style={{flex:"0 0 90px"}}>
                    <div style={{fontSize:8,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:3}}>Kabeltyp</div>
                    <select value={k.kabelTyp||"NYM-J"} onChange={e=>updKabel(k.id,"kabelTyp",e.target.value)}
                      style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,padding:"6px 8px",color:"var(--text2)",fontSize:11,appearance:"none",WebkitAppearance:"none"}}>
                      {KABEL_TYP_OPTIONEN.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {/* Adern */}
                  <div style={{flex:"0 0 90px"}}>
                    <div style={{fontSize:8,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:3}}>Adern</div>
                    <div style={{display:"flex",gap:2,marginBottom:3}}>
                      {STD_ADERN.map(a=>(
                        <button key={a} onClick={()=>updKabel(k.id,"kabelAdern",a)}
                          style={{flex:1,padding:"3px 0",borderRadius:4,border:`1px solid ${(k.kabelAdern||3)===a?"var(--blue)":"var(--border)"}`,background:(k.kabelAdern||3)===a?"rgba(33,150,201,0.1)":"transparent",color:(k.kabelAdern||3)===a?"var(--blue)":"var(--text3)",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"var(--mono)"}}>
                          {a}
                        </button>
                      ))}
                    </div>
                    <input type="number" min={3} max={20} value={k.kabelAdern||3}
                      onChange={e=>updKabel(k.id,"kabelAdern",Math.max(3,Number(e.target.value)||3))}
                      style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 8px",color:"var(--text)",fontSize:12,fontWeight:700,fontFamily:"var(--mono)",textAlign:"center"}}/>
                  </div>
                  {/* mm² */}
                  <div style={{flex:"0 0 80px"}}>
                    <div style={{fontSize:8,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:3}}>mm²</div>
                    <select value={k.kabelQs||"1.5"} onChange={e=>updKabel(k.id,"kabelQs",e.target.value)}
                      style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,padding:"6px 8px",color:"var(--text2)",fontSize:12,fontWeight:700,fontFamily:"var(--mono)",appearance:"none",WebkitAppearance:"none"}}>
                      {KABEL_QS_OPTIONEN.map(q=><option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>


                </div>
              </div>
            );
          })}

          <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center"}}>
            <button onClick={()=>addKabel()} style={{...bDash,flex:1}}>+ Kabel hinzufügen</button>
            <span style={{fontSize:10,color:"var(--text3)",flexShrink:0}}>↵ Enter im letzten Feld</span>
          </div>
          <div style={{marginTop:10,padding:"10px 14px",background:"var(--bg2)",borderRadius:8,border:"1px solid var(--border)",display:"flex",gap:16,flexWrap:"wrap"}}>
            <St label="Kabel gesamt" val={kabel.length}/>
          </div>
          <div style={{display:"flex",gap:10,marginTop:12}}>
            <button onClick={()=>setStep(1)} style={bSec}>← Zurück</button>
            <button onClick={()=>setStep(3)} style={{...bPrimary,flex:1}}>Weiter → Sicherungen planen</button>
          </div>
        </>}

        {/* ══ STEP 3: SICHERUNGEN PLANEN (Drag & Drop) ══ */}
        {step===3&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:"var(--text)",letterSpacing:"-0.3px"}}>⚡ Sicherungen zuweisen</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:1}}>
                Kabel per Drag&Drop auf Sicherungen ziehen · {kabelImPool.length>0?<span style={{color:"var(--svp)"}}>{kabelImPool.length} noch nicht zugewiesen</span>:<span style={{color:"var(--green)"}}>✓ Alle zugewiesen</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setStep(2)} style={bSec}>← Zurück</button>
              <button onClick={geheZuFIPlanung} style={bPrimary}>Weiter → FI-Planung</button>
            </div>
          </div>

          <div className="step3-grid">

            {/* Linke Spalte: Kabel-Pool */}
            <div>
              <div style={{fontSize:11,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,fontWeight:700,display:"flex",alignItems:"center",gap:6}}>
                🔌 Kabel-Pool
                {kabelImPool.length>0&&<span style={{background:"#f0a50022",border:"1px solid #f0a50044",color:"var(--svp)",borderRadius:10,padding:"1px 7px",fontSize:9}}>{kabelImPool.length} offen</span>}
              </div>
              {kabelImPool.length===0
                ? <div style={{background:"rgba(82,217,138,0.05)",border:"1px solid rgba(82,217,138,0.2)",borderRadius:10,padding:"20px",textAlign:"center"}}><div style={{fontSize:20,marginBottom:6}}>✓</div><div style={{color:"var(--green)",fontSize:13,fontWeight:700}}>Alle Kabel zugewiesen</div><div style={{color:"var(--text3)",fontSize:11,marginTop:4}}>Kabel können weiterhin aus Sicherungen hierher gezogen werden</div></div>
                : kabelImPool.map(k=>{
                    const swC=swColor(k.stockwerk);
                    return(
                      <div key={k.id} style={{marginBottom:6}}>
                        {editKabelId===k.id?(
                          <div style={{background:"#1a1a2e",border:"1px solid #7b6cf033",borderRadius:8,padding:"10px 12px"}}>
                            <div style={{display:"flex",gap:6,marginBottom:6,flexWrap:"wrap"}}>
                              <input value={k.bezeichnung} onChange={e=>updKabel(k.id,"bezeichnung",e.target.value)}
                                placeholder="Bezeichnung..." autoFocus
                                style={{flex:2,minWidth:120,background:"var(--bg)",border:"1px solid #7b6cf044",borderRadius:6,padding:"6px 8px",color:"var(--text)",fontSize:12}}/>
                              <select value={k.stockwerk} onChange={e=>updKabel(k.id,"stockwerk",e.target.value)}
                                style={{flex:"0 0 70px",background:"var(--bg)",border:`1px solid ${swC}44`,borderRadius:6,padding:"6px 8px",color:swC,fontSize:11,fontWeight:700,appearance:"none",WebkitAppearance:"none"}}>
                                {stockwerke.map(sw=><option key={sw} value={sw}>{sw}</option>)}
                              </select>
                              <ACInput value={k.raum} onChange={v=>updKabel(k.id,"raum",v)} onCommit={v=>ensureRaum(v)} suggestions={alleRaeume} placeholder="Raum..."
                                style={{flex:1,minWidth:80}}/>
                            </div>
                            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                              <select value={k.kabelTyp||"NYM-J"} onChange={e=>updKabel(k.id,"kabelTyp",e.target.value)}
                                style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 7px",color:"var(--text2)",fontSize:11,appearance:"none",WebkitAppearance:"none"}}>
                                {KABEL_TYP_OPTIONEN.map(t=><option key={t} value={t}>{t}</option>)}
                              </select>
                              <div style={{display:"flex",gap:2}}>
                                {STD_ADERN.map(a=>(
                                  <button key={a} onClick={()=>updKabel(k.id,"kabelAdern",a)}
                                    style={{width:28,height:26,borderRadius:4,border:`1px solid ${(k.kabelAdern||3)===a?"var(--blue)":"var(--border)"}`,background:(k.kabelAdern||3)===a?"rgba(33,150,201,0.1)":"transparent",color:(k.kabelAdern||3)===a?"var(--blue)":"var(--text3)",cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"var(--mono)"}}>
                                    {a}
                                  </button>
                                ))}
                              </div>
                              <select value={k.kabelQs||"1.5"} onChange={e=>updKabel(k.id,"kabelQs",e.target.value)}
                                style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 7px",color:"var(--text2)",fontSize:11,fontFamily:"var(--mono)",fontWeight:700,appearance:"none",WebkitAppearance:"none"}}>
                                {KABEL_QS_OPTIONEN.map(q=><option key={q} value={q}>{q}mm²</option>)}
                              </select>
                              <div style={{flex:1}}/>
                              <button onClick={()=>setEditKabelId(null)}
                                style={{padding:"4px 10px",borderRadius:6,border:"none",background:"var(--green)",color:"#fff",cursor:"pointer",fontSize:11,fontWeight:700}}>✓ Fertig</button>
                            </div>
                          </div>
                        ):(
                          <div
                            draggable
                            onDragStart={e=>{dragKabelId.current=k.id; dragFromSich.current=null; e.dataTransfer.effectAllowed="move"; e.currentTarget.style.opacity="0.5";}}
                            onDragEnd={e=>e.currentTarget.style.opacity="1"}
                            onTouchStart={e=>onTouchStartKabel(e,k.id)}
                            onTouchMove={onTouchMoveKabel}
                            onTouchEnd={onTouchEndKabel}
                            style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",cursor:"grab",display:"flex",alignItems:"center",gap:8}}>
                            <div style={{color:"var(--border2)",fontSize:13,userSelect:"none"}}>⠿</div>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:600,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{k.bezeichnung||"–"}</div>
                              <div style={{fontSize:10,color:"var(--text3)",marginTop:1,display:"flex",gap:6,flexWrap:"wrap"}}>
                                {k.raum&&<span style={{color:swC+"cc"}}>{k.stockwerk} / {k.raum}</span>}
                                <span style={{fontFamily:"var(--mono)",color:"var(--text3)"}}>{k.kabelTyp} {k.kabelAdern}×{k.kabelQs}mm²</span>
                              </div>
                            </div>
                            <button onClick={e=>{e.stopPropagation();setEditKabelId(k.id);}}
                              title="Bearbeiten"
                              style={{flexShrink:0,width:26,height:26,borderRadius:5,border:"1px solid var(--border2)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}
                              onMouseEnter={e=>e.currentTarget.style.color="var(--blue)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text3)"}>✏</button>
                          </div>
                        )}
                      </div>
                    );
                  })
              }
              {/* Auch zugewiesene Kabel anzeigen (kleiner) */}
              {kabel.filter(k=>sicherungen.some(s=>s.kabelIds.includes(k.id))).length>0&&(
                <div style={{marginTop:10}}>
                  <div style={{fontSize:9,color:"var(--border2)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Bereits zugewiesen</div>
                  {kabel.filter(k=>sicherungen.some(s=>s.kabelIds.includes(k.id))).map(k=>(
                    <div key={k.id} draggable
                      onDragStart={e=>{
                        dragKabelId.current=k.id;
                        dragFromSich.current=sicherungen.find(s=>s.kabelIds.includes(k.id))?.id||null;
                        e.dataTransfer.effectAllowed="move"; e.currentTarget.style.opacity="0.5";
                      }}
                      onDragEnd={e=>e.currentTarget.style.opacity="1"}
                      style={{background:"var(--bg)",border:"1px solid #1a1a1a",borderRadius:7,padding:"5px 10px",marginBottom:4,cursor:"grab",display:"flex",alignItems:"center",gap:6,opacity:0.6}}>
                      <div style={{color:"var(--border)",fontSize:11}}>⠿</div>
                      <div style={{flex:1,fontSize:11,color:"var(--text3)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{k.bezeichnung||k.raum||"–"}</div>
                      <div style={{fontSize:9,color:"var(--text3)",fontFamily:"var(--mono)"}}>{k.kabelAdern}×{k.kabelQs}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rechte Spalte: Sicherungen */}
            <div>
              <div style={{fontSize:11,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
                <span>⚡ Sicherungen ({sicherungen.length})</span>
                <div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setSichOffen(Object.fromEntries(sicherungen.map(s=>[s.id,true])))} style={{...bSec,padding:"3px 8px",fontSize:9}}>Alle ▼</button>
                  <button onClick={()=>setSichOffen(Object.fromEntries(sicherungen.map(s=>[s.id,false])))} style={{...bSec,padding:"3px 8px",fontSize:9}}>Alle ▲</button>
                  <button onClick={addSicherung} style={{...bDash,padding:"4px 10px",fontSize:11}}>+ Neue</button>
                </div>
              </div>

              {sicherungen.length===0&&(
                <div style={{background:"var(--bg2)",border:"2px dashed rgba(33,150,201,0.2)",borderRadius:12,padding:"36px 24px",textAlign:"center",lineHeight:1.6}}>
                  <div style={{fontSize:32,marginBottom:10}}>⚡</div>
                  <div style={{fontSize:14,fontWeight:700,color:"var(--text2)",marginBottom:6}}>Noch keine Sicherungen</div>
                  <div style={{fontSize:12,color:"var(--text3)",marginBottom:20}}>Jede Sicherung entspricht einem Stromkreis.<br/>Kabel aus dem Pool per Drag & Drop zuweisen.</div>
                  <button onClick={addSicherung} style={{...bPrimary,fontSize:13,padding:"10px 24px"}}>+ Erste Sicherung anlegen</button>
                </div>
              )}

              {sicherungen.map((si,siIdx)=>{
                const sInfo=STD_SICHERUNGEN.find(s=>s.id===si.sicherung);
                const is3p=si.dreipolig;
                const siKabel=si.kabelIds.map(id=>kabel.find(k=>k.id===id)).filter(Boolean);
                    const offen = isSichOffen(si.id);

                return(
                  <div key={si.id} className="sichzone"
                    data-sichid={si.id}
                    onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add("dragover");}}
                    onDragLeave={e=>e.currentTarget.classList.remove("dragover")}
                    onDrop={e=>{
                      e.currentTarget.classList.remove("dragover");
                      if(!dragKabelId.current)return;
                      weiseKabelZu(dragKabelId.current, si.id);
                      dragKabelId.current=null;
                    }}
                    style={{background:si.istFILS?"#14121e":"var(--bg2)",border:`1px solid ${si.istFILS?"rgba(167,139,250,0.15)":is3p?"rgba(167,139,250,0.1)":"var(--border)"}`,borderRadius:10,marginBottom:8,overflow:"hidden"}}>

                    {/* Sicherungs-Header */}
                    <div style={{padding:"8px 12px",background:"var(--bg3)",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                      <span style={{fontFamily:"var(--mono)",fontWeight:900,fontSize:13,color:"var(--blue)",flexShrink:0}}>LS {siIdx+1}</span>
                      <select value={si.sicherung} onChange={e=>updSicherung(si.id,"sicherung",e.target.value)}
                        style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 8px",color:"var(--text)",fontSize:13,fontWeight:700,fontFamily:"var(--mono)",appearance:"none",WebkitAppearance:"none",minWidth:80}}>
                        {STD_SICHERUNGEN.filter(s=>is3p?s.phase===3:s.phase===1).map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <select value={si.phase} onChange={e=>updSicherung(si.id,"phase",e.target.value)}
                        style={{background:"var(--bg)",border:`1px solid ${si.phase!=="Auto"?PH_COLOR[si.phase]:"var(--border)"}`,borderRadius:6,padding:"4px 8px",color:si.phase!=="Auto"?PH_COLOR[si.phase]:"var(--text2)",fontSize:13,fontWeight:700,appearance:"none",WebkitAppearance:"none",minWidth:65}}>
                        {PHASEN.map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                      {/* 3-polig Toggle */}
                      <button onClick={()=>{
                        const neu=!si.dreipolig;
                        const neueIds=si.kabelIds;
                        updSicherung(si.id,"dreipolig",neu);
                        // Sicherungstyp anpassen wenn nötig
                        const empf=empfehleSicherung(neueIds,kabel,neu);
                        updSicherung(si.id,"sicherung",empf);
                      }}
                        style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${si.dreipolig?"var(--purple)":"var(--border2)"}`,background:si.dreipolig?"rgba(167,139,250,0.1)":"transparent",color:si.dreipolig?"var(--purple)":"var(--text3)",cursor:"pointer",fontSize:10,fontWeight:700}}>
                        {si.dreipolig?"⚡3P":"3P"}
                      </button>
                      {/* FILS */}
                      <button onClick={()=>updSicherung(si.id,"istFILS",!si.istFILS)}
                        style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${si.istFILS?"var(--purple)":"var(--border2)"}`,background:si.istFILS?"rgba(167,139,250,0.1)":"transparent",color:si.istFILS?"var(--purple)":"var(--text3)",cursor:"pointer",fontSize:10,fontWeight:700}}>
                        {si.istFILS?"⚡FILS":"FILS"}
                      </button>
                      <div style={{flex:1}}/>
                      <span style={{fontSize:10,color:"var(--text3)"}}>{siKabel.length} Kabel</span>
                      <button onClick={()=>toggleSichOffen(si.id)} style={{background:"transparent",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:12}}>{offen?"▲":"▼"}</button>
                      <button onClick={()=>remSicherung(si.id)} style={{background:"transparent",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:14,lineHeight:1}}
                        onMouseEnter={e=>e.currentTarget.style.color="var(--red)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text3)"}>✕</button>
                    </div>

                    {/* Kabel in dieser Sicherung */}
                    {offen&&(
                      <div style={{padding:"8px 12px"}}>
                        {siKabel.length===0
                          ? <div style={{fontSize:11,color:"var(--border2)",textAlign:"center",padding:"10px",border:"1px dashed #1e1e1e",borderRadius:6}}>Kabel hierher ziehen</div>
                          : siKabel.map(k=>{
                              const swC=swColor(k.stockwerk);
                              return(
                                <div key={k.id}
                                  draggable
                                  onDragStart={e=>{dragKabelId.current=k.id;dragFromSich.current=si.id;e.dataTransfer.effectAllowed="move";e.currentTarget.style.opacity="0.5";}}
                                  onDragEnd={e=>e.currentTarget.style.opacity="1"}
                                  onTouchStart={e=>onTouchStartKabel(e,k.id)}
                                  onTouchMove={onTouchMoveKabel}
                                  onTouchEnd={onTouchEndKabel}
                                  style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg)",border:"1px solid #1a1a1a",borderRadius:6,padding:"5px 8px",marginBottom:4,cursor:"grab"}}>
                                  <div style={{color:"var(--border2)",fontSize:11}}>⠿</div>
                                  <div style={{width:5,height:14,borderRadius:2,background:swC,flexShrink:0}}/>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:12,fontWeight:600,color:"var(--text2)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{k.bezeichnung||"–"}</div>
                                    <div style={{fontSize:9,color:"var(--text3)",display:"flex",gap:5}}>
                                      {k.raum&&<span style={{color:swC+"99"}}>{k.stockwerk} / {k.raum}</span>}
                                      <span style={{fontFamily:"var(--mono)"}}>{k.kabelTyp} {k.kabelAdern}×{k.kabelQs}mm²</span>

                                    </div>
                                  </div>
                                  <button onClick={()=>entferneKabelAusSicherung(k.id,si.id)}
                                    style={{background:"transparent",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:12,flexShrink:0}}
                                    onMouseEnter={e=>e.currentTarget.style.color="var(--red)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text3)"}>✕</button>
                                </div>
                              );
                            })
                        }
                        {siKabel.length===0&&<div style={{fontSize:9,color:"var(--border2)",textAlign:"center",marginTop:4}}>oder</div>}
                        {siKabel.length===0&&<button onClick={()=>{
                          // Schnell: erstes freies Kabel aus Pool zuweisen
                          if(kabelImPool.length>0) weiseKabelZu(kabelImPool[0].id,si.id);
                        }} style={{...bDash,width:"100%",marginTop:4,fontSize:10}}>+ nächstes Kabel aus Pool</button>}
                      </div>
                    )}
                    {si.istFILS&&(
                      <div style={{padding:"8px 12px",borderTop:"1px solid #7b6cf033",background:"#12101e"}}>
                        <div style={{fontSize:9,color:"var(--purple)",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:8}}>FI-Schutzschalter Konfiguration</div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
                          <div>
                            <div style={{fontSize:8,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:3}}>Bemessung</div>
                            <select value={si.filsBemessung||40} onChange={e=>updSicherung(si.id,"filsBemessung",Number(e.target.value))}
                              style={{background:"var(--bg)",border:"1px solid #7b6cf033",borderRadius:6,padding:"5px 8px",color:"var(--text2)",fontSize:13,appearance:"none",WebkitAppearance:"none"}}>
                              {FI_BEMESSUNG.map(v=><option key={v} value={v}>{v}A</option>)}
                            </select>
                          </div>
                          <div>
                            <div style={{fontSize:8,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:3}}>Typ</div>
                            <select value={si.filsTyp||"A"} onChange={e=>updSicherung(si.id,"filsTyp",e.target.value)}
                              style={{background:"var(--bg)",border:"1px solid #7b6cf033",borderRadius:6,padding:"5px 8px",color:"var(--text2)",fontSize:13,appearance:"none",WebkitAppearance:"none"}}>
                              {FI_TYPEN_LISTE.map(v=><option key={v} value={v}>Typ {v}</option>)}
                            </select>
                          </div>
                          <div>
                            <div style={{fontSize:8,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:3}}>Fehlerstrom</div>
                            <select value={si.filsFehlerstrom||30} onChange={e=>updSicherung(si.id,"filsFehlerstrom",Number(e.target.value))}
                              style={{background:"var(--bg)",border:"1px solid #7b6cf033",borderRadius:6,padding:"5px 8px",color:"var(--text2)",fontSize:13,appearance:"none",WebkitAppearance:"none"}}>
                              {FI_FEHLERSTROM.map(v=><option key={v} value={v}>{v}mA</option>)}
                            </select>
                          </div>
                          <div>
                            <div style={{fontSize:8,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:3}}>Pole</div>
                            <select value={si.filsPole||4} onChange={e=>updSicherung(si.id,"filsPole",Number(e.target.value))}
                              style={{background:"var(--bg)",border:"1px solid #7b6cf033",borderRadius:6,padding:"5px 8px",color:"var(--text2)",fontSize:13,appearance:"none",WebkitAppearance:"none"}}>
                              {FI_POLE.map(v=><option key={v} value={v}>{v}P</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {sicherungen.length>0&&(
                <button onClick={addSicherung} style={{...bDash,width:"100%"}}>+ Weitere Sicherung</button>
              )}
            </div>
          </div>

          <div style={{marginTop:14,padding:"10px 14px",background:"var(--bg2)",borderRadius:8,border:"1px solid var(--border)",display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
            <St label="Sicherungen" val={sicherungen.length}/>
            <St label="FILS" val={sicherungen.filter(s=>s.istFILS).length} color="var(--purple)"/>
            <St label="TE benötigt" val={`${teBenoetigt} TE`}/>
            {kabelImPool.length>0&&<span style={{fontSize:12,color:"var(--svp)",fontWeight:600}}>⚠ {kabelImPool.length} Kabel noch nicht zugewiesen</span>}
          </div>
          <div style={{display:"flex",gap:10,marginTop:12}}>
            <button onClick={()=>setStep(2)} style={bSec}>← Zurück</button>
            <button onClick={geheZuFIPlanung} style={{...bPrimary,flex:1}}>Weiter → FI-Planung</button>
          </div>
        </>}

        {/* ══ STEP 4: FI-PLANUNG ══ */}
        {step===4&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:16,fontWeight:700}}>FI-Konfiguration</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:1}}>
                Automatisch berechnet · {teBenoetigt} TE benötigt · bei Bedarf anpassen
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setStep(3)} style={bSec}>← Zurück</button>
              <button onClick={generiere} style={bPrimary}>⚡ Plan generieren</button>
            </div>
          </div>

          {(()=>{
            const diff=teVerfuegbar-teBenoetigt;
            return(
              <div style={{background:"var(--bg2)",border:`1px solid ${diff<0?"var(--red)":diff<4?"#f0a50044":"var(--border)"}`,borderRadius:10,padding:"12px 16px",marginBottom:14,display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
                <St label="TE benötigt" val={`${teBenoetigt} TE`}/>
                <St label="TE verfügbar" val={`${teVerfuegbar} TE`}/>
                <St label="Reserve" val={`${diff} TE`} color={diff<0?"var(--red)":diff<4?"var(--svp)":"var(--green)"}/>
                <St label="FI-Gruppen" val={fiKonfigs.length}/>
                {diff<0&&<span style={{fontSize:11,color:"var(--red)",fontWeight:600}}>⚠ Zu wenig TE!</span>}
              </div>
            );
          })()}

          {fiKonfigs.map((fi,i)=>(
            <div key={fi.id} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:900,color:"var(--blue)",fontSize:15,fontFamily:"var(--mono)"}}>Q{i+1}</span>
                  <span style={{fontSize:11,color:"var(--text2)",background:"var(--bg3)",border:"1px solid #1a7abf33",borderRadius:5,padding:"2px 8px",fontFamily:"var(--mono)"}}>{fiBeschreibung(fi)}</span>
                  <span style={{fontSize:10,color:"var(--text3)"}}>{fiMaxTE(fi.pole)} TE · {fiPhasenschiene(fi.pole)}</span>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button onClick={()=>updFI(fi.id,"phasenschiene",!fi.phasenschiene)}
                    style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${fi.phasenschiene?"var(--green)":"var(--border2)"}`,background:fi.phasenschiene?"rgba(82,217,138,0.1)":"transparent",color:fi.phasenschiene?"var(--green)":"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700}}>
                    {fi.phasenschiene?"✓ Phasenschiene":"Phasenschiene"}
                  </button>
                  {fiKonfigs.length>1&&<button onClick={()=>remFI(fi.id)} style={bDanger}>✕ entfernen</button>}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                <F label="Bemessungsstrom"><S value={fi.bemessung} onChange={e=>updFI(fi.id,"bemessung",Number(e.target.value))}>{FI_BEMESSUNG.map(v=><option key={v} value={v}>{v}A</option>)}</S></F>
                <F label="Typ"><S value={fi.fiTyp} onChange={e=>updFI(fi.id,"fiTyp",e.target.value)}>{FI_TYPEN_LISTE.map(v=><option key={v} value={v}>Typ {v}</option>)}</S></F>
                <F label="Fehlerstrom"><S value={fi.fehlerstrom} onChange={e=>updFI(fi.id,"fehlerstrom",Number(e.target.value))}>{FI_FEHLERSTROM.map(v=><option key={v} value={v}>{v}mA</option>)}</S></F>
                <F label="Pole"><S value={fi.pole} onChange={e=>updFI(fi.id,"pole",Number(e.target.value))}>{FI_POLE.map(v=><option key={v} value={v}>{v}P</option>)}</S></F>
              </div>
            </div>
          ))}
          <button onClick={addFI} style={{...bDash,width:"100%",marginBottom:14}}>+ FI-Gruppe hinzufügen</button>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setStep(3)} style={bSec}>← Zurück</button>
            <button onClick={generiere} style={{...bPrimary,flex:1}}>⚡ Plan generieren</button>
          </div>
        </>}

        {/* ══ STEP 5: BELEGUNGSPLAN ══ */}
        {step===5&&plan&&<>
          {/* Plan-Header */}
          <div className="no-print fade-in" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <select value={planTyp} onChange={e=>setPlanTyp(e.target.value)}
                style={{background:"var(--bg3)",border:"1px solid var(--border2)",color:"var(--text2)",borderRadius:8,padding:"7px 12px",fontSize:12,appearance:"none",WebkitAppearance:"none",cursor:"pointer",fontFamily:"'Outfit',sans-serif"}}>
                <option value="visuell">📊 Visuell</option>
                <option value="tabelle">📋 Tabelle</option>
              </select>
              <button onClick={()=>{if(mitRK===null)setMitRK(true); setShowKlemmen(v=>!v);}}
                style={{padding:"7px 12px",borderRadius:8,border:`1px solid ${showKlemmen?"var(--green)":"var(--border2)"}`,background:showKlemmen?"rgba(82,217,138,0.08)":"transparent",color:showKlemmen?"var(--green)":"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:showKlemmen?600:400,transition:"all 0.15s",display:"flex",alignItems:"center",gap:5}}>
                🔌 Klemmenleiste
                <span style={{fontSize:9,opacity:0.6}}>{showKlemmen?"▲":"▼"}</span>
              </button>
            </div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setStep(4)} style={bSec}>← FI-Planung</button>
              <button onClick={()=>{setSaveName(projekt.name||"");setShowSave(true);}} style={bSec}>💾</button>
              <button onClick={()=>window.print()} style={bSec}>🖨️</button>
            </div>
          </div>

          {/* Plan-Kopf */}
          <div className="fade-in" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,padding:"14px 18px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:12}}>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:"var(--text)",letterSpacing:"-0.5px"}}>{projekt.name||"Projekt"}</div>
              {projekt.adresse&&<div style={{fontSize:12,color:"var(--text3)",marginTop:3}}>{projekt.adresse}</div>}
              {plan.warnungen?.length>0&&plan.warnungen.map((w,i)=><div key={i} style={{fontSize:11,color:"var(--red)",marginTop:4}}>⚠ {w}</div>)}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"var(--text3)",fontWeight:600,textTransform:"uppercase",letterSpacing:"1.5px",fontFamily:"var(--mono)"}}>SVP Elektrotechnik GmbH</div>
              <div style={{fontSize:11,color:"var(--svp)",marginTop:3,fontFamily:"var(--mono)",fontWeight:600}}>{new Date().toLocaleDateString("de-DE")}</div>
              <div style={{display:"flex",gap:10,marginTop:6,justifyContent:"flex-end"}}>
                <span style={{fontSize:10,color:"var(--blue)",fontFamily:"var(--mono)",fontWeight:700}}>{plan.gruppen.length} FI</span>
                <span style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)"}}>{sicherungen.filter(s=>!s.istFILS).length} LS</span>
                {sicherungen.filter(s=>s.istFILS).length>0&&<span style={{fontSize:10,color:"var(--purple)",fontFamily:"var(--mono)"}}>{sicherungen.filter(s=>s.istFILS).length} FILS</span>}
              </div>
            </div>
          </div>

          {/* ── PLAN ── */}
          {<>
            {planTyp==="visuell"?plan.gruppen.map((fi,fiIdx)=>{
              const qNr=fiIdx+1;
              const sicherTE=fi.belegteTE, ausl=Math.round((sicherTE/fiMaxTE(fi.pole))*100), leer=Math.max(0,fiMaxTE(fi.pole)-sicherTE);
              return(
                <div key={fi.id} className="fi-zone" style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,marginBottom:12,overflow:"hidden",transition:"border-color 0.15s"}}
                  onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add("dov");}}
                  onDragLeave={e=>e.currentTarget.classList.remove("dov")}
                  onDrop={e=>{e.currentTarget.classList.remove("dov");onPlanDrop(fiIdx);}}>
                  <div style={{padding:"12px 16px",background:"var(--bg3)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",borderBottom:"1px solid var(--border)"}}>
                    <span style={{fontWeight:900,fontSize:14,color:"var(--blue)",fontFamily:"var(--mono)"}}>Q{qNr}</span>
                    <span style={{background:"rgba(33,150,201,0.08)",border:"1px solid #1a7abf33",borderRadius:5,padding:"2px 8px",fontSize:11,color:"var(--blue)"}}>{fiBeschreibung(fi)}</span>
                    {fi.phasenschiene&&<span style={{background:"rgba(82,217,138,0.08)",border:"1px solid #52c07a33",borderRadius:5,padding:"2px 8px",fontSize:10,color:"var(--green)"}}>Phasenschiene {fiPhasenschiene(fi.pole)}</span>}
                    <div style={{flex:1,minWidth:80}}>
                      <div style={{fontSize:9,color:"var(--text3)",marginBottom:2}}>{sicherTE}/{fiMaxTE(fi.pole)} TE · {ausl}%</div>
                      <div style={{height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,ausl)}%`,background:ausl>100?"var(--red)":ausl>85?"var(--svp)":"var(--green)",borderRadius:2}}/></div>
                    </div>
                    <div style={{display:"flex",gap:5}}>{Object.entries(fi.phasen).map(([ph,amp])=><span key={ph} style={{fontSize:10,background:PH_BG[ph],border:`1px solid ${PH_BORDER[ph]}`,borderRadius:4,padding:"2px 7px",color:PH_COLOR[ph],fontWeight:700,fontFamily:"var(--mono)"}}>{ph}: {amp}A</span>)}</div>
                  </div>
                  <div style={{padding:"12px 14px",overflowX:"auto"}}>
                    <div style={{display:"flex",gap:4,alignItems:"stretch",minWidth:"max-content"}}>
                      {/* FI-Kästchen */}
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginRight:8}}>
                        <div onClick={()=>openPlanEditFI(fi.id)}
                          style={{width:52,background:"#1a7abf10",border:"2px solid #1a7abf55",borderRadius:6,height:90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,cursor:"pointer",transition:"border-color 0.15s"}}
                          onMouseEnter={e=>e.currentTarget.style.borderColor="var(--blue)"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(33,150,201,0.25)"}>
                          <div style={{fontSize:10,color:"var(--blue)",fontWeight:900,fontFamily:"var(--mono)"}}>Q{qNr}</div>
                          <div style={{fontSize:7,color:"var(--text3)",textTransform:"uppercase"}}>FI/RCD</div>
                          <div style={{fontSize:8,color:"var(--blue)"}}>{fi.bemessung}A</div>
                          <div style={{fontSize:7,color:"var(--text3)"}}>{fi.fehlerstrom}mA</div>
                          <div style={{fontSize:6,color:"rgba(33,150,201,0.2)",marginTop:2}}>✏️</div>
                        </div>
                        <div style={{fontSize:8,color:"var(--blue)",fontWeight:700,marginTop:3,fontFamily:"var(--mono)"}}>Q{qNr}</div>
                      </div>
                      <div style={{width:1,background:"var(--border)",margin:"0 5px"}}/>
                      {/* Sicherungen */}
                      {fi.stromkreise.map((si,i)=>{
                        const fLabel=`${qNr}F${i+1}`;
                        const sInfo=STD_SICHERUNGEN.find(s=>s.id===si.sicherung);
                        const siKabel=si.kabel||[];
                        const swColors=[...new Set(siKabel.map(k=>swColor(k.stockwerk)))];
                        const w=(sInfo?.te||1)*28+((sInfo?.te||1)-1)*4;
                        return(
                          <div key={si.id} draggable
                            onDragStart={e=>{onPlanDragStart(si.id,fi.id); e.currentTarget.style.opacity="0.4";}}
                            onDragEnd={e=>e.currentTarget.style.opacity="1"}
                            style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"grab"}}>
                            <div style={{width:w,background:"var(--bg3)",border:`1.5px solid #2a2a2a`,borderRadius:6,height:90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:"0 2px",position:"relative",overflow:"hidden",cursor:"pointer",transition:"border-color 0.15s"}}
                              onClick={()=>openPlanEditLS(fi.id,si.id)}
                              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.borderColor="rgba(33,150,201,0.3)";}}
                              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor="var(--border2)";}}>
                              {/* Farbstreifen oben – alle Stockwerke */}
                              <div style={{width:"100%",height:3,display:"flex",position:"absolute",top:0,left:0}}>
                                {swColors.map((c,ci)=><div key={ci} style={{flex:1,background:c}}/>)}
                              </div>
                              <div style={{fontSize:8,color:"var(--text2)",marginTop:6,fontFamily:"var(--mono)",fontWeight:700}}>{fLabel}</div>
                              <div style={{fontSize:11,fontWeight:800,color:"var(--text)"}}>{sInfo?.label}</div>
                              <div style={{fontSize:7,color:"var(--text3)",textAlign:"center",padding:"0 2px",lineHeight:1.3,marginBottom:4,maxWidth:"100%",overflow:"hidden"}}>
                                {siKabel.map(k=>k.bezeichnung||k.raum||"?").join("+")}
                              </div>
                            </div>
                            <div style={{fontSize:8,color:"var(--text2)",fontWeight:700,marginTop:3,fontFamily:"var(--mono)"}}>{fLabel}</div>
                            <select className="no-print"
                              value=""
                              onChange={e=>{if(e.target.value!=="")verschiebeImPlan(si.id,fiIdx,Number(e.target.value));}}
                              style={{marginTop:3,fontSize:8,background:"var(--bg)",border:"1px solid var(--border)",borderRadius:4,color:"var(--text3)",padding:"2px",width:w+8,cursor:"pointer"}}>
                              <option value="">↕ verschieben</option>
                              {plan.gruppen.map((g,gi)=>gi!==fiIdx&&<option key={gi} value={gi}>→ Q{gi+1}</option>)}
                            </select>
                          </div>
                        );
                      })}
                      {Array.from({length:leer}).map((_,i)=>(
                        <div key={i}>
                          <div style={{width:28,background:"rgba(255,200,40,0.04)",border:"1px dashed rgba(255,200,40,0.25)",borderRadius:6,height:90,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {fi.phasenschiene&&(
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{opacity:0.45}}>
                                <rect x="1" y="2.5" width="14" height="11" rx="3" fill="rgba(255,200,40,0.18)" stroke="rgba(255,200,40,0.6)" strokeWidth="1.2"/>
                                <polygon points="8.8,4.5 6,9 8.2,9 7.2,12 10,7 7.8,7" fill="rgba(255,200,40,0.85)"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }):(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:"var(--bg3)"}}>
                    {["Bezeichnung","FI / LS","Kabel","Raum","SW","Sicherung","Phase"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:700,borderBottom:"2px solid var(--border)"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {plan.gruppen.map((fi,fiIdx)=>fi.stromkreise.map((si,siIdx)=>{
                      const qNr=fiIdx+1, fLabel=`${qNr}F${siIdx+1}`;
                      const sInfo=STD_SICHERUNGEN.find(s=>s.id===si.sicherung);
                      const siKabel=si.kabel||[];
                      return(
                        <tr key={si.id} style={{borderBottom:"1px solid #161616",background:siIdx%2===0?"var(--bg2)":"var(--bg2)"}}>
                          <td style={{padding:"7px 10px",fontFamily:"var(--mono)",fontWeight:800,color:"var(--text)",fontSize:11}}>{fLabel}</td>
                          <td style={{padding:"7px 10px"}}>{siIdx===0?<span style={{background:"rgba(33,150,201,0.08)",border:"1px solid #1a7abf33",borderRadius:4,padding:"2px 7px",fontSize:10,color:"var(--blue)",fontWeight:900,fontFamily:"var(--mono)"}}>Q{qNr}</span>:<span style={{color:"var(--text3)"}}>↳</span>}</td>
                          <td style={{padding:"7px 10px",color:"var(--text2)",fontWeight:600}}>{siKabel.map(k=>k.bezeichnung||k.raum||"?").join(" + ") || "—"}</td>
                          <td style={{padding:"7px 10px",color:"var(--text3)"}}>{[...new Set(siKabel.map(k=>k.raum).filter(Boolean))].join(", ")||"—"}</td>
                          <td style={{padding:"7px 10px"}}>{[...new Set(siKabel.map(k=>k.stockwerk))].map(sw=><span key={sw} style={{background:swColor(sw)+"18",color:swColor(sw),borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700,marginRight:3}}>{sw}</span>)}</td>
                          <td style={{padding:"7px 10px",fontWeight:700,color:"var(--text)",fontFamily:"var(--mono)"}}>{sInfo?.label}</td>
                          <td style={{padding:"7px 10px"}}><span style={{color:si.assignedPhase==="3P"?"var(--text2)":PH_COLOR[si.assignedPhase]||"var(--text3)",fontWeight:700,fontSize:10}}>{si.assignedPhase==="3P"?"L1+L2+L3":si.assignedPhase}</span></td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            )}

            {/* FILS */}
            {plan.fils.length>0&&(
              <div style={{marginTop:12,background:"#12101e",border:"1px solid #7b6cf022",borderRadius:10,padding:14}}>
                <div style={{fontSize:10,color:"var(--purple)",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:8}}>FILS / Separat abgesichert</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {plan.fils.map((si,i)=>{
                    const sInfo=STD_SICHERUNGEN.find(s=>s.id===si.sicherung);
                    const siKabel=si.kabel||[];
                    const qNr=plan.gruppen.length+i+1;
                    return(
                      <div key={si.id} style={{background:"#1a1a2e",border:"1px solid #7b6cf033",borderRadius:7,padding:"8px 12px",display:"flex",flexDirection:"column",gap:3,fontSize:11,minWidth:160}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{color:"var(--purple)",fontFamily:"var(--mono)",fontSize:10,fontWeight:900}}>Q{qNr}</span>
                          <span style={{fontWeight:600,color:"var(--text2)"}}>{siKabel.map(k=>k.bezeichnung||k.raum||"?").join(" + ")}</span>
                        </div>
                        <div style={{fontSize:10,color:"var(--purple)",fontFamily:"var(--mono)"}}>{sInfo?.label}</div>
                        <div style={{fontSize:9,color:"var(--text3)"}}>FI: {si.filsBemessung||40}A Typ {si.filsTyp||"A"} {si.filsFehlerstrom||30}mA {si.filsPole||4}P</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legende */}
            <div style={{marginTop:12,padding:"10px 14px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,display:"flex",gap:16,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px"}}>Stockwerk:</span>
                {[...new Set(kabel.map(k=>k.stockwerk))].map(s=><div key={s} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:7,height:7,borderRadius:1,background:swColor(s)}}/><span style={{fontSize:10,color:"var(--text3)"}}>{s}</span></div>)}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px"}}>Phase:</span>
                {Object.entries(PH_COLOR).map(([p,c])=><div key={p} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:3,height:10,borderRadius:1,background:c}}/><span style={{fontSize:10,color:c}}>{p}</span></div>)}
              </div>
            </div>
          </>}

          {/* ── KLEMMENLEISTE VIEW ── */}
          {showKlemmen&&mitRK&&(()=>{
            return(
              <div style={{marginTop:4,marginBottom:4}} className="fade-in">

                {/* ── Settings Panel ── */}
                <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"16px 18px",marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--text2)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>Klemmenleiste · Optionen</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>

                    {/* KNX Toggle */}
                    <button onClick={()=>setIstKNX(v=>!v)}
                      style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:10,
                        border:`1px solid ${istKNX?"rgba(167,139,250,0.5)":"var(--border)"}`,
                        background:istKNX?"rgba(167,139,250,0.1)":"var(--bg3)",
                        color:istKNX?"var(--purple)":"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:istKNX?700:400,transition:"all 0.2s"}}>
                      <div style={{width:10,height:10,borderRadius:3,border:`1.5px solid ${istKNX?"var(--purple)":"var(--text3)"}`,background:istKNX?"var(--purple)":"transparent",transition:"all 0.2s",flexShrink:0}}/>
                      KNX Reserve-Klemme
                    </button>

                    {/* N-Brücke Toggle */}
                    <button onClick={()=>setMitNBruecke(v=>!v)}
                      style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:10,
                        border:`1px solid ${mitNBruecke?"rgba(33,150,201,0.5)":"var(--border)"}`,
                        background:mitNBruecke?"rgba(33,150,201,0.08)":"var(--bg3)",
                        color:mitNBruecke?"var(--blue)":"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:mitNBruecke?700:400,transition:"all 0.2s"}}>
                      <div style={{width:10,height:10,borderRadius:3,border:`1.5px solid ${mitNBruecke?"var(--blue)":"var(--text3)"}`,background:mitNBruecke?"var(--blue)":"transparent",transition:"all 0.2s",flexShrink:0}}/>
                      N-Brücke (NE → NX)
                      {mitNBruecke&&<span style={{fontSize:9,color:"var(--text3)",fontWeight:400}}>· {plan.gruppen.length}×</span>}
                    </button>

                    {/* Querverbinder Toggle */}
                    <button onClick={()=>setMitQV(v=>!v)}
                      style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:10,
                        border:`1px solid ${mitQV?"rgba(245,160,64,0.5)":"var(--border)"}`,
                        background:mitQV?"rgba(245,160,64,0.07)":"var(--bg3)",
                        color:mitQV?"#f5a040":"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:mitQV?700:400,transition:"all 0.2s"}}>
                      <div style={{width:10,height:10,borderRadius:3,border:`1.5px solid ${mitQV?"#f5a040":"var(--text3)"}`,background:mitQV?"#f5a040":"transparent",transition:"all 0.2s",flexShrink:0}}/>
                      Querverbinder
                      {mitQV&&querverbinder.length>0&&<span style={{fontSize:9,background:"rgba(245,160,64,0.15)",borderRadius:4,padding:"1px 6px",fontFamily:"var(--mono)"}}>{querverbinder.length} nötig</span>}
                    </button>
                  </div>

                  {/* Querverbinder Detail-Anzeige */}
                  {mitQV&&(
                    <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--border)"}}>
                      {querverbinder.length===0 ? (
                        <div style={{display:"flex",alignItems:"center",gap:8,color:"var(--green)",fontSize:12}}>
                          <span>✓</span><span>Keine Querverbinder nötig – alle Sicherungen haben nur 1 Kabel</span>
                        </div>
                      ) : (
                        <>
                          <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10,fontWeight:700}}>
                            Benötigte Querverbinder
                          </div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                            {querverbinder.map((qv,i)=>(
                              <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                                background:"var(--bg)",border:`1px solid ${qv.color}55`,
                                borderRadius:10,padding:"8px 12px",minWidth:180}}>
                                {/* Mini-Visualisierung der Brücke */}
                                <div style={{position:"relative",flexShrink:0}}>
                                  <div style={{display:"flex",gap:3,alignItems:"flex-end"}}>
                                    {Array.from({length:qv.ports}).map((_,pi)=>(
                                      <div key={pi} style={{width:10,height:28,borderRadius:3,background:qv.color+"22",border:`1.5px solid ${qv.color}88`,flexShrink:0}}/>
                                    ))}
                                  </div>
                                  {/* Brückenbalken oben */}
                                  <div style={{position:"absolute",top:0,left:0,right:0,height:5,background:qv.color,borderRadius:"3px 3px 0 0",opacity:0.8}}/>
                                </div>
                                <div>
                                  <div style={{fontSize:12,fontWeight:800,color:"var(--text)",fontFamily:"var(--mono)"}}>
                                    {qv.ports}-fach
                                  </div>
                                  <div style={{fontSize:10,fontWeight:600,color:qv.color,marginTop:1}}>
                                    {qv.typ}-Querverbinder
                                  </div>
                                  <div style={{fontSize:9,color:"var(--text3)",marginTop:2}}>
                                    {qv.fLabel}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {/* Zusammenfassung */}
                          <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}}>
                            <span style={{fontSize:10,color:"var(--text3)"}}>Gesamt:</span>
                            {qvStueckliste.map(({ports,anzahl})=>(
                              <span key={ports} style={{background:"rgba(245,160,64,0.1)",border:"1px solid rgba(245,160,64,0.25)",
                                borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,color:"#f5a040",fontFamily:"var(--mono)"}}>
                                {anzahl}× {ports}-fach QV
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Klemmenleiste Visualisierung ── */}
                <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:10}}>🔌 Klemmenleiste</div>
                {plan.gruppen.map((fi,fiIdx)=>{
                  const groups=buildSeq(fi.stromkreise,false,null);
                  const klemmenAnzahl=groups.reduce((n,g)=>n+(g.kabelLabel?g.klemmen.length:0),0);
                  return(
                    <div key={fi.id} style={{marginBottom:14}}>
                      <div style={{fontSize:10,color:"var(--blue)",fontWeight:700,marginBottom:5,fontFamily:"var(--mono)",display:"flex",alignItems:"center",gap:10}}>
                        Q{fiIdx+1} · {fiBeschreibung(fi)}
                        <span style={{fontSize:9,color:"var(--text3)",fontWeight:400}}>{klemmenAnzahl} Klemmen</span>
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:"8px 12px 10px",background:"var(--bg2)",borderRadius:10,border:"1px solid var(--border)",overflowX:"auto",alignItems:"flex-end"}}>
                        {groups.map((grp,gi)=>(
                          <div key={gi} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                            <div style={{display:"flex",gap:2,
                              borderTop:grp.kabelLabel?`2px solid ${grp.kabelColor||"var(--text3)"}`:"2px solid transparent",
                              paddingTop:2}}>
                              {grp.klemmen.map((s,si)=>{
                                const st=KLEMME_STYLES[s.type]||{bg:"var(--bg2)",border:"var(--text3)",label:"?",color:"var(--text3)",w:22};
                                const isKappe=s.type==="abdeckkappe_orange";
                                return(
                                  <div key={si} title={s.label||s.type}
                                    style={{width:st.w,height:44,borderRadius:isKappe?2:4,background:st.bg,
                                      border:`1.5px solid ${st.border}`,display:"flex",flexDirection:"column",
                                      alignItems:"center",justifyContent:"center",cursor:"default",flexShrink:0}}>
                                    {s.type==="pe_einspeisung"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>PE</span>}
                                    {s.type==="rk_mit_pe"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>PE</span>}
                                    {s.type==="n_einspeisung"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>NE</span>}
                                    {s.type==="n_endklemme"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>NX</span>}
                                    {s.type==="rk_reserve_knx"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>R</span>}
                                  </div>
                                );
                              })}
                            </div>
                            {grp.kabelLabel
                              ? <div style={{fontSize:8,color:grp.kabelColor||"var(--text2)",fontWeight:600,fontFamily:"var(--mono)",
                                  maxWidth:Math.max(24,grp.klemmen.length*26)+"px",
                                  whiteSpace:"normal",wordBreak:"break-word",textAlign:"center",
                                  marginTop:4,lineHeight:1.3,letterSpacing:"0.2px",padding:"0 2px"}}>
                                  {grp.kabelLabel}
                                </div>
                              : <div style={{height:4}}/>
                            }
                          </div>
                        ))}
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:10,paddingTop:8,marginTop:4,borderTop:"1px solid var(--border)"}}>
                        <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:"rgba(82,217,138,0.12)",border:"1px solid rgba(82,217,138,0.5)",flexShrink:0}}/><span style={{fontSize:9,color:"var(--text2)"}}>PE-Einspeiseklemme</span></div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:"#1a2e1a",border:"1px solid rgba(82,217,138,0.25)",flexShrink:0}}/><span style={{fontSize:9,color:"var(--text2)"}}>Reihenklemme mit PE</span></div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:"#181818",border:"1px solid #44444466",flexShrink:0}}/><span style={{fontSize:9,color:"var(--text2)"}}>Reihenklemme ohne PE</span></div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:"rgba(33,150,201,0.1)",border:"1px solid rgba(33,150,201,0.35)",flexShrink:0}}/><span style={{fontSize:9,color:"var(--text2)"}}>N-Einspeisung / N-Ende</span></div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:4,height:10,borderRadius:1,background:"#a84828",border:"1px solid #e87040",flexShrink:0}}/><span style={{fontSize:9,color:"var(--text2)"}}>Abdeckkappe orange</span></div>
                      </div>
                    </div>
                  );
                })}
                {plan.fils.map((sk,i)=>{
                  const groups=buildSeq(null,true,sk);
                  return(
                    <div key={sk.id} style={{marginBottom:14}}>
                      <div style={{fontSize:10,color:"var(--purple)",fontWeight:700,marginBottom:5,fontFamily:"var(--mono)"}}>Q{plan.gruppen.length+i+1} · FILS</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,padding:"8px 12px 10px",background:"#12101e",borderRadius:10,border:"1px solid #7b6cf022",overflowX:"auto",alignItems:"flex-end"}}>
                        {groups.map((grp,gi)=>(
                          <div key={gi} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                            {grp.kabelLabel
                              ? <div style={{fontSize:7,color:grp.kabelColor||"var(--text2)",fontWeight:700,fontFamily:"var(--mono)",
                                  maxWidth:Math.max(20,grp.klemmen.length*24)+"px",overflow:"hidden",textOverflow:"ellipsis",
                                  whiteSpace:"nowrap",textAlign:"center",marginBottom:1}}>
                                  {grp.kabelLabel}
                                </div>
                              : <div style={{height:10}}/>
                            }
                            <div style={{display:"flex",gap:2,
                              borderTop:grp.kabelLabel?`2px solid ${grp.kabelColor||"var(--text3)"}`:"2px solid transparent",
                              paddingTop:2}}>
                              {grp.klemmen.map((s,si)=>{
                                const st=KLEMME_STYLES[s.type]||{bg:"var(--bg2)",border:"var(--text3)",label:"?",color:"var(--text3)",w:22};
                                const isKappe=s.type==="abdeckkappe_orange";
                                return(
                                  <div key={si} title={s.label||s.type}
                                    style={{width:st.w,height:44,borderRadius:isKappe?2:4,background:st.bg,
                                      border:`1.5px solid ${st.border}`,display:"flex",flexDirection:"column",
                                      alignItems:"center",justifyContent:"center",cursor:"default",flexShrink:0}}>
                                    {s.type==="pe_einspeisung"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>PE</span>}
                                    {s.type==="rk_mit_pe"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>PE</span>}
                                    {s.type==="n_einspeisung"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>NE</span>}
                                    {s.type==="n_endklemme"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>NX</span>}
                                    {s.type==="rk_reserve_knx"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>R</span>}
                                  </div>
                                );
                              })}
                            </div>
                            {grp.kabelLabel
                              ? <div style={{fontSize:8,color:grp.kabelColor||"var(--text2)",fontWeight:600,fontFamily:"var(--mono)",
                                  maxWidth:Math.max(24,grp.klemmen.length*26)+"px",
                                  whiteSpace:"normal",wordBreak:"break-word",textAlign:"center",
                                  marginTop:4,lineHeight:1.3,letterSpacing:"0.2px",padding:"0 2px"}}>
                                  {grp.kabelLabel}
                                </div>
                              : <div style={{height:4}}/>
                            }
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

                    {/* ── BESCHRIFTUNG MODAL ── */}
          {showBeschriftung&&(()=>{
            const alleZeilen=[];
            plan.gruppen.forEach((fi,fiIdx)=>{
              const qNr=fiIdx+1;
              alleZeilen.push({typ:"fi",qNr,fi});
              fi.stromkreise.forEach((si,siIdx)=>{
                alleZeilen.push({typ:"ls",qNr,fNr:siIdx+1,si});
              });
            });
            plan.fils.forEach((si,i)=>{
              const qNr=plan.gruppen.length+i+1;
              alleZeilen.push({typ:"fi",qNr,fils:true,si});
              alleZeilen.push({typ:"ls",qNr,fNr:1,si});
            });
            return <>
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:500,overflowY:"auto",padding:"20px 16px"}} onClick={()=>setShowBeschriftung(false)}>
              <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,maxWidth:900,margin:"0 auto",padding:24}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
                <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>🏷️ Beschriftungsplan</div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <button onClick={()=>kopiereInZwischenablage(buildBeschriftungText(),"beschriftung")}
                    style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${kopiert==="beschriftung"?"rgba(82,217,138,0.4)":"var(--border2)"}`,background:kopiert==="beschriftung"?"rgba(82,217,138,0.1)":"var(--bg3)",color:kopiert==="beschriftung"?"var(--green)":"var(--text2)",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}>
                    {kopiert==="beschriftung"?"✓ Kopiert!":"📋 WhatsApp"}
                  </button>
                  <button onClick={()=>window.print()} style={bSec}>🖨️</button>
                  <button onClick={()=>setShowBeschriftung(false)} style={{background:"none",border:"none",color:"var(--text3)",fontSize:22,cursor:"pointer",padding:"0 4px"}}>✕</button>
                </div>
              </div>
              <div className="no-print" style={{background:"rgba(33,150,201,0.07)",border:"1px solid rgba(33,150,201,0.2)",borderRadius:10,padding:"10px 16px",marginBottom:14,fontSize:12,color:"var(--blue)"}}>
                💡 FIs und FILS: <strong>Q1, Q2, …</strong> · Sicherungen: <strong>1F1, 1F2, …</strong>
              </div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"var(--bg3)"}}>
                  {["Bezeichnung","Kabel / Beschreibung","Raum","Stockwerk","Sicherung","Phase"].map(h=>(
                    <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:700,borderBottom:"2px solid var(--border2)"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {alleZeilen.map((z,zi)=>{
                    if(z.typ==="fi"){
                      const filsBem=z.si?.filsBemessung||40, filsTyp=z.si?.filsTyp||"A", filsFs=z.si?.filsFehlerstrom||30, filsPole=z.si?.filsPole||4;
                      return(
                        <tr key={`q${z.qNr}`} style={{background:"#1a1a2e",borderBottom:"1px solid #2a2a3a"}}>
                          <td style={{padding:"8px 12px",fontFamily:"var(--mono)",fontWeight:900,fontSize:14,color:z.fils?"var(--purple)":"var(--blue)"}}>Q{z.qNr}</td>
                          <td style={{padding:"8px 12px",color:"var(--text2)",fontStyle:"italic",fontSize:11}}>
                            {z.fils?`FILS – FI/RCD ${filsBem}A Typ ${filsTyp} ${filsFs}mA ${filsPole}P`:`FI-Schutzschalter · ${z.fi?fiBeschreibung(z.fi):""}`}
                          </td>
                          <td colSpan={4} style={{padding:"8px 12px",color:"var(--text3)",fontSize:10}}>
                            {z.fi?`${z.fi.bemessung}A · ${z.fi.fehlerstrom}mA · Typ ${z.fi.fiTyp} · ${z.fi.pole}P`:""}
                          </td>
                        </tr>
                      );
                    }
                    const {si,qNr,fNr}=z;
                    const fLabel=`${qNr}F${fNr}`;
                    const sInfo=STD_SICHERUNGEN.find(s=>s.id===si.sicherung);
                    const siKabel=si.kabel||[];
                    const swColors=[...new Set(siKabel.map(k=>k.stockwerk))];
                    return(
                      <tr key={fLabel} style={{borderBottom:"1px solid #161616",background:zi%2===0?"var(--bg2)":"var(--bg2)"}}>
                        <td style={{padding:"7px 12px",fontFamily:"var(--mono)",fontWeight:800,fontSize:13,color:"var(--text)"}}>{fLabel}</td>
                        <td style={{padding:"7px 12px",fontWeight:600,color:"var(--text2)"}}>{siKabel.map(k=>k.bezeichnung||k.raum||"?").join(" + ")||"—"}</td>
                        <td style={{padding:"7px 12px",color:"var(--text3)"}}>{[...new Set(siKabel.map(k=>k.raum).filter(Boolean))].join(", ")||"—"}</td>
                        <td style={{padding:"7px 12px"}}>{swColors.map(sw=><span key={sw} style={{background:swColor(sw)+"22",color:swColor(sw),borderRadius:4,padding:"1px 7px",fontSize:10,fontWeight:700,marginRight:3}}>{sw}</span>)}</td>
                        <td style={{padding:"7px 12px",fontFamily:"var(--mono)",fontWeight:700,color:"var(--text)"}}>{sInfo?.label}</td>
                        <td style={{padding:"7px 12px"}}><span style={{color:si.assignedPhase==="3P"?"var(--text2)":PH_COLOR[si.assignedPhase]||"var(--text3)",fontWeight:700,fontSize:10}}>{si.assignedPhase==="3P"?"L1+L2+L3":si.assignedPhase}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div></div></>;
          })()}

          {/* ── STÜCKLISTE MODAL ── */}
          {showStueckliste&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:500,overflowY:"auto",padding:"20px 16px"}} onClick={()=>setShowStueckliste(false)}>
          <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,maxWidth:700,margin:"0 auto",padding:24}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>📦 Stückliste</div>
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:11,color:"var(--text3)"}}>Reihenklemmen:</span>
              <button onClick={()=>setMitRK(v=>v===true?false:true)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${mitRK?"rgba(82,217,138,0.3)":"var(--border2)"}`,background:mitRK?"rgba(82,217,138,0.1)":"transparent",color:mitRK?"var(--green)":"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700}}>{mitRK===true?"✓ Ja":"Nein"}</button>
              {mitRK&&<button onClick={()=>setIstKNX(v=>!v)} style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${istKNX?"rgba(167,139,250,0.3)":"var(--border2)"}`,background:istKNX?"rgba(167,139,250,0.1)":"transparent",color:istKNX?"var(--purple)":"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700}}>KNX</button>}
              <button onClick={()=>kopiereInZwischenablage(buildStuecklisteText(),"stueckliste")}
                style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${kopiert==="stueckliste"?"rgba(82,217,138,0.4)":"var(--border2)"}`,background:kopiert==="stueckliste"?"rgba(82,217,138,0.1)":"var(--bg3)",color:kopiert==="stueckliste"?"var(--green)":"var(--text2)",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}>
                {kopiert==="stueckliste"?"✓ Kopiert!":"📋 WhatsApp"}
              </button>
              <button onClick={()=>window.print()} style={bSec}>🖨️</button>
              <button onClick={()=>setShowStueckliste(false)} style={{background:"none",border:"none",color:"var(--text3)",fontSize:22,cursor:"pointer",padding:"0 4px"}}>✕</button>
            </div>
          </div>
          {<>
            {mitRK===null?(
              <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:14,padding:28,textAlign:"center",marginTop:8}}>
                <div style={{fontSize:16,fontWeight:700,color:"var(--blue)",marginBottom:8}}>Verteiler mit Reihenklemmen?</div>
                <div style={{fontSize:13,color:"var(--text3)",marginBottom:24,lineHeight:1.6}}>Klemmen werden nach Adernanzahl berechnet. Pro FI-Block: N-Einspeisung → Kabelklemmen → Abdeckkappe → N-Endklemme</div>
                <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                  <button onClick={()=>setMitRK(true)} style={{background:"var(--green)",border:"none",color:"#fff",borderRadius:10,padding:"12px 28px",cursor:"pointer",fontSize:14,fontWeight:800}}>✓ Ja</button>
                  <button onClick={()=>setMitRK(false)} style={{background:"var(--bg3)",border:"1px solid var(--border2)",color:"var(--text2)",borderRadius:10,padding:"12px 28px",cursor:"pointer",fontSize:14}}>Nein</button>
                </div>
              </div>
            ):(
              <>
                <div className="no-print" style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 14px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,color:"var(--text3)"}}>Reihenklemmen:</span>
                  <span style={{fontSize:13,fontWeight:700,color:mitRK?"var(--green)":"var(--text2)"}}>{mitRK?"✓ Ja":"Nein"}</span>
                  <button onClick={()=>setMitRK(null)} style={{...bSec,fontSize:11,padding:"4px 10px",marginLeft:8}}>Ändern</button>

                </div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{background:"var(--bg3)"}}>
                    <th style={{padding:"10px 14px",textAlign:"left",fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:700,borderBottom:"2px solid var(--border)"}}>Artikel</th>
                    <th style={{padding:"10px 14px",textAlign:"right",fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",fontWeight:700,borderBottom:"2px solid var(--border)",width:80}}>Menge</th>
                  </tr></thead>
                  <tbody>
                    {(()=>{
                      let lastKat="";
                      return stueckliste.map((item,i)=>{
                        const katNeu=item.kat!==lastKat; lastKat=item.kat;
                        return(
                          <>
                            {katNeu&&<tr key={`kat_${item.kat}`}><td colSpan={2} style={{padding:"12px 14px 4px",fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,borderTop:i>0?"1px solid var(--border)":"none"}}>{item.kat}</td></tr>}
                            <tr key={item.label} style={{borderBottom:"1px solid #141414",background:i%2===0?"var(--bg2)":"var(--bg2)"}}>
                              <td style={{padding:"8px 14px",color:"var(--text2)"}}>{item.label}</td>
                              <td style={{padding:"8px 14px",textAlign:"right",fontWeight:800,color:"var(--text)",fontFamily:"var(--mono)"}}>{item.menge}×</td>
                            </tr>
                          </>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </>
            )}
          </>}
          </div></div>}

          {/* ── ACTION BUTTONS ── */}
          <div className="no-print" style={{display:"flex",gap:10,marginTop:24,padding:"20px",background:"var(--bg2)",borderRadius:14,border:"1px solid var(--border)",flexWrap:"wrap"}}>
            <div style={{width:"100%",fontSize:11,color:"var(--text3)",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>Dokumente erstellen</div>
            <button onClick={()=>setShowBeschriftung(true)}
              style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",color:"var(--text)",borderRadius:10,padding:"13px 20px",cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--blue)";e.currentTarget.style.color="var(--blue)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color="var(--text)";}}>
              🏷️ Beschriftungsplan erstellen
            </button>
            <button onClick={()=>{if(mitRK===null)setMitRK(true);setShowStueckliste(true);}}
              style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",color:"var(--text)",borderRadius:10,padding:"13px 20px",cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--svp)";e.currentTarget.style.color="var(--svp)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color="var(--text)";}}>
              📦 Stückliste erstellen
            </button>
          </div>
        </>}

      </div>

      {/* ── PLAN EDIT MODAL ── */}
      {planEdit&&(()=>{
        if(planEdit.typ==="fi"){
          const fi=plan&&plan.gruppen.find(g=>g.id===planEdit.fiId);
          if(!fi)return null;
          const qNr=plan.gruppen.indexOf(fi)+1;
          return(
            <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.92)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={closePlanEdit}>
              <div style={{background:"var(--bg2)",border:"1px solid rgba(33,150,201,0.2)",borderRadius:16,padding:24,width:"100%",maxWidth:420}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"var(--mono)",fontWeight:900,fontSize:16,color:"var(--blue)"}}>Q{qNr}</span>
                    <span style={{fontSize:13,fontWeight:700,color:"var(--text2)"}}>FI-Schutzschalter bearbeiten</span>
                  </div>
                  <button onClick={closePlanEdit} style={{background:"none",border:"none",color:"var(--text3)",fontSize:20,cursor:"pointer"}}>✕</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                  <F label="Bemessungsstrom">
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {FI_BEMESSUNG.map(v=><button key={v} onClick={()=>updPlanFI(fi.id,"bemessung",v)}
                        style={{flex:1,padding:"6px 4px",borderRadius:6,border:`1px solid ${fi.bemessung===v?"var(--blue)":"var(--border)"}`,background:fi.bemessung===v?"rgba(33,150,201,0.1)":"transparent",color:fi.bemessung===v?"var(--blue)":"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700}}>{v}A</button>)}
                    </div>
                  </F>
                  <F label="Fehlerstrom">
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {FI_FEHLERSTROM.map(v=><button key={v} onClick={()=>updPlanFI(fi.id,"fehlerstrom",v)}
                        style={{flex:1,padding:"6px 4px",borderRadius:6,border:`1px solid ${fi.fehlerstrom===v?"var(--blue)":"var(--border)"}`,background:fi.fehlerstrom===v?"rgba(33,150,201,0.1)":"transparent",color:fi.fehlerstrom===v?"var(--blue)":"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700}}>{v}mA</button>)}
                    </div>
                  </F>
                  <F label="Typ">
                    <div style={{display:"flex",gap:4}}>
                      {FI_TYPEN_LISTE.map(v=><button key={v} onClick={()=>updPlanFI(fi.id,"fiTyp",v)}
                        style={{flex:1,padding:"6px 4px",borderRadius:6,border:`1px solid ${fi.fiTyp===v?"var(--blue)":"var(--border)"}`,background:fi.fiTyp===v?"rgba(33,150,201,0.1)":"transparent",color:fi.fiTyp===v?"var(--blue)":"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700}}>Typ {v}</button>)}
                    </div>
                  </F>
                  <F label="Pole">
                    <div style={{display:"flex",gap:4}}>
                      {FI_POLE.map(v=><button key={v} onClick={()=>updPlanFI(fi.id,"pole",v)}
                        style={{flex:1,padding:"6px 4px",borderRadius:6,border:`1px solid ${fi.pole===v?"var(--blue)":"var(--border)"}`,background:fi.pole===v?"rgba(33,150,201,0.1)":"transparent",color:fi.pole===v?"var(--blue)":"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700}}>{v}P</button>)}
                    </div>
                  </F>
                </div>
                <F label="Phasenschiene">
                  <button onClick={()=>updPlanFI(fi.id,"phasenschiene",!fi.phasenschiene)}
                    style={{width:"100%",padding:"8px",borderRadius:7,border:`1px solid ${fi.phasenschiene?"var(--green)":"var(--border2)"}`,background:fi.phasenschiene?"rgba(82,217,138,0.1)":"transparent",color:fi.phasenschiene?"var(--green)":"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {fi.phasenschiene?"✓ Phasenschiene aktiv":"Phasenschiene aus"}
                  </button>
                </F>
                <button onClick={closePlanEdit} style={{...bPrimary,width:"100%",marginTop:8}}>Fertig</button>
              </div>
            </div>
          );
        }
        if(planEdit.typ==="ls"){
          const fi=plan&&plan.gruppen.find(g=>g.id===planEdit.fiId);
          const si=fi?.stromkreise.find(s=>s.id===planEdit.siId);
          if(!fi||!si)return null;
          const qNr=plan.gruppen.indexOf(fi)+1;
          const fNr=fi.stromkreise.indexOf(si)+1;
          const is3p=si.is3p;
          return(
            <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.92)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={closePlanEdit}>
              <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:24,width:"100%",maxWidth:460}} onClick={e=>e.stopPropagation()}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"var(--mono)",fontWeight:900,fontSize:16,color:"var(--text)"}}>{qNr}F{fNr}</span>
                    <span style={{fontSize:13,fontWeight:700,color:"var(--text2)"}}>Sicherung bearbeiten</span>
                  </div>
                  <button onClick={closePlanEdit} style={{background:"none",border:"none",color:"var(--text3)",fontSize:20,cursor:"pointer"}}>✕</button>
                </div>
                {si.kabel?.length>0&&<div style={{fontSize:11,color:"var(--text3)",marginBottom:14}}>{si.kabel.map(k=>k.bezeichnung||k.raum||"?").join(" + ")}</div>}
                <F label="Sicherungstyp">
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                    <button onClick={()=>{
                        const neu=!si.is3p;
                        updPlanLS(fi.id,si.id,"is3p",neu);
                        const empf=STD_SICHERUNGEN.filter(s=>neu?s.phase===3:s.phase===1)[0]?.id||si.sicherung;
                        updPlanLS(fi.id,si.id,"sicherung",empf);
                      }}
                      style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${si.is3p?"var(--purple)":"var(--border2)"}`,background:si.is3p?"rgba(167,139,250,0.1)":"transparent",color:si.is3p?"var(--purple)":"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700,marginRight:4}}>
                      {si.is3p?"⚡ 3-polig":"1-polig"}
                    </button>
                    {STD_SICHERUNGEN.filter(s=>si.is3p?s.phase===3:s.phase===1).map(s=>(
                      <button key={s.id} onClick={()=>updPlanLS(fi.id,si.id,"sicherung",s.id)}
                        style={{padding:"6px 10px",borderRadius:6,border:`1px solid ${si.sicherung===s.id?"var(--blue)":"var(--border)"}`,background:si.sicherung===s.id?"rgba(33,150,201,0.1)":"transparent",color:si.sicherung===s.id?"var(--blue)":"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"var(--mono)"}}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </F>
                <F label="Phase">
                  <div style={{display:"flex",gap:4}}>
                    {PHASEN.map(p=>{
                      const c=p!=="Auto"?PH_COLOR[p]:null;
                      const aktiv=si.assignedPhase===p||(p==="Auto"&&(!si.assignedPhase||si.assignedPhase==="Auto"));
                      return(
                        <button key={p} onClick={()=>updPlanLS(fi.id,si.id,"assignedPhase",p)}
                          style={{flex:1,padding:"6px 4px",borderRadius:6,border:`1px solid ${aktiv?(c||"var(--blue)")+"88":"var(--border)"}`,background:aktiv?(c||"var(--blue)")+"22":"transparent",color:aktiv?(c||"var(--blue)"):"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700}}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </F>
                <F label="Verschieben nach">
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {plan.gruppen.map((g,gi)=>gi===plan.gruppen.indexOf(fi)?null:(
                      <button key={gi} onClick={()=>{verschiebeImPlan(si.id,plan.gruppen.indexOf(fi),gi);closePlanEdit();}}
                        style={{padding:"6px 10px",borderRadius:6,border:"1px solid var(--border2)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:11,fontWeight:700}}>
                        → Q{gi+1}
                      </button>
                    ))}
                  </div>
                </F>
                <button onClick={closePlanEdit} style={{...bPrimary,width:"100%",marginTop:8}}>Fertig</button>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* ── MODALS ── */}
      {showFoto&&<FotoImportModal onClose={()=>setShowFoto(false)} onImport={handleFotoImport}/>}
      {showApiSettings&&<ApiSettingsModal onClose={()=>setShowApiSettings(false)}/>}

      {showSave&&(
        <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.92)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,padding:24,width:"100%",maxWidth:400}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:16,color:"var(--text)"}}>💾 Projekt speichern</div>
            <input value={saveName} onChange={e=>setSaveName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&speichere()} placeholder="Projektname..." autoFocus
              style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border2)",borderRadius:8,padding:"10px 12px",color:"var(--text)",fontSize:14,marginBottom:12}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={speichere} style={{...bPrimary,flex:1}}>Speichern</button>
              <button onClick={()=>setShowSave(false)} style={bSec}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}

      {showLoad&&(
        <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.92)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:14,padding:24,width:"100%",maxWidth:480,maxHeight:"80vh",overflow:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontSize:16,fontWeight:700,color:"var(--text)"}}>📂 Projekt laden</div>
              <button onClick={()=>setShowLoad(false)} style={{background:"none",border:"none",color:"var(--text3)",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            {projekte.length===0
              ? <div style={{color:"var(--text3)",fontSize:13,textAlign:"center",padding:24}}>Keine gespeicherten Projekte</div>
              : projekte.map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 14px",marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,color:"var(--text)"}}>{p.name}</div>
                      <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{p.datum} · {(p.kabel||p.stromkreise||[]).length} Kabel</div>
                    </div>
                    <button onClick={()=>lade(p)} style={{...bSec,color:"var(--blue)",borderColor:"rgba(33,150,201,0.15)"}}>Laden</button>
                    <button onClick={()=>loescheProjekt(p.id)} style={bDanger}>✕</button>
                  </div>
                ))
            }
          </div>
        </div>
      )}
      <Toast toasts={toasts}/>
    </div>
  );
}
