// ================================================================
//  MATEMÁTICAS ACTIVA — calculadora.js
//  Calculadora de ejercicios aleatorios por materia
//  Materias: algebra | aritmetica | trigonometria
//  Niveles: secundario | superior
// ================================================================

(function () {

    // ── Utilidades matemáticas ─────────────────────────────────
    function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
    function mcm(a, b) { return Math.abs(a * b) / gcd(a, b); }
    function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function fracSimp(num, den) {
        if (den === 0) return { num: 0, den: 1 };
        const g = gcd(Math.abs(num), Math.abs(den));
        const s = den < 0 ? -1 : 1;
        return { num: s * num / g, den: s * den / g };
    }
    function fracStr(f) { return f.den === 1 ? `${f.num}` : `${f.num}/${f.den}`; }
    function fracVal(f) { return f.num / f.den; }

    // Verifica si la respuesta del usuario es correcta (numérica o fracción)
    function respuestaCorrecta(input, esperado, tolerancia = 0.005) {
        const s = input.toString().trim().replace(',', '.').replace('−', '-');
        // Intento directo numérico
        const n = parseFloat(s);
        if (!isNaN(n)) return Math.abs(n - esperado) <= tolerancia + Math.abs(esperado) * 0.001;
        // Intento fracción a/b
        const m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
        if (m) return Math.abs(parseInt(m[1]) / parseInt(m[2]) - esperado) <= tolerancia;
        // Respuestas especiales trig
        const trig = { '√3/2': Math.sqrt(3)/2, '√2/2': Math.sqrt(2)/2, '√3/3': Math.sqrt(3)/3,
                       '√3': Math.sqrt(3), '√2': Math.sqrt(2), '1/√3': 1/Math.sqrt(3) };
        if (trig[s] !== undefined) return Math.abs(trig[s] - esperado) <= tolerancia;
        return false;
    }

    // ── Tabla de ángulos notables ──────────────────────────────
    const ANGULOS = {
        0:   { sin: 0,             cos: 1,              tan: 0,             sinD: "0",     cosD: "1",      tanD: "0" },
        30:  { sin: 0.5,           cos: Math.sqrt(3)/2, tan: Math.sqrt(3)/3,sinD: "1/2",  cosD: "√3/2",   tanD: "√3/3" },
        45:  { sin: Math.sqrt(2)/2,cos: Math.sqrt(2)/2, tan: 1,             sinD: "√2/2", cosD: "√2/2",   tanD: "1" },
        60:  { sin: Math.sqrt(3)/2,cos: 0.5,            tan: Math.sqrt(3),  sinD: "√3/2", cosD: "1/2",    tanD: "√3" },
        90:  { sin: 1,             cos: 0,              tan: null,          sinD: "1",     cosD: "0",      tanD: "no existe" },
        120: { sin: Math.sqrt(3)/2,cos: -0.5,           tan: -Math.sqrt(3), sinD: "√3/2", cosD: "-1/2",   tanD: "-√3" },
        135: { sin: Math.sqrt(2)/2,cos: -Math.sqrt(2)/2,tan: -1,            sinD: "√2/2", cosD: "-√2/2",  tanD: "-1" },
        150: { sin: 0.5,           cos: -Math.sqrt(3)/2,tan: -Math.sqrt(3)/3,sinD:"1/2",  cosD: "-√3/2",  tanD: "-√3/3" },
        180: { sin: 0,             cos: -1,             tan: 0,             sinD: "0",     cosD: "-1",     tanD: "0" },
    };

    // ── GENERADORES DE EJERCICIOS ──────────────────────────────
    // Cada generador devuelve: { enunciado, respuesta, respuestaTexto, pista, solucion, tipo }

    const GEN = {

        // ════════ ARITMÉTICA ════════════════════════════════════
        aritmetica: {

            secundario: [

                // Suma de fracciones
                function() {
                    const denoms = [2,3,4,5,6,8,10];
                    const b = pick(denoms), d = pick(denoms.filter(x => x !== b));
                    const a = rnd(1, b-1), c = rnd(1, d-1);
                    const lcd = mcm(b, d);
                    const rn = a*(lcd/b) + c*(lcd/d);
                    const r = fracSimp(rn, lcd);
                    return {
                        tipo: "Suma de fracciones",
                        enunciado: `Calculá: <span class="calc-expr">${a}/${b} + ${c}/${d}</span>`,
                        respuesta: fracVal(r),
                        respuestaTexto: fracStr(r),
                        pista: `El mínimo común múltiplo de ${b} y ${d} es ${lcd}.`,
                        solucion: `MCM(${b}, ${d}) = ${lcd}\n${a}/${b} = ${a*(lcd/b)}/${lcd}\n${c}/${d} = ${c*(lcd/d)}/${lcd}\n${a*(lcd/b)}/${lcd} + ${c*(lcd/d)}/${lcd} = ${rn}/${lcd} = ${fracStr(r)}`
                    };
                },

                // Resta de fracciones
                function() {
                    const denoms = [2,3,4,5,6,8,10];
                    const b = pick(denoms), d = pick(denoms.filter(x => x !== b));
                    const lcd = mcm(b, d);
                    let a, c;
                    do { a = rnd(1, b); c = rnd(1, d); } while (a*(lcd/b) <= c*(lcd/d));
                    const rn = a*(lcd/b) - c*(lcd/d);
                    const r = fracSimp(rn, lcd);
                    return {
                        tipo: "Resta de fracciones",
                        enunciado: `Calculá: <span class="calc-expr">${a}/${b} − ${c}/${d}</span>`,
                        respuesta: fracVal(r),
                        respuestaTexto: fracStr(r),
                        pista: `El mínimo común múltiplo de ${b} y ${d} es ${lcd}.`,
                        solucion: `MCM(${b}, ${d}) = ${lcd}\n${a*(lcd/b)}/${lcd} − ${c*(lcd/d)}/${lcd} = ${rn}/${lcd} = ${fracStr(r)}`
                    };
                },

                // Multiplicación de fracciones
                function() {
                    const b = pick([2,3,4,5,6]), d = pick([2,3,4,5,6]);
                    const a = rnd(1, b+2), c = rnd(1, d+2);
                    const r = fracSimp(a*c, b*d);
                    return {
                        tipo: "Multiplicación de fracciones",
                        enunciado: `Calculá: <span class="calc-expr">${a}/${b} × ${c}/${d}</span>`,
                        respuesta: fracVal(r),
                        respuestaTexto: fracStr(r),
                        pista: "Se multiplican numeradores entre sí y denominadores entre sí.",
                        solucion: `${a}/${b} × ${c}/${d} = (${a}×${c}) / (${b}×${d}) = ${a*c}/${b*d} = ${fracStr(r)}`
                    };
                },

                // División de fracciones
                function() {
                    const b = pick([2,3,4,5,6]), d = pick([2,3,4,5,6]);
                    const a = rnd(1, b+2), c = rnd(1, d+2);
                    const r = fracSimp(a*d, b*c);
                    return {
                        tipo: "División de fracciones",
                        enunciado: `Calculá: <span class="calc-expr">${a}/${b} ÷ ${c}/${d}</span>`,
                        respuesta: fracVal(r),
                        respuestaTexto: fracStr(r),
                        pista: "Dividir por una fracción = multiplicar por su inversa.",
                        solucion: `${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c} = ${a*d}/${b*c} = ${fracStr(r)}`
                    };
                },

                // Porcentaje directo
                function() {
                    const pcts = [10,15,20,25,30,40,50,60,75];
                    const p = pick(pcts);
                    const bases = [20,40,50,80,100,120,150,200,250,400];
                    const base = pick(bases.filter(b => (b*p)%100 === 0));
                    const ans = base * p / 100;
                    return {
                        tipo: "Porcentaje",
                        enunciado: `¿Cuánto es el <span class="calc-expr">${p}%</span> de <span class="calc-expr">${base}</span>?`,
                        respuesta: ans,
                        respuestaTexto: `${ans}`,
                        pista: `Multiplicá ${base} × ${p} y dividí por 100.`,
                        solucion: `${base} × ${p} / 100 = ${base*p} / 100 = ${ans}`
                    };
                },

                // Potencias enteras
                function() {
                    const a = rnd(2, 9), n = pick([2,3]);
                    const ans = Math.pow(a, n);
                    return {
                        tipo: "Potencias",
                        enunciado: `Calculá: <span class="calc-expr">${a}<sup>${n}</sup></span>`,
                        respuesta: ans,
                        respuestaTexto: `${ans}`,
                        pista: n===2 ? `${a}² = ${a} × ${a}` : `${a}³ = ${a} × ${a} × ${a}`,
                        solucion: n===2 ? `${a}² = ${a} × ${a} = ${ans}` : `${a}³ = ${a} × ${a} × ${a} = ${a*a} × ${a} = ${ans}`
                    };
                },

                // Raíz cuadrada (cuadrados perfectos)
                function() {
                    const n = rnd(2, 20);
                    const num = n*n;
                    return {
                        tipo: "Raíz cuadrada",
                        enunciado: `Calculá: <span class="calc-expr">√${num}</span>`,
                        respuesta: n,
                        respuestaTexto: `${n}`,
                        pista: `Pensá qué número multiplicado por sí mismo da ${num}.`,
                        solucion: `√${num} = ${n}  (porque ${n} × ${n} = ${num})`
                    };
                },

                // Regla de tres simple
                function() {
                    const a = rnd(2, 10), b = rnd(2, 15), k = rnd(2, 8);
                    const c = a * k, ans = b * k;
                    return {
                        tipo: "Regla de tres",
                        enunciado: `Si ${a} kg de fruta cuestan $${b}, ¿cuánto cuestan ${c} kg?`,
                        respuesta: ans,
                        respuestaTexto: `$${ans}`,
                        pista: `Dividí para encontrar el precio por kg, luego multiplicá.`,
                        solucion: `Precio por kg: $${b} ÷ ${a} = $${b/a > Math.floor(b/a) ? (b/a).toFixed(2) : b/a}\nPrecio de ${c} kg: $${b/a > Math.floor(b/a) ? (b/a).toFixed(2) : b/a} × ${c} = $${ans}`
                    };
                },

            ],

            superior: [

                // Operación combinada con fracciones
                function() {
                    const b = pick([3,4,5,6]), d = pick([2,3,4]), f = pick([2,3,5]);
                    const a = rnd(1, b), c = rnd(1, d), e = rnd(1, f);
                    const lcd = mcm(b,d);
                    const sumNum = a*(lcd/b) + c*(lcd/d);
                    const r = fracSimp(sumNum * e, lcd * f);
                    return {
                        tipo: "Operación combinada",
                        enunciado: `Calculá: <span class="calc-expr">(${a}/${b} + ${c}/${d}) × ${e}/${f}</span>`,
                        respuesta: fracVal(r),
                        respuestaTexto: fracStr(r),
                        pista: `Primero resolvé la suma entre paréntesis, luego multiplicá.`,
                        solucion: `Suma: ${a}/${b} + ${c}/${d} = ${sumNum}/${lcd}\nMultiplicación: ${sumNum}/${lcd} × ${e}/${f} = ${sumNum*e}/${lcd*f} = ${fracStr(r)}`
                    };
                },

                // Porcentaje inverso
                function() {
                    const pcts = [10,20,25,40,50];
                    const p = pick(pcts);
                    const base = rnd(2, 20) * (100/p);
                    const x = base * p / 100;
                    return {
                        tipo: "Porcentaje inverso",
                        enunciado: `<span class="calc-expr">${x}</span> es el <span class="calc-expr">${p}%</span> de ¿qué número?`,
                        respuesta: base,
                        respuestaTexto: `${base}`,
                        pista: `Si X es el P% de N, entonces N = X × 100 / P`,
                        solucion: `N = ${x} × 100 / ${p} = ${x*100} / ${p} = ${base}`
                    };
                },

                // Potencias negativas
                function() {
                    const a = pick([2,3,4,5,10]), n = pick([1,2,3]);
                    const denom = Math.pow(a, n);
                    return {
                        tipo: "Potencias negativas",
                        enunciado: `Calculá: <span class="calc-expr">${a}<sup>−${n}</sup></span> (expresá como fracción o decimal)`,
                        respuesta: 1/denom,
                        respuestaTexto: `1/${denom}`,
                        pista: `a⁻ⁿ = 1/aⁿ`,
                        solucion: `${a}⁻${n} = 1/${a}${n>1?'ⁿ':''} = 1/${denom} ≈ ${(1/denom).toFixed(4)}`
                    };
                },

                // MCM de dos números
                function() {
                    const a = rnd(2, 12), b = rnd(2, 12);
                    const ans = mcm(a, b);
                    const g = gcd(a, b);
                    return {
                        tipo: "Mínimo Común Múltiplo",
                        enunciado: `Calculá el MCM de <span class="calc-expr">${a}</span> y <span class="calc-expr">${b}</span>`,
                        respuesta: ans,
                        respuestaTexto: `${ans}`,
                        pista: `MCM(a,b) = (a × b) / MCD(a,b)`,
                        solucion: `MCD(${a}, ${b}) = ${g}\nMCM(${a}, ${b}) = (${a} × ${b}) / ${g} = ${a*b} / ${g} = ${ans}`
                    };
                },

                // Expresión con variables
                function() {
                    const x = rnd(-4, 4), y = rnd(-4, 4);
                    const a = rnd(1, 4), b = rnd(1, 4);
                    const ans = a*x*x - b*y;
                    return {
                        tipo: "Valor numérico",
                        enunciado: `Si x = ${x} e y = ${y}, calculá: <span class="calc-expr">${a}x² − ${b}y</span>`,
                        respuesta: ans,
                        respuestaTexto: `${ans}`,
                        pista: `Sustituí los valores: ${a}×(${x})² − ${b}×(${y})`,
                        solucion: `${a}×(${x})² − ${b}×(${y})\n= ${a}×${x*x} − ${b*y > 0 ? b+'×'+y : '('+b+'×'+y+')'}\n= ${a*x*x} ${b*y >= 0 ? '− '+b*y : '+ '+Math.abs(b*y)}\n= ${ans}`
                    };
                },

            ],
        },

        // ════════ ÁLGEBRA ═══════════════════════════════════════
        algebra: {

            secundario: [

                // Ecuación lineal simple ax + b = c
                function() {
                    const xSol = rnd(-6, 6);
                    const a = rnd(2, 7), b = rnd(-10, 10);
                    const c = a * xSol + b;
                    const eq = `${a}x ${b>=0?'+':''}${b} = ${c}`;
                    return {
                        tipo: "Ecuación lineal",
                        enunciado: `Resolvé: <span class="calc-expr">${eq}</span> → Hallá x`,
                        respuesta: xSol,
                        respuestaTexto: `x = ${xSol}`,
                        pista: `Despejá x: pasá ${b} al otro lado y dividí por ${a}.`,
                        solucion: `${eq}\n${a}x = ${c} ${b>=0?'− '+b:'+ '+Math.abs(b)}\n${a}x = ${c - b}\nx = ${c-b} / ${a}\nx = ${xSol}`
                    };
                },

                // Ecuación con paréntesis a(x + b) = c
                function() {
                    const xSol = rnd(-5, 5);
                    const a = rnd(2, 6), b = rnd(-8, 8);
                    const c = a * (xSol + b);
                    return {
                        tipo: "Ecuación con paréntesis",
                        enunciado: `Resolvé: <span class="calc-expr">${a}(x ${b>=0?'+':'-'} ${Math.abs(b)}) = ${c}</span> → Hallá x`,
                        respuesta: xSol,
                        respuestaTexto: `x = ${xSol}`,
                        pista: `Dividí ambos lados por ${a} primero.`,
                        solucion: `${a}(x ${b>=0?'+ '+b:'− '+Math.abs(b)}) = ${c}\nx ${b>=0?'+ '+b:'− '+Math.abs(b)} = ${c} / ${a} = ${c/a}\nx = ${c/a} ${b>=0?'− '+b:'+ '+Math.abs(b)} = ${xSol}`
                    };
                },

                // Valor de función lineal
                function() {
                    const a = rnd(-4, 4), b = rnd(-10, 10), k = rnd(-5, 5);
                    while (a === 0) { a = rnd(-4, 4); }
                    const ans = a*k + b;
                    return {
                        tipo: "Valor de función",
                        enunciado: `Sea f(x) = <span class="calc-expr">${a}x ${b>=0?'+':''} ${b}</span>. Calculá f(${k})`,
                        respuesta: ans,
                        respuestaTexto: `${ans}`,
                        pista: `Reemplazá x por ${k} en la expresión.`,
                        solucion: `f(${k}) = ${a}×(${k}) + (${b})\n= ${a*k} + (${b})\n= ${ans}`
                    };
                },

                // Reducción de términos semejantes
                function() {
                    const a = rnd(1,6), b = rnd(1,6), c = rnd(-5,5), d = rnd(-5,5);
                    const coef = a + b, cte = c + d;
                    return {
                        tipo: "Términos semejantes",
                        enunciado: `Simplificá: <span class="calc-expr">${a}x ${c>=0?'+':''} ${c} + ${b}x ${d>=0?'+':''} ${d}</span>`,
                        respuesta: null,  // respuesta textual
                        respuestaTexto: cte === 0 ? `${coef}x` : `${coef}x ${cte>=0?'+':''} ${cte}`,
                        tipo2: "texto",
                        pista: `Agrupá los términos con x por un lado y los números por otro.`,
                        solucion: `Términos en x: ${a}x + ${b}x = ${coef}x\nTérminos independientes: (${c}) + (${d}) = ${cte}\nResultado: ${coef}x ${cte===0?'':(cte>0?'+ '+cte:cte)}`
                    };
                },

                // Verificar si un valor es solución
                function() {
                    const xSol = rnd(-4, 4);
                    const a = rnd(2, 5), b = rnd(-8, 8);
                    const c = a * xSol + b;
                    const fakeX = xSol + pick([-3,-2,-1,1,2,3]);
                    const candidatos = [xSol, fakeX];
                    const elegido = pick(candidatos);
                    const esSol = elegido === xSol;
                    return {
                        tipo: "Verificación de solución",
                        enunciado: `¿Es x = ${elegido} solución de <span class="calc-expr">${a}x ${b>=0?'+':''} ${b} = ${c}</span>? Respondé: si o no`,
                        respuesta: null,
                        respuestaTexto: esSol ? "si" : "no",
                        tipo2: "texto",
                        pista: `Reemplazá x = ${elegido} en la ecuación y verificá si da ${c}.`,
                        solucion: `Reemplazando x = ${elegido}:\n${a}×(${elegido}) + (${b}) = ${a*elegido+b}\n${a*elegido+b} ${esSol?'=':'≠'} ${c}\n→ x = ${elegido} ${esSol?'SÍ es':'NO es'} solución`
                    };
                },

            ],

            superior: [

                // Ecuación cuadrática
                function() {
                    const r1 = rnd(-6, 6), r2 = rnd(-6, 6);
                    while (r1 === r2 || r1 === 0 || r2 === 0) { r1 = rnd(-6,6); r2 = rnd(-6,6); }
                    // x² - (r1+r2)x + r1*r2 = 0
                    const b = -(r1 + r2), c = r1 * r2;
                    const disc = b*b - 4*c;
                    const sols = [Math.min(r1,r2), Math.max(r1,r2)];
                    return {
                        tipo: "Ecuación cuadrática",
                        enunciado: `Resolvé: <span class="calc-expr">x² ${b>=0?'+':''} ${b}x ${c>=0?'+':''} ${c} = 0</span><br><small>Escribí las dos soluciones separadas por coma: ej. −3, 2</small>`,
                        respuesta: null,
                        respuestaTexto: `${sols[0]}, ${sols[1]}`,
                        tipo2: "doble",
                        vals: sols,
                        pista: `Discriminante: Δ = b² − 4ac = ${b}² − 4×${c} = ${disc}`,
                        solucion: `a=1, b=${b}, c=${c}\nΔ = ${b}² − 4×1×${c} = ${b*b} − ${4*c} = ${disc}\nx = (−${b} ± √${disc}) / 2\nx₁ = ${r1}, x₂ = ${r2}`
                    };
                },

                // Sistema de ecuaciones 2x2
                function() {
                    const xS = rnd(-4, 4), yS = rnd(-4, 4);
                    while (xS === 0 || yS === 0) { xS = rnd(-4,4); yS = rnd(-4,4); }
                    const a1 = rnd(1,4), b1 = rnd(1,4), a2 = rnd(1,4), b2 = rnd(1,4);
                    while (a1*b2 === a2*b1) { a2 = rnd(1,4); b2 = rnd(1,4); } // evitar sistema sin solución única
                    const c1 = a1*xS + b1*yS, c2 = a2*xS + b2*yS;
                    return {
                        tipo: "Sistema de ecuaciones",
                        enunciado: `Resolvé el sistema:<br><span class="calc-expr">${a1}x + ${b1}y = ${c1}</span><br><span class="calc-expr">${a2}x + ${b2}y = ${c2}</span><br><small>Escribí: x = … , y = …</small>`,
                        respuesta: null,
                        respuestaTexto: `x=${xS}, y=${yS}`,
                        tipo2: "sistema",
                        vals: [xS, yS],
                        pista: `Usá sustitución o eliminación para despejar una incógnita.`,
                        solucion: `De la Ec.1: multiplicando por ${b2} → ${a1*b2}x + ${b1*b2}y = ${c1*b2}\nDe la Ec.2: multiplicando por ${b1} → ${a2*b1}x + ${b2*b1}y = ${c2*b1}\nRestando: ${a1*b2-a2*b1}x = ${c1*b2-c2*b1} → x = ${xS}\nSustituindo: y = ${yS}`
                    };
                },

                // Producto notable: (a + b)²
                function() {
                    const a = rnd(1, 8), b = rnd(1, 8);
                    const sig = pick([1, -1]);
                    const bSig = b * sig;
                    // (a + bSig)² = a² + 2a*bSig + bSig²
                    const coef2ab = 2*a*bSig, bCuad = bSig*bSig;
                    const label = sig > 0 ? `(${a} + ${b})²` : `(${a} − ${b})²`;
                    const res = `${a*a} ${coef2ab>=0?'+ ':''}${coef2ab}x${bCuad>=0?' + ':' '}${bCuad}`;
                    // En realidad es cuadrado de binomio sin variable... mejor con variable
                    const r1 = a*a, r2 = 2*a*bSig, r3 = bSig*bSig;
                    return {
                        tipo: "Producto notable",
                        enunciado: `Desarrollá: <span class="calc-expr">(x ${sig>0?'+ '+b:'− '+b})²</span>`,
                        respuesta: null,
                        respuestaTexto: `x² ${r2>=0?'+ '+r2:'− '+Math.abs(r2)}x ${r3>=0?'+ '+r3:'− '+Math.abs(r3)}`,
                        tipo2: "texto",
                        pista: `(x ${sig>0?'+ b':'− b'})² = x² ${sig>0?'+ 2bx + b²':'− 2bx + b²'}`,
                        solucion: `(x ${sig>0?'+ '+b:'− '+b})²\n= x² + 2×(${sig>0?b:-b})×x + (${sig>0?b:-b})²\n= x² ${r2>=0?'+ '+r2:r2}x ${r3>=0?'+ '+r3:r3}`
                    };
                },

                // Logaritmo en base b
                function() {
                    const bases = [2, 3, 5, 10];
                    const base = pick(bases);
                    const exp = rnd(1, 4);
                    const num = Math.pow(base, exp);
                    return {
                        tipo: "Logaritmos",
                        enunciado: `Calculá: <span class="calc-expr">log<sub>${base}</sub>(${num})</span>`,
                        respuesta: exp,
                        respuestaTexto: `${exp}`,
                        pista: `log_b(x) = n significa que b^n = x. ¿Cuánto es ${base}^? = ${num}?`,
                        solucion: `log_${base}(${num}) = ${exp}  (porque ${base}^${exp} = ${num})`
                    };
                },

                // Ecuación fraccionaria simple
                function() {
                    const xSol = rnd(-5, 5);
                    while (xSol === 0) { xSol = rnd(-5, 5); }
                    const a = rnd(2, 8), b = rnd(1, 6);
                    const c = a + b * xSol;
                    return {
                        tipo: "Ecuación fraccionaria",
                        enunciado: `Resolvé: <span class="calc-expr">${a}/x ${b>=0?'+':''} ${b} = ${c}/x + ${c - a} / x</span>`,
                        respuesta: xSol,
                        respuestaTexto: `x = ${xSol}`,
                        tipo2: null,
                        pista: `Multiplicá ambos miembros por x para eliminar denominadores.`,
                        solucion: `Multiplicando por x:\n${a} + ${b}x = ${c}\n${b}x = ${c - a}\nx = ${(c-a)/b} = ${xSol}`
                    };
                },

            ],
        },

        // ════════ TRIGONOMETRÍA ═════════════════════════════════
        trigonometria: {

            secundario: [

                // Valor de función trigonométrica en ángulo notable
                function() {
                    const angulos = [0, 30, 45, 60, 90, 120, 135, 150, 180];
                    const fns = ['sin', 'cos'];
                    const fn = pick(fns);
                    let ang;
                    // Para tan, evitar 90°
                    do { ang = pick(angulos); } while (fn === 'tan' && ang === 90);
                    const dat = ANGULOS[ang];
                    const val = dat[fn];
                    const valD = dat[fn + 'D'];
                    const fnName = fn === 'sin' ? 'sen' : fn === 'cos' ? 'cos' : 'tan';
                    return {
                        tipo: "Funciones en ángulos notables",
                        enunciado: `Calculá: <span class="calc-expr">${fnName}(${ang}°)</span><br><small>Podés escribir fracción como √3/2, 1/2, √2/2 o valor decimal (2 decimales)</small>`,
                        respuesta: val,
                        respuestaTexto: valD,
                        pista: `Recordá la tabla de ángulos notables para ${ang}°.`,
                        solucion: `${fnName}(${ang}°) = ${valD} ≈ ${val !== null ? val.toFixed(4) : 'no existe'}`
                    };
                },

                // Tangente en ángulo notable
                function() {
                    const angulos = [0, 30, 45, 60, 120, 135, 150, 180];
                    const ang = pick(angulos);
                    const dat = ANGULOS[ang];
                    return {
                        tipo: "Tangente en ángulo notable",
                        enunciado: `Calculá: <span class="calc-expr">tan(${ang}°)</span><br><small>Escribí el valor exacto o decimal (2 dec.)</small>`,
                        respuesta: dat.tan,
                        respuestaTexto: dat.tanD,
                        pista: `tan(x) = sen(x) / cos(x)`,
                        solucion: `tan(${ang}°) = sen(${ang}°) / cos(${ang}°) = ${dat.sinD} / ${dat.cosD} = ${dat.tanD}`
                    };
                },

                // Teorema de Pitágoras — encontrar hipotenusa
                function() {
                    const triples = [[3,4,5],[5,12,13],[8,15,17],[7,24,25],[6,8,10],[9,12,15],[12,16,20]];
                    const t = pick(triples);
                    const k = pick([1,1,1,2,3]);
                    const [a,b,c] = t.map(x=>x*k);
                    const tipo = pick([0,1,2]);
                    if (tipo === 0) {
                        return { tipo:"Teorema de Pitágoras", enunciado:`En un triángulo rectángulo, los catetos miden <span class="calc-expr">${a}</span> y <span class="calc-expr">${b}</span>. ¿Cuánto mide la hipotenusa?`, respuesta:c, respuestaTexto:`${c}`, pista:`c² = a² + b²`, solucion:`c² = ${a}² + ${b}² = ${a*a} + ${b*b} = ${a*a+b*b}\nc = √${a*a+b*b} = ${c}` };
                    } else if (tipo === 1) {
                        return { tipo:"Teorema de Pitágoras", enunciado:`La hipotenusa mide <span class="calc-expr">${c}</span> y un cateto mide <span class="calc-expr">${a}</span>. ¿Cuánto mide el otro cateto?`, respuesta:b, respuestaTexto:`${b}`, pista:`b² = c² − a²`, solucion:`b² = ${c}² − ${a}² = ${c*c} − ${a*a} = ${c*c-a*a}\nb = √${c*c-a*a} = ${b}` };
                    } else {
                        return { tipo:"Teorema de Pitágoras", enunciado:`La hipotenusa mide <span class="calc-expr">${c}</span> y un cateto mide <span class="calc-expr">${b}</span>. ¿Cuánto mide el otro cateto?`, respuesta:a, respuestaTexto:`${a}`, pista:`a² = c² − b²`, solucion:`a² = ${c}² − ${b}² = ${c*c} − ${b*b} = ${c*c-b*b}\na = √${c*c-b*b} = ${a}` };
                    }
                },

                // Identidad fundamental: dado sen, hallar cos
                function() {
                    const triples = [[3,4,5],[5,12,13],[8,15,17],[7,24,25]];
                    const t = pick(triples);
                    const [a,b,c] = t;
                    const tipo = pick([0,1]);
                    if (tipo === 0) {
                        return { tipo:"Identidad fundamental", enunciado:`Si <span class="calc-expr">sen(α) = ${a}/${c}</span> y α está en el primer cuadrante, ¿cuánto vale cos(α)?`, respuesta:b/c, respuestaTexto:`${b}/${c}`, pista:`sen²(α) + cos²(α) = 1`, solucion:`cos²(α) = 1 − sen²(α) = 1 − (${a}/${c})² = 1 − ${a*a}/${c*c} = ${c*c-a*a}/${c*c}\ncos(α) = ${b}/${c}` };
                    } else {
                        return { tipo:"Identidad fundamental", enunciado:`Si <span class="calc-expr">cos(α) = ${b}/${c}</span> y α está en el primer cuadrante, ¿cuánto vale sen(α)?`, respuesta:a/c, respuestaTexto:`${a}/${c}`, pista:`sen²(α) + cos²(α) = 1`, solucion:`sen²(α) = 1 − cos²(α) = 1 − (${b}/${c})² = 1 − ${b*b}/${c*c} = ${c*c-b*b}/${c*c}\nsen(α) = ${a}/${c}` };
                    }
                },

                // Conversión grados-radianes
                function() {
                    const table = [
                        {g:30,  r:'π/6',  rv:Math.PI/6},
                        {g:45,  r:'π/4',  rv:Math.PI/4},
                        {g:60,  r:'π/3',  rv:Math.PI/3},
                        {g:90,  r:'π/2',  rv:Math.PI/2},
                        {g:120, r:'2π/3', rv:2*Math.PI/3},
                        {g:135, r:'3π/4', rv:3*Math.PI/4},
                        {g:150, r:'5π/6', rv:5*Math.PI/6},
                        {g:180, r:'π',    rv:Math.PI},
                    ];
                    const item = pick(table);
                    return {
                        tipo: "Conversión grados-radianes",
                        enunciado: `Convertí <span class="calc-expr">${item.g}°</span> a radianes<br><small>Escribí la respuesta con π, ej: π/3, 2π/3</small>`,
                        respuesta: item.rv,
                        respuestaTexto: item.r,
                        tipo2: "texto",
                        pista: `Multiplicá los grados por π/180.`,
                        solucion: `${item.g}° × π/180 = ${item.g}π/180 = ${item.r} rad`
                    };
                },

            ],

            superior: [

                // Ecuación trigonométrica en [0°, 360°]
                function() {
                    const eqs = [
                        { enun: 'sen(x) = 1/2',  sols: '30°, 150°', check: [30,150] },
                        { enun: 'sen(x) = -1/2', sols: '210°, 330°', check: [210,330] },
                        { enun: 'cos(x) = 1/2',  sols: '60°, 300°', check: [60,300] },
                        { enun: 'cos(x) = -1/2', sols: '120°, 240°', check: [120,240] },
                        { enun: 'cos(x) = 0',    sols: '90°, 270°', check: [90,270] },
                        { enun: 'sen(x) = 0',    sols: '0°, 180°',  check: [0,180] },
                        { enun: 'tan(x) = 1',    sols: '45°, 225°', check: [45,225] },
                        { enun: 'tan(x) = -1',   sols: '135°, 315°',check: [135,315] },
                        { enun: 'tan(x) = √3',   sols: '60°, 240°', check: [60,240] },
                    ];
                    const eq = pick(eqs);
                    return {
                        tipo: "Ecuación trigonométrica",
                        enunciado: `Resolvé para x ∈ [0°, 360°]: <span class="calc-expr">${eq.enun}</span><br><small>Escribí los dos ángulos separados por coma, ej: 30°, 150°</small>`,
                        respuesta: null,
                        respuestaTexto: eq.sols,
                        tipo2: "texto",
                        pista: `Encontrá el ángulo de referencia y usá el signo para ubicar los cuadrantes.`,
                        solucion: `Soluciones en [0°, 360°]: ${eq.sols}`
                    };
                },

                // Ley de cosenos
                function() {
                    const angulos = [60, 90, 120];
                    const C = pick(angulos);
                    const a = rnd(3, 10), b = rnd(3, 10);
                    const cosC = Math.cos(C * Math.PI / 180);
                    const c2 = a*a + b*b - 2*a*b*cosC;
                    const c = Math.sqrt(c2);
                    const cRound = Math.round(c * 100) / 100;
                    return {
                        tipo: "Ley de cosenos",
                        enunciado: `En un triángulo, a = ${a}, b = ${b} y el ángulo C = ${C}°. Calculá c (redondeá a 2 decimales).<br><small>Fórmula: c² = a² + b² − 2ab·cos(C)</small>`,
                        respuesta: cRound,
                        respuestaTexto: `${cRound}`,
                        pista: `cos(${C}°) = ${cosC.toFixed(4)}`,
                        solucion: `c² = ${a}² + ${b}² − 2×${a}×${b}×cos(${C}°)\nc² = ${a*a} + ${b*b} − ${2*a*b}×(${cosC.toFixed(4)})\nc² = ${a*a+b*b} − ${(2*a*b*cosC).toFixed(2)} = ${c2.toFixed(2)}\nc = √${c2.toFixed(2)} ≈ ${cRound}`
                    };
                },

                // Arco trigonométrico
                function() {
                    const arcos = [
                        { enun: 'arcsen(1/2)',  ans: '30°', val: 30 },
                        { enun: 'arcsen(√2/2)', ans: '45°', val: 45 },
                        { enun: 'arcsen(√3/2)', ans: '60°', val: 60 },
                        { enun: 'arccos(1/2)',  ans: '60°', val: 60 },
                        { enun: 'arccos(√2/2)', ans: '45°', val: 45 },
                        { enun: 'arccos(√3/2)', ans: '30°', val: 30 },
                        { enun: 'arctan(1)',    ans: '45°', val: 45 },
                        { enun: 'arctan(√3)',   ans: '60°', val: 60 },
                    ];
                    const item = pick(arcos);
                    return {
                        tipo: "Función arco",
                        enunciado: `Calculá: <span class="calc-expr">${item.enun}</span> (en grados)`,
                        respuesta: item.val,
                        respuestaTexto: item.ans,
                        pista: `Preguntás: ¿qué ángulo tiene esa función con ese valor?`,
                        solucion: `${item.enun} = ${item.ans}`
                    };
                },

                // Identidad trigonométrica: simplificar
                function() {
                    const ids = [
                        { en: 'sen²(x) + cos²(x)', res: '1', exp: 'Esta es la identidad fundamental.' },
                        { en: '1 − sen²(x)', res: 'cos²(x)', exp: 'Despejando de sen²x + cos²x = 1.' },
                        { en: '1 − cos²(x)', res: 'sen²(x)', exp: 'Despejando de sen²x + cos²x = 1.' },
                        { en: 'sen(x)/cos(x)', res: 'tan(x)', exp: 'Definición de tangente.' },
                        { en: 'sen(x) × (1/sen(x))', res: '1', exp: 'Producto de un número por su inverso.' },
                    ];
                    const id = pick(ids);
                    return {
                        tipo: "Identidades trigonométricas",
                        enunciado: `Simplificá: <span class="calc-expr">${id.en}</span>`,
                        respuesta: null,
                        respuestaTexto: id.res,
                        tipo2: "texto",
                        pista: id.exp,
                        solucion: `${id.en} = ${id.res}\n${id.exp}`
                    };
                },

            ],
        },
    };

    // ── Estado del componente ──────────────────────────────────
    let estado = { materiaId: '', dificultad: 'secundario', puntos: 0, total: 0, ejercicio: null, visto: false };

    // ── Verificar respuesta ingresada ──────────────────────────
    function chequear(input, ej) {
        if (!ej) return false;
        const s = input.trim().toLowerCase().replace(/°/g, '').replace(/\s+/g, '');
        if (ej.tipo2 === 'texto') {
            const esperado = ej.respuestaTexto.toLowerCase().replace(/\s+/g,'');
            return s === esperado || s.replace(/x=/,'').replace(/y=/,'') === esperado.replace(/x=/,'').replace(/y=/,'');
        }
        if (ej.tipo2 === 'doble' || ej.tipo2 === 'sistema') {
            // Acepta "r1, r2" en cualquier orden
            const parts = s.replace(/x=|y=/g,'').split(/[,;]/);
            if (parts.length < 2) return false;
            const n1 = parseFloat(parts[0]), n2 = parseFloat(parts[1]);
            const v = ej.vals;
            return (!isNaN(n1) && !isNaN(n2)) &&
                ((Math.abs(n1-v[0])<0.05 && Math.abs(n2-v[1])<0.05) ||
                 (Math.abs(n1-v[1])<0.05 && Math.abs(n2-v[0])<0.05));
        }
        return respuestaCorrecta(s, ej.respuesta);
    }

    // ── Generar nuevo ejercicio ────────────────────────────────
    function nuevoEjercicio() {
        const gens = GEN[estado.materiaId]?.[estado.dificultad];
        if (!gens || gens.length === 0) return;
        estado.ejercicio = pick(gens)();
        estado.visto = false;
        renderEjercicio();
    }

    // ── Render del ejercicio actual ────────────────────────────
    function renderEjercicio() {
        const c = document.getElementById('calc-card');
        if (!c || !estado.ejercicio) return;
        const ej = estado.ejercicio;
        c.innerHTML = `
            <div class="calc-tipo-badge">${ej.tipo}</div>
            <div class="calc-enunciado">${ej.enunciado}</div>
            <div class="calc-input-row">
                <input type="text" id="calc-input" class="calc-input" placeholder="Tu respuesta..."
                       autocomplete="off" autocorrect="off" spellcheck="false"
                       onkeydown="if(event.key==='Enter') window._calc.verificar()">
                <button class="calc-btn-check" onclick="window._calc.verificar()">Verificar ✓</button>
            </div>
            <div id="calc-resultado" class="calc-resultado" style="display:none"></div>
            <div class="calc-botones-extra">
                <button class="calc-btn-pista" onclick="window._calc.pista()">💡 Pista</button>
                <button class="calc-btn-nuevo" onclick="window._calc.nuevo()">→ Nuevo ejercicio</button>
            </div>`;
        document.getElementById('calc-input')?.focus();
    }

    // ── Verificar respuesta ────────────────────────────────────
    function verificar() {
        const input = document.getElementById('calc-input');
        const resDiv = document.getElementById('calc-resultado');
        if (!input || !resDiv || !estado.ejercicio) return;
        const val = input.value.trim();
        if (!val) { resDiv.style.display='block'; resDiv.className='calc-resultado calc-warn'; resDiv.innerHTML='⚠️ Escribí tu respuesta primero.'; return; }
        if (estado.visto) return;
        const ok = chequear(val, estado.ejercicio);
        estado.total++;
        if (ok) estado.puntos++;
        estado.visto = true;
        actualizarScore();
        const ej = estado.ejercicio;
        resDiv.style.display = 'block';
        resDiv.className = `calc-resultado ${ok ? 'calc-ok' : 'calc-error'}`;
        resDiv.innerHTML = ok
            ? `✅ ¡Correcto! <strong>${ej.respuestaTexto}</strong>`
            : `❌ Incorrecto. La respuesta correcta es: <strong>${ej.respuestaTexto}</strong><div class="calc-sol"><pre>${ej.solucion}</pre></div>`;
        input.disabled = true;
    }

    // ── Mostrar pista ──────────────────────────────────────────
    function pista() {
        const resDiv = document.getElementById('calc-resultado');
        if (!resDiv || !estado.ejercicio) return;
        resDiv.style.display = 'block';
        resDiv.className = 'calc-resultado calc-hint';
        resDiv.innerHTML = `💡 <em>${estado.ejercicio.pista}</em>`;
    }

    // ── Actualizar marcador ────────────────────────────────────
    function actualizarScore() {
        const el = document.getElementById('calc-score');
        if (el) el.innerHTML = `<span class="calc-score-pts">✅ ${estado.puntos}</span> / ${estado.total} correctas`;
    }

    // ── Cambiar dificultad ─────────────────────────────────────
    function setDificultad(nivel) {
        estado.dificultad = nivel;
        document.querySelectorAll('.calc-dif-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.nivel === nivel);
        });
        nuevoEjercicio();
    }

    // ── Inyectar estilos CSS ───────────────────────────────────
    function inyectarCSS() {
        if (document.getElementById('calc-style')) return;
        const style = document.createElement('style');
        style.id = 'calc-style';
        style.textContent = `
            #mat-calc-section { border: 2px solid #2563eb22; }
            .calc-dif-row { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
            .calc-dif-btn { padding:7px 20px; border-radius:100px; border:2px solid #e2e8f0; background:transparent; cursor:pointer; font-size:13px; font-weight:700; font-family:inherit; color:#64748b; transition:all .2s; }
            .calc-dif-btn.active { background:#2563eb; color:white; border-color:#2563eb; }
            .calc-score-wrap { display:flex; justify-content:flex-end; margin-bottom:12px; }
            .calc-score { font-size:13px; color:#64748b; font-weight:600; }
            .calc-score-pts { color:#16a34a; font-size:15px; }
            .calc-card { background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:16px; padding:24px; min-height:180px; }
            .calc-tipo-badge { display:inline-block; background:#dbeafe; color:#1e40af; font-size:11px; font-weight:700; padding:3px 12px; border-radius:100px; margin-bottom:14px; }
            .calc-enunciado { font-size:17px; font-weight:600; color:#0f172a; line-height:1.7; margin-bottom:18px; }
            .calc-expr { font-family:'Courier New',monospace; background:#e0f2fe; color:#0c4a6e; padding:2px 6px; border-radius:5px; font-size:1em; }
            .calc-input-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; }
            .calc-input { flex:1; min-width:160px; padding:10px 14px; border:2px solid #e2e8f0; border-radius:10px; font-size:16px; font-family:'Courier New',monospace; outline:none; transition:border-color .2s; }
            .calc-input:focus { border-color:#2563eb; background:white; }
            .calc-input:disabled { background:#f1f5f9; color:#94a3b8; }
            .calc-btn-check { padding:10px 22px; background:linear-gradient(135deg,#2563eb,#1d4ed8); color:white; border:none; border-radius:10px; font-size:15px; font-weight:700; cursor:pointer; transition:all .2s; white-space:nowrap; }
            .calc-btn-check:hover { opacity:.9; transform:translateY(-1px); }
            .calc-resultado { border-radius:10px; padding:14px 16px; font-size:14px; font-weight:600; margin-bottom:12px; }
            .calc-ok { background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; }
            .calc-error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
            .calc-hint { background:#fefce8; color:#854d0e; border:1px solid #fde68a; font-weight:400; }
            .calc-warn { background:#fff7ed; color:#9a3412; border:1px solid #fed7aa; }
            .calc-sol { margin-top:10px; }
            .calc-sol pre { font-size:13px; font-family:'Courier New',monospace; white-space:pre-wrap; color:#374151; font-weight:400; line-height:1.6; background:#1e293b; padding:12px; border-radius:8px; color:#e2e8f0; }
            .calc-botones-extra { display:flex; gap:8px; flex-wrap:wrap; }
            .calc-btn-pista { padding:8px 16px; background:#fefce8; color:#854d0e; border:1.5px solid #fde68a; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }
            .calc-btn-pista:hover { background:#fef9c3; }
            .calc-btn-nuevo { padding:8px 16px; background:#f0fdf4; color:#166534; border:1.5px solid #bbf7d0; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; }
            .calc-btn-nuevo:hover { background:#dcfce7; }
        `;
        document.head.appendChild(style);
    }

    // ── Inicializar el componente ──────────────────────────────
    function init(materiaId) {
        estado.materiaId = materiaId;
        const sec = document.getElementById('mat-calc-section');
        const cont = document.getElementById('mat-calc-container');
        if (!sec || !cont) return;
        sec.style.display = 'block';
        inyectarCSS();
        cont.innerHTML = `
            <div class="calc-dif-row">
                <span style="font-size:13px;color:#64748b;font-weight:600;align-self:center">Dificultad:</span>
                <button class="calc-dif-btn active" data-nivel="secundario" onclick="window._calc.setDif('secundario')">Secundario</button>
                <button class="calc-dif-btn" data-nivel="superior" onclick="window._calc.setDif('superior')">Superior / Universitario</button>
            </div>
            <div class="calc-score-wrap"><div id="calc-score" class="calc-score">✅ 0 / 0 correctas</div></div>
            <div id="calc-card" class="calc-card"></div>`;
        nuevoEjercicio();
    }

    // ── API pública ────────────────────────────────────────────
    window._calc = {
        nuevo: nuevoEjercicio,
        verificar: verificar,
        pista: pista,
        setDif: setDificultad,
        init: init,
    };
    window.initCalculadora = init;

})();
