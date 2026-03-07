import React, { useState, useRef, useCallback, useEffect } from "react";
import { isSupabaseConfigured } from "./lib/supabase.js";
import { loadProjekteDB, saveProjektDB, deleteProjektDB } from "./lib/db.js";
import Toast from "./components/Toast.jsx";
import { uid } from "./lib/utils.js";

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

// ── Custom Tooltip ──
const Tip = ({text, children, pos="bottom"}) => (
  <div style={{position:"relative",display:"inline-flex"}} className="tip-wrap">
    {children}
    <div className={`tip tip-${pos}`}>{text}</div>
  </div>
);

const STD_STOCKWERKE = ["KG","EG","OG","OG1","OG2","DG","Außen","Technik"];
const STD_RAEUME = ["Küche","Wohnzimmer","Esszimmer","Schlafzimmer","Kinderzimmer","Bad","WC","Gäste-WC","Flur","Diele","Keller","Garage","Hauswirtschaft","Büro","Technikraum","Sauna","Terrasse","Carport"];
const PHASEN = ["Auto","L1","L2","L3"];

const KABEL_TYP_OPTIONEN = ["NYM-J","NYY-J","H07V-K","LIYY"];
const KABEL_QS_OPTIONEN  = ["1.5","2.5","4","6","10","16"];
const STD_ADERN          = [3,5,7,10];



const SW_COLOR_DEFAULT = { KG:"var(--purple)",EG:"var(--blue)",OG:"#34c98a",OG1:"var(--green)",OG2:"#4bc8e8",DG:"var(--red)",Außen:"#e87040",Technik:"var(--text2)" };
const SW_COLOR_PALETTE = ["var(--purple)","var(--blue)","var(--green)","#4bc8e8","var(--red)","#e87040","#d45db5","#5bc4a8","#a0c43a","#f06060","#60a0f0","#c07a30","var(--text2)"];
function randSwColor(used=[]) {
  const avail = SW_COLOR_PALETTE.filter(x=>!used.includes(x));
  return avail.length ? avail[Math.floor(Math.random()*avail.length)] : SW_COLOR_PALETTE[Math.floor(Math.random()*SW_COLOR_PALETTE.length)];
}
const PH_COLOR = { L1:"#ff6b6b", L2:"#f5a040", L3:"#4bc8e8" };
const PH_BG    = { L1:"rgba(255,107,107,0.12)", L2:"rgba(245,160,64,0.12)", L3:"rgba(75,200,232,0.12)" };
const PH_BORDER= { L1:"rgba(255,107,107,0.4)",  L2:"rgba(245,160,64,0.4)",  L3:"rgba(75,200,232,0.4)" };


// Kabel = einzelne Ader/Leitung ohne Sicherungs-Zuordnung
const mkKabel = (sw="EG") => ({
  id: uid(), bezeichnung:"", raum:"", stockwerk:sw,
  kabelTyp:"NYM-J", kabelAdern:3, kabelQs:"1.5",
});

// Sicherung = Leitungsschutzschalter mit 1–n Kabeln
const mkSicherung = () => ({
  id: uid(), kabelIds:[], sicherung:"B16", phase:"Auto", istFILS:false, dreipolig:false,
  filsBemessung:40, filsTyp:"A", filsFehlerstrom:30, filsPole:4, istReserve:false,
});

const mkFI = () => ({ id:uid(), bemessung:40, fiTyp:"A", fehlerstrom:30, pole:4, phasenschiene:true, phasenschieneN:false });

