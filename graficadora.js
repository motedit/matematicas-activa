// ================================================================
//  MATEMÁTICAS ACTIVA — graficadora.js
//  Calculadora + Graficadora para: geometria | calculo | estadistica
// ================================================================
(function () {
'use strict';

let MAT = '';
const PI = Math.PI;
const r2 = n => isNaN(n)||!isFinite(n) ? '—' : Math.round(n * 100) / 100;
const r4 = n => isNaN(n)||!isFinite(n) ? '—' : Math.round(n * 10000) / 10000;

// ── Evaluador de funciones ────────────────────────────────────
function evalF(expr, x) {
    try {
        const e = String(expr)
            .replace(/\^/g, '**')
            .replace(/\bsen\b/gi, 'Math.sin').replace(/\bsin\b/gi, 'Math.sin')
            .replace(/\bcos\b/gi, 'Math.cos').replace(/\btan\b/gi, 'Math.tan')
            .replace(/\bln\b/gi, 'Math.log').replace(/\blog2\b/gi, 'Math.log2')
            .replace(/\blog\b/gi, 'Math.log10').replace(/\bsqrt\b/gi, 'Math.sqrt')
            .replace(/\babs\b/gi, 'Math.abs').replace(/\bpi\b/gi, 'Math.PI')
            .replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, 'Math.E');
        return Function('x', `'use strict'; return (${e})`)(x);
    } catch { return NaN; }
}

function numDeriv(f, x, h = 1e-7) { return (f(x + h) - f(x - h)) / (2 * h); }

function defIntegral(f, a, b, n = 2000) {
    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
    return r4(s * h / 3);
}

// ── Estadística ───────────────────────────────────────────────
function calcStats(data) {
    if (!data.length) return null;
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const variance = data.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    const varMuestral = n > 1 ? data.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
    const median = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
    const freq = {};
    data.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    const modes = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
    const Q1 = sorted[Math.floor(n / 4)], Q3 = sorted[Math.floor(3 * n / 4)];
    return { n, sum: r2(sum), mean: r4(mean), variance: r4(variance), stdDev: r4(stdDev),
             varMuestral: r4(varMuestral), median: r2(median), modes, Q1, Q3,
             min: sorted[0], max: sorted[n - 1], range: sorted[n - 1] - sorted[0],
             sorted, freq, iqr: Q3 - Q1 };
}

// ── CSS ───────────────────────────────────────────────────────
function inyectarCSS() {
    if (document.getElementById('graf-style')) return;
    const s = document.createElement('style');
    s.id = 'graf-style';
    s.textContent = `
.graf-tabs{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap}
.graf-tab{padding:9px 22px;border-radius:10px;border:2px solid #e2e8f0;background:transparent;cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;color:#64748b;transition:all .2s}
.graf-tab.active{background:linear-gradient(135deg,#2563eb,#7c3aed);color:white;border-color:transparent}
.graf-panel{}
.graf-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:12px;margin-bottom:16px}
.graf-field{display:flex;flex-direction:column;gap:5px}
.graf-field label{font-size:12px;font-weight:700;color:#475569}
.graf-field input,.graf-field select,.graf-field textarea{padding:9px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;font-family:inherit;color:#0f172a;background:#f8fafc;outline:none;transition:border-color .2s;width:100%;box-sizing:border-box}
.graf-field input:focus,.graf-field select:focus,.graf-field textarea:focus{border-color:#2563eb;background:white}
.graf-btn{padding:11px 24px;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .2s}
.graf-btn-primary{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;box-shadow:0 4px 14px rgba(37,99,235,.3)}
.graf-btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(37,99,235,.4)}
.graf-btn-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center}
.graf-resultados{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:20px;margin-top:16px}
.graf-res-titulo{font-size:14px;font-weight:700;color:#1e40af;margin:0 0 12px}
.graf-res-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:8px}
.graf-res-item{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px}
.graf-res-label{font-size:11px;font-weight:600;color:#64748b;margin-bottom:3px}
.graf-res-value{font-size:16px;font-weight:800;color:#0f172a;font-family:'Courier New',monospace}
.graf-res-formula{background:#1e293b;border-radius:10px;padding:14px;margin-top:12px;font-family:'Courier New',monospace;font-size:13px;color:#e2e8f0;line-height:1.8;white-space:pre-wrap}
.graf-canvas-wrap{position:relative;background:#0f172a;border-radius:14px;overflow:hidden;margin-top:16px}
.graf-canvas-wrap canvas{display:block;width:100%}
.graf-btn-preset{padding:6px 13px;border-radius:8px;border:1.5px solid #e2e8f0;background:white;font-size:12px;font-weight:600;cursor:pointer;color:#2563eb;transition:all .2s;white-space:nowrap}
.graf-btn-preset:hover{background:#dbeafe;border-color:#2563eb}
.graf-presets{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
.graf-error{background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:12px 16px;color:#991b1b;font-size:13px;margin-top:10px;display:none}
.graf-checkbox-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px;align-items:center}
.graf-checkbox-row label{display:flex;align-items:center;gap:5px;font-size:13px;font-weight:600;color:#475569;cursor:pointer}
.graf-mini-input{width:60px!important;padding:6px 8px!important;border:1.5px solid #e2e8f0;border-radius:7px;font-size:13px;min-width:0}
.graf-info{margin-top:10px;font-size:13px;color:#94a3b8;line-height:1.8}
@media(max-width:560px){.graf-form{grid-template-columns:1fr 1fr}.graf-res-grid{grid-template-columns:1fr 1fr}}`;
    document.head.appendChild(s);
}

// ── Helpers UI ────────────────────────────────────────────────
function campo(id, label, ph, type='number', val='') {
    return `<div class="graf-field"><label>${label}</label><input type="${type}" id="${id}" placeholder="${ph}" value="${val}"></div>`;
}
function selec(id, label, opts) {
    return `<div class="graf-field"><label>${label}</label><select id="${id}">${opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div>`;
}
function resItem(label, val, unit='') {
    return `<div class="graf-res-item"><div class="graf-res-label">${label}</div><div class="graf-res-value">${val}${unit?`<span style="font-size:10px;color:#64748b;margin-left:2px">${unit}</span>`:''}</div></div>`;
}
function getVal(id) { const el=document.getElementById(id); return el?parseFloat(el.value):NaN; }
function getStr(id) { const el=document.getElementById(id); return el?el.value.trim():''; }
function showErr(id,msg){const el=document.getElementById(id);if(el){el.textContent=msg;el.style.display='block';}}
function hideErr(id){const el=document.getElementById(id);if(el)el.style.display='none';}

// ── Canvas / Plotter ──────────────────────────────────────────
function Plotter(id, xMin, xMax, yMin, yMax) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const W = canvas.parentElement.clientWidth || 560;
    const H = Math.round(W * 0.62);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const tx = x => (x - xMin) / (xMax - xMin) * W;
    const ty = y => H - (y - yMin) / (yMax - yMin) * H;

    // Fondo y grid
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,W,H);
    const xRange = xMax - xMin, yRange = yMax - yMin;
    const xStep = xRange > 30 ? 5 : xRange > 15 ? 2 : 1;
    const yStep = yRange > 30 ? 5 : yRange > 15 ? 2 : 1;
    for (let x = Math.ceil(xMin/xStep)*xStep; x <= xMax; x += xStep) {
        ctx.strokeStyle = x===0 ? '#475569' : '#1e293b';
        ctx.lineWidth = x===0 ? 1.5 : 0.5;
        ctx.beginPath(); ctx.moveTo(tx(x),0); ctx.lineTo(tx(x),H); ctx.stroke();
    }
    for (let y = Math.ceil(yMin/yStep)*yStep; y <= yMax; y += yStep) {
        ctx.strokeStyle = y===0 ? '#475569' : '#1e293b';
        ctx.lineWidth = y===0 ? 1.5 : 0.5;
        ctx.beginPath(); ctx.moveTo(0,ty(y)); ctx.lineTo(W,ty(y)); ctx.stroke();
    }
    // Números de eje
    ctx.fillStyle='#64748b'; ctx.font=`${Math.max(10,W/58)}px Arial`;
    const y0c = Math.min(Math.max(ty(0),10),H-16);
    const x0c = Math.min(Math.max(tx(0),20),W-10);
    ctx.textAlign='center';
    for (let x=Math.ceil(xMin/xStep)*xStep; x<=xMax; x+=xStep) {
        if (x===0) continue;
        ctx.fillText(x, tx(x), y0c+14);
    }
    ctx.textAlign='right';
    for (let y=Math.ceil(yMin/yStep)*yStep; y<=yMax; y+=yStep) {
        if (y===0) continue;
        ctx.fillText(y, x0c-4, ty(y)+4);
    }

    return {
        ctx, W, H, tx, ty,
        plot(f, color='#60a5fa', lw=2.5) {
            ctx.strokeStyle=color; ctx.lineWidth=lw; ctx.beginPath();
            let first=true, prevY=null;
            const steps=W*2;
            for(let i=0;i<=steps;i++){
                const x=xMin+(xMax-xMin)*i/steps;
                const y=f(x);
                if(isNaN(y)||!isFinite(y)||Math.abs(y)>(yMax-yMin)*8){first=true;continue;}
                if(prevY!==null&&Math.abs(y-prevY)>(yMax-yMin)*3){first=true;}
                prevY=y;
                if(first){ctx.moveTo(tx(x),ty(y));first=false;}else ctx.lineTo(tx(x),ty(y));
            }
            ctx.stroke();
        },
        tangentLine(f, x0v, color='#fbbf24') {
            const y0v=f(x0v), m=numDeriv(f,x0v);
            const yLine=x=>m*(x-x0v)+y0v;
            ctx.strokeStyle=color; ctx.lineWidth=1.8; ctx.setLineDash([8,5]);
            ctx.beginPath(); ctx.moveTo(tx(xMin),ty(yLine(xMin))); ctx.lineTo(tx(xMax),ty(yLine(xMax)));
            ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle='#f97316';
            ctx.beginPath(); ctx.arc(tx(x0v),ty(y0v),5,0,PI*2); ctx.fill();
            return m;
        },
        shadeArea(f, a, b, color='rgba(124,58,237,0.35)') {
            ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(tx(a),ty(0));
            const steps=600;
            for(let i=0;i<=steps;i++){const x=a+(b-a)*i/steps; ctx.lineTo(tx(x),ty(f(x)));}
            ctx.lineTo(tx(b),ty(0)); ctx.closePath(); ctx.fill();
        }
    };
}

