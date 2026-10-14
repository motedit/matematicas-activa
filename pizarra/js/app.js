/* ===== Diferenciador simbólico paso a paso ===== */
(function(glob){
  const FUNCS={sin:1,cos:1,tan:1,cot:1,sec:1,csc:1,ln:1,log:1,sqrt:1,exp:1,abs:1,asin:1,acos:1,atan:1,sinh:1,cosh:1,tanh:1};
  function prep(s){ return s.replace(/\s+/g,'').replace(/\)\(/g,')*(').replace(/(\d)([a-zA-Z(])/g,'$1*$2').replace(/([a-zA-Z0-9)])\(/g,function(m,c,o){ return m; }); }
  // tokenizer
  function tok(s){
    s=s.replace(/\s+/g,''); const T=[]; let i=0;
    const ins=()=>{ if(T.length){const p=T[T.length-1]; if(p.t==='num'||p.t==='var'||p.t==='const'||p.t===')') T.push({t:'op',v:'*'});} };
    while(i<s.length){
      const c=s[i];
      if(/[0-9.]/.test(c)){ let j=i; while(j<s.length&&/[0-9.]/.test(s[j]))j++; ins(); T.push({t:'num',v:parseFloat(s.slice(i,j))}); i=j; continue; }
      if(/[a-zA-Z]/.test(c)){ let j=i; while(j<s.length&&/[a-zA-Z]/.test(s[j]))j++; let name=s.slice(i,j);
        if(FUNCS[name]){ ins(); T.push({t:'fn',v:name}); } 
        else if(name==='pi'||name==='e'){ ins(); T.push({t:'const',v:name}); }
        else { // secuencia de variables: x, o parámetros; si largo>1 y no fn, separar en productos de variables
          for(let k=0;k<name.length;k++){ ins(); T.push({t:'var',v:name[k]}); } }
        i=j; continue; }
      if(c==='('){ ins(); T.push({t:'('}); i++; continue; }
      if(c===')'){ T.push({t:')'}); i++; continue; }
      if('+-*/^'.includes(c)){ T.push({t:'op',v:c}); i++; continue; }
      i++;
    }
    return T;
  }
  const PREC={'+':2,'-':2,'*':3,'/':3,'^':4}, RIGHT={'^':1};
  function parse(str){
    const T=tok(str); let pos=0;
    // manejar unario: transformamos '-' unario en neg
    const out=[], ops=[];
    const apply=()=>{ const o=ops.pop(); if(o.t==='fn'){ const a=out.pop(); out.push({t:'fn',name:o.v,a}); }
      else if(o.un){ const a=out.pop(); out.push({t:'neg',a}); }
      else { const b=out.pop(), a=out.pop(); out.push({t:o.v,a,b}); } };
    let prev=null;
    for(let k=0;k<T.length;k++){ const x=T[k];
      if(x.t==='num'){ out.push({t:'num',v:x.v}); }
      else if(x.t==='var'){ out.push({t:'var',v:x.v}); }
      else if(x.t==='const'){ out.push({t:'const',v:x.v}); }
      else if(x.t==='fn'){ ops.push(x); }
      else if(x.t==='('){ ops.push(x); }
      else if(x.t===')'){ while(ops.length&&ops[ops.length-1].t!=='(')apply(); ops.pop(); if(ops.length&&ops[ops.length-1].t==='fn')apply(); }
      else if(x.t==='op'){
        const unary = (x.v==='-'||x.v==='+') && (prev===null||prev.t==='op'||prev.t==='(');
        if(unary){ if(x.v==='-')ops.push({t:'op',v:'u',un:true}); /* +unario: nada */ }
        else { while(ops.length){ const top=ops[ops.length-1]; if(top.t==='op'&&!top.un&&(PREC[top.v]>PREC[x.v]||(PREC[top.v]===PREC[x.v]&&!RIGHT[x.v]))) apply(); else if(top.un) apply(); else break; } ops.push(x); }
      }
      prev=x;
    }
    while(ops.length)apply();
    return out[0];
  }
  // evaluación numérica
  function ev(n,xv,V){ switch(n.t){
    case 'num':return n.v; case 'const':return n.v==='pi'?Math.PI:Math.E;
    case 'var':return n.v===V?xv:1; // parámetros=1 para test
    case '+':return ev(n.a,xv,V)+ev(n.b,xv,V); case '-':return ev(n.a,xv,V)-ev(n.b,xv,V);
    case '*':return ev(n.a,xv,V)*ev(n.b,xv,V); case '/':return ev(n.a,xv,V)/ev(n.b,xv,V);
    case '^':return Math.pow(ev(n.a,xv,V),ev(n.b,xv,V)); case 'neg':return -ev(n.a,xv,V);
    case 'fn':{ const u=ev(n.a,xv,V); const f=n.name; const M={sin:Math.sin,cos:Math.cos,tan:Math.tan,ln:Math.log,log:x=>Math.log(x)/Math.LN10,sqrt:Math.sqrt,exp:Math.exp,abs:Math.abs,asin:Math.asin,acos:Math.acos,atan:Math.atan,sinh:Math.sinh,cosh:Math.cosh,tanh:Math.tanh,cot:x=>1/Math.tan(x),sec:x=>1/Math.cos(x),csc:x=>1/Math.sin(x)}; return M[f](u); }
  } }
  // constructores
  const N=v=>({t:'num',v}), ZERO=N(0), ONE=N(1);
  const isNum=(n,v)=>n.t==='num'&&(v===undefined||n.v===v);
  function add(a,b){ if(isNum(a,0))return b; if(isNum(b,0))return a; if(a.t==='num'&&b.t==='num')return N(a.v+b.v); if(b.t==='neg')return sub(a,b.a); if(a.t==='neg')return sub(b,a.a); return {t:'+',a,b}; }
  function sub(a,b){ if(isNum(b,0))return a; if(a.t==='num'&&b.t==='num')return N(a.v-b.v); return {t:'-',a,b}; }
  function mul(a,b){ if(isNum(a,0)||isNum(b,0))return ZERO; if(isNum(a,1))return b; if(isNum(b,1))return a;
    if(a.t==='num'&&b.t==='num')return N(a.v*b.v);
    if(a.t==='num'&&b.t==='*'&&b.a.t==='num')return mul(N(a.v*b.a.v),b.b);
    if(b.t==='num'&&a.t==='*'&&a.a.t==='num')return mul(N(b.v*a.a.v),a.b);
    if(a.t==='neg')return {t:'neg',a:mul(a.a,b)};
    if(b.t==='neg')return {t:'neg',a:mul(a,b.a)};
    if(b.t==='num'&&a.t!=='num')return {t:'*',a:b,b:a};
    return {t:'*',a,b}; }
  function div(a,b){ if(isNum(a,0))return ZERO; if(isNum(b,1))return a; return {t:'/',a,b}; }
  function pw(a,b){ if(isNum(b,1))return a; if(isNum(b,0))return ONE; return {t:'^',a,b}; }
  // derivada
  function d(n,V){ switch(n.t){
    case 'num': case 'const': return ZERO;
    case 'var': return n.v===V?ONE:ZERO;
    case '+': return add(d(n.a,V),d(n.b,V));
    case '-': return sub(d(n.a,V),d(n.b,V));
    case 'neg': return {t:'neg',a:d(n.a,V)};
    case '*': return add(mul(d(n.a,V),n.b), mul(n.a,d(n.b,V)));
    case '/': return div(sub(mul(d(n.a,V),n.b), mul(n.a,d(n.b,V))), pw(n.b,N(2)));
    case '^':{
      const f=n.a,g=n.b;
      if(f.t==='const'&&f.v==='e'){ return mul(n, d(g,V)); }
      if(g.t==='num'){ return mul(mul(N(g.v),pw(f,N(g.v-1))), d(f,V)); }
      if(!depends(f,V)){ return mul(mul(pw(f,g),{t:'fn',name:'ln',a:f}), d(g,V)); }
      return mul(pw(f,g), add(mul(d(g,V),{t:'fn',name:'ln',a:f}), div(mul(g,d(f,V)),f)));
    }
    case 'fn':{ const u=n.a, du=d(u,V); let der;
      switch(n.name){
        case 'sin':der={t:'fn',name:'cos',a:u};break;
        case 'cos':der={t:'neg',a:{t:'fn',name:'sin',a:u}};break;
        case 'tan':der=pw({t:'fn',name:'sec',a:u},N(2));break;
        case 'cot':der={t:'neg',a:pw({t:'fn',name:'csc',a:u},N(2))};break;
        case 'sec':der=mul({t:'fn',name:'sec',a:u},{t:'fn',name:'tan',a:u});break;
        case 'csc':der={t:'neg',a:mul({t:'fn',name:'csc',a:u},{t:'fn',name:'cot',a:u})};break;
        case 'ln':der=div(ONE,u);break;
        case 'log':der=div(ONE,mul(u,{t:'fn',name:'ln',a:{t:'const',v:'e10'}}));der=div(ONE,mul(u,N(Math.LN10)));break;
        case 'exp':der={t:'fn',name:'exp',a:u};break;
        case 'sqrt':der=div(ONE,mul(N(2),{t:'fn',name:'sqrt',a:u}));break;
        case 'asin':der=div(ONE,{t:'fn',name:'sqrt',a:sub(ONE,pw(u,N(2)))});break;
        case 'acos':der={t:'neg',a:div(ONE,{t:'fn',name:'sqrt',a:sub(ONE,pw(u,N(2)))})};break;
        case 'atan':der=div(ONE,add(ONE,pw(u,N(2))));break;
        case 'sinh':der={t:'fn',name:'cosh',a:u};break;
        case 'cosh':der={t:'fn',name:'sinh',a:u};break;
        case 'tanh':der=sub(ONE,pw({t:'fn',name:'tanh',a:u},N(2)));break;
        default:der=ZERO;
      }
      return mul(der,du);
    }
  } }
  function depends(n,V){ if(n.t==='var')return n.v===V; if(n.a&&depends(n.a,V))return true; if(n.b&&depends(n.b,V))return true; return false; }
  // simplificación ligera (recursiva, reusa constructores)
  function simp(n){ if(!n||!n.t)return n; if(n.a)n.a=simp(n.a); if(n.b)n.b=simp(n.b);
    switch(n.t){ case '+':return add(n.a,n.b); case '-':return sub(n.a,n.b); case '*':return mul(n.a,n.b); case '/':return div(n.a,n.b); case '^':return pw(n.a,n.b); case 'neg': return isNum(n.a,0)?ZERO:(n.a.t==='num'?N(-n.a.v):n); default:return n; } }
  // a texto
  const P={'+':2,'-':2,'*':3,'/':3,'^':4};
  function str(n,parent){ let s,p=5;
    switch(n.t){
      case 'num': s=(Math.round(n.v*1e6)/1e6).toString(); break;
      case 'const': s=n.v; break;
      case 'var': s=n.v; break;
      case 'neg': p=2; s='-'+str(n.a,{t:'neg'}); break;
      case '+': case '-': case '*': case '/': p=P[n.t]; { let op=n.t==='*'?'·':n.t; s=str(n.a,{t:n.t,side:'l'})+op+str(n.b,{t:n.t,side:'r'}); break; }
      case '^': p=P['^']; s=str(n.a,{t:'^',side:'l'})+'^'+str(n.b,{t:'^',side:'r'}); break;
      case 'fn': s=n.name+'('+str(n.a,null)+')'; p=5; break;
    }
    if(parent){ const pp=P[parent.t]||0; if(p<pp || (p===pp&&parent.side==='r'&&(parent.t==='-'||parent.t==='/'))) s='('+s+')'; }
    return s;
  }
  function explain(ast,V){
    const steps=[]; const top=ast;
    const R=n=>str(simp(d(n,V)),null);
    steps.push('d/d'+V+' [ '+str(top,null)+' ]');
    if(top.t==='+'||top.t==='-'){ steps.push('Regla de la suma: derivar término a término.');
      steps.push('d/d'+V+'['+str(top.a)+'] = '+R(top.a)); steps.push('d/d'+V+'['+str(top.b)+'] = '+R(top.b)); }
    else if(top.t==='*'){ steps.push('Regla del producto: (f·g)\u2032 = f\u2032·g + f·g\u2032');
      steps.push('f = '+str(top.a)+',  f\u2032 = '+R(top.a)); steps.push('g = '+str(top.b)+',  g\u2032 = '+R(top.b)); }
    else if(top.t==='/'){ steps.push('Regla del cociente: (f/g)\u2032 = (f\u2032·g \u2212 f·g\u2032)/g\u00b2');
      steps.push('f = '+str(top.a)+',  f\u2032 = '+R(top.a)); steps.push('g = '+str(top.b)+',  g\u2032 = '+R(top.b)); }
    else if(top.t==='^'){ if(top.b.t==='num'){ steps.push('Regla de la potencia: (u^n)\u2032 = n·u^(n\u22121)·u\u2032  (con n = '+top.b.v+')'); if(depends(top.a,V)&&!(top.a.t==='var'))steps.push('u = '+str(top.a)+',  u\u2032 = '+R(top.a)); } else steps.push('Derivada exponencial/logarítmica.'); }
    else if(top.t==='fn'){ steps.push('Regla de la cadena: [f(u)]\u2032 = f\u2032(u)·u\u2032,  con u = '+str(top.a)); if(depends(top.a,V)&&top.a.t!=='var')steps.push('u\u2032 = '+R(top.a)); }
    return steps;
  }
  function derivative(expr,V){ V=V||'x'; const ast=parse(expr); const der=simp(simp(d(ast,V)));
    return {ast, der, result:str(der,null), steps:explain(ast,V), eval:(x)=>ev(der,x,V), evalOrig:(x)=>ev(ast,x,V)}; }
  glob.Deriv={parse,tok,ev,d,simp,str,derivative};
})(typeof window!=='undefined'?window:globalThis);

/* ===== Carga diferida de librerías pesadas ===== */
let __ndReady=false;
function ensureNerdamer(){ return !!window.nerdamer; }
function ensureOCR(){ try{ if(!OCR) loadOCR(); }catch(e){} return !!OCR; }

/* ===== Almacenamiento (localStorage + respaldo en memoria) ===== */
const _mem={};
const Store={
  get(k,def){ try{const v=localStorage.getItem(k);return v==null?def:JSON.parse(v);}catch(e){return (k in _mem)?_mem[k]:def;} },
  set(k,v){ _mem[k]=v; try{localStorage.setItem(k,JSON.stringify(v));}catch(e){} }
};
let students=Store.get('pd_students',[]);
let files=Store.get('pd_files',[]);
function saveStudents(){Store.set('pd_students',students);}
function saveFiles(){Store.set('pd_files',files);}

const PALETTE=['#0f2540','#1f5f8b','#2a9d8f','#c08a3e','#d9603b','#7b4ea8','#ffffff'];
const AVATAR_COLORS=['#1f5f8b','#2a9d8f','#c08a3e','#d9603b','#7b4ea8','#3a7d44','#b8336a','#2d6a8f'];
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function code6(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=c[Math.floor(Math.random()*c.length)];return s;}
function fmtDate(ts){const d=new Date(ts);return d.toLocaleDateString('es-AR',{day:'2-digit',month:'short'})+' · '+d.toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function initials(n){const p=n.trim().split(/\s+/);return((p[0]?.[0]||'')+(p[1]?.[0]||'')).toUpperCase();}
function toast(msg){const t=document.getElementById('toast');t.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'+msg;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2200);}

/* ===== Roles / vistas ===== */
function setRole(role){
  document.getElementById('roleTeacher').classList.toggle('active',role==='teacher');
  document.getElementById('roleStudent').classList.toggle('active',role==='student');
  document.getElementById('teacherView').classList.toggle('active',role==='teacher');
  document.getElementById('studentView').classList.toggle('active',role==='student');
  if(role==='teacher') setTimeout(()=>{resizeBoard();},30);
}
function setPane(p,btn){
  document.querySelectorAll('.panel-tabs button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('paneStudents').classList.toggle('active',p==='students');
  document.getElementById('paneFiles').classList.toggle('active',p==='files');
  if(p==='files') renderFiles();
}

/* ===== Alumnos ===== */
function addStudent(){
  const inp=document.getElementById('studentName');const name=inp.value.trim();
  const curso=document.getElementById('studentCurso').value.trim();
  const escuela=document.getElementById('studentEscuela').value.trim();
  if(!name){inp.focus();return;}
  Store.set('pd_lastCurso',curso);Store.set('pd_lastEscuela',escuela);
  students.push({id:uid(),name,curso,escuela,code:code6(),color:AVATAR_COLORS[students.length%AVATAR_COLORS.length]});
  saveStudents();inp.value='';inp.focus();renderStudents();
  toast('Alumno agregado'+(curso?(' a '+curso):''));
}
function updateCursoHint(){
  const curso=document.getElementById('studentCurso').value.trim();
  const escuela=document.getElementById('studentEscuela').value.trim();
  const meta=[curso,escuela].filter(Boolean).join(' · ');
  document.getElementById('hintCurso').textContent=meta?('Los próximos alumnos se agregan a: '+meta):'';
}
function removeStudent(id){
  const s=students.find(x=>x.id===id);
  if(!confirm('¿Eliminar a '+(s?s.name:'este alumno')+'?')) return;
  students=students.filter(x=>x.id!==id);
  files.forEach(f=>{if(Array.isArray(f.access))f.access=f.access.filter(a=>a!==id);});
  saveStudents();saveFiles();renderStudents();
}
let editStudentId=null;
function editStudent(id){
  const s=students.find(x=>x.id===id);if(!s)return;
  editStudentId=id;
  document.getElementById('edName').value=s.name;
  document.getElementById('edCurso').value=s.curso||'';
  document.getElementById('edEscuela').value=s.escuela||'';
  showModal('studentModal');
}
function saveStudentEdit(){
  const s=students.find(x=>x.id===editStudentId);if(!s)return;
  const n=document.getElementById('edName').value.trim();
  if(!n){toast('El nombre no puede quedar vacío');return;}
  s.name=n;
  s.curso=document.getElementById('edCurso').value.trim();
  s.escuela=document.getElementById('edEscuela').value.trim();
  saveStudents();closeModal();renderStudents();toast('Alumno actualizado');
}
function regenCode(id){
  const s=students.find(x=>x.id===id);if(!s)return;
  s.code=code6();saveStudents();renderStudents();toast('Nuevo código: '+s.code);
}
function copyCode(code){navigator.clipboard?.writeText(code).then(()=>toast('Código '+code+' copiado')).catch(()=>toast('Código: '+code));}
function studentCardHtml(s){
  return `
    <div class="card">
      <div class="top">
        <div class="avatar" style="background:${s.color}">${initials(s.name)}</div>
        <div class="name">${escapeHtml(s.name)}</div>
        <div class="acts">
          <button class="iconbtn" title="Editar" onclick="editStudent('${s.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
          <button class="iconbtn" title="Nuevo código" onclick="regenCode('${s.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15"/></svg></button>
          <button class="iconbtn danger" title="Eliminar" onclick="removeStudent('${s.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
        </div>
      </div>
      <div class="code-chip" onclick="copyCode('${s.code}')" title="Copiar código">${s.code}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></div>
    </div>`;
}
function renderStudents(){
  document.getElementById('studCount').textContent=students.length;
  document.getElementById('studentSearchWrap').style.display=students.length>4?'block':'none';
  const q=(document.getElementById('studentSearch').value||'').toLowerCase();
  const list=students.filter(s=>(s.name+' '+(s.curso||'')+' '+(s.escuela||'')).toLowerCase().includes(q));
  const wrap=document.getElementById('studentList');
  if(!students.length){wrap.innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>Todavía no agregaste alumnos.<br>Escribí el curso y la escuela, después cargá los nombres.</div>';return;}
  if(!list.length){wrap.innerHTML='<div class="empty">Sin resultados para «'+escapeHtml(q)+'».</div>';return;}
  const groups={};
  list.forEach(s=>{const k=(s.curso||'').trim()||'Sin curso asignado';(groups[k]=groups[k]||[]).push(s);});
  const order=Object.keys(groups).sort((a,b)=>a.localeCompare(b,'es'));
  wrap.innerHTML=order.map(k=>{
    const arr=groups[k];
    const esc=arr.map(s=>s.escuela).find(Boolean)||'';
    return `<div class="group-head"><span class="gh-title">${escapeHtml(k)}</span>${esc?`<span class="gh-sub">${escapeHtml(esc)}</span>`:''}<span class="gh-count">${arr.length}</span></div>`+arr.map(studentCardHtml).join('');
  }).join('');
}

/* ===== Archivos ===== */
let saveAccessMode='all',saveAccessIds=[],pendingFile=null;
let editFileId=null,editAccessMode='all',editAccessIds=[];
function openSaveFile(){
  pendingFile={type:'image',data:exportComposite(),mime:'image/png'};
  document.getElementById('saveFileName').value='Pizarra '+new Date().toLocaleDateString('es-AR');
  saveAccessMode='all';saveAccessIds=[];
  document.querySelectorAll('#accessSeg button').forEach(b=>b.classList.toggle('active',b.dataset.access==='all'));
  document.getElementById('saveCheckWrap').style.display='none';
  showModal('saveModal');
}
function handleUpload(e){
  const file=e.target.files[0];if(!file)return;
  if(file.size>2200000){toast('Archivo muy grande (máx ~2 MB en modo local)');e.target.value='';return;}
  const reader=new FileReader();
  reader.onload=()=>{
    pendingFile={type:file.type.includes('pdf')?'pdf':'image',data:reader.result,mime:file.type};
    document.getElementById('saveFileName').value=file.name.replace(/\.[^.]+$/,'');
    saveAccessMode='all';saveAccessIds=[];
    document.querySelectorAll('#accessSeg button').forEach(b=>b.classList.toggle('active',b.dataset.access==='all'));
    document.getElementById('saveCheckWrap').style.display='none';
    showModal('saveModal');
  };
  reader.readAsDataURL(file);e.target.value='';
}
function setSaveAccess(mode,btn){
  saveAccessMode=mode;
  document.querySelectorAll('#accessSeg button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const wrap=document.getElementById('saveCheckWrap');
  if(mode==='some'){wrap.style.display='block';wrap.innerHTML=buildCheckList(saveAccessIds,'saveCheck');}else wrap.style.display='none';
}
function buildCheckList(selected,fnName){
  if(!students.length)return '<div class="empty" style="padding:18px">Agregá alumnos primero en la pestaña «Alumnos».</div>';
  const cursos=[...new Set(students.map(s=>(s.curso||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  const escuelas=[...new Set(students.map(s=>(s.escuela||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  const esc=s=>escapeHtml(s).replace(/'/g,"\\'");
  let bulk='<div class="bulk"><span class="bulk-lb">Marcar:</span>'+
    `<button type="button" onclick="bulkCheck(this,'${fnName}','all')">Todos</button>`+
    `<button type="button" onclick="bulkCheck(this,'${fnName}','none')">Ninguno</button>`+
    escuelas.map(e=>`<button type="button" class="school" title="Escuela" onclick="bulkCheck(this,'${fnName}','school','${esc(e)}')">${escapeHtml(e)}</button>`).join('')+
    cursos.map(c=>`<button type="button" title="Curso" onclick="bulkCheck(this,'${fnName}','course','${esc(c)}')">${escapeHtml(c)}</button>`).join('')+'</div>';
  const items=students.map(s=>`<label class="check-item"><input type="checkbox" data-id="${s.id}" data-course="${escapeHtml((s.curso||'').trim())}" data-school="${escapeHtml((s.escuela||'').trim())}" ${selected.includes(s.id)?'checked':''} onchange="${fnName}('${s.id}',this.checked)"><div class="avatar" style="width:30px;height:30px;font-size:.8rem;background:${s.color}">${initials(s.name)}</div><div style="flex:1"><div class="name">${escapeHtml(s.name)}</div>${(s.curso||s.escuela)?`<div class="sub">${[escapeHtml(s.curso||''),escapeHtml(s.escuela||'')].filter(Boolean).join(' · ')}</div>`:''}</div></label>`).join('');
  return bulk+'<div class="check-list">'+items+'</div>';
}
function bulkCheck(btn,fnName,mode,val){
  const cont=btn.closest('.bulk').parentElement;
  cont.querySelectorAll('.check-item input').forEach(inp=>{
    let on;
    if(mode==='all')on=true; else if(mode==='none')on=false;
    else if(mode==='school')on=inp.dataset.school===val; else on=inp.dataset.course===val;
    inp.checked=on;
    if(typeof window[fnName]==='function')window[fnName](inp.dataset.id,on);
  });
}
function saveCheck(id,on){if(on){if(!saveAccessIds.includes(id))saveAccessIds.push(id);}else saveAccessIds=saveAccessIds.filter(x=>x!==id);}
function confirmSaveFile(){
  if(!pendingFile)return;
  const name=document.getElementById('saveFileName').value.trim()||'Material sin nombre';
  const access=saveAccessMode==='all'?'all':[...saveAccessIds];
  files.unshift({id:uid(),name,type:pendingFile.type,data:pendingFile.data,mime:pendingFile.mime,ts:Date.now(),access});
  saveFiles();pendingFile=null;closeModal();
  document.querySelectorAll('.panel-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.pane==='files'));
  document.getElementById('paneStudents').classList.remove('active');
  document.getElementById('paneFiles').classList.add('active');
  renderFiles();toast('Material guardado');
}
function removeFile(id){if(!confirm('¿Borrar este material?'))return;files=files.filter(f=>f.id!==id);saveFiles();renderFiles();}
function accessLabel(f){
  if(f.access==='all')return '<span class="access-pill">Toda la clase</span>';
  const n=Array.isArray(f.access)?f.access.length:0;
  if(n===0)return '<span class="access-pill none">Nadie aún</span>';
  return `<span class="access-pill some">${n} alumno${n>1?'s':''}</span>`;
}
function fileScopes(f){
  if(f.access==='all')return {all:true,escuelas:[],cursos:[]};
  const auth=students.filter(s=>Array.isArray(f.access)&&f.access.includes(s.id));
  const escuelas=[...new Set(auth.map(s=>(s.escuela||'').trim()).filter(Boolean))];
  const cursos=[...new Set(auth.map(s=>(s.curso||'').trim()).filter(Boolean))];
  return {all:false,escuelas,cursos,count:auth.length};
}
let fileFilterEscuela='',fileFilterCurso='';
function renderFileFilter(){
  const wrap=document.getElementById('fileFilterWrap');
  const escuelas=[...new Set(students.map(s=>(s.escuela||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  let cursosBase=students;
  if(fileFilterEscuela)cursosBase=students.filter(s=>(s.escuela||'').trim()===fileFilterEscuela);
  const cursos=[...new Set(cursosBase.map(s=>(s.curso||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  if(!escuelas.length&&!cursos.length){wrap.innerHTML='';return;}
  if(fileFilterCurso&&!cursos.includes(fileFilterCurso))fileFilterCurso='';
  const opt=(arr,sel,ph)=>`<option value="">${ph}</option>`+arr.map(x=>`<option value="${escapeHtml(x)}" ${x===sel?'selected':''}>${escapeHtml(x)}</option>`).join('');
  wrap.innerHTML=`<div class="file-filter">
    <select onchange="fileFilterEscuela=this.value;renderFileFilter();renderFiles()">${opt(escuelas,fileFilterEscuela,'Todas las escuelas')}</select>
    <select onchange="fileFilterCurso=this.value;renderFiles()">${opt(cursos,fileFilterCurso,'Todos los cursos')}</select>
    ${(fileFilterEscuela||fileFilterCurso)?`<button class="ff-clear" onclick="fileFilterEscuela='';fileFilterCurso='';renderFileFilter();renderFiles()">Limpiar</button>`:''}
  </div>`;
}
function fileMatchesFilter(f){
  if(!fileFilterEscuela&&!fileFilterCurso)return true;
  const sc=fileScopes(f);
  if(sc.all)return true; // material para toda la clase aparece en cualquier filtro
  const okE=!fileFilterEscuela||sc.escuelas.includes(fileFilterEscuela);
  const okC=!fileFilterCurso||sc.cursos.includes(fileFilterCurso);
  return okE&&okC;
}
function scopeRow(f){
  const sc=fileScopes(f);
  if(sc.all)return '<div class="scope-row"><span class="scope-tag">Toda la clase</span></div>';
  const tags=[...sc.cursos,...sc.escuelas.filter(e=>!sc.cursos.length)];
  if(!tags.length)return '';
  return '<div class="scope-row">Llega a: '+tags.map(t=>`<span class="scope-tag">${escapeHtml(t)}</span>`).join('')+'</div>';
}
function renderFiles(){
  document.getElementById('fileCount').textContent=files.length;
  renderFileFilter();
  const wrap=document.getElementById('fileList');
  if(!files.length){wrap.innerHTML='<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>Sin materiales todavía.<br>Dibujá en la pizarra y tocá «Guardar para la clase».</div>';return;}
  const list=files.filter(fileMatchesFilter);
  if(!list.length){wrap.innerHTML='<div class="empty">Ningún material coincide con ese filtro.</div>';return;}
  wrap.innerHTML=list.map(f=>`
    <div class="file-card">
      <div class="file-thumb">${f.type==='image'?`<img src="${f.data}" alt="">`:`<div class="ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg><span>PDF</span></div>`}</div>
      <div class="file-meta">
        <div class="fname">${escapeHtml(f.name)}</div>
        <div class="fdate mono">${fmtDate(f.ts)}</div>
        <div class="access-row">Visible para: ${accessLabel(f)}</div>
        ${scopeRow(f)}
        <div class="file-actions">
          <button class="tagbtn" onclick="openAccess('${f.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>Autorizar</button>
          <button class="tagbtn" onclick="previewFile('${f.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>Ver</button>
          <button class="tagbtn danger" onclick="removeFile('${f.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>Borrar</button>
        </div>
      </div>
    </div>`).join('');
}
function openAccess(id){
  const f=files.find(x=>x.id===id);if(!f)return;
  editFileId=id;editAccessMode=f.access==='all'?'all':'some';editAccessIds=Array.isArray(f.access)?[...f.access]:[];
  document.getElementById('accessFileLabel').textContent='Material: '+f.name;
  document.querySelectorAll('#accessModal .seg button').forEach(b=>b.classList.toggle('active',b.dataset.access===editAccessMode));
  const wrap=document.getElementById('accessCheckWrap');
  wrap.style.display=editAccessMode==='some'?'block':'none';
  wrap.innerHTML=editAccessMode==='some'?buildCheckList(editAccessIds,'editCheck'):'';
  showModal('accessModal');
}
function setEditAccess(mode,btn){
  editAccessMode=mode;
  document.querySelectorAll('#accessModal .seg button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const wrap=document.getElementById('accessCheckWrap');
  if(mode==='some'){wrap.style.display='block';wrap.innerHTML=buildCheckList(editAccessIds,'editCheck');}else wrap.style.display='none';
}
function editCheck(id,on){if(on){if(!editAccessIds.includes(id))editAccessIds.push(id);}else editAccessIds=editAccessIds.filter(x=>x!==id);}
function confirmAccess(){
  const f=files.find(x=>x.id===editFileId);if(!f)return;
  f.access=editAccessMode==='all'?'all':[...editAccessIds];
  saveFiles();closeModal();renderFiles();toast('Permisos actualizados');
}
function previewFile(id){
  const f=files.find(x=>x.id===id);if(!f)return;
  document.getElementById('previewTitle').textContent=f.name;
  const body=document.getElementById('previewBody');
  if(f.type==='image'){body.innerHTML=`<img class="preview-img" src="${f.data}" alt=""><div style="text-align:center;margin-top:14px"><a class="btn" style="width:auto;display:inline-flex;padding:10px 18px;text-decoration:none" href="${f.data}" download="${escapeHtml(f.name)}.png">Descargar</a></div>`;}
  else{body.innerHTML=`<iframe src="${f.data}" style="width:100%;height:60vh;border:1px solid var(--line);border-radius:10px"></iframe><div style="text-align:center;margin-top:14px"><a class="btn" style="width:auto;display:inline-flex;padding:10px 18px;text-decoration:none" href="${f.data}" download="${escapeHtml(f.name)}.pdf">Descargar PDF</a></div>`;}
  showModal('previewModal');
}
function showModal(id){['saveModal','accessModal','previewModal','studentModal'].forEach(m=>document.getElementById(m).style.display='none');document.getElementById(id).style.display='flex';document.getElementById('overlay').classList.add('show');}
function closeModal(){document.getElementById('overlay').classList.remove('show');document.getElementById('previewBody').innerHTML='';}
document.getElementById('overlay').addEventListener('click',e=>{if(e.target.id==='overlay')closeModal();});

/* ===== Vista alumno ===== */
let currentStudent=null;
function studentLogin(){
  const code=document.getElementById('codeInput').value.trim().toUpperCase();
  const err=document.getElementById('loginErr');
  const s=students.find(x=>x.code===code);
  if(!s){err.textContent='Código incorrecto. Revisalo con tu profe.';return;}
  err.textContent='';currentStudent=s;renderGallery();
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('studentGallery').style.display='block';
}
function studentLogout(){currentStudent=null;document.getElementById('codeInput').value='';document.getElementById('studentGallery').style.display='none';document.getElementById('loginScreen').style.display='flex';}
function renderGallery(){
  const s=currentStudent;
  document.getElementById('galleryAvatar').textContent=initials(s.name);
  document.getElementById('galleryAvatar').style.background=s.color;
  document.getElementById('galleryName').textContent='Hola, '+s.name.split(' ')[0];
  const visible=files.filter(f=>f.access==='all'||(Array.isArray(f.access)&&f.access.includes(s.id)));
  const meta=[s.curso,s.escuela].filter(Boolean).join(' · ');
  document.getElementById('gallerySub').textContent=(meta?meta+'  ·  ':'')+visible.length+' material'+(visible.length===1?'':'es')+' disponible'+(visible.length===1?'':'s');
  const grid=document.getElementById('galleryGrid');
  if(!visible.length){grid.innerHTML='<div class="empty" style="grid-column:1/-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>Todavía no hay material para vos.<br>Tu profe va a habilitarlo pronto.</div>';return;}
  grid.innerHTML=visible.map(f=>`<div class="g-card" onclick="previewFile('${f.id}')"><div class="file-thumb">${f.type==='image'?`<img src="${f.data}" alt="">`:`<div class="ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg><span>PDF</span></div>`}</div><div class="g-meta"><div class="fname">${escapeHtml(f.name)}</div><div class="fdate mono">${fmtDate(f.ts)}</div></div></div>`).join('');
}

/* ===== Pizarra ===== */
const canvas=document.getElementById('board'),ctx=canvas.getContext('2d');
const bg=document.getElementById('bg'),bgx=bg.getContext('2d');
const stage=document.getElementById('stage');
let tool='marker',color=PALETTE[0],size=4,drawing=false,dpr=Math.max(1,window.devicePixelRatio||1);
let startX=0,startY=0,snapshot=null;
let undoStack=[],redoStack=[];
let bgMode=Store.get('pd_bg','grid');
const PX_PER_CM=40;

function renderSwatches(){document.getElementById('swatches').innerHTML=PALETTE.map((c,i)=>`<button class="swatch ${i===0?'active':''}" style="background:${c}" onclick="setColor('${c}',this)"></button>`).join('');}
function setColor(c,btn){color=c;document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('active'));if(btn)btn.classList.add('active');}
function setCustomColor(c){color=c;document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('active'));}
function setSize(v){size=+v;document.getElementById('sizeVal').textContent=v+'px';}
function setTool(t,btn){
  if(tool==='write'&&t!=='write'&&inkStrokes.length){clearTimeout(inkTimer);recognizeInk();}
  tool=t;document.querySelectorAll('.toolrail .tool').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');
  canvas.style.cursor=(t==='text')?'text':'crosshair';
  var wh=document.getElementById('writeHint');if(t==='write'){ if(wh)wh.classList.add('show'); if(!OCR){ toast('Preparando el reconocimiento…'); setTimeout(function(){ensureNerdamer();ensureOCR();},20); } else toast('Escribí y hacé una pausa: se reconoce y resuelve solo'); } else if(wh){ wh.classList.remove('show'); }
}

function resizeBoard(){
  const prev=canvas.width?canvas.toDataURL():null;
  const r=stage.getBoundingClientRect();
  [canvas,bg].forEach(cv=>{cv.width=Math.round(r.width*dpr);cv.height=Math.round(r.height*dpr);});
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineCap='round';ctx.lineJoin='round';
  bgx.setTransform(dpr,0,0,dpr,0,0);
  drawBg();
  if(prev){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,r.width,r.height);img.src=prev;}
}
window.addEventListener('resize',()=>{clearTimeout(window._rz);window._rz=setTimeout(resizeBoard,120);});

function drawBg(){
  const r=stage.getBoundingClientRect();
  bgx.clearRect(0,0,r.width,r.height);
  if(bgMode==='plain')return;
  const dark=stage.classList.contains('dark');
  const minor=dark?'rgba(255,255,255,.07)':'rgba(31,95,139,.09)';
  const major=dark?'rgba(255,255,255,.14)':'rgba(31,95,139,.18)';
  const axis=dark?'rgba(255,255,255,.5)':'rgba(31,95,139,.6)';
  const step=PX_PER_CM/2;
  bgx.lineWidth=1;
  // cuadrícula menor
  bgx.strokeStyle=minor;
  for(let x=0;x<=r.width;x+=step){bgx.beginPath();bgx.moveTo(x,0);bgx.lineTo(x,r.height);bgx.stroke();}
  for(let y=0;y<=r.height;y+=step){bgx.beginPath();bgx.moveTo(0,y);bgx.lineTo(r.width,y);bgx.stroke();}
  // cuadrícula mayor (cada cm)
  bgx.strokeStyle=major;
  for(let x=0;x<=r.width;x+=PX_PER_CM){bgx.beginPath();bgx.moveTo(x,0);bgx.lineTo(x,r.height);bgx.stroke();}
  for(let y=0;y<=r.height;y+=PX_PER_CM){bgx.beginPath();bgx.moveTo(0,y);bgx.lineTo(r.width,y);bgx.stroke();}
  if(bgMode==='cartesian'){
    const ox=Math.round(r.width/2/PX_PER_CM)*PX_PER_CM, oy=Math.round(r.height/2/PX_PER_CM)*PX_PER_CM;
    bgx.strokeStyle=axis;bgx.lineWidth=2;
    bgx.beginPath();bgx.moveTo(0,oy);bgx.lineTo(r.width,oy);bgx.stroke();
    bgx.beginPath();bgx.moveTo(ox,0);bgx.lineTo(ox,r.height);bgx.stroke();
    // flechas
    bgx.fillStyle=axis;
    bgx.beginPath();bgx.moveTo(r.width-2,oy);bgx.lineTo(r.width-12,oy-5);bgx.lineTo(r.width-12,oy+5);bgx.fill();
    bgx.beginPath();bgx.moveTo(ox,2);bgx.lineTo(ox-5,12);bgx.lineTo(ox+5,12);bgx.fill();
    // números
    bgx.fillStyle=axis;bgx.font='11px "Space Mono", monospace';bgx.textAlign='center';bgx.textBaseline='top';
    for(let x=ox+PX_PER_CM,n=1;x<r.width;x+=PX_PER_CM,n++){bgx.fillText(n,x,oy+4);}
    for(let x=ox-PX_PER_CM,n=-1;x>0;x-=PX_PER_CM,n--){bgx.fillText(n,x,oy+4);}
    bgx.textAlign='right';bgx.textBaseline='middle';
    for(let y=oy-PX_PER_CM,n=1;y>0;y-=PX_PER_CM,n++){bgx.fillText(n,ox-5,y);}
    for(let y=oy+PX_PER_CM,n=-1;y<r.height;y+=PX_PER_CM,n--){bgx.fillText(n,ox-5,y);}
  }
}
function cycleBg(){
  bgMode=bgMode==='plain'?'grid':bgMode==='grid'?'cartesian':'plain';
  Store.set('pd_bg',bgMode);
  document.getElementById('bgLabel').textContent=bgMode==='plain'?'Lisa':bgMode==='grid'?'Cuadrícula':'Cartesiano';
  drawBg();
}

function updoButtons(){document.getElementById('undoBtn').disabled=!undoStack.length;document.getElementById('redoBtn').disabled=!redoStack.length;}
function pushUndo(){try{undoStack.push(canvas.toDataURL());if(undoStack.length>30)undoStack.shift();redoStack=[];updoButtons();}catch(e){}}
function restoreData(data){const r=stage.getBoundingClientRect();const img=new Image();img.onload=()=>{ctx.clearRect(0,0,r.width,r.height);ctx.drawImage(img,0,0,r.width,r.height);persistCanvas();};img.src=data;}
function undo(){if(!undoStack.length)return;try{redoStack.push(canvas.toDataURL());}catch(e){}restoreData(undoStack.pop());updoButtons();}
function redo(){if(!redoStack.length)return;try{undoStack.push(canvas.toDataURL());}catch(e){}restoreData(redoStack.pop());updoButtons();}
function clearBoard(){pushUndo();const r=stage.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height);persistCanvas();}

let _persistT=null;
function persistCanvas(){clearTimeout(_persistT);_persistT=setTimeout(()=>{try{Store.set('pd_canvas',canvas.toDataURL());}catch(e){}},700);}

function exportComposite(){
  const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;
  const o=out.getContext('2d');
  o.fillStyle=stage.classList.contains('dark')?'#143028':'#ffffff';o.fillRect(0,0,out.width,out.height);
  o.drawImage(bg,0,0);o.drawImage(canvas,0,0);
  return out.toDataURL('image/png');
}
async function downloadBoard(){
  const url=exportComposite();
  let dl=null; try{ if(window.claude&&claude.use) dl=await claude.use('downloads'); }catch(e){}
  if(dl){ try{ const blob=await (await fetch(url)).blob(); await dl.save({filename:'pizarra.png',data:blob}); }catch(e){} }
  else { const a=document.createElement('a'); a.download='pizarra.png'; a.href=url; a.click(); }
}
function toggleBoardColor(){
  stage.classList.toggle('dark');const dark=stage.classList.contains('dark');
  document.querySelector('#boardToggleBtn span').textContent=dark?'Blanca':'Verde';
  if(dark&&(color==='#0f2540')){const w=document.querySelectorAll('.swatch')[6];setColor('#ffffff',w);}
  drawBg();
}
function toggleFullscreen(){const el=document.querySelector('.app');if(!document.fullscreenElement){el.requestFullscreen?.();}else{document.exitFullscreen?.();}setTimeout(resizeBoard,200);}

function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX)-r.left,y:(e.clientY)-r.top};}
let compass=null;
canvas.addEventListener('pointerdown',e=>{
  if(e.target!==canvas)return;
  const p=pos(e);
  if(tool==='text'){placeText(p);return;}
  drawing=true;startX=p.x;startY=p.y;pushUndo();
  if(tool==='marker'||tool==='eraser'||tool==='write'){ctx.beginPath();ctx.moveTo(p.x,p.y);}
  if(tool==='write')inkCurStroke=[{x:p.x,y:p.y}];
  else if(tool==='compass'){compass={cx:p.x,cy:p.y,startAngle:0};snapshot=ctx.getImageData(0,0,canvas.width,canvas.height);}
  else{snapshot=ctx.getImageData(0,0,canvas.width,canvas.height);}
});
canvas.addEventListener('pointermove',e=>{
  const p=pos(e);
  if(protractorVisible)updateProtractorReading(e);
  if(!drawing)return;
  if(tool==='marker'){ctx.globalCompositeOperation='source-over';ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineTo(p.x,p.y);ctx.stroke();}
  else if(tool==='write'){ctx.globalCompositeOperation='source-over';ctx.strokeStyle=color;ctx.lineWidth=size;ctx.lineTo(p.x,p.y);ctx.stroke();if(inkCurStroke)inkCurStroke.push({x:p.x,y:p.y});}
  else if(tool==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.lineWidth=size*2.4;ctx.lineTo(p.x,p.y);ctx.stroke();ctx.globalCompositeOperation='source-over';}
  else if(tool==='line'||tool==='rect'||tool==='circle'){
    restoreSnapshot();ctx.globalCompositeOperation='source-over';ctx.strokeStyle=color;ctx.lineWidth=size;ctx.beginPath();
    if(tool==='line'){ctx.moveTo(startX,startY);ctx.lineTo(p.x,p.y);}
    else if(tool==='rect'){ctx.rect(startX,startY,p.x-startX,p.y-startY);}
    else{const rad=Math.hypot(p.x-startX,p.y-startY);ctx.arc(startX,startY,rad,0,Math.PI*2);}
    ctx.stroke();
  }else if(tool==='compass'&&compass){
    restoreSnapshot();const rad=Math.hypot(p.x-compass.cx,p.y-compass.cy);const ang=Math.atan2(p.y-compass.cy,p.x-compass.cx);
    ctx.globalCompositeOperation='source-over';ctx.strokeStyle=color;ctx.lineWidth=size;ctx.beginPath();
    ctx.arc(compass.cx,compass.cy,rad,compass.startAngle,ang,ang<compass.startAngle);ctx.stroke();
    drawCompassGuide(compass.cx,compass.cy,p.x,p.y);showReading('r = '+(rad/PX_PER_CM).toFixed(1)+' cm');
  }
});
function endStroke(){if(!drawing)return;drawing=false;snapshot=null;compass=null;hideReading();if(tool==='write'&&inkCurStroke&&inkCurStroke.length){inkStrokes.push(inkCurStroke);inkCurStroke=null;scheduleRecognize();}persistCanvas();}
canvas.addEventListener('pointerup',endStroke);
canvas.addEventListener('pointerleave',endStroke);
canvas.addEventListener('pointercancel',endStroke);
function restoreSnapshot(){if(snapshot)ctx.putImageData(snapshot,0,0);}
function drawCompassGuide(cx,cy,px,py){ctx.save();ctx.globalCompositeOperation='source-over';ctx.strokeStyle='rgba(192,138,62,.9)';ctx.lineWidth=1.4;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#9c6e2c';ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c08a3e';ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();ctx.restore();}
function placeText(p){const txt=prompt('Texto a escribir en la pizarra:');if(!txt)return;pushUndo();ctx.globalCompositeOperation='source-over';ctx.fillStyle=color;ctx.font=`${Math.max(16,size*5)}px 'Space Grotesk', sans-serif`;ctx.textBaseline='top';ctx.fillText(txt,p.x,p.y);persistCanvas();}
function showReading(t){const r=document.getElementById('reading');r.textContent=t;r.classList.add('show');}
function hideReading(){document.getElementById('reading').classList.remove('show');}

/* ===== Instrumentos ===== */
let protractorVisible=false;
function buildRuler(){
  const cm=13,W=cm*PX_PER_CM+40,H=66;let ticks='';
  for(let i=0;i<=cm;i++){const x=20+i*PX_PER_CM;
    ticks+=`<line x1="${x}" y1="${H-8}" x2="${x}" y2="${H-30}" stroke="#0f2540" stroke-width="1.6"/><text x="${x}" y="${H-34}" font-size="12" font-family="Space Mono" text-anchor="middle" fill="#0f2540">${i}</text>`;
    if(i<cm)for(let m=1;m<10;m++){const mx=x+m*(PX_PER_CM/10);const h=(m===5)?14:8;ticks+=`<line x1="${mx}" y1="${H-8}" x2="${mx}" y2="${H-8-h}" stroke="#3a5775" stroke-width="1"/>`;}
  }
  return{w:W,h:H,edge:[[20,H-8],[20+cm*PX_PER_CM,H-8]],svg:`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7e6"/><stop offset="1" stop-color="#f0e2c4"/></linearGradient></defs><rect x="2" y="2" width="${W-4}" height="${H-4}" rx="6" fill="url(#rg)" stroke="#c08a3e" stroke-width="2"/><text x="${W/2}" y="20" font-size="11" font-family="Space Grotesk" text-anchor="middle" fill="#9c6e2c" letter-spacing="2">CENTÍMETROS</text>${ticks}<line x1="20" y1="${H-8}" x2="${20+cm*PX_PER_CM}" y2="${H-8}" stroke="#0f2540" stroke-width="2"/></svg>`};
}
function buildSet45(){
  const S=300,A=[12,S-12],B=[S-12,S-12],C=[12,12];let m='';
  // marcas de cm sobre el cateto inferior
  for(let i=0;i<=6;i++){const x=A[0]+i*PX_PER_CM;if(x>B[0])break;m+=`<line x1="${x}" y1="${A[1]}" x2="${x}" y2="${A[1]-10}" stroke="#16486b" stroke-width="1"/>`;}
  return{w:S,h:S,edge:[A,B],svg:`<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><polygon points="${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]}" fill="rgba(31,95,139,.10)" stroke="#1f5f8b" stroke-width="2" stroke-linejoin="round"/>${m}<text x="${B[0]-28}" y="${B[1]-10}" font-size="12" font-family="Space Mono" fill="#16486b">45°</text><text x="${C[0]+8}" y="${C[1]+26}" font-size="12" font-family="Space Mono" fill="#16486b">45°</text><rect x="${A[0]+4}" y="${A[1]-20}" width="16" height="16" fill="none" stroke="#16486b" stroke-width="1"/></svg>`};
}
function buildSet60(){
  const W=324,H=200,A=[12,H-12],B=[W-12,H-12],C=[12,12];let m='';
  for(let i=0;i<=7;i++){const x=A[0]+i*PX_PER_CM;if(x>B[0])break;m+=`<line x1="${x}" y1="${A[1]}" x2="${x}" y2="${A[1]-10}" stroke="#16486b" stroke-width="1"/>`;}
  return{w:W,h:H,edge:[A,B],svg:`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><polygon points="${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]}" fill="rgba(42,157,143,.12)" stroke="#1f5f8b" stroke-width="2" stroke-linejoin="round"/>${m}<text x="${B[0]-34}" y="${B[1]-10}" font-size="12" font-family="Space Mono" fill="#16486b">30°</text><text x="${C[0]+8}" y="${C[1]+26}" font-size="12" font-family="Space Mono" fill="#16486b">60°</text><rect x="${A[0]+4}" y="${A[1]-20}" width="16" height="16" fill="none" stroke="#16486b" stroke-width="1"/></svg>`};
}
function buildProtractor(){
  const R=180,cx=R+10,cy=R+10,W=R*2+20,H=R+30;let marks='';
  for(let a=0;a<=180;a+=1){const rad=(180-a)*Math.PI/180,outer=R-4,len=(a%10===0)?16:(a%5===0)?11:6;
    const x1=cx+Math.cos(rad)*outer,y1=cy-Math.sin(rad)*outer,x2=cx+Math.cos(rad)*(outer-len),y2=cy-Math.sin(rad)*(outer-len);
    marks+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0f2540" stroke-width="${a%10===0?1.4:0.8}"/>`;
    if(a%10===0){const tx=cx+Math.cos(rad)*(outer-30),ty=cy-Math.sin(rad)*(outer-30);marks+=`<text x="${tx}" y="${ty}" font-size="11" font-family="Space Mono" text-anchor="middle" dominant-baseline="middle" fill="#16486b">${a}</text>`;}
  }
  return{w:W,h:H,center:[cx,cy],svg:`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(31,95,139,.10)"/><stop offset="1" stop-color="rgba(42,157,143,.16)"/></linearGradient></defs><path d="M${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy} Z" fill="url(#pg)" stroke="#1f5f8b" stroke-width="2"/><line x1="${cx-R}" y1="${cy}" x2="${cx+R}" y2="${cy}" stroke="#1f5f8b" stroke-width="2"/>${marks}<circle cx="${cx}" cy="${cy}" r="4" fill="#d9603b"/><line id="protPointer" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy-R+20}" stroke="#d9603b" stroke-width="2" stroke-dasharray="5 4"/></svg>`};
}
const BUILDERS={ruler:buildRuler,set45:buildSet45,set60:buildSet60,protractor:buildProtractor};
const instState={
  ruler:{x:140,y:150,rot:0},set45:{x:200,y:120,rot:0},set60:{x:230,y:140,rot:0},protractor:{x:280,y:110,rot:0}
};
function applyTransform(name){const s=instState[name];s.el.style.transform=`translate(${s.x}px,${s.y}px) rotate(${s.rot}deg)`;}
function placeHandles(name){
  const s=instState[name],el=s.el;
  const rot=el.querySelector('[data-h="rot"]'),close=el.querySelector('[data-h="close"]'),edge=el.querySelector('[data-h="edge"]');
  rot.style.left=(s.w-4)+'px';rot.style.top='-12px';
  close.style.left='-12px';close.style.top='-12px';
  if(edge&&s.edge){const mx=(s.edge[0][0]+s.edge[1][0])/2,my=(s.edge[0][1]+s.edge[1][1])/2;edge.style.left=(mx-12)+'px';edge.style.top=(my-12)+'px';}
}
function toggleInstrument(name,btn){
  const el=document.getElementById(name),s=instState[name];
  if(el.classList.contains('hidden')){
    if(!s.el)initInstrument(name);
    el.classList.remove('hidden');btn.classList.add('active');
    if(name==='protractor')protractorVisible=true;
  }else{el.classList.add('hidden');btn.classList.remove('active');if(name==='protractor'){protractorVisible=false;hideReading();}}
}
function initInstrument(name){
  const el=document.getElementById(name),body=el.querySelector('.body');
  const built=BUILDERS[name]();body.innerHTML=built.svg;
  const s=instState[name];s.el=el;s.w=built.w;s.h=built.h;s.edge=built.edge||null;s.center=built.center||null;
  el.style.width=s.w+'px';el.style.height=s.h+'px';
  applyTransform(name);placeHandles(name);enableInstrument(name);
}
function enableInstrument(name){
  const s=instState[name],el=s.el,body=el.querySelector('.body');
  body.addEventListener('pointerdown',e=>{
    e.stopPropagation();body.setPointerCapture(e.pointerId);
    const sr=stage.getBoundingClientRect();const ox=e.clientX-sr.left-s.x,oy=e.clientY-sr.top-s.y;
    function move(ev){s.x=ev.clientX-sr.left-ox;s.y=ev.clientY-sr.top-oy;applyTransform(name);}
    function up(){body.removeEventListener('pointermove',move);body.removeEventListener('pointerup',up);}
    body.addEventListener('pointermove',move);body.addEventListener('pointerup',up);
  });
  const rot=el.querySelector('[data-h="rot"]');
  rot.addEventListener('pointerdown',e=>{
    e.stopPropagation();rot.setPointerCapture(e.pointerId);
    const rect=el.getBoundingClientRect();const ccx=rect.left+rect.width/2,ccy=rect.top+rect.height/2;
    function move(ev){let ang=Math.atan2(ev.clientY-ccy,ev.clientX-ccx)*180/Math.PI;if(ev.shiftKey)ang=Math.round(ang/15)*15;s.rot=Math.round(ang);applyTransform(name);}
    function up(){rot.removeEventListener('pointermove',move);rot.removeEventListener('pointerup',up);}
    rot.addEventListener('pointermove',move);rot.addEventListener('pointerup',up);
  });
  const edge=el.querySelector('[data-h="edge"]');
  if(edge)edge.addEventListener('pointerdown',e=>{e.stopPropagation();traceEdge(name);});
  el.querySelector('[data-h="close"]').addEventListener('pointerdown',e=>{
    e.stopPropagation();el.classList.add('hidden');
    document.querySelector(`.tool-inst[data-inst="${name}"]`)?.classList.remove('active');
    if(name==='protractor'){protractorVisible=false;hideReading();}
  });
}
function rotPoint(px,py,cx,cy,cos,sin){const dx=px-cx,dy=py-cy;return[cx+dx*cos-dy*sin,cy+dx*sin+dy*cos];}
function traceEdge(name){
  const s=instState[name];if(!s.edge)return;
  const cx=s.x+s.w/2,cy=s.y+s.h/2,rad=s.rot*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad);
  const a=rotPoint(s.x+s.edge[0][0],s.y+s.edge[0][1],cx,cy,cos,sin);
  const b=rotPoint(s.x+s.edge[1][0],s.y+s.edge[1][1],cx,cy,cos,sin);
  pushUndo();ctx.globalCompositeOperation='source-over';ctx.strokeStyle=color;ctx.lineWidth=size;
  ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();persistCanvas();
  toast('Línea trazada con '+(name==='ruler'?'la regla':name==='set45'?'la escuadra':'el cartabón'));
}
function updateProtractorReading(e){
  const s=instState.protractor;if(!s.el||!s.center)return;
  const sr=stage.getBoundingClientRect();
  const cx=s.x+s.w/2,cy=s.y+s.h/2,rad=s.rot*Math.PI/180,cos=Math.cos(rad),sin=Math.sin(rad);
  const ctr=rotPoint(s.x+s.center[0],s.y+s.center[1],cx,cy,cos,sin); // centro semicirculo en coords-stage
  const mx=e.clientX-sr.left,my=e.clientY-sr.top;
  // ángulo del mouse respecto a la base del transportador (que está rotada s.rot)
  let ang=Math.atan2(my-ctr[1],mx-ctr[0])*180/Math.PI; // pantalla, horario+
  let deg=ang-s.rot; // relativo a la base
  // base local: lado 180° a la derecha, 0° a la izquierda; arriba = 90
  deg=-deg; // arriba positivo
  while(deg<0)deg+=360;while(deg>=360)deg-=360;
  if(deg>180)deg=360-deg;
  showReading(Math.round(deg)+'°');
  const ptr=s.el.querySelector('#protPointer');
  if(ptr){const R=176,a=deg*Math.PI/180,cxl=s.center[0],cyl=s.center[1];ptr.setAttribute('x2',cxl+Math.cos(Math.PI-a)*R);ptr.setAttribute('y2',cyl-Math.sin(Math.PI-a)*R);}
}

/* ===== Atajos ===== */
document.addEventListener('keydown',e=>{
  if(!document.getElementById('teacherView').classList.contains('active'))return;
  const tag=(e.target.tagName||'').toLowerCase();if(tag==='input'||tag==='textarea')return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
  const map={m:'marker',l:'line',r:'rect',c:'circle',t:'text',e:'eraser',w:'write'};
  const t=map[e.key.toLowerCase()];
  if(t){const btn=document.querySelector(`.toolrail .tool[data-tool="${t}"]`);setTool(t,btn);}
});

/* =========================================================
   CALCULADORA MATEMÁTICA
========================================================= */
function nd(expr){ ensureNerdamer(); return nerdamer(expr); }
/* --- biblioteca estadística / distribuciones --- */
function erf(x){const s=x<0?-1:1;x=Math.abs(x);const t=1/(1+0.3275911*x);const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return s*y;}
function normCDF(z){return 0.5*(1+erf(z/Math.SQRT2));}
function normPDF(z){return Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);}
function logGamma(z){const g=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];if(z<0.5)return Math.log(Math.PI/Math.sin(Math.PI*z))-logGamma(1-z);z-=1;let x=0.99999999999980993;for(let i=0;i<g.length;i++)x+=g[i]/(z+i+1);const t=z+g.length-0.5;return 0.5*Math.log(2*Math.PI)+(z+0.5)*Math.log(t)-t+Math.log(x);}
function logFact(n){return logGamma(n+1);}
function comb(n,k){if(k<0||k>n)return 0;return Math.round(Math.exp(logFact(n)-logFact(k)-logFact(n-k)));}
function perm(n,k){if(k<0||k>n)return 0;return Math.round(Math.exp(logFact(n)-logFact(n-k)));}
function binomPMF(n,k,p){if(k<0||k>n)return 0;return Math.exp(logFact(n)-logFact(k)-logFact(n-k)+k*Math.log(p)+(n-k)*Math.log(1-p));}
function binomCDF(n,k,p){let s=0;for(let i=0;i<=k;i++)s+=binomPMF(n,i,p);return s;}
function poissonPMF(l,k){return Math.exp(-l+k*Math.log(l)-logFact(k));}
function poissonCDF(l,k){let s=0;for(let i=0;i<=k;i++)s+=poissonPMF(l,i);return s;}
function betacf(a,b,x){const MAXIT=200,EPS=3e-12,FPMIN=1e-300;let qab=a+b,qap=a+1,qam=a-1,c=1,d=1-qab*x/qap;if(Math.abs(d)<FPMIN)d=FPMIN;d=1/d;let h=d;for(let m=1;m<=MAXIT;m++){let m2=2*m,aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<FPMIN)d=FPMIN;c=1+aa/c;if(Math.abs(c)<FPMIN)c=FPMIN;d=1/d;h*=d*c;aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<FPMIN)d=FPMIN;c=1+aa/c;if(Math.abs(c)<FPMIN)c=FPMIN;d=1/d;let del=d*c;h*=del;if(Math.abs(del-1)<EPS)break;}return h;}
function ibeta(a,b,x){if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(logGamma(a+b)-logGamma(a)-logGamma(b)+a*Math.log(x)+b*Math.log(1-x));return x<(a+1)/(a+b+2)?bt*betacf(a,b,x)/a:1-bt*betacf(b,a,1-x)/b;}
function studentTCDF(t,df){const x=df/(df+t*t),ib=0.5*ibeta(df/2,0.5,x);return t>0?1-ib:ib;}
function tCrit(p,df){let lo=0,hi=2000;for(let i=0;i<120;i++){let m=(lo+hi)/2;if(studentTCDF(m,df)<p)lo=m;else hi=m;}return (lo+hi)/2;}
function normInv(p){if(p<=0)return -Infinity;if(p>=1)return Infinity;let lo=-12,hi=12;for(let i=0;i<140;i++){let m=(lo+hi)/2;if(normCDF(m)<p)lo=m;else hi=m;}return (lo+hi)/2;}
function sup(n){const m={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};return String(n).split('').map(c=>m[c]||c).join('');}
function pretty(s){
  s=String(s);
  s=s.replace(/\*\*/g,'^').replace(/sqrt/g,'√').replace(/\bpi\b/g,'π').replace(/\bInfinity\b/g,'∞');
  s=s.replace(/\^\(?(-?\d+)\)?/g,(m,p)=>sup(p));
  s=s.replace(/\*/g,'·');
  return s;
}
function roundNum(v,dec=6){
  const n=parseFloat(v); if(!isFinite(n))return v;
  let r=Number(n.toFixed(dec)); return String(r);
}
function calcOpen(){document.getElementById('calcOverlay').classList.add('show');if(!window.nerdamer){setTimeout(ensureNerdamer,20);}calcTab('arit',document.querySelector('.calc-tab[data-tab="arit"]'));}
function calcClose(){document.getElementById('calcOverlay').classList.remove('show');}
document.getElementById('calcOverlay').addEventListener('click',e=>{if(e.target.id==='calcOverlay')calcClose();});

function calcTab(name,btn){
  document.querySelectorAll('.calc-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active'); else document.querySelector(`.calc-tab[data-tab="${name}"]`)?.classList.add('active');
  const C=document.getElementById('calcContent');
  C.innerHTML=TABS[name]();
  if(name==='geo')geoFields();
  if(name==='trig')trigMode();
  if(name==='stat')statMode();
  if(name==='poly')polyMode();
  if(name==='func')graphInit();
}
function keys(targetId,arr){
  return '<div class="calc-keys">'+arr.map(k=>`<button onclick="ins('${targetId}','${k.replace(/'/g,"\\'")}')">${k}</button>`).join('')+'</div>';
}
function ins(id,txt){const el=document.getElementById(id);if(!el)return;const s=el.selectionStart??el.value.length;el.value=el.value.slice(0,s)+txt+el.value.slice(el.selectionEnd??s);el.focus();const np=s+txt.length;el.setSelectionRange(np,np);}
function resultBox(main,sub,steps,sendText){
  let h=`<div class="calc-result show" id="calcResult"><div class="cr-label">Resultado</div><div class="cr-main">${main}</div>`;
  if(sub)h+=`<div class="cr-sub">${sub}</div>`;
  if(steps&&steps.length)h+=`<div class="cr-steps">${steps.map(s=>`<div>${s}</div>`).join('')}</div>`;
  h+=`<div class="cr-foot">
    <button onclick="copyText(\`${(sendText||main).replace(/`/g,'')}\`)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copiar</button>
    <button class="send" onclick="sendToBoard(\`${(sendText||main).replace(/`/g,'')}\`)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>Enviar a la pizarra</button>
  </div></div>`;
  return h;
}
function errBox(msg){return `<div class="calc-result show err"><div class="cr-label">No se pudo calcular</div><div class="cr-main" style="font-size:1rem">${msg}</div></div>`;}
function show(html){document.getElementById('calcSlot').innerHTML=html;}
function copyText(t){navigator.clipboard?.writeText(t).then(()=>toast('Copiado')).catch(()=>{});}
function sendToBoard(t){
  setRole('teacher');calcClose();
  pushUndo();ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=(color==='#ffffff'&&!stage.classList.contains('dark'))?'#0f2540':color;
  ctx.font="600 26px 'Space Grotesk', sans-serif";ctx.textBaseline='top';
  ctx.fillText(t, 40, boardTextY);
  boardTextY+=44; const r=stage.getBoundingClientRect(); if(boardTextY>r.height-60)boardTextY=50;
  persistCanvas();toast('Resultado escrito en la pizarra');
}
let boardTextY=50;

/* ---------- ARITMÉTICA ---------- */
function calcArit(){
  const expr=document.getElementById('aExpr').value.trim();
  if(!expr)return show(errBox('Escribí una operación.'));
  try{
    const r=nd(expr);
    let exact=r.toString();
    let dec='';
    try{dec=r.evaluate().text('decimals');}catch(e){dec='';}
    let decR=dec?roundNum(dec,8):'';
    if(/factorial|fact\(/.test(exact) && decR && Number.isInteger(parseFloat(decR))) exact=decR;
    const main=pretty(exact);
    const sub=(decR && decR!==exact && pretty(exact)!==decR)?('≈ '+decR):'';
    show(resultBox(main,sub,null,decR||exact));
  }catch(e){show(errBox('Revisá la expresión. Usá * para multiplicar y ^ para potencias.'));}
}
TABS_ARIT=()=>`
  <div class="calc-intro">Operaciones numéricas con potencias, raíces y funciones. Ejemplos: <b>(3+5)·2^4</b>, <b>√(50)</b>, <b>15%</b> de 200 → <b>200*0.15</b>, <b>factorial(5)</b>.</div>
  <div class="cfield"><label>Operación</label><input type="text" id="aExpr" placeholder="Ej. (3+5)*2^4 - sqrt(81)" onkeydown="if(event.key==='Enter')calcArit()"></div>
  ${keys('aExpr',['(',')','+','-','*','/','^','sqrt(','abs(','%','!'])}
  <button class="calc-run" onclick="calcArit()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Calcular</button>
  <div id="calcSlot"></div>`;

/* ---------- ÁLGEBRA ---------- */
function algFields(){
  const op=document.getElementById('algOp').value;
  document.getElementById('algSysWrap').style.display=op==='system'?'block':'none';
  document.getElementById('algMainField').style.display=op==='system'?'none':'block';
}
function calcAlg(){
  const op=document.getElementById('algOp').value;
  const v=(document.getElementById('algVar').value.trim()||'x');
  try{
    let main,sub='',send,steps=null;
    if(op==='system'){
      const e1=document.getElementById('algEq1').value.trim();
      const e2=document.getElementById('algEq2').value.trim();
      const e3=document.getElementById('algEq3').value.trim();
      const eqs=[e1,e2,e3].filter(Boolean);
      if(eqs.length<2)return show(errBox('Cargá al menos dos ecuaciones (ej. 2x+y=5).'));
      const res=nerdamer.solveEquations(eqs).toString();
      const flat=res.replace(/^\[|\]$/g,'').split(',');
      const pairs=[];
      for(let i=0;i<flat.length;i+=2)pairs.push(flat[i].trim()+' = '+pretty(flat[i+1].trim()));
      main=pairs.join('     '); send=pairs.join(', ');
      show(resultBox(main,'',null,send)); return;
    }
    const expr=document.getElementById('algExpr').value.trim();
    if(!expr)return show(errBox('Escribí una expresión o ecuación.'));
    if(op==='solve'){
      const sols=nd('solve('+expr+','+v+')').toString();
      const arr=sols.replace(/^\[|\]$/g,'').split(',').filter(Boolean);
      if(!arr.length)return show(errBox('No se encontraron soluciones reales.'));
      main=arr.map(s=>v+' = '+pretty(s.trim())).join('     ');
      const dec=arr.map(s=>{try{return v+' ≈ '+roundNum(nd(s.trim()).evaluate().text('decimals'),4);}catch(e){return '';}}).filter(Boolean).join('     ');
      sub=dec; send=arr.map(s=>v+'='+s.trim()).join(', ');
    }else{
      let res;
      if(op==='simplify')res=nd('simplify('+expr+')');
      else if(op==='expand')res=nd('expand('+expr+')');
      else if(op==='factor')res=nd('factor('+expr+')');
      main=pretty(res.toString()); send=res.toString();
    }
    show(resultBox(main,sub,null,send));
  }catch(e){show(errBox('No se pudo procesar. Para «resolver» podés usar = (ej. 2x+4=10).'));}
}
TABS_ALG=()=>`
  <div class="calc-intro">Simplificar, expandir, factorizar, resolver ecuaciones o sistemas. Para resolver podés usar el signo = (ej. <b>2x+4=10</b>).</div>
  <div class="calc-grid cols2">
    <div class="cfield"><label>Qué hacer</label><select id="algOp" onchange="algFields()">
      <option value="solve">Resolver ecuación</option><option value="system">Sistema de ecuaciones</option><option value="simplify">Simplificar</option><option value="expand">Expandir</option><option value="factor">Factorizar</option></select></div>
    <div class="cfield"><label>Variable</label><input type="text" id="algVar" value="x"></div>
  </div>
  <div id="algMainField">
    <div class="cfield"><label>Expresión / ecuación</label><input type="text" id="algExpr" placeholder="Ej. x^2-5x+6=0" onkeydown="if(event.key==='Enter')calcAlg()"></div>
    ${keys('algExpr',['x','^','(',')','+','-','*','/','='])}
  </div>
  <div id="algSysWrap" style="display:none">
    <div class="cfield"><label>Ecuación 1</label><input type="text" id="algEq1" placeholder="2x+y=5"></div>
    <div class="cfield"><label>Ecuación 2</label><input type="text" id="algEq2" placeholder="x-y=1"></div>
    <div class="cfield"><label>Ecuación 3 (opcional)</label><input type="text" id="algEq3" placeholder="(dejar vacío si no aplica)"></div>
  </div>
  <button class="calc-run" onclick="calcAlg()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Calcular</button>
  <div id="calcSlot"></div>`;

/* ---------- CÁLCULO ---------- */
function calcCalc(){
  const op=document.getElementById('calOp').value;
  const expr=document.getElementById('calExpr').value.trim();
  const v=(document.getElementById('calVar').value.trim()||'x');
  if(!expr)return show(errBox('Escribí la función.'));
  try{
    let main,sub='',send,steps=null;
    if(op==='diff'){
      const ord=parseInt(document.getElementById('calA').value||'1',10);
      let used=false;
      if(ord===1 && window.Deriv){ try{ const Dr=Deriv.derivative(expr,v);
        let good=true; for(const xv of [0.4,1.3,2.1]){ const h=1e-5; const nu=(Dr.evalOrig(xv+h)-Dr.evalOrig(xv-h))/(2*h); const sy=Dr.eval(xv); if(isFinite(nu)&&isFinite(sy)&&Math.abs(nu-sy)/(1+Math.abs(nu))>1e-3){good=false;break;} }
        if(good){ main=Dr.result; send="f'("+v+") = "+Dr.result; steps=Dr.steps.concat(['Resultado:  '+Dr.result]); used=true; } }catch(e){} }
      if(!used){ let r=nd(expr); for(let i=0;i<ord;i++)r=nd('diff('+r.toString()+','+v+')'); main=pretty(r.toString()); send="f'("+v+") = "+r.toString(); steps=['d/d'+v+(ord>1?' (orden '+ord+')':'')]; }
    }else if(op==='int'){
      const r=nd('integrate('+expr+','+v+')');
      main=pretty(r.toString())+' + C'; send='∫ = '+r.toString()+' + C';
    }else if(op==='defint'){
      const a=document.getElementById('calA').value.trim(), b=document.getElementById('calB').value.trim();
      if(a===''||b==='')return show(errBox('Indicá los límites inferior y superior.'));
      const r=nd('defint('+expr+','+a+','+b+','+v+')');
      main=pretty(r.toString());
      let dec=''; try{dec=roundNum(r.evaluate().text('decimals'),6);}catch(e){}
      if(dec&&dec!==r.toString())sub='≈ '+dec; send=dec||r.toString();
      steps=['∫ desde '+a+' hasta '+b];
    }else if(op==='limit'){
      const to=document.getElementById('calA').value.trim()||'0';
      const r=nd('limit('+expr+','+v+','+to+')');
      main=pretty(r.toString()); send='lím = '+r.toString();
      steps=[v+' → '+to];
    }
    show(resultBox(main,sub,steps,send));
  }catch(e){show(errBox('No se pudo calcular. Revisá la función (ej. usá * en 3*x y ^ en x^2).'));}
}
function calcCalcFields(){
  const op=document.getElementById('calOp').value;
  const wrap=document.getElementById('calExtra');
  if(op==='diff')wrap.innerHTML='<div class="cfield"><label>Orden</label><input type="text" id="calA" value="1"></div>';
  else if(op==='defint')wrap.innerHTML='<div class="cfield"><label>Límite inferior</label><input type="text" id="calA" placeholder="0"></div><div class="cfield"><label>Límite superior</label><input type="text" id="calB" placeholder="1"></div>';
  else if(op==='limit')wrap.innerHTML='<div class="cfield"><label>'+ 'El valor al que tiende' +'</label><input type="text" id="calA" placeholder="0  ·  pi  ·  Infinity"></div>';
  else wrap.innerHTML='';
}
TABS_CALC=()=>`
  <div class="calc-intro">Derivadas, integrales (indefinidas y definidas) y límites. Ejemplos: <b>x^3+2x</b>, <b>sin(x)*cos(x)</b>, <b>1/x</b>.</div>
  <div class="calc-grid cols2">
    <div class="cfield"><label>Operación</label><select id="calOp" onchange="calcCalcFields()">
      <option value="diff">Derivar</option><option value="int">Integrar (indefinida)</option><option value="defint">Integral definida</option><option value="limit">Límite</option></select></div>
    <div class="cfield"><label>Variable</label><input type="text" id="calVar" value="x"></div>
  </div>
  <div class="cfield"><label>Función</label><input type="text" id="calExpr" placeholder="Ej. x^3 + 2*x" onkeydown="if(event.key==='Enter')calcCalc()"></div>
  ${keys('calExpr',['x','^','sin(','cos(','tan(','e^(','ln(','sqrt(','*','/'])}
  <div class="calc-grid cols2" id="calExtra"><div class="cfield"><label>Orden</label><input type="text" id="calA" value="1"></div></div>
  <button class="calc-run" onclick="calcCalc()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Calcular</button>
  <div id="calcSlot"></div>`;

/* ---------- TRIGONOMETRÍA ---------- */
function trigMode(){
  const m=document.getElementById('trigModeSel').value;
  document.getElementById('trigFn').style.display=m==='fn'?'block':'none';
  document.getElementById('trigRatios').style.display=m==='ratios'?'block':'none';
  document.getElementById('trigTri').style.display=m==='tri'?'block':'none';
  document.getElementById('calcSlot').innerHTML='';
}
function calcTrigRatios(){
  const ang=document.getElementById('rAng').value.trim();
  const unit=document.getElementById('rUnit').value;
  if(ang==='')return show(errBox('Indicá el ángulo.'));
  try{
    const rad=(unit==='deg')?'('+ang+')*pi/180':ang;
    const fns=[['sin','sen'],['cos','cos'],['tan','tan'],['csc','csc'],['sec','sec'],['cot','cot']];
    const rows=fns.map(([f,lb])=>{
      let v; try{v=roundNum(nd(f+'('+rad+')').evaluate().text('decimals'),5);}catch(e){v='no definido';}
      return `<tr><td>${lb}(${escapeHtml(ang)}${unit==='deg'?'°':''})</td><td>${v}</td></tr>`;
    }).join('');
    const send='Razones de '+ang+(unit==='deg'?'°':' rad');
    show(`<div class="calc-result show"><div class="cr-label">Razones trigonométricas</div><table class="stat-table">${rows}</table><div class="cr-foot"><button class="send" onclick="sendToBoard(\`${send}\`)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>Enviar a la pizarra</button></div></div>`);
  }catch(e){show(errBox('No se pudieron calcular las razones.'));}
}
function calcTrigFn(){
  const fn=document.getElementById('tFn').value;
  const ang=document.getElementById('tAng').value.trim();
  const unit=document.getElementById('tUnit').value;
  if(ang==='')return show(errBox('Indicá el ángulo o valor.'));
  try{
    let arg=ang, inv=['asin','acos','atan'].includes(fn);
    let expr;
    if(inv){ expr=fn+'('+arg+')'; }
    else { arg=(unit==='deg')?'('+ang+')*pi/180':ang; expr=fn+'('+arg+')'; }
    const r=nd(expr);
    let exact=r.toString();
    let dec=roundNum(r.evaluate().text('decimals'),6);
    let main, send;
    if(inv){
      const deg=roundNum(nd(expr+'*180/pi').evaluate().text('decimals'),4);
      main=dec+' rad'; send=fn+'('+ang+') = '+dec+' rad';
      show(resultBox(main, '= '+deg+'°', [fn+'⁻¹ de '+ang], send)); return;
    }
    main=(pretty(exact)!==dec)?pretty(exact):dec;
    const sub=(pretty(exact)!==dec)?('≈ '+dec):'';
    send=fn+'('+ang+(unit==='deg'?'°':' rad')+') = '+dec;
    show(resultBox(main,sub,null,send));
  }catch(e){show(errBox('No se pudo evaluar la función trigonométrica.'));}
}
function calcTriangle(){
  const g=id=>{const x=parseFloat(document.getElementById(id).value);return isNaN(x)?null:x;};
  let a=g('triA'),b=g('triB'),c=g('triC'),A=g('triAA'),B=g('triBB'),C=g('triCC');
  const D=Math.PI/180, R=180/Math.PI;
  let known=[a,b,c,A,B,C].filter(x=>x!==null).length;
  let sides=[a,b,c].filter(x=>x!==null).length;
  if(known<3)return show(errBox('Cargá al menos 3 datos (con un lado como mínimo).'));
  if(sides===0)return show(errBox('Necesitás al menos un lado.'));
  let Ar=A!==null?A*D:null,Br=B!==null?B*D:null,Cr=C!==null?C*D:null;
  try{
    for(let it=0;it<6;it++){
      const angs=[Ar,Br,Cr].filter(x=>x!=null).length;
      if(angs===2){ if(Ar==null)Ar=Math.PI-Br-Cr; else if(Br==null)Br=Math.PI-Ar-Cr; else Cr=Math.PI-Ar-Br; }
      // SSS
      if(a&&b&&c){ if(Ar==null)Ar=Math.acos((b*b+c*c-a*a)/(2*b*c)); if(Br==null)Br=Math.acos((a*a+c*c-b*b)/(2*a*c)); if(Cr==null)Cr=Math.PI-Ar-Br; }
      // SAS
      if(a&&b&&Cr!=null&&!c)c=Math.sqrt(a*a+b*b-2*a*b*Math.cos(Cr));
      if(a&&c&&Br!=null&&!b)b=Math.sqrt(a*a+c*c-2*a*c*Math.cos(Br));
      if(b&&c&&Ar!=null&&!a)a=Math.sqrt(b*b+c*c-2*b*c*Math.cos(Ar));
      // Ley de senos: k = lado/sin(ang opuesto)
      let k=null;
      if(a&&Ar!=null)k=a/Math.sin(Ar); else if(b&&Br!=null)k=b/Math.sin(Br); else if(c&&Cr!=null)k=c/Math.sin(Cr);
      if(k){
        if(!a&&Ar!=null)a=k*Math.sin(Ar); if(!b&&Br!=null)b=k*Math.sin(Br); if(!c&&Cr!=null)c=k*Math.sin(Cr);
        if(a&&Ar==null)Ar=Math.asin(Math.min(1,a/k)); if(b&&Br==null)Br=Math.asin(Math.min(1,b/k)); if(c&&Cr==null)Cr=Math.asin(Math.min(1,c/k));
      }
    }
    if([a,b,c,Ar,Br,Cr].some(x=>x==null||isNaN(x)))return show(errBox('Con esos datos no se puede resolver (revisá que sean coherentes).'));
    const area=0.5*a*b*Math.sin(Cr);
    const per=a+b+c;
    const rd=x=>roundNum(x,3), ra=x=>roundNum(x*R,2);
    const steps=['a = '+rd(a)+'   b = '+rd(b)+'   c = '+rd(c),'A = '+ra(Ar)+'°   B = '+ra(Br)+'°   C = '+ra(Cr)+'°','Perímetro = '+rd(per)];
    show(resultBox('Área = '+rd(area),'Perímetro = '+rd(per),steps,'Triángulo: a='+rd(a)+' b='+rd(b)+' c='+rd(c)+'; A='+ra(Ar)+'° B='+ra(Br)+'° C='+ra(Cr)+'°'));
  }catch(e){show(errBox('No se pudo resolver el triángulo con esos datos.'));}
}
TABS_TRIG=()=>`
  <div class="calc-intro">Evaluá funciones, calculá las seis razones de un ángulo o resolvé un triángulo cualquiera (ley de senos y cosenos).</div>
  <div class="cfield" style="margin-bottom:14px"><label>Modo</label><select id="trigModeSel" onchange="trigMode()"><option value="fn">Evaluar función</option><option value="ratios">Razones de un ángulo</option><option value="tri">Resolver triángulo</option></select></div>
  <div id="trigFn">
    <div class="calc-grid cols3">
      <div class="cfield"><label>Función</label><select id="tFn"><option>sin</option><option>cos</option><option>tan</option><option>sec</option><option>csc</option><option>cot</option><option>asin</option><option>acos</option><option>atan</option></select></div>
      <div class="cfield"><label>Ángulo / valor</label><input type="text" id="tAng" placeholder="30" onkeydown="if(event.key==='Enter')calcTrigFn()"></div>
      <div class="cfield"><label>Unidad</label><select id="tUnit"><option value="deg">Grados</option><option value="rad">Radianes</option></select></div>
    </div>
    <button class="calc-run" onclick="calcTrigFn()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Calcular</button>
  </div>
  <div id="trigRatios" style="display:none">
    <div class="calc-intro" style="margin-top:0">Devuelve seno, coseno, tangente, cosecante, secante y cotangente del ángulo.</div>
    <div class="calc-grid cols2">
      <div class="cfield"><label>Ángulo</label><input type="text" id="rAng" placeholder="30" onkeydown="if(event.key==='Enter')calcTrigRatios()"></div>
      <div class="cfield"><label>Unidad</label><select id="rUnit"><option value="deg">Grados</option><option value="rad">Radianes</option></select></div>
    </div>
    <button class="calc-run" onclick="calcTrigRatios()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Calcular razones</button>
  </div>
  <div id="trigTri" style="display:none">
    <div class="calc-intro" style="margin-top:0">Lados <b>a, b, c</b> y ángulos opuestos <b>A, B, C</b> (en grados). Completá los que conozcas (mín. 3, con un lado).</div>
    <div class="calc-grid cols3">
      <div class="cfield"><label>Lado a</label><input type="text" id="triA"></div>
      <div class="cfield"><label>Lado b</label><input type="text" id="triB"></div>
      <div class="cfield"><label>Lado c</label><input type="text" id="triC"></div>
      <div class="cfield"><label>Ángulo A°</label><input type="text" id="triAA"></div>
      <div class="cfield"><label>Ángulo B°</label><input type="text" id="triBB"></div>
      <div class="cfield"><label>Ángulo C°</label><input type="text" id="triCC"></div>
    </div>
    <button class="calc-run" onclick="calcTriangle()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Resolver triángulo</button>
  </div>
  <div id="calcSlot"></div>`;

/* ---------- GEOMETRÍA ---------- */
const GEO={
  cuadrado:{label:'Cuadrado',f:['Lado'],calc:v=>({'Área':v[0]**2,'Perímetro':4*v[0],'Diagonal':v[0]*Math.SQRT2})},
  rectangulo:{label:'Rectángulo',f:['Base','Altura'],calc:v=>({'Área':v[0]*v[1],'Perímetro':2*(v[0]+v[1]),'Diagonal':Math.hypot(v[0],v[1])})},
  triangulo:{label:'Triángulo (base y altura)',f:['Base','Altura'],calc:v=>({'Área':v[0]*v[1]/2})},
  triangulo3:{label:'Triángulo (3 lados)',f:['Lado a','Lado b','Lado c'],calc:v=>{const s=(v[0]+v[1]+v[2])/2;return{'Área':Math.sqrt(s*(s-v[0])*(s-v[1])*(s-v[2])),'Perímetro':v[0]+v[1]+v[2]};}},
  circulo:{label:'Círculo',f:['Radio'],calc:v=>({'Área':Math.PI*v[0]**2,'Perímetro (circunf.)':2*Math.PI*v[0],'Diámetro':2*v[0]})},
  trapecio:{label:'Trapecio',f:['Base mayor','Base menor','Altura'],calc:v=>({'Área':(v[0]+v[1])/2*v[2]})},
  rombo:{label:'Rombo (diagonales)',f:['Diagonal mayor','Diagonal menor'],calc:v=>({'Área':v[0]*v[1]/2})},
  poligono:{label:'Polígono regular',f:['N° de lados','Longitud del lado'],calc:v=>({'Área':(v[0]*v[1]**2)/(4*Math.tan(Math.PI/v[0])),'Perímetro':v[0]*v[1]})},
  cubo:{label:'Cubo',f:['Arista'],calc:v=>({'Volumen':v[0]**3,'Área total':6*v[0]**2,'Diagonal':v[0]*Math.sqrt(3)})},
  prisma:{label:'Prisma rectangular',f:['Largo','Ancho','Alto'],calc:v=>({'Volumen':v[0]*v[1]*v[2],'Área total':2*(v[0]*v[1]+v[1]*v[2]+v[0]*v[2])})},
  esfera:{label:'Esfera',f:['Radio'],calc:v=>({'Volumen':4/3*Math.PI*v[0]**3,'Área':4*Math.PI*v[0]**2})},
  cilindro:{label:'Cilindro',f:['Radio','Altura'],calc:v=>({'Volumen':Math.PI*v[0]**2*v[1],'Área total':2*Math.PI*v[0]*(v[0]+v[1])})},
  cono:{label:'Cono',f:['Radio','Altura'],calc:v=>{const g=Math.hypot(v[0],v[1]);return{'Volumen':1/3*Math.PI*v[0]**2*v[1],'Área total':Math.PI*v[0]*(v[0]+g),'Generatriz':g};}},
  piramide:{label:'Pirámide de base cuadrada',f:['Lado de la base','Altura'],calc:v=>({'Volumen':1/3*v[0]**2*v[1]})}
};
function geoFields(){
  const k=document.getElementById('geoSel').value,cfg=GEO[k];
  document.getElementById('geoInputs').innerHTML=cfg.f.map((label,i)=>`<div class="cfield"><label>${label}</label><input type="text" id="geo${i}" placeholder="0"></div>`).join('');
  document.getElementById('geoInputs').className='calc-grid '+(cfg.f.length>=3?'cols3':'cols2');
  document.getElementById('calcSlot').innerHTML='';
}
function calcGeo(){
  const k=document.getElementById('geoSel').value,cfg=GEO[k];
  const vals=cfg.f.map((_,i)=>parseFloat(document.getElementById('geo'+i).value));
  if(vals.some(v=>isNaN(v)||v<=0))return show(errBox('Completá todas las medidas con números positivos.'));
  const res=cfg.calc(vals);
  const rows=Object.entries(res).map(([k2,v])=>`<tr><td>${k2}</td><td>${roundNum(v,4)}</td></tr>`).join('');
  const first=Object.entries(res)[0];
  const send=cfg.label+': '+Object.entries(res).map(([k2,v])=>k2+'='+roundNum(v,3)).join(', ');
  show(`<div class="calc-result show"><div class="cr-label">${cfg.label}</div><table class="stat-table">${rows}</table><div class="cr-foot"><button class="send" onclick="sendToBoard(\`${send}\`)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>Enviar a la pizarra</button></div></div>`);
}
TABS_GEO=()=>`
  <div class="calc-intro">Elegí una figura o cuerpo y cargá sus medidas para obtener área, perímetro, volumen y más.</div>
  <div class="cfield" style="margin-bottom:14px"><label>Figura o cuerpo</label><select id="geoSel" onchange="geoFields()">
    <optgroup label="Figuras planas">${Object.entries(GEO).slice(0,8).map(([k,c])=>`<option value="${k}">${c.label}</option>`).join('')}</optgroup>
    <optgroup label="Cuerpos">${Object.entries(GEO).slice(8).map(([k,c])=>`<option value="${k}">${c.label}</option>`).join('')}</optgroup>
  </select></div>
  <div class="calc-grid cols2" id="geoInputs"></div>
  <button class="calc-run" onclick="calcGeo()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Calcular</button>
  <div id="calcSlot"></div>`;

/* ---------- FUNCIONES ESPECIALES (probabilidad) ---------- */
function erf(x){const s=x<0?-1:1;x=Math.abs(x);const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;const t=1/(1+p*x);const y=1-(((((a5*t+a4)*t)+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);return s*y;}
function normalCDF(x,mu=0,sd=1){return 0.5*(1+erf((x-mu)/(sd*Math.SQRT2)));}
function normalInv(p,mu=0,sd=1){if(p<=0)return -Infinity;if(p>=1)return Infinity;const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];const d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];const pl=0.02425,ph=1-pl;let q,r,z;if(p<pl){q=Math.sqrt(-2*Math.log(p));z=(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}else if(p<=ph){q=p-0.5;r=q*q;z=(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}else{q=Math.sqrt(-2*Math.log(1-p));z=-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}return mu+sd*z;}
function lgamma(x){const g=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];if(x<0.5)return Math.log(Math.PI/Math.sin(Math.PI*x))-lgamma(1-x);x-=1;let a=0.99999999999980993;const t=x+7.5;for(let i=0;i<g.length;i++)a+=g[i]/(x+i+1);return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(a);}
function logComb(n,k){return lgamma(n+1)-lgamma(k+1)-lgamma(n-k+1);}
function comb(n,k){if(k<0||k>n)return 0;return Math.round(Math.exp(logComb(n,k)));}
function perm(n,k){if(k<0||k>n)return 0;return Math.round(Math.exp(lgamma(n+1)-lgamma(n-k+1)));}
function binomPMF(n,k,p){if(k<0||k>n)return 0;return Math.exp(logComb(n,k)+k*Math.log(p)+(n-k)*Math.log(1-p));}
function binomCDF(n,k,p){let s=0;for(let i=0;i<=k;i++)s+=binomPMF(n,i,p);return s;}
function poissonPMF(l,k){return Math.exp(-l+k*Math.log(l)-lgamma(k+1));}
function poissonCDF(l,k){let s=0;for(let i=0;i<=k;i++)s+=poissonPMF(l,i);return s;}
function betacf(a,b,x){const fpmin=1e-30;let qab=a+b,qap=a+1,qam=a-1;let c=1,d=1-qab*x/qap;if(Math.abs(d)<fpmin)d=fpmin;d=1/d;let h=d;for(let m=1;m<=200;m++){let m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<fpmin)d=fpmin;c=1+aa/c;if(Math.abs(c)<fpmin)c=fpmin;d=1/d;h*=d*c;aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<fpmin)d=fpmin;c=1+aa/c;if(Math.abs(c)<fpmin)c=fpmin;d=1/d;let del=d*c;h*=del;if(Math.abs(del-1)<3e-7)break;}return h;}
function ibeta(x,a,b){if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(lgamma(a+b)-lgamma(a)-lgamma(b)+a*Math.log(x)+b*Math.log(1-x));if(x<(a+1)/(a+b+2))return bt*betacf(a,b,x)/a;return 1-bt*betacf(b,a,1-x)/b;}
function tCDF(t,df){const x=df/(df+t*t);const ib=0.5*ibeta(x,df/2,0.5);return t>0?1-ib:ib;}
function tInv(p,df){let lo=-1000,hi=1000;for(let i=0;i<200;i++){const mid=(lo+hi)/2;if(tCDF(mid,df)<p)lo=mid;else hi=mid;}return (lo+hi)/2;}

/* ---------- ESTADÍSTICA ---------- */
function gv(id){const el=document.getElementById(id);return el?el.value.trim():'';}
function statResult(title,rows,send){
  return `<div class="calc-result show"><div class="cr-label">${title}</div><table class="stat-table">${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table><div class="cr-foot"><button class="send" onclick="sendToBoard(\`${String(send).replace(/`/g,'')}\`)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>Enviar a la pizarra</button></div></div>`;
}
const RST=x=>roundNum(x,6);
function calcStatResumen(){
  const raw=gv('statData');
  const nums=raw.split(/[\s,;]+/).map(Number).filter(x=>!isNaN(x));
  if(nums.length<1)return show(errBox('Cargá una lista de números separados por coma, espacio o salto de línea.'));
  const n=nums.length, sum=nums.reduce((a,b)=>a+b,0), mean=sum/n;
  const sorted=[...nums].sort((a,b)=>a-b);
  const median=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2;
  const freq={}; nums.forEach(x=>freq[x]=(freq[x]||0)+1);
  const maxF=Math.max(...Object.values(freq));
  const modes=Object.keys(freq).filter(k=>freq[k]===maxF);
  const mode=(modes.length===Object.keys(freq).length)?'—':modes.join(', ');
  const varP=nums.reduce((a,b)=>a+(b-mean)**2,0)/n;
  const varM=n>1?nums.reduce((a,b)=>a+(b-mean)**2,0)/(n-1):0;
  const q=(p)=>{const i=p*(n-1),lo=Math.floor(i),hi=Math.ceil(i);return sorted[lo]+(sorted[hi]-sorted[lo])*(i-lo);};
  const Q1=q(.25),Q3=q(.75);const R=x=>roundNum(x,4);
  const rows=[['Cantidad (n)',n],['Suma',R(sum)],['Media',R(mean)],['Mediana',R(median)],['Moda',mode],['Mínimo',R(sorted[0])],['Máximo',R(sorted[n-1])],['Rango',R(sorted[n-1]-sorted[0])],['Q1',R(Q1)],['Q3',R(Q3)],['Rango intercuartil',R(Q3-Q1)],['Varianza poblacional σ²',R(varP)],['Desvío poblacional σ',R(Math.sqrt(varP))],['Varianza muestral s²',R(varM)],['Desvío muestral s',R(Math.sqrt(varM))]];
  show(statResult('Resumen estadístico',rows,'n='+n+', media='+R(mean)+', mediana='+R(median)+', σ='+R(Math.sqrt(varP))));
}
function calcBinom(){
  const n=parseInt(gv('biN')),p=parseFloat(gv('biP')),k=parseInt(gv('biK'));
  if(isNaN(n)||n<0||isNaN(p)||p<0||p>1||isNaN(k))return show(errBox('Revisá n (entero ≥ 0), p (entre 0 y 1) y k.'));
  const pmf=binomPMF(n,k,p),le=binomCDF(n,k,p),ge=k>0?1-binomCDF(n,k-1,p):1,mu=n*p,va=n*p*(1-p);
  const rows=[['P(X = '+k+')',RST(pmf)],['P(X ≤ '+k+')',RST(le)],['P(X ≥ '+k+')',RST(ge)],['Media  μ = n·p',RST(mu)],['Varianza  σ² = n·p·q',RST(va)],['Desvío  σ',RST(Math.sqrt(va))]];
  show(statResult('Binomial  B(n='+n+', p='+p+')',rows,'Binomial n='+n+' p='+p+': P(X='+k+')='+RST(pmf)));
}
function calcPoisson(){
  const l=parseFloat(gv('poL')),k=parseInt(gv('poK'));
  if(isNaN(l)||l<=0||isNaN(k)||k<0)return show(errBox('Revisá λ (> 0) y k (entero ≥ 0).'));
  const pmf=poissonPMF(l,k),le=poissonCDF(l,k),ge=k>0?1-poissonCDF(l,k-1):1;
  const rows=[['P(X = '+k+')',RST(pmf)],['P(X ≤ '+k+')',RST(le)],['P(X ≥ '+k+')',RST(ge)],['Media  μ = λ',RST(l)],['Varianza  σ² = λ',RST(l)],['Desvío  σ',RST(Math.sqrt(l))]];
  show(statResult('Poisson  (λ = '+l+')',rows,'Poisson λ='+l+': P(X='+k+')='+RST(pmf)));
}
function calcNormal(){
  const mu=parseFloat(gv('noMu')),sd=parseFloat(gv('noSd')),x=gv('noX'),x2=gv('noX2'),pp=gv('noP');
  if(isNaN(mu)||isNaN(sd)||sd<=0)return show(errBox('Indicá media μ y desvío σ (> 0).'));
  let rows,send='Normal μ='+mu+' σ='+sd;
  if(pp!==''){const P=parseFloat(pp);if(isNaN(P)||P<=0||P>=1)return show(errBox('La probabilidad debe estar entre 0 y 1.'));
    const xv=normalInv(P,mu,sd);rows=[['Probabilidad acumulada',P],['Valor x (percentil)',RST(xv)],['z correspondiente',RST(normalInv(P))]];send+=': P'+P+' → x='+RST(xv);
  }else if(x!==''){const xv=parseFloat(x),z=(xv-mu)/sd;
    if(x2!==''){const x2v=parseFloat(x2),lo=Math.min(xv,x2v),hi=Math.max(xv,x2v),pb=normalCDF(hi,mu,sd)-normalCDF(lo,mu,sd);
      rows=[['z de '+xv,RST(z)],['P('+lo+' ≤ X ≤ '+hi+')',RST(pb)]];send+=': P('+lo+'≤X≤'+hi+')='+RST(pb);
    }else{rows=[['z = (x−μ)/σ',RST(z)],['P(X ≤ '+xv+')',RST(normalCDF(xv,mu,sd))],['P(X ≥ '+xv+')',RST(1-normalCDF(xv,mu,sd))]];send+=': P(X≤'+xv+')='+RST(normalCDF(xv,mu,sd));}
  }else return show(errBox('Ingresá un valor x (y opcionalmente x₂), o una probabilidad para el percentil.'));
  show(statResult('Distribución normal',rows,send));
}
function calcT(){
  const df=parseInt(gv('tDf')),tv=gv('tT'),al=gv('tAlpha');
  if(isNaN(df)||df<1)return show(errBox('Indicá los grados de libertad (entero ≥ 1).'));
  let rows,send='t Student gl='+df;
  if(tv!==''){const t=parseFloat(tv),le=tCDF(t,df),ge=1-le,two=2*(1-tCDF(Math.abs(t),df));
    rows=[['P(T ≤ '+t+')',RST(le)],['P(T ≥ '+t+')',RST(ge)],['P(|T| ≥ '+Math.abs(t)+')  (dos colas)',RST(two)]];send+=': P(T≤'+t+')='+RST(le);
  }else if(al!==''){const a=parseFloat(al);if(isNaN(a)||a<=0||a>=1)return show(errBox('α debe estar entre 0 y 1.'));
    rows=[['t crítico  una cola (α='+a+')',RST(tInv(1-a,df))],['t crítico  dos colas (α='+a+')','± '+RST(tInv(1-a/2,df))]];send+=': t crítico una cola='+RST(tInv(1-a,df));
  }else return show(errBox('Ingresá un valor t, o un α para el valor crítico.'));
  show(statResult('t de Student',rows,send));
}
function calcComb(){
  const n=parseInt(gv('cbN')),k=parseInt(gv('cbK'));
  if(isNaN(n)||isNaN(k)||n<0||k<0)return show(errBox('Indicá n y k (enteros ≥ 0).'));
  if(k>n)return show(errBox('k no puede ser mayor que n.'));
  const fac=m=>{const v=Math.exp(lgamma(m+1));return isFinite(v)?(v>1e15?v.toExponential(4):Math.round(v)):'∞';};
  const rows=[['Combinaciones  C('+n+','+k+')',comb(n,k)],['Variaciones  V('+n+','+k+')',perm(n,k)],[n+'!',fac(n)],[k+'!',fac(k)]];
  show(statResult('Combinatoria',rows,'C('+n+','+k+')='+comb(n,k)+', V('+n+','+k+')='+perm(n,k)));
}
const RUN=fn=>`<button class="calc-run" onclick="${fn}()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>Calcular</button>`;
const STATVIEWS={
  resumen:()=>`<div class="calc-intro">Datos separados por coma, espacio o salto de línea. Tendencia central y dispersión.</div><div class="cfield"><label>Datos</label><textarea id="statData" placeholder="Ej. 8, 6, 7, 9, 10, 6, 8, 7"></textarea></div>${RUN('calcStatResumen')}`,
  binomial:()=>`<div class="calc-intro">B(n, p): n ensayos independientes, probabilidad p de éxito, k éxitos.</div><div class="calc-grid cols3"><div class="cfield"><label>n (ensayos)</label><input type="text" id="biN" placeholder="10"></div><div class="cfield"><label>p (éxito)</label><input type="text" id="biP" placeholder="0.5"></div><div class="cfield"><label>k (éxitos)</label><input type="text" id="biK" placeholder="3"></div></div>${RUN('calcBinom')}`,
  poisson:()=>`<div class="calc-intro">Poisson: λ = promedio de ocurrencias por intervalo, k ocurrencias.</div><div class="calc-grid cols2"><div class="cfield"><label>λ (media)</label><input type="text" id="poL" placeholder="3"></div><div class="cfield"><label>k</label><input type="text" id="poK" placeholder="2"></div></div>${RUN('calcPoisson')}`,
  normal:()=>`<div class="calc-intro">Distribución normal N(μ, σ). Cargá x para probabilidades; x y x₂ para el área entre ambos; o una probabilidad p para el percentil.</div><div class="calc-grid cols2"><div class="cfield"><label>Media μ</label><input type="text" id="noMu" placeholder="0"></div><div class="cfield"><label>Desvío σ</label><input type="text" id="noSd" placeholder="1"></div></div><div class="calc-grid cols3"><div class="cfield"><label>x</label><input type="text" id="noX" placeholder="1.96"></div><div class="cfield"><label>x₂ (opcional)</label><input type="text" id="noX2"></div><div class="cfield"><label>p (percentil)</label><input type="text" id="noP" placeholder="0.975"></div></div>${RUN('calcNormal')}`,
  tstudent:()=>`<div class="calc-intro">t de Student. Cargá un valor t para sus probabilidades, o un α para el valor crítico (intervalos de confianza).</div><div class="calc-grid cols3"><div class="cfield"><label>Grados libertad</label><input type="text" id="tDf" placeholder="10"></div><div class="cfield"><label>t (opcional)</label><input type="text" id="tT" placeholder="2.228"></div><div class="cfield"><label>α (opcional)</label><input type="text" id="tAlpha" placeholder="0.05"></div></div>${RUN('calcT')}`,
  combinatoria:()=>`<div class="calc-intro">Combinaciones, variaciones y factoriales.</div><div class="calc-grid cols2"><div class="cfield"><label>n</label><input type="text" id="cbN" placeholder="10"></div><div class="cfield"><label>k</label><input type="text" id="cbK" placeholder="3"></div></div>${RUN('calcComb')}`
};
function statMode(){
  const m=document.getElementById('statTipo').value;
  document.getElementById('statBody').innerHTML=STATVIEWS[m]();
  const slot=document.getElementById('calcSlot');if(slot)slot.innerHTML='';
}
TABS_STAT=()=>`
  <div class="cfield" style="margin-bottom:14px"><label>Tipo de cálculo</label><select id="statTipo" onchange="statMode()">
    <option value="resumen">Resumen de datos</option>
    <option value="binomial">Distribución binomial</option>
    <option value="poisson">Distribución de Poisson</option>
    <option value="normal">Distribución normal</option>
    <option value="tstudent">t de Student</option>
    <option value="combinatoria">Combinatoria</option>
  </select></div>
  <div id="statBody"></div>
  <div id="calcSlot"></div>`;


/* ---------- POLINOMIOS ---------- */
let activeCalcInput=null;
function insActive(txt){ if(activeCalcInput)ins(activeCalcInput,txt); }
function polyCoeffsAsc(P){
  const s=nd('coeffs('+P+',x)').toString().replace(/^\[|\]$/g,'');
  return s.split(',').map(t=>parseFloat(nd(t.trim()).evaluate().text('decimals')));
}
function polyDivide(Pc,Dc){
  const r=Pc.slice(),dq=Pc.length-Dc.length;
  if(dq<0)return{Q:[0],R:Pc.slice()};
  const q=new Array(dq+1).fill(0);
  for(let i=0;i<=dq;i++){const c=r[i]/Dc[0];q[i]=c;for(let j=0;j<Dc.length;j++)r[i+j]-=c*Dc[j];}
  return {Q:q,R:r.slice(dq+1)};
}
function polyToStr(c){
  const n=c.length,terms=[];
  for(let i=0;i<n;i++){let coef=Math.round(c[i]*1e6)/1e6;if(Math.abs(coef)<1e-9)continue;const p=n-1-i,cs=Math.abs(coef);
    let term=(cs===1&&p>0)?'':String(cs);if(p>0)term+='x'+(p>1?sup(p):'');
    terms.push((coef<0?'−':(terms.length?'+':''))+(term||'0'));}
  if(!terms.length)return '0';
  return terms.map((t,i)=>i===0?t.replace('−','−'):t.replace(/^([+−])/,' $1 ')).join('');
}
function polyStd(expr){ try{return polyToStr(polyCoeffsAsc(expr).slice().reverse());}catch(e){return pretty(nd('expand('+expr+')').toString());} }
function strip(a){while(a.length>1&&Math.abs(a[0])<1e-9)a.shift();return a;}

function calcPolyAnalizar(){
  const P=gv('polyP'); if(!P)return show(errBox('Escribí un polinomio en x.'));
  try{
    const exp=polyStd(P);
    const fac=pretty(nd('factor('+P+')').toString());
    const der=polyStd(nd('diff('+P+',x)').toString());
    let grado; try{grado=nd('deg('+P+',x)').toString();}catch(e){grado='—';}
    let raices; try{const r=nd('solve('+P+'=0,x)').toString().replace(/^\[|\]$/g,'');raices=r?r.split(',').map(s=>pretty(s.trim())).join(';   '):'sin raíces reales';}catch(e){raices='—';}
    const rows=[['Grado',grado],['Forma ordenada',exp],['Factorizado',fac],['Raíces (P = 0)',raices],['Derivada  P′(x)',der]];
    const a=gv('polyEval');
    if(a!==''){try{const v=roundNum(nd(P).sub('x',a).evaluate().text('decimals'),6);rows.push(['P('+a+')',v]);}catch(e){}}
    show(statResult('Análisis del polinomio',rows,'P(x) = '+exp));
  }catch(e){show(errBox('No pude analizarlo. Usá x, ^ para potencias y * para multiplicar (ej. x^2-4).'));}
}
function calcPolyOperar(){
  const P=gv('poP'),Q=gv('poQ');
  if(!P||!Q)return show(errBox('Escribí los dos polinomios P y Q.'));
  try{
    const suma=polyStd(nd('expand(('+P+')+('+Q+'))').toString());
    const resta=polyStd(nd('expand(('+P+')-('+Q+'))').toString());
    const prod=polyStd(nd('expand(('+P+')*('+Q+'))').toString());
    let divTxt='—';
    try{
      const Pc=strip(polyCoeffsAsc(P).slice().reverse()),Dc=strip(polyCoeffsAsc(Q).slice().reverse());
      if(!(Dc.length===1&&Math.abs(Dc[0])<1e-9)){const {Q:qq,R:rr}=polyDivide(Pc,Dc);divTxt='cociente '+polyToStr(qq)+'   ·   resto '+polyToStr(rr);}
    }catch(e){}
    const rows=[['P + Q',suma],['P − Q',resta],['P · Q',prod],['P ÷ Q',divTxt]];
    show(statResult('Operaciones con polinomios',rows,'P·Q = '+prod));
  }catch(e){show(errBox('Revisá P y Q (polinomios en x, con ^ y *).'));}
}
function ndStr(expr){try{return pretty(nd('expand('+expr+')').toString());}catch(e){return pretty(expr);}}
function splitTerms(s){s=s.replace(/\s/g,'');const terms=[];let depth=0,cur='';for(let i=0;i<s.length;i++){const ch=s[i];if(ch==='(')depth++;else if(ch===')')depth--;if((ch==='+'||ch==='-')&&depth===0&&i>0){terms.push(cur);cur=ch;}else cur+=ch;}if(cur)terms.push(cur);return terms;}
function isPerfectSq(n){const r=Math.round(Math.sqrt(Math.abs(n)));return r*r===Math.abs(n)?r:null;}
function stepsResult(subtitle,steps,finalExpr,send){
  return `<div class="calc-result show"><div class="cr-label">${subtitle}</div>
    <div class="steps">${steps.map((s,i)=>`<div class="stp"><span class="sn">${i+1}</span><div class="sc"><div class="st">${s.t}</div><div class="se">${s.e}</div></div></div>`).join('')}</div>
    <div class="cr-final"><small>Resultado</small>${finalExpr}</div>
    <div class="cr-foot"><button onclick="copyText(\`${String(send).replace(/`/g,'')}\`)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copiar</button><button class="send" onclick="sendToBoard(\`${String(send).replace(/`/g,'')}\`)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>Enviar a la pizarra</button></div></div>`;
}
function calcNotable(){
  const e=gv('notExpr'); if(!e)return show(errBox('Escribí un producto (ej. (x+3)^2) o un polinomio (ej. x^2-9).'));
  const c=e.replace(/\s+/g,'');
  let exp; try{exp=nd('expand('+e+')');}catch(err){return show(errBox('Revisá la expresión (usá ^ y paréntesis).'));}
  const des=polyStd(exp.toString());
  let coef=[];try{coef=polyCoeffsAsc(exp.toString());}catch(_){}
  let m,steps=null,subtitle='Producto notable';
  try{
    if(m=c.match(/^\((.+)\)\^2$/)){
      subtitle='Producto notable · Cuadrado de un binomio';const tt=splitTerms(m[1]);
      if(tt.length===2){const a=tt[0],b=tt[1];
        steps=[{t:'Fórmula del cuadrado de un binomio',e:'(a + b)² = a² + 2·a·b + b²'},
          {t:'Identifico los términos',e:'a = '+pretty(a)+'      b = '+pretty(b)},
          {t:'Sustituyo en la fórmula',e:'('+pretty(a)+')² + 2·('+pretty(a)+')·('+pretty(b)+') + ('+pretty(b)+')²'},
          {t:'Resuelvo cada término',e:ndStr('('+a+')^2')+'   ·   '+ndStr('2*('+a+')*('+b+')')+'   ·   '+ndStr('('+b+')^2')}];
      }
    } else if(m=c.match(/^\((.+)\)\^3$/)){
      subtitle='Producto notable · Cubo de un binomio';const tt=splitTerms(m[1]);
      if(tt.length===2){const a=tt[0],b=tt[1];
        steps=[{t:'Fórmula del cubo de un binomio',e:'(a + b)³ = a³ + 3·a²·b + 3·a·b² + b³'},
          {t:'Identifico los términos',e:'a = '+pretty(a)+'      b = '+pretty(b)},
          {t:'Resuelvo cada término',e:ndStr('('+a+')^3')+'  ·  '+ndStr('3*('+a+')^2*('+b+')')+'  ·  '+ndStr('3*('+a+')*('+b+')^2')+'  ·  '+ndStr('('+b+')^3')}];
      }
    } else if(m=c.match(/^\(([^()]+)\)\*?\(([^()]+)\)$/)){
      const f1=splitTerms(m[1]),f2=splitTerms(m[2]);
      if(coef.length===3&&Math.abs(coef[1])<1e-9&&f1.length===2){
        subtitle='Producto notable · Suma por diferencia';const a=f1[0],b=(f1[1]||'').replace(/^\+/,'');
        steps=[{t:'Fórmula de la suma por diferencia',e:'(a + b)(a − b) = a² − b²'},
          {t:'Identifico',e:'a = '+pretty(a)+'      b = '+pretty(b)},
          {t:'Aplico la fórmula',e:'('+pretty(a)+')² − ('+pretty(b)+')²'}];
      } else {
        subtitle='Producto notable · Producto de dos binomios';
        steps=[{t:'Fórmula (binomios con término común)',e:'(x + a)(x + b) = x² + (a + b)·x + a·b'},
          {t:'Aplico la distributiva',e:pretty(m[1])+' · '+pretty(m[2])}];
      }
    } else {
      // FACTORIZACIÓN (camino inverso)
      let fac=''; try{fac=nd('factor('+e+')').toString();}catch(_){}
      const fc=fac.replace(/\s/g,'');
      if(coef.length===3&&Math.abs(coef[1])<1e-9&&coef[0]*coef[2]<0){
        subtitle='Producto notable · Diferencia de cuadrados';const ra=isPerfectSq(coef[2]),rb=isPerfectSq(coef[0]);
        if(ra&&rb){const aS=(ra===1?'x':ra+'x'),bS=''+rb;
          steps=[{t:'Reconozco una diferencia de cuadrados',e:des},
            {t:'Saco la raíz de cada término',e:'a = '+aS+'      b = '+bS},
            {t:'Fórmula',e:'a² − b² = (a + b)(a − b)'},
            {t:'Escribo los factores',e:'('+aS+' + '+bS+')·('+aS+' − '+bS+')'}];
        } else steps=[{t:'Diferencia de cuadrados',e:'a² − b² = (a + b)(a − b)'}];
        return show(stepsResult(subtitle,steps,pretty(fac),pretty(fac)));
      } else if(/\)\^2$/.test(fc)||/^\([^()]+\)\^2$/.test(fc)){
        subtitle='Producto notable · Trinomio cuadrado perfecto';const ra=isPerfectSq(coef[2]),rb=isPerfectSq(coef[0]);
        if(ra&&rb){const aS=(ra===1?'x':ra+'x'),bS=''+rb,signo=coef[1]<0?'−':'+';
          steps=[{t:'Reconozco un trinomio cuadrado perfecto',e:des},
            {t:'Raíz de los términos extremos',e:'a = '+aS+'      b = '+bS},
            {t:'Verifico el término del medio',e:'2·a·b = '+ndStr('2*('+aS+')*'+rb)},
            {t:'Fórmula',e:'a² ± 2·a·b + b² = (a ± b)²'},
            {t:'Escribo el resultado',e:'('+aS+' '+signo+' '+bS+')²'}];
        } else steps=[{t:'Trinomio cuadrado perfecto',e:'(a ± b)²'}];
        return show(stepsResult(subtitle,steps,pretty(fac),pretty(fac)));
      } else {
        return show(stepsResult('Factorización',[{t:'Parto del polinomio',e:des},{t:'Factorizo',e:pretty(fac)||'—'}],pretty(fac)||des,pretty(fac)||des));
      }
    }
  }catch(err){}
  if(!steps)steps=[{t:'Desarrollo',e:pretty(e)}];
  show(stepsResult(subtitle,steps,des,des));
}
const POLYVIEWS={
  uno:()=>`<div class="calc-intro">Escribí un polinomio en x. Obtenés grado, forma ordenada, factorización, raíces y derivada de una sola vez.</div>
    <div class="cfield"><label>Polinomio P(x)</label><input type="text" id="polyP" placeholder="x^3 - 2x^2 + x - 2" onfocus="activeCalcInput='polyP'" onkeydown="if(event.key==='Enter')calcPolyAnalizar()"></div>
    <div class="cfield"><label>Evaluar en x = (opcional)</label><input type="text" id="polyEval" placeholder="2" onfocus="activeCalcInput='polyEval'"></div>
    ${RUN('calcPolyAnalizar')}`,
  dos:()=>`<div class="calc-intro">Escribí dos polinomios en x. Obtenés suma, resta, producto y división (cociente y resto).</div>
    <div class="cfield"><label>P(x)</label><input type="text" id="poP" placeholder="x^2 + 3x + 2" onfocus="activeCalcInput='poP'"></div>
    <div class="cfield"><label>Q(x)</label><input type="text" id="poQ" placeholder="x + 1" onfocus="activeCalcInput='poQ'" onkeydown="if(event.key==='Enter')calcPolyOperar()"></div>
    ${RUN('calcPolyOperar')}`,
  notable:()=>`<div class="calc-intro">Desarrollá un producto notable (ej. <b>(x+3)^2</b>, <b>(2x-1)^3</b>, <b>(x+5)(x-5)</b>) o escribí un polinomio para reconocerlo y factorizarlo (ej. <b>x^2-9</b>).</div>
    <div class="cfield"><label>Expresión</label><input type="text" id="notExpr" placeholder="(x + 3)^2" onfocus="activeCalcInput='notExpr'" onkeydown="if(event.key==='Enter')calcNotable()"></div>
    ${RUN('calcNotable')}`
};
function polyMode(){document.getElementById('polyBody').innerHTML=POLYVIEWS[document.getElementById('polySel').value]();const s=document.getElementById('calcSlot');if(s)s.innerHTML='';}
const POLYKEYS=[['x','x'],['x²','x^2'],['x³','x^3'],['^','^'],['(','('],[')',')'],['+','+'],['−','-'],['·','*'],['/','/'],['√','sqrt(']];
TABS_POLY=()=>`
  <div class="cfield" style="margin-bottom:12px"><label>Modo</label><select id="polySel" onchange="polyMode()">
    <option value="uno">Analizar un polinomio</option>
    <option value="dos">Operar dos polinomios</option>
    <option value="notable">Productos notables</option></select></div>
  <div id="polyBody"></div>
  <div class="calc-keys" style="margin-top:4px">${POLYKEYS.map(([lbl,v])=>`<button onclick="insActive('${v}')">${lbl}</button>`).join('')}</div>
  <div id="calcSlot"></div>`;


/* ===== Graficador de funciones ===== */
let _graphState=null;
function TABS_FUNC(){ return `
  <div class="calc-intro">Escribí una o varias funciones de x separadas por ";". Ej: x^2-3x+1 ; sin(x)</div>
  <div class="cfield"><label>Funciones f(x)</label><input id="gFx" value="x^2-3x+1" placeholder="x^2-3x+1 ; sin(x)"></div>
  <div class="cols2">
    <div class="cfield"><label>x mínimo</label><input id="gXmin" value="-10"></div>
    <div class="cfield"><label>x máximo</label><input id="gXmax" value="10"></div>
  </div>
  <button class="calc-run" onclick="drawGraph()">Graficar</button>
  <canvas id="gCanvas" style="width:100%;height:340px;margin-top:12px;border:1px solid var(--line);border-radius:12px;background:#fff;display:block"></canvas>
  <div id="gLegend" style="margin-top:8px;font-size:.8rem;color:var(--ink-soft)"></div>
  <button class="calc-run" style="background:var(--teal);margin-top:10px" onclick="sendGraphToBoard()">Enviar gráfico a la pizarra</button>`;
}
function graphInit(){ setTimeout(drawGraph,30); }
function _prepExpr(s){ return s.replace(/\)\s*\(/g,')*(').replace(/(\d)\s*([a-zA-Z(])/g,'$1*$2'); }
function _niceStep(r){ if(!(r>0))return 1; const p=Math.pow(10,Math.floor(Math.log10(r))); const n=r/p; let m; if(n<1.5)m=1; else if(n<3)m=2; else if(n<7)m=5; else m=10; return m*p; }
function _fmt(v){ v=Math.round(v*1000)/1000; return ''+v; }
function drawGraph(){
  ensureNerdamer();
  const cv=document.getElementById('gCanvas'); if(!cv)return;
  const raw=((document.getElementById('gFx')||{}).value||'').split(';').map(s=>s.trim()).filter(Boolean);
  let xmin=parseFloat(document.getElementById('gXmin').value), xmax=parseFloat(document.getElementById('gXmax').value);
  if(!isFinite(xmin)||!isFinite(xmax)||xmin>=xmax){xmin=-10;xmax=10;}
  const dpr=window.devicePixelRatio||1, W=cv.clientWidth||600, H=cv.clientHeight||340;
  cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  const cols=['#1b6ec2','#e5604a','#17a398','#7a5cc4','#e0a53a'];
  const N=600, series=[];
  raw.forEach((ex,idx)=>{ let fn=null; const E=_prepExpr(ex);
    try{ fn=nd(E).buildFunction(['x']); }
    catch(e){ try{ fn=v=>parseFloat(nd(E).sub('x',String(v)).evaluate().text('decimals')); }catch(_){ fn=null; } }
    if(!fn)return;
    const pts=[]; for(let i=0;i<=N;i++){ const x=xmin+(xmax-xmin)*i/N; let y; try{y=fn(x);}catch(_){y=NaN;} pts.push([x,(typeof y==='number'&&isFinite(y))?y:NaN]); }
    series.push({ex,pts,col:cols[idx%cols.length]});
  });
  let ys=[]; series.forEach(s=>s.pts.forEach(p=>{ if(isFinite(p[1]))ys.push(p[1]); }));
  let ymin=-10,ymax=10;
  if(ys.length){ ys.sort((a,b)=>a-b); let lo=ys[Math.floor(ys.length*0.02)], hi=ys[Math.floor(ys.length*0.98)];
    ymin=Math.min(lo,0); ymax=Math.max(hi,0); if(ymin===ymax){ymin-=1;ymax+=1;} const pad=(ymax-ymin)*0.08; ymin-=pad; ymax+=pad; }
  const X=x=>(x-xmin)/(xmax-xmin)*W, Y=y=>H-(y-ymin)/(ymax-ymin)*H;
  g.clearRect(0,0,W,H);
  g.strokeStyle='#eef3f8'; g.lineWidth=1; g.fillStyle='#8aa0b5'; g.font='11px Inter,sans-serif'; g.textBaseline='top';
  const sx=_niceStep((xmax-xmin)/10), sy=_niceStep((ymax-ymin)/8);
  for(let x=Math.ceil(xmin/sx)*sx;x<=xmax+1e-9;x+=sx){ const px=X(x); g.beginPath();g.moveTo(px,0);g.lineTo(px,H);g.stroke(); if(Math.abs(x)>1e-9)g.fillText(_fmt(x),px+2,Math.min(H-14,Math.max(2,Y(0)+2))); }
  for(let y=Math.ceil(ymin/sy)*sy;y<=ymax+1e-9;y+=sy){ const py=Y(y); g.beginPath();g.moveTo(0,py);g.lineTo(W,py);g.stroke(); if(Math.abs(y)>1e-9)g.fillText(_fmt(y),Math.min(W-28,Math.max(2,X(0)+3)),py+1); }
  g.strokeStyle='#9db0c2'; g.lineWidth=1.5;
  g.beginPath();g.moveTo(0,Y(0));g.lineTo(W,Y(0));g.stroke();
  g.beginPath();g.moveTo(X(0),0);g.lineTo(X(0),H);g.stroke();
  series.forEach(s=>{ g.strokeStyle=s.col; g.lineWidth=2.2; g.beginPath(); let pen=false,prevY=null;
    s.pts.forEach(p=>{ if(!isFinite(p[1])){pen=false;prevY=null;return;} const px=X(p[0]),py=Y(p[1]);
      if(pen&&prevY!=null&&Math.abs(py-prevY)>H){pen=false;}
      if(!pen){g.moveTo(px,py);pen=true;}else{g.lineTo(px,py);} prevY=py; });
    g.stroke(); });
  _graphState={xmin,xmax,ymin,ymax};
  const L=document.getElementById('gLegend');
  if(L)L.innerHTML=series.map(s=>`<span style="display:inline-flex;align-items:center;gap:6px;margin-right:12px"><span style="width:14px;height:3px;background:${s.col};display:inline-block;border-radius:2px"></span>f(x) = ${s.ex}</span>`).join('') || '<span style="color:var(--warn)">No pude interpretar la función.</span>';
}
function sendGraphToBoard(){
  const cv=document.getElementById('gCanvas'); if(!cv||!cv.width)return;
  setRole('teacher'); calcClose(); pushUndo();
  const r=stage.getBoundingClientRect();
  const w=Math.min(r.width*0.9,640), h=w*(cv.height/cv.width);
  const x=(r.width-w)/2, y=Math.max(20,(r.height-h)/2);
  ctx.globalCompositeOperation='source-over';
  ctx.drawImage(cv,x,y,w,h);
  persistCanvas(); toast('Gráfico enviado a la pizarra');
}


/* ===== Paleta de símbolos ===== */
const SYMCATS={
 'Relaciones':['=','\u2260','<','>','\u2264','\u2265','\u2248','\u2261','\u221d','\u00b1','\u2213'],
 'Operaciones':['+','\u2212','\u00d7','\u00f7','\u00b7','\u221a','\u221b','^','%','\u2030','!'],
 'Conjuntos':['\u2208','\u2209','\u2282','\u2284','\u2286','\u222a','\u2229','\u2205','\u2216','\u2115','\u2124','\u211a','\u211d','\u2102','\u2200','\u2203'],
 'L\u00f3gica':['\u2227','\u2228','\u00ac','\u21d2','\u21d4','\u2234','\u2235',':','\u2237'],
 'Griegas':['\u03b1','\u03b2','\u03b3','\u03b4','\u0394','\u03b5','\u03b8','\u03bb','\u03bc','\u03c0','\u03c1','\u03c3','\u03a3','\u03c6','\u03c9','\u03a9'],
 'C\u00e1lculo':['\u222b','\u222c','\u2202','\u2207','\u2211','\u220f','\u221e','\u2192','lim','dy/dx'],
 'Geometr\u00eda':['\u2220','\u22a5','\u2225','\u00b0','\u2032','\u2033','\u25b3','r','\u20d7'],
 '\u00cdndices':['\u00b2','\u00b3','\u207f','\u2081','\u2082','\u2099','\u207b\u00b9','\u1d40','( )/( )','\u221a( )'],
 'Funciones':['sin','cos','tan','cot','sec','csc','log','ln','f(x)','|x|'],
};
function symOpen(){ document.getElementById('symOverlay').classList.add('show'); const t=document.getElementById('symTabs');
  if(!t.dataset.done){ t.innerHTML=Object.keys(SYMCATS).map((k,i)=>`<button class="${i===0?'active':''}" onclick="symCat('${k}',this)">${k}</button>`).join(''); t.dataset.done='1'; symCat(Object.keys(SYMCATS)[0]); }
}
function symClose(){ document.getElementById('symOverlay').classList.remove('show'); }
function symCat(name,btn){ document.querySelectorAll('#symTabs button').forEach(b=>b.classList.remove('active')); if(btn)btn.classList.add('active');
  document.getElementById('symGrid').innerHTML=(SYMCATS[name]||[]).map(s=>`<button onclick="symIns(${JSON.stringify(s)})">${s}</button>`).join(''); }
function symIns(ch){ const f=document.getElementById('symField'); f.value+=ch; symPrevUpd(); f.focus(); }
function symBack(){ const f=document.getElementById('symField'); f.value=f.value.slice(0,-1); symPrevUpd(); }
function symPrevUpd(){ document.getElementById('symPrevBox').textContent=document.getElementById('symField').value; }
function symCopy(){ const v=document.getElementById('symField').value; if(!v)return; try{navigator.clipboard.writeText(v); toast('Copiado');}catch(e){ const t=document.createElement('textarea'); t.value=v; document.body.appendChild(t); t.select(); try{document.execCommand('copy'); toast('Copiado');}catch(_){} t.remove(); } }
function symToCalc(){ const v=document.getElementById('symField').value; if(!v)return; let inp=document.activeElement;
  if(!(inp&&inp.tagName==='INPUT'&&inp.closest&&inp.closest('#calcContent'))) inp=document.querySelector('#calcContent input');
  if(!inp){ toast('Abr\u00ed la calculadora primero'); return; } inp.value+=v; symClose(); inp.focus(); toast('Insertado en la calculadora'); }
function symToBoard(){ const v=document.getElementById('symField').value; if(!v)return;
  setRole('teacher'); symClose(); pushUndo(); ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=(color==='#ffffff'&&!stage.classList.contains('dark'))?'#0f2540':color;
  ctx.font="600 34px 'Space Mono', monospace"; ctx.textBaseline='top';
  ctx.fillText(v, 44, boardTextY); boardTextY+=52; const r=stage.getBoundingClientRect(); if(boardTextY>r.height-60)boardTextY=50;
  persistCanvas(); document.getElementById('symField').value=''; symPrevUpd(); toast('Escrito en la pizarra'); }


/* ===== Editor de ecuaciones (KaTeX) ===== */
const EQCHIPS=[['Fracción','\\frac{a}{b}'],['Raíz','\\sqrt{x}'],['Raíz n','\\sqrt[n]{x}'],['Potencia','x^{2}'],['Subíndice','x_{i}'],['Integral','\\int_{a}^{b} f(x)\\,dx'],['Sumatoria','\\sum_{i=1}^{n} i'],['Límite','\\lim_{x \\to 0}'],['Derivada','\\frac{dy}{dx}'],['Matriz','\\begin{pmatrix}a & b\\\\ c & d\\end{pmatrix}'],['±','\\pm'],['π','\\pi'],['≤','\\le'],['≥','\\ge'],['≠','\\ne'],['∞','\\infty'],['→','\\to'],['Vector','\\vec{v}']];
function eqOpen(){ document.getElementById('eqOverlay').classList.add('show'); const c=document.getElementById('eqChips');
  if(c && !c.dataset.done){ c.innerHTML=EQCHIPS.map(p=>`<button onclick='eqIns(${JSON.stringify(p[1])})'>${p[0]}</button>`).join(''); c.dataset.done='1'; } eqRender(); }
function eqClose(){ document.getElementById('eqOverlay').classList.remove('show'); }
function eqIns(tex){ const t=document.getElementById('eqInput'); const s=t.selectionStart??t.value.length, e=t.selectionEnd??s; t.value=t.value.slice(0,s)+tex+t.value.slice(e); eqRender(); t.focus(); }
function eqRender(){ const src=document.getElementById('eqInput').value.trim(); const box=document.getElementById('eqPreview');
  if(!src){ box.innerHTML='<span style="color:var(--ink-soft,#5a748c)">La ecuación se verá acá…</span>'; return; }
  try{ if(window.katex){ katex.render(src, box, {displayMode:true, throwOnError:false}); } else { box.textContent=src; } }
  catch(e){ box.innerHTML='<span style="color:var(--warn,#e5604a)">No pude interpretar la expresión.</span>'; } }
function eqCopy(){ const v=document.getElementById('eqInput').value; if(!v)return; try{navigator.clipboard.writeText(v);toast('LaTeX copiado');}catch(e){} }
function eqToBoardText(){ const v=document.getElementById('eqInput').value; if(!v)return; setRole('teacher'); eqClose(); pushUndo(); ctx.globalCompositeOperation='source-over'; ctx.fillStyle=(color==='#ffffff'&&!stage.classList.contains('dark'))?'#0f2540':color; ctx.font="600 24px 'Space Mono',monospace"; ctx.textBaseline='top'; ctx.fillText(v,44,boardTextY); boardTextY+=40; persistCanvas(); toast('Ecuación (texto) en la pizarra'); }
function eqToBoard(){ const box=document.getElementById('eqPreview'); if(!box||!box.firstElementChild){eqToBoardText();return;}
  const r=box.getBoundingClientRect(); const w=Math.ceil(r.width)||320, hh=Math.ceil(r.height)||90;
  try{
    const html=box.innerHTML;
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+hh+'"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:1.4rem;color:#0f2540">'+html+'</div></foreignObject></svg>';
    const img=new Image();
    img.onload=()=>{ setRole('teacher'); eqClose(); pushUndo(); ctx.globalCompositeOperation='source-over'; ctx.drawImage(img,44,boardTextY,w,hh); boardTextY+=hh+16; const rr=stage.getBoundingClientRect(); if(boardTextY>rr.height-60)boardTextY=50; persistCanvas(); toast('Ecuación enviada a la pizarra'); };
    img.onerror=eqToBoardText;
    img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }catch(e){ eqToBoardText(); } }

const TABS={arit:TABS_ARIT,alg:TABS_ALG,calc:TABS_CALC,trig:TABS_TRIG,geo:TABS_GEO,stat:TABS_STAT,poly:TABS_POLY,func:TABS_FUNC};

/* =========================================================
   RECONOCIMIENTO DE ESCRITURA (números y símbolos)
========================================================= */
let OCR=null, inkStrokes=[], inkCurStroke=null, inkTimer=null;
let _ocrLoading=false;
async function loadOCR(){ if(OCR||_ocrLoading)return; _ocrLoading=true;
  try{ const r=await fetch('json/ocr-model.json'); const m=await r.json();
    const dec=s=>{const bin=atob(s);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Int8Array(u.buffer);};
    m.W1=dec(m.W1); m.W2=dec(m.W2); OCR=m;
  }catch(e){ OCR=null; } finally{ _ocrLoading=false; }
}
function scheduleRecognize(){ clearTimeout(inkTimer); inkTimer=setTimeout(recognizeInk,1100); }

function ocrPredict(vec){
  const {W1,sW1,b1,W2,sW2,b2,labels,H,O}=OCR;
  const h=new Float32Array(H);
  for(let j=0;j<H;j++){let s=0;for(let i=0;i<784;i++)s+=vec[i]*W1[i*H+j];s=s*sW1+b1[j];h[j]=s>0?s:0;}
  const o=new Float32Array(O);
  for(let k=0;k<O;k++){let s=0;for(let j=0;j<H;j++)s+=h[j]*W2[j*O+k];o[k]=s*sW2+b2[k];}
  let mx=-1e9;for(let k=0;k<O;k++)if(o[k]>mx)mx=o[k];
  let sum=0;for(let k=0;k<O;k++){o[k]=Math.exp(o[k]-mx);sum+=o[k];}
  const cands=[];for(let k=0;k<O;k++)cands.push({label:labels[k],p:o[k]/sum});
  cands.sort((a,b)=>b.p-a.p);
  return {label:cands[0].label,conf:cands[0].p,cands:cands};
}
/* rasteriza un conjunto de trazos y lo normaliza a 28x28 igual que en el entrenamiento */
function strokesToVec(strokes){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  strokes.forEach(st=>st.forEach(p=>{if(p.x<x0)x0=p.x;if(p.x>x1)x1=p.x;if(p.y<y0)y0=p.y;if(p.y>y1)y1=p.y;}));
  const w=x1-x0,h=y1-y0,maxd=Math.max(w,h,1),pad=Math.max(6,maxd*0.18);
  const cw=Math.ceil(w+2*pad),ch=Math.ceil(h+2*pad);
  const tc=document.createElement('canvas');tc.width=cw;tc.height=ch;const tx=tc.getContext('2d');
  tx.fillStyle='#000';tx.fillRect(0,0,cw,ch);
  tx.strokeStyle='#fff';tx.lineWidth=Math.max(3,maxd*0.07);tx.lineCap='round';tx.lineJoin='round';
  strokes.forEach(st=>{tx.beginPath();st.forEach((p,i)=>{const X=p.x-x0+pad,Y=p.y-y0+pad;i?tx.lineTo(X,Y):tx.moveTo(X,Y);});if(st.length===1){tx.arc(st[0].x-x0+pad,st[0].y-y0+pad,tx.lineWidth/2,0,7);tx.fillStyle='#fff';tx.fill();}tx.stroke();});
  const d0=tx.getImageData(0,0,cw,ch).data;
  let ix0=cw,iy0=ch,ix1=0,iy1=0,any=false;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){if(d0[(y*cw+x)*4]>38){any=true;if(x<ix0)ix0=x;if(x>ix1)ix1=x;if(y<iy0)iy0=y;if(y>iy1)iy1=y;}}
  if(!any)return null;
  const bw=ix1-ix0+1,bh=iy1-iy0+1,s=20/Math.max(bw,bh);
  const nw=Math.max(1,Math.round(bw*s)),nh=Math.max(1,Math.round(bh*s));
  const o28=document.createElement('canvas');o28.width=28;o28.height=28;const ox=o28.getContext('2d');
  ox.fillStyle='#000';ox.fillRect(0,0,28,28);ox.imageSmoothingEnabled=true;
  ox.drawImage(tc,ix0,iy0,bw,bh,Math.floor((28-nw)/2),Math.floor((28-nh)/2),nw,nh);
  const dd=ox.getImageData(0,0,28,28).data;const g=new Float32Array(784);
  for(let i=0;i<784;i++)g[i]=dd[i*4]/255;
  // centrar por centro de masa (shift entero)
  let m=0,cxs=0,cys=0;for(let y=0;y<28;y++)for(let x=0;x<28;x++){const v=g[y*28+x];m+=v;cxs+=v*x;cys+=v*y;}
  if(m>0){const dx=Math.round(14-cxs/m),dy=Math.round(14-cys/m);
    if(dx||dy){const g2=new Float32Array(784);for(let y=0;y<28;y++)for(let x=0;x<28;x++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<28&&ny>=0&&ny<28)g2[ny*28+nx]=g[y*28+x];}return g2;}}
  return g;
}
/* agrupa los trazos en símbolos por proximidad horizontal */
function segmentInk(strokes){
  const items=strokes.map(st=>{let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;st.forEach(p=>{if(p.x<x0)x0=p.x;if(p.x>x1)x1=p.x;if(p.y<y0)y0=p.y;if(p.y>y1)y1=p.y;});return{st,x0,x1,y0,y1,cx:(x0+x1)/2,w:x1-x0,h:y1-y0};});
  items.sort((a,b)=>a.cx-b.cx);
  const hs=items.map(i=>i.h).sort((a,b)=>a-b);
  const H=hs.length?hs[Math.floor(hs.length/2)]:30;
  const mk=it=>({strokes:[it.st],x0:it.x0,x1:it.x1,y0:it.y0,y1:it.y1});
  const groups=[];let cur=null;
  items.forEach(it=>{
    if(!cur){cur=mk(it);groups.push(cur);return;}
    const ov=Math.min(cur.x1,it.x1)-Math.max(cur.x0,it.x0);      // solape horizontal
    const minw=Math.max(1,Math.min(cur.x1-cur.x0,it.w));
    const gap=it.x0-cur.x1;
    const small=it.h<0.55*H;                                     // posible exponente o punto
    const merge = (ov>0.32*minw) || (gap<0.22*H && !small);      // = x + ÷ se unen; exponente no
    if(merge){cur.strokes.push(it.st);cur.x0=Math.min(cur.x0,it.x0);cur.x1=Math.max(cur.x1,it.x1);cur.y0=Math.min(cur.y0,it.y0);cur.y1=Math.max(cur.y1,it.y1);}
    else{cur=mk(it);groups.push(cur);}
  });
  return groups;
}
function median(a){if(!a.length)return 0;const b=a.slice().sort((x,y)=>x-y);return b[Math.floor(b.length/2)];}
/* ensambla los símbolos en orden, detectando exponentes (superíndices) por su posición y tamaño */
function refineSymbols(syms){
  const OPS=new Set(['+','-','*','/','\u00f7','\u00b1']);
  const REL=new Set(['=','<','>','\u2264','\u2265','\u2260']);
  const OPERAND=l=>(l>='0'&&l<='9')||l==='x'||l==='\u03c0'||l==='\u221e'||l==='\u0394'||l==='\u03b8';
  let prev=null, open=0, hadRel=false;
  function allowed(l,first){
    if(l==='*'||l==='/'||l==='\u00f7') return !(first||prev===null||OPS.has(prev)||REL.has(prev)||prev==='('||prev==='\u221a');
    if(l==='+'||l==='-'||l==='\u00b1') return !OPS.has(prev);
    if(REL.has(l)) return !hadRel && prev!==null && (OPERAND(prev)||prev===')'||prev==='%');
    if(l===')') return open>0 && prev!==null && (OPERAND(prev)||prev===')'||prev==='%');
    if(l==='.') return prev!==null && prev>='0'&&prev<='9';
    if(l==='%') return prev!==null && (OPERAND(prev)||prev===')');
    if(l==='\u221a') return first||prev===null||OPS.has(prev)||REL.has(prev)||prev==='('||prev==='\u221a';
    return true;
  }
  const out=[];
  syms.forEach(s=>{
    const firstPos=out.length===0;
    let chosen=null,cp=0;
    for(const c of s.cands){ if(c.p<0.015) break; if(allowed(c.label,firstPos)){chosen=c.label;cp=c.p;break;} }
    if(chosen===null){ chosen=s.cands[0].label; cp=s.cands[0].p; }
    if(OPS.has(prev)&&OPS.has(s.cands[0].label)&&!OPS.has(chosen)&&!OPERAND(chosen)&&cp<0.45) return;
    if(chosen==='.'&&!(prev!==null&&prev>='0'&&prev<='9')) return;
    s.label=chosen; s.pchosen=cp;
    if(chosen==='(')open++; else if(chosen===')'){open--; if(open<0)open=0;}
    if(REL.has(chosen))hadRel=true;
    prev=chosen; out.push(s);
  });
  while(out.length){ const l=out[out.length-1].label; if(OPS.has(l)||REL.has(l)||l==='.'||l==='('||l==='\u221a') out.pop(); else break; }
  while(out.length){ const l=out[0].label; if(l==='*'||l==='/'||l==='\u00f7'||REL.has(l)||l===')'||l==='%') out.shift(); else break; }
  return out;
}

function assembleExpr(syms){
  const medH=median(syms.map(s=>s.h))||20;
  const base=syms.filter(s=>s.h>=0.68*medH);
  const baseCy=median(base.map(s=>s.cy)), baseH=median(base.map(s=>s.h))||medH;
  let out='',inSup=false;
  syms.forEach((s,i)=>{
    const canExp=/[0-9x]/.test(s.label);
    const sup = i>0 && canExp && s.h < 0.82*baseH && s.cy < baseCy - 0.16*baseH;
    if(sup&&!inSup){out+='^(';inSup=true;}
    else if(!sup&&inSup){out+=')';inSup=false;}
    out+=s.label;
  });
  if(inSup)out+=')';
  return out;
}
function prettifyExpr(e){
  let s=e.replace(/\^\(([^)]*)\)/g,(m,p)=>sup(p)).replace(/\^(-?\d+)/g,(m,p)=>sup(p));
  return s.replace(/[*.]/g,'·').replace(/\//g,'÷');
}
function processRecognized(expr){
  let e=expr.replace(/[=]+\s*$/,'').trim();
  e=e.replace(/([+\-*/\u00f7])\s*([*/\u00f7])/g,'$2');
  let opens=(e.match(/\(/g)||[]).length, closes=(e.match(/\)/g)||[]).length;
  while(closes>opens){ e=e.replace(/\)\s*$/,''); closes--; }
  while(opens>closes){ e+=')'; closes++; }
  e=e.replace(/[+\-*/\u00f7.]\s*$/,'');
  const disp=prettifyExpr(e);
  if(/[<>\u2264\u2265\u2260\u00b1\u221e\u0394\u03b8]/.test(e)) return {display:disp,result:null,sep:' '};
  let math=e.replace(/\u00f7/g,'/').replace(/\u03c0/g,'pi').replace(/\u00b7/g,'*');
  math=math.replace(/\u221a\s*\(([^()]*)\)/g,'sqrt($1)').replace(/\u221a\s*([0-9.]+|x|pi)/g,'sqrt($1)');
  math=math.replace(/([0-9.]+)\s*%/g,'($1/100)');
  if(!e||!/[0-9x]/.test(e))return {display:disp,result:null,sep:' = '};
  try{
    if(/=/.test(math)){
      const raw=nd('solve('+math+',x)').toString().replace(/^\[|\]$/g,'');
      if(raw){const sols=raw.split(',').filter(Boolean).map(s=>pretty(s.trim())).join(';  x = ');
        return {display:disp,result:'x = '+sols,sep:'   \u2192   '};}
    } else if(/x/.test(math)){
      const sim=nd('expand('+math+')').toString();
      if(sim && pretty(sim).replace(/\s/g,'')!==disp.replace(/\u00b7/g,'').replace(/\s/g,''))
        return {display:disp,result:pretty(sim),sep:' = '};
      return {display:disp,result:null,sep:' = '};
    } else if(/[+\-*/()\u221a%]/.test(math)){
      const r=roundNum(nd(math).evaluate().text('decimals'),6);
      if(r!=='NaN'&&isFinite(parseFloat(r)))return {display:disp,result:r,sep:' = '};
    }
  }catch(_){}
  return {display:disp,result:null,sep:' = '};
}
function recognizeInk(){
  if(!OCR){ ensureOCR();
    recognizeInk._t=(recognizeInk._t||0)+1;
    if(recognizeInk._t<=8){ toast('Preparando el reconocimiento…'); setTimeout(recognizeInk,500); }
    else { toast('No pude cargar el reconocimiento. Serví la página por HTTP.'); recognizeInk._t=0; }
    return; }
  recognizeInk._t=0; ensureNerdamer();
  if(!inkStrokes.length)return;
  const strokes=inkStrokes; inkStrokes=[];
  const groups=segmentInk(strokes);
  const syms=[];
  groups.forEach(g=>{const v=strokesToVec(g.strokes);if(!v)return;const r=ocrPredict(v);syms.push({cands:r.cands,label:r.label,conf:r.conf,x0:g.x0,x1:g.x1,y0:g.y0,y1:g.y1,cy:(g.y0+g.y1)/2,h:g.y1-g.y0});});
  if(!syms.length)return;
  const refined=refineSymbols(syms);
  if(!refined.length)return;
  const low=refined.some(s=>(s.pchosen!=null?s.pchosen:s.conf)<0.5);
  const expr=assembleExpr(refined);
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  strokes.forEach(st=>st.forEach(p=>{if(p.x<x0)x0=p.x;if(p.x>x1)x1=p.x;if(p.y<y0)y0=p.y;if(p.y>y1)y1=p.y;}));
  pushUndo();
  const pad=10;ctx.clearRect(x0-pad,y0-pad,(x1-x0)+2*pad,(y1-y0)+2*pad);
  const {display,result,sep}=processRecognized(expr);
  const out=(result!=null)?(display+sep+result):display;
  const fh=Math.min(Math.max(y1-y0,28),90);
  ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=(color==='#ffffff'&&!stage.classList.contains('dark'))?'#0f2540':color;
  ctx.font='600 '+Math.round(fh)+"px 'Space Mono', monospace";ctx.textBaseline='top';
  ctx.fillText(out,x0,y0);
  persistCanvas();
  toast((low?'Reconocido (revisá): ':'Reconocido: ')+out);
}

/* ===== Init ===== */
function boot(){
  renderSwatches();renderStudents();renderFiles();
  document.getElementById('studentCurso').value=Store.get('pd_lastCurso','');
  document.getElementById('studentEscuela').value=Store.get('pd_lastEscuela','');
  updateCursoHint();
  document.getElementById('bgLabel').textContent=bgMode==='plain'?'Lisa':bgMode==='grid'?'Cuadrícula':'Cartesiano';
  resizeBoard();updoButtons();
  const saved=Store.get('pd_canvas',null);
  if(saved){const r=stage.getBoundingClientRect();const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,r.width,r.height);img.src=saved;}
}
window.addEventListener('load',boot);
