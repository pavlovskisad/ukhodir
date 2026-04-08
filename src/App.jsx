import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { USDLoader } from "three/addons/loaders/USDLoader.js";
import { EVENTS, SLIDES, MEDIA, PERFORMERS } from './data.js';
import { PROGRAMS } from './programs.js';

const FONT="'Satoshi',sans-serif";const MONO="'Geist Mono',monospace";
const GREEN="#4af626";const BLUE="#0000ff";const HEADER_H=80;const BAR_H=48;
const FIELD_KEYS=["name","program","performers","place","tags","date"];
const norm=s=>s.toLowerCase().replace(/[\u2018\u2019\u2032\u0060]/g,"'").replace(/[\u201c\u201d]/g,'"').normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const strip=s=>norm(s).replace(/[\u0400-\u04ff]/g,c=>{const m={"\u0430":"a","\u0435":"e","\u043e":"o","\u0440":"p","\u0441":"c","\u0443":"y","\u0445":"x","\u0456":"i","\u0457":"i"};return m[c]||""}).replace(/[^a-z0-9]/g,"");
const PROG_MAP={"Johann Strauss II / arr. Alban Berg":5,"Johann Strauss II / arr. Anton Webern":5,"Johann Strauss II / arr. Arnold Schoenberg":5,'Carlo Gesualdo — "Mercè" grido piangendo (1611)':52,"Nataliia Polovynka, Slovo i Holos (Word and Voice)":46};
const ANIM_MS=400;

function BlinkRect(){const[on,setOn]=useState(false);useEffect(()=>{let t;const tick=()=>{setOn(true);setTimeout(()=>{setOn(false);t=setTimeout(tick,4000+Math.random()*8000)},Math.random()<.12?200:100)};t=setTimeout(tick,2000+Math.random()*6000);return()=>clearTimeout(t)},[]);return <div style={{position:"absolute",inset:"-2px -6px",background:GREEN,opacity:on?.5:0,zIndex:-1,transition:"opacity 0.04s"}}/>}

function useSelBlink(){const[flash,setFlash]=useState(false);const t=useRef(null);
  const start=useCallback(()=>{const tick=()=>{setFlash(true);setTimeout(()=>{setFlash(false);t.current=setTimeout(tick,1500+Math.random()*2500)},120)};t.current=setTimeout(tick,800+Math.random()*1200)},[]);
  const stop=useCallback(()=>{clearTimeout(t.current);setFlash(false)},[]);useEffect(()=>()=>clearTimeout(t.current),[]);return{flash,start,stop}}

/* ── Frosted panels — menu & bar ── */
const panelStyle={position:"fixed",left:0,right:0,zIndex:1000,background:"rgba(255,255,255,0.35)",backdropFilter:"blur(36px) saturate(150%)",WebkitBackdropFilter:"blur(36px) saturate(150%)",boxShadow:"0 1px 10px rgba(0,0,0,0.04)"};

/* ── Shared tap button — selector + scale on tap ── */
function TapButton({children,onClick,style,href,target}){
  const[pressed,setPressed]=useState(false);
  const handle=()=>{setPressed(true);setTimeout(()=>{setPressed(false);if(href){window.open(href,target||'_blank')}else{onClick?.()}},140)};
  const Tag=href?'a':'button';
  return (<Tag style={{...style,transform:pressed?"scale(0.93)":"scale(1)",transition:"transform 0.12s ease",position:"relative",overflow:"hidden"}} onClick={handle} href={href?undefined:undefined}>
    <BlinkRect/>{pressed&&<div style={{position:"absolute",inset:0,background:GREEN,opacity:0.4,zIndex:-1}}/>}{children}
  </Tag>);
}

function scrollPageToTop(){
  // Find the fixed scroll container used by cardindex/list/events
  const el=document.querySelector('[data-scroll-container]');
  if(el)el.scrollTo({top:0,behavior:"smooth"});
  else window.scrollTo({top:0,behavior:"smooth"});
}

function Menu({page,setPage}){
  const pages=["cardindex","list","riddles","portals"];
  const isMob=typeof window!=="undefined"&&window.innerWidth<=768;
  const bs={position:"relative",fontFamily:FONT,fontWeight:400,fontSize:isMob?"clamp(16px,4vw,22px)":"clamp(22px,2.5vw,30px)",color:BLUE,background:"none",border:"none",cursor:"pointer",padding:"5px 0",letterSpacing:"1.5px",textTransform:"lowercase",zIndex:1,textDecoration:"none"};
  return (<div id="ukho-menu" style={{...panelStyle,top:0}}>
    <div onClick={scrollPageToTop} style={{position:"absolute",top:0,left:0,right:0,height:12,cursor:"pointer",zIndex:10}}/>
    <div style={{padding:"7px 14px 0"}}><TapButton style={{...bs,fontSize:isMob?"clamp(22px,5vw,30px)":"clamp(28px,3vw,40px)",fontWeight:600,letterSpacing:"2px"}} onClick={()=>setPage("home")}>/dir</TapButton></div>
    <div style={{display:"flex",justifyContent:"space-between",padding:"3px 14px 7px"}}>{pages.map(p=><TapButton key={p} style={{...bs,fontWeight:page===p?600:400,color:page===p?"rgba(0,0,0,0.25)":BLUE}} onClick={()=>setPage(p)}>/{p}</TapButton>)}</div>
  </div>);
}

function YearCarousel({years,yearFilter,setYearFilter,dk}){
  const rest=years.filter(y=>y!==yearFilter);
  const n=rest.length;
  const itemW=dk?62:46;
  const totalW=n*itemW;
  const containerRef=useRef(null);
  const[offset,setOffset]=useState(0);
  const rafRef=useRef(null);
  const touchRef=useRef({x:0,o:0});
  // Auto-scroll the non-selected years
  useEffect(()=>{
    let last=performance.now();
    const tick=()=>{const now=performance.now(),dt=(now-last)/1000;last=now;setOffset(o=>{let next=o-dt*(dk?18:12);if(next<-totalW)next+=totalW;return next});rafRef.current=requestAnimationFrame(tick)};
    rafRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(rafRef.current);
  },[totalW,dk]);
  const handleClick=(y)=>{setYearFilter(y);setOffset(0)};
  const onTS=e=>{touchRef.current={x:e.touches[0].clientX,o:offset}};
  const onTM=e=>{const dx=e.touches[0].clientX-touchRef.current.x;setOffset(touchRef.current.o+dx)};
  // 3 copies for loop
  const items=[];for(let c=0;c<3;c++)rest.forEach((y,i)=>items.push({y,c}));
  return(<div style={{display:"flex",alignItems:"center",gap:dk?8:4,height:dk?28:22}}>
    <button onClick={()=>handleClick(yearFilter)} style={{
      flexShrink:0,fontFamily:MONO,fontSize:dk?14:11,fontWeight:700,
      padding:dk?"4px 12px":"2px 8px",
      background:"rgba(74,246,38,0.15)",border:"1px solid rgba(74,246,38,0.3)",
      cursor:"pointer",color:"#000",letterSpacing:0.3,whiteSpace:"nowrap",
    }}>{yearFilter}</button>
    <div ref={containerRef} style={{flex:1,overflow:"hidden",position:"relative",height:"100%"}}
      onTouchStart={onTS} onTouchMove={onTM}>
      <div style={{display:"flex",transform:`translateX(${offset}px)`,willChange:"transform",height:"100%",alignItems:"center"}}>
        {items.map(({y},idx)=><button key={idx} onClick={()=>handleClick(y)} style={{
          flexShrink:0,width:itemW,
          fontFamily:MONO,fontSize:dk?14:10,fontWeight:400,
          padding:dk?"4px 0":"2px 0",textAlign:"center",
          background:"none",border:"1px solid transparent",
          cursor:"pointer",color:"rgba(0,0,0,0.3)",
          letterSpacing:0.3,whiteSpace:"nowrap",
        }}>{y}</button>)}
      </div>
    </div>
  </div>);
}