// ════════════════════════════════════════════════════════════
//  MÓDULO: GEOMETRÍA
// ════════════════════════════════════════════════════════════
const FIGURAS = {
    circulo:   {n:'Círculo',     c:[{id:'r',l:'Radio (r)',p:'ej: 5'}]},
    rectangulo:{n:'Rectángulo',  c:[{id:'b',l:'Base (b)',p:'ej: 8'},{id:'h',l:'Altura (h)',p:'ej: 5'}]},
    cuadrado:  {n:'Cuadrado',    c:[{id:'l',l:'Lado (l)',p:'ej: 6'}]},
    triangulo: {n:'Triángulo',   c:[{id:'b',l:'Base (b)',p:'ej: 6'},{id:'h',l:'Altura (h)',p:'ej: 4'},{id:'l1',l:'Lado 1',p:'ej: 5'},{id:'l2',l:'Lado 2',p:'ej: 5'}]},
    trapecio:  {n:'Trapecio',    c:[{id:'B',l:'Base mayor (B)',p:'ej: 10'},{id:'b',l:'Base menor (b)',p:'ej: 6'},{id:'h',l:'Altura (h)',p:'ej: 4'},{id:'l1',l:'Lado 1',p:'ej: 5'},{id:'l2',l:'Lado 2',p:'ej: 5'}]},
    rombo:     {n:'Rombo',       c:[{id:'D',l:'Diagonal mayor (D)',p:'ej: 10'},{id:'d',l:'Diagonal menor (d)',p:'ej: 6'}]},
    cubo:      {n:'Cubo',        c:[{id:'a',l:'Arista (a)',p:'ej: 5'}]},
    cilindro:  {n:'Cilindro',    c:[{id:'r',l:'Radio (r)',p:'ej: 4'},{id:'h',l:'Altura (h)',p:'ej: 8'}]},
    esfera:    {n:'Esfera',      c:[{id:'r',l:'Radio (r)',p:'ej: 5'}]},
    cono:      {n:'Cono',        c:[{id:'r',l:'Radio (r)',p:'ej: 4'},{id:'h',l:'Altura (h)',p:'ej: 7'}]},
};

