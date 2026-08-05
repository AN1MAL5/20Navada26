import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download, Upload, UserCircle, Eye, EyeOff,
  Barcode, ScanFace, Loader2, Camera, ImageIcon,
  ChevronDown, Settings, X, Maximize2, Move, Save,
  Bold, FileText, Check, RefreshCw
} from 'lucide-react';
import bwipjs from 'bwip-js';
import { jsPDF } from 'jspdf';
import { removeBackground } from '@imgly/background-removal';

const BASE = import.meta.env.BASE_URL; // '/AAMVANV/' on GH Pages, '/' locally

// ─── Helpers ──────────────────────────────────────────────────────────────────
const genDD  = () => { let d='000'; for(let i=0;i<18;i++) d+=Math.floor(Math.random()*10); return d; };
const genDL  = () => Array.from({length:10},()=>Math.floor(Math.random()*10)).join('');
const loadImageFile = (file, setter) => {
  const reader = new FileReader();
  reader.onload = ev => { const img=new Image(); img.onload=()=>setter(img); img.src=ev.target.result; };
  reader.readAsDataURL(file);
};

// ─── Color options ────────────────────────────────────────────────────────────
const COLOR_OPTIONS = [
  {value:'BLK',label:'BLK — Black'},{value:'BLU',label:'BLU — Blue'},
  {value:'BRO',label:'BRO — Brown'},{value:'DIC',label:'DIC — Dichromatic'},
  {value:'GRY',label:'GRY — Gray'},{value:'GRN',label:'GRN — Green'},
  {value:'HAZ',label:'HAZ — Hazel'},{value:'MAR',label:'MAR — Maroon'},
  {value:'PNK',label:'PNK — Pink'},{value:'UNK',label:'UNK — Unknown'},
];

// ─── Anchor map ───────────────────────────────────────────────────────────────
const ANCHOR_LABELS = {
  dlNo:'DL Number', dob:'DOB', lastName:'Last Name', firstName:'First Name',
  address1:'Address 1', address2:'Address 2', class:'Class', end:'Endorsements',
  rest:'Restrictions', iss:'Issue Date', exp:'Expiry Date', sex:'Sex',
  hgt:'Height', wgt:'Weight', eyes:'Eyes', hair:'Hair',
  bigDob:'DOB (Large)', dd:'DD Code',
};