function BottomBar({search,setSearch,onTop,onBottom,onToggleMode,modeLabel,onPrev,onNext,matchIdx,matchCount,years,yearFilter,setYearFilter}){
  const dk=typeof window!=="undefined"&&window.innerWidth>768;
  const bs={width:dk?42:30,height:dk?42:30,border:"1px solid rgba(0,0,0,0.08)",background:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:MONO,fontSize:dk?16:12,display:"flex",alignItems:"center",justifyContent:"center",padding:0,color:"#000"};
  const hm=search.trim()&&matchCount>1;
  const menuH=document.getElementById('ukho-menu')?.offsetHeight||HEADER_H;
  return (<div id="ukho-bar" style={{...panelStyle,top:menuH,bottom:"auto",boxShadow:"0 2px 16px rgba(0,0,0,0.04)",padding:dk?"10px 20px":"6px 12px",display:"flex",flexDirection:"column",gap:dk?8:5}}>
    <div style={{display:"flex",gap:dk?10:6,alignItems:"center"}}>
      <div style={{flex:1,position:"relative",minWidth:60}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="search..." style={{width:"100%",padding:dk?"8px 36px 8px 14px":"5px 28px 5px 10px",border:search?`2px solid rgba(74,246,38,0.5)`:"1px solid rgba(0,0,0,0.08)",fontFamily:MONO,fontSize:dk?20:16,background:search?"rgba(74,246,38,0.04)":"rgba(255,255,255,0.3)",outline:"none",letterSpacing:0,color:"#000",boxSizing:"border-box"}}/>
        {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:dk?6:4,top:"50%",transform:"translateY(-50%)",width:dk?28:22,height:dk?28:22,border:"none",background:"rgba(255,0,0,0.55)",color:"#fff",fontSize:dk?16:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",padding:0,lineHeight:1}}>×</button>}
      </div>
      {!hm&&<button style={bs} onClick={onTop}>▲</button>}{!hm&&<button style={bs} onClick={onBottom}>▼</button>}
      {hm&&<button style={bs} onClick={onPrev}>‹</button>}{hm&&<span style={{fontFamily:MONO,fontSize:dk?15:11,color:"rgba(0,0,0,0.35)",whiteSpace:"nowrap",letterSpacing:0,minWidth:dk?48:36,textAlign:"center"}}>{matchIdx+1}/{matchCount}</span>}{hm&&<button style={bs} onClick={onNext}>›</button>}
      <button onClick={onToggleMode} style={{fontFamily:FONT,fontSize:dk?16:13,fontWeight:400,padding:dk?"8px 20px":"5px 14px",background:"none",border:`1.5px solid ${GREEN}`,cursor:"pointer",color:"#000",letterSpacing:1.5,whiteSpace:"nowrap",height:dk?42:30,position:"relative",overflow:"hidden",textTransform:"lowercase"}}>{modeLabel}<div style={{position:"absolute",inset:0,background:GREEN,animation:"evBlink 1.2s step-end infinite 2s",pointerEvents:"none",opacity:0}}/></button>
      <style>{`@keyframes evBlink{0%,100%{opacity:0.18}50%{opacity:0}}`}</style>
    </div>
    {years&&years.length>1&&<YearCarousel years={years} yearFilter={yearFilter} setYearFilter={setYearFilter} dk={dk}/>}
  </div>);
}

/* ── Dice ── */
function FloatingDice({onRoll}){const[rolling,setRolling]=useState(false);const drag=useRef({active:false,moved:false,sx:0,sy:0,ex:0,ey:0});const[pos,setPos]=useState({x:null,y:null});
  useEffect(()=>{if(pos.x===null){const dk=window.innerWidth>768;setPos({x:window.innerWidth-(dk?120:66),y:window.innerHeight-(dk?320:200)})}},[]);
  const onDown=(cx,cy)=>{drag.current={active:true,moved:false,sx:cx,sy:cy,ex:pos.x,ey:pos.y}};const onMove=(cx,cy)=>{if(!drag.current.active)return;const dx=cx-drag.current.sx,dy=cy-drag.current.sy;if(Math.abs(dx)>3||Math.abs(dy)>3)drag.current.moved=true;if(drag.current.moved)setPos({x:drag.current.ex+dx,y:drag.current.ey+dy})};const onUp=()=>{if(!drag.current.active)return;const w=drag.current.moved;drag.current.active=false;if(!w&&!rolling){setRolling(true);setTimeout(()=>{setRolling(false);onRoll?.()},600)}};
  useEffect(()=>{const mm=e=>onMove(e.clientX,e.clientY),mu=()=>onUp(),tm=e=>onMove(e.touches[0].clientX,e.touches[0].clientY),tu=()=>onUp();window.addEventListener("mousemove",mm);window.addEventListener("mouseup",mu);window.addEventListener("touchmove",tm,{passive:true});window.addEventListener("touchend",tu);return()=>{window.removeEventListener("mousemove",mm);window.removeEventListener("mouseup",mu);window.removeEventListener("touchmove",tm);window.removeEventListener("touchend",tu)}});
  if(pos.x===null)return null;const deskDice=typeof window!=="undefined"&&window.innerWidth>768;const S=36,R=S/2;
  const ds=(t,l)=>({position:"absolute",width:5,height:5,borderRadius:"50%",background:"rgba(0,255,65,0.6)",boxShadow:"0 0 4px rgba(0,255,65,0.3)",top:t,left:l,transform:"translate(-50%,-50%)"});const fs=tr=>({position:"absolute",width:S,height:S,border:"1.5px solid rgba(0,255,65,0.35)",background:"rgba(0,255,65,0.05)",transform:tr});
  return(<div onMouseDown={e=>{e.preventDefault();onDown(e.clientX,e.clientY)}} onTouchStart={e=>onDown(e.touches[0].clientX,e.touches[0].clientY)} style={{position:"fixed",left:pos.x,top:pos.y,zIndex:99999,cursor:"grab",userSelect:"none",WebkitUserSelect:"none",touchAction:"none",padding:10,transform:deskDice?"scale(2)":"none",transformOrigin:"center"}}>
    <style>{`@keyframes dF{0%{transform:rotateX(15deg) rotateY(0) translateY(0)}25%{transform:rotateX(20deg) rotateY(90deg) translateY(-4px)}50%{transform:rotateX(10deg) rotateY(180deg) translateY(1px)}75%{transform:rotateX(18deg) rotateY(270deg) translateY(4px)}100%{transform:rotateX(15deg) rotateY(360deg) translateY(0)}}@keyframes dR{0%{transform:rotateX(0) rotateY(0) rotateZ(0)}100%{transform:rotateX(720deg) rotateY(540deg) rotateZ(360deg)}}`}</style>
    <div style={{perspective:200}}><div style={{width:S,height:S,position:"relative",transformStyle:"preserve-3d",animation:rolling?"dR 0.6s ease-out":"dF 8s ease-in-out infinite"}}>
      <div style={fs(`translateZ(${R}px)`)}><div style={ds("50%","50%")}/></div><div style={fs(`rotateY(180deg) translateZ(${R}px)`)}><div style={ds("20%","20%")}/><div style={ds("80%","80%")}/></div><div style={fs(`rotateY(90deg) translateZ(${R}px)`)}><div style={ds("20%","20%")}/><div style={ds("50%","50%")}/><div style={ds("80%","80%")}/></div><div style={fs(`rotateY(-90deg) translateZ(${R}px)`)}><div style={ds("25%","25%")}/><div style={ds("25%","75%")}/><div style={ds("75%","25%")}/><div style={ds("75%","75%")}/></div><div style={fs(`rotateX(90deg) translateZ(${R}px)`)}><div style={ds("22%","22%")}/><div style={ds("22%","78%")}/><div style={ds("50%","50%")}/><div style={ds("78%","22%")}/><div style={ds("78%","78%")}/></div><div style={fs(`rotateX(-90deg) translateZ(${R}px)`)}><div style={ds("22%","28%")}/><div style={ds("22%","72%")}/><div style={ds("50%","28%")}/><div style={ds("50%","72%")}/><div style={ds("78%","28%")}/><div style={ds("78%","72%")}/></div>
    </div></div></div>);
}

function useBarBottom(){
  const[bb,setBb]=useState(HEADER_H+BAR_H);
  useEffect(()=>{
    const m=()=>{const el=document.getElementById('ukho-bar');if(el)setBb(el.offsetTop+el.offsetHeight)};
    m();const t1=setTimeout(m,50);const t2=setTimeout(m,200);
    window.addEventListener("resize",m);
    // Watch bar size changes (carousel appearing/disappearing)
    const ro=new ResizeObserver(m);
    const poll=setInterval(()=>{const el=document.getElementById('ukho-bar');if(el){ro.observe(el);clearInterval(poll)}},50);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearInterval(poll);window.removeEventListener("resize",m);ro.disconnect()};
  },[]);
  return bb;
}

function FloatingLabels({cardKey}){
  const[positions,setPositions]=useState(null);
  const barBottom=useBarBottom();
  const topOff=barBottom+12;
  const h=typeof window!=="undefined"?window.innerHeight-topOff-16:500;
  useEffect(()=>{
    // After card animation settles, measure field positions
    const timer=setTimeout(()=>{
      const ys=[];
      FIELD_KEYS.forEach(k=>{
        const el=document.querySelector(`[data-field="${k}"]`);
        if(el){const r=el.getBoundingClientRect();ys.push(r.top);}
        else ys.push(null);
      });
      if(ys.some(y=>y!==null))setPositions(ys);
    },ANIM_MS+60);
    // Reset to spread while animating
    setPositions(null);
    return ()=>clearTimeout(timer);
  },[cardKey]);
  // Fallback: evenly spaced
  const fallback=FIELD_KEYS.map((_,i)=>topOff+16+(h-32)*((i+0.5)/FIELD_KEYS.length));
  const pts=positions||fallback;
  return(<div style={{position:"fixed",right:10,top:0,bottom:0,zIndex:800,pointerEvents:"none"}}>
    {FIELD_KEYS.map((l,i)=><div key={l} style={{
      position:"absolute",right:0,
      top:pts[i]!=null?pts[i]:fallback[i],
      fontFamily:FONT,fontSize:"clamp(10px,1.6vw,14px)",fontWeight:700,
      color:"rgba(0,0,0,0.14)",letterSpacing:0.3,textTransform:"uppercase",textAlign:"right",
      transition:positions?"top 0.5s cubic-bezier(0.25,1,0.5,1)":"none",
    }}>{l}</div>)}
  </div>);
}

/* ── Stable viewport height (ignores mobile keyboard) ── */
const stableVH={v:typeof window!=="undefined"?window.innerHeight:800};
if(typeof window!=="undefined")window.addEventListener("resize",()=>{if(window.innerHeight>stableVH.v)stableVH.v=window.innerHeight},{passive:true});

/* ── Card — just the content, no animation here ── */
function CardContent({ev,search,selected,showGreen,onClick}){
  const q=search.trim().toLowerCase();const hl=t=>!q?t:hlMatch(t,q);
  const barBottom=useBarBottom();
  const topOff=barBottom+12;
  const cardH=stableVH.v-topOff-16;
  const outerRef=useRef(null);const innerRef=useRef(null);
  const[shrink,setShrink]=useState(1);
  useEffect(()=>{
    const outer=outerRef.current,inner=innerRef.current;
    if(!outer||!inner)return;
    // Use stable height for measurement, not current (keyboard-affected) height
    const avail=cardH;
    inner.style.transform="scale(1)";inner.style.transformOrigin="top left";
    requestAnimationFrame(()=>{
      const need=inner.scrollHeight;
      const s=need>avail?Math.max(0.65,avail/need):1;
      setShrink(s);
    });
  },[ev.id,search]);
  return(<div ref={outerRef} onClick={onClick} style={{
    position:"absolute",top:topOff,left:0,right:0,height:cardH,
    transform:selected?"scale(0.95)":"scale(1)",transition:"transform 0.15s ease",cursor:"pointer",
    overflow:"hidden",
  }}>
    {showGreen&&<div style={{position:"absolute",inset:0,background:"rgba(74,246,38,0.12)",pointerEvents:"none",zIndex:0,transition:"background 0.1s"}}/>}
    <div style={{position:"absolute",top:8,left:12,fontFamily:FONT,fontSize:"clamp(52px,13vw,95px)",fontWeight:700,color:"rgba(0,0,0,0.08)",lineHeight:.85,letterSpacing:-3,pointerEvents:"none",transform:`scale(${shrink})`,transformOrigin:"top left",transition:"transform 0.2s ease"}}>{ev.id}</div>
    <div ref={innerRef} style={{
      padding:"clamp(12px,3vw,28px) 14px clamp(16px,4vw,36px)",paddingRight:"clamp(100px,22vw,140px)",
      display:"flex",flexDirection:"column",justifyContent:"space-between",gap:"clamp(8px,2vh,20px)",
      minHeight:`${100/shrink}%`,
      transform:`scale(${shrink})`,transformOrigin:"top left",
      width:`${100/shrink}%`,
      transition:"transform 0.2s ease",
    }}>
      <div data-field="name" style={{fontFamily:FONT,fontSize:"clamp(17px,4vw,28px)",fontWeight:600,color:"#000",lineHeight:1.15,letterSpacing:"-.5px",zIndex:1}}>{hl(ev.n)}</div>
      <div data-field="program" style={{fontFamily:FONT,fontSize:"clamp(12px,2vw,14px)",color:"rgba(0,0,0,0.4)",lineHeight:1.35}}>{ev.pr.map((p,i)=><div key={i}>{hl(p)}</div>)}</div>
      <div data-field="performers" style={{fontFamily:FONT,fontSize:"clamp(12px,2vw,14px)",color:"rgba(0,0,0,0.4)",lineHeight:1.35}}>{ev.pe.map((p,i)=><div key={i}>{hl(p)}</div>)}</div>
      <div data-field="place" style={{fontFamily:FONT,fontSize:"clamp(11px,1.8vw,13px)",color:"rgba(0,0,0,0.2)",lineHeight:1.35}}>{hl(ev.pl)}</div>
      <div data-field="tags" style={{fontFamily:FONT,fontSize:"clamp(11px,1.8vw,13px)",color:"rgba(0,0,0,0.2)",lineHeight:1.35,textTransform:"lowercase"}}>{hl(ev.t)}</div>
      <div data-field="date" style={{fontFamily:FONT,fontSize:"clamp(11px,1.8vw,13px)",color:"rgba(0,0,0,0.2)",lineHeight:1.35}}>{ev.d}</div>
    </div>
  </div>);
}

function hlMatch(text,q){const i=text.toLowerCase().indexOf(q);if(i===-1)return text;return <span>{text.slice(0,i)}<span style={{background:"rgba(74,246,38,0.3)",padding:"0 1px"}}>{text.slice(i,i+q.length)}</span>{text.slice(i+q.length)}</span>}

/* ── List Page — dual card transitions ── */
function ListPage({events,onOpenEvent,idxRef,searchRef,yearRef,modeRef,scrollRef}){
  const reversed=useMemo(()=>[...events].reverse(),[events]);
  const[search,_setSearch]=useState(searchRef?.current||"");const[idx,_setIdx]=useState(idxRef?.current||0);const[mode,_setMode]=useState(modeRef?.current||"list");
  const[progTerms,setProgTerms]=useState(null);
  const setSearch=v=>{setProgTerms(null);_setSearch(v);if(searchRef)searchRef.current=v};
  const setIdx=v=>{_setIdx(v);if(idxRef)idxRef.current=v};
  const setMode=v=>{_setMode(v);if(modeRef)modeRef.current=v};
  const[selected,setSelected]=useState(false);const selBlink=useSelBlink();
  const[yearFilter,_setYearFilter]=useState(yearRef?.current||"all");
  const setYearFilter=v=>{_setYearFilter(v);if(yearRef)yearRef.current=v};
  const[exiting,setExiting]=useState(null);
  const[enterDir,setEnterDir]=useState("None");
  const touchRef=useRef({y:0,t:0});const animating=useRef(null);const navKey=useRef(0);
  const isDesk=typeof window!=="undefined"&&window.innerWidth>768;
  const[menuH,setMenuH]=useState(130);

  // Measure actual menu height for desktop
  useEffect(()=>{
    if(!isDesk)return;
    const el=document.getElementById('ukho-menu');
    if(el)setMenuH(el.offsetHeight+4);
    const ro=new ResizeObserver(()=>{if(el)setMenuH(el.offsetHeight+4);});
    if(el)ro.observe(el);
    return ()=>ro.disconnect();
  },[isDesk]);

  // Inject hover styles for desktop list
  useEffect(()=>{
    if(!isDesk)return;
    const id='ukho-list-styles';
    if(document.getElementById(id))return;
    const s=document.createElement('style');
    s.id=id;
    s.textContent=`.ukho-row{position:relative;display:grid;grid-template-columns:40px 2fr 2fr 2fr 1.2fr 1fr 0.8fr;gap:8px;padding:10px 16px;border-bottom:1px solid rgba(0,0,0,0.03);cursor:pointer;transition:transform 0.12s ease;align-items:start}.ukho-row:hover{transform:scale(0.985)}.ukho-row .ukho-sel{position:absolute;inset:0;background:#4af626;opacity:0;transition:opacity 0.12s;pointer-events:none}.ukho-row:hover .ukho-sel{opacity:0.1}.ukho-row .ukho-slide{transition:transform 0.2s ease}.ukho-row:hover .ukho-slide{transform:scale(0.95)}.ukho-row .ukho-label{transition:transform 0.2s ease;transform-origin:left center}.ukho-row:hover .ukho-label{transform:scale(1.05)}`;
    document.head.appendChild(s);
    return ()=>{const el=document.getElementById(id);if(el)el.remove();};
  },[isDesk]);

  // Extract unique years from dates
  const years=useMemo(()=>{
    const yrs=new Set();
    reversed.forEach(e=>{const m=e.d.match(/\d{4}/);if(m)yrs.add(m[0]);});
    return["all",...[...yrs].sort().reverse()];
  },[reversed]);

  const filtered=useMemo(()=>{
    let list=reversed;
    if(yearFilter!=="all")list=list.filter(e=>e.d.includes(yearFilter));
    if(search.trim()){
      if(progTerms){
        const{composer,title,names,raw}=progTerms;
        const hcKey=raw&&Object.keys(PROG_MAP).find(k=>raw===k||raw.startsWith(k));const hcId=hcKey?PROG_MAP[hcKey]:0;
        if(hcId){list=list.filter(e=>e.id===hcId);}
        else{const matchEv=e=>{const all=s=>[...e.pr,...e.pe,e.n].some(p=>strip(p).includes(s));
          if(composer&&title&&e.pr.some(p=>{const s=strip(p);return s.includes(composer)&&s.includes(title)}))return true;
          if(title&&e.pr.some(p=>strip(p).includes(title))&&(names||[]).some(n=>all(n)))return true;
          if(composer&&all(composer))return true;
          if((names||[]).length>1&&names.some(n=>all(n)))return true;
          return false;};
        list=list.filter(matchEv);}
      }else{
        const q=norm(search);list=list.filter(e=>norm(e.n).includes(q)||e.pe.some(p=>norm(p).includes(q))||e.pr.some(p=>norm(p).includes(q))||norm(e.pl).includes(q)||norm(e.t).includes(q)||e.d.includes(q)||String(e.id).includes(q));
      }
    }
    return list;
  },[reversed,search,yearFilter,progTerms]);

  const prevEvRef=useRef(null);
  const mountedRef=useRef(false);
  useEffect(()=>{if(!mountedRef.current){mountedRef.current=true;return;}
    // When clearing search, return to everything if came from there
    if(!search.trim()){
      if(cameFromEv.current){cameFromEv.current=false;setMode("everything");return;}
      if(prevEvRef.current){
        const newList=yearFilter!=="all"?reversed.filter(e=>e.d.includes(yearFilter)):reversed;
        const newIdx=newList.findIndex(e=>e.id===prevEvRef.current.id);
        if(newIdx>=0){setIdx(newIdx);setEnterDir("None");return;}
      }
    }
    setIdx(0);setSelected(false);selBlink.stop();setExiting(null);setEnterDir("None");navKey.current++},[search,yearFilter]);
  // Track current event for search-clear restore
  useEffect(()=>{if(filtered[idx])prevEvRef.current=filtered[idx]},[filtered,idx]);

  const go=useCallback((ni,dir)=>{
    if(ni<0||ni>=filtered.length)return;
    navKey.current++;
    const oldEv=filtered[idx];
    setExiting({ev:oldEv,dir});
    setSelected(false);selBlink.stop();
    setEnterDir(dir);setIdx(ni);
    clearTimeout(animating.current);
    animating.current=setTimeout(()=>setExiting(null),ANIM_MS);
  },[filtered,idx]);

  // Touch — only on the content area, prevent propagation
  const onTouchStart=useCallback(e=>{touchRef.current={y:e.touches[0].clientY,t:Date.now()};e.stopPropagation()},[]);
  const onTouchEnd=useCallback(e=>{const dy=touchRef.current.y-e.changedTouches[0].clientY;if(Math.abs(dy)>40&&Date.now()-touchRef.current.t<500){dy>0?go(idx+1,"Up"):go(idx-1,"Down")}e.stopPropagation()},[idx,go]);
  const wt=useRef(null);
  const onWheel=useCallback(e=>{if(wt.current)return;wt.current=setTimeout(()=>{wt.current=null},200);e.deltaY>15?go(idx+1,"Up"):e.deltaY<-15&&go(idx-1,"Down")},[idx,go]);
  useEffect(()=>{const h=e=>{if(e.target.tagName==="INPUT")return;if(e.key==="ArrowDown"||e.key==="j")go(idx+1,"Up");if(e.key==="ArrowUp"||e.key==="k")go(idx-1,"Down");if(e.key==="Enter"&&selected&&filtered[idx])onOpenEvent?.(filtered[idx])};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[idx,go,selected,filtered,onOpenEvent]);
  const goRandom=()=>{const n=Math.floor(Math.random()*filtered.length);go(n,n>idx?"Up":"Down")};
  const[tapped,setTapped]=useState(false);
  const handleCardTap=()=>{
    const ev=filtered[idx];if(!ev)return;
    setTapped(true);
    setTimeout(()=>{setTapped(false);onOpenEvent?.(ev)},400);
  };

  const everything=useMemo(()=>({names:[...new Set(reversed.map(e=>e.n))].sort(),performers:PERFORMERS,pieces:PROGRAMS,places:[...new Set(reversed.map(e=>e.pl))].sort(),tags:[...new Set(reversed.flatMap(e=>/let us stay here/i.test(e.t)?[e.t]:e.t.split(',').map(t=>t.trim())).filter(Boolean))].sort()}),[reversed]);
  const[evSec,setEvSec]=useState("names");
  const cameFromEv=useRef(false);
  const setSearchSwitch=useCallback(v=>{setSearch(v);if(mode==="everything"&&v.trim().length>0){cameFromEv.current=true;setMode("list");setIdx(0);setEnterDir("None")}},[mode]);
  const jumpFrom=useCallback(t=>{setYearFilter("all");setSearch(t);cameFromEv.current=true;setMode("list");setIdx(0);setEnterDir("None")},[]);
  const jumpFromProgram=useCallback(t=>{const dash=t.match(/\s[—–\-]\s/);let composer="",title="",names=[];if(dash){composer=t.slice(0,dash.index).trim();names=composer.split(/,\s*(?:with\s+)?|(?:^|\s)with\s+/).map(n=>n.trim().replace(/\s*\(.*?\)\s*/g,"")).filter(Boolean);const rest=t.slice(dash.index+dash[0].length);const ym=rest.match(/^(.+?)\s*[\(\[]/);title=ym?ym[1].trim():rest.split(/ for /)[0].trim();}else{title=t.split(/ for /)[0].trim();}setYearFilter("all");_setSearch(t);if(searchRef)searchRef.current=t;setProgTerms({composer:strip(composer),title:strip(title),names:names.map(n=>strip(n)),raw:t});cameFromEv.current=true;setMode("list");setIdx(0);setEnterDir("None")},[]);

  const ev=filtered[idx];
  // Restore & save desktop scroll position
  useEffect(()=>{
    if(!isDesk||mode==="everything")return;
    if(scrollRef?.current)requestAnimationFrame(()=>window.scrollTo(0,scrollRef.current));
    const onScroll=()=>{if(scrollRef)scrollRef.current=window.scrollY};
    window.addEventListener("scroll",onScroll,{passive:true});
    return()=>window.removeEventListener("scroll",onScroll);
  },[isDesk,mode]);

  // ── EVERYTHING mode ──
  const evBarBottom=useBarBottom();
  if(mode==="everything"){const topH=evBarBottom;const items=everything[evSec]||[];return(<>
    <div data-scroll-container style={{position:"fixed",top:0,left:0,right:0,bottom:0,overflowY:"auto",WebkitOverflowScrolling:"touch",background:"white",zIndex:1}}>
      <div style={{height:topH}}/>
      <div style={{position:"sticky",top:topH,zIndex:10,background:"rgba(255,255,255,0.92)",backdropFilter:"blur(36px) saturate(150%)",WebkitBackdropFilter:"blur(36px) saturate(150%)",padding:isDesk?"12px 20px":"8px 12px",display:"flex",gap:isDesk?8:0,flexWrap:"wrap",justifyContent:isDesk?"flex-start":"space-evenly"}}>{Object.keys(everything).map(s=><button key={s} onClick={()=>setEvSec(s)} style={{fontFamily:FONT,fontSize:isDesk?18:14,fontWeight:evSec===s?700:400,padding:isDesk?"10px 20px":"6px 14px",background:evSec===s?"rgba(74,246,38,0.15)":"none",border:"1px solid rgba(0,0,0,0.06)",cursor:"pointer",color:"#000",letterSpacing:0.3,textTransform:"lowercase"}}>{s}</button>)}</div>
      <div style={{padding:"12px 14px 40px"}}><div style={{fontFamily:FONT,fontSize:"clamp(13px,2.3vw,16px)",lineHeight:2,color:"#000"}}>
        {items.map((item,i)=><div key={i} onClick={()=>evSec==="pieces"?jumpFromProgram(item):jumpFrom(item)} style={{padding:"2px 0",borderBottom:"1px solid rgba(0,0,0,0.025)",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(74,246,38,0.06)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>{item}</div>)}
      </div></div>
    </div>
    <BottomBar search={search} setSearch={setSearchSwitch} onTop={()=>{const el=document.querySelector('[data-scroll-container]');if(el)el.scrollTo({top:0,behavior:"smooth"})}} onBottom={()=>{const el=document.querySelector('[data-scroll-container]');if(el)el.scrollTo({top:el.scrollHeight,behavior:"smooth"})}} onToggleMode={()=>setMode("list")} modeLabel="cards"/></>)}

  // ── DESKTOP: table rows ──
  if(isDesk){
    const COLS="40px 2fr 2fr 2fr 1.2fr 1fr 0.8fr";

    const barB2=document.getElementById('ukho-bar');const deskTopH=barB2?barB2.offsetTop+barB2.offsetHeight:menuH+BAR_H;
    return (<div style={{background:"white",minHeight:"100vh"}}>
      {/* Column headers */}
      <div style={{position:"fixed",top:deskTopH,left:0,right:0,zIndex:940,background:"rgba(255,255,255,0.7)",backdropFilter:"blur(50px) saturate(180%)",WebkitBackdropFilter:"blur(50px) saturate(180%)",padding:"8px 16px",display:"grid",gridTemplateColumns:COLS,gap:8,boxShadow:"0 1px 8px rgba(0,0,0,0.04)"}}>
        {["#","name","program","performers","place","tags","date"].map(l=><div key={l} style={{fontFamily:FONT,fontSize:12,fontWeight:700,color:"rgba(0,0,0,0.14)",letterSpacing:0.3,textTransform:"uppercase"}}>{l}</div>)}
      </div>
      {/* Rows */}
      <div style={{paddingTop:deskTopH+36,paddingBottom:40}}>
        {filtered.map(e=>(
          <div key={e.id} className="ukho-row" onClick={()=>onOpenEvent?.(e)}>
            <div className="ukho-sel"/>
            <div style={{fontFamily:FONT,fontSize:13,fontWeight:700,color:"rgba(0,0,0,0.1)"}}>{e.id}</div>
            <div style={{fontFamily:FONT,fontSize:13,fontWeight:600,color:"#000"}}>{search.trim()?hlMatch(e.n,search.toLowerCase()):e.n}</div>
            <div style={{fontFamily:FONT,fontSize:12,color:"rgba(0,0,0,0.4)",lineHeight:1.5}}>{e.pr.map((p,i)=><div key={i}>{search.trim()?hlMatch(p,search.toLowerCase()):p}</div>)}</div>
            <div style={{fontFamily:FONT,fontSize:12,color:"rgba(0,0,0,0.4)",lineHeight:1.5}}>{e.pe.map((p,i)=><div key={i}>{search.trim()?hlMatch(p,search.toLowerCase()):p}</div>)}</div>
            <div style={{fontFamily:FONT,fontSize:12,color:"rgba(0,0,0,0.2)"}}>{e.pl}</div>
            <div style={{fontFamily:FONT,fontSize:11,color:"rgba(0,0,0,0.2)"}}>{e.t}</div>
            <div style={{fontFamily:FONT,fontSize:11,color:"rgba(0,0,0,0.2)"}}>{e.d}</div>
          </div>
        ))}
      </div>
      <BottomBar search={search} setSearch={setSearch} onTop={()=>window.scrollTo({top:0,behavior:"smooth"})} onBottom={()=>window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"})} onToggleMode={()=>setMode("everything")} modeLabel="everything" onPrev={()=>{}} onNext={()=>{}} matchIdx={0} matchCount={0} years={years} yearFilter={yearFilter} setYearFilter={setYearFilter}/>
      <FloatingDice onRoll={()=>{const e=filtered[Math.floor(Math.random()*filtered.length)];if(e)onOpenEvent?.(e)}}/>
    </div>);
  }

  // ── MOBILE: card swipe ──
  return (<div style={{background:"white",minHeight:"100vh",touchAction:"none",overscrollBehavior:"none"}}>
    <style>{`
      @keyframes enterUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      @keyframes enterDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}
      @keyframes exitUp{from{transform:translateY(0)}to{transform:translateY(-100%)}}
      @keyframes exitDown{from{transform:translateY(0)}to{transform:translateY(100%)}}
    `}</style>
    <FloatingLabels cardKey={navKey.current}/>
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,overflow:"hidden",zIndex:500}}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onWheel={onWheel}>
      {exiting&&<div key={`exit-${navKey.current}`} style={{position:"absolute",inset:0,animation:`exit${exiting.dir} ${ANIM_MS}ms cubic-bezier(0.4,0.0,0.2,0.9) both`}}>
        <CardContent ev={exiting.ev} search={search} selected={false} showGreen={false}/>
      </div>}
      {ev?<div key={`enter-${navKey.current}`} style={{position:"absolute",inset:0,animation:enterDir!=="None"?`enter${enterDir} ${ANIM_MS}ms cubic-bezier(0.4,0.0,0.2,0.9) both`:undefined}}>
        <div style={{width:"100%",height:"100%",transform:tapped?"scale(0.90)":"scale(1)",transition:"transform 0.35s cubic-bezier(0.4,0,0.2,1)"}}>
        <CardContent ev={ev} search={search} selected={false} showGreen={tapped} onClick={handleCardTap}/>
      </div></div>:
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:FONT,fontSize:16,color:"rgba(0,0,0,0.12)"}}>no events match "{search}"</div>}
    </div>
    <BottomBar search={search} setSearch={setSearch} onTop={()=>{setEnterDir("Down");setIdx(0)}} onBottom={()=>{setEnterDir("Up");setIdx(filtered.length-1)}} onToggleMode={()=>setMode("everything")} modeLabel="everything" onPrev={()=>{const n=idx<=0?filtered.length-1:idx-1;go(n,"Down")}} onNext={()=>{const n=idx>=filtered.length-1?0:idx+1;go(n,"Up")}} matchIdx={idx} matchCount={filtered.length} years={years} yearFilter={yearFilter} setYearFilter={setYearFilter}/>
    <FloatingDice onRoll={goRandom}/>
  </div>);
}

/* ── Poster with slide-in animation ── */
function PosterSlideIn({src,credit,alt}){
  const ref=useRef(null);
  const[visible,setVisible]=useState(false);
  useEffect(()=>{
    if(!ref.current)return;
    // Use the scroll container as root for intersection
    const root=ref.current.closest('[data-scroll-container]');
    const obs=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{threshold:0.05,rootMargin:"0px 0px -40px 0px",root:root||undefined});
    obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[]);
  return (<div ref={ref} style={{marginTop:40,marginBottom:12}}>
    <div style={{
      transform:visible?"translateY(0) scale(1)":"translateY(60px) scale(0.97)",
      opacity:visible?1:0,
      transition:"transform 1.4s cubic-bezier(0.16,1,0.3,1), opacity 1.2s ease",
    }}>
      <img src={src} alt={alt||""} style={{width:"100%",display:"block",maxHeight:"80vh",objectFit:"contain",background:"white"}} loading="lazy"/>
      {credit&&<div style={{fontFamily:FONT,fontSize:"clamp(10px,1.8vw,12px)",color:"rgba(0,0,0,0.2)",marginTop:8}}>poster by {credit}</div>}
    </div>
  </div>);
}

/* ── Fullscreen photo viewer with swipe ── */
function PhotoViewer({imgs,startIdx,onClose}){
  const[idx,setIdx]=useState(startIdx);
  const[open,setOpen]=useState(false);
  const touchRef=useRef({x:0});
  const go=d=>{const n=idx+d;if(n>=0&&n<imgs.length)setIdx(n)};
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();if(e.key==="ArrowLeft")go(-1);if(e.key==="ArrowRight")go(1)};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)});
  useEffect(()=>{document.body.style.overflow="hidden";requestAnimationFrame(()=>requestAnimationFrame(()=>setOpen(true)));return()=>{document.body.style.overflow=""}},[]);
  return(<div style={{position:"fixed",inset:0,zIndex:100000,background:open?"rgba(0,0,0,0.95)":"rgba(0,0,0,0)",transition:"background 0.35s ease",display:"flex",alignItems:"center",justifyContent:"center",touchAction:"none",overscrollBehavior:"none"}}
    onClick={onClose}
    onTouchStart={e=>{e.preventDefault();touchRef.current.x=e.touches[0].clientX}}
    onTouchEnd={e=>{const dx=e.changedTouches[0].clientX-touchRef.current.x;if(Math.abs(dx)>50){dx<0?go(1):go(-1)}}}>
    <div onClick={e=>e.stopPropagation()} style={{position:"relative",width:window.innerWidth>768?"67vw":"96vw",height:window.innerWidth>768?"67vh":"96vh",display:"flex",alignItems:"center",justifyContent:"center",transform:open?"scale(1)":"scale(0.85)",opacity:open?1:0,transition:"transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease"}}
      onTouchStart={e=>{e.stopPropagation();touchRef.current.x=e.touches[0].clientX}}
      onTouchEnd={e=>{e.stopPropagation();const dx=e.changedTouches[0].clientX-touchRef.current.x;if(Math.abs(dx)>50){dx<0?go(1):go(-1)}}}>
      <img src={imgs[idx]} alt="" className="ukho-viewer-img" style={{transition:"opacity 0.2s",userSelect:"none",WebkitUserSelect:"none",pointerEvents:"none"}}/>
    </div>
    <button onClick={onClose} style={{position:"fixed",top:16,right:16,background:"none",border:"none",color:"rgba(255,255,255,0.6)",fontSize:40,cursor:"pointer",padding:"8px 14px",lineHeight:1,zIndex:1}}>×</button>
    <div style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",fontFamily:MONO,fontSize:12,color:"rgba(255,255,255,0.4)",letterSpacing:1}}>{idx+1} / {imgs.length}</div>
    {idx>0&&<button onClick={e=>{e.stopPropagation();go(-1)}} style={{position:"fixed",left:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:36,cursor:"pointer",padding:12}}>‹</button>}
    {idx<imgs.length-1&&<button onClick={e=>{e.stopPropagation();go(1)}} style={{position:"fixed",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(255,255,255,0.5)",fontSize:36,cursor:"pointer",padding:12}}>›</button>}
  </div>);
}

/* ── Single photo slide-in for event detail ── */
function PhotoSlideIn({src,delay,index,onOpen}){
  const ref=useRef(null);
  const[visible,setVisible]=useState(false);
  useEffect(()=>{
    if(!ref.current)return;
    const root=ref.current.closest('[data-scroll-container]');
    const obs=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{threshold:0.01,rootMargin:"-12% 0px -15% 0px",root:root||undefined});
    obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[]);
  // Stacked: shifted down + slightly scaled down, like cards in a pile
  const stackOffset=visible?0:Math.min(index,4)*12+40;
  const stackScale=visible?1:0.94;
  return (<div ref={ref} style={{marginBottom:12,position:"relative",zIndex:visible?1:0,display:"flex",justifyContent:"center"}}>
    <div style={{
      transform:`translateY(${stackOffset}px) scale(${stackScale})`,
      opacity:visible?1:0.15,
      transition:`transform ${delay}s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease`,
    }}>
      <img src={src} alt="" onClick={()=>onOpen?.()} style={{maxWidth:"94vw",maxHeight:"80vh",objectFit:"contain",display:"block",background:"white",cursor:"pointer"}} loading="lazy"/>
    </div>
  </div>);
}

function EventDetail({ev,onBack}){
  const scrollRef=useRef(null);
  const infoRef=useRef(null);
  const[disperse,setDisperse]=useState(false);
  const[showHint,setShowHint]=useState(false);
  const[viewerIdx,setViewerIdx]=useState(null);
  useEffect(()=>{
    if(scrollRef.current)scrollRef.current.scrollTop=0;
    setShowHint(false);
    const el=infoRef.current;if(!el)return;
    el.style.minHeight="0";
    requestAnimationFrame(()=>{
      const natural=el.scrollHeight;
      const vh=window.innerHeight;
      el.style.minHeight="100%";
      const short=natural<vh*0.85;
      setDisperse(short);
      // Show hint if there's a poster or content overflows
      const hasMedia=(MEDIA.find(s=>s.id===ev.id)?.imgs||[]).length>0;
      if(ev.poster||hasMedia||!short)setShowHint(true);
    });
  },[ev.id]);
  // Fade hint on scroll
  useEffect(()=>{
    const el=scrollRef.current;if(!el)return;
    const onScroll=()=>{if(el.scrollTop>30)setShowHint(false)};
    el.addEventListener("scroll",onScroll,{passive:true});
    return()=>el.removeEventListener("scroll",onScroll);
  },[]);
  const lb={fontFamily:MONO,fontSize:9,fontWeight:400,color:"rgba(0,0,0,0.18)",letterSpacing:1.5,textTransform:"uppercase",marginBottom:3};
  return(<div ref={scrollRef} data-scroll-container style={{position:"fixed",top:0,left:0,right:0,bottom:0,overflowY:"auto",WebkitOverflowScrolling:"touch",background:"white"}}>
  <style>{`
    .ukho-viewer-img{width:96vw;height:96vh;object-fit:contain}
    @media(min-width:769px){.ukho-viewer-img{width:67vw;height:67vh}}
  `}</style>
  <div style={{maxWidth:860,margin:"0 auto"}}>
  <div ref={infoRef} style={{minHeight:"100%",padding:"clamp(20px,5vw,60px) clamp(16px,4vw,40px)",paddingBottom:40,...(disperse?{display:"flex",flexDirection:"column",justifyContent:"space-between",minHeight:"100dvh"}:{})}}>
    <div style={{fontFamily:FONT,fontSize:"clamp(50px,14vw,100px)",fontWeight:700,color:"rgba(0,0,0,0.06)",lineHeight:.85,letterSpacing:-3,marginBottom:8}}>{ev.id}</div>
    <div style={{marginBottom:24}}><div style={{fontFamily:FONT,fontSize:"clamp(22px,5vw,36px)",fontWeight:600,color:"#000",lineHeight:1.2,letterSpacing:"-0.5px"}}>{ev.n}</div></div>
    <div style={{marginBottom:20}}><div style={lb}>program</div><div style={{fontFamily:FONT,fontSize:"clamp(14px,2.5vw,17px)",color:"rgba(0,0,0,0.4)",lineHeight:1.6}}>{ev.pr.map((p,i)=><div key={i}>{p}</div>)}</div></div>
    <div style={{marginBottom:20}}><div style={lb}>performers</div><div style={{fontFamily:FONT,fontSize:"clamp(14px,2.5vw,17px)",color:"rgba(0,0,0,0.4)",lineHeight:1.6}}>{ev.pe.map((p,i)=><div key={i}>{p}</div>)}</div></div>
    {ev.desc&&<div style={{fontFamily:FONT,fontSize:"clamp(13px,2.2vw,15px)",color:"rgba(0,0,0,0.3)",lineHeight:1.7,marginBottom:20}}>{ev.desc.map((p,i)=><div key={i} style={{marginBottom:10}}>{p}</div>)}</div>}
    <div style={{marginBottom:8}}><div style={lb}>place</div><div style={{fontFamily:FONT,fontSize:"clamp(13px,2.2vw,15px)",color:"rgba(0,0,0,0.2)"}}>{ev.pl}</div></div>
    <div style={{marginBottom:8}}><div style={lb}>tags</div><div style={{fontFamily:FONT,fontSize:"clamp(13px,2.2vw,15px)",color:"rgba(0,0,0,0.2)",textTransform:"lowercase"}}>{ev.t}</div></div>
    <div><div style={lb}>date</div><div style={{fontFamily:FONT,fontSize:"clamp(13px,2.2vw,15px)",color:"rgba(0,0,0,0.2)"}}>{ev.d}</div></div>
  </div>
  {ev.poster&&<div style={{padding:"0 clamp(16px,4vw,40px)",paddingBottom:40}}><PosterSlideIn src={ev.poster} credit={ev.pc} alt={ev.n}/></div>}
  </div>{/* close maxWidth:860 container */}
  {(()=>{const slide=MEDIA.find(s=>s.id===ev.id);const imgs=slide?.imgs||[];if(!imgs.length)return ev.poster?null:<div style={{height:80}}/>;return(
    <div style={{maxWidth:860,margin:"0 auto",padding:"0 clamp(16px,4vw,40px)",paddingBottom:120}}>
      <div style={{position:"relative",marginBottom:24}}>
        <div style={{fontFamily:FONT,fontSize:"clamp(40px,10vw,80px)",fontWeight:400,color:"rgba(0,0,0,0.04)",lineHeight:1,letterSpacing:"4px",pointerEvents:"none"}}>MEDIA</div>
      </div>
      {imgs.map((src,i)=><PhotoSlideIn key={i} src={src} delay={i===0?1.8:1.2} index={i} onOpen={()=>setViewerIdx(i)}/>)}
    </div>);
  })()}
  {viewerIdx!==null&&(()=>{const imgs=(MEDIA.find(s=>s.id===ev.id)?.imgs)||[];return <PhotoViewer imgs={imgs} startIdx={viewerIdx} onClose={()=>setViewerIdx(null)}/>;})()}
  {showHint&&<>
    <style>{`@keyframes hintBob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}`}</style>
    <div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",
      opacity:0.15,animation:"hintBob 2.5s ease-in-out infinite",
      transition:"opacity 0.6s ease",pointerEvents:"none",zIndex:900,
      fontFamily:FONT,fontSize:18,color:"#000",letterSpacing:2,
    }}>▼</div>
  </>}
  <div style={{position:"fixed",bottom:20,right:20}}>
    <TapButton onClick={onBack} style={{fontFamily:FONT,fontSize:"clamp(26px,5vw,40px)",fontWeight:400,color:BLUE,background:"none",border:"none",textDecoration:"none",cursor:"pointer",padding:"6px 10px",lineHeight:1,letterSpacing:"1.5px"}}>back</TapButton>
  </div></div>)}