function calcGeo(tipo) {
    const v=id=>getVal('geo-c-'+id);
    switch(tipo){
        case 'circulo':{const r=v('r');return{items:[['Área',r2(PI*r*r),'u²'],['Perímetro',r2(2*PI*r),'u']],formula:`A = π·r² = π·${r}² = ${r2(PI*r*r)} u²\nP = 2·π·r = 2·π·${r} = ${r2(2*PI*r)} u`};}
        case 'rectangulo':{const b=v('b'),h=v('h'),diag=Math.sqrt(b*b+h*h);return{items:[['Área',r2(b*h),'u²'],['Perímetro',r2(2*(b+h)),'u'],['Diagonal',r2(diag),'u']],formula:`A = b·h = ${b}·${h} = ${r2(b*h)} u²\nP = 2(b+h) = 2(${b}+${h}) = ${r2(2*(b+h))} u\nDiag = √(b²+h²) = ${r2(diag)} u`};}
        case 'cuadrado':{const l=v('l');return{items:[['Área',r2(l*l),'u²'],['Perímetro',r2(4*l),'u'],['Diagonal',r2(l*Math.sqrt(2)),'u']],formula:`A = l² = ${l}² = ${r2(l*l)} u²\nP = 4·l = 4·${l} = ${r2(4*l)} u\nDiag = l·√2 = ${l}·√2 = ${r2(l*Math.sqrt(2))} u`};}
        case 'triangulo':{const b=v('b'),h=v('h'),l1=v('l1'),l2=v('l2'),hip=Math.sqrt(b*b+h*h);return{items:[['Área',r2(b*h/2),'u²'],['Perímetro',isNaN(l1)||isNaN(l2)?'—':r2(b+l1+l2),'u'],['Hip. (si rectángulo)',r2(hip),'u']],formula:`A = (b·h)/2 = (${b}·${h})/2 = ${r2(b*h/2)} u²\nP = b+l₁+l₂ = ${b}+${l1}+${l2} = ${r2(b+l1+l2)} u\nHip = √(b²+h²) = ${r2(hip)} u`};}
        case 'trapecio':{const B=v('B'),b=v('b'),h=v('h'),l1=v('l1'),l2=v('l2');return{items:[['Área',r2((B+b)*h/2),'u²'],['Perímetro',r2(B+b+l1+l2),'u']],formula:`A = (B+b)·h/2 = (${B}+${b})·${h}/2 = ${r2((B+b)*h/2)} u²\nP = B+b+l₁+l₂ = ${B}+${b}+${l1}+${l2} = ${r2(B+b+l1+l2)} u`};}
        case 'rombo':{const D=v('D'),d=v('d'),lado=Math.sqrt((D/2)**2+(d/2)**2);return{items:[['Área',r2(D*d/2),'u²'],['Lado',r2(lado),'u'],['Perímetro',r2(4*lado),'u']],formula:`A = (D·d)/2 = (${D}·${d})/2 = ${r2(D*d/2)} u²\nLado = √((D/2)²+(d/2)²) = ${r2(lado)} u\nP = 4·lado = ${r2(4*lado)} u`};}
        case 'cubo':{const a=v('a');return{items:[['Volumen',r2(a**3),'u³'],['Sup. total',r2(6*a*a),'u²'],['Arista diagonal',r2(a*Math.sqrt(3)),'u']],formula:`V = a³ = ${a}³ = ${r2(a**3)} u³\nS = 6·a² = 6·${a}² = ${r2(6*a*a)} u²\nDiag = a·√3 = ${r2(a*Math.sqrt(3))} u`};}
        case 'cilindro':{const r=v('r'),h=v('h');return{items:[['Volumen',r2(PI*r*r*h),'u³'],['Sup. lateral',r2(2*PI*r*h),'u²'],['Sup. total',r2(2*PI*r*(r+h)),'u²']],formula:`V = π·r²·h = π·${r}²·${h} = ${r2(PI*r*r*h)} u³\nS_lat = 2·π·r·h = ${r2(2*PI*r*h)} u²\nS_tot = 2·π·r·(r+h) = ${r2(2*PI*r*(r+h))} u²`};}
        case 'esfera':{const r=v('r');return{items:[['Volumen',r2(4/3*PI*r**3),'u³'],['Superficie',r2(4*PI*r*r),'u²']],formula:`V = (4/3)·π·r³ = (4/3)·π·${r}³ = ${r2(4/3*PI*r**3)} u³\nS = 4·π·r² = 4·π·${r}² = ${r2(4*PI*r*r)} u²`};}
        case 'cono':{const r=v('r'),h=v('h'),gen=Math.sqrt(r*r+h*h);return{items:[['Volumen',r2(PI*r*r*h/3),'u³'],['Generatriz',r2(gen),'u'],['Sup. lateral',r2(PI*r*gen),'u²'],['Sup. total',r2(PI*r*(r+gen)),'u²']],formula:`V = (1/3)·π·r²·h = ${r2(PI*r*r*h/3)} u³\nGen = √(r²+h²) = ${r2(gen)} u\nS_lat = π·r·g = ${r2(PI*r*gen)} u²\nS_tot = π·r·(r+g) = ${r2(PI*r*(r+gen))} u²`};}
        default:return null;
    }
}