// ── Planverteilung ──
function verteile(sicherungen, fiKonfigs) {
  const normal  = sicherungen.filter(s => !s.istFILS && !s.istReserve);
  const fils    = sicherungen.filter(s =>  s.istFILS && !s.istReserve);
  const reserve = sicherungen.filter(s => !s.istFILS &&  s.istReserve);
  const warnungen = [];
  const gruppen = fiKonfigs.map(f => ({ ...f, stromkreise:[], belegteTE:0, lastA:0, phasen:{L1:0,L2:0,L3:0} }));
  if (!fiKonfigs.length) return { gruppen, fils:fils.map(s=>({...s,assignedPhase:"3P"})), warnungen };

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
  // Reserve-Sicherungen IMMER ans Ende der Gruppen (nach allen normalen)
  if (gruppen.length > 0) {
    reserve.forEach(sk => {
      const sInfo = STD_SICHERUNGEN.find(s => s.id === sk.sicherung);
      const te = sInfo?.te || 1;
      let ziel = gruppen.findIndex(g => fiMaxTE(g.pole) - g.belegteTE >= te);
      if (ziel < 0) {
        warnungen.push(`⚠️ Kein Platz für Reserveplatz "${sk.sicherung}" – TE-Limit!`);
        ziel = gruppen.reduce((b,g,i) => g.belegteTE < gruppen[b].belegteTE ? i : b, 0);
      }
      gruppen[ziel].stromkreise.push({ ...sk, assignedPhase:"—", is3p:false, istReserve:true, overflow:false });
      gruppen[ziel].belegteTE += te;
    });
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

function berechneStueckliste(plan, mitRK, alleKabel, istKNX=false, alleSicherungen=[], mitNBruecke=false) {
  if (!plan) return [];
  const items={};
  const add=(key,label,menge,kat)=>{ if(!items[key])items[key]={label,menge:0,kat}; items[key].menge+=menge; };
  const sichCount={};

  plan.gruppen.forEach(fi => {
    // FI-Schutzschalter
    add(`fi_${fi.bemessung}_${fi.fiTyp}_${fi.fehlerstrom}_${fi.pole}`,`FI-Schutzschalter ${fiBeschreibung(fi)}`,1,"FI-Schutzschalter");
    // Phasenschiene
    if (fi.phasenschiene) {
      const psTypLabel = fi.pole>=4 ? (fi.phasenschieneN ? "3-phasig+N (4-Leiter)" : "3-phasig (3-Leiter)") : "1-phasig";
      add(`ps_${fi.pole}p_${fi.phasenschieneN?"4l":"3l"}`,`Phasenschiene ${psTypLabel}`,1,"Phasenschiene");
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
      // Immer: PE-Einspeisung + N-Einspeisung (Klemmsteine immer vorhanden)
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
      // N-Endklemme: immer (Klemmstein immer vorhanden)
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
      // rk_n_fils = 3-pol (PE+L1+N direkt) → 1× pro Kabel, kein rk_mit_pe
      add("pe_einspeisung","PE-Einspeiseklemme (Erdung)",1,"Reihenklemmen");
      let hatKlemmen=0;
      (sk.kabelIds||[]).forEach(kid => {
        const k = alleKabel.find(x=>x.id===kid);
        if (!k) return;
        const {ohnePE} = klemmenFuerKabel(k.kabelAdern);
        add("rk_n_fils","N-Klemme FILS (3-polig, PE+L1+N)",1,"Reihenklemmen"); // 1× pro Kabel
        if (ohnePE>0) add("rk_ohne_pe","Reihenklemme ohne PE (2-polig)",ohnePE,"Reihenklemmen");
        hatKlemmen++;
      });
      if (hatKlemmen>0) add("abdeckkappe_orange","Abdeckkappe orange (Endschutz Klemmenblock)",1,"Reihenklemmen");
    }
  });

  Object.entries(sichCount).forEach(([key,val])=>add(key,val.label,val.count,val.kat));

  // Reserveplätze
  const reserveCount = alleSicherungen.filter(s=>s.istReserve).length;
  if (reserveCount > 0) add("reserve_lss","Reserveplatz (leer, mit Abdeckkappe)",reserveCount,"Reserveplätze");

  const order=["FI-Schutzschalter","Leitungsschutzschalter","FILS","Reserveplätze","Phasenschiene","Reihenklemmen"];
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
// Migration: alte svp_* Keys → neue vp_* Keys (einmalig)
(function migrateStorage() {
  [["svp_projekte","vp_projekte"],["svp_settings","vp_settings"],["svp_api_config","vp_api_config"]].forEach(([alt,neu])=>{
    if (!localStorage.getItem(neu) && localStorage.getItem(alt)) localStorage.setItem(neu, localStorage.getItem(alt));
  });
})();
function loadProjekte() { try { return JSON.parse(localStorage.getItem("vp_projekte")||"[]"); } catch { return []; } }
function saveProjekte(p) { localStorage.setItem("vp_projekte", JSON.stringify(p)); }

// ── Einstellungen ──
const SETTINGS_DEFAULTS = { firmenname:"", defaultErsteller:"" };
function loadSettings() { try { return {...SETTINGS_DEFAULTS,...JSON.parse(localStorage.getItem("vp_settings")||"{}")}; } catch { return {...SETTINGS_DEFAULTS}; } }
function saveSettings(s) { localStorage.setItem("vp_settings",JSON.stringify(s)); }

// ── API ──
const API_DEFAULTS = { url:"https://api.anthropic.com/v1/messages", model:"claude-sonnet-4-20250514", apiKey:"", format:"openai" };
function ladeApiConfig() { try { return { ...API_DEFAULTS, ...JSON.parse(localStorage.getItem("vp_api_config")||"{}") }; } catch { return {...API_DEFAULTS}; } }
function speichereApiConfig(cfg) { localStorage.setItem("vp_api_config", JSON.stringify(cfg)); }

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
const Card = ({title,sub,icon,children}) => <div className="fade-in card-hover" style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"20px",marginBottom:16,transition:"border-color 0.2s,box-shadow 0.2s"}}>{(title||icon)&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:sub?5:16}}>{icon&&<span style={{fontSize:18}}>{icon}</span>}<div style={{fontWeight:700,fontSize:15,color:"var(--text)"}}>{title}</div></div>}{sub&&<div style={{fontSize:12,color:"var(--text3)",marginBottom:16,lineHeight:1.5}}>{sub}</div>}{children}</div>;
const F = ({label,children}) => <div style={{marginBottom:10}}><div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>{label}</div>{children}</div>;
const G2 = ({children}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{children}</div>;
const St = ({label,val,color="var(--text2)"}) => <div><div style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px"}}>{label}</div><div style={{fontSize:18,fontWeight:800,color,marginTop:1}}>{val}</div></div>;

const bPrimary={background:"var(--blue)",border:"none",color:"#fff",borderRadius:8,padding:"11px 20px",cursor:"pointer",fontSize:13,fontWeight:700,transition:"opacity 0.15s,transform 0.15s"};
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
// ── Startfenster ──
// ══════════════════════════════════════════
function StartScreen({ projekte, onNeu, onLaden, onLoescheProjekt, onBack }) {
  const [phase, setPhase] = useState("start"); // "start" | "neu" | "laden"
  const [form, setForm] = useState({ name:"", adresse:"", ersteller:"", standort:"" });
  const [suche, setSuche] = useState("");
  const dbOk = isSupabaseConfigured();
  const gefilterteProjekte = suche.trim()
    ? projekte.filter(p => (p.name||"").toLowerCase().includes(suche.toLowerCase()) || (p.projekt?.adresse||"").toLowerCase().includes(suche.toLowerCase()))
    : projekte;

  const handleNeu = () => {
    if (!form.name.trim()) return;
    onNeu(form);
  };

  if (phase === "neu") return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.97)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:18,width:"100%",maxWidth:480,padding:32}}>
        <button onClick={()=>setPhase("start")} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:20,marginBottom:16,padding:0,display:"flex",alignItems:"center",gap:6}}>
          ← <span style={{fontSize:13}}>Zurück</span>
        </button>
        <div style={{fontSize:18,fontWeight:800,color:"var(--text)",marginBottom:6}}>Neues Projekt</div>
        <div style={{fontSize:12,color:"var(--text3)",marginBottom:24}}>Projektdaten werden beim ersten Speichern gesichert</div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div>
            <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>Kunde / Projektname *</div>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} autoFocus
              onKeyDown={e=>e.key==="Enter"&&handleNeu()}
              placeholder="z.B. EFH Müller, München"
              style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border2)",borderRadius:8,padding:"10px 12px",color:"var(--text)",fontSize:14}}/>
          </div>
          <div>
            <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>Adresse</div>
            <input value={form.adresse} onChange={e=>setForm(f=>({...f,adresse:e.target.value}))}
              placeholder="Musterstr. 12, 80333 München"
              style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",color:"var(--text)",fontSize:13}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>Ersteller</div>
              <input value={form.ersteller} onChange={e=>setForm(f=>({...f,ersteller:e.target.value}))}
                placeholder="Dein Name"
                style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",color:"var(--text)",fontSize:13}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>Standort Verteiler</div>
              <input value={form.standort} onChange={e=>setForm(f=>({...f,standort:e.target.value}))}
                placeholder="z.B. Keller EG"
                style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",color:"var(--text)",fontSize:13}}/>
            </div>
          </div>
        </div>

        <button onClick={handleNeu} disabled={!form.name.trim()}
          style={{...bPrimary,width:"100%",marginTop:24,opacity:form.name.trim()?1:0.4,fontSize:14,padding:"13px"}}>
          Projekt anlegen →
        </button>
      </div>
    </div>
  );

  if (phase === "laden") return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.97)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:18,width:"100%",maxWidth:520,maxHeight:"80vh",overflow:"auto",padding:28}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:17,fontWeight:800,color:"var(--text)"}}>📂 Projekt laden</div>
            {dbOk && <div style={{fontSize:10,color:"var(--green)",marginTop:3}}>● Verbunden mit Datenbank</div>}
            {!dbOk && <div style={{fontSize:10,color:"var(--text3)",marginTop:3}}>Lokale Projekte</div>}
          </div>
          <button onClick={()=>setPhase("start")} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:20}}>←</button>
        </div>
        {projekte.length > 3 && (
          <input
            value={suche} onChange={e=>setSuche(e.target.value)}
            placeholder="Projekt suchen…"
            style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border2)",borderRadius:8,padding:"8px 12px",color:"var(--text)",fontSize:13,marginBottom:12,boxSizing:"border-box"}}
          />
        )}
        {gefilterteProjekte.length === 0
          ? <div style={{color:"var(--text3)",fontSize:13,textAlign:"center",padding:32}}>{suche ? "Keine Projekte gefunden" : "Keine gespeicherten Projekte"}</div>
          : gefilterteProjekte.map(p => (
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:"var(--text)",fontSize:14}}>{p.name}</div>
                  <div style={{fontSize:10,color:"var(--text3)",marginTop:3,display:"flex",gap:8,flexWrap:"wrap"}}>
                    <span>{p.datum}</span>
                    {p.projekt?.ersteller && <span style={{color:"var(--blue)"}}>· {p.projekt.ersteller}</span>}
                    {p.projekt?.standort  && <span>· {p.projekt.standort}</span>}
                    <span>· {(p.kabel||p.stromkreise||[]).length} Kabel</span>
                  </div>
                </div>
                <button onClick={()=>onLaden(p)} style={{...bSec,color:"var(--blue)",borderColor:"rgba(33,150,201,0.15)",padding:"7px 14px"}}>Laden</button>
                <button onClick={()=>onLoescheProjekt(p.id||p.db_id)} style={bDanger}>✕</button>
              </div>
            ))
        }
      </div>
    </div>
  );

  // Start-Phase
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.97)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      {onBack && (
        <button onClick={onBack} style={{position:"absolute",top:16,left:16,background:"none",border:"1px solid var(--border2)",color:"var(--text3)",cursor:"pointer",fontSize:13,borderRadius:8,padding:"7px 12px",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.color="var(--text)";e.currentTarget.style.borderColor="var(--border)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="var(--text3)";e.currentTarget.style.borderColor="var(--border2)";}}>
          ← <span>Dashboard</span>
        </button>
      )}
      <div style={{textAlign:"center",maxWidth:440,width:"100%"}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:32}}>
          <div style={{width:56,height:56,borderRadius:14,background:"rgba(33,150,201,0.12)",border:"1px solid rgba(33,150,201,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="30" height="30" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="12" height="12" rx="2.5" fill="#2196C9"/>
              <rect x="0" y="14" width="5" height="5" rx="1" fill="#2196C9" opacity="0.7"/>
              <rect x="7" y="14" width="5" height="5" rx="1" fill="#2196C9" opacity="0.7"/>
              <rect x="14" y="0" width="12" height="5" rx="1.5" fill="#2196C9" opacity="0.4"/>
              <rect x="14" y="7" width="8" height="5" rx="1.5" fill="#2196C9" opacity="0.25"/>
            </svg>
          </div>
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:22,fontWeight:800,color:"var(--text)",letterSpacing:"-0.5px",lineHeight:1}}>Verteilerplaner</div>
            <div style={{fontSize:11,color:"var(--text3)",marginTop:4}}>Elektroverteiler planen & dokumentieren</div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={()=>setPhase("neu")}
            style={{...bPrimary,fontSize:15,padding:"15px 24px",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            ⚡ Neues Projekt anlegen
          </button>
          <button onClick={()=>setPhase("laden")}
            style={{background:"var(--bg2)",border:"1px solid var(--border2)",color:"var(--text2)",borderRadius:12,padding:"15px 24px",cursor:"pointer",fontSize:14,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--blue)";e.currentTarget.style.color="var(--blue)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color="var(--text2)";}}>
            📂 Vorhandenes Projekt laden
            {projekte.length > 0 && <span style={{background:"var(--blue)",color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:11,fontWeight:800}}>{projekte.length}</span>}
          </button>
        </div>

        {/* DB Status */}
        <div style={{marginTop:24,fontSize:11,color:"var(--text3)"}}>
          {dbOk
            ? <span style={{color:"var(--green)"}}>● Datenbankverbindung aktiv</span>
            : <span>💾 Lokale Speicherung · <a href="#" onClick={e=>{e.preventDefault();}} style={{color:"var(--blue)",textDecoration:"none"}}>Datenbank einrichten →</a></span>
          }
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ── Einstellungs-Modal ──
// ══════════════════════════════════════════
function SettingsModal({ settings, onSave, onClose }) {
  const [s, setS] = useState({...settings});
  const [apiCfg, setApiCfg] = useState(ladeApiConfig);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(s);
    speichereApiConfig(apiCfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const apiPresets = [
    {label:"Anthropic Claude", url:"https://api.anthropic.com/v1/messages",    model:"claude-sonnet-4-20250514"},
    {label:"OpenAI",           url:"https://api.openai.com/v1/chat/completions", model:"gpt-4o"},
    {label:"Ollama (lokal)",   url:"http://localhost:11434/v1/chat/completions", model:"llava"},
    {label:"LM Studio",        url:"http://localhost:1234/v1/chat/completions",  model:"llava"},
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.92)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"90vh",overflow:"auto",padding:28}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{fontSize:17,fontWeight:800,color:"var(--text)"}}>⚙️ Einstellungen</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text3)",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>

        {/* Firma & Export */}
        <div style={{marginBottom:20,paddingBottom:20,borderBottom:"1px solid var(--border)"}}>
          <div style={{fontSize:11,color:"var(--blue)",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:12}}>Firma & Export</div>
          <div style={{marginBottom:10}}>
            <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>Firmenname (für Stückliste & Beschriftungsplan)</div>
            <input value={s.firmenname} onChange={e=>setS(x=>({...x,firmenname:e.target.value}))}
              placeholder="z.B. Meine Firma GmbH"
              style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",color:"var(--text)",fontSize:13}}/>
          </div>
          <div>
            <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>Standard-Ersteller (Vorausfüllung bei neuem Projekt)</div>
            <input value={s.defaultErsteller} onChange={e=>setS(x=>({...x,defaultErsteller:e.target.value}))}
              placeholder="Dein Name"
              style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",color:"var(--text)",fontSize:13}}/>
          </div>
        </div>

        {/* KI-API */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:"var(--blue)",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:12}}>KI-Foto-Import (optional)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
            {apiPresets.map(p=>(
              <button key={p.label} onClick={()=>setApiCfg(c=>({...c,...p}))}
                style={{background:"var(--border)",border:"1px solid var(--border2)",borderRadius:7,padding:"5px 10px",color:"var(--text2)",fontSize:11,cursor:"pointer"}}>{p.label}</button>
            ))}
          </div>
          <div style={{marginBottom:8}}>
            <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>API URL</div>
            <input value={apiCfg.url} onChange={e=>setApiCfg(c=>({...c,url:e.target.value}))}
              style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",color:"var(--text2)",fontSize:11,fontFamily:"var(--mono)"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div>
              <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>Modell</div>
              <input value={apiCfg.model} onChange={e=>setApiCfg(c=>({...c,model:e.target.value}))}
                style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",color:"var(--text2)",fontSize:11,fontFamily:"var(--mono)"}}/>
            </div>
            <div>
              <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:5,fontWeight:600}}>API Key</div>
              <input type="password" value={apiCfg.apiKey} onChange={e=>setApiCfg(c=>({...c,apiKey:e.target.value}))}
                placeholder="sk-... oder leer"
                style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px",color:"var(--text2)",fontSize:12}}/>
            </div>
          </div>
        </div>

        <button onClick={handleSave}
          style={{...bPrimary,width:"100%",fontSize:14,padding:"12px"}}>
          {saved ? "✓ Gespeichert!" : "Einstellungen speichern"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// ── Hauptkomponente ──
// ══════════════════════════════════════════
export default function Verteilerplaner({ onBack } = {}) {
  const [step, setStep] = useState(1);
  const [projekt, setProjekt]     = useState({ name:"", adresse:"", ersteller:"", standort:"" });
  const [kabel, setKabel]         = useState([]);          // Step 2: Kabel
  const [sicherungen, setSicherungen] = useState([]);               // Step 3: Sicherungsgruppen
  const [fiKonfigs, setFiKonfigs] = useState([mkFI(), mkFI()]);     // Step 4: FI-Planung
  const [plan, setPlan]           = useState(null);                  // Step 5: Plan
  const [stockwerke, setStockwerke] = useState([]);
  const [raeume, setRaeume]       = useState([]);
  const [planTyp, setPlanTyp]     = useState("visuell");
  const [activeTab, setActiveTab] = useState("plan");
  const [mitRK, setMitRK]         = useState(false);
  const [istKNX, setIstKNX]         = useState(false);
  const [mitQV, setMitQV]           = useState(false);
  const [currentDbId, setCurrentDbId] = useState(null); // Supabase UUID des aktuellen Projekts
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [settings, setSettings]   = useState(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [mitNBruecke, setMitNBruecke] = useState(false);
  const [editKabelId, setEditKabelId] = useState(null);
  const [showBeschriftung, setShowBeschriftung] = useState(false);
  const [showStueckliste, setShowStueckliste] = useState(false);
  const [showFoto, setShowFoto]   = useState(false);
  const [projekte, setProjekte]   = useState(loadProjekte);
  const [showSave, setShowSave]   = useState(false);
  const [showLoad, setShowLoad]   = useState(false);
  const [ladesuche, setLadesuche] = useState("");
  const [saveName, setSaveName]   = useState("");
  const [newSW, setNewSW]         = useState("");
  const [newSWColor, setNewSWColor] = useState("var(--green)");
  const [showSWInput, setShowSWInput] = useState(false);
  const [swColorMap, setSwColorMap]  = useState({...SW_COLOR_DEFAULT});
  const [newRaum, setNewRaum]     = useState("");
  const [showRaumInput, setShowRaumInput] = useState(false);

  const [showInfo, setShowInfo] = useState(false);
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
  const doUndo = useCallback(() => {
    if(!undoStack.length) return;
    const last = undoStack[undoStack.length-1];
    last.restoreFn();
    setUndoStack(s=>s.slice(0,-1));
    showToast(`"${last.label}" wiederhergestellt`);
  }, [undoStack, showToast]);
  // Keyboard shortcut Ctrl+Z
  useEffect(()=>{
    const handler = (e) => {
      if((e.ctrlKey||e.metaKey) && e.key==='z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
    };
    window.addEventListener('keydown', handler);
    return ()=>window.removeEventListener('keydown', handler);
  }, [doUndo]);

  // Drag refs – Step 2 (Kabel sortieren) + Step 3 (Kabel auf Sicherungen ziehen)
  const dragKabelId   = useRef(null);
  const dragOverId    = useRef(null);
  const dragFromSich  = useRef(null); // null = aus Kabel-Pool, sonst sicherung.id
  // Plan-Drag
  const planDragSK = useRef(null), planDragFI = useRef(null);
  // Touch Drag
  const touchKabelId = useRef(null);
  const touchLastZone = useRef(null);
  const touchGhost = useRef(null);
  const kabelListRef = useRef(null);

  // Nicht-passive touchstart auf der Kabel-Liste → verhindert Textmarkierung beim Wischen
  useEffect(() => {
    const el = kabelListRef.current;
    if (!el) return;
    const prevent = (e) => { if (e.target.closest("[data-kabelid]")) e.preventDefault(); };
    el.addEventListener("touchstart", prevent, { passive: false });
    return () => el.removeEventListener("touchstart", prevent);
  }, []);
  const onTouchStartKabel = (e,kId) => {
    // Prevent text selection immediately
    e.preventDefault();
    touchKabelId.current=kId;
    // Create a ghost element for visual feedback
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    ghost.className = "drag-ghost";
    ghost.style.width = rect.width + "px";
    ghost.style.left = rect.left + "px";
    ghost.style.top = rect.top + "px";
    document.body.appendChild(ghost);
    touchGhost.current = ghost;
  };
  const onTouchMoveKabel = useCallback((e) => {
    if(!touchKabelId.current) return;
    e.preventDefault();
    const t=e.touches[0];
    // Move ghost
    if(touchGhost.current){
      touchGhost.current.style.left = (t.clientX - 40) + "px";
      touchGhost.current.style.top  = (t.clientY - 20) + "px";
    }
    if(touchLastZone.current) touchLastZone.current.classList.remove('touch-over');
    const zone=document.elementFromPoint(t.clientX,t.clientY)?.closest?.('[data-sichid]');
    if(zone){ zone.classList.add('touch-over'); touchLastZone.current=zone; }
  }, []);
  const onTouchEndKabel = (e) => {
    if(!touchKabelId.current) return;
    e.preventDefault();
    if(touchLastZone.current) touchLastZone.current.classList.remove('touch-over');
    if(touchGhost.current){ document.body.removeChild(touchGhost.current); touchGhost.current=null; }
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
    setNewSWColor(randSwColor(Object.values(swColorMap)));
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
    const idx=sicherungen.findIndex(x=>x.id===id);
    const sSnap=[...sicherungen];
    setSicherungen(s=>s.filter(x=>x.id!==id));
    if(idx>=0) { pushUndo(`Sicherung LS${idx+1}`, ()=>setSicherungen(sSnap)); showToast(`Sicherung gelöscht — Ctrl+Z zum Rückgängig`,"error",3500); }
  };
  const updSicherung = (id,k,v) => setSicherungen(s=>s.map(x=>x.id===id?{...x,[k]:v}:x));

  // Kabel einer Sicherung zuweisen (aus Pool oder aus anderer Sicherung)
  const weiseKabelZu = (kabelId, zielSichId) => {
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
      const gruppen=[...p.gruppen.map(g=>({...g,stromkreise:[...g.stromkreise],phasen:{...g.phasen}}))];
      const von=gruppen[vonIdx], zu=gruppen[zuIdx];
      const skIdx=von.stromkreise.findIndex(s=>s.id===skId);
      if(skIdx<0)return p;
      const [sk]=von.stromkreise.splice(skIdx,1);
      zu.stromkreise.push(sk);
      const sInfo=STD_SICHERUNGEN.find(s=>s.id===sk.sicherung);
      const te=sInfo?.te||1, amp=sInfo?.ampere||16;
      von.belegteTE-=te; von.lastA-=amp;
      zu.belegteTE+=te;  zu.lastA+=amp;
      // Phasenlasten mitpflegen
      if(sk.is3p){
        von.phasen.L1=Math.max(0,von.phasen.L1-amp); von.phasen.L2=Math.max(0,von.phasen.L2-amp); von.phasen.L3=Math.max(0,von.phasen.L3-amp);
        zu.phasen.L1+=amp; zu.phasen.L2+=amp; zu.phasen.L3+=amp;
      } else if(sk.assignedPhase && sk.assignedPhase!=="Auto" && sk.assignedPhase!=="3P"){
        von.phasen[sk.assignedPhase]=Math.max(0,(von.phasen[sk.assignedPhase]||0)-amp);
        zu.phasen[sk.assignedPhase]=(zu.phasen[sk.assignedPhase]||0)+amp;
      }
      return {...p,gruppen};
    });
  };
  const onPlanDrop=targetIdx=>{
    if(!planDragSK.current)return;
    const vonIdx=plan.gruppen.findIndex(g=>g.id===planDragFI.current);
    verschiebeImPlan(planDragSK.current,vonIdx,targetIdx);
    planDragSK.current=null; planDragFI.current=null;
  };

  // ── Hilfsfunktion: aktueller Zustand als Speicher-Objekt ──────────────────
  const buildSavePayload = (name) => ({
    db_id:    currentDbId,
    projekt:  { ...projekt, name: name || projekt.name },
    kabel, sicherungen, fiKonfigs, stockwerke, raeume, swColorMap,
    plan,
    uiState: { step, activeTab, planTyp, mitRK, mitQV, mitNBruecke, istKNX },
  });

  // ── Speichern (lokal + optional Supabase) ─────────────────────────────────
  const speichere = async () => {
    const nameToSave = saveName.trim() || projekt.name || `Projekt ${new Date().toLocaleDateString("de-DE")}`;
    const payload = buildSavePayload(nameToSave);

    // 1. Supabase (wenn konfiguriert)
    let newDbId = currentDbId;
    if (isSupabaseConfigured()) {
      try {
        const saved = await saveProjektDB(payload);
        newDbId = saved.db_id;
        setCurrentDbId(newDbId);
        showToast(`"${nameToSave}" in Datenbank gespeichert ✓`);
      } catch(e) {
        showToast(`Datenbank-Fehler: ${e.message}`, "error", 4000);
      }
    }

    // 2. Immer auch lokal speichern (Fallback)
    const entry = {
      id: newDbId || uid(),
      db_id: newDbId,
      name: nameToSave,
      datum: new Date().toLocaleDateString("de-DE"),
      projekt: { ...projekt, name: nameToSave },
      fiKonfigs, kabel, sicherungen, stockwerke, raeume, swColorMap,
      plan, uiState: { step, activeTab, planTyp, mitRK, mitQV, mitNBruecke, istKNX },
    };
    const neu = [entry, ...projekte.filter(p => p.name !== nameToSave && p.id !== entry.id)];
    setProjekte(neu); saveProjekte(neu); setShowSave(false); setSaveName("");
    if (!isSupabaseConfigured()) showToast(`"${nameToSave}" gespeichert ✓`);
  };

  // ── Auto-Speichern (nach Plan-Generierung, wenn Projekt hat Name) ──────────
  const autoSpeichere = useCallback(async () => {
    if (!projekt.name) return;
    const payload = buildSavePayload(projekt.name);
    if (isSupabaseConfigured()) {
      try {
        const saved = await saveProjektDB(payload);
        setCurrentDbId(saved.db_id);
        showToast("Auto-gespeichert ✓", "success", 1800);
      } catch { /* still works locally */ }
    }
    const entry = {
      id: currentDbId || uid(), db_id: currentDbId,
      name: projekt.name, datum: new Date().toLocaleDateString("de-DE"),
      projekt, fiKonfigs, kabel, sicherungen, stockwerke, raeume, swColorMap,
      plan, uiState: { step, activeTab, planTyp, mitRK, mitQV, mitNBruecke, istKNX },
    };
    const neu = [entry, ...projekte.filter(p => p.name !== projekt.name && p.id !== entry.id)];
    setProjekte(neu); saveProjekte(neu);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projekt, kabel, sicherungen, fiKonfigs, stockwerke, raeume, swColorMap, currentDbId, projekte]);

  // ── Laden ─────────────────────────────────────────────────────────────────
  const lade = p => {
    const pr = p.projekt || { name:p.name||"", adresse:"", ersteller:"", standort:"" };
    setProjekt({ name:"", adresse:"", ersteller:"", standort:"", ...pr });
    setCurrentDbId(p.db_id || null);
    setFiKonfigs(p.fiKonfigs||[mkFI(),mkFI()]);
    // Legacy: alte Projekte hatten stromkreise, neue haben kabel+sicherungen
    if (p.kabel) {
      setKabel(p.kabel); setSicherungen(p.sicherungen||[]);
    } else if (p.stromkreise) {
      const migKabel = p.stromkreise.map(sk=>({
        id:sk.id, bezeichnung:sk.kabel||"", raum:sk.raum||"", stockwerk:sk.stockwerk||"EG",
        kabelTyp:sk.kabelTyp||"NYM-J", kabelAdern:sk.kabelAdern||3, kabelQs:sk.kabelQs||"2.5",
        dreipolig:!!sk.dreipolig,
      }));
      setKabel(migKabel);
      setSicherungen(p.stromkreise.map(sk=>({
        id:uid(), kabelIds:[sk.id], sicherung:sk.sicherung||"B16",
        phase:sk.phase||"Auto", istFILS:!!sk.istFILS,
      })));
    }
    setStockwerke(p.stockwerke||[]);
    if(p.swColorMap) setSwColorMap({...SW_COLOR_DEFAULT,...p.swColorMap});
    setRaeume(p.raeume||[]);
    // UI-Zustand wiederherstellen
    const ui = p.uiState || {};
    setPlan(p.plan || null);
    setStep(ui.step || 1);
    setActiveTab(ui.activeTab || "plan");
    setPlanTyp(ui.planTyp || "visuell");
    setMitRK(ui.mitRK || false);
    setMitQV(ui.mitQV || false);
    setMitNBruecke(ui.mitNBruecke || false);
    setIstKNX(ui.istKNX || false);
    setShowLoad(false);
    setShowStartScreen(false);
  };

  // ── Projekte-Liste beim Start aus Supabase laden ───────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    loadProjekteDB().then(dbList => {
      if (dbList && dbList.length > 0) {
        // Merge DB-Projekte mit lokalen (DB hat Priorität)
        const merged = [...dbList];
        loadProjekte().forEach(local => {
          if (!merged.find(d => d.id === local.db_id || d.name === local.name))
            merged.push(local);
        });
        setProjekte(merged);
        saveProjekte(merged);
      }
    }).catch(() => { /* Fallback auf localStorage bleibt */ });
  }, []);

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
    txt += `\n– ${settings.firmenname||""}`;
    if(projekt.ersteller) txt += ` · ${projekt.ersteller}`;
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
    txt += `\n– ${settings.firmenname||""}`;
    if(projekt.ersteller) txt += ` · ${projekt.ersteller}`;
    return txt;
  };
  const loescheProjekt = async id => {
    const p = projekte.find(x => x.id === id || x.db_id === id);
    const neu = projekte.filter(x => x.id !== id && x.db_id !== id);
    setProjekte(neu); saveProjekte(neu);
    if (p) showToast(`"${p.name}" gelöscht`, "error");
    if (p?.db_id && isSupabaseConfigured()) {
      try { await deleteProjektDB(p.db_id); } catch { /* lokal schon gelöscht */ }
    }
  };

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

  const generiere = () => {
    showToast("Plan erfolgreich generiert ⚡");
    const sichFuerPlan = buildSicherungenFuerPlan();
    setPlan(verteile(sichFuerPlan, fiKonfigs));
    setStep(5); setActiveTab("plan"); setMitRK(false);
    // Auto-Save nach Plangenerierung
    setTimeout(() => autoSpeichere(), 500);
  };

  // Aufklapp-Status für Sicherungs-Karten (Step 3)
  // ── Startfenster-Handler ──────────────────────────────────────────────────
  const handleNeuStart = (form) => {
    // Neues Projekt initialisieren
    setProjekt({ name:form.name||"", adresse:form.adresse||"", ersteller:form.ersteller||settings.defaultErsteller||"", standort:form.standort||"" });
    setKabel([]); setSicherungen([]); setFiKonfigs([mkFI(),mkFI()]); setPlan(null);
    setStockwerke([]); setRaeume([]); setSwColorMap({...SW_COLOR_DEFAULT});
    setCurrentDbId(null); setStep(1); setShowStartScreen(false);
  };

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
    "rk_n_fils":     {bg:"rgba(33,150,201,0.12)",border:"rgba(33,150,201,0.45)",label:"N",color:"var(--blue)",w:22},
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
          groups.push({kabelLabel:lbl, kabelColor:col, klemmen, sicherung:sk.sicherung, skId:sk.id});
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
      addSpecial("n_endklemme","N-End.");
    } else {
      // FILS: kein NE/NX, aber PE-Klemme am Anfang
      // Pro Kabel: rk_n_fils (3-pol: PE+L1+N direkt) + rk_ohne_pe (L2+L3 bei 5×)
      addSpecial("pe_einspeisung","FILS PE");
      let hatKlemmen=0;
      (filsSk.kabelIds||[]).forEach(kid=>{
        const k=kabel.find(x=>x.id===kid);
        if(!k)return;
        const {ohnePE}=klemmenFuerKabel(k.kabelAdern);
        const lbl=k.bezeichnung||k.raum||"?";
        const col=swColor(k.stockwerk);
        const klemmen=[];
        klemmen.push({type:"rk_n_fils",label:lbl}); // 3-pol: PE+L1+N (immer bei FILS)
        for(let i=0;i<ohnePE;i++) klemmen.push({type:"rk_ohne_pe",label:lbl}); // L2+L3 bei 5×
        groups.push({kabelLabel:lbl, kabelColor:col, klemmen});
        hatKlemmen++;
      });
      if(hatKlemmen>0) addSpecial("abdeckkappe_orange");
    }
    return groups;
  };

  // ── Querverbinder-Berechnung ──
  // Klemmentypen in der Sequenz:
  //   'L'  = rk_mit_pe   (L1 + PE + N-Schieber zur N-Schiene)
  //   'LL' = rk_ohne_pe  (L2 + L3, 2-polig, kein N/PE — bei 5× und mehr)
  //   'N'  = rk_n_fils   (N-Klemme, nur bei FILS — da keine N-Schiene vorhanden)
  //
  // Normale FI-Kreise: nur L-Bridge nötig ('LL'-Klemmen zwischen L1-Klemmen → abzwicken)
  // FILS: L-Bridge + N-Bridge; 'LL'/'L' zwischen N-Klemmen → abzwicken (und umgekehrt)

  // Flache Klemmensequenz für normale FI-Kreise
  const buildKlemmenSeqNormal = (kids) => {
    const seq=[];
    kids.forEach(kid=>{
      const k=kabel.find(x=>x.id===kid);
      if(!k) return;
      const {mitPE,ohnePE}=klemmenFuerKabel(k.kabelAdern);
      for(let i=0;i<mitPE;i++) seq.push('L');   // L1+PE+N-Schieber
      for(let i=0;i<ohnePE;i++) seq.push('LL'); // L2+L3 (2-polig)
    });
    return seq;
  };

  // Flache Klemmensequenz für FILS
  // rk_n_fils ist 3-pol (PE+L1+N) → immer 'N' pro Kabel; rk_ohne_pe (L2+L3) → 'LL'
  const buildKlemmenSeqFILS = (kids) => {
    const seq=[];
    kids.forEach(kid=>{
      const k=kabel.find(x=>x.id===kid);
      if(!k) return;
      const {ohnePE}=klemmenFuerKabel(k.kabelAdern);
      seq.push('N');                              // rk_n_fils: PE+L1+N (3-pol)
      for(let i=0;i<ohnePE;i++) seq.push('LL'); // L2+L3
    });
    return seq;
  };

  // Berechnet Bridge-Span und Pins die abgezwickt werden müssen.
  // targetType: 'L'|'N' — alle anderen Typen im Span werden als clipPins markiert.
  const berechneBridge = (seq, targetType) => {
    const targetIdx=seq.map((t,i)=>t===targetType?i:-1).filter(i=>i>=0);
    if(targetIdx.length<2) return null;
    const firstPos=targetIdx[0], lastPos=targetIdx[targetIdx.length-1];
    const span=lastPos-firstPos+1;
    // Pins abzwicken: jede Nicht-Ziel-Klemme zwischen erster und letzter Ziel-Klemme (1-indiziert)
    const clipPins=seq.slice(firstPos,lastPos+1)
      .map((t,i)=>t!==targetType?(i+1):-1).filter(i=>i>=0);
    return {ports:span, clipPins, count:targetIdx.length};
  };

  const berechneQuerverbinder = () => {
    if(!plan) return [];
    const result=[];

    // Normale FI-Gruppen → nur L-Bridge
    // ('LL'-Klemmen zwischen L1-Klemmen müssen abgezwickt werden)
    plan.gruppen.forEach((fi,fiIdx)=>{
      fi.stromkreise.forEach((sk,skIdx)=>{
        if(sk.istReserve) return;
        const kids=sk.kabelIds||[];
        if(kids.length<2) return;
        const seq=buildKlemmenSeqNormal(kids);
        const bridge=berechneBridge(seq,'L');
        if(!bridge||bridge.count<2) return;
        const fLabel=`Q${fiIdx+1}F${skIdx+1}`;
        const skLabel=kids.map(id=>kabel.find(x=>x.id===id)).filter(Boolean)
                         .map(k=>k.bezeichnung||k.raum||'?').join(' + ');
        result.push({fLabel, skLabel, ports:bridge.ports, clipPins:bridge.clipPins,
                     count:bridge.count, typ:'L', color:'#ff6b6b', fils:false});
      });
    });

    // FILS → L-Bridge + N-Bridge (rk_n_fils = 3-pol PE+L1+N)
    // Beide Brücken haben gleichen Span (L und N Seite der 3-pol Klemme)
    // Bei 5×-Kabeln: zusätzlich LL-Bridge für rk_ohne_pe (L2+L3)
    plan.fils.forEach((sk,i)=>{
      const kids=sk.kabelIds||[];
      if(kids.length<2) return;
      const seq=buildKlemmenSeqFILS(kids);
      const fLabel=`Q${plan.gruppen.length+i+1} FILS`;
      const skLabel=kids.map(id=>kabel.find(x=>x.id===id)).filter(Boolean)
                       .map(k=>k.bezeichnung||k.raum||'?').join(' + ');
      const nBridge=berechneBridge(seq,'N');
      if(nBridge&&nBridge.count>=2){
        // L-QV: L1-Seite der 3-pol Klemmen brücken
        result.push({fLabel,skLabel,ports:nBridge.ports,clipPins:nBridge.clipPins,
                     count:nBridge.count,typ:'L',color:'#ff6b6b',fils:true});
        // N-QV: N-Seite der 3-pol Klemmen brücken
        result.push({fLabel,skLabel,ports:nBridge.ports,clipPins:nBridge.clipPins,
                     count:nBridge.count,typ:'N',color:'#1d6dbf',fils:true});
      }
      // Bei 5×-Kabeln: LL-Bridge für rk_ohne_pe (L2+L3)
      const llBridge=berechneBridge(seq,'LL');
      if(llBridge&&llBridge.count>=2)
        result.push({fLabel,skLabel,ports:llBridge.ports,clipPins:llBridge.clipPins,
                     count:llBridge.count,typ:'LL',color:'#ff8c00',fils:true});
    });

    return result;
  };

  const querverbinder = mitQV ? berechneQuerverbinder() : [];

  // QV Stückliste: gruppiert nach Ports-Anzahl
  const qvStueckliste = (() => {
    if(!mitQV||!querverbinder.length) return [];
    const counts={};
    querverbinder.forEach(q=>{ counts[q.ports]=(counts[q.ports]||0)+1; });
    return Object.entries(counts).map(([p,n])=>({ports:Number(p),anzahl:n})).sort((a,b)=>a.ports-b.ports);
  })();