/* ── Home canvas background ── */
function HomeCanvas(){
  const ref=useRef(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');ctx.shadowBlur=0;
    let W,H,cx,cy,t=0,bootFade=0,fxEnergy=0,bPhase=0;
    let mouse={x:0.5,y:0.5},mSmooth={x:0.5,y:0.5},mouseVel=0,_mx=0.5,_my=0.5;
    let activated=false,rafId=null;
    const DPR=Math.min(window.devicePixelRatio||1,2);
    function resize(){W=window.innerWidth;H=window.innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);cx=W/2;cy=H/2;}
    resize();window.addEventListener('resize',resize);
    const COLS=36,ROWS=22,grid=new Float32Array(COLS*ROWS),vel=new Float32Array(COLS*ROWS);
    const $=(x,y)=>y*COLS+x;
    let pTick=0;
    function physics(){if(++pTick%2!==0)return;const d=0.994,c=0.30;for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){const i=$(x,y);const l=grid[$(x+1,y)]+grid[$(x-1,y)]+grid[$(x,y+1)]+grid[$(x,y-1)]-4*grid[i];vel[i]=(vel[i]+c*l)*d;grid[i]+=vel[i];}for(let x=0;x<COLS;x++){grid[$(x,0)]*=.4;grid[$(x,ROWS-1)]*=.4;}for(let y=0;y<ROWS;y++){grid[$(0,y)]*=.4;grid[$(COLS-1,y)]*=.4;}}
    function poke(nx,ny,amp,r=0.1){const gx=Math.floor(nx*COLS),gy=Math.floor(ny*ROWS),gr=Math.max(1,Math.floor(r*Math.min(COLS,ROWS)));for(let dy=-gr;dy<=gr;dy++)for(let dx=-gr;dx<=gr;dx++){const px=gx+dx,py=gy+dy;if(px>0&&px<COLS-1&&py>0&&py<ROWS-1){const d=Math.sqrt(dx*dx+dy*dy)/gr;if(d<1)grid[$(px,py)]+=amp*(1-d*d);}}}
    const G=(nx,ny)=>grid[$(Math.max(0,Math.min(COLS-1,Math.floor(nx*COLS))),Math.max(0,Math.min(ROWS-1,Math.floor(ny*ROWS))))];
    const Gc=()=>grid[$(Math.floor(COLS/2),Math.floor(ROWS/2))];
    const GRN=a=>`rgba(0,150,40,${a.toFixed(3)})`,BLU=a=>`rgba(0,0,190,${a.toFixed(3)})`,GRY=(v,a)=>`rgba(${v},${v},${v},${a.toFixed(3)})`,rnd=(a,b)=>a+Math.random()*(b-a);

    // Effects
    const FX={};
    FX.strike=(()=>{let inst=[];return{prob:1,cd:0,cdMin:3,cdMax:8,trigger(x,y){x=x??rnd(W*.2,W*.8);y=y??rnd(H*.2,H*.8);inst.push({x,y,r:0,maxR:Math.max(W,H)*1.2,life:1});poke(x/W,y/H,rnd(2.5,4),.12);},update(dt){inst=inst.filter(s=>s.life>0);inst.forEach(s=>{s.r+=(s.maxR-s.r)*.038;s.life-=.005;});},draw(){inst.forEach(s=>{for(let w=0;w<4;w++){const wr=s.r*(1-w*.15);if(wr<=0)return;const a=s.life*(1-w/4)*.14;ctx.beginPath();ctx.arc(s.x,s.y,wr,0,Math.PI*2);ctx.strokeStyle=w%2===0?GRN(a):BLU(a*.8);ctx.lineWidth=.3;ctx.stroke();}});}};})();
    FX.crack=(()=>{let c=[];return{prob:.6,cd:0,cdMin:6,cdMax:14,trigger(){const ox=rnd(W*.1,W*.9),oy=rnd(H*.1,H*.9),segs=Math.floor(rnd(3,6)),pts=[{x:ox,y:oy}],ang=rnd(0,Math.PI*2);for(let s=0;s<segs;s++){const p=pts[pts.length-1];pts.push({x:p.x+Math.cos(ang+rnd(-.5,.5))*rnd(18,65),y:p.y+Math.sin(ang+rnd(-.5,.5))*rnd(18,65)});}c.push({pts,life:1,decay:rnd(.004,.009),col:Math.random()<.5});poke(ox/W,oy/H,rnd(.4,.9),.06);},update(dt){c=c.filter(x=>x.life>0);c.forEach(x=>x.life-=x.decay);},draw(){c.forEach(x=>{ctx.beginPath();x.pts.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));ctx.strokeStyle=x.col?GRN(x.life*.18):BLU(x.life*.15);ctx.lineWidth=.5*x.life;ctx.stroke();});}};})();
    FX.phantom=(()=>{let ph=[];return{prob:.5,cd:0,cdMin:8,cdMax:18,trigger(){ph.push({x:rnd(W*.2,W*.8),y:rnd(H*.2,H*.8),life:1,decay:rnd(.004,.008),rings:Math.floor(rnd(4,8)),maxR:rnd(Math.min(W,H)*.1,Math.min(W,H)*.28),col:Math.random()<.5,phase:rnd(0,Math.PI*2)});},update(dt){ph=ph.filter(p=>p.life>0);ph.forEach(p=>{p.life-=p.decay;p.phase+=dt;});},draw(){ph.forEach(p=>{for(let i=0;i<p.rings;i++){const f=i/p.rings,r=Math.max(1,f*p.maxR+Math.sin(p.phase+f*Math.PI*3)*(1+f*2)),a=Math.abs(Math.sin(p.phase+f*Math.PI*3))*p.life*.14;if(a<.01)continue;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.strokeStyle=p.col?GRN(a):BLU(a*.9);ctx.lineWidth=.4;ctx.stroke();}});}};})();

    Object.values(FX).forEach(fx=>{fx.cd=rnd(10,18);});
    function tickFX(dt){let _e=0;try{FX.strike.update(dt);}catch(e){}try{FX.crack.update(dt);}catch(e){}try{FX.phantom.update(dt);}catch(e){}
      Object.values(FX).forEach(fx=>{fx.cd-=dt;if(fx.cd<=0){if(Math.random()<fx.prob)fx.trigger();fx.cd=rnd(fx.cdMin,fx.cdMax);}});}

    function activate(){if(activated)return;activated=true;const nx=.2+Math.random()*.6,ny=.2+Math.random()*.6;for(let i=0;i<28;i++)setTimeout(()=>{const a=Math.random()*Math.PI*2,r=Math.random()*.4;poke(Math.max(.05,Math.min(.95,nx+Math.cos(a)*r)),Math.max(.05,Math.min(.95,ny+Math.sin(a)*r*.6)),.02+Math.random()*.035,.04+Math.random()*.08);},i*35);setTimeout(softPulse,(8+Math.random()*5)*1000);}
    setTimeout(activate,1500);

    function softPulse(){const px=.3+Math.random()*.4,py=.3+Math.random()*.4;poke(px,py,.8,.14);setTimeout(()=>poke(1-px,1-py,.5,.12),400);setTimeout(softPulse,(10+Math.random()*8)*1000);}

    const onMM=e=>{const nx=e.clientX/W,ny=e.clientY/H,dx=nx-_mx,dy=ny-_my;mouseVel=Math.min(1,Math.sqrt(dx*dx+dy*dy)*28);_mx=nx;_my=ny;mouse.x=nx;mouse.y=ny;};
    const onClick=e=>FX.strike.trigger(e.clientX,e.clientY);
    const onTouch=e=>{const t=e.changedTouches[0];FX.strike.trigger(t.clientX,t.clientY);};
    window.addEventListener('mousemove',onMM);window.addEventListener('click',onClick);window.addEventListener('touchend',onTouch,{passive:true});

    function draw(){
      ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);
      const cW=W/COLS,cH=H/ROWS,gc=Gc(),bf=bootFade;
      const mX=mSmooth.x*W,mY=mSmooth.y*H,pullR=Math.min(W,H)*.42,magR=Math.min(W,H)*.32;
      const cDx=(mSmooth.x-.5)*2,cDy=(mSmooth.y-.5)*2,cDist=Math.min(1,Math.sqrt(cDx*cDx+cDy*cDy)),cBias=1+(1-cDist)*.25,dPR=pullR*(1+(1-cDist)*.25);
      const pts=[];
      for(let y=0;y<ROWS;y++){pts[y]=[];const fy=y/(ROWS-1),baseY=Math.pow(fy,1.7)*H,ds=.25+fy*1.5;for(let x=0;x<COLS;x++){const v=grid[$(x,y)],px=x*cW,py=baseY+v*55*ds;const ddx=mX-px,ddy=mY-py,dist=Math.sqrt(ddx*ddx+ddy*ddy),ease=Math.max(0,1-dist/dPR),pull=ease*ease;pts[y][x]={px:px+ddx/Math.max(1,dist)*pull*18*cBias,py:py+ddy/Math.max(1,dist)*pull*18*cBias*.4};}}
      for(let y=0;y<ROWS-1;y++){const fy=(y+.5)/(ROWS-1),dO=.25+fy*.75;for(let x=0;x<COLS-1;x++){const tl=pts[y][x],tr=pts[y][x+1],bl=pts[y+1][x],br=pts[y+1][x+1];const vA=(grid[$(x,y)]+grid[$(x+1,y)]+grid[$(x,y+1)]+grid[$(x+1,y+1)])*.25;const sh=Math.max(140,Math.min(255,Math.round(210+vA*150)));const fA=Math.min(.32,(.05+Math.abs(vA)*2.2)*dO*bf);if(fA<.007)continue;ctx.beginPath();ctx.moveTo(tl.px,tl.py);ctx.lineTo(tr.px,tr.py);ctx.lineTo(br.px,br.py);ctx.lineTo(bl.px,bl.py);ctx.closePath();ctx.fillStyle=`rgba(${sh},${sh},${sh},${fA.toFixed(3)})`;ctx.fill();}}
      for(let y=0;y<ROWS;y++){const fy=y/(ROWS-1),dO=.3+fy*.7,dW=.4+fy;const mid=grid[$(Math.floor(COLS/2),y)],en=Math.min(1,Math.abs(mid)*4);ctx.beginPath();for(let x=0;x<COLS;x++){const p=pts[y][x];x===0?ctx.moveTo(p.px,p.py):ctx.lineTo(p.px,p.py);}const baseY=Math.pow(fy,1.7)*H,rD=Math.sqrt((mX-W*.5)**2+(baseY-mY)**2),mag=Math.max(0,1-rD/magR)*.72*cBias;const a=Math.min(.88,(.04+en*.75+mag*.6+fxEnergy*.2)*bf*dO);ctx.strokeStyle=Math.abs(mid)<.02?GRY(90,a):mid>0?GRN(a):BLU(a);ctx.lineWidth=(.18+en*1.2+mag*1.5)*dW;ctx.stroke();}
      bPhase+=.016;const bY=H*.5+Math.sin(t*.18)*H*.08,sEn=Math.min(1,Math.abs(G(.5,bY/H))*6+fxEnergy*.5);
      ctx.beginPath();for(let x=0;x<W;x+=4){const f=x/W,g=G(f,bY/H),bA=5*Math.sin(f*Math.PI),amp=bA*(1+Math.abs(g)*1.8)+sEn*4*Math.sin(f*Math.PI);const py=bY+Math.sin(x*.04-bPhase*(1+f*2))*amp;x===0?ctx.moveTo(x,py):ctx.lineTo(x,py);}ctx.strokeStyle=GRN((.16+sEn*.35)*bf);ctx.lineWidth=.6+sEn*1.6;ctx.stroke();
      ctx.beginPath();for(let x=0;x<W;x+=4){const f=x/W,g=G(f,bY/H),bA=3.5*Math.sin(f*Math.PI),amp=bA*(1+Math.abs(g)*1.2)+sEn*2.5*Math.sin(f*Math.PI);const py=bY+Math.sin(x*.04-bPhase*(1+f*2)+Math.PI*.55)*amp;x===0?ctx.moveTo(x,py):ctx.lineTo(x,py);}ctx.strokeStyle=BLU((.08+sEn*.2)*bf);ctx.lineWidth=.4+sEn*.9;ctx.stroke();
      const minD=Math.min(W,H),cEn=Math.min(1,Math.abs(Gc())*5+fxEnergy*.6);for(let i=0;i<5;i++){const f=i/5,r=Math.max(1,f*minD*.52+Math.sin(f*Math.PI*4+t*(.3+f*.3))*(1+f*2)+gc*12*(1-f));ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle=i%2===0?BLU((.01+cEn*.07)*bf):GRN((.01+cEn*.05)*bf);ctx.lineWidth=.25+cEn*.5;ctx.stroke();}
      Object.values(FX).forEach(fx=>fx.draw());
    }

    let last=performance.now();
    function loop(){rafId=requestAnimationFrame(loop);const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;t+=dt;if(activated)bootFade=Math.min(1,bootFade+dt*.07);
      mouseVel*=.78;mSmooth.x+=(mouse.x-mSmooth.x)*.14;mSmooth.y+=(mouse.y-mSmooth.y)*.14;
      if(Math.random()<.09)poke(.15+Math.random()*.7,.15+Math.random()*.7,.55+Math.random()*.6,.07);
      if(Math.random()<.65)poke(mouse.x,mouse.y,.25+mouseVel*.8,.03);
      physics();tickFX(dt);draw();}
    const vis=()=>{if(document.hidden){cancelAnimationFrame(rafId);rafId=null;}else{last=performance.now();loop();}};
    document.addEventListener('visibilitychange',vis);loop();
    return ()=>{cancelAnimationFrame(rafId);window.removeEventListener('resize',resize);window.removeEventListener('mousemove',onMM);window.removeEventListener('click',onClick);window.removeEventListener('touchend',onTouch);document.removeEventListener('visibilitychange',vis);};
  },[]);
  return <canvas ref={ref} style={{position:'fixed',top:0,left:0,width:'100%',height:'100%'}}/>;
}