function dibujarFigura(tipo, pfx='geo-c-') {
    const canvas=document.getElementById('geo-canvas');
    if(!canvas) return;
    const W=canvas.parentElement.clientWidth||560;
    const H=Math.round(W*0.55);
    canvas.width=W; canvas.height=H;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,W,H);
    const cx=W/2, cy=H/2;
    const v=id=>getVal(pfx+id);
    ctx.strokeStyle='#60a5fa'; ctx.lineWidth=2.5; ctx.setLineDash([]);

    const lbl=(x,y,txt,col='#94a3b8',sz=13)=>{
        ctx.save();ctx.fillStyle=col;ctx.font=`bold ${sz}px Arial`;ctx.textAlign='center';ctx.fillText(txt,x,y);ctx.restore();
    };
    const dim=(x1,y1,x2,y2,txt)=>{
        ctx.save();ctx.strokeStyle='#fbbf24';ctx.lineWidth=1;ctx.setLineDash([4,3]);
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);
        ctx.fillStyle='#fbbf24';ctx.font='bold 11px Arial';ctx.textAlign='center';
        const mx=(x1+x2)/2,my=(y1+y2)/2;
        ctx.fillText(txt, mx+(y1===y2?0:-18), my+(y1===y2?-10:0));
        ctx.restore();
    };

    ctx.fillStyle='rgba(37,99,235,0.18)';
    lbl(cx,20,FIGURAS[tipo]?.n||tipo,'#60a5fa',14);

    switch(tipo){
        case 'circulo':{const r=v('r');if(isNaN(r)||r<=0)return;const sc=Math.min(cx,cy)*0.75/r,R=r*sc;ctx.beginPath();ctx.arc(cx,cy,R,0,2*PI);ctx.fill();ctx.stroke();dim(cx,cy,cx+R,cy,`r=${r2(r)}`);break;}
        case 'rectangulo':{const b=v('b'),h=v('h');if(isNaN(b)||isNaN(h)||b<=0||h<=0)return;const sc=Math.min(W*0.68/b,H*0.63/h),bw=b*sc,bh=h*sc,x0=cx-bw/2,y0=cy-bh/2;ctx.beginPath();ctx.rect(x0,y0,bw,bh);ctx.fill();ctx.stroke();dim(x0,y0-12,x0+bw,y0-12,`b=${r2(b)}`);dim(x0+bw+14,y0,x0+bw+14,y0+bh,`h=${r2(h)}`);break;}
        case 'cuadrado':{const l=v('l');if(isNaN(l)||l<=0)return;const sc=Math.min(W*0.62,H*0.62)/l,lw=l*sc,x0=cx-lw/2,y0=cy-lw/2;ctx.beginPath();ctx.rect(x0,y0,lw,lw);ctx.fill();ctx.stroke();dim(x0,y0-12,x0+lw,y0-12,`l=${r2(l)}`);ctx.save();ctx.strokeStyle='rgba(251,191,36,.4)';ctx.lineWidth=1;ctx.setLineDash([5,4]);ctx.beginPath();ctx.moveTo(x0,y0+lw);ctx.lineTo(x0+lw,y0);ctx.stroke();ctx.setLineDash([]);ctx.restore();break;}
        case 'triangulo':{const b=v('b'),h=v('h');if(isNaN(b)||isNaN(h)||b<=0||h<=0)return;const sc=Math.min(W*0.68/b,H*0.62/h),bw=b*sc,bh=h*sc,x0=cx-bw/2,y0=cy+bh/2;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x0+bw,y0);ctx.lineTo(cx,y0-bh);ctx.closePath();ctx.fill();ctx.stroke();ctx.save();ctx.strokeStyle='rgba(251,191,36,.4)';ctx.lineWidth=1;ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(cx,y0);ctx.lineTo(cx,y0-bh);ctx.stroke();ctx.setLineDash([]);ctx.restore();dim(x0,y0+14,x0+bw,y0+14,`b=${r2(b)}`);lbl(cx+22,y0-bh/2,`h=${r2(h)}`,'#fbbf24',11);break;}
        case 'trapecio':{const B=v('B'),b=v('b'),h=v('h');if(isNaN(B)||isNaN(b)||isNaN(h))return;const sc=Math.min(W*0.68/B,H*0.6/h),Bw=B*sc,bw=b*sc,bh=h*sc,x0=cx-Bw/2,y0=cy+bh/2;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x0+Bw,y0);ctx.lineTo(cx+bw/2,y0-bh);ctx.lineTo(cx-bw/2,y0-bh);ctx.closePath();ctx.fill();ctx.stroke();dim(x0,y0+14,x0+Bw,y0+14,`B=${r2(B)}`);dim(cx-bw/2,y0-bh-14,cx+bw/2,y0-bh-14,`b=${r2(b)}`);lbl(x0-20,cy,`h=${r2(h)}`,'#fbbf24',11);break;}
        case 'rombo':{const D=v('D'),d=v('d');if(isNaN(D)||isNaN(d))return;const sc=Math.min(W*0.68/D,H*0.7/d),Dw=D*sc/2,dw=d*sc/2;ctx.beginPath();ctx.moveTo(cx,cy-dw);ctx.lineTo(cx+Dw,cy);ctx.lineTo(cx,cy+dw);ctx.lineTo(cx-Dw,cy);ctx.closePath();ctx.fill();ctx.stroke();dim(cx-Dw,cy,cx+Dw,cy,`D=${r2(D)}`);dim(cx,cy-dw,cx,cy+dw,`d=${r2(d)}`);break;}
        case 'cubo':{const a=v('a');if(isNaN(a)||a<=0)return;const sc=Math.min(W*0.42,H*0.52)/a,s=a*sc,off=s*0.38,x0=cx-s/2-off/2,y0=cy-s/2+off/2;ctx.beginPath();ctx.rect(x0,y0,s,s);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(37,99,235,0.28)';ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x0+off,y0-off);ctx.lineTo(x0+s+off,y0-off);ctx.lineTo(x0+s,y0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(37,99,235,0.12)';ctx.beginPath();ctx.moveTo(x0+s,y0);ctx.lineTo(x0+s+off,y0-off);ctx.lineTo(x0+s+off,y0+s-off);ctx.lineTo(x0+s,y0+s);ctx.closePath();ctx.fill();ctx.stroke();lbl(cx-off/2,y0+s+18,`a=${r2(a)}`,'#fbbf24',12);break;}
        case 'cilindro':{const r=v('r'),h=v('h');if(isNaN(r)||isNaN(h))return;const sc=Math.min(W*0.33/r,H*0.68/h),rw=r*sc,hw=h*sc,x0=cx-rw,y0=cy-hw/2;ctx.fillStyle='rgba(37,99,235,0.18)';ctx.beginPath();ctx.rect(x0,y0,rw*2,hw);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(37,99,235,0.22)';ctx.beginPath();ctx.ellipse(cx,y0+hw,rw,rw*0.32,0,0,2*PI);ctx.fill();ctx.stroke();ctx.fillStyle='rgba(37,99,235,0.4)';ctx.beginPath();ctx.ellipse(cx,y0,rw,rw*0.32,0,0,2*PI);ctx.fill();ctx.stroke();dim(cx,y0-4,cx+rw,y0-4,`r=${r2(r)}`);dim(cx+rw+14,y0,cx+rw+14,y0+hw,`h=${r2(h)}`);break;}
        case 'esfera':{const r=v('r');if(isNaN(r)||r<=0)return;const sc=Math.min(cx,cy)*0.75/r,R=r*sc;const grad=ctx.createRadialGradient(cx-R*0.3,cy-R*0.3,R*0.1,cx,cy,R);grad.addColorStop(0,'rgba(96,165,250,0.55)');grad.addColorStop(1,'rgba(37,99,235,0.12)');ctx.beginPath();ctx.arc(cx,cy,R,0,2*PI);ctx.fillStyle=grad;ctx.fill();ctx.strokeStyle='#60a5fa';ctx.stroke();ctx.beginPath();ctx.ellipse(cx,cy,R,R*0.28,0,0,2*PI);ctx.strokeStyle='rgba(96,165,250,0.4)';ctx.lineWidth=1;ctx.stroke();dim(cx,cy,cx+R,cy,`r=${r2(r)}`);break;}
        case 'cono':{const r=v('r'),h=v('h');if(isNaN(r)||isNaN(h))return;const sc=Math.min(W*0.33/r,H*0.63/h),rw=r*sc,hw=h*sc,y0=cy-hw/2;ctx.fillStyle='rgba(37,99,235,0.18)';ctx.beginPath();ctx.moveTo(cx,y0);ctx.lineTo(cx-rw,y0+hw);ctx.lineTo(cx+rw,y0+hw);ctx.closePath();ctx.fill();ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.stroke();ctx.fillStyle='rgba(37,99,235,0.32)';ctx.beginPath();ctx.ellipse(cx,y0+hw,rw,rw*0.3,0,0,2*PI);ctx.fill();ctx.stroke();dim(cx,y0+hw+14,cx+rw,y0+hw+14,`r=${r2(r)}`);dim(cx+rw+14,y0,cx+rw+14,y0+hw,`h=${r2(h)}`);break;}
    }
}