const stueckliste = (() => {
    if(!plan) return [];
    const base = berechneStueckliste(plan,mitRK,kabel,istKNX,sicherungen,mitNBruecke);
    if(!mitRK) return base;
    // Querverbinder hinzufügen wenn aktiviert
    if(mitQV && querverbinder.length>0) {
      qvStueckliste.forEach(({ports,anzahl})=>{
        base.push({label:`Querverbinder / Klemmbrücke ${ports}-fach`, menge:anzahl, kat:"Reihenklemmen"});
      });
    }
    // N-Brücke: Länge = (alle Klemmen im Block + Abdeckkappen) × Rastermaß 6,2mm
    // + 1× Abdeckung gleicher Länge je Block (identische Länge)
    if(mitNBruecke && plan.gruppen.length>0) {
      const laengenMap = {};
      plan.gruppen.forEach(fi => {
        let klemmenAnzahl = 2; // PE-Einspeisung + N-Einspeisung
        let kappenAnzahl  = 0;
        fi.stromkreise.forEach(sk => {
          (sk.kabelIds||[]).forEach(kid => {
            const k = kabel.find(x=>x.id===kid);
            if(!k) return;
            const {mitPE,ohnePE} = klemmenFuerKabel(k.kabelAdern);
            klemmenAnzahl += mitPE + ohnePE;
          });
        });
        if(istKNX){ klemmenAnzahl+=1; kappenAnzahl+=1; }
        if(klemmenAnzahl>2) kappenAnzahl+=1;
        klemmenAnzahl+=1; // N-Endklemme
        const laengeMM = Math.ceil((klemmenAnzahl * 6.2) + (kappenAnzahl * 2));
        laengenMap[laengeMM] = (laengenMap[laengeMM]||0) + 1;
      });
      Object.entries(laengenMap).sort(([a],[b])=>Number(a)-Number(b)).forEach(([mm,cnt])=>{
        base.push({label:`N-Brücke ${mm}mm (NE→NX)`, menge:cnt, kat:"Reihenklemmen"});
        base.push({label:`Abdeckung N-Brücke ${mm}mm`, menge:cnt, kat:"Reihenklemmen"});
      });
    }
    return base;
  })();

  // ══ RENDER ══
  return (
    <div style={{fontFamily:"'Outfit',sans-serif",background:"#111416",minHeight:"100vh",color:"#e8e4de"}}>
      {/* ── STARTFENSTER ── */}
      {showStartScreen && (
        <StartScreen
          projekte={projekte}
          onNeu={handleNeuStart}
          onLaden={p => { lade(p); }}
          onLoescheProjekt={loescheProjekt}
          onBack={onBack}
        />
      )}
      <style>{`
        .sichzone{transition:background 0.15s,border-color 0.15s,box-shadow 0.15s;}
        .sichzone.dragover{background:rgba(33,150,201,0.05)!important;border-color:var(--blue)!important;box-shadow:0 0 0 2px rgba(33,150,201,0.15)!important;}
        .sichzone.touch-over{background:rgba(33,150,201,0.05)!important;border-color:var(--blue)!important;}
        .main-wrap{max-width:960px;margin:0 auto;padding:20px 16px;}
        .step3-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .header-nav{display:flex;gap:4px;margin-left:8px;flex-wrap:wrap;}
        .btn-hover:hover{opacity:0.85;transform:translateY(-1px);}
        .card-hover:hover{border-color:var(--border2)!important;box-shadow:0 4px 24px rgba(0,0,0,0.35)!important;}
        .fi-zone:hover{border-color:var(--border2)!important;}
        button{transition:all 0.15s;}
        button:active{transform:scale(0.97);}
        .step-indicator{display:flex;align-items:center;gap:0;}
        /* Custom Tooltip */
        .tip-wrap{position:relative;}
        .tip{
          position:absolute;left:50%;transform:translateX(-50%);
          background:#0d1114;border:1px solid var(--border2);
          color:var(--text2);font-size:11px;font-weight:500;line-height:1.4;
          white-space:nowrap;padding:6px 10px;border-radius:7px;
          pointer-events:none;opacity:0;transition:opacity 0.15s,transform 0.15s;
          z-index:300;box-shadow:0 4px 16px rgba(0,0,0,0.5);
          font-family:'Outfit',sans-serif;letter-spacing:0;
        }
        .tip::before{
          content:"";position:absolute;left:50%;transform:translateX(-50%);
          border:5px solid transparent;
        }
        .tip-bottom{top:calc(100% + 7px);}
        .tip-bottom::before{bottom:100%;border-bottom-color:#0d1114;}
        .tip-top{bottom:calc(100% + 7px);}
        .tip-top::before{top:100%;border-top-color:#0d1114;}
        .tip-wrap:hover .tip{opacity:1;}
        /* Touch drag */
        .draggable{-webkit-user-select:none;user-select:none;touch-action:none;}
        .draggable:active{cursor:grabbing;}
        .drag-ghost{position:fixed;pointer-events:none;z-index:9999;opacity:0.85;transform:scale(1.05);box-shadow:0 8px 32px rgba(0,0,0,0.5);}
        @media(max-width:640px){
          .step3-grid{grid-template-columns:1fr;}
          .main-wrap{padding:10px 8px;}
          select{min-height:40px;font-size:14px!important;}
          .mobile-stack{flex-direction:column!important;}
          .mobile-full{width:100%!important;flex:1 1 100%!important;}
          .mobile-hide{display:none!important;}
          .step-label{display:none;}
          /* Header 2-Zeilen Layout auf Handy */
          .header-outer{
            flex-wrap:wrap!important;
            height:auto!important;
            padding:7px 10px 0!important;
            gap:0!important;
          }
          .header-center-nav{
            order:10;
            flex:none!important;
            width:100%!important;
            max-width:none!important;
            margin-left:0!important;
            overflow-x:auto;
            -webkit-overflow-scrolling:touch;
            scrollbar-width:none;
            padding:5px 0 7px!important;
            border-top:1px solid var(--border);
            justify-content:flex-start!important;
            gap:5px!important;
          }
          .header-center-nav::-webkit-scrollbar{display:none;}
          .header-center-nav button{padding:6px 10px!important;font-size:11px!important;white-space:nowrap!important;}
          .header-logo-text{display:none!important;}
          .header-version{display:none!important;}
          .header-photo-btn{display:none!important;}
          .header-settings-btn{display:none!important;}
          .header-info-btn{display:none!important;}
          .nav-label-long{display:none;}
          .nav-label-short{display:inline!important;}
        }
        @media(min-width:641px){
          .nav-label-short{display:none;}
          .nav-label-long{display:inline;}
        }
        @media(min-width:1024px){
          .main-wrap{max-width:1100px;padding:24px 28px;}
        }
      `}</style>

      {/* ── HEADER ── */}
      <div className="no-print header-outer" style={{background:"var(--bg2)",borderBottom:"1px solid var(--border)",padding:"0 12px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)"}}>

        {/* LEFT: Dashboard-Back + Logo */}
        <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
          {onBack && (
            <button onClick={onBack} title="Zurück zum Dashboard"
              style={{height:32,borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:600,padding:"0 10px",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s",marginRight:4}}
              onMouseEnter={e=>{e.currentTarget.style.color="var(--text)";e.currentTarget.style.borderColor="var(--border2)";}}
              onMouseLeave={e=>{e.currentTarget.style.color="var(--text3)";e.currentTarget.style.borderColor="var(--border)";}}>
              ← <span className="nav-label-long">Dashboard</span>
            </button>
          )}
          <div onClick={()=>setShowStartScreen(true)} title="Zur Projektauswahl" style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",borderRadius:8,padding:"4px 6px",transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="12" height="12" rx="2.5" fill="#2196C9"/>
              <rect x="0" y="14" width="5" height="5" rx="1" fill="#2196C9" opacity="0.7"/>
              <rect x="7" y="14" width="5" height="5" rx="1" fill="#2196C9" opacity="0.7"/>
              <rect x="14" y="0" width="12" height="5" rx="1.5" fill="#2196C9" opacity="0.4"/>
              <rect x="14" y="7" width="8" height="5" rx="1.5" fill="#2196C9" opacity="0.25"/>
            </svg>
            <div className="header-logo-text">
              <div style={{fontSize:13,fontWeight:800,color:"var(--text)",letterSpacing:"-0.3px",lineHeight:1}}>Verteilerplaner</div>
            </div>
            <span className="header-version" style={{fontSize:8,color:"var(--text3)",fontFamily:"var(--mono)",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:3,padding:"2px 5px",letterSpacing:"0.3px",flexShrink:0}}>v2026.3.2</span>
          </div>
        </div>

        {/* CENTER: Step Navigation */}
        <div className="header-nav header-center-nav" style={{flex:1,justifyContent:"center",maxWidth:520}}>
          {[["1","Projekt","Proj"],["2","Kabel","Kabel"],["3","Sicherungen","Sich"],["4","FI","FI"],["5","Plan","Plan"]].map(([n,l,s])=>{
            const ni=Number(n); const active=step===ni; const done=step>ni;
            const erreichbar = ni<=2 || ni<=step || (ni===3&&kabel.length>0) || (ni===4&&kabel.length>0) || (ni===5&&!!plan);
            const grundNav = !erreichbar ? (
              ni===3&&kabel.length===0 ? "Erst Kabel in Schritt 2 anlegen" :
              ni===4&&kabel.length===0 ? "Erst Kabel in Schritt 2 anlegen" :
              ni===5&&!plan            ? "Erst Plan in Schritt 4 generieren" : ""
            ) : "";
            const btn = (
              <button key={n} onClick={()=>{ if(erreichbar) setStep(ni); }}
                style={{background:active?"var(--blue)":done?"rgba(33,150,201,0.08)":"transparent",border:`1px solid ${active?"var(--blue)":done?"rgba(33,150,201,0.25)":"var(--border)"}`,color:active?"#fff":done?"var(--blue)":erreichbar?"var(--text3)":"var(--border2)",borderRadius:6,padding:"5px 11px",cursor:erreichbar?"pointer":"not-allowed",fontSize:11,fontWeight:active?700:done?600:400,transition:"all 0.15s",display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap",opacity:erreichbar?1:0.45}}>
                {done&&!active&&<span style={{fontSize:8,opacity:0.8}}>✓</span>}
                {!erreichbar&&<span style={{fontSize:9}}>🔒</span>}
                <span className="nav-label-long">{l}</span>
                <span className="nav-label-short">{s}</span>
              </button>
            );
            return !erreichbar && grundNav
              ? <Tip key={n} text={grundNav} pos="bottom">{btn}</Tip>
              : <React.Fragment key={n}>{btn}</React.Fragment>;
          })}
        </div>

        {/* RIGHT: Action Icons */}
        <div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>
          {undoStack.length>0&&(
            <button onClick={doUndo} title={`Rückgängig: ${undoStack[undoStack.length-1]?.label}`}
              style={{display:"flex",alignItems:"center",gap:4,padding:"5px 9px",borderRadius:6,border:"1px solid rgba(33,150,201,0.3)",background:"rgba(33,150,201,0.06)",color:"var(--blue)",cursor:"pointer",fontSize:11,fontWeight:600,transition:"all 0.15s"}}>
              ↩ <span className="nav-label-long" style={{fontSize:10}}>Undo</span>
            </button>
          )}
          <div style={{width:1,height:18,background:"var(--border)",margin:"0 3px"}}/>
          <button onClick={()=>setShowLoad(true)} title="Projekt laden"
            style={{position:"relative",width:32,height:32,borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.color="var(--text)";e.currentTarget.style.borderColor="var(--border2)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="var(--text3)";e.currentTarget.style.borderColor="var(--border)";}}>
            📂
            {projekte.length>0&&<span style={{position:"absolute",top:-4,right:-4,background:"var(--blue)",color:"#fff",borderRadius:8,padding:"0 4px",fontSize:8,fontWeight:800,minWidth:14,textAlign:"center",lineHeight:"14px"}}>{projekte.length}</span>}
          </button>
          <button onClick={()=>{setSaveName(projekt.name||"");setShowSave(true);}} title="Projekt speichern"
            style={{width:32,height:32,borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.color="var(--text)";e.currentTarget.style.borderColor="var(--border2)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="var(--text3)";e.currentTarget.style.borderColor="var(--border)";}}>💾</button>
          <div style={{width:1,height:18,background:"var(--border)",margin:"0 3px"}}/>
          <button onClick={()=>setShowFoto(true)} title="Kabelliste aus Foto importieren"
            className="header-photo-btn"
            style={{width:32,height:32,borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.color="var(--text)";e.currentTarget.style.borderColor="var(--border2)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="var(--text3)";e.currentTarget.style.borderColor="var(--border)";}}>📷</button>
          <button onClick={()=>setShowSettings(true)} title="Einstellungen"
            className="header-settings-btn"
            style={{width:32,height:32,borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.color="var(--text)";e.currentTarget.style.borderColor="var(--border2)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="var(--text3)";e.currentTarget.style.borderColor="var(--border)";}}>⚙️</button>
          <button onClick={()=>setShowInfo(true)} title="Über Verteilerplaner"
            className="header-info-btn"
            style={{width:32,height:32,borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.color="var(--text)";e.currentTarget.style.borderColor="var(--border2)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="var(--text3)";e.currentTarget.style.borderColor="var(--border)";}}>ℹ️</button>
        </div>
      </div>

      <div className="main-wrap">
        {/* Step progress bar – auf Mobile ausgeblendet (Header-Nav übernimmt) */}
        <div className="no-print mobile-hide" style={{display:"flex",alignItems:"center",gap:0,marginBottom:20}}>
          {[1,2,3,4,5].map((n,i)=>{
            const active=step===n; const done=step>n;
            const labels=["Projekt","Kabel","Sicherungen","FI-Planung","Belegungsplan"];
            const erreichbar2 = n<=2 || n<=step || (n===3&&kabel.length>0) || (n===4&&kabel.length>0) || (n===5&&!!plan);
            const grund2 = !erreichbar2 ? (
              n===3&&kabel.length===0 ? "🔒 Erst Kabel anlegen" :
              n===4&&kabel.length===0 ? "🔒 Erst Kabel anlegen" :
              n===5&&!plan            ? "🔒 Erst Plan generieren" : ""
            ) : "";
            const dot = (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:erreichbar2?"pointer":"not-allowed",opacity:erreichbar2?1:0.5}}
                onClick={()=>{ if(erreichbar2) setStep(n); }}>
                <div style={{width:28,height:28,borderRadius:"50%",background:active?"var(--blue)":done?"rgba(33,150,201,0.15)":erreichbar2?"var(--bg3)":"var(--bg2)",border:`2px solid ${active?"var(--blue)":done?"rgba(33,150,201,0.4)":erreichbar2?"var(--border)":"#2a3035"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:active?"#fff":done?"var(--blue)":erreichbar2?"var(--text3)":"var(--border2)",transition:"all 0.2s",flexShrink:0}}>
                  {done?<span style={{fontSize:10}}>✓</span>:erreichbar2?n:<span style={{fontSize:10}}>🔒</span>}
                </div>
                <div style={{fontSize:9,color:active?"var(--blue)":done?"var(--blue)":erreichbar2?"var(--text3)":"var(--border2)",fontWeight:active?700:done?500:400,whiteSpace:"nowrap",letterSpacing:"0.3px",transition:"color 0.2s"}} className="nav-label-long">{labels[i]}</div>
              </div>
            );
            return <div key={n} style={{display:"flex",alignItems:"center",flex:n<5?1:"none"}}>
              {!erreichbar2 && grund2
                ? <Tip text={grund2.replace("🔒 ","")} pos="bottom">{dot}</Tip>
                : dot}
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
              <F label="Ersteller"><I value={projekt.ersteller||""} onChange={e=>setProjekt(p=>({...p,ersteller:e.target.value}))} placeholder="Dein Name"/></F>
              <F label="Standort Verteiler"><I value={projekt.standort||""} onChange={e=>setProjekt(p=>({...p,standort:e.target.value}))} placeholder="z.B. Keller EG, Technikraum"/></F>
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

          <Card title="Räume" icon="🚪" sub="Klick zum Aktivieren/Deaktivieren:">
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
            <button onClick={()=>setShowFoto(true)} style={{display:"flex",alignItems:"center",gap:8,background:"var(--bg2)",border:"1px solid rgba(33,150,201,0.25)",borderRadius:10,padding:"12px 20px",color:"var(--blue)",cursor:"pointer",fontSize:13,fontWeight:600,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(33,150,201,0.07)";e.currentTarget.style.borderColor="rgba(33,150,201,0.4)";}}
              onMouseLeave={e=>{e.currentTarget.style.background="var(--bg2)";e.currentTarget.style.borderColor="rgba(33,150,201,0.25)";}}>
              📷 Kabelliste aus Foto / Scan importieren
            </button>
          </div>
          {/* Warnungen / Completion hint */}
          {(stockwerke.length===0||raeume.length===0)&&(
            <div style={{background:"rgba(240,165,0,0.07)",border:"1px solid rgba(240,165,0,0.3)",borderRadius:10,padding:"12px 16px",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:stockwerke.length===0&&raeume.length===0?6:0}}>
                <span style={{fontSize:15}}>⚠️</span>
                <span style={{fontSize:13,color:"#f0a500",fontWeight:700}}>Hinweis – fehlende Konfiguration</span>
              </div>
              <div style={{paddingLeft:23,display:"flex",flexDirection:"column",gap:3,marginTop:4}}>
                {stockwerke.length===0&&(
                  <div style={{fontSize:12,color:"var(--text2)"}}>
                    <span style={{color:"#f0a500",fontWeight:600}}>Keine Stockwerke gewählt</span>
                    {" – Kabel können keinem Stockwerk zugeordnet werden."}
                  </div>
                )}
                {raeume.length===0&&(
                  <div style={{fontSize:12,color:"var(--text2)"}}>
                    <span style={{color:"#f0a500",fontWeight:600}}>Keine Räume gewählt</span>
                    {" – Kabel können keinem Raum zugeordnet werden."}
                  </div>
                )}
              </div>
            </div>
          )}
          {projekt.name&&stockwerke.length>0&&raeume.length>0&&(
            <div style={{background:"rgba(82,217,138,0.06)",border:"1px solid rgba(82,217,138,0.2)",borderRadius:10,padding:"10px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:16}}>✓</span>
              <span style={{fontSize:13,color:"var(--green)",fontWeight:600}}>Projekt "{projekt.name}" · {stockwerke.length} Stockwerk{stockwerke.length!==1?"e":""} · {raeume.length} Räume</span>
            </div>
          )}
          <button onClick={()=>setStep(2)} style={bPrimary}>Weiter → Kabel erfassen</button>
        </>}

        {/* ══ STEP 2: KABEL ERFASSEN ══ */}
        {step===2&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:18,fontWeight:700,color:"var(--text)",letterSpacing:"-0.3px"}}>🔌 Kabel erfassen</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:1,display:"flex",gap:10}}><span>{kabel.length} Kabel</span>{sicherungen.length>0&&<span style={{color:"var(--blue)"}}>· {kabel.filter(k=>sicherungen.some(s=>s.kabelIds.includes(k.id))).length} zugewiesen</span>}</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>setStep(1)} style={bSec}>← Zurück</button>
              <button onClick={()=>setShowFoto(true)} style={{...bSec,color:"var(--blue)",borderColor:"rgba(33,150,201,0.15)"}}>📷 <span className="nav-label-long">Foto</span></button>
              <button onClick={()=>setStep(3)} style={{...bPrimary,flex:"1 1 auto",whiteSpace:"nowrap"}}>Weiter →<span className="nav-label-long"> Sicherungen planen</span></button>
            </div>
          </div>

          <div ref={kabelListRef}>
          {kabel.map((k,idx)=>{
            const swC=swColor(k.stockwerk);
            return(
              <div key={k.id}
                draggable data-kabelid={k.id}
                onDragStart={e=>onKabelDragStart(e,k.id)} onDragOver={e=>onKabelDragOver(e,k.id)} onDrop={onKabelDrop}
                onTouchStart={()=>{dragKabelId.current=k.id;}}
                onTouchMove={e=>{e.preventDefault();const t=e.touches[0];const el=document.elementFromPoint(t.clientX,t.clientY)?.closest("[data-kabelid]");if(el)dragOverId.current=el.dataset.kabelid;}}
                onTouchEnd={onKabelDrop}
                style={{marginBottom:6,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px",cursor:"grab",userSelect:"none",WebkitUserSelect:"none"}}>
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
          </div>{/* /kabelListRef */}

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
                Kabel per Drag&Drop auf Sicherungen ziehen · {kabelImPool.length>0?<span style={{color:"var(--blue)"}}>{kabelImPool.length} noch nicht zugewiesen</span>:<span style={{color:"var(--green)"}}>✓ Alle zugewiesen</span>}
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
                {kabelImPool.length>0&&<span style={{background:"#f0a50022",border:"1px solid #f0a50044",color:"var(--blue)",borderRadius:10,padding:"1px 7px",fontSize:9}}>{kabelImPool.length} offen</span>}
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
                            className="draggable"
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
                    <div key={k.id} className="draggable" draggable
                      onDragStart={e=>{
                        dragKabelId.current=k.id;
                        dragFromSich.current=sicherungen.find(s=>s.kabelIds.includes(k.id))?.id||null;
                        e.dataTransfer.effectAllowed="move"; e.currentTarget.style.opacity="0.5";
                      }}
                      onDragEnd={e=>e.currentTarget.style.opacity="1"}
                      onTouchStart={e=>onTouchStartKabel(e,k.id)}
                      onTouchMove={onTouchMoveKabel}
                      onTouchEnd={onTouchEndKabel}
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
                    style={{background:si.istReserve?"#141618":si.istFILS?"#14121e":"var(--bg2)",border:`1px solid ${si.istReserve?"rgba(90,99,112,0.25)":si.istFILS?"rgba(167,139,250,0.15)":is3p?"rgba(167,139,250,0.1)":"var(--border)"}`,borderRadius:10,marginBottom:8,overflow:"hidden",opacity:si.istReserve?0.7:1}}>

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
                      {/* Reserve */}
                      <button onClick={()=>updSicherung(si.id,"istReserve",!si.istReserve)}
                        title="Als Reserveplatz markieren (leerer Sicherungsplatz)"
                        style={{padding:"3px 8px",borderRadius:5,border:`1px solid ${si.istReserve?"var(--text2)":"var(--border2)"}`,background:si.istReserve?"rgba(158,166,175,0.15)":"transparent",color:si.istReserve?"var(--text2)":"var(--text3)",cursor:"pointer",fontSize:10,fontWeight:700}}>
                        {si.istReserve?"↩ Reserve":"Reserve"}
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
                                  className="draggable"
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
            {kabelImPool.length>0&&<span style={{fontSize:12,color:"var(--blue)",fontWeight:600}}>⚠ {kabelImPool.length} Kabel noch nicht zugewiesen</span>}
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
              <div style={{fontSize:18,fontWeight:700,color:"var(--text)",letterSpacing:"-0.3px"}}>🔒 FI-Konfiguration</div>
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
                <St label="Reserve" val={`${diff} TE`} color={diff<0?"var(--red)":diff<4?"var(--blue)":"var(--green)"}/>
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
            {/* Tabs */}
            <div style={{display:"flex",gap:2,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:3}}>
              {[
                {id:"plan",    icon:"📊", label:"Belegungsplan"},
                {id:"klemmen", icon:"🔌", label:"Klemmenleiste"},
              ].map(tab=>(
                <button key={tab.id} onClick={()=>{setActiveTab(tab.id);}}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:7,border:"none",
                    background:activeTab===tab.id?"var(--bg2)":"transparent",
                    color:activeTab===tab.id?"var(--text)":"var(--text3)",
                    cursor:"pointer",fontSize:12,fontWeight:activeTab===tab.id?700:400,
                    transition:"all 0.15s",
                    boxShadow:activeTab===tab.id?"0 1px 4px rgba(0,0,0,0.3)":"none"}}>
                  <span>{tab.icon}</span>
                  <span className="nav-label-long">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Plan-Typ Selector – nur wenn Plan aktiv */}
            <div style={{display:"flex",gap:6,alignItems:"center",flex:1}}>
              {activeTab==="plan"&&(
                <div style={{display:"flex",gap:2,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:2,marginLeft:6}}>
                  {[{v:"visuell",l:"Visuell"},{v:"tabelle",l:"Tabelle"}].map(({v,l})=>(
                    <button key={v} onClick={()=>setPlanTyp(v)}
                      style={{padding:"5px 12px",borderRadius:6,border:"none",
                        background:planTyp===v?"var(--bg2)":"transparent",
                        color:planTyp===v?"var(--text)":"var(--text3)",
                        cursor:"pointer",fontSize:11,fontWeight:planTyp===v?600:400,transition:"all 0.15s",
                        boxShadow:planTyp===v?"0 1px 3px rgba(0,0,0,0.25)":"none"}}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setStep(4)} style={bSec}>← FI-Planung</button>
              <button onClick={()=>{setSaveName(projekt.name||"");setShowSave(true);}} style={bSec}>💾</button>
              <button onClick={()=>window.print()} style={bSec}>🖨️</button>
            </div>
          </div>

          {/* ══ TAB: BELEGUNGSPLAN ══ */}
          {activeTab==="plan"&&<>
          {/* Plan-Kopf */}
          <div className="fade-in" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,padding:"14px 18px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:12}}>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:"var(--text)",letterSpacing:"-0.5px"}}>{projekt.name||"Projekt"}</div>
              {projekt.adresse&&<div style={{fontSize:12,color:"var(--text3)",marginTop:3}}>{projekt.adresse}</div>}
              {plan.warnungen?.length>0&&plan.warnungen.map((w,i)=><div key={i} style={{fontSize:11,color:"var(--red)",marginTop:4}}>⚠ {w}</div>)}
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"var(--text3)",fontWeight:600,textTransform:"uppercase",letterSpacing:"1.5px",fontFamily:"var(--mono)"}}>{settings.firmenname||""}</div>
              {projekt.ersteller&&<div style={{fontSize:10,color:"var(--text3)",marginTop:1,fontFamily:"var(--mono)"}}>{projekt.ersteller}</div>}
              {projekt.standort&&<div style={{fontSize:10,color:"var(--text3)",marginTop:1,fontFamily:"var(--mono)"}}>📍 {projekt.standort}</div>}
              <div style={{fontSize:11,color:"var(--blue)",marginTop:3,fontFamily:"var(--mono)",fontWeight:600}}>{new Date().toLocaleDateString("de-DE")}</div>
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
                      <div style={{height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,ausl)}%`,background:ausl>100?"var(--red)":ausl>85?"var(--blue)":"var(--green)",borderRadius:2}}/></div>
                    </div>
                    <div style={{display:"flex",gap:5}}>{Object.entries(fi.phasen).map(([ph,amp])=><span key={ph} style={{fontSize:10,background:PH_BG[ph],border:`1px solid ${PH_BORDER[ph]}`,borderRadius:4,padding:"2px 7px",color:PH_COLOR[ph],fontWeight:700,fontFamily:"var(--mono)"}}>{ph}: {amp}A</span>)}</div>
                  </div>
                  <div style={{padding:"12px 14px",overflowX:"auto"}}>
                    <div style={{display:"flex",gap:4,alignItems:"stretch",minWidth:"max-content"}}>
                      {/* FI-Kästchen */}
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginRight:8}}>
                        <div onClick={()=>openPlanEditFI(fi.id)}
                          style={{width:(fi.pole||4)*28+((fi.pole||4)-1)*4,background:"#1a7abf10",border:"2px solid #1a7abf55",borderRadius:6,height:90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,cursor:"pointer",transition:"border-color 0.15s"}}
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
                        if(si.istReserve) return(
                          <div key={si.id} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                            <div style={{width:w,background:"rgba(255,200,40,0.03)",border:"1.5px dashed rgba(255,200,40,0.3)",borderRadius:6,height:90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3}}>
                              <div style={{fontSize:8,color:"var(--text3)",fontFamily:"var(--mono)",fontWeight:700}}>{fLabel}</div>
                              <div style={{fontSize:7,color:"rgba(255,200,40,0.5)",textTransform:"uppercase",letterSpacing:"0.5px"}}>Reserve</div>
                              <div style={{fontSize:9,color:"rgba(255,200,40,0.4)",fontFamily:"var(--mono)"}}>{sInfo?.label}</div>
                            </div>
                            <div style={{fontSize:8,color:"var(--text3)",fontWeight:700,marginTop:3,fontFamily:"var(--mono)"}}>{fLabel}</div>
                          </div>
                        );
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
                    {/* ── Phasenschiene – Pin-Sequenz ── */}
                    {fi.phasenschiene&&(()=>{
                      // DIN-Aderfarben: L1=braun, L2=schwarz, L3=grau, N=blau
                      const C={L1:"#a05428",L2:"#555555",L3:"#7a8899",N:"#1d6dbf"};
                      // 3-Leiter: LS-Bereich zyklisch L1/L2/L3
                      // 4-Leiter+N: gesamte Schiene zyklisch L1/L2/L3/N
                      const mit4L = fi.pole>=4 && fi.phasenschieneN;
                      const lsCycle = fi.pole>=4
                        ? (mit4L ? ["L1","L2","L3","N"] : ["L1","L2","L3"])
                        : ["L1"];
                      let ci=0;
                      const Pin=({l,dim})=>(
                        <div style={{width:28,height:14,borderRadius:3,flexShrink:0,
                          background:C[l]+(dim?"18":"33"),border:`1px solid ${C[l]}${dim?"44":"99"}`,
                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <span style={{fontSize:7,color:C[l]+(dim?"88":""),fontWeight:800,fontFamily:"var(--mono)"}}>{l}</span>
                        </div>
                      );
                      // FI-Pins: L1,L2,L3,N für 4-pol / L1,N für 2-pol
                      const fiPins=fi.pole>=4?["L1","L2","L3","N"]:["L1","N"];
                      const fiW=(fi.pole||4)*28+((fi.pole||4)-1)*4;
                      // LS-Pins aufbauen
                      const lsPins=[];
                      fi.stromkreise.forEach(sk=>{
                        const sInfo=STD_SICHERUNGEN.find(s=>s.id===sk.sicherung);
                        const te=sInfo?.te||1;
                        if(!mit4L && sk.is3p && fi.pole>=4){
                          // 3-Leiter: 3-phasige LS → L1,L2,L3
                          lsPins.push({l:"L1",dim:sk.istReserve});
                          lsPins.push({l:"L2",dim:sk.istReserve});
                          lsPins.push({l:"L3",dim:sk.istReserve});
                          ci+=3;
                        } else {
                          for(let j=0;j<te;j++){
                            lsPins.push({l:lsCycle[ci%lsCycle.length],dim:!!sk.istReserve});
                            ci++;
                          }
                        }
                      });
                      // Leerstellen
                      const usedTE=fi.stromkreise.reduce((s,sk)=>{const inf=STD_SICHERUNGEN.find(x=>x.id===sk.sicherung);return s+(inf?.te||1);},0);
                      for(let i=0;i<Math.max(0,fiMaxTE(fi.pole)-usedTE);i++){
                        lsPins.push({l:lsCycle[ci%lsCycle.length],dim:true});ci++;
                      }
                      return(
                        <div style={{marginTop:3,display:"flex",gap:4,alignItems:"center",minWidth:"max-content"}}>
                          {/* FI-Pins */}
                          <div style={{display:"flex",gap:4,width:fiW,flexShrink:0}}>
                            {fiPins.map((l,idx)=><Pin key={idx} l={l} dim={false}/>)}
                          </div>
                          {/* Trennlinie (entspricht Separator im Plan) */}
                          <div style={{width:11,flexShrink:0}}/>
                          {/* LS-Pins */}
                          {lsPins.map((p,idx)=><Pin key={idx} l={p.l} dim={p.dim}/>)}
                        </div>
                      );
                    })()}
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
                        <tr key={si.id} style={{borderBottom:"1px solid #161616",background:"var(--bg2)"}}>
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
          </>}

          {/* ══ TAB: KLEMMENLEISTE ══ */}
          {activeTab==="klemmen"&&<div className="fade-in">

            {/* Optionen-Card */}
            <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",marginBottom:14}}>Optionen</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>

                {/* Reihenklemmen aktiv/inaktiv */}
                <button onClick={()=>setMitRK(v=>!v)}
                  style={{display:"flex",alignItems:"center",gap:7,padding:"9px 14px",borderRadius:10,
                    border:`1px solid ${mitRK?"rgba(33,150,201,0.5)":"var(--border)"}`,
                    background:mitRK?"rgba(33,150,201,0.08)":"var(--bg3)",
                    color:mitRK?"var(--blue)":"var(--text3)",cursor:"pointer",fontSize:12,fontWeight:mitRK?700:400,transition:"all 0.2s"}}>
                  <div style={{width:10,height:10,borderRadius:3,border:`1.5px solid ${mitRK?"var(--blue)":"var(--text3)"}`,background:mitRK?"var(--blue)":"transparent",transition:"all 0.2s",flexShrink:0}}/>
                  Reihenklemmen
                </button>

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
                  {mitNBruecke&&<span style={{fontSize:9,color:"var(--text3)",fontWeight:400}}>· Länge je Q-Block</span>}
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

              {/* Querverbinder Details */}
              {mitQV&&querverbinder.length>0&&(
                <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--border)"}}>
                  <div style={{fontSize:10,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10,fontWeight:700}}>Benötigte Querverbinder</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                    {querverbinder.map((qv,i)=>{
                      const hasClips=qv.clipPins&&qv.clipPins.length>0;
                      const clipSet=new Set(qv.clipPins||[]);
                      return(
                      <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,background:"var(--bg)",border:`1px solid ${hasClips?"#f59e0b55":qv.color+"55"}`,borderRadius:10,padding:"8px 12px",minWidth:200}}>
                        <div style={{flexShrink:0}}>
                          {/* Brücken-Balken oben */}
                          <div style={{height:5,borderRadius:"3px 3px 0 0",opacity:0.85,
                            background:hasClips
                              ? `repeating-linear-gradient(90deg,${qv.color} 0px,${qv.color} 8px,transparent 8px,transparent 12px)`
                              : qv.color,
                            width:(qv.ports*10+(qv.ports-1)*3)}}/>
                          {/* Pins */}
                          <div style={{display:"flex",gap:3,alignItems:"flex-end"}}>
                            {Array.from({length:qv.ports}).map((_,pi)=>{
                              const pinNr=pi+1;
                              const clip=clipSet.has(pinNr);
                              return(
                                <div key={pi} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                                  <div style={{width:10,height:clip?14:22,borderRadius:3,
                                    background:clip?"#44444433":qv.color+"22",
                                    border:`1.5px solid ${clip?"#55555588":qv.color+"88"}`,
                                    flexShrink:0,position:"relative"}}>
                                    {clip&&<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:8,color:"#f59e0b",fontWeight:900,lineHeight:1}}>✂</div>}
                                  </div>
                                  {clip&&<div style={{fontSize:6,color:"#f59e0b",fontWeight:800,fontFamily:"var(--mono)",lineHeight:1}}>{pinNr}</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:12,fontWeight:800,color:"var(--text)",fontFamily:"var(--mono)"}}>{qv.ports}-fach</div>
                          <div style={{fontSize:10,fontWeight:600,color:qv.color,marginTop:1}}>{qv.typ}-Querverbinder{qv.fils?" (FILS)":""}</div>
                          <div style={{fontSize:9,color:"var(--text3)",marginTop:2}}>{qv.fLabel}</div>
                          {hasClips&&<div style={{fontSize:9,color:"#f59e0b",marginTop:3,fontWeight:600}}>
                            ✂ Pin {qv.clipPins.join(", ")} abzwicken
                          </div>}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                  <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
                    <span style={{fontSize:10,color:"var(--text3)"}}>Gesamt:</span>
                    {qvStueckliste.map(({ports,anzahl})=>(
                      <span key={ports} style={{background:"rgba(245,160,64,0.1)",border:"1px solid rgba(245,160,64,0.25)",borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,color:"#f5a040",fontFamily:"var(--mono)"}}>
                        {anzahl}× {ports}-fach QV
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Klemmenleiste Visualisierung */}
            {mitRK&&<>

              {/* FI-Gruppen */}
              {plan.gruppen.map((fi,fiIdx)=>{
                const groups=buildSeq(fi.stromkreise,false,null);
                const klemmenAnzahl=groups.reduce((n,g)=>n+g.klemmen.length,0);
                const kabelKlemmen=groups.filter(g=>g.kabelLabel).reduce((n,g)=>n+g.klemmen.length,0);
                // Klemmenbezeichnungen: X1, X1.1, X1.2 ...
                const xNr=fiIdx+1;
                let xCounter=0;
                const xLabels=new Map();
                groups.forEach((grp,gi)=>{grp.klemmen.forEach((kl,ki)=>{
                  if(kl.type==='pe_einspeisung') xLabels.set(`${gi}-${ki}`,`X${xNr}`);
                  else if(['rk_mit_pe','rk_ohne_pe','rk_n_fils'].includes(kl.type)){
                    xCounter++; xLabels.set(`${gi}-${ki}`,`X${xNr}.${xCounter}`);
                  }
                });});
                return(
                  <div key={fi.id} style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,marginBottom:12,overflow:"hidden"}}>
                    <div style={{padding:"10px 16px",background:"var(--bg3)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",borderBottom:"1px solid var(--border)"}}>
                      <span style={{fontWeight:900,fontSize:14,color:"var(--blue)",fontFamily:"var(--mono)"}}>Q{fiIdx+1}</span>
                      <span style={{background:"rgba(33,150,201,0.08)",border:"1px solid #1a7abf33",borderRadius:5,padding:"2px 8px",fontSize:11,color:"var(--blue)"}}>{fiBeschreibung(fi)}</span>
                      <span style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:5,padding:"2px 8px",fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)"}}>
                        {klemmenAnzahl} Klemmen · {kabelKlemmen} Kabel
                      </span>
                    </div>
                    <div style={{padding:"14px 16px",overflowX:"auto"}}>
                      {/* ── QV-Brücken Overlay (über den Klemmen) ── */}
                      {mitQV&&(()=>{
                        const bySkId={};
                        groups.forEach((grp,gi)=>{
                          if(!grp.skId) return;
                          if(!bySkId[grp.skId]) bySkId[grp.skId]=[];
                          bySkId[grp.skId].push(gi);
                        });
                        const bridges=Object.values(bySkId).filter(idxs=>idxs.length>=2);
                        if(!bridges.length) return null;
                        const gw=g=>g.klemmen.reduce((s,k)=>s+(KLEMME_STYLES[k.type]?.w||22),0)+Math.max(0,g.klemmen.length-1)*2;
                        return(<div style={{marginBottom:4}}>{bridges.map((idxs,bi)=>{
                          const first=idxs[0],last=idxs[idxs.length-1];
                          const leftPx=groups.slice(0,first).reduce((s,g)=>s+gw(g)+4,0);
                          const widthPx=groups.slice(first,last+1).reduce((s,g,i,a)=>s+gw(g)+(i<a.length-1?4:0),0);
                          const lCount=groups.slice(first,last+1).reduce((s,g)=>s+g.klemmen.filter(k=>k.type==="rk_mit_pe").length,0);
                          return(
                            <div key={bi} style={{marginBottom:2,marginLeft:leftPx,width:widthPx,display:"flex",flexDirection:"column",alignItems:"stretch"}}>
                              <div style={{fontSize:7,color:"#ff6b6b",fontFamily:"var(--mono)",fontWeight:700,textAlign:"center",marginBottom:1,letterSpacing:"0.5px"}}>{lCount}-fach QV</div>
                              <div style={{height:4,background:"#ff6b6b",borderRadius:"2px 2px 0 0",opacity:0.85}}/>
                            </div>
                          );
                        })}</div>);
                      })()}
                      <div style={{display:"flex",flexWrap:"nowrap",gap:4,alignItems:"flex-end",minWidth:"max-content"}}>
                        {groups.map((grp,gi)=>{
                          const isKappeGrp=grp.klemmen[0]?.type==="abdeckkappe_orange";
                          const prevIsKappeGrp=gi>0&&groups[gi-1].klemmen[0]?.type==="abdeckkappe_orange";
                          return(
                          <div key={gi} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,
                            marginLeft:isKappeGrp||prevIsKappeGrp?-3:0}}>
                            {grp.kabelLabel
                              ? <div style={{fontSize:7,color:grp.kabelColor||"var(--text2)",fontWeight:700,fontFamily:"var(--mono)",
                                  maxWidth:Math.max(24,grp.klemmen.length*26)+"px",
                                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                                  textAlign:"center",marginBottom:2}}>
                                  {grp.kabelLabel}
                                </div>
                              : <div style={{height:14}}/>
                            }
                            <div style={{width:Math.max(24,grp.klemmen.length*26)-4+"px",height:3,borderRadius:"2px 2px 0 0",background:grp.kabelLabel?(grp.kabelColor||"var(--text3)"):"transparent",marginBottom:2}}/>
                            <div style={{display:"flex",gap:2}}>
                              {grp.klemmen.map((s,si)=>{
                                const st=KLEMME_STYLES[s.type]||{bg:"var(--bg2)",border:"var(--text3)",label:"?",color:"var(--text3)",w:22};
                                const isKappe=s.type==="abdeckkappe_orange";
                                const xl=xLabels?.get(`${gi}-${si}`);
                                return(
                                  <div key={si} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                                    <div title={xl||s.label||s.type}
                                      style={{width:st.w,height:48,borderRadius:isKappe?2:5,background:st.bg,border:`1.5px solid ${st.border}`,
                                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"default",flexShrink:0,
                                        boxShadow:isKappe?"none":"0 1px 4px rgba(0,0,0,0.3)"}}>
                                      {s.type==="pe_einspeisung"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>PE</span>}
                                      {s.type==="rk_mit_pe"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>3pol</span>}
                                      {s.type==="rk_ohne_pe"&&<span style={{fontSize:7,color:"var(--text3)",fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>2pol</span>}
                                      {s.type==="rk_n_fils"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>N</span>}
                                      {s.type==="n_einspeisung"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>NE</span>}
                                      {s.type==="n_endklemme"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>NX</span>}
                                      {s.type==="rk_reserve_knx"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>R</span>}
                                    </div>
                                    {xl&&<span style={{fontSize:5.5,color:s.type==="pe_einspeisung"?"var(--blue)":"var(--text3)",fontFamily:"var(--mono)",fontWeight:700,marginTop:2,letterSpacing:0,lineHeight:1,userSelect:"none"}}>{xl}</span>}
                                  </div>
                                );
                              })}
                            </div>
                            {grp.kabelLabel
                              ? <div style={{fontSize:8,color:grp.kabelColor||"var(--text2)",fontWeight:600,fontFamily:"var(--mono)",
                                  maxWidth:Math.max(24,grp.klemmen.length*26)+"px",
                                  whiteSpace:"normal",wordBreak:"break-word",textAlign:"center",
                                  marginTop:4,lineHeight:1.3,padding:"0 2px"}}>
                                  {grp.kabelLabel}
                                </div>
                              : <div style={{height:4}}/>
                            }
                          </div>
                        ); })}
                      </div>
                      {/* ── N-Schiene (nur wenn aktiviert) ── */}
                      {mitNBruecke&&(()=>{
                        const neIdx=groups.findIndex(g=>g.klemmen[0]?.type==="n_einspeisung");
                        const nxIdx=groups.findIndex(g=>g.klemmen[0]?.type==="n_endklemme");
                        if(neIdx<0||nxIdx<0) return null;
                        const gw=g=>g.klemmen.reduce((s,k)=>s+(KLEMME_STYLES[k.type]?.w||22),0)+Math.max(0,g.klemmen.length-1)*2;
                        const left=groups.slice(0,neIdx).reduce((s,g)=>s+gw(g)+4,0);
                        const width=groups.slice(neIdx,nxIdx+1).reduce((s,g,i,a)=>s+gw(g)+(i<a.length-1?4:0),0);
                        const klemCnt=groups.slice(neIdx,nxIdx+1).reduce((s,g)=>s+g.klemmen.filter(k=>k.type!=="abdeckkappe_orange").length,0);
                        const kapCnt=groups.slice(neIdx,nxIdx+1).reduce((s,g)=>s+g.klemmen.filter(k=>k.type==="abdeckkappe_orange").length,0);
                        const laengeMM=Math.ceil(klemCnt*6.2+kapCnt*2);
                        return(
                          <div style={{marginTop:4,marginLeft:left,width:width,display:"flex",flexDirection:"column",alignItems:"stretch"}}>
                            <div style={{height:6,background:"rgba(33,150,201,0.75)",borderRadius:3,boxShadow:"0 0 6px rgba(33,150,201,0.35)"}}/>
                            <div style={{fontSize:7,color:"rgba(33,150,201,0.7)",fontFamily:"var(--mono)",fontWeight:700,textAlign:"center",marginTop:2,letterSpacing:"0.5px"}}>N-Schiene · {laengeMM}mm</div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}

              {/* FILS-Blöcke */}
              {plan.fils.map((sk,i)=>{
                const groups=buildSeq(null,true,sk);
                const klemmenAnzahl=groups.reduce((n,g)=>n+g.klemmen.length,0);
                // Klemmenbezeichnungen für FILS: X(n+1)
                const xNr=plan.gruppen.length+i+1;
                let xCounter=0;
                const xLabels=new Map();
                groups.forEach((grp,gi)=>{grp.klemmen.forEach((kl,ki)=>{
                  if(kl.type==='pe_einspeisung') xLabels.set(`${gi}-${ki}`,`X${xNr}`);
                  else if(['rk_mit_pe','rk_ohne_pe','rk_n_fils'].includes(kl.type)){
                    xCounter++; xLabels.set(`${gi}-${ki}`,`X${xNr}.${xCounter}`);
                  }
                });});
                return(
                  <div key={sk.id} style={{background:"#14121e",border:"1px solid rgba(167,139,250,0.15)",borderRadius:14,marginBottom:12,overflow:"hidden"}}>
                    <div style={{padding:"10px 16px",background:"rgba(167,139,250,0.05)",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",borderBottom:"1px solid rgba(167,139,250,0.1)"}}>
                      <span style={{fontWeight:900,fontSize:14,color:"var(--purple)",fontFamily:"var(--mono)"}}>Q{plan.gruppen.length+i+1}</span>
                      <span style={{background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.2)",borderRadius:5,padding:"2px 8px",fontSize:11,color:"var(--purple)"}}>FILS</span>
                      <span style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)"}}>{klemmenAnzahl} Klemmen</span>
                    </div>
                    <div style={{padding:"14px 16px",overflowX:"auto"}}>
                      <div style={{display:"flex",flexWrap:"nowrap",gap:4,alignItems:"flex-end",minWidth:"max-content"}}>
                        {groups.map((grp,gi)=>{
                          const isKappeGrp=grp.klemmen[0]?.type==="abdeckkappe_orange";
                          const prevIsKappeGrp=gi>0&&groups[gi-1].klemmen[0]?.type==="abdeckkappe_orange";
                          return(
                          <div key={gi} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0,
                            marginLeft:isKappeGrp||prevIsKappeGrp?-3:0}}>
                            {grp.kabelLabel
                              ? <div style={{fontSize:7,color:grp.kabelColor||"var(--text2)",fontWeight:700,fontFamily:"var(--mono)",
                                  maxWidth:Math.max(24,grp.klemmen.length*26)+"px",
                                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                                  textAlign:"center",marginBottom:2}}>
                                  {grp.kabelLabel}
                                </div>
                              : <div style={{height:14}}/>
                            }
                            <div style={{width:Math.max(24,grp.klemmen.length*26)-4+"px",height:3,borderRadius:"2px 2px 0 0",background:grp.kabelLabel?(grp.kabelColor||"var(--purple)"):"transparent",marginBottom:2}}/>
                            <div style={{display:"flex",gap:2}}>
                              {grp.klemmen.map((s,si)=>{
                                const st=KLEMME_STYLES[s.type]||{bg:"var(--bg2)",border:"var(--text3)",label:"?",color:"var(--text3)",w:22};
                                const isKappe=s.type==="abdeckkappe_orange";
                                const xl=xLabels?.get(`${gi}-${si}`);
                                return(
                                  <div key={si} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                                    <div title={xl||s.label||s.type}
                                      style={{width:st.w,height:48,borderRadius:isKappe?2:5,background:st.bg,border:`1.5px solid ${st.border}`,
                                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"default",flexShrink:0,
                                        boxShadow:isKappe?"none":"0 1px 4px rgba(0,0,0,0.3)"}}>
                                      {s.type==="pe_einspeisung"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>PE</span>}
                                      {s.type==="rk_mit_pe"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>3pol</span>}
                                      {s.type==="rk_ohne_pe"&&<span style={{fontSize:7,color:"var(--text3)",fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>2pol</span>}
                                      {s.type==="rk_n_fils"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>N</span>}
                                      {s.type==="n_einspeisung"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>NE</span>}
                                      {s.type==="n_endklemme"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>NX</span>}
                                      {s.type==="rk_reserve_knx"&&<span style={{fontSize:7,color:st.color,fontWeight:800,fontFamily:"var(--mono)",writingMode:"vertical-rl",userSelect:"none"}}>R</span>}
                                    </div>
                                    {xl&&<span style={{fontSize:5.5,color:s.type==="pe_einspeisung"?"var(--blue)":"var(--text3)",fontFamily:"var(--mono)",fontWeight:700,marginTop:2,letterSpacing:0,lineHeight:1,userSelect:"none"}}>{xl}</span>}
                                  </div>
                                );
                              })}
                            </div>
                            {grp.kabelLabel
                              ? <div style={{fontSize:8,color:grp.kabelColor||"var(--text2)",fontWeight:600,fontFamily:"var(--mono)",
                                  maxWidth:Math.max(24,grp.klemmen.length*26)+"px",
                                  whiteSpace:"normal",wordBreak:"break-word",textAlign:"center",
                                  marginTop:4,lineHeight:1.3,padding:"0 2px"}}>
                                  {grp.kabelLabel}
                                </div>
                              : <div style={{height:4}}/>
                            }
                          </div>
                        ); })}
                      </div>
                      {/* ── FILS QV-Brücken Overlay ── */}
                      {mitQV&&(()=>{
                        const gw=g=>g.klemmen.reduce((s,k)=>s+(KLEMME_STYLES[k.type]?.w||22),0)+Math.max(0,g.klemmen.length-1)*2;
                        const cableIdxs=groups.map((g,i)=>g.kabelLabel?i:-1).filter(i=>i>=0);
                        if(cableIdxs.length<2) return null;
                        const first=cableIdxs[0],last=cableIdxs[cableIdxs.length-1];
                        const leftPx=groups.slice(0,first).reduce((s,g)=>s+gw(g)+4,0);
                        const widthPx=groups.slice(first,last+1).reduce((s,g,i,a)=>s+gw(g)+(i<a.length-1?4:0),0);
                        const nCount=groups.slice(first,last+1).reduce((s,g)=>s+g.klemmen.filter(k=>k.type==="rk_n_fils").length,0);
                        return(<>
                          {nCount>=2&&<div style={{marginTop:3,marginLeft:leftPx,width:widthPx,display:"flex",flexDirection:"column",alignItems:"stretch"}}>
                            <div style={{height:3,background:"rgba(33,150,201,0.8)",borderRadius:2}}/>
                            <div style={{fontSize:7,color:"var(--blue)",fontFamily:"var(--mono)",fontWeight:700,textAlign:"center",marginTop:1,letterSpacing:"0.5px"}}>{nCount}-fach QV</div>
                          </div>}
                        </>);
                      })()}
                    </div>
                  </div>
                );
              })}

              {/* Legende – identisch wie beim Belegungsplan */}
              <div style={{marginTop:4,padding:"10px 14px",background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,display:"flex",gap:16,flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px"}}>Stockwerk:</span>
                  {[...new Set(kabel.map(k=>k.stockwerk))].map(s=><div key={s} style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:7,height:7,borderRadius:1,background:swColor(s)}}/><span style={{fontSize:10,color:"var(--text3)"}}>{s}</span></div>)}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px"}}>Klemmen:</span>
                  <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:"rgba(82,217,138,0.12)",border:"1px solid rgba(82,217,138,0.5)"}}/><span style={{fontSize:9,color:"var(--text2)"}}>PE-Einspeisung</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:"#1a2e1a",border:"1px solid rgba(82,217,138,0.25)"}}/><span style={{fontSize:9,color:"var(--text2)"}}>RK mit PE</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:"#181818",border:"1px solid #44444466"}}/><span style={{fontSize:9,color:"var(--text2)"}}>RK ohne PE</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:"rgba(33,150,201,0.1)",border:"1px solid rgba(33,150,201,0.35)"}}/><span style={{fontSize:9,color:"var(--text2)"}}>N-Einsp. / N-Ende</span></div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:4,height:10,borderRadius:1,background:"#a84828",border:"1px solid #e87040"}}/><span style={{fontSize:9,color:"var(--text2)"}}>Abdeckkappe</span></div>
                </div>
              </div>
            </>}

          </div>}

                    {/* ── BESCHRIFTUNG MODAL ── */}
          {showBeschriftung&&(()=>{
            const alleZeilen=[];
            plan.gruppen.forEach((fi,fiIdx)=>{
              const qNr=fiIdx+1;
              const xNr=fiIdx+1;
              alleZeilen.push({typ:"fi",qNr,fi,xLabel:`X${xNr}`});
              // X-Klemmenbezeichnungen: Terminal-Zähler pro FI
              const grps=buildSeq(fi.stromkreise,false,null);
              const skToX={};
              let xC=0;
              grps.forEach(grp=>{
                if(!grp.skId)return;
                const first=xC+1;
                grp.klemmen.forEach(kl=>{if(['rk_mit_pe','rk_ohne_pe'].includes(kl.type))xC++;});
                if(!skToX[grp.skId]) skToX[grp.skId]={from:first,to:xC};
                else skToX[grp.skId].to=xC;
              });
              fi.stromkreise.forEach((si,siIdx)=>{
                const x=skToX[si.id];
                const xLabel=x?(x.from===x.to?`X${xNr}.${x.from}`:`X${xNr}.${x.from}–${x.to}`):"";
                alleZeilen.push({typ:"ls",qNr,fNr:siIdx+1,si,xLabel});
              });
            });
            plan.fils.forEach((si,i)=>{
              const qNr=plan.gruppen.length+i+1;
              const xNr=qNr;
              alleZeilen.push({typ:"fi",qNr,fils:true,si,xLabel:`X${xNr}`});
              // FILS Terminals: rk_n_fils + rk_ohne_pe
              const grps=buildSeq(null,true,si);
              let xC=0;
              grps.forEach(grp=>{
                grp.klemmen.forEach(kl=>{if(['rk_n_fils','rk_ohne_pe'].includes(kl.type))xC++;});
              });
              const xLabel=xC>0?(xC===1?`X${xNr}.1`:`X${xNr}.1–${xNr}.${xC}`):"";
              alleZeilen.push({typ:"ls",qNr,fNr:1,si,xLabel});
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
                  {alleZeilen.map((z)=>{
                    if(z.typ==="fi"){
                      const filsBem=z.si?.filsBemessung||40, filsTyp=z.si?.filsTyp||"A", filsFs=z.si?.filsFehlerstrom||30, filsPole=z.si?.filsPole||4;
                      return(
                        <tr key={`q${z.qNr}`} style={{background:"#1a1a2e",borderBottom:"1px solid #2a2a3a"}}>
                          <td style={{padding:"8px 12px",fontFamily:"var(--mono)",fontWeight:900,fontSize:14,color:z.fils?"var(--purple)":"var(--blue)"}}>Q{z.qNr}{z.xLabel&&<span style={{fontSize:9,color:"var(--text3)",fontWeight:500,marginLeft:6}}>{z.xLabel}</span>}</td>
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
                      <tr key={fLabel} style={{borderBottom:"1px solid #161616",background:"var(--bg2)"}}>
                        <td style={{padding:"7px 12px",fontFamily:"var(--mono)",fontWeight:800,fontSize:13,color:"var(--text)"}}>
                          {fLabel}
                          {z.xLabel&&<div style={{fontSize:9,color:"var(--text3)",fontWeight:500,marginTop:1}}>{z.xLabel}</div>}
                        </td>
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
              <button onClick={()=>kopiereInZwischenablage(buildStuecklisteText(),"stueckliste")}
                style={{padding:"6px 12px",borderRadius:8,border:`1px solid ${kopiert==="stueckliste"?"rgba(82,217,138,0.4)":"var(--border2)"}`,background:kopiert==="stueckliste"?"rgba(82,217,138,0.1)":"var(--bg3)",color:kopiert==="stueckliste"?"var(--green)":"var(--text2)",cursor:"pointer",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}>
                {kopiert==="stueckliste"?"✓ Kopiert!":"📋 WhatsApp"}
              </button>
              <button onClick={()=>window.print()} style={bSec}>🖨️</button>
              <button onClick={()=>setShowStueckliste(false)} style={{background:"none",border:"none",color:"var(--text3)",fontSize:22,cursor:"pointer",padding:"0 4px"}}>✕</button>
            </div>
          </div>
          {<>
            {(
              <>
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
                          <React.Fragment key={item.label}>
                            {katNeu&&<tr key={`kat_${item.kat}`}><td colSpan={2} style={{padding:"12px 14px 4px",fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,borderTop:i>0?"1px solid var(--border)":"none"}}>{item.kat}</td></tr>}
                            <tr style={{borderBottom:"1px solid #141414",background:"var(--bg2)"}}>
                              <td style={{padding:"8px 14px",color:"var(--text2)"}}>{item.label}</td>
                              <td style={{padding:"8px 14px",textAlign:"right",fontWeight:800,color:"var(--text)",fontFamily:"var(--mono)"}}>{item.menge}×</td>
                            </tr>
                          </React.Fragment>
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
          {activeTab==="plan"&&<div className="no-print" style={{display:"flex",gap:10,marginTop:24,padding:"20px",background:"var(--bg2)",borderRadius:14,border:"1px solid var(--border)",flexWrap:"wrap"}}>
            <div style={{width:"100%",fontSize:11,color:"var(--text3)",marginBottom:4,textTransform:"uppercase",letterSpacing:"1px",fontWeight:700}}>Dokumente erstellen</div>
            <button onClick={()=>setShowBeschriftung(true)}
              style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",color:"var(--text)",borderRadius:10,padding:"13px 20px",cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--blue)";e.currentTarget.style.color="var(--blue)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color="var(--text)";}}>
              🏷️ Beschriftungsplan erstellen
            </button>
            <button onClick={()=>{setShowStueckliste(true);}}
              style={{flex:1,background:"var(--bg3)",border:"1px solid var(--border2)",color:"var(--text)",borderRadius:10,padding:"13px 20px",cursor:"pointer",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--blue)";e.currentTarget.style.color="var(--blue)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color="var(--text)";}}>
              📦 Stückliste erstellen
            </button>
          </div>}
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
                {fi.phasenschiene&&fi.pole>=4&&(
                  <F label="Phasenschienen-Typ">
                    <div style={{display:"flex",gap:4}}>
                      {[{v:false,label:"3-Leiter",sub:"L1·L2·L3"},{v:true,label:"4-Leiter +N",sub:"L1·L2·L3·N"}].map(({v,label,sub})=>(
                        <button key={String(v)} onClick={()=>updPlanFI(fi.id,"phasenschieneN",v)}
                          style={{flex:1,padding:"7px 6px",borderRadius:7,
                            border:`1px solid ${fi.phasenschieneN===v?"var(--blue)":"var(--border)"}`,
                            background:fi.phasenschieneN===v?"rgba(33,150,201,0.1)":"transparent",
                            color:fi.phasenschieneN===v?"var(--blue)":"var(--text3)",
                            cursor:"pointer",textAlign:"center"}}>
                          <div style={{fontSize:11,fontWeight:700}}>{label}</div>
                          <div style={{fontSize:9,opacity:0.7,fontFamily:"var(--mono)",marginTop:1}}>{sub}</div>
                        </button>
                      ))}
                    </div>
                  </F>
                )}
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
      {showSettings&&<SettingsModal settings={settings} onSave={s=>{setSettings(s);saveSettings(s);setShowSettings(false);showToast("Einstellungen gespeichert ✓");}} onClose={()=>setShowSettings(false)}/>}

      {/* ── INFO MODAL ── */}
      {showInfo&&(
        <div style={{position:"fixed",inset:0,background:"rgba(10,12,14,0.94)",zIndex:700,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowInfo(false)}>
          <div style={{background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:20,width:"100%",maxWidth:560,padding:32,position:"relative"}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setShowInfo(false)} style={{position:"absolute",top:16,right:16,background:"none",border:"none",color:"var(--text3)",fontSize:22,cursor:"pointer",lineHeight:1}}>✕</button>

            {/* Logo + Titel */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
              <div style={{width:48,height:48,borderRadius:12,background:"rgba(33,150,201,0.12)",border:"1px solid rgba(33,150,201,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>⚡</div>
              <div>
                <div style={{fontSize:20,fontWeight:800,color:"var(--text)",letterSpacing:"-0.5px"}}>Verteilerplaner</div>
                <div style={{fontSize:12,color:"var(--blue)",fontFamily:"var(--mono)",fontWeight:600,marginTop:2}}>Version 2026.3 · by Jedrimos</div>
              </div>
            </div>

            {/* Beschreibung */}
            <div style={{fontSize:13,color:"var(--text2)",lineHeight:1.7,marginBottom:20}}>
              Werkzeug zur Planung und Dokumentation von Elektroverteiler-Belegungen für Elektrotechniker und Planer. Vom Kabel bis zum fertigen Belegungsplan – inklusive Stückliste, Beschriftungsplan und Klemmenleisten-Visualisierung.
            </div>

            {/* Feature-Liste */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:24}}>
              {[
                ["🔌","Kabelerfassung","mit Stockwerk & Raum"],
                ["⚡","Sicherungsplanung","Drag & Drop Zuweisung"],
                ["🔒","FI-Konfiguration","Automatische TE-Berechnung"],
                ["📊","Belegungsplan","Visuell & Tabellarisch"],
                ["🔧","Klemmenleiste","Reihenklemmen-Visualisierung"],
                ["📦","Stückliste","Export als WhatsApp / Druck"],
                ["🏷️","Beschriftungsplan","Q1F1-Schema"],
                ["📷","KI-Import","Kabelliste per Foto einlesen"],
              ].map(([icon,titel,sub])=>(
                <div key={titel} style={{display:"flex",alignItems:"flex-start",gap:10,background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px"}}>
                  <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{icon}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>{titel}</div>
                    <div style={{fontSize:10,color:"var(--text3)",marginTop:1}}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{borderTop:"1px solid var(--border)",paddingTop:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div style={{fontSize:11,color:"var(--text3)"}}>
                Lokale Datenspeicherung · Keine Cloud · Keine Werbung
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)"}}>© 2026 Jedrimos</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={()=>{setShowLoad(false);setLadesuche("");}} style={{background:"none",border:"none",color:"var(--text3)",fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            {projekte.length > 3 && (
              <input value={ladesuche} onChange={e=>setLadesuche(e.target.value)} placeholder="Projekt suchen…"
                style={{width:"100%",background:"var(--bg)",border:"1px solid var(--border2)",borderRadius:8,padding:"8px 12px",color:"var(--text)",fontSize:13,marginBottom:12,boxSizing:"border-box"}} />
            )}
            {projekte.filter(p=>!ladesuche||p.name?.toLowerCase().includes(ladesuche.toLowerCase())).length===0
              ? <div style={{color:"var(--text3)",fontSize:13,textAlign:"center",padding:24}}>{ladesuche?"Keine Projekte gefunden":"Keine gespeicherten Projekte"}</div>
              : projekte.filter(p=>!ladesuche||p.name?.toLowerCase().includes(ladesuche.toLowerCase())).map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 14px",marginBottom:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,color:"var(--text)"}}>{p.name}</div>
                      <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{p.datum} · {(p.kabel||p.stromkreise||[]).length} Kabel</div>
                    </div>
                    <button onClick={()=>{lade(p);setShowLoad(false);setLadesuche("");}} style={{...bSec,color:"var(--blue)",borderColor:"rgba(33,150,201,0.15)"}}>Laden</button>
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