/* ── Typewriter hook ── */
function useTypewriter(text,speed=30,startDelay=0){
  const[displayed,setDisplayed]=useState("");
  const[done,setDone]=useState(false);
  useEffect(()=>{
    let i=0,timer=null;
    const t=setTimeout(()=>{
      timer=setInterval(()=>{if(i<text.length){i++;setDisplayed(text.substring(0,i));}else{clearInterval(timer);setDone(true);}},speed);
    },startDelay);
    return ()=>{clearTimeout(t);clearInterval(timer);};
  },[text,speed,startDelay]);
  return {displayed,done};
}

function Home({setPage}){
  const stagesText="stage 1 — catalogue and essential library (live now)\nstage 2 — full library (jun 2026)\nstage 3 — wiki (dec 2026)\n\n✳ archive created with support from";
  const upcomingText="Cherven vinyl release Kyiv dispatch\nValentin Silvestrov digital + vinyl release Kyiv dispatch\nUkho @ Iskra\nFestival of new music @ Pavilion of culture";
  const tw1=useTypewriter(stagesText,25,2000);
  const tw2=useTypewriter(upcomingText,22,4500);
  const LS={letterSpacing:"-0.5px"};

  return (<div data-scroll-container style={{position:"fixed",top:0,left:0,right:0,bottom:0,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
    <HomeCanvas/>
    <div style={{position:"relative",zIndex:1,maxWidth:800,margin:"0 auto",padding:"clamp(60px,12vw,120px) clamp(16px,5vw,40px) 80px"}}>

      {/* Description */}
      <p style={{fontFamily:FONT,fontSize:"clamp(14px,2.5vw,18px)",fontWeight:400,color:"rgba(0,0,0,0.4)",lineHeight:1.7,...LS,marginBottom:40}}>
        Ukho is a 13-year, founder-led curatorial practice that has functioned as a full contemporary music and performance institution, building a body of work across concerts, opera, ensemble production, exhibitions, and international programming, largely outside formal institutional frameworks.
        <br/><br/>Ukho is based in Kyiv.
      </p>

      {/* Enter archive */}
      <div style={{margin:"40px 0"}}>
        <style>{`@keyframes hCur{0%,100%{opacity:1}50%{opacity:0}}`}</style>
        <TapButton onClick={()=>setPage("cardindex")} style={{fontFamily:FONT,fontSize:"clamp(26px,7vw,48px)",fontWeight:400,color:BLUE,background:"none",border:"none",cursor:"pointer",padding:"8px 16px",textDecoration:"none",letterSpacing:"2px",display:"inline-block"}}>
          enter archive
        </TapButton>
      </div>

      {/* Stages + support — typewriter */}
      <div style={{fontFamily:MONO,fontSize:"clamp(11px,2vw,14px)",color:"rgba(0,0,0,0.6)",lineHeight:1.8,letterSpacing:"0px",margin:"32px 0",whiteSpace:"pre-wrap"}}>
        {tw1.displayed}
        {!tw1.done&&<span style={{display:"inline-block",width:6,height:13,background:GREEN,animation:"hCur 0.7s step-end infinite",verticalAlign:"middle",marginLeft:2}}/>}
        {tw1.done&&<div style={{marginTop:12}}><img src="https://raw.githubusercontent.com/pavlovskisad/ukhodir/main/goethe.PNG" alt="Goethe-Institut" style={{height:"clamp(120px,24vw,200px)",display:"block",opacity:0.7}}/></div>}
      </div>

      {/* Upcoming */}
      <div style={{position:"relative",margin:"48px 0"}}>
        <div style={{fontFamily:FONT,fontSize:"clamp(40px,10vw,80px)",fontWeight:400,color:"rgba(0,0,0,0.06)",lineHeight:1,letterSpacing:"4px",position:"absolute",top:-10,left:0,pointerEvents:"none"}}>UPCOMING</div>
        <div style={{fontFamily:MONO,fontSize:"clamp(11px,2vw,14px)",color:"rgba(0,0,0,0.55)",lineHeight:1.9,letterSpacing:"0px",paddingTop:40,whiteSpace:"pre-wrap"}}>
          {tw2.displayed}
          {!tw2.done&&<span style={{display:"inline-block",width:6,height:13,background:GREEN,animation:"hCur 0.7s step-end infinite",verticalAlign:"middle",marginLeft:2}}/>}
        </div>
      </div>

      {/* Umbrella */}
      <div style={{position:"relative",margin:"48px 0"}}>
        <div style={{fontFamily:FONT,fontSize:"clamp(40px,10vw,80px)",fontWeight:400,color:"rgba(0,0,0,0.06)",lineHeight:1,letterSpacing:"4px",position:"absolute",top:-10,left:0,pointerEvents:"none"}}>UMBRELLA</div>
        <div style={{paddingTop:40,display:"flex",flexDirection:"column",gap:12}}>
          <TapButton href="https://kyivdispat.ch" style={{fontFamily:FONT,fontSize:"clamp(20px,5vw,36px)",fontWeight:400,color:BLUE,background:"none",border:"none",textDecoration:"none",letterSpacing:"1.5px",display:"inline-block",padding:"6px 12px",cursor:"pointer"}}>
            kyiv dispatch record label
          </TapButton>
          <TapButton href="https://music.youtube.com/channel/UCOnv8gWUnKFFAC2So6EVS_Q" style={{fontFamily:FONT,fontSize:"clamp(20px,5vw,36px)",fontWeight:400,color:BLUE,background:"none",border:"none",textDecoration:"none",letterSpacing:"1.5px",display:"inline-block",padding:"6px 12px",cursor:"pointer"}}>
            ukho ensemble kyiv
          </TapButton>
        </div>
      </div>

      {/* Team */}
      <p style={{fontFamily:FONT,fontSize:"clamp(13px,2.3vw,16px)",fontWeight:400,color:"rgba(0,0,0,0.4)",lineHeight:1.7,...LS,margin:"48px 0 40px"}}>
        Ukho's curatorial and production work is sustained by a small core, with collaborators joining for specific periods. At different times, the curatorial team included Sasha Andrusyk, Eugene Shimalsky, Katya Sula, Katya Libkind, Luigi Gaggero, Ian Spektor, and Mykhailo Bogachov.
      </p>

      {/* Social links */}
      <div style={{display:"flex",gap:24,alignItems:"center",margin:"24px 0 40px"}}>
        <TapButton href="https://www.instagram.com/ukho.music/" style={{fontFamily:FONT,fontSize:"clamp(16px,4vw,24px)",fontWeight:400,color:BLUE,background:"none",border:"none",textDecoration:"none",letterSpacing:"1.5px",cursor:"pointer",padding:"4px 8px"}}>inst</TapButton>
        <TapButton href="https://www.facebook.com/ukhomusic" style={{fontFamily:FONT,fontSize:"clamp(16px,4vw,24px)",fontWeight:400,color:BLUE,background:"none",border:"none",textDecoration:"none",letterSpacing:"1.5px",cursor:"pointer",padding:"4px 8px"}}>fb</TapButton>
      </div>

    </div>
    {/* Vignette */}
    <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",background:"radial-gradient(ellipse at center, transparent 50%, rgba(190,190,190,0.4) 100%)",pointerEvents:"none",zIndex:2}}/>
  </div>);
}



/* ── Single slideshow — JS-driven seamless slide ── */

function Slideshow({imgs,width,forceLoad,fit}){
  const ref=useRef(null);
  const[nearby,setNearby]=useState(false);
  const[loaded,setLoaded]=useState(false);
  const[actualW,setActualW]=useState(width||160);
  const stripRef=useRef(null);
  const posRef=useRef(0);
  const timerRef=useRef(null);
  const isMob=typeof window!=="undefined"&&window.innerWidth<=768;

  useEffect(()=>{
    if(!ref.current)return;
    const ro=new ResizeObserver(([e])=>{if(e.contentRect.width>0)setActualW(e.contentRect.width)});
    ro.observe(ref.current);
    const obs=new IntersectionObserver(([e])=>setNearby(e.isIntersecting),{rootMargin:"1500px"});
    obs.observe(ref.current);
    return ()=>{obs.disconnect();ro.disconnect()};
  },[]);

  const shouldLoad=nearby||forceLoad;

  // Preload all images, show once first is ready
  useEffect(()=>{
    if(!shouldLoad||imgs.length===0)return;
    const first=new Image();
    first.onload=()=>setLoaded(true);
    first.src=imgs[0];
    for(let i=1;i<imgs.length;i++){const p=new Image();p.src=imgs[i];}
  },[shouldLoad,imgs]);

  const w=actualW;

  // Slide animation loop
  useEffect(()=>{
    if(!shouldLoad||!loaded||imgs.length<=1)return;
    const el=stripRef.current;if(!el)return;
    let pos=0;
    const n=imgs.length;

    const tick=()=>{
      const delay=isMob?1500+Math.random()*2000:4000+Math.random()*6000;
      timerRef.current=setTimeout(()=>{
        pos++;
        // Slide to next (including the duplicate at end)
        el.style.transition="transform 0.7s cubic-bezier(0.4,0,0.2,1)";
        el.style.transform=`translateX(-${pos*w}px)`;

        if(pos>=n){
          // After sliding to the duplicate first frame, snap back instantly
          setTimeout(()=>{
            el.style.transition="none";
            el.style.transform="translateX(0)";
            pos=0;
            // Force reflow then re-enable transitions
            el.offsetHeight;
            tick();
          },750);
        }else{
          tick();
        }
      },delay);
    };
    el.style.transition="none";
    el.style.transform="translateX(0)";
    tick();
    return()=>clearTimeout(timerRef.current);
  },[shouldLoad,loaded,imgs.length,isMob,w]);

  if(imgs.length===0) return <div ref={ref} style={{width:"100%",height:"100%"}}/>;
  if(!shouldLoad||!loaded) return <div ref={ref} style={{width:"100%",height:"100%",background:"#eee"}}/>;
  const bgSize=fit?"contain":"cover";
  if(imgs.length===1) return (<div ref={ref} style={{width:"100%",height:"100%",overflow:"hidden"}}>
    <div style={{width:"100%",height:"100%",backgroundImage:`url(${imgs[0]})`,backgroundSize:bgSize,backgroundPosition:"center",backgroundRepeat:"no-repeat"}}/>
  </div>);

  return (<div ref={ref} style={{width:"100%",height:"100%",overflow:"hidden",background:"white"}}>
    <div ref={stripRef} style={{display:"flex",height:"100%",willChange:"transform"}}>
      {imgs.map((u,i)=><div key={i} style={{flexShrink:0,width:w,height:"100%",backgroundImage:`url(${u})`,backgroundSize:bgSize,backgroundPosition:"center",backgroundRepeat:"no-repeat"}}/>)}
      <div style={{flexShrink:0,width:w,height:"100%",backgroundImage:`url(${imgs[0]})`,backgroundSize:bgSize,backgroundPosition:"center",backgroundRepeat:"no-repeat"}}/>
    </div>
  </div>);
}

const FIT_IDS=new Set([1,22,31,35,37,38,39,42,43,54,71,81,84,102,105,143,146,162,163,173,180]);

/* ── CardIndex page ── */
function CardIndexPage({onOpenEvent,events,scrollRef}){
  const[colW,setColW]=useState(160);
  const isMobile=typeof window!=="undefined"&&window.innerWidth<=768;
  const cols=isMobile?1:4;

  const scrollContRef=useRef(null);
  const AHEAD=isMobile?20:40,BEHIND=isMobile?10:20;
  const[loadRange,setLoadRange]=useState([0,AHEAD]);
  const cardRefs=useRef([]);
  const rafRef=useRef(null);

  // Restore scroll position on mount + rolling preload window
  useEffect(()=>{
    const el=scrollContRef.current;if(!el)return;
    if(scrollRef?.current)el.scrollTop=scrollRef.current;
    const updateLoad=()=>{
      if(rafRef.current)return;
      rafRef.current=requestAnimationFrame(()=>{
        rafRef.current=null;
        if(scrollRef)scrollRef.current=el.scrollTop;
        const viewTop=el.scrollTop;
        const viewBottom=viewTop+el.clientHeight;
        let firstVis=0,lastVis=SLIDES.length-1;
        for(let i=0;i<cardRefs.current.length;i++){
          const card=cardRefs.current[i];
          if(card&&card.offsetTop+card.offsetHeight>viewTop){firstVis=i;break;}
        }
        for(let i=firstVis;i<cardRefs.current.length;i++){
          const card=cardRefs.current[i];
          if(card&&card.offsetTop>viewBottom){lastVis=i-1;break;}
        }
        const from=Math.max(0,firstVis-BEHIND);
        const to=Math.min(SLIDES.length,lastVis+AHEAD+1);
        setLoadRange([from,to]);
      });
    };
    updateLoad();
    el.addEventListener("scroll",updateLoad,{passive:true});
    return()=>{el.removeEventListener("scroll",updateLoad);if(rafRef.current)cancelAnimationFrame(rafRef.current)};
  },[]);

  useEffect(()=>{
    const calc=()=>{
      const w=window.innerWidth;
      setColW(isMobile?Math.floor(w*0.85):Math.floor(w/cols));
    };
    calc();window.addEventListener("resize",calc);
    return ()=>window.removeEventListener("resize",calc);
  },[cols,isMobile]);

  const handleTap=(slide)=>{
    const ev=events.find(e=>e.id===slide.id);
    if(ev)onOpenEvent(ev);
  };

  return (<div ref={scrollContRef} data-scroll-container style={{
    position:"fixed",top:0,left:0,right:0,bottom:0,
    overflowY:"auto",WebkitOverflowScrolling:"touch",
    background:"white",
  }}><div style={{
    display:"grid",
    gridTemplateColumns:isMobile?`repeat(${cols}, 85%)`:`repeat(${cols}, 1fr)`,
    justifyContent:isMobile?"center":undefined,
    gap:isMobile?24:0,
    rowGap:isMobile?24:"2.5vw",
    padding:isMobile?`${HEADER_H+32}px 12px 12px`:`130px 0 0`,
  }}>
    {!isMobile&&<style>{`.ukho-card-slide{transition:transform 0.25s ease}.ukho-card-wrap:hover .ukho-card-slide{transform:scale(0.95)}.ukho-card-label{transition:transform 0.25s ease}.ukho-card-wrap:hover .ukho-card-label{transform:scale(1.15)}.ukho-card-sel{display:none}`}</style>}
    {SLIDES.map((slide,idx)=>(
      <div key={slide.id} ref={el=>cardRefs.current[idx]=el} className={isMobile?undefined:"ukho-card-wrap"} onClick={()=>handleTap(slide)} style={{
        cursor:"pointer",position:"relative",
        background:"white",
        aspectRatio:"4/3",
        overflow:"hidden",
      }}>
        <div className={isMobile?undefined:"ukho-card-slide"} style={{width:"100%",height:"100%",position:"relative"}}>
        {slide.imgs.length>0 ? (
          <Slideshow imgs={slide.imgs} width={colW} forceLoad={idx>=loadRange[0]&&idx<loadRange[1]} fit={FIT_IDS.has(slide.id)}/>
        ) : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:"12px 16px"}}>
          <div style={{fontFamily:FONT,fontSize:isMobile?"clamp(13px,3.5vw,18px)":"clamp(11px,1.2vw,15px)",fontWeight:600,color:"rgba(0,0,0,0.4)",textAlign:"center",lineHeight:1.3,letterSpacing:"-0.3px"}}>{(events.find(e=>e.id===slide.id)||{}).n||""}</div>
        </div>}
        {!isMobile&&<div className="ukho-card-sel"/>}
        </div>
        {/* Number overlay — top left like original */}
        <div className={isMobile?undefined:"ukho-card-label"} style={{
          position:"absolute",top:6,left:8,
          fontFamily:FONT,fontSize:isMobile?"clamp(22px,6vw,36px)":"clamp(18px,2vw,28px)",
          fontWeight:700,color:slide.imgs.length>0?"rgba(0,0,255,0.6)":"rgba(0,0,255,0.15)",
          textShadow:slide.imgs.length>0?"0 1px 6px rgba(0,0,0,0.3)":"none",
          pointerEvents:"none",letterSpacing:-1,lineHeight:1,zIndex:2,
          transformOrigin:"top left",
        }}>{slide.id}</div>
      </div>
    ))}
    <FloatingDice onRoll={()=>{const i=Math.floor(Math.random()*SLIDES.length);const card=cardRefs.current[i];if(card)card.scrollIntoView({behavior:"smooth",block:"center"})}}/>
  </div></div>);
}