function renderGeometria(cont) {
    const tiposOpts=Object.entries(FIGURAS).map(([v,f])=>[v,f.n]);
    cont.innerHTML=`
        <div class="graf-tabs">
            <button class="graf-tab active" onclick="window._graf.tab('geo-calc')">📐 Calculadora</button>
            <button class="graf-tab" onclick="window._graf.tab('geo-graf')">📊 Graficadora</button>
        </div>
        <div id="geo-calc-panel" class="graf-panel">
            <div class="graf-form">${selec('geo-tipo','Figura',tiposOpts)}</div>
            <div id="geo-campos" class="graf-form"></div>
            <div class="graf-btn-row"><button class="graf-btn graf-btn-primary" onclick="window._graf.calcGeoAction()">🔢 Calcular</button></div>
            <div id="geo-error" class="graf-error"></div>
            <div id="geo-result" style="display:none" class="graf-resultados">
                <p class="graf-res-titulo">📐 Resultados</p>
                <div id="geo-res-items" class="graf-res-grid"></div>
                <pre id="geo-formula" class="graf-res-formula"></pre>
            </div>
        </div>
        <div id="geo-graf-panel" class="graf-panel" style="display:none">
            <div class="graf-form">${selec('geo-tipo2','Figura',tiposOpts)}</div>
            <div id="geo-campos2" class="graf-form"></div>
            <div class="graf-btn-row"><button class="graf-btn graf-btn-primary" onclick="window._graf.dibujarGeoAction()">✏️ Dibujar figura</button></div>
            <div class="graf-canvas-wrap"><canvas id="geo-canvas"></canvas></div>
        </div>`;
    actualizarCamposGeo('geo-campos','geo-c-','circulo');
    actualizarCamposGeo('geo-campos2','geo-g-','circulo');
    document.getElementById('geo-tipo').addEventListener('change',e=>actualizarCamposGeo('geo-campos','geo-c-',e.target.value));
    document.getElementById('geo-tipo2').addEventListener('change',e=>actualizarCamposGeo('geo-campos2','geo-g-',e.target.value));
}

function actualizarCamposGeo(contId, pfx, tipo) {
    const cont=document.getElementById(contId);
    if(!cont||!FIGURAS[tipo])return;
    cont.innerHTML=FIGURAS[tipo].c.map(c=>campo(pfx+c.id,c.l,c.p)).join('');
}

// ════════════════════════════════════════════════════════════
//  MÓDULO: CÁLCULO
// ════════════════════════════════════════════════════════════
const PRESETS_CAL=[['x^2','x²'],['x^3-3*x','x³−3x'],['sin(x)','sin(x)'],['cos(x)','cos(x)'],['e^x','eˣ'],['ln(x)','ln(x)'],['1/x','1/x'],['sqrt(x)','√x'],['x^2-4','x²−4'],['abs(x)','|x|']];

function renderCalculo(cont) {
    cont.innerHTML=`
        <div class="graf-tabs">
            <button class="graf-tab active" onclick="window._graf.tab('cal-calc')">🔢 Calculadora</button>
            <button class="graf-tab" onclick="window._graf.tab('cal-graf')">📈 Graficadora</button>
        </div>
        <div id="cal-calc-panel" class="graf-panel">
            <div class="graf-presets">
                <span style="font-size:12px;color:#64748b;font-weight:700;align-self:center">Presets:</span>
                ${PRESETS_CAL.map(([e,l])=>`<button class="graf-btn-preset" onclick="document.getElementById('cal-func').value='${e}'">${l}</button>`).join('')}
            </div>
            <div class="graf-form">
                ${campo('cal-func','Función f(x)','ej: x^2 + 3*x','text','x^2')}
                ${selec('cal-op','Operación',[['deriv','Derivada en un punto'],['integral','Integral definida ∫ab'],['tangente','Recta tangente'],['limite','Límite numérico']])}
            </div>
            <div id="cal-params"></div>
            <div class="graf-btn-row"><button class="graf-btn graf-btn-primary" onclick="window._graf.calcCalculo()">Calcular ∫∂</button></div>
            <div id="cal-error" class="graf-error"></div>
            <div id="cal-result" style="display:none" class="graf-resultados"></div>
        </div>
        <div id="cal-graf-panel" class="graf-panel" style="display:none">
            <div class="graf-presets">
                <span style="font-size:12px;color:#64748b;font-weight:700;align-self:center">Presets:</span>
                ${PRESETS_CAL.map(([e,l])=>`<button class="graf-btn-preset" onclick="document.getElementById('cal-gf').value='${e}';window._graf.graficarCalculo()">${l}</button>`).join('')}
            </div>
            <div class="graf-form">
                ${campo('cal-gf','f(x)','ej: sin(x)','text','x^2')}
                ${campo('cal-xmin','x mín','','number','-8')}
                ${campo('cal-xmax','x máx','','number','8')}
                ${campo('cal-ymin','y mín','','number','-6')}
                ${campo('cal-ymax','y máx','','number','6')}
            </div>
            <div class="graf-checkbox-row">
                <label><input type="checkbox" id="cal-show-tang"> Tangente en x=</label>
                <input type="number" id="cal-tang-x" value="1" class="graf-mini-input">
                <label><input type="checkbox" id="cal-show-area"> Área [a,b]: a=</label>
                <input type="number" id="cal-area-a" value="0" class="graf-mini-input">
                <label>b=</label>
                <input type="number" id="cal-area-b" value="3" class="graf-mini-input">
            </div>
            <div class="graf-btn-row"><button class="graf-btn graf-btn-primary" onclick="window._graf.graficarCalculo()">📈 Graficar</button></div>
            <div class="graf-canvas-wrap"><canvas id="cal-canvas"></canvas></div>
            <div id="cal-info" class="graf-info"></div>
        </div>`;
    document.getElementById('cal-op').addEventListener('change',actualizarParamsCal);
    actualizarParamsCal();
}