const DEFAULT_MAPPING = {
  dlNo:      {x:47.7,y:25.3,size:24,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  dob:       {x:44.7,y:29.0,size:24,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  lastName:  {x:38.1,y:34.2,size:34,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  firstName: {x:38.1,y:39.4,size:34,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  address1:  {x:38.1,y:44.0,size:24,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  address2:  {x:38.1,y:47.8,size:24,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  class:     {x:47.4,y:55.6,size:21,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  end:       {x:65.4,y:55.6,size:21,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  rest:      {x:45.2,y:59.1,size:21,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  iss:       {x:36.7,y:69.1,size:22,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  exp:       {x:57.4,y:69.1,size:22,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  sex:       {x:45.5,y:73.9,size:21,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  hgt:       {x:45.5,y:77.6,size:21,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  wgt:       {x:45.5,y:81.5,size:21,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  eyes:      {x:45.5,y:85.2,size:21,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  hair:      {x:45.5,y:89.1,size:21,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
  bigDob:    {x:58.7,y:83.7,size:54,bold:true,fontFamily:'"Helvetica","Arial",sans-serif',color:'rgba(15,15,15,0.95)'},
  dd:        {x:43.2,y:93.8,size:23,bold:true,fontFamily:'"Arial Narrow",sans-serif',color:'#151515'},
};

const loadAnchorMap = () => {
  try { const s=localStorage.getItem('nvid_anchorMap'); if(s) return {...DEFAULT_MAPPING,...JSON.parse(s)}; } catch {}
  return {...DEFAULT_MAPPING};
};
const buildFont = a => `${a.bold?'700':'400'} ${a.size}px ${a.fontFamily}`;

// ─── Default info ─────────────────────────────────────────────────────────────
const DEFAULT_INFO = {
  dlNo:'1234567890', dob:'1990-01-01',
  lastName:'DOE', firstName:'JOHN', middleName:'', suffix:'',
  address1:'123 MAIN ST', city:'LAS VEGAS', state:'NV', zip:'89101',
  class:'C', end:'NONE', rest:'NONE', iss:'2025-01-01', exp:'',
  sex:'1', heightFeet:'5', heightInches:'10', wgt:'175',
  eyes:'BRO', hair:'BRO', dd:'0001234567890000000000', country:'USA', compliance:'F',
};

// ─── Theme ────────────────────────────────────────────────────────────────────
const T = {bg:'#12121e',card:'#1c1c2e',accent:'#5c5ef7',accentH:'#4a4ce0',label:'#ffffff',muted:'#8888aa',border:'#2a2a42'};

// ─── Small UI components ──────────────────────────────────────────────────────
const SectionCard = ({title,children,defaultOpen=true}) => {
  const [open,setOpen]=useState(defaultOpen);
  return (
    <div className="rounded-2xl overflow-hidden" style={{background:T.card}}>
      <button type="button" onClick={()=>setOpen(o=>!o)}
        className="w-full flex items-center justify-between px-4 py-4"
        style={{background:'transparent'}}>
        <h3 className="text-[13px] font-bold" style={{color:T.label}}>{title}</h3>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open?'rotate-180':''}`} style={{color:T.muted}}/>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};
const Field = ({label,name,value,onChange,type='text',className=''}) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-[13px] font-semibold" style={{color:T.label}}>{label}</label>
    <input type={type} name={name} value={value} onChange={onChange}
      autoComplete="off" autoCorrect="off" spellCheck={false}
      className="w-full rounded-lg px-4 py-3 text-[14px] font-medium text-white outline-none transition-all appearance-none"
      style={{background:'#252538',border:`1px solid ${T.border}`}}
      onFocus={e=>e.target.style.borderColor=T.accent}
      onBlur={e=>e.target.style.borderColor=T.border}/>
  </div>
);
const FieldWithBtn = ({label,name,value,onChange,btnLabel,onBtn}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[13px] font-semibold" style={{color:T.label}}>{label}</label>
    <div className="flex gap-2">
      <input type="text" name={name} value={value} onChange={onChange}
        autoComplete="off" autoCorrect="off" spellCheck={false}
        className="flex-1 rounded-lg px-4 py-3 text-[14px] font-medium text-white outline-none transition-all"
        style={{background:'#252538',border:`1px solid ${T.border}`}}
        onFocus={e=>e.target.style.borderColor=T.accent}
        onBlur={e=>e.target.style.borderColor=T.border}/>
      <button type="button" onClick={onBtn}
        className="text-white text-[13px] font-bold px-5 rounded-lg shrink-0 active:opacity-80"
        style={{background:T.accent}}>{btnLabel}</button>
    </div>
  </div>
);
const UploadBtn = ({label,onChange,icon:Icon}) => (
  <div className="relative flex items-center justify-center gap-2 rounded-lg p-4 active:opacity-70"
    style={{background:'#252538',border:`1px solid ${T.border}`}}>
    <input type="file" onChange={onChange} accept="image/*"
      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"/>
    {Icon && <Icon className="w-4 h-4" style={{color:T.muted}}/>}
    <span className="text-[12px] font-semibold" style={{color:T.muted}}>{label}</span>
  </div>
);
const Section = ({title,children}) => (
  <div><p className="text-[13px] font-bold mb-3" style={{color:T.label}}>{title}</p>{children}</div>
);
const ColorSelect = ({label,name,value,onChange}) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[13px] font-semibold" style={{color:T.label}}>{label}</label>
    <select name={name} value={value} onChange={onChange}
      className="w-full rounded-lg px-3 py-3 text-[14px] font-medium text-white outline-none appearance-none"
      style={{background:'#252538',border:`1px solid ${T.border}`}}>
      {COLOR_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

// ─── Signature Pad ────────────────────────────────────────────────────────────
const SignaturePad = ({onSave}) => {
  const padRef=useRef(null); const drawing=useRef(false); const lastPos=useRef(null);
  const [hasStrokes,setHasStrokes]=useState(false);
  useEffect(()=>{const c=padRef.current;if(!c)return;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);},[]);
  const getPos=(e,c)=>{const r=c.getBoundingClientRect(),s=e.touches?e.touches[0]:e;return{x:(s.clientX-r.left)*(c.width/r.width),y:(s.clientY-r.top)*(c.height/r.height)};};
  const startDraw=e=>{e.preventDefault();drawing.current=true;lastPos.current=getPos(e,padRef.current);};
  const draw=e=>{e.preventDefault();if(!drawing.current)return;const c=padRef.current,ctx=c.getContext('2d'),pos=getPos(e,c);ctx.beginPath();ctx.moveTo(lastPos.current.x,lastPos.current.y);ctx.lineTo(pos.x,pos.y);ctx.strokeStyle='#111';ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();lastPos.current=pos;setHasStrokes(true);};
  const stopDraw=()=>{drawing.current=false;};
  const clear=()=>{const c=padRef.current,ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);setHasStrokes(false);};
  const save=()=>{const img=new Image();img.onload=()=>onSave(img);img.src=padRef.current.toDataURL('image/png');};
  return(
    <div className="flex flex-col gap-2">
      <canvas ref={padRef} width={600} height={180} className="w-full rounded-xl touch-none cursor-crosshair"
        style={{background:'#fff',border:`1px solid ${T.border}`}}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}/>
      <div className="flex gap-2">
        <button type="button" onClick={clear} className="flex-1 py-2 rounded-lg text-[12px] font-bold"
          style={{background:'#252538',color:T.muted,border:`1px solid ${T.border}`}}>Clear</button>
        <button type="button" onClick={save} disabled={!hasStrokes}
          className="flex-1 py-2 rounded-lg text-[12px] font-bold text-white disabled:opacity-40"
          style={{background:T.accent}}>Use Signature</button>
      </div>
    </div>
  );
};

// ─── Camera Capture ───────────────────────────────────────────────────────────
const CameraCapture = ({onCapture,onClose}) => {
  const videoRef=useRef(null); const streamRef=useRef(null);
  const [ready,setReady]=useState(false); const [error,setError]=useState(null);
  useEffect(()=>{
    let active=true,ft=null;
    const markReady=()=>{if(active)setReady(true);};
    const start=async()=>{
      try{
        let stream;
        try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'}},audio:false});}
        catch{stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});}
        if(!active){stream.getTracks().forEach(t=>t.stop());return;}
        streamRef.current=stream;
        const vid=videoRef.current;if(!vid)return;
        vid.srcObject=stream;
        ['loadedmetadata','loadeddata','canplay','playing'].forEach(e=>vid.addEventListener(e,markReady,{once:true}));
        try{await vid.play();}catch(_){}
        ft=setTimeout(markReady,3000);
      }catch{if(active)setError('Camera access denied or unavailable.');}
    };
    start();
    return()=>{active=false;clearTimeout(ft);if(streamRef.current)streamRef.current.getTracks().forEach(t=>t.stop());};
  },[]);
  const capture=useCallback(()=>{
    if(!videoRef.current)return;
    const v=videoRef.current,c=document.createElement('canvas');
    c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);
    c.toBlob(blob=>{if(blob){onCapture(blob);onClose();}},'image/png');
  },[onCapture,onClose]);
  return(
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <button onClick={onClose} className="absolute top-4 left-4 bg-amber-500 text-black font-black text-sm px-4 py-2.5 rounded-xl z-10">← BACK</button>
      <div className="relative" style={{width:'min(92vw,380px)',aspectRatio:'3/4'}}>
        <div className="absolute inset-0 border-4 border-blue-500 z-10 pointer-events-none rounded-lg"/>
        <video ref={videoRef} className="w-full h-full object-cover bg-white rounded-lg" autoPlay playsInline muted/>
        {!ready&&!error&&<div className="absolute inset-0 bg-white rounded-lg flex items-center justify-center z-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin"/></div>}
        {error&&<div className="absolute inset-0 bg-white rounded-lg flex items-center justify-center z-20 p-6 text-center"><div className="text-red-500 font-bold text-sm">{error}</div></div>}
      </div>
      <button onClick={capture} disabled={!ready}
        className="mt-8 bg-amber-500 text-black font-black text-lg px-16 py-4 rounded-2xl shadow-lg disabled:opacity-40 uppercase tracking-widest">CAPTURE</button>
    </div>
  );
};

// ─── Photo Panel ──────────────────────────────────────────────────────────────
const PhotoPanel = ({backgroundImage,backBackgroundImage,referenceImage,showRef,setShowRef,setBackgroundImage,setBackBackgroundImage,setReferenceImage}) => (
  <div className="space-y-4 pb-4">
    <SectionCard title="Templates" defaultOpen={false}>
      <div className="grid grid-cols-2 gap-3">
        {[['Front',backgroundImage,setBackgroundImage],['Back',backBackgroundImage,setBackBackgroundImage]].map(([lbl,img,setter])=>(
          <div key={lbl} className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold" style={{color:T.muted}}>{lbl}</p>
            {img&&<img src={img.src} className="w-full aspect-[1000/630] object-cover rounded-xl opacity-80" alt={lbl}/>}
            <UploadBtn label="Replace" onChange={e=>e.target.files[0]&&loadImageFile(e.target.files[0],setter)} icon={Upload}/>
          </div>
        ))}
      </div>
    </SectionCard>
    <SectionCard title="Reference / Alignment" defaultOpen={false}>
      <UploadBtn label="Upload Reference" onChange={e=>e.target.files[0]&&loadImageFile(e.target.files[0],setReferenceImage)} icon={Upload}/>
      {referenceImage&&(
        <button onClick={()=>setShowRef(v=>!v)} className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
          style={{background:showRef?'#f59e0b':'#252538',color:showRef?'#000':T.muted,border:`1px solid ${T.border}`}}>
          {showRef?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
          {showRef?'Hide Overlay':'Show Overlay'}
        </button>
      )}
    </SectionCard>
  </div>
);

// ─── ANCHOR EDITOR PANEL ──────────────────────────────────────────────────────
const AnchorEditorPanel = ({anchorMap,setAnchorMap,onSave,onClose,onReset,renderCard}) => {
  const editorCanvasRef = useRef(null);
  const overlayRef      = useRef(null);
  const draggingRef     = useRef(null);
  const [selectedKey,   setSelectedKey]   = useState(null);
  const [checkedKeys,   setCheckedKeys]   = useState([]);  // ordered list for match

  // Redraw editor canvas whenever anchorMap changes
  useEffect(()=>{
    if(editorCanvasRef.current) renderCard(editorCanvasRef.current, anchorMap);
  },[anchorMap, renderCard]);

  // ── Drag on overlay ──
  const getRelPos = e => {
    const el=overlayRef.current; if(!el) return null;
    const rect=el.getBoundingClientRect();
    const src=e.touches?e.touches[0]:e;
    return { x:((src.clientX-rect.left)/rect.width)*100, y:((src.clientY-rect.top)/rect.height)*100 };
  };
  const onDotDown=(e,key)=>{
    e.preventDefault(); e.stopPropagation();
    setSelectedKey(key);
    const pos=getRelPos(e); if(!pos) return;
    draggingRef.current={key,sx:pos.x,sy:pos.y,ox:anchorMap[key].x,oy:anchorMap[key].y};
  };
  const onOverlayMove=e=>{
    if(!draggingRef.current) return; e.preventDefault();
    const pos=getRelPos(e); if(!pos) return;
    const{key,sx,sy,ox,oy}=draggingRef.current;
    setAnchorMap(prev=>({...prev,[key]:{...prev[key],x:Math.max(0,Math.min(100,ox+(pos.x-sx))),y:Math.max(0,Math.min(100,oy+(pos.y-sy)))}}));
  };
  const onOverlayUp=()=>{ draggingRef.current=null; };

  // ── Inline row edits ──
  const updateKey=(key,prop,val)=>setAnchorMap(prev=>({...prev,[key]:{...prev[key],[prop]:val}}));

  // ── Match: copy size+bold from first checked to rest ──
  const handleMatch=()=>{
    if(checkedKeys.length<2) return;
    const ref=anchorMap[checkedKeys[0]];
    setAnchorMap(prev=>{
      const next={...prev};
      checkedKeys.slice(1).forEach(k=>{ next[k]={...next[k],size:ref.size,bold:ref.bold}; });
      return next;
    });
  };

  const toggleCheck=key=>{
    setCheckedKeys(prev=>prev.includes(key)?prev.filter(k=>k!==key):[...prev,key]);
  };

  const selA = selectedKey ? anchorMap[selectedKey] : null;
  const KEYS = Object.keys(DEFAULT_MAPPING);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{background:T.bg}}>
      {/* ── Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 gap-3"
        style={{borderBottom:`2px solid ${T.border}`,background:'#0e0e1c'}}>
        <div className="flex items-center gap-3">
          <Move className="w-5 h-5" style={{color:T.accent}}/>
          <span className="text-[15px] font-black" style={{color:T.label}}>Anchor Editor</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {checkedKeys.length>=2&&(
            <button onClick={handleMatch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white"
              style={{background:'#7c3aed'}}>
              <Check className="w-3.5 h-3.5"/> Match Size+Style
            </button>
          )}
          <button onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold"
            style={{background:'#252538',color:T.muted,border:`1px solid ${T.border}`}}>
            <RefreshCw className="w-3.5 h-3.5"/> Reset
          </button>
          <button onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-bold text-white"
            style={{background:'#059669'}}>
            <Save className="w-4 h-4"/> Save Anchors
          </button>
          <button onClick={onClose}
            className="p-2 rounded-lg" style={{background:'#252538'}}>
            <X className="w-4 h-4" style={{color:T.muted}}/>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

        {/* Canvas area */}
        <div className="flex flex-col items-center justify-start p-4 lg:flex-1 overflow-auto"
          style={{background:'#0a0a18'}}>
          <p className="text-[11px] font-bold mb-2 self-start" style={{color:T.muted}}>
            DRAG DOTS TO REPOSITION · CLICK A DOT TO SELECT
          </p>
          <div className="relative rounded-xl overflow-hidden shadow-2xl"
            style={{width:'100%',maxWidth:900,aspectRatio:'1000/630',border:`1px solid ${T.border}`}}>
            <canvas ref={editorCanvasRef} width={1000} height={630}
              className="absolute inset-0 w-full h-full"/>
            {/* Overlay for drag */}
            <div ref={overlayRef} className="absolute inset-0 touch-none"
              onMouseMove={onOverlayMove} onMouseUp={onOverlayUp} onMouseLeave={onOverlayUp}
              onTouchMove={e=>{e.preventDefault();onOverlayMove(e);}} onTouchEnd={onOverlayUp}>
              {/* Alignment line */}
              {selectedKey&&anchorMap[selectedKey]&&(
                <div style={{position:'absolute',pointerEvents:'none',left:0,top:`${anchorMap[selectedKey].y}%`,width:`${anchorMap[selectedKey].x}%`,height:'1px',background:'rgba(140,140,255,0.3)'}}/>
              )}
              {KEYS.map(key=>{
                const a=anchorMap[key];
                const isSel=key===selectedKey;
                const isChk=checkedKeys.includes(key);
                return (
                  <div key={key} style={{position:'absolute',left:`${a.x}%`,top:`${a.y}%`,zIndex:isSel?20:10}}
                    onMouseDown={e=>onDotDown(e,key)}
                    onTouchStart={e=>{e.preventDefault();onDotDown(e,key);}}>
                    {/* Dot */}
                    <div style={{width:12,height:12,borderRadius:'50%',
                      background:isSel?'#5c5ef7':isChk?'#22c55e':'rgba(255,210,50,0.9)',
                      border:`2px solid ${isSel?'#fff':isChk?'#16a34a':'rgba(0,0,0,0.4)'}`,
                      boxShadow:'0 1px 5px rgba(0,0,0,0.6)',cursor:'grab'}}/>
                    {/* Tiny label above dot */}
                    <div style={{position:'absolute',bottom:'100%',left:0,
                      background:'rgba(0,0,0,0.72)',color:isSel?'#a0a0ff':isChk?'#86efac':'#ccc',
                      fontSize:8,padding:'1px 3px',borderRadius:3,whiteSpace:'nowrap',pointerEvents:'none',
                      fontWeight:isSel||isChk?700:400}}>
                      {ANCHOR_LABELS[key]||key}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Quick position readout for selected */}
          {selA&&selectedKey&&(
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              <span className="text-[12px] font-black" style={{color:T.accent}}>{ANCHOR_LABELS[selectedKey]||selectedKey}</span>
              {[['X %','x',0,100],['Y %','y',0,100],['Size px','size',6,120]].map(([lbl,prop,mn,mx])=>(
                <label key={prop} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold" style={{color:T.muted}}>{lbl}</span>
                  <input type="number" min={mn} max={mx} step={prop==='size'?1:0.1}
                    value={prop==='x'||prop==='y'?selA[prop].toFixed(1):selA[prop]}
                    onChange={e=>updateKey(selectedKey,prop,parseFloat(e.target.value)||selA[prop])}
                    className="w-20 rounded-lg px-2 py-1.5 text-[13px] text-white font-medium outline-none"
                    style={{background:'#252538',border:`1px solid ${T.border}`}}/>
                </label>
              ))}
              <button onClick={()=>updateKey(selectedKey,'bold',!selA.bold)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-black"
                style={{background:selA.bold?T.accent:'#252538',color:'white',border:`1px solid ${selA.bold?T.accent:T.border}`}}>
                <Bold className="w-3 h-3"/> B
              </button>
            </div>
          )}
        </div>

        {/* ── Anchor list ── */}
        <div className="shrink-0 lg:w-[380px] flex flex-col"
          style={{borderTop:`1px solid ${T.border}`,borderLeft:'none'}}>
          <div className="px-4 py-2 shrink-0 flex items-center justify-between"
            style={{borderBottom:`1px solid ${T.border}`,background:'#111120'}}>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{color:T.muted}}>
              All Anchors
            </span>
            {checkedKeys.length>0&&(
              <span className="text-[10px]" style={{color:T.muted}}>
                {checkedKeys.length} selected {checkedKeys.length>=2?'— click Match Size+Style':''}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{borderBottom:`1px solid ${T.border}`,background:'#151525'}}>
                  <th className="px-2 py-2 text-left font-semibold" style={{color:T.muted}}>☐</th>
                  <th className="px-2 py-2 text-left font-semibold" style={{color:T.muted}}>Field</th>
                  <th className="px-2 py-2 text-center font-semibold" style={{color:T.muted}}>X%</th>
                  <th className="px-2 py-2 text-center font-semibold" style={{color:T.muted}}>Y%</th>
                  <th className="px-2 py-2 text-center font-semibold" style={{color:T.muted}}>Sz</th>
                  <th className="px-2 py-2 text-center font-semibold" style={{color:T.muted}}>B</th>
                </tr>
              </thead>
              <tbody>
                {KEYS.map(key=>{
                  const a=anchorMap[key];
                  const isSel=key===selectedKey;
                  const isChk=checkedKeys.includes(key);
                  return (
                    <tr key={key}
                      onClick={()=>setSelectedKey(key===selectedKey?null:key)}
                      style={{
                        background:isSel?'rgba(92,94,247,0.18)':isChk?'rgba(34,197,94,0.08)':'transparent',
                        borderBottom:`1px solid ${T.border}`,cursor:'pointer',
                      }}>
                      {/* Match checkbox */}
                      <td className="px-2 py-1.5" onClick={e=>{e.stopPropagation();toggleCheck(key);}}>
                        <div style={{width:14,height:14,borderRadius:3,border:`2px solid ${isChk?'#22c55e':T.border}`,
                          background:isChk?'#22c55e':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          {isChk&&<Check className="w-2.5 h-2.5 text-white"/>}
                        </div>
                      </td>
                      {/* Label */}
                      <td className="px-2 py-1.5">
                        <span style={{color:isSel?T.accent:T.label,fontWeight:isSel?700:400}}>
                          {ANCHOR_LABELS[key]||key}
                        </span>
                      </td>
                      {/* X */}
                      <td className="px-1 py-1" onClick={e=>e.stopPropagation()}>
                        <input type="number" min={0} max={100} step={0.1}
                          value={a.x.toFixed(1)}
                          onChange={e=>updateKey(key,'x',parseFloat(e.target.value)||a.x)}
                          className="w-16 rounded px-1.5 py-1 text-[11px] text-white text-center outline-none"
                          style={{background:'#1a1a2e',border:`1px solid ${T.border}`}}/>
                      </td>
                      {/* Y */}
                      <td className="px-1 py-1" onClick={e=>e.stopPropagation()}>
                        <input type="number" min={0} max={100} step={0.1}
                          value={a.y.toFixed(1)}
                          onChange={e=>updateKey(key,'y',parseFloat(e.target.value)||a.y)}
                          className="w-16 rounded px-1.5 py-1 text-[11px] text-white text-center outline-none"
                          style={{background:'#1a1a2e',border:`1px solid ${T.border}`}}/>
                      </td>
                      {/* Size */}
                      <td className="px-1 py-1" onClick={e=>e.stopPropagation()}>
                        <input type="number" min={6} max={120} step={1}
                          value={a.size}
                          onChange={e=>updateKey(key,'size',parseFloat(e.target.value)||a.size)}
                          className="w-14 rounded px-1.5 py-1 text-[11px] text-white text-center outline-none"
                          style={{background:'#1a1a2e',border:`1px solid ${T.border}`}}/>
                      </td>
                      {/* Bold */}
                      <td className="px-1 py-1 text-center" onClick={e=>{e.stopPropagation();updateKey(key,'bold',!a.bold);}}>
                        <div style={{width:26,height:22,borderRadius:4,display:'inline-flex',alignItems:'center',justifyContent:'center',
                          background:a.bold?T.accent:'#252538',border:`1px solid ${a.bold?T.accent:T.border}`,
                          fontSize:11,fontWeight:900,color:'white',cursor:'pointer',userSelect:'none'}}>
                          B
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Info Panel ───────────────────────────────────────────────────────────────
const InfoPanel = ({initialInfo,onInfoChange,photo,signature,isProcessingPhoto,setShowCamera,setPhoto,setSignature,handleAdvancedPhotoUpload}) => {
  const [f,setF]=useState(()=>({...initialInfo}));
  const debRef=useRef(null);
  const commit=useCallback(next=>{clearTimeout(debRef.current);debRef.current=setTimeout(()=>onInfoChange(next),250);},[onInfoChange]);
  const handleChange=useCallback(e=>{const{name,value}=e.target;setF(prev=>{const next={...prev,[name]:value.toUpperCase()};commit(next);return next;});},[commit]);
  const handleSelect=useCallback((name,value)=>{setF(prev=>{const next={...prev,[name]:value};commit(next);return next;});},[commit]);
  const setField=useCallback((name,value)=>{setF(prev=>{const next={...prev,[name]:value};commit(next);return next;});},[commit]);
  const IS={background:'#252538',border:`1px solid ${T.border}`};
  return (
    <div className="pb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left */}
        <div className="space-y-5">
          <Section title="ID Number &amp; DOB">
            <FieldWithBtn label="DL Number" name="dlNo" value={f.dlNo} onChange={handleChange} btnLabel="GEN" onBtn={()=>setField('dlNo',genDL())}/>
            <div className="mt-3"><Field label="Date of Birth" name="dob" value={f.dob} onChange={handleChange} type="date"/></div>
          </Section>
          <Section title="Name">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" name="firstName" value={f.firstName} onChange={handleChange}/>
              <Field label="Last Name"  name="lastName"  value={f.lastName}  onChange={handleChange}/>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Middle Name" name="middleName" value={f.middleName} onChange={handleChange}/>
              <Field label="Suffix"      name="suffix"     value={f.suffix}     onChange={handleChange}/>
            </div>
          </Section>
          <Section title="Photo">
            {photo&&<div className="w-24 h-32 mx-auto rounded-xl overflow-hidden mb-3" style={{border:`2px solid ${T.accent}`}}><img src={photo.src} className="w-full h-full object-cover" alt="id"/></div>}
            <UploadBtn label="Upload Photo" onChange={e=>e.target.files[0]&&loadImageFile(e.target.files[0],setPhoto)} icon={ImageIcon}/>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1 flex items-center justify-center gap-2 rounded-lg p-3 active:opacity-70" style={IS}>
                <input type="file" accept="image/*" onChange={handleAdvancedPhotoUpload} disabled={isProcessingPhoto} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"/>
                {isProcessingPhoto?<><Loader2 className="w-4 h-4 animate-spin" style={{color:T.accent}}/><span className="text-[11px] font-semibold" style={{color:T.accent}}>Processing…</span></>
                  :<><ScanFace className="w-4 h-4" style={{color:T.accent}}/><span className="text-[11px] font-semibold" style={{color:T.accent}}>AI Remove BG</span></>}
              </div>
              <button onClick={()=>setShowCamera(true)} disabled={isProcessingPhoto} className="flex items-center justify-center gap-2 rounded-lg px-4 disabled:opacity-40" style={IS}>
                {isProcessingPhoto?<Loader2 className="w-5 h-5 animate-spin" style={{color:T.accent}}/>:<Camera className="w-5 h-5" style={{color:T.accent}}/>}
              </button>
            </div>
          </Section>
        </div>
        {/* Middle */}
        <div className="space-y-5">
          <Section title="Address">
            <Field label="Street" name="address1" value={f.address1} onChange={handleChange}/>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Field label="City" name="city" value={f.city} onChange={handleChange} className="col-span-2"/>
              <Field label="State" name="state" value={f.state} onChange={handleChange}/>
            </div>
            <div className="mt-3"><Field label="Zip" name="zip" value={f.zip} onChange={handleChange}/></div>
          </Section>
          <Section title="Signature">
            {signature&&<div className="w-full h-16 rounded-xl overflow-hidden mb-3 flex items-center justify-center" style={{background:'#1a1a2e',border:`1px solid ${T.border}`}}><img src={signature.src} className="max-h-full object-contain" alt="sig"/></div>}
            <SignaturePad onSave={setSignature}/>
            <div className="mt-2">
              <label className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[12px] font-bold cursor-pointer" style={{background:'#252538',color:T.muted,border:`1px solid ${T.border}`}}>
                <Upload className="w-3.5 h-3.5"/> Upload Signature Image
                <input type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const url=URL.createObjectURL(f);const img=new Image();img.onload=()=>{setSignature(img);URL.revokeObjectURL(url);};img.src=url;e.target.value='';}}/>
              </label>
            </div>
          </Section>
          <Section title="Audit">
            <FieldWithBtn label="DD Code" name="dd" value={f.dd} onChange={handleChange} btnLabel="GEN" onBtn={()=>setField('dd',genDD())}/>
            <div className="mt-3"><Field label="Compliance" name="compliance" value={f.compliance} onChange={handleChange}/></div>
          </Section>
        </div>
        {/* Right */}
        <div className="space-y-5">
          <Section title="License Details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Class" name="class" value={f.class} onChange={handleChange}/>
              <Field label="Rest"  name="rest"  value={f.rest}  onChange={handleChange}/>
            </div>
            <div className="mt-3"><Field label="Issue Date" name="iss" value={f.iss} onChange={handleChange} type="date"/></div>
            <div className="mt-3 flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold flex flex-wrap items-baseline gap-2" style={{color:T.label}}>
                Expiry Date
                <span className="text-[10px] font-normal" style={{color:T.muted}}>e.g. DOB month/day · ISS year +8</span>
              </label>
              <input type="date" name="exp" value={f.exp} onChange={handleChange} autoComplete="off"
                className="w-full rounded-lg px-4 py-3 text-[14px] font-medium text-white outline-none appearance-none"
                style={IS} onFocus={e=>e.target.style.borderColor=T.accent} onBlur={e=>e.target.style.borderColor=T.border}/>
            </div>
          </Section>
          <Section title="Physical">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold" style={{color:T.label}}>Sex</label>
                <select name="sex" value={f.sex} onChange={handleChange} className="w-full rounded-lg px-3 py-3 text-[14px] font-medium text-white outline-none appearance-none" style={IS}>
                  <option value="1">M — Male</option><option value="2">F — Female</option><option value="9">X — Non-binary</option>
                </select>
              </div>
              <Field label="Weight (lbs)" name="wgt" value={f.wgt} onChange={handleChange}/>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Height Ft" name="heightFeet"   value={f.heightFeet}   onChange={handleChange}/>
              <Field label="Height In" name="heightInches" value={f.heightInches} onChange={handleChange}/>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <ColorSelect label="Eyes" name="eyes" value={f.eyes} onChange={e=>handleSelect('eyes',e.target.value)}/>
              <ColorSelect label="Hair" name="hair" value={f.hair} onChange={e=>handleSelect('hair',e.target.value)}/>
            </div>
            <div className="mt-3"><Field label="Country" name="country" value={f.country} onChange={handleChange}/></div>
          </Section>
        </div>
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────
const App = () => {
  const canvasRef        = useRef(null);
  const backCanvasRef    = useRef(null);
  const barcodeCanvasRef = useRef(null);
  const renderCardRef    = useRef(null); // always-current draw fn for editor panel

  const [backgroundImage,     setBackgroundImage]     = useState(null);
  const [backBackgroundImage, setBackBackgroundImage] = useState(null);
  const [photo,       setPhoto]       = useState(null);
  const [signature,   setSignature]   = useState(null);
  const [referenceImage, setReferenceImage] = useState(null);
  const [showRef,     setShowRef]     = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [expandedImg,  setExpandedImg]  = useState(null);
  const [expandedSide, setExpandedSide] = useState(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [showCamera,   setShowCamera]   = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAnchorEditor, setShowAnchorEditor] = useState(false);

  const [anchorMap, setAnchorMap] = useState(loadAnchorMap);
  const [info, setInfo] = useState({...DEFAULT_INFO});
  const infoRef = useRef(info);
  const handleInfoChange = useCallback(next=>{infoRef.current=next;setInfo(next);},[]);

  const fmt = d=>{if(!d)return'';const[y,m,dd]=d.split('-');return`${m}/${dd}/${y}`;};

  const getDisplayInfo = useCallback(data=>{
    const parts=[data.firstName,data.middleName].filter(Boolean);
    const fullFirst=data.suffix?`${parts.join(' ')}, ${data.suffix}`:parts.join(' ');
    const autoExp=(()=>{const d=data.dob,iss=data.iss;if(!d||!iss)return'';const[,m,dd]=d.split('-');const y=parseInt(iss.split('-')[0],10);return`${m}/${dd}/${y+8}`;})();
    return{
      ...data, dob:fmt(data.dob), iss:fmt(data.iss),
      exp:data.exp?fmt(data.exp):autoExp,
      address2:`${data.city}, ${data.state} ${data.zip}`.toUpperCase(),
      hgt:`${data.heightFeet}'-${String(data.heightInches).padStart(2,'0')}"`,
      sex:data.sex==='1'?'M':data.sex==='2'?'F':'X',
      wgt:`${data.wgt} lbs`, firstName:fullFirst,
    };
  },[]);

  const drawImageFit=(ctx,img,x,y,w,h,fit='cover')=>{
    const ir=img.width/img.height,br=w/h;
    if(fit==='cover'){let sx,sy,sw,sh;if(ir>br){sw=img.height*br;sh=img.height;sx=(img.width-sw)/2;sy=0;}else{sw=img.width;sh=img.width/br;sx=0;sy=(img.height-sh)/2;}ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
    else{if(ir>br){const s=w/img.width,nh=img.height*s;ctx.drawImage(img,x,y+(h-nh)/2,w,nh);}else{const s=h/img.height,nw=img.width*s;ctx.drawImage(img,x+(w-nw)/2,y,nw,h);}}
  };

  // The renderCardRef is updated every render — always current, no stale closure
  renderCardRef.current = (targetCanvas, am) => {
    if(!targetCanvas) return;
    const ctx=targetCanvas.getContext('2d');
    const di=getDisplayInfo(info);
    ctx.clearRect(0,0,targetCanvas.width,targetCanvas.height);
    if(backgroundImage) ctx.drawImage(backgroundImage,0,0,targetCanvas.width,targetCanvas.height);
    else{ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,targetCanvas.width,targetCanvas.height);}
    if(photo){
      drawImageFit(ctx,photo,targetCanvas.width*0.075,targetCanvas.height*0.202,targetCanvas.width*0.265,targetCanvas.height*0.565,'contain');
      ctx.save();ctx.globalAlpha=0.38;ctx.filter='grayscale(100%) brightness(1.25) contrast(0.85)';
      drawImageFit(ctx,photo,targetCanvas.width*0.835,targetCanvas.height*0.635,targetCanvas.width*0.115,targetCanvas.height*0.215,'contain');
      ctx.restore();
    }
    if(signature) ctx.drawImage(signature,targetCanvas.width*0.075,targetCanvas.height*0.816,targetCanvas.width*0.265,targetCanvas.height*0.094);
    ctx.textAlign='left';
    Object.keys(am).forEach(key=>{
      const a=am[key];
      ctx.font=buildFont(a);ctx.fillStyle=a.color||'#151515';
      let text=di[key];
      if(key==='bigDob'){const p=di.dob.split('/');text=p.length===3&&p[2].length===4?`${p[0]}/${p[1]}/${p[2].substring(2)}`:di.dob;}
      if(text) ctx.fillText(text,(a.x/100)*targetCanvas.width,(a.y/100)*targetCanvas.height);
    });
  };

  const drawCanvas  = useCallback(()=>renderCardRef.current(canvasRef.current, anchorMap),[anchorMap]);
  const drawBack    = useCallback(data=>{
    const canvas=backCanvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const di=getDisplayInfo(data);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(backBackgroundImage)ctx.drawImage(backBackgroundImage,0,0,canvas.width,canvas.height);
    else{ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,canvas.width,canvas.height);}
    if(barcodeCanvasRef.current?.width>0)
      ctx.drawImage(barcodeCanvasRef.current,canvas.width*0.43,canvas.height*0.125,canvas.width*0.53,canvas.height*0.275);
    const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1).toLowerCase():'';
    ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#000';
    ctx.font='700 20px Arial,Helvetica,sans-serif';
    ctx.fillText(di.dob,canvas.width*0.103,canvas.height*0.112);
    ctx.fillText(di.iss,canvas.width*0.103,canvas.height*0.153);
    ctx.font='700 21px Arial,Helvetica,sans-serif';
    ctx.fillText(cap(di.end), canvas.width*0.486,canvas.height*0.688);
    ctx.fillText(cap(di.rest),canvas.width*0.461,canvas.height*0.807);
  },[backBackgroundImage,getDisplayInfo]);

  const generateBarcode = useCallback(data=>{
    if(!barcodeCanvasRef.current)return;
    const fmtA=s=>{if(!s)return'';const[y,m,d]=s.split('-');return`${m}${d}${y}`;};
    const fmtH=(ft,i)=>`${((parseInt(ft)||0)*12+(parseInt(i)||0)).toString().padStart(3,'0')} in`;
    const fmtZ=z=>{let c=z.replace(/\D/g,'');return(c.length<9?c.padEnd(9,'0'):c).slice(0,9);};
    const autoExpCode=(()=>{const d=data.dob,iss=data.iss;if(!d||!iss)return'';const[,m,dd]=d.split('-');const y=parseInt(iss.split('-')[0],10);return`${y+8}${m}${dd}`;})();
    const expCode=data.exp?fmtA(data.exp):autoExpCode;
    const p={
      firstName:data.firstName.trim().toUpperCase(),middleName:data.middleName.trim().toUpperCase(),
      lastName:data.lastName.trim().toUpperCase(),suffix:data.suffix,dob:fmtA(data.dob),
      sex:data.sex,height:fmtH(data.heightFeet,data.heightInches),eyeColor:data.eyes,
      weight:data.wgt,address1:data.address1.trim().toUpperCase(),city:data.city.trim().toUpperCase(),
      state:data.state,zip:fmtZ(data.zip),country:data.country,
      dlNumber:data.dlNo.trim().toUpperCase(),issueDate:fmtA(data.iss),
      expDate:expCode,vehClass:data.class,restrictions:data.rest.trim().toUpperCase(),
      endorsements:data.end.trim().toUpperCase(),compliance:data.compliance,
      docDiscriminator:data.dd.trim(),
    };
    let payload='DL';
    const mand=['DCA','DCB','DCD','DBA','DCS','DAC','DAD','DBD','DBB','DBC','DAY','DAU','DAG','DAI','DAJ','DAK','DAQ','DCF','DCG','DDE','DDF','DDG'];
    const add=(id,val)=>{let v=val;if(!v){if(mand.includes(id))v='NONE';else return;}payload+=`${id}${v}\n`;};
    add('DAQ',p.dlNumber);add('DCS',p.lastName);add('DDE','N');
    add('DAC',p.firstName);add('DDF','N');add('DAD',p.middleName);
    add('DDG','N');add('DCU',p.suffix);add('DCA',p.vehClass);
    add('DCB',p.restrictions);add('DCD',p.endorsements);add('DBD',p.issueDate);
    add('DBB',p.dob);add('DBA',p.expDate);add('DBC',p.sex);
    add('DAU',p.height);add('DAY',p.eyeColor);add('DAG',p.address1);
    add('DAI',p.city);add('DAJ',p.state);add('DAK',p.zip);
    add('DCF',p.docDiscriminator);add('DCG',p.country);
    if(p.weight)add('DAW',p.weight.padStart(3,'0'));
    add('DDA',p.compliance);add('DDB',p.issueDate);
    payload=payload.slice(0,-1)+'\r';
    const header=`@\n\x1E\rANSI 636026110001DL0031${payload.length.toString().padStart(4,'0')}`;
    try{bwipjs.toCanvas(barcodeCanvasRef.current,{bcid:'pdf417',text:header+payload,columns:9,scale:3,eclevel:5,includetext:false});}
    catch(e){console.error(e);}
  },[]);

  useEffect(()=>{
    const front=new Image();front.onload=()=>setBackgroundImage(front);front.src=`${BASE}FrontTemplate.jpg`;
    const back=new Image();back.onload=()=>setBackBackgroundImage(back);back.src=`${BASE}BackTemplate.png`;
  },[]);

  useEffect(()=>{
    renderCardRef.current(canvasRef.current, anchorMap);
    generateBarcode(info);
    drawBack(info);
  },[info,backgroundImage,backBackgroundImage,photo,signature,referenceImage,showRef,anchorMap,generateBarcode,drawBack]);

  // ── PDF Export (CR80 card centered on US Letter) ──
  const exportPDF = () => {
    const pdf=new jsPDF({orientation:'portrait',unit:'in',format:'letter'});
    const pW=8.5,pH=11;
    const cW=3.375,cH=2.125; // CR80 standard ID card
    const cX=(pW-cW)/2;
    // Front: vertically centered in top half
    const frontY=(pH/2-cH)/2;
    pdf.addImage(canvasRef.current.toDataURL('image/jpeg',0.95),'JPEG',cX,frontY,cW,cH);
    // Back: vertically centered in bottom half
    const backY=pH/2+(pH/2-cH)/2;
    pdf.addImage(backCanvasRef.current.toDataURL('image/jpeg',0.95),'JPEG',cX,backY,cW,cH);
    // Light guide lines (dashed cut lines)
    pdf.setDrawColor(180,180,180);pdf.setLineDash([0.05,0.1]);pdf.setLineWidth(0.01);
    [[cX,frontY,cW,cH],[cX,backY,cW,cH]].forEach(([x,y,w,h])=>{
      pdf.rect(x,y,w,h);
    });
    pdf.save('NV_ID_PRINT_READY.pdf');
  };

  const handleAdvancedPhotoUpload=useCallback(async e=>{
    const file=e.target.files[0];if(!file)return;setIsProcessingPhoto(true);
    try{const blob=await removeBackground(file,{model:'medium',output:{type:'image/png',quality:0.8}});loadImageFile(blob,img=>{setPhoto(img);setIsProcessingPhoto(false);});}
    catch{setIsProcessingPhoto(false);loadImageFile(file,setPhoto);}
  },[]);
  const handleCameraCapture=useCallback(async blob=>{
    setIsProcessingPhoto(true);
    try{const p=await removeBackground(blob,{model:'medium',output:{type:'image/png',quality:0.8}});loadImageFile(p,img=>{setPhoto(img);setIsProcessingPhoto(false);});}
    catch{loadImageFile(blob,img=>{setPhoto(img);setIsProcessingPhoto(false);});}
  },[]);

  const dlBtn=(ref,name)=>{const a=document.createElement('a');a.download=name;a.href=ref.current.toDataURL('image/png',1.0);a.click();};
  const expandCard=side=>{const ref=side==='front'?canvasRef:backCanvasRef;if(!ref.current)return;setExpandedImg(ref.current.toDataURL('image/png',1.0));setExpandedSide(side);};

  const saveAnchors=()=>{
    try{localStorage.setItem('nvid_anchorMap',JSON.stringify(anchorMap));}catch{}
    setShowAnchorEditor(false);
  };
  const resetAnchors=()=>{
    setAnchorMap({...DEFAULT_MAPPING});
    try{localStorage.removeItem('nvid_anchorMap');}catch{}
  };

  return (
    <>
      {showCamera&&<CameraCapture onCapture={handleCameraCapture} onClose={()=>setShowCamera(false)}/>}

      {/* ── Full-screen Anchor Editor Panel ── */}
      {showAnchorEditor&&(
        <AnchorEditorPanel
          anchorMap={anchorMap} setAnchorMap={setAnchorMap}
          onSave={saveAnchors}
          onClose={()=>setShowAnchorEditor(false)}
          onReset={resetAnchors}
          renderCard={(canvas,am)=>renderCardRef.current(canvas,am)}
        />
      )}

      {/* Advanced Side Drawer */}
      {showAdvanced&&(
        <div className="fixed inset-0 z-40 flex justify-end" onClick={()=>setShowAdvanced(false)}>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.5)'}}/>
          <div className="relative z-50 flex flex-col overflow-y-auto w-80 h-full shadow-2xl"
            style={{background:T.bg,borderLeft:`2px solid ${T.border}`}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 shrink-0" style={{borderBottom:`1px solid ${T.border}`}}>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" style={{color:T.muted}}/>
                <span className="text-[13px] font-bold" style={{color:T.label}}>Advanced</span>
              </div>
              <button onClick={()=>setShowAdvanced(false)} className="p-1.5 rounded-lg" style={{background:'#252538'}}>
                <X className="w-4 h-4" style={{color:T.muted}}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <PhotoPanel backgroundImage={backgroundImage} backBackgroundImage={backBackgroundImage}
                referenceImage={referenceImage} showRef={showRef} setShowRef={setShowRef}
                setBackgroundImage={setBackgroundImage} setBackBackgroundImage={setBackBackgroundImage}
                setReferenceImage={setReferenceImage}/>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col text-white font-sans" style={{height:'100dvh',overscrollBehavior:'none',background:T.bg}}>
        {/* Header */}
        <header className="shrink-0 relative overflow-hidden"
          style={{paddingTop:'max(env(safe-area-inset-top),8px)',paddingBottom:0,borderBottom:'2px solid #006064',background:'linear-gradient(135deg,#001a26 60%,#003545 100%)'}}>
          <div className="relative flex items-center justify-between px-3 pb-2 flex-wrap gap-2">
            <img src={`${BASE}nevada-logo.png`} alt="Nevada 2026" className="h-10 object-contain"
              style={{filter:'drop-shadow(0 0 6px rgba(77,208,225,0.4))'}}/>
            <div className="flex gap-2 items-center flex-wrap">
              <button onClick={()=>setShowAdvanced(v=>!v)}
                className="p-2 rounded-xl active:opacity-70"
                style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)'}}>
                <Settings className="w-4 h-4 text-white opacity-60"/>
              </button>
              <button onClick={()=>setShowAnchorEditor(true)}
                className="flex items-center gap-1.5 text-white px-3 py-2 rounded-xl font-bold text-sm active:scale-95"
                style={{background:'rgba(92,94,247,0.25)',border:'1px solid #5c5ef7'}}>
                <Move className="w-4 h-4"/> Anchors
              </button>
              <button onClick={exportPDF}
                className="flex items-center gap-1.5 text-white px-3 py-2 rounded-xl font-bold text-sm active:scale-95"
                style={{background:'rgba(239,68,68,0.2)',border:'1px solid #ef4444'}}>
                <FileText className="w-4 h-4"/> PDF
              </button>
              <button onClick={()=>dlBtn(canvasRef,'NV_ID_FRONT.png')}
                className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl font-black text-sm active:scale-95 shadow-lg"
                style={{background:'linear-gradient(135deg,#006064,#0097a7)',boxShadow:'0 2px 12px rgba(0,150,167,0.4)'}}>
                <Download className="w-4 h-4"/> Front
              </button>
              <button onClick={()=>dlBtn(backCanvasRef,'NV_ID_BACK.png')}
                className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl font-black text-sm active:scale-95"
                style={{background:'rgba(0,60,80,0.8)',border:'1px solid #006064'}}>
                <Download className="w-4 h-4"/> Back
              </button>
            </div>
          </div>
        </header>

        {/* Preview */}
        <div className="shrink-0 px-4 pt-3 pb-2 flex flex-col items-center">
          <div className="w-full max-w-[420px] md:max-w-[min(calc((100vw_-_32px)*0.6),820px)]">
            <button onClick={()=>setShowPreview(v=>!v)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl mb-2 text-sm font-semibold"
              style={{background:T.card,color:T.muted}}>
              <span style={{color:T.label}}>Preview</span>
              <ChevronDown className="w-4 h-4" style={{transform:showPreview?'rotate(0deg)':'rotate(-90deg)',color:T.muted}}/>
            </button>
            {showPreview&&(
              <div className="grid grid-cols-2 gap-2">
                {['front','back'].map(side=>(
                  <div key={side} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 px-0.5">
                      {side==='front'?<UserCircle className="w-3.5 h-3.5" style={{color:T.muted}}/>:<Barcode className="w-3.5 h-3.5" style={{color:T.muted}}/>}
                      <span className="text-[11px] font-bold" style={{color:T.muted}}>{side==='front'?'Front ID':'Back Barcode'}</span>
                    </div>
                    <button onClick={()=>expandCard(side)}
                      className="relative p-1.5 rounded-2xl shadow-xl w-full active:scale-[0.98] transition-transform"
                      style={{aspectRatio:'1000/630',background:T.card}}>
                      <div className="relative rounded-xl overflow-hidden w-full h-full">
                        <canvas ref={side==='front'?canvasRef:backCanvasRef} width={1000} height={630}
                          className="absolute inset-0 w-full h-full"/>
                      </div>
                      <div className="absolute top-2.5 right-2.5 p-1 rounded-lg" style={{background:'rgba(0,0,0,0.55)'}}>
                        <Maximize2 className="w-3 h-3 text-white"/>
                      </div>
                    </button>
                  </div>
                ))}
                <canvas ref={barcodeCanvasRef} style={{display:'none'}}/>
              </div>
            )}
          </div>
        </div>

        {/* Expanded modal */}
        {expandedImg&&(
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{background:'rgba(0,0,0,0.85)'}}
            onClick={()=>{setExpandedImg(null);setExpandedSide(null);}}>
            <button onClick={()=>{setExpandedImg(null);setExpandedSide(null);}}
              className="absolute top-4 right-4 p-2.5 rounded-xl" style={{background:'rgba(255,255,255,0.12)'}}>
              <X className="w-5 h-5 text-white"/>
            </button>
            <img src={expandedImg} alt={expandedSide}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
              onClick={e=>e.stopPropagation()}/>
          </div>
        )}

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-4 pt-4"
          style={{WebkitOverflowScrolling:'touch',paddingBottom:'max(env(safe-area-inset-bottom),16px)'}}>
          <InfoPanel initialInfo={DEFAULT_INFO} onInfoChange={handleInfoChange}
            photo={photo} signature={signature} isProcessingPhoto={isProcessingPhoto}
            setShowCamera={setShowCamera} setPhoto={setPhoto} setSignature={setSignature}
            handleAdvancedPhotoUpload={handleAdvancedPhotoUpload}/>
        </div>
      </div>
    </>
  );
};

export default App;