function PortalsPage(){
  const mountRef=useRef(null);
  const[loadProg,setLoadProg]=useState(0);
  const[loaded,setLoaded]=useState(false);
  useEffect(()=>{
    const el=mountRef.current;if(!el)return;
    const w=el.clientWidth,h=el.clientHeight;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(45,w/h,0.01,1000);
    camera.position.set(0,0.5,2.5);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setSize(w,h);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setClearColor(0x000000,0);
    el.appendChild(renderer.domElement);
    const amb=new THREE.AmbientLight(0xffffff,1.5);scene.add(amb);
    const dir=new THREE.DirectionalLight(0xffffff,2);dir.position.set(2,4,3);scene.add(dir);
    const dir2=new THREE.DirectionalLight(0xffffff,1);dir2.position.set(-2,-1,-2);scene.add(dir2);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.dampingFactor=0.08;
    controls.enableZoom=true;controls.enablePan=false;
    controls.autoRotate=true;controls.autoRotateSpeed=2;
    controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY};
    const loader=new USDLoader();
    loader.load("/kopalyny.usdz",(group)=>{
      const box=new THREE.Box3().setFromObject(group);
      const center=box.getCenter(new THREE.Vector3());
      const size=box.getSize(new THREE.Vector3());
      const maxDim=Math.max(size.x,size.y,size.z);
      group.position.sub(center);
      if(maxDim>0)group.scale.multiplyScalar(1.5/maxDim);
      scene.add(group);
      setLoaded(true);
    },(xhr)=>{if(xhr.total>0)setLoadProg(Math.min(xhr.loaded/xhr.total,1));else setLoadProg(p=>Math.min(p+0.02,0.95))},(err)=>console.error("USDZ load error:",err));
    let raf;
    const animate=()=>{raf=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};
    animate();
    const onResize=()=>{const ww=el.clientWidth,hh=el.clientHeight;camera.aspect=ww/hh;camera.updateProjectionMatrix();renderer.setSize(ww,hh)};
    window.addEventListener("resize",onResize);
    return()=>{window.removeEventListener("resize",onResize);cancelAnimationFrame(raf);renderer.dispose();controls.dispose();if(el.contains(renderer.domElement))el.removeChild(renderer.domElement)};
  },[]);
  const pct=loaded?100:Math.round(loadProg*100);
  return(<div style={{minHeight:"100vh",background:"#000",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",paddingTop:HEADER_H+20}}>
    <div ref={mountRef} style={{width:"min(80vw,500px)",height:"min(80vw,500px)",position:"relative"}}>
      {!loaded&&<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:10,pointerEvents:"none"}}>
        <style>{`@keyframes holo{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}@keyframes barPulse{0%,100%{box-shadow:0 0 8px rgba(74,246,38,0.4),0 0 20px rgba(74,246,38,0.15)}50%{box-shadow:0 0 14px rgba(74,246,38,0.7),0 0 30px rgba(74,246,38,0.25)}}@keyframes scanline{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}`}</style>
        <div style={{width:"60%",maxWidth:220}}>
          <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.06)",position:"relative",overflow:"hidden",animation:"barPulse 2s ease-in-out infinite"}}>
            <div style={{position:"absolute",top:0,left:0,height:"100%",width:pct+"%",borderRadius:2,background:"linear-gradient(90deg,#4af626,#00ffd5,#4af626,#00ffd5)",backgroundSize:"200% 100%",animation:"holo 3s ease infinite",transition:"width 0.3s ease"}}/>
            <div style={{position:"absolute",top:0,left:0,width:pct+"%",height:"100%",overflow:"hidden"}}><div style={{width:"100%",height:"200%",background:"linear-gradient(180deg,transparent 40%,rgba(255,255,255,0.15) 50%,transparent 60%)",animation:"scanline 1.5s linear infinite"}}/></div>
          </div>
          <div style={{fontFamily:MONO,fontSize:10,color:"rgba(74,246,38,0.5)",marginTop:6,textAlign:"center",letterSpacing:2}}>{pct}%</div>
        </div>
      </div>}
    </div>
    <div style={{fontFamily:FONT,fontSize:22,color:"rgba(255,255,255,0.15)",letterSpacing:1,marginTop:24}}>coming soon</div>
  </div>);
}