function actualizarParamsCal(){
    const op=getStr('cal-op'),cont=document.getElementById('cal-params');
    if(!cont)return;
    const pm={
        deriv:campo('cal-x0','Punto x₀','ej: 2','number','2'),
        integral:campo('cal-ia','Límite inferior a','0','number','0')+campo('cal-ib','Límite superior b','3','number','3'),
        tangente:campo('cal-x0','Punto x₀','ej: 1','number','1'),
        limite:campo('cal-x0','x se aproxima a','ej: 0','number','0'),
    };
    cont.innerHTML=`<div class="graf-form">${pm[op]||''}</div>`;
}

function calcCalculo(){
    const expr=getStr('cal-func'),op=getStr('cal-op');
    if(!expr){showErr('cal-error','Ingresá una función.');return;}
    hideErr('cal-error');
    const f=x=>evalF(expr,x);
    const result=document.getElementById('cal-result');
    result.style.display='block';
    if(op==='deriv'){
        const x0=getVal('cal-x0');
        if(isNaN(x0)){showErr('cal-error','Ingresá x₀.');return;}
        const fp=numDeriv(f,x0),fx0=f(x0);
        result.innerHTML=`<p class="graf-res-titulo">Derivada numérica de f(x) = ${expr} en x₀ = ${x0}</p>
            <div class="graf-res-grid">${resItem('f(x₀)',r4(fx0))}${resItem("f'(x₀)",r4(fp))}${resItem('Pendiente tangente',r4(fp))}</div>
            <pre class="graf-res-formula">f(x) = ${expr}\nf'(x₀) ≈ [f(x₀+h) − f(x₀−h)] / 2h\nf'(${x0}) ≈ ${r4(fp)}</pre>`;
    } else if(op==='integral'){
        const a=getVal('cal-ia'),b=getVal('cal-ib');
        if(isNaN(a)||isNaN(b)){showErr('cal-error','Ingresá a y b.');return;}
        const I=defIntegral(f,a,b);
        result.innerHTML=`<p class="graf-res-titulo">∫ f(x)dx de ${a} a ${b} — f(x) = ${expr}</p>
            <div class="graf-res-grid">${resItem('∫[a→b] f(x)dx',I)}${resItem('|Resultado|',r4(Math.abs(parseFloat(I))))}</div>
            <pre class="graf-res-formula">∫[${a} → ${b}] (${expr}) dx ≈ ${I}\n(Regla de Simpson compuesta, n=2000)</pre>`;
    } else if(op==='tangente'){
        const x0=getVal('cal-x0');
        if(isNaN(x0)){showErr('cal-error','Ingresá x₀.');return;}
        const y0=f(x0),m=numDeriv(f,x0),n=y0-m*x0;
        result.innerHTML=`<p class="graf-res-titulo">Recta tangente a f(x) = ${expr} en x₀ = ${x0}</p>
            <div class="graf-res-grid">${resItem('Punto (x₀, f(x₀))',`(${r4(x0)}, ${r4(y0)})`)}${resItem("Pendiente m = f'(x₀)",r4(m))}${resItem('Ordenada al origen b',r4(n))}</div>
            <pre class="graf-res-formula">Punto: (${r4(x0)}, ${r4(y0)})\nEcuación: y = ${r4(m)}·x + (${r4(n)})\nForma punto-pendiente: y − ${r4(y0)} = ${r4(m)}·(x − ${x0})</pre>`;
    } else if(op==='limite'){
        const x0=getVal('cal-x0');
        if(isNaN(x0)){showErr('cal-error','Ingresá el valor.');return;}
        const h=1e-6,izq=f(x0-h),der=f(x0+h),directo=f(x0);
        const exis=Math.abs(izq-der)<0.001;
        const lim=exis?r4((izq+der)/2):'No existe (o no es continua)';
        result.innerHTML=`<p class="graf-res-titulo">lím[x→${x0}] (${expr})</p>
            <div class="graf-res-grid">${resItem('Por izquierda (x→x₀⁻)',r4(izq))}${resItem('Por derecha (x→x₀⁺)',r4(der))}${resItem('f(x₀) directo',isNaN(directo)?'—':r4(directo))}${resItem('Límite',lim)}</div>
            <pre class="graf-res-formula">lím[x→${x0}] (${expr}) ≈ ${lim}</pre>`;
    }
}

function graficarCalculo(){
    const expr=getStr('cal-gf');
    if(!expr)return;
    const xMin=getVal('cal-xmin')||(-8),xMax=getVal('cal-xmax')||8;
    const yMin=getVal('cal-ymin')||(-6),yMax=getVal('cal-ymax')||6;
    const f=x=>evalF(expr,x);
    const plt=Plotter('cal-canvas',xMin,xMax,yMin,yMax);
    if(!plt)return;
    plt.plot(f,'#60a5fa',2.5);
    const info=[];
    if(document.getElementById('cal-show-tang')?.checked){
        const x0=getVal('cal-tang-x');
        if(!isNaN(x0)){const m=plt.tangentLine(f,x0,'#fbbf24');info.push(`🟡 Tangente en x=${x0}: pendiente = ${r4(m)}, ecuación: y = ${r4(m)}x + ${r4(f(x0)-m*x0)}`);}
    }
    if(document.getElementById('cal-show-area')?.checked){
        const a=getVal('cal-area-a'),b=getVal('cal-area-b');
        if(!isNaN(a)&&!isNaN(b)){plt.shadeArea(f,a,b,'rgba(124,58,237,0.35)');const I=defIntegral(f,a,b);info.push(`🟣 ∫[${a},${b}] f(x)dx ≈ ${I}`);}
    }
    document.getElementById('cal-info').innerHTML=info.join('<br>')||`<span>f(x) = ${expr}</span>`;
}

// ════════════════════════════════════════════════════════════
//  MÓDULO: ESTADÍSTICA
// ════════════════════════════════════════════════════════════
function renderEstadistica(cont){
    cont.innerHTML=`
        <div class="graf-tabs">
            <button class="graf-tab active" onclick="window._graf.tab('est-calc')">📊 Calculadora</button>
            <button class="graf-tab" onclick="window._graf.tab('est-graf')">📈 Graficadora</button>
        </div>
        <div id="est-calc-panel" class="graf-panel">
            <div class="graf-form" style="grid-template-columns:1fr">
                <div class="graf-field">
                    <label>Ingresá los datos (separados por comas o espacios)</label>
                    <textarea id="est-datos" rows="3" placeholder="ej: 5, 8, 3, 12, 7, 9, 4, 11, 6, 10"></textarea>
                </div>
            </div>
            <div class="graf-btn-row"><button class="graf-btn graf-btn-primary" onclick="window._graf.calcEst()">📊 Calcular estadísticas</button></div>
            <div id="est-error" class="graf-error"></div>
            <div id="est-result" style="display:none" class="graf-resultados"></div>
        </div>
        <div id="est-graf-panel" class="graf-panel" style="display:none">
            <div class="graf-form" style="grid-template-columns:1fr">
                <div class="graf-field">
                    <label>Datos (separados por comas)</label>
                    <textarea id="est-gd" rows="2" placeholder="ej: 5, 8, 3, 12, 7, 9, 4, 11"></textarea>
                </div>
            </div>
            <div class="graf-btn-row">
                ${selec('est-tipo-graf','Tipo de gráfico',[['barras','Gráfico de barras'],['histograma','Histograma'],['torta','Gráfico de torta']])}
                <button class="graf-btn graf-btn-primary" onclick="window._graf.graficarEst()">📈 Graficar</button>
            </div>
            <div class="graf-canvas-wrap"><canvas id="est-canvas"></canvas></div>
            <div id="est-mini" class="graf-info"></div>
        </div>`;
}

function parseDatos(id){const raw=getStr(id);if(!raw)return null;const n=raw.split(/[\s,;]+/).map(Number).filter(x=>!isNaN(x));return n.length?n:null;}

function calcEst(){
    const datos=parseDatos('est-datos');
    if(!datos||datos.length<2){showErr('est-error','Ingresá al menos 2 números separados por comas.');return;}
    hideErr('est-error');
    const s=calcStats(datos);
    const result=document.getElementById('est-result');
    result.style.display='block';
    result.innerHTML=`<p class="graf-res-titulo">📊 Estadísticas de ${s.n} datos</p>
        <div class="graf-res-grid">
            ${resItem('n (cantidad)',s.n)}${resItem('Mínimo',s.min)}${resItem('Máximo',s.max)}${resItem('Rango',s.range)}
            ${resItem('Suma',s.sum)}${resItem('Media (x̄)',s.mean)}${resItem('Mediana',s.median)}${resItem('Moda(s)',s.modes.join(', '))}
            ${resItem('Varianza (σ²)',s.variance)}${resItem('Desvío estándar σ',s.stdDev)}${resItem('Var. muestral s²',s.varMuestral)}
            ${resItem('Q1 (25%)',s.Q1)}${resItem('Q3 (75%)',s.Q3)}${resItem('IQR (Q3−Q1)',s.iqr)}
        </div>
        <pre class="graf-res-formula">Datos ordenados: [${s.sorted.join(', ')}]\nMedia = Σx/n = ${s.sum}/${s.n} = ${s.mean}\nVarianza σ² = Σ(xᵢ−x̄)²/n = ${s.variance}\nDesvío σ = √${s.variance} = ${s.stdDev}</pre>`;
    const gd=document.getElementById('est-gd');
    if(gd) gd.value=datos.join(', ');
}