function Placeholder({title}){return <div style={{paddingTop:HEADER_H+40,minHeight:"100vh",background:"white",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FONT,fontSize:22,color:"rgba(0,0,0,0.1)",letterSpacing:1}}>{title}</div>}

/* ── Riddles ── */
const RIDDLES=[
  [179,"Perhaps even this will one day be a joy to recall."],
  [179,"We gather under the protection of holy wisdom to examine a proposition set forth by the learned philosopher Gottfried Wilhelm Leibniz, in his recent treatise, Essays on Theodicy. He argues that despite the reality of evil, this world is the best of all possible worlds, chosen by God in His infinite knowledge and goodness. We ask: can such a claim be sustained?"],
  [178,"If you believe you can damage, then believe you can repair."],
  [178,"A keeper of comp\u00e1s taps inside the hollowed body of an ancient whale; he calls: Tikkun haklali, Hitbodedut! \u2014 universal repair. Woman sheds despair with a motion of the hip."],
  [177,"Someone falling from a swing; every blade of grass in focus."],
  [176,"Songs of suspension are explained; the singer sleeps on trains between the sessions (for safety)."],
  [176,"Love is a green duck, out of a muddy pond, shrieking between the shoulder blades."],
  [175,"Four speakers raise one voice: I\u2019m so heartsick, what with you going far away, while I cannot go with you."],
  [174,"Birds and marshrutka drivers call the same; we ride an eternal tram."],
  [173,"From the square, we walk very slowly in a huge procession, down one long street. Everyone who lives or works here has come out and is kneeling on the roadside; it looks and seems endless. Bohdan\u2019s mother\u2019s friend gets up and runs to her, they cry and hug. We walk for about 40 minutes, maybe an hour \u2014 an eternity."],
  [172,"In one dark, dark city there was a dark, dark street, and on it a dark, dark house..."],
  [170,"We carry the burned of Kinburn to the bones of this land\u2019s earliest giants."],
  [170,"Ladon the dragon, whose hundred heads never sleep, will guard those remains beneath the orchard of immortal fruit."],
  [168,"How peaceful it is here: a flat small frog fell into your hand. And water frogs in ponds forge a forest reverie."],
  [168,"Listen: somewhere behind the hill, over the treetops, the clouds shed drops of light into the puddles of spring."],
  [168,"Let us stay here, in solitude."],
  [167,"transparent targets of this August that cuts summer\u2019s dusty braids"],
  [167,"to hold a needle of silence in your mouth to roughly stitch your words with white thread to whimper while drowning in spit"],
  [167,"to mend things that are still useful ... to learn to search for the roots of a life that has yet to learn its name"],
  [163,"Thou wast not born for death, immortal Bird! No hungry generations tread thee down"],
  [163,"and around goes the wheel that stood still with a man who committed the massacre where can he go? there\u2019s no place to go"],
  [162,"The studio is emerald green: its walls and ceiling are covered in silk, giving it the appearance of a tabernacle, a chapel of sound \u2014 all the more improbable as it is nestled in a typical Soviet block house. The sign reads: \u201CStreet of Enthusiasts.\u201D"],
  [158,"A spotlight sweeps across the hall, catching the unguarded \u2014 listeners, the last rose. In the painting: skull, bouquet, hourglass."],
  [149,"Perhaps we have returned so that you might learn about fulgurites: a fulgurite is sand fused by a lightning strike, or the trace of such a strike upon any rock. Perhaps it is to let a living fungus grow through a dead polystyrene horse; a living fungus or a living fly. We may be here for impossible logistics: five years after summoning limbo to the center of Kyiv, we mean to carry it away to an underground vault at the city\u2019s edge. One may enter only through a hut on chicken legs. (Did anyone truly think we had heard it all?)"],
  [145,"He who kisses the joy as it flies lives in eternity\u2019s sunrise."],
  [145,"\u201CZodiac,\u201D thirty minutes \u2014 everyone latches on; \u201CCapricorn,\u201D thirty minutes \u2014 mostly Capricorns. By Thursday, we need an analog synthesizer and wig glue."],
  [144,"And so, what do the passersby know of him? That he is a forest fool. His song has no gift. Raw, truly raw, is his sermon: a wet log. He lies divinely. He lies like a nightingale at night. He strikes a great tocsin in the bell of the mind. Outmind \u2014 the fallen hoop of stupidity. Now C strides into the province of the strong word \u201CCan.\u201D (I-can-er, I can!) And so on, in at least six languages \u2014 of birds, of gods, of men, of zaum, of madness, of the everyday."],
  [143,"Music, impregnated by time, is invested with this violence of the sacred of which Bataille speaks; a violence silent and without language, that only sound and its becoming can possibly, and only for an instant, evoke and exorcise."],
  [139,"Darnytsia: pearl baths and songs of moisture-loving birds."],
  [138,"A vast beast-snail, a transparent flower; shipwreck inevitable."],
  [136,"Hush, hushshshsh, brush bristles across a sensitive microphone, a spotlight on a building coming down outside: all clear now \u2014 except access to holy water."],
  [135,"Dnipro, Desna, Desenka, Lybid, Pochaina, Syrets, Nyvka, Vita, Horenka, Koturka, Lyubka, Darnytsia, Zolocha, Hnylusha; Klov, Hlybochytsya, Khreshchatyk, Kyianka, Skomorokh, Yurkovytsya, Kudryavets; Afanasivskyi, Batyiv, Buslivka, Kadetskyi Hai, Mokra, Pishchanyi, Protasiv Yar, Shuliavka, Sovka, Vershynka, Vidradnyi, Yamka. Northern streams. Southern streams. Lethe."],
  [135,"To escape the body is to escape density."],
  [132,"Beauty is a great enchantress; affect is great magic."],
  [132,"Tonight I shall keep you long. But it will not happen again."],
  [132,"Stronger than lover\u2019s love is lover\u2019s hate."],
  [129,"Strings (hypothesis): assume quantum strings exist \u2014 one-dimensional, thin, ultra-microscopic. Vibration (hypothesis): assume they vibrate. Poetics (hypothesis): assume all elementary particles and their interactions emerge from this vibration. Experimental verification: not yet accessible. Theoretical status: deeply contested. (Let\u2019s stick to poetics). Poetics (hypothesis 2): the world is rhythmic, dance-like at the ultra-microscopic level."],
  [128,"My body\u2019s envelope floats freely around the furrow, enormous balloon containing this little river, for this great furrow when I try to see my body at the same time is only a rivulet, but still lively; untamed, champagne and spitting cat."],
  [128,"I see an enormous restaurant. Numerous stories, and people eating on all the balconies (yes, there are balconies and with pillarets!), thousands of tables, thousands of people eating, thousands of waiters in blue jackets...Dishes are served. Dishes are removed...No sooner is the dish served than the plate is taken away. No sooner is the plate set down than the dish is taken away. The speed is no longer even that of a comic gag, but of a metronome... Try to picture the details: These diners are like manikins, the waiters too. No expression one can remember. No individuality in the movements either."],
  [125,"All speaks of the infinite, all would come to our side \u2014 To fly, like this world, without aim, into the radiant night."],
  [99,"Once a church refectory, then a Soviet school gymnasium, and then a church again \u2014 the painted wooden gym floor still hidden beneath a carpet. We are let in on Trinity, after the service \u2014 the whole space filled with grasses and flowers."],
  [97,"The stands are wet and empty, and those who came sit on the rubber track beside the field. We didn\u2019t think of trills; they fill the pauses in the songs. We did think of the brush-like floodlights: they flare on as dusk falls, just for us. Then the moon rises over the song, the chainsaw, the anarchist flag."],
  [96,"In the middle of a vast empty square, which turns out to rest atop a parking garage, five figures sit. Behind them rise the white ribs and honeycombs of the Olympian roof. Between honeycombs and figures stand thirty people, a stone set upon each head. They move very slowly toward us, until they reach the stage, cut through it, and pass beyond. There they remove the stones and continue moving just as slowly. Night descends; a woman by the stage loses her skin."],
  [90,"Mimosa blossoms line the roads into town; eight thousand mummies rest in its catacombs, the last body mummified in 1920. They stand, sit, lie, hang on walls and from ceilings; they form compositions. All of which can be viewed for a three-euro entrance ticket. Other ceilings are abundant too. Think stalactites of the Palatine Chapel, carved of the finest oak by Arabian carpenters on the orders of King Roger II. Think Persian gold mosaics of the Kings\u2019 own chambers."],
  [85,"Every church needs its Pierre."]
];