function graficarEst(){
    const datos=parseDatos('est-gd');
    if(!datos||datos.length<2)return;
    const tipo=getStr('est-tipo-graf');
    const canvas=document.getElementById('est-canvas');
    if(!canvas)return;
    const W=canvas.parentElement.clientWidth||560,H=Math.round(W*0.62);
    canvas.width=W; canvas.height=H;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#0f172a'; ctx.fillRect(0,0,W,H);
    const PAD={t:36,r:22,b:52,l:52};
    const PW=W-PAD.l-PAD.r,PH=H-PAD.t-PAD.b;
    const s=calcStats(datos);
    const COLS=['#60a5fa','#a78bfa','#34d399','#fbbf24','#f87171','#38bdf8','#fb923c','#e879f9','#4ade80','#f472b6'];

    if(tipo==='barras'){
        const keys=Object.keys(s.freq).map(Number).sort((a,b)=>a-b);
        const maxF=Math.max(...Object.values(s.freq));
        const gap=PW/keys.length,bw=gap*0.72;
        // Grid horizontal
        for(let i=0;i<=maxF;i++){
            const y=PAD.t+PH-i/maxF*PH;
            ctx.strokeStyle=i===0?'#475569':'#1e293b';ctx.lineWidth=i===0?1:0.5;
            ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(PAD.l+PW,y);ctx.stroke();
            ctx.fillStyle='#64748b';ctx.font='11px Arial';ctx.textAlign='right';
            ctx.fillText(i,PAD.l-5,y+4);
        }
        keys.forEach((k,i)=>{
            const bh=s.freq[k]/maxF*PH,x=PAD.l+i*gap+gap/2-bw/2,y=PAD.t+PH-bh;
            const grad=ctx.createLinearGradient(x,y,x,y+bh);
            grad.addColorStop(0,COLS[i%COLS.length]);grad.addColorStop(1,COLS[i%COLS.length]+'44');
            ctx.fillStyle=grad;ctx.fillRect(x,y,bw,bh);
            ctx.strokeStyle=COLS[i%COLS.length];ctx.lineWidth=1.5;ctx.strokeRect(x,y,bw,bh);
            ctx.fillStyle='#e2e8f0';ctx.font='bold 12px Arial';ctx.textAlign='center';
            ctx.fillText(k,x+bw/2,PAD.t+PH+20);
            ctx.fillStyle='#fbbf24';ctx.font='bold 12px Arial';
            if(bh>14)ctx.fillText(s.freq[k],x+bw/2,y-6);
        });
        ctx.fillStyle='#94a3b8';ctx.font='12px Arial';ctx.textAlign='center';
        ctx.fillText('Valor',PAD.l+PW/2,H-4);
        ctx.save();ctx.translate(14,PAD.t+PH/2);ctx.rotate(-PI/2);ctx.fillText('Frecuencia',0,0);ctx.restore();
        ctx.fillStyle='#60a5fa';ctx.font='bold 13px Arial';ctx.fillText('Gráfico de Barras',PAD.l+PW/2,PAD.t-10);
    } else if(tipo==='histograma'){
        const bins=Math.max(4,Math.min(12,Math.ceil(Math.sqrt(datos.length))));
        const min=s.min,max=s.max,bw=(max-min)/bins;
        const counts=new Array(bins).fill(0);
        datos.forEach(x=>{let i=Math.floor((x-min)/bw);if(i>=bins)i=bins-1;counts[i]++;});
        const maxC=Math.max(...counts);
        const barW=PW/bins;
        for(let i=0;i<=maxC;i++){
            const y=PAD.t+PH-i/maxC*PH;
            ctx.strokeStyle=i===0?'#475569':'#1e293b';ctx.lineWidth=i===0?1:0.5;
            ctx.beginPath();ctx.moveTo(PAD.l,y);ctx.lineTo(PAD.l+PW,y);ctx.stroke();
            ctx.fillStyle='#64748b';ctx.font='11px Arial';ctx.textAlign='right';
            ctx.fillText(i,PAD.l-4,y+4);
        }
        counts.forEach((c,i)=>{
            const bh=c/maxC*PH,x=PAD.l+i*barW,y=PAD.t+PH-bh;
            ctx.fillStyle=COLS[i%COLS.length]+'CC';ctx.fillRect(x,y,barW-1,bh);
            ctx.strokeStyle=COLS[i%COLS.length];ctx.lineWidth=1.5;ctx.strokeRect(x,y,barW-1,bh);
            const lbl=`${r2(min+i*bw)}-${r2(min+(i+1)*bw)}`;
            ctx.fillStyle='#94a3b8';ctx.font='10px Arial';ctx.textAlign='center';
            ctx.fillText(lbl,x+barW/2,PAD.t+PH+20);
            if(c>0){ctx.fillStyle='#fbbf24';ctx.font='bold 12px Arial';ctx.fillText(c,x+barW/2,y-6);}
        });
        ctx.fillStyle='#60a5fa';ctx.font='bold 13px Arial';ctx.textAlign='center';
        ctx.fillText('Histograma de Frecuencias',PAD.l+PW/2,PAD.t-10);
    } else if(tipo==='torta'){
        const keys=Object.keys(s.freq).map(Number).sort((a,b)=>a-b);
        const total=datos.length,cx=PAD.l+PW/2,cy=PAD.t+PH/2+10;
        const R=Math.min(PW,PH)*0.4;
        let startAngle=-PI/2;
        keys.forEach((k,i)=>{
            const pct=s.freq[k]/total,angle=pct*2*PI;
            ctx.fillStyle=COLS[i%COLS.length];
            ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,startAngle,startAngle+angle);ctx.closePath();ctx.fill();
            ctx.strokeStyle='#0f172a';ctx.lineWidth=2;ctx.stroke();
            if(pct>0.04){
                const ma=startAngle+angle/2,lx=cx+Math.cos(ma)*R*0.65,ly=cy+Math.sin(ma)*R*0.65;
                ctx.fillStyle='white';ctx.font='bold 12px Arial';ctx.textAlign='center';
                ctx.fillText(`${k}`,lx,ly);
                ctx.fillText(`(${Math.round(pct*100)}%)`,lx,ly+14);
            }
            startAngle+=angle;
        });
        let ly=PAD.t+8;
        keys.slice(0,8).forEach((k,i)=>{
            ctx.fillStyle=COLS[i%COLS.length];ctx.fillRect(W-PAD.r-90,ly,12,12);
            ctx.fillStyle='#94a3b8';ctx.font='11px Arial';ctx.textAlign='left';
            ctx.fillText(`${k}: ${s.freq[k]} (${Math.round(s.freq[k]/total*100)}%)`,W-PAD.r-74,ly+10);
            ly+=18;
        });
        ctx.fillStyle='#60a5fa';ctx.font='bold 13px Arial';ctx.textAlign='center';
        ctx.fillText('Gráfico de Torta',cx,PAD.t-10);
    }
    document.getElementById('est-mini').innerHTML=
        `📊 n=${s.n}  ·  x̄=${s.mean}  ·  σ=${s.stdDev}  ·  Mediana=${s.median}  ·  Mín=${s.min}  ·  Máx=${s.max}  ·  Q1=${s.Q1}  ·  Q3=${s.Q3}`;
}

// ════════════════════════════════════════════════════════════
//  SISTEMA DE TABS Y ACCIONES
// ════════════════════════════════════════════════════════════
function switchTab(panelId){
    const prefix=panelId.split('-')[0];
    ['calc','graf'].forEach(suf=>{
        const el=document.getElementById(`${prefix}-${suf}-panel`);
        if(el)el.style.display='none';
    });
    const target=document.getElementById(panelId+'-panel');
    if(target)target.style.display='block';
    document.querySelectorAll('.graf-tab').forEach(btn=>{
        btn.classList.toggle('active',btn.getAttribute('onclick')?.includes(`'${panelId}'`));
    });
}

function init(materiaId){
    MAT=materiaId;
    const sec=document.getElementById('mat-calc-section');
    const cont=document.getElementById('mat-calc-container');
    if(!sec||!cont)return;
    sec.style.display='block';
    const titulo=sec.querySelector('.mat-section-title');
    if(titulo)titulo.textContent='🧮 Calculadora y Graficadora';
    inyectarCSS();
    if(materiaId==='geometria') renderGeometria(cont);
    else if(materiaId==='calculo') renderCalculo(cont);
    else if(materiaId==='estadistica') renderEstadistica(cont);
}

// ── API pública ───────────────────────────────────────────────
window._graf={
    tab: switchTab,
    calcGeoAction(){
        const tipo=getStr('geo-tipo');
        // Verificar campos
        const faltantes=FIGURAS[tipo]?.c.filter(c=>isNaN(getVal('geo-c-'+c.id))||getVal('geo-c-'+c.id)<=0);
        if(faltantes?.length){showErr('geo-error',`Ingresá valores válidos en: ${faltantes.map(c=>c.l).join(', ')}`);document.getElementById('geo-result').style.display='none';return;}
        hideErr('geo-error');
        const res=calcGeo(tipo);
        if(!res)return;
        document.getElementById('geo-result').style.display='block';
        document.getElementById('geo-res-items').innerHTML=res.items.map(([l,v,u])=>resItem(l,v,u||'')).join('');
        document.getElementById('geo-formula').textContent=res.formula;
    },
    dibujarGeoAction(){
        const tipo=document.getElementById('geo-tipo2')?.value||'circulo';
        // Sync campos2 → geo-c- usando los valores de geo-g-
        FIGURAS[tipo]?.c.forEach(c=>{
            const src=document.getElementById('geo-g-'+c.id);
            const dst=document.getElementById('geo-c-'+c.id);
            if(src&&dst) dst.value=src.value;
        });
        // Dibujar con prefijo geo-c-
        dibujarFigura(tipo,'geo-c-');
    },
    calcCalculo,
    graficarCalculo,
    calcEst,
    graficarEst,
    init,
};
window.initGraficadora=init;

})();