function shuffleRiddles(){
  const idx=Array.from({length:RIDDLES.length},(_,i)=>i);
  for(let i=idx.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}
  for(let pass=0;pass<10;pass++){let ok=true;for(let i=0;i<idx.length-1;i++){
    if(RIDDLES[idx[i]][0]===RIDDLES[idx[i+1]][0]){for(let k=i+2;k<idx.length;k++){
      const eK=RIDDLES[idx[k]][0],eI=RIDDLES[idx[i]][0];
      const pK=k>0?RIDDLES[idx[k-1]][0]:-1,nK=k<idx.length-1?RIDDLES[idx[k+1]][0]:-1;
      if(eK!==eI&&eI!==pK&&eI!==nK){[idx[i+1],idx[k]]=[idx[k],idx[i+1]];ok=false;break}}}}
    if(ok)break}
  return idx;
}

function RiddlesPage({onOpenEvent,events}){
  const[order,setOrder]=useState(()=>shuffleRiddles());
  const[pos,setPos]=useState(0);
  const[displayed,setDisplayed]=useState("");
  const[typing,setTyping]=useState(false);
  const[rolling,setRolling]=useState(false);
  const[entering,setEntering]=useState(false);
  const timerRef=useRef(null);

  const riddle=RIDDLES[order[pos]];
  const fullText=riddle[1];
  const eventId=riddle[0];

  function typeOut(text){
    setDisplayed("");setTyping(true);let i=0;
    clearInterval(timerRef.current);
    const speed=Math.max(12,Math.min(35,1200/text.length));
    timerRef.current=setInterval(()=>{
      if(i<text.length){i++;setDisplayed(text.substring(0,i))}
      else{clearInterval(timerRef.current);setTyping(false)}
    },speed);
  }

  function skipType(){clearInterval(timerRef.current);setDisplayed(fullText);setTyping(false)}

  useEffect(()=>{typeOut(fullText);return()=>clearInterval(timerRef.current)},[pos,order]);

  function nextRiddle(){
    if(typing){skipType();return}
    if(rolling)return;
    setRolling(true);
    setTimeout(()=>{
      setRolling(false);
      let p=pos+1;
      if(p>=order.length){setOrder(shuffleRiddles());p=0}
      setPos(p);
    },500);
  }

  function enterEvent(){
    if(entering)return;
    setEntering(true);
    setTimeout(()=>{
      setEntering(false);
      const ev=events.find(e=>e.id===eventId);
      if(ev)onOpenEvent(ev);
    },500);
  }

  const isDesk=typeof window!=="undefined"&&window.innerWidth>768;
  const S=isDesk?72:36,R=S/2;
  const ds=(t,l)=>({position:"absolute",width:isDesk?10:5,height:isDesk?10:5,borderRadius:"50%",background:"rgba(0,255,65,0.6)",boxShadow:`0 0 ${isDesk?8:4}px rgba(0,255,65,0.3)`,top:t,left:l,transform:"translate(-50%,-50%)"});
  const fs=tr=>({position:"absolute",width:S,height:S,border:`${isDesk?2.5:1.5}px solid rgba(0,255,65,0.35)`,background:"rgba(0,255,65,0.05)",transform:tr});

  return (<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"white",display:"flex",flexDirection:"column"}}>
    {/* Riddle text — fills from menu to buttons */}
    <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",padding:`${HEADER_H+20}px clamp(16px,5vw,40px) 20px`,display:"flex",alignItems:"center"}}>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto"}}>
        <div style={{fontFamily:MONO,fontSize:"clamp(12px,2.5vw,14px)",lineHeight:1.6,letterSpacing:.3,color:"rgba(0,0,0,0.9)"}}>
          {displayed}
          <span style={{display:"inline-block",width:6,height:13,background:"rgba(0,255,65,0.8)",verticalAlign:"middle",marginLeft:2,animation:"rcBlink 0.7s step-end infinite"}}/>
        </div>
      </div>
    </div>
    {/* Bottom buttons */}
    <div style={{flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-evenly",maxWidth:600,margin:"0 auto",width:"100%",padding:`12px clamp(16px,5vw,40px) ${140}px`}}>
        <style>{`
          @keyframes rcBlink{0%,100%{opacity:1}50%{opacity:0}}
          @keyframes rdFloat{0%{transform:rotateX(15deg) rotateY(0) translateY(0)}25%{transform:rotateX(20deg) rotateY(90deg) translateY(-4px)}50%{transform:rotateX(10deg) rotateY(180deg) translateY(1px)}75%{transform:rotateX(18deg) rotateY(270deg) translateY(4px)}100%{transform:rotateX(15deg) rotateY(360deg) translateY(0)}}
          @keyframes rdRoll{0%{transform:rotateX(0) rotateY(0) rotateZ(0)}100%{transform:rotateX(720deg) rotateY(540deg) rotateZ(360deg)}}
          @keyframes doorFloat{0%{transform:rotateX(5deg) rotateY(0) translateY(0)}25%{transform:rotateX(8deg) rotateY(15deg) translateY(-3px)}50%{transform:rotateX(3deg) rotateY(0) translateY(0)}75%{transform:rotateX(6deg) rotateY(-15deg) translateY(3px)}100%{transform:rotateX(5deg) rotateY(0) translateY(0)}}
          @keyframes doorEnter{0%{transform:rotateX(5deg) rotateY(0) scale(1)}40%{transform:rotateX(0) rotateY(0) scale(1.15)}70%{transform:rotateX(0) rotateY(0) scale(0.9);opacity:0.5}100%{transform:rotateX(5deg) rotateY(0) scale(1);opacity:1}}
        `}</style>
        {/* Dice */}
        <div onClick={nextRiddle} style={{cursor:"pointer",perspective:200,padding:4}}>
          <div style={{width:S,height:S,position:"relative",transformStyle:"preserve-3d",animation:rolling?"rdRoll 0.5s ease-out":"rdFloat 8s ease-in-out infinite"}}>
            <div style={fs(`translateZ(${R}px)`)}><div style={ds("50%","50%")}/></div>
            <div style={fs(`rotateY(180deg) translateZ(${R}px)`)}><div style={ds("20%","20%")}/><div style={ds("80%","80%")}/></div>
            <div style={fs(`rotateY(90deg) translateZ(${R}px)`)}><div style={ds("20%","20%")}/><div style={ds("50%","50%")}/><div style={ds("80%","80%")}/></div>
            <div style={fs(`rotateY(-90deg) translateZ(${R}px)`)}><div style={ds("25%","25%")}/><div style={ds("25%","75%")}/><div style={ds("75%","25%")}/><div style={ds("75%","75%")}/></div>
            <div style={fs(`rotateX(90deg) translateZ(${R}px)`)}><div style={ds("22%","22%")}/><div style={ds("22%","78%")}/><div style={ds("50%","50%")}/><div style={ds("78%","22%")}/><div style={ds("78%","78%")}/></div>
            <div style={fs(`rotateX(-90deg) translateZ(${R}px)`)}><div style={ds("22%","28%")}/><div style={ds("22%","72%")}/><div style={ds("50%","28%")}/><div style={ds("50%","72%")}/><div style={ds("78%","28%")}/><div style={ds("78%","72%")}/></div>
          </div>
        </div>
        <div style={{width:1,height:14,background:"rgba(255,255,255,0.12)"}}/>
        {/* Door */}
        <div onClick={enterEvent} style={{cursor:"pointer",perspective:200,padding:4,transform:isDesk?"scale(2)":"none",transformOrigin:"center"}}>
          <div style={{width:36,height:42,position:"relative",transformStyle:"preserve-3d",animation:entering?"doorEnter 0.6s ease-out":"doorFloat 8s ease-in-out infinite",pointerEvents:"none"}}>
            <div style={{position:"absolute",width:32,height:40,top:1,left:2,border:"1.5px solid rgba(0,255,65,0.4)",background:"rgba(0,255,65,0.03)",transform:"translateZ(-5px)"}}/>
            <div style={{position:"absolute",width:18,height:38,top:2,right:0,transformOrigin:"right center",transform:"rotateY(-50deg) translateZ(3px)",background:"rgba(0,255,65,0.08)",border:"1.5px solid rgba(0,255,65,0.5)"}}>
              <div style={{position:"absolute",width:3,height:5,background:"rgba(0,255,65,0.7)",borderRadius:1,left:3,top:"50%",transform:"translateY(-50%)"}}/>
            </div>
            <div style={{position:"absolute",left:3,top:2,width:24,height:38}}>
              <div style={{position:"absolute",width:9,height:9,borderRadius:"50%",border:"1.5px solid rgba(0,255,65,0.6)",background:"rgba(0,255,65,0.1)",top:0,left:6}}/>
              <div style={{position:"absolute",width:2,height:12,background:"rgba(0,255,65,0.6)",top:9,left:10}}/>
              <div style={{position:"absolute",width:9,height:2,background:"rgba(0,255,65,0.6)",top:12,left:1,transform:"rotate(-20deg)"}}/>
              <div style={{position:"absolute",width:9,height:2,background:"rgba(0,255,65,0.6)",top:11,left:11,transform:"rotate(30deg)"}}/>
              <div style={{position:"absolute",width:2,height:13,background:"rgba(0,255,65,0.6)",top:20,left:10,transform:"rotate(20deg)",transformOrigin:"top center"}}/>
              <div style={{position:"absolute",width:2,height:13,background:"rgba(0,255,65,0.6)",top:20,left:11,transform:"rotate(-15deg)",transformOrigin:"top center"}}/>
            </div>
          </div>
        </div>
    </div>
  </div>);
}

/* ── Analog Overlay ── */
function AnalogOverlay(){
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const DPR=Math.min(window.devicePixelRatio||1,2);
    let W,H,vignetteCache=null,texCache=null,rafId=null;
    function resize(){W=window.innerWidth;H=window.innerHeight;canvas.width=W*DPR;canvas.height=H*DPR;canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);vignetteCache=null;}
    resize();window.addEventListener('resize',resize);
    function buildVignette(){
      const vc=document.createElement('canvas');vc.width=W*DPR;vc.height=H*DPR;const vx=vc.getContext('2d');vx.setTransform(DPR,0,0,DPR,0,0);
      let g=vx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.45,W/2,H/2,Math.min(W,H)*1.0);g.addColorStop(0,'transparent');g.addColorStop(1,'rgba(14,14,22,0.10)');vx.fillStyle=g;vx.fillRect(0,0,W,H);
      g=vx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.min(W,H)*0.6);g.addColorStop(0,'rgba(0,150,40,0.014)');g.addColorStop(1,'transparent');vx.fillStyle=g;vx.fillRect(0,0,W,H);
      const ab=Math.min(W,H)*0.012;
      g=vx.createRadialGradient(W/2+ab,H/2+ab,Math.min(W,H)*0.52,W/2+ab,H/2+ab,Math.min(W,H));g.addColorStop(0,'transparent');g.addColorStop(0.72,'rgba(180,30,10,0)');g.addColorStop(1,'rgba(180,30,10,0.032)');vx.fillStyle=g;vx.fillRect(0,0,W,H);
      g=vx.createRadialGradient(W/2-ab,H/2-ab,Math.min(W,H)*0.5,W/2-ab,H/2-ab,Math.min(W,H)*0.98);g.addColorStop(0,'transparent');g.addColorStop(0.68,'rgba(0,0,190,0)');g.addColorStop(1,'rgba(0,0,190,0.038)');vx.fillStyle=g;vx.fillRect(0,0,W,H);
      g=vx.createRadialGradient(W*0.25,H*0.2,0,W*0.25,H*0.2,Math.min(W,H)*0.32);g.addColorStop(0,'rgba(220,235,255,0.045)');g.addColorStop(0.45,'rgba(200,220,255,0.014)');g.addColorStop(1,'transparent');vx.fillStyle=g;vx.fillRect(0,0,W,H);
      g=vx.createRadialGradient(W*0.78,H*0.8,0,W*0.78,H*0.8,Math.min(W,H)*0.22);g.addColorStop(0,'rgba(200,215,255,0.022)');g.addColorStop(1,'transparent');vx.fillStyle=g;vx.fillRect(0,0,W,H);
      vignetteCache=vc;}
    let specX=0.25,specY=0.2,specTX=0.25,specTY=0.2,specTimer=0;
    function updateSpec(dt){specTimer-=dt;if(specTimer<=0){specTX=0.1+Math.random()*0.8;specTY=0.05+Math.random()*0.5;specTimer=10+Math.random()*18;}specX+=(specTX-specX)*dt*0.04;specY+=(specTY-specY)*dt*0.04;}
    function drawSpec(){const sx=specX*W,sy=specY*H,r=Math.min(W,H)*(0.15+Math.sin(specX*2)*0.04);const g=ctx.createRadialGradient(sx,sy,0,sx,sy,r);g.addColorStop(0,'rgba(210,228,255,0.032)');g.addColorStop(0.5,'rgba(200,220,255,0.01)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
    let grainTick=0;
    function drawGrain(){const c=Math.floor(W*H*0.0006/(DPR*DPR));for(let i=0;i<c;i++){const x=Math.random()*W,y=Math.random()*H,r=Math.random();ctx.fillStyle=r<0.12?`rgba(0,150,40,${(0.03+Math.random()*0.04).toFixed(3)})`:r<0.22?`rgba(0,0,190,${(0.025+Math.random()*0.04).toFixed(3)})`:`rgba(200,200,200,${(0.02+Math.random()*0.035).toFixed(3)})`;ctx.fillRect(x,y,1,1);}}
    const scans=[];let scanTimer=4+Math.random()*6;
    function drawScans(dt){scanTimer-=dt;if(scanTimer<=0){if(Math.random()<0.38){const dir=Math.random()<0.5?1:-1,r=Math.random();scans.push({pos:dir>0?-0.02:1.02,speed:dir*(0.04+Math.random()*0.13),width:3+Math.random()*24,opacity:0.006+Math.random()*0.011,col:r<0.3?'b':r<0.55?'g':'c',ab:Math.random()*2.5+0.5});}scanTimer=5+Math.random()*11;}
      for(let i=scans.length-1;i>=0;i--){const s=scans[i];s.pos+=s.speed*dt;if(s.pos<-0.08||s.pos>1.08){scans.splice(i,1);continue;}const ef=Math.min(1,Math.min(Math.abs(s.pos),Math.abs(1-s.pos))*18),a=s.opacity*ef;if(a<0.001)continue;const y=s.pos*H,hl=s.width/2;const cl=s.col==='b'?`rgba(0,0,190,${a.toFixed(4)})`:s.col==='g'?`rgba(0,150,40,${a.toFixed(4)})`:`rgba(180,200,255,${a.toFixed(4)})`;let g=ctx.createLinearGradient(0,y-hl,0,y+hl);g.addColorStop(0,'transparent');g.addColorStop(0.5,cl);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,y-hl,W,s.width);const aF=a*0.45;g=ctx.createLinearGradient(0,y-hl-s.ab,0,y+hl-s.ab);g.addColorStop(0,'transparent');g.addColorStop(0.5,`rgba(180,20,20,${aF.toFixed(4)})`);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,y-hl-s.ab,W,s.width);}}
    let gl=null,glT=16+Math.random()*20;
    function drawGlitch(dt){glT-=dt;if(glT<=0&&!gl){gl={dur:0.05+Math.random()*0.13,el:0,y:Math.random()*H,h:1+Math.random()*3,col:Math.random()<0.5?'g':'b',sh:(Math.random()<0.5?1:-1)*(2+Math.random()*9),y2:Math.random()*H,bx:Math.random()*W*0.8,bw:20+Math.random()*120,bh:1+Math.random()*4};glT=16+Math.random()*22;}if(!gl)return;gl.el+=dt;const p=gl.el/gl.dur;if(p>=1){gl=null;return;}const env=p<0.5?p*2:(1-p)*2,a=env*0.10;const c1=gl.col==='g'?`rgba(0,150,40,${a.toFixed(3)})`:`rgba(0,0,190,${a.toFixed(3)})`;const c2=gl.col==='g'?`rgba(0,0,190,${(a*0.5).toFixed(3)})`:`rgba(0,150,40,${(a*0.5).toFixed(3)})`;ctx.fillStyle=c1;ctx.fillRect(gl.bx+gl.sh,gl.y,gl.bw,gl.bh);ctx.fillStyle=c2;ctx.fillRect(gl.bx-gl.sh*0.5,gl.y+gl.bh+1,gl.bw*0.6,1);}
    let scrollVel=0,parallaxY=0,parallaxOp=0,lastSY=0;
    const onScroll=()=>{
      // Check fixed scroll containers first, fall back to window
      const sc=document.querySelector('[data-scroll-container]');
      const sy=sc?sc.scrollTop:(window.scrollY||0);
      scrollVel=Math.max(Math.abs(sy-lastSY),Math.abs(scrollVel*0.5))*Math.sign(sy-lastSY)*60;lastSY=sy;
    };
    // Listen on both window and capture phase to catch scroll containers
    window.addEventListener('scroll',onScroll,{passive:true});document.addEventListener('scroll',onScroll,{passive:true,capture:true});
    function buildTex(){const tw=400,th=400,tc=document.createElement('canvas');tc.width=tw;tc.height=th;const tx=tc.getContext('2d');tx.strokeStyle='rgba(0,0,0,1)';for(let i=-th;i<tw+th;i+=9){tx.beginPath();tx.moveTo(i,0);tx.lineTo(i+th,th);tx.lineWidth=0.4;tx.globalAlpha=0.06+Math.random()*0.08;tx.stroke();}texCache=tc;}
    setTimeout(buildTex,100);
    function drawParallax(dt){scrollVel*=0.88;const sp=Math.abs(scrollVel),to=Math.min(1,sp*0.012);parallaxOp+=(to-parallaxOp)*(dt*6);parallaxY+=scrollVel*dt*0.28;if(texCache)parallaxY=parallaxY%texCache.height;if(parallaxOp<0.004||!texCache)return;ctx.save();ctx.globalAlpha=parallaxOp*0.55;const tw=texCache.width,th=texCache.height,sy=((parallaxY%th)+th)%th-th;for(let y=sy;y<H+th;y+=th)for(let x=0;x<W+tw;x+=tw)ctx.drawImage(texCache,x,y);ctx.globalAlpha=parallaxOp*0.10;ctx.fillStyle='rgba(0,150,40,1)';ctx.fillRect(0,0,W,H);ctx.restore();}
    let last=performance.now();
    function loop(){rafId=requestAnimationFrame(loop);const now=performance.now(),dt=Math.min(0.05,(now-last)/1000);last=now;ctx.clearRect(0,0,W,H);if(!vignetteCache)buildVignette();ctx.drawImage(vignetteCache,0,0,W,H);updateSpec(dt);drawSpec();if(++grainTick>=3){grainTick=0;drawGrain();}drawScans(dt);drawGlitch(dt);}
    const vis=()=>{if(document.hidden){cancelAnimationFrame(rafId);rafId=null;}else{last=performance.now();loop();}};
    document.addEventListener('visibilitychange',vis);loop();
    return ()=>{cancelAnimationFrame(rafId);window.removeEventListener('resize',resize);window.removeEventListener('scroll',onScroll);document.removeEventListener('scroll',onScroll);document.removeEventListener('visibilitychange',vis);};
  },[]);
  return <canvas ref={canvasRef} style={{position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:99998}}/>;
}

export default function App(){const[page,setPage]=useState("home");const[openEvent,setOpenEvent]=useState(null);const[prevPage,setPrevPage]=useState(null);
  const cardScrollRef=useRef(0);
  const listIdxRef=useRef(0);const listSearchRef=useRef("");const listYearRef=useRef("all");const listModeRef=useRef("list");const listScrollRef=useRef(0);
  const handleOpenEvent=(ev)=>{setPrevPage(page);setOpenEvent(ev);window.history.pushState({event:ev.id},"");window.scrollTo(0,0)};
  const handleBack=useCallback(()=>{setOpenEvent(null);if(prevPage)setPage(prevPage)},[prevPage]);
  // Browser back button support
  useEffect(()=>{const onPop=()=>{if(openEvent){setOpenEvent(null);if(prevPage)setPage(prevPage)}};window.addEventListener("popstate",onPop);return()=>window.removeEventListener("popstate",onPop)},[openEvent,prevPage]);
  const handleRollEvent=useCallback(()=>{const other=EVENTS.filter(e=>e.id!==openEvent?.id);const ev=other[Math.floor(Math.random()*other.length)];if(ev){setOpenEvent(ev);window.scrollTo(0,0);window.history.pushState({event:ev.id},"")}},[openEvent]);
  if(openEvent) return (<><EventDetail ev={openEvent} onBack={handleBack}/><FloatingDice onRoll={handleRollEvent}/><AnalogOverlay/></>);
  return (<div style={{minHeight:"100vh",background:page==="portals"?"#000":"white",overflow:"hidden"}}>
    {page!=="home"&&<Menu page={page} setPage={setPage}/>}
    {page==="home"&&<Home setPage={setPage}/>}
    {page==="list"&&<ListPage events={EVENTS} onOpenEvent={handleOpenEvent} idxRef={listIdxRef} searchRef={listSearchRef} yearRef={listYearRef} modeRef={listModeRef} scrollRef={listScrollRef}/>}
    {page==="cardindex"&&<CardIndexPage events={EVENTS} onOpenEvent={handleOpenEvent} scrollRef={cardScrollRef}/>}
    {page==="riddles"&&<RiddlesPage events={EVENTS} onOpenEvent={handleOpenEvent}/>}
    {page==="portals"&&<PortalsPage/>}
    <AnalogOverlay/>
  </div>)}
