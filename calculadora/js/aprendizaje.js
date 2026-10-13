/* =======================================================================
 * APRENDIZAJE (sección 2)
 *   1. "¿Por qué?": explicación ampliada de cada paso (glosario).
 *   2. Comprobar la respuesta del alumno y señalar el error.
 *   3. Modo práctica: ejercicios parecidos al resuelto, con puntaje.
 *   4. Teclado virtual de MathLive según el área.
 * Se carga ANTES de interfaz.js: acá solo hay funciones y datos; la
 * interfaz las llama cuando el alumno usa los botones.
 * ===================================================================== */
'use strict';

/* -----------------------------------------------------------------------
 * 1. GLOSARIO "¿POR QUÉ?"
 * Cada entrada: { re: expresión que busca en el título y texto del paso,
 * t: título, x: explicación, e: ejemplo en LaTeX }.
 * Para agregar una explicación nueva, sumá una línea acá.
 * --------------------------------------------------------------------- */
const GLOSARIO = [
  { re: /leemos e identificamos la incognita/, t: 'Elegir la incógnita', x: 'Lo que pregunta el problema es lo que no conocemos: a eso lo llamamos x. Si hay dos cantidades desconocidas, conviene llamar x a la que sirve de referencia (la “más chica” o la que se nombra después de “de”), así la otra se escribe a partir de x sin fracciones.', e: '\\text{“A tiene el triple que B”}\\Rightarrow B=x,\\;A=3x' },
  { re: /traducimos al lenguaje algebraico/, t: 'Del castellano a los símbolos', x: '“El doble” es multiplicar por 2, “la mitad” es dividir por 2, “aumentado en” o “más” es sumar, “disminuido en” o “menos” es restar, “es”, “da” u “obtengo” es el signo igual. “El consecutivo” de x es x + 1.', e: '\\text{el doble de un número más 3}\\;\\to\\;2x+3' },
  { re: /planteamos la ecuacion/, t: 'Plantear la ecuación', x: 'La ecuación es una igualdad que dice lo mismo que el enunciado, pero con símbolos. Una vez planteada, se resuelve como cualquier ecuación.', e: '2x+7=25' },
  { re: /descartamos lo que no tiene sentido/, t: 'Soluciones que no sirven', x: 'La ecuación no sabe de qué se trata el problema: puede dar valores negativos o con coma que no tienen sentido (una longitud negativa, una edad negativa, media persona). Esos valores se descartan.', e: 'x^2=25\\Rightarrow x=\\pm 5,\\;\\text{pero un lado mide }5' },
  { re: /verificamos en el enunciado/, t: 'Verificar en el enunciado', x: 'Si reemplazamos en nuestra ecuación y la planteamos mal, la verificación igual da bien. Por eso controlamos con los datos del enunciado original.', e: '\\text{Juan }36,\\;\\text{hijo }12:\\;36=3\\cdot 12\\;\\checkmark,\\;36+12=48\\;\\checkmark' },
  { re: /^respondemos/, t: 'Responder con una oración', x: 'El problema no pregunta “cuánto vale x”, pregunta por cosas concretas (edades, precios, medidas). La respuesta completa dice qué es cada valor y lleva la unidad.', e: '\\text{El ancho mide 5 cm y el largo, 8 cm.}' },
  { re: /jerarqu|separamos en terminos|resolvemos parentesis/, t: 'Jerarquía de las operaciones', x: 'Primero se resuelven los paréntesis, después potencias y raíces, luego multiplicaciones y divisiones (de izquierda a derecha) y por último sumas y restas. Si no respetamos ese orden, la misma cuenta da resultados distintos.', e: '2+3\\cdot 4=2+12=14\\ne 20' },
  { re: /comun denominador|mcm de los denominadores|denominador comun/, t: 'Sumar fracciones', x: 'Solo se pueden sumar partes del mismo tamaño. Por eso llevamos las fracciones a un denominador común (el mcm) y recién ahí sumamos los numeradores.', e: '\\frac{1}{2}+\\frac{1}{3}=\\frac{3}{6}+\\frac{2}{6}=\\frac{5}{6}' },
  { re: /simplific/, t: 'Simplificar', x: 'Dividir numerador y denominador por un mismo número (distinto de 0) no cambia el valor de la fracción: es como cortar la torta en porciones más grandes.', e: '\\frac{6}{8}=\\frac{6:2}{8:2}=\\frac{3}{4}' },
  { re: /\bmcd\b|maximo comun divisor/, t: 'Máximo común divisor', x: 'Es el mayor número que divide a todos a la vez. Con la factorización en primos se toman los factores comunes con su menor exponente.', e: '12=2^2\\cdot 3,\\;18=2\\cdot 3^2\\Rightarrow \\text{mcd}=2\\cdot 3=6' },
  { re: /\bmcm\b|minimo comun multiplo/, t: 'Mínimo común múltiplo', x: 'Es el menor número que es múltiplo de todos. Se toman todos los factores primos (comunes y no comunes) con su mayor exponente.', e: '\\text{mcm}(4,6)=2^2\\cdot 3=12' },
  { re: /potencia|exponente/, t: 'Propiedades de las potencias', x: 'Al multiplicar potencias de igual base se suman los exponentes; al dividir, se restan; una potencia de potencia multiplica los exponentes. Un exponente negativo es el inverso.', e: 'a^m\\cdot a^n=a^{m+n},\\quad (a^m)^n=a^{m\\cdot n},\\quad a^{-n}=\\frac{1}{a^n}' },
  // ---------- Temas nuevos ----------
  { re: /interes simple|calculamos el monto/, t: 'Interés simple', x: 'En el interés simple el interés de cada período se calcula siempre sobre el capital inicial: crece en línea recta.', e: 'M=C\\,(1+i\\cdot n)' },
  { re: /interes compuesto|interes ganado|valor actual|capitaliz/, t: 'Interés compuesto', x: 'Cada período los intereses se suman al capital y también ganan intereses: el dinero crece de forma exponencial.', e: 'M=C\\,(1+i)^n' },
  { re: /sistema frances|cuadro de amortizacion|cuota/, t: 'Sistema francés', x: 'Las cuotas son iguales. Al principio casi toda la cuota son intereses; con el tiempo, cada vez más va a reducir la deuda.', e: 'c=\\frac{C\\,i}{1-(1+i)^{-n}}' },
  { re: /anotamos los datos.*tasa|la tasa y el tiempo/, t: 'Tasa y tiempo en la misma unidad', x: 'Si la tasa es mensual, el tiempo va en meses; si es anual, en años. Si no coinciden, se convierte el tiempo.', e: '6\\text{ meses}=0{,}5\\text{ años}' },
  { re: /identificamos que contar|importa el orden/, t: '¿Qué fórmula de conteo uso?', x: 'Si importa el orden son variaciones (o permutaciones si se usan todos); si no importa, combinaciones. Si se pueden repetir, se usan las versiones “con repetición”.', e: 'V_{n,k}=\\frac{n!}{(n-k)!},\\quad C_{n,k}=\\frac{n!}{k!\\,(n-k)!}' },
  { re: /calculamos el factorial|formula de las permutaciones|permutaciones circulares/, t: 'Factorial y permutaciones', x: 'n! cuenta las formas de ordenar n elementos distintos: n opciones para el primer lugar, n − 1 para el segundo, y así.', e: '4!=4\\cdot 3\\cdot 2\\cdot 1=24' },
  { re: /formula de las combinaciones|combinaciones con repeticion/, t: 'Combinaciones', x: 'Elegir k de n sin importar el orden: se cuentan las variaciones y se divide por las k! formas de ordenar cada grupo.', e: 'C_{5,2}=\\frac{5\\cdot 4}{2!}=10' },
  { re: /formula de las variaciones|variaciones con repeticion/, t: 'Variaciones', x: 'Elegir k de n cuando importa el orden: se multiplican las opciones de cada lugar.', e: 'V_{5,2}=5\\cdot 4=20' },
  { re: /letras repetidas|usamos permutaciones con repeticion/, t: 'Permutaciones con repetición', x: 'Si hay letras iguales, intercambiarlas no forma una palabra nueva: por eso se divide por el factorial de cada repetición.', e: '\\text{OSO}:\\;\\frac{3!}{2!}=3' },
  { re: /anotamos los vectores|vector entre los puntos/, t: 'Vectores en el espacio', x: 'Un vector del espacio tiene tres componentes (x ; y ; z). El vector de A a B es B − A.', e: '\\overrightarrow{AB}=B-A' },
  { re: /calculamos los modulos|versor|modulo \(la distancia/, t: 'Módulo y versor', x: 'El módulo es la longitud del vector (Pitágoras en tres dimensiones). El versor es el vector de largo 1 en la misma dirección.', e: '|\\vec{u}|=\\sqrt{x^2+y^2+z^2}' },
  { re: /^(sumamos|restamos) se (suman|restan) componente/, t: 'Suma y resta de vectores', x: 'Se opera componente a componente. Gráficamente, la suma es la diagonal del paralelogramo que forman los vectores.', e: '(1;2;3)+(4;0;-1)=(5;2;2)' },
  { re: /producto escalar|angulo entre los vectores|proyeccion/, t: 'Producto escalar', x: 'Da un número que mide cuánto “apuntan” en la misma dirección. Si es 0, los vectores son perpendiculares.', e: '\\vec{u}\\cdot\\vec{v}=|\\vec{u}|\\,|\\vec{v}|\\cos\\alpha' },
  { re: /producto vectorial/, t: 'Producto vectorial', x: 'Da un vector perpendicular a los dos, y su módulo es el área del paralelogramo que forman.', e: '|\\vec{u}\\times\\vec{v}|=|\\vec{u}|\\,|\\vec{v}|\\,\\operatorname{sen}\\alpha' },
  { re: /producto mixto/, t: 'Producto mixto', x: 'Es el volumen (con signo) del paralelepípedo que forman tres vectores; si da 0, están en un mismo plano.', e: 'V=|(\\vec{u}\\times\\vec{v})\\cdot\\vec{w}|' },
  { re: /escribimos la sucesion|concluimos si converge|estudiamos la monotonia/, t: 'Sucesiones', x: 'Una sucesión es una lista infinita de números. Converge si sus términos se acercan a un número cuando n crece.', e: 'a_n=\\frac{1}{n}\\to 0' },
  { re: /escribimos la serie|sumas parciales/, t: 'Series', x: 'Una serie es la suma de los infinitos términos de una sucesión. Converge si las sumas parciales Sₙ se acercan a un número.', e: 'S_n=a_1+a_2+\\cdots+a_n' },
  { re: /condicion necesaria/, t: 'Condición necesaria', x: 'Si una serie converge, sus términos tienen que tender a 0. Ojo: que tiendan a 0 no alcanza (la serie armónica diverge).', e: '\\sum a_n\\text{ converge}\\Rightarrow a_n\\to 0' },
  { re: /serie geometrica/, t: 'Serie geométrica', x: 'Cada término es el anterior por la misma razón r. Converge solo si |r| < 1.', e: '\\sum_{n=0}^{\\infty} a\\,r^n=\\frac{a}{1-r}' },
  { re: /una serie p\b/, t: 'Serie p', x: 'La serie de 1/nᵖ converge si p > 1 y diverge si p ≤ 1. Sirve para comparar con otras series.', e: '\\sum\\frac{1}{n^2}\\text{ converge},\\;\\sum\\frac{1}{n}\\text{ diverge}' },
  { re: /leibniz/, t: 'Criterio de Leibniz', x: 'En una serie alternada, si el valor absoluto de los términos decrece y tiende a 0, la serie converge.', e: '1-\\tfrac12+\\tfrac13-\\tfrac14+\\cdots=\\ln 2' },
  { re: /criterio del cociente/, t: 'Criterio del cociente', x: 'Se compara cada término con el anterior: si a la larga el cociente es menor que 1, los términos se achican como en una geométrica.', e: 'L=\\lim\\left|\\frac{a_{n+1}}{a_n}\\right|<1\\Rightarrow\\text{converge}' },
  { re: /ecuacion diferencial relaciona|integramos directamente/, t: 'Ecuaciones diferenciales', x: 'Relacionan una función con su derivada. Resolverla es encontrar todas las funciones que la cumplen (por eso aparece una constante C).', e: "y'=2x\\Rightarrow y=x^2+C" },
  { re: /factor integrante|reconocemos una ecuacion lineal|integramos y despejamos/, t: 'Ecuación lineal', x: 'En y\' + p·y = q se multiplica por μ = e^{∫p}: el primer miembro se convierte en la derivada de μ·y.', e: "(\\mu y)'=\\mu q" },
  { re: /separamos las variables|integramos los dos miembros|exponencial a ambos miembros|dejamos la solucion implicita/, t: 'Variables separables', x: 'Si y\' = f(x)·g(y), se juntan las y con dy y las x con dx, y se integra cada lado.', e: '\\frac{dy}{g(y)}=f(x)\\,dx' },
  { re: /usamos la condicion inicial/, t: 'Condición inicial', x: 'Entre todas las soluciones (una para cada C), la condición inicial elige la que pasa por un punto dado.', e: 'y(0)=2\\Rightarrow C=2' },
  { re: /curva solucion pasa/, t: 'Curva solución', x: 'Cada valor de C da una curva distinta; la condición inicial fija la que pasa por el punto.', e: 'y=C\\,e^{3x}' },
  { re: /radical|extraemos|racionaliz|raiz/, t: 'Raíces', x: 'Una raíz se puede simplificar sacando los factores que tienen exponente igual al índice. Para racionalizar multiplicamos arriba y abajo por lo que hace desaparecer la raíz del denominador.', e: '\\sqrt{72}=\\sqrt{36\\cdot 2}=6\\sqrt{2}' },
  { re: /distribu/, t: 'Propiedad distributiva', x: 'Multiplicar por una suma es lo mismo que multiplicar por cada término y sumar los resultados. Así “sacamos” los paréntesis.', e: '3(x+2)=3x+6' },
  { re: /semejantes|juntamos/, t: 'Términos semejantes', x: 'Solo se pueden sumar términos que tienen la misma parte literal (las mismas letras con los mismos exponentes): se suman sus coeficientes.', e: '3x^2+5x-x^2+2x=2x^2+7x' },
  { re: /despej|pasamos .* (restando|sumando|dividiendo|multiplicando)|transpon/, t: 'Despejar', x: 'En una igualdad podemos hacer lo mismo de los dos lados sin que deje de ser cierta. “Pasar restando” es en realidad restar lo mismo en ambos miembros.', e: '2x+3=11\\Rightarrow 2x=8\\Rightarrow x=4' },
  { re: /resolvente|bhaskara|discriminante/, t: 'Fórmula resolvente', x: 'Sale de completar cuadrados en ax² + bx + c = 0. El discriminante b² − 4ac dice cuántas soluciones reales hay: positivo, dos; cero, una; negativo, ninguna.', e: 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}' },
  { re: /completar cuadrados|completamos (el )?cuadrado/, t: 'Completar cuadrados', x: 'Sumamos y restamos el número que convierte una parte de la expresión en un trinomio cuadrado perfecto, para escribirla como (x + k)².', e: 'x^2+6x=(x+3)^2-9' },
  { re: /factor comun/, t: 'Factor común', x: 'Si todos los términos comparten un factor, lo sacamos afuera de un paréntesis (es la distributiva al revés).', e: '6x^3-9x=3x(2x^2-3)' },
  { re: /diferencia de cuadrados/, t: 'Diferencia de cuadrados', x: 'El producto de una suma por una diferencia da la diferencia de los cuadrados; leído al revés, sirve para factorizar.', e: 'a^2-b^2=(a+b)(a-b)' },
  { re: /trinomio cuadrado perfecto|cuadrado de un binomio/, t: 'Cuadrado de un binomio', x: 'El cuadrado de un binomio es el cuadrado del primero, más el doble producto, más el cuadrado del segundo.', e: '(a+b)^2=a^2+2ab+b^2' },
  { re: /ruffini/, t: 'Regla de Ruffini', x: 'Es una forma abreviada de dividir un polinomio por (x − a): se bajan los coeficientes, se multiplica por a y se suma. El último número es el resto.', e: '\\text{si el resto es }0,\\;(x-a)\\text{ es factor}' },
  { re: /gauss|raices racionales|candidatos/, t: 'Teorema de Gauss', x: 'Si un polinomio con coeficientes enteros tiene una raíz racional p/q, p divide al término independiente y q al coeficiente principal. Así sabemos qué valores probar.', e: '2x^3-3x^2-1\\;\\Rightarrow\\;\\pm 1,\\pm\\tfrac{1}{2}' },
  { re: /sustitucion|sustituimos|reemplazamos .* en la otra/, t: 'Método de sustitución', x: 'Despejamos una incógnita en una ecuación y la reemplazamos en la otra: queda una ecuación con una sola incógnita.', e: 'y=7-2x\\;\\Rightarrow\\;x-(7-2x)=2' },
  { re: /igualacion|igualamos/, t: 'Igualar', x: 'Si dos expresiones son iguales a lo mismo, son iguales entre sí: así eliminamos una incógnita o encontramos los puntos de corte.', e: 'y=2x+1,\\;y=x+3\\Rightarrow 2x+1=x+3' },
  { re: /reduccion|sumamos las ecuaciones|eliminamos/, t: 'Método de reducción', x: 'Multiplicamos las ecuaciones por números convenientes para que, al sumarlas, una incógnita se cancele.', e: '(x+y=5)+(x-y=1)\\Rightarrow 2x=6' },
  { re: /determinante|cramer|sarrus/, t: 'Determinantes', x: 'El determinante de una matriz 2×2 es ad − bc. Si es distinto de 0, el sistema tiene solución única y la regla de Cramer la da como cociente de determinantes.', e: '\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}=ad-bc' },
  { re: /logaritm/, t: 'Logaritmos', x: 'El logaritmo responde: ¿a qué exponente hay que elevar la base para obtener el número? Sus propiedades convierten productos en sumas y potencias en productos.', e: '\\log_b(xy)=\\log_b x+\\log_b y,\\quad\\log_b x^n=n\\log_b x' },
  { re: /progresion|termino general|razon comun|diferencia comun/, t: 'Progresiones', x: 'En una progresión aritmética cada término se obtiene sumando siempre lo mismo (d); en una geométrica, multiplicando siempre por lo mismo (r).', e: 'a_n=a_1+(n-1)d,\\qquad a_n=a_1\\cdot r^{\\,n-1}' },
  { re: /complejo|unidad imaginaria|conjugado de/, t: 'Números complejos', x: 'La unidad imaginaria cumple i² = −1. Con eso se opera como con binomios; para dividir se multiplica por el conjugado del denominador.', e: '(a+bi)(a-bi)=a^2+b^2' },
  { re: /pendiente/, t: 'Pendiente', x: 'La pendiente mide cuánto sube (o baja) la recta por cada unidad que avanzamos en x: es el cociente entre la variación de y y la de x.', e: 'm=\\frac{y_2-y_1}{x_2-x_1}' },
  { re: /distancia entre/, t: 'Distancia entre dos puntos', x: 'Es el teorema de Pitágoras: las diferencias de coordenadas son los catetos y la distancia, la hipotenusa.', e: 'd=\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}' },
  { re: /punto medio/, t: 'Punto medio', x: 'Cada coordenada del punto medio es el promedio de las coordenadas de los extremos.', e: 'M=\\left(\\tfrac{x_1+x_2}{2};\\tfrac{y_1+y_2}{2}\\right)' },
  { re: /circunferencia|centro y radio/, t: 'Ecuación de la circunferencia', x: 'Todos sus puntos están a la misma distancia (el radio) del centro: aplicando la fórmula de distancia se obtiene la ecuación canónica.', e: '(x-h)^2+(y-k)^2=r^2' },
  { re: /pitagoras/, t: 'Teorema de Pitágoras', x: 'En todo triángulo rectángulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos.', e: 'c^2=a^2+b^2' },
  { re: /teorema del seno/, t: 'Teorema del seno', x: 'En cualquier triángulo, cada lado es proporcional al seno del ángulo opuesto. Sirve cuando conocemos un lado y su ángulo opuesto.', e: '\\frac{a}{\\operatorname{sen}A}=\\frac{b}{\\operatorname{sen}B}=\\frac{c}{\\operatorname{sen}C}' },
  { re: /teorema del coseno/, t: 'Teorema del coseno', x: 'Generaliza a Pitágoras para triángulos no rectángulos: el término 2bc·cos A corrige la diferencia.', e: 'a^2=b^2+c^2-2bc\\cos A' },
  { re: /notable|valores exactos/, t: 'Ángulos notables', x: 'Los valores de 30°, 45° y 60° salen de un triángulo equilátero partido al medio y de un cuadrado cortado por su diagonal.', e: '\\operatorname{sen}30^{\\circ}=\\tfrac12,\\;\\cos 45^{\\circ}=\\tfrac{\\sqrt2}{2},\\;\\operatorname{tg}60^{\\circ}=\\sqrt3' },
  { re: /pitagorica|sen\^?2.*cos\^?2/, t: 'Identidad pitagórica', x: 'En la circunferencia de radio 1, el punto (cos α ; sen α) cumple x² + y² = 1.', e: '\\operatorname{sen}^2\\alpha+\\cos^2\\alpha=1' },
  { re: /regla del producto/, t: 'Regla del producto', x: 'Si dos funciones cambian a la vez, el cambio del producto es: cambia la primera con la segunda quieta, más la primera quieta con el cambio de la segunda.', e: '(u\\cdot v)\'=u\'v+uv\'' },
  { re: /regla del cociente/, t: 'Regla del cociente', x: 'Se deduce de la regla del producto escribiendo u/v = u · v⁻¹. El denominador queda al cuadrado.', e: '\\left(\\tfrac{u}{v}\\right)\'=\\frac{u\'v-uv\'}{v^2}' },
  { re: /regla de la cadena|cadena/, t: 'Regla de la cadena', x: 'Para derivar una función “dentro” de otra, derivamos la de afuera (sin tocar lo de adentro) y multiplicamos por la derivada de lo de adentro.', e: '[\\operatorname{sen}(3x)]\'=\\cos(3x)\\cdot 3' },
  { re: /regla de la potencia|bajamos el exponente/, t: 'Regla de la potencia', x: 'Al derivar xⁿ el exponente baja multiplicando y se le resta 1. Vale para cualquier exponente real.', e: '(x^5)\'=5x^4,\\quad(\\sqrt{x})\'=\\tfrac{1}{2}x^{-1/2}' },
  { re: /hopital/, t: 'Regla de L’Hôpital', x: 'Cuando un cociente da 0/0 o ∞/∞, cerca del punto se comporta como el cociente de las velocidades de cambio (las derivadas).', e: '\\lim_{x\\to 0}\\frac{\\operatorname{sen}x}{x}=\\lim\\frac{\\cos x}{1}=1' },
  { re: /indeterminacion|0\/0/, t: 'Indeterminación', x: '0/0 no es un número: indica que hay que transformar la expresión (factorizar, racionalizar…) para ver a qué valor se acerca.', e: '\\frac{x^2-4}{x-2}=\\frac{(x-2)(x+2)}{x-2}=x+2' },
  { re: /tres condiciones|continua en/, t: 'Continuidad', x: 'Intuitivamente, una función es continua si se puede dibujar sin levantar el lápiz: existe f(a), existe el límite y coinciden.', e: '\\lim_{x\\to a}f(x)=f(a)' },
  { re: /definicion|cociente incremental/, t: 'Definición de derivada', x: 'La derivada es la pendiente de la recta tangente: el límite de las pendientes de rectas secantes cuando los puntos se acercan.', e: 'f\'(x)=\\lim_{h\\to 0}\\frac{f(x+h)-f(x)}{h}' },
  { re: /puntos criticos|maximo|minimo|crece|decrece/, t: 'Máximos y mínimos', x: 'Donde la función pasa de crecer a decrecer la tangente es horizontal (f′ = 0): ahí hay un máximo. Si pasa de decrecer a crecer, un mínimo.', e: 'f\'(x)=0\\;\\text{y cambio de signo de }f\'' },
  { re: /concav|inflexion/, t: 'Concavidad', x: 'La derivada segunda dice si la pendiente aumenta (curva como una taza, f″ > 0) o disminuye (como un techo, f″ < 0).', e: 'f\'\'(x)>0\\Rightarrow\\cup,\\quad f\'\'(x)<0\\Rightarrow\\cap' },
  { re: /tabla de integrales|integral inmediata|tabla de derivadas/, t: 'Integrales inmediatas', x: 'Integrar es buscar una función cuya derivada sea la dada. Cada fórmula de la tabla es una derivada leída al revés.', e: '\\int x^n\\,dx=\\frac{x^{n+1}}{n+1}+C' },
  { re: /cambio de variable/, t: 'Sustitución en integrales', x: 'Es la regla de la cadena al revés: si aparece una función y su derivada, la llamamos u y la integral se simplifica.', e: '\\int 2x\\cos(x^2)\\,dx=\\int\\cos u\\,du' },
  { re: /por partes|ilate/, t: 'Integración por partes', x: 'Sale de la regla del producto: (uv)′ = u′v + uv′. Integrando, ∫u dv = uv − ∫v du. Conviene elegir u la que se simplifica al derivar.', e: '\\int x e^x dx=xe^x-\\int e^x dx' },
  { re: /fracciones parciales/, t: 'Fracciones parciales', x: 'Un cociente de polinomios se puede escribir como suma de fracciones simples, cada una fácil de integrar (dan logaritmos o arcotangentes).', e: '\\frac{1}{x^2-1}=\\frac{1/2}{x-1}-\\frac{1/2}{x+1}' },
  { re: /barrow/, t: 'Regla de Barrow', x: 'La integral definida es la acumulación del cambio: alcanza con calcular la primitiva en los extremos y restar.', e: '\\int_a^b f(x)\\,dx=F(b)-F(a)' },
  { re: /area entre|area bajo|planteamos el area/, t: 'Área con integrales', x: 'Sumamos infinitos rectángulos de altura (arriba − abajo) y ancho dx. Si la curva cruza el eje, separamos los tramos para que no se resten áreas.', e: 'A=\\int_a^b|f(x)-g(x)|\\,dx' },
  { re: /formulas de las sumas|sumatoria|propiedades de la sumatoria/, t: 'Sumatorias', x: 'Σ es una forma corta de escribir sumas largas. Las constantes salen afuera y la suma de una suma se separa.', e: '\\sum_{i=1}^{n} i=\\frac{n(n+1)}{2}' },
  { re: /calculamos la media|promedio/, t: 'Media', x: 'Es el punto de equilibrio de los datos: si los datos fueran pesas sobre una regla, la media es donde la regla queda en equilibrio.', e: '\\bar{x}=\\frac{\\sum x_i}{n}' },
  { re: /mediana/, t: 'Mediana', x: 'Es el valor del medio de los datos ordenados. A diferencia de la media, no la afectan los valores muy extremos.', e: '1,\\,3,\\,\\boxed{5},\\,8,\\,100' },
  { re: /\bmoda\b/, t: 'Moda', x: 'Es el valor que más se repite. Es la única medida de centralización que sirve también para datos cualitativos.', e: '\\text{rojo, azul, rojo}\\Rightarrow\\text{Mo}=\\text{rojo}' },
  { re: /varianza|desviacion/, t: 'Varianza y desviación', x: 'Miden cuánto se alejan los datos de la media. Elevamos al cuadrado para que los desvíos positivos y negativos no se cancelen; la raíz devuelve las unidades originales.', e: '\\sigma=\\sqrt{\\frac{\\sum(x_i-\\bar{x})^2}{n}}' },
  { re: /cuartil|percentil|decil/, t: 'Medidas de posición', x: 'Dividen los datos ordenados en partes iguales: Q₁ deja el 25 % por debajo, la mediana el 50 % y Q₃ el 75 %.', e: 'Q_1\\le\\text{Me}\\le Q_3' },
  { re: /condicional/, t: 'Probabilidad condicional', x: 'Saber que ocurrió B achica el universo: ahora solo miramos los casos de B, y de ellos, cuántos son también A.', e: 'P(A\\mid B)=\\frac{P(A\\cap B)}{P(B)}' },
  { re: /bayes|probabilidad total/, t: 'Bayes', x: 'La probabilidad total suma todos los caminos que llegan a un resultado; Bayes da vuelta la pregunta: sabiendo el resultado, ¿de qué camino vino?', e: 'P(A_i\\mid D)=\\frac{P(A_i)P(D\\mid A_i)}{P(D)}' },
  { re: /binomial/, t: 'Distribución binomial', x: 'Cuenta éxitos en n intentos independientes. El combinatorio cuenta de cuántas maneras pueden ubicarse los k éxitos entre los n intentos.', e: 'P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}' },
  { re: /estandarizamos|normal/, t: 'Estandarizar', x: 'Toda normal se transforma en la normal estándar restando la media y dividiendo por la desviación: z dice a cuántas desviaciones está el valor de la media.', e: 'z=\\frac{x-\\mu}{\\sigma}' },
  { re: /intervalo de confianza|margen de error/, t: 'Intervalo de confianza', x: 'Como la muestra varía, damos un rango: estimación ± margen. Más confianza o menos datos hacen el intervalo más ancho.', e: '\\bar{x}\\pm z\\,\\frac{\\sigma}{\\sqrt n}' },
  { re: /valor p|hipotesis/, t: 'Contraste de hipótesis', x: 'Suponemos H₀ cierta y vemos qué tan raro sería lo observado. Si es muy raro (p < α), dudamos de H₀ y la rechazamos.', e: 'p<\\alpha\\Rightarrow\\text{se rechaza }H_0' },
  { re: /regresion|minimos cuadrados|correlacion/, t: 'Regresión lineal', x: 'Buscamos la recta que mejor resume la nube de puntos: la que hace mínima la suma de los cuadrados de los errores verticales.', e: '\\hat{y}=a+bx,\\quad b=\\frac{S_{xy}}{S_{xx}}' },
  /* --- Entradas agregadas: temas que faltaban --- */
  { re: /valor absoluto|opuesto, inverso/, t: 'Valor absoluto', x: 'Es la distancia de un número al 0 en la recta numérica, por eso nunca es negativo. El opuesto cambia el signo y el inverso es 1 dividido el número.', e: '|-5|=5,\\quad -(-5)=5,\\quad (-5)^{-1}=-\\tfrac15' },
  { re: /regla de tres|proporcion|propiedad fundamental|razon\b|escribimos la razon/, t: 'Proporciones', x: 'Dos razones forman una proporción si son iguales. En toda proporción, el producto de los extremos es igual al producto de los medios: con eso se despeja el valor desconocido.', e: '\\frac{a}{b}=\\frac{c}{d}\\iff a\\cdot d=b\\cdot c' },
  { re: /reparto|partes iguales|cada parte|dividimos por la cantidad/, t: 'Reparto proporcional', x: 'Se suman las partes, se calcula cuánto vale una parte y se multiplica por lo que le toca a cada uno.', e: '\\text{120 en } 2{:}3\\Rightarrow\\text{una parte}=\\tfrac{120}{5}=24' },
  { re: /porcentaje|descuento|aumento/, t: 'Porcentajes', x: 'Un porcentaje es una fracción con denominador 100. Para aplicar un descuento del p % se multiplica por (1 − p/100); para un aumento, por (1 + p/100).', e: '20\\%\\text{ de }350=0{,}2\\cdot 350=70' },
  { re: /base 2|base 10|base 16|base \d|sistema de numeracion/, t: 'Sistemas de numeración', x: 'En base b cada cifra vale b veces más que la de su derecha. Para pasar a base 10 se suman cifra · potencia de b; para pasar de base 10 a otra, se divide sucesivamente por b y se leen los restos al revés.', e: '1011_2=1\\cdot 8+0\\cdot 4+1\\cdot 2+1=11' },
  { re: /romano|leemos cada simbolo/, t: 'Números romanos', x: 'Los símbolos se suman, salvo que uno menor esté a la izquierda de uno mayor: ahí se resta.', e: '\\text{XIV}=10+(5-1)=14' },
  { re: /ubicamos cada cifra|valor posicional|lo leemos|escribimos el numero/, t: 'Valor posicional', x: 'Cada cifra vale distinto según su lugar: unidades, decenas, centenas, y del otro lado de la coma décimos, centésimos, milésimos.', e: '3{,}25=3+\\tfrac{2}{10}+\\tfrac{5}{100}' },
  { re: /tachamos los multiplos|criba|leemos los primos/, t: 'Criba de Eratóstenes', x: 'Tachamos los múltiplos de cada primo: lo que nunca se tacha no tiene divisores aparte de 1 y sí mismo, es decir, es primo. Alcanza con llegar a la raíz del número máximo.', e: '\\text{primos hasta }50:\\;2,3,5,7,11,\\ldots,47' },
  { re: /probamos con cada primo|es primo/, t: '¿Es primo?', x: 'Si un número tiene un divisor, tiene uno menor o igual que su raíz cuadrada. Por eso alcanza con probar los primos hasta la raíz.', e: '97:\\;\\sqrt{97}\\approx 9{,}8\\Rightarrow\\text{probamos }2,3,5,7' },
  { re: /factores primos|descomponemos|dividimos por numeros primos/, t: 'Descomposición en factores primos', x: 'Todo número natural mayor que 1 se escribe de una única manera como producto de primos (teorema fundamental de la aritmética). Se divide por el menor primo posible hasta llegar a 1.', e: '360=2^3\\cdot 3^2\\cdot 5' },
  { re: /criterios de divisibilidad|divisibilidad/, t: 'Criterios de divisibilidad', x: 'Permiten saber si un número es divisible sin hacer la división: por 2 si termina en par, por 3 si la suma de cifras es múltiplo de 3, por 5 si termina en 0 o 5, etc.', e: '462:\\;4+6+2=12\\Rightarrow\\text{divisible por }3' },
  { re: /division larga|cociente y resto|escribimos la division|hacemos la division/, t: 'División entera', x: 'Dividendo = divisor · cociente + resto, con el resto menor que el divisor. Cada paso de la división larga baja una cifra y busca cuántas veces entra el divisor.', e: '47=5\\cdot 9+2' },
  { re: /generatriz|lo pasamos a fraccion|expresion decimal|como decimal/, t: 'Fracción generatriz', x: 'Un decimal periódico es una fracción: multiplicando por potencias de 10 y restando, el período se cancela.', e: '0{,}\\overline{3}=\\tfrac{3}{9}=\\tfrac{1}{3}' },
  { re: /numero mixto/, t: 'Números mixtos', x: 'Un número mixto es una parte entera más una fracción propia. Para pasarlo a fracción: entero por denominador más numerador, sobre el mismo denominador.', e: '2\\tfrac{1}{3}=\\tfrac{2\\cdot 3+1}{3}=\\tfrac{7}{3}' },
  { re: /notacion cientifica|cientifica/, t: 'Notación científica', x: 'Se escribe el número como a · 10ⁿ con 1 ≤ a < 10. Es cómoda para números muy grandes o muy chicos.', e: '0{,}00052=5{,}2\\cdot 10^{-4}' },
  { re: /escalera|unidades|capacidad|metrico/, t: 'Sistema métrico', x: 'Cada escalón de la escalera de unidades multiplica o divide por 10 (por 100 en superficie y por 1000 en volumen). Además, 1 dm³ = 1 litro.', e: '3{,}5\\text{ km}=3500\\text{ m}' },
  { re: /sexagesimal|unidad por unidad|acomodamos|sumamos los angulos|pasamos a (radianes|grados)/, t: 'Sistema sexagesimal', x: 'Un grado (o una hora) tiene 60 minutos y un minuto 60 segundos. Se opera columna por columna y cada 60 de una unidad forman 1 de la siguiente.', e: '35^{\\circ}40\'+20^{\\circ}30\'=55^{\\circ}70\'=56^{\\circ}10\'' },
  { re: /conjunto|union|interseccion|complemento de a/, t: 'Conjuntos', x: 'La unión junta los elementos de ambos conjuntos, la intersección deja solo los comunes y el complemento, los que no están.', e: 'A\\cup B,\\quad A\\cap B,\\quad A^{c}' },
  { re: /conectivos|tabla de verdad/, t: 'Lógica proposicional', x: 'Cada conectivo tiene su regla: la conjunción (∧) es verdadera solo si ambas lo son; la disyunción (∨), si al menos una lo es; el condicional (→) solo es falso si V → F.', e: 'V\\land F=F,\\quad V\\lor F=V,\\quad V\\to F=F' },
  { re: /multiplicamos filas por columnas|matriz/, t: 'Producto de matrices', x: 'Cada elemento del resultado es la fila de la primera por la columna de la segunda (se multiplican uno a uno y se suman). Por eso las columnas de la primera tienen que coincidir con las filas de la segunda.', e: 'c_{ij}=\\sum_k a_{ik}\\,b_{kj}' },
  { re: /escalonado|gauss|clasificamos el sistema/, t: 'Sistemas escalonados (Gauss)', x: 'Con operaciones entre ecuaciones se anulan incógnitas hasta que la última ecuación tiene una sola; después se despeja de abajo hacia arriba.', e: '\\text{compatible determinado: una solución}' },
  { re: /i² por −1|parte real e imaginaria|forma (trigonometrica|polar)|de moivre|argumento/, t: 'Complejos en forma polar', x: 'Un complejo se puede ver como un punto del plano: su módulo es la distancia al origen y su argumento, el ángulo. Al multiplicar se multiplican los módulos y se suman los argumentos.', e: 'z^n=r^n(\\cos n\\theta+i\\,\\operatorname{sen} n\\theta)' },
  { re: /desigualdad triangular|existe el triangulo|segundo triangulo/, t: 'Desigualdad triangular', x: 'En todo triángulo cada lado es menor que la suma de los otros dos: si no, los dos lados más chicos no alcanzan a cerrarlo.', e: 'a<b+c' },
  { re: /angulo exterior/, t: 'Ángulo exterior', x: 'El ángulo exterior y el interior que tiene al lado suman 180°; como los tres interiores también suman 180°, el exterior es igual a la suma de los otros dos interiores.', e: '\\hat{e}=\\hat{A}+\\hat{B}' },
  { re: /paralelogramo|relaciones entre angulos|dibujamos las rectas/, t: 'Ángulos y paralelas', x: 'Cuando una recta corta a dos paralelas, los ángulos correspondientes y los alternos son iguales, y los conjugados suman 180°.', e: '\\hat{1}=\\hat{5},\\quad \\hat{3}+\\hat{5}=180^{\\circ}' },
  { re: /triangulo|catetos|tercer angulo|calculamos (el )?angulo/, t: 'Triángulos', x: 'Los tres ángulos interiores de un triángulo suman 180°. Por sus lados se clasifica en equilátero, isósceles o escaleno; por sus ángulos, en acutángulo, rectángulo u obtusángulo.', e: '\\hat{A}+\\hat{B}+\\hat{C}=180^{\\circ}' },
  { re: /diagonales|poligono/, t: 'Polígonos', x: 'Desde cada vértice salen n − 3 diagonales (no hay con él mismo ni con los dos vecinos); como cada diagonal se cuenta dos veces, se divide por 2.', e: 'D=\\frac{n(n-3)}{2}' },
  { re: /perimetro|superficie|area del|calculamos el area|calculamos las areas/, t: 'Perímetro y área', x: 'El perímetro es el largo del borde (se suman los lados). El área mide cuánta superficie encierra la figura, en unidades cuadradas.', e: 'A_{\\text{rectángulo}}=b\\cdot h,\\quad P=2b+2h' },
  { re: /volumen|esfera|prisma|piramide|generatriz|apotema|poliedro/, t: 'Cuerpos y volúmenes', x: 'El volumen de un prisma o cilindro es área de la base por altura; el de una pirámide o cono es un tercio de eso.', e: 'V_{\\text{cono}}=\\tfrac13\\pi r^2h' },
  { re: /circulo|sector|arco|corona/, t: 'Círculo', x: 'La longitud de la circunferencia es 2πr y el área del círculo πr². Un sector es una parte proporcional a su ángulo central.', e: 'A_{\\text{sector}}=\\pi r^2\\cdot\\frac{\\alpha}{360^{\\circ}}' },
  { re: /perpendicular al radio|punto de tangencia|recta tangente/, t: 'Recta tangente', x: 'La tangente toca a la curva en un solo punto de esa zona y tiene su misma inclinación: su pendiente es la derivada en ese punto (en una circunferencia, es perpendicular al radio).', e: 'y-f(a)=f\'(a)\\,(x-a)' },
  { re: /linealizacion|aproxim/, t: 'Aproximación lineal', x: 'Cerca de un punto, la curva y su recta tangente casi coinciden: por eso se puede aproximar f(a + Δx) con f(a) + f′(a)·Δx.', e: '\\sqrt{4{,}1}\\approx 2+\\tfrac{1}{4}\\cdot 0{,}1=2{,}025' },
  { re: /limite fundamental/, t: 'Límite fundamental', x: 'Para ángulos muy chicos (en radianes), sen u y u son casi iguales: su cociente tiende a 1.', e: '\\lim_{u\\to 0}\\frac{\\operatorname{sen}u}{u}=1' },
  { re: /hacemos tender|tender n a infinito|tender h a 0/, t: 'Pasar al límite', x: 'Después de simplificar, los términos que tienen h (o 1/n) se hacen tan chicos como queramos: en el límite valen 0.', e: '\\lim_{h\\to 0}(2x+h)=2x' },
  { re: /primitiva|integramos|constante|separamos en una suma de integrales/, t: 'Primitivas', x: 'Integrar es lo contrario de derivar. Como la derivada de una constante es 0, todas las primitivas difieren en una constante C.', e: '\\int 2x\\,dx=x^2+C' },
  { re: /en θ|sustitucion trigonometrica/, t: 'Sustitución trigonométrica', x: 'Las raíces de la forma √(a² − x²) son un lado de un triángulo rectángulo: con x = a·sen θ, la identidad pitagórica hace desaparecer la raíz.', e: '\\sqrt{a^2-a^2\\operatorname{sen}^2\\theta}=a\\cos\\theta' },
  { re: /binomia|caso \(m/, t: 'Diferenciales binomias', x: 'Chebyshev demostró que ∫ xᵐ(a + bxⁿ)ᵖ dx tiene primitiva elemental solo en tres casos; en cada uno hay un cambio de variable que la convierte en un polinomio.', e: '\\tfrac{m+1}{n}\\in\\mathbb{Z}\\Rightarrow u=a+bx^n' },
  { re: /metodo de (discos|capas|arandelas)|multiplicamos por (2)?π/, t: 'Volúmenes de revolución', x: 'El sólido se corta en rebanadas finitas: discos (o arandelas) si cortamos perpendicular al eje, o capas cilíndricas si cortamos paralelo. Se suman sus volúmenes con una integral.', e: 'V=\\pi\\int_a^b f(x)^2\\,dx' },
  { re: /intervalo|rectangulos|sumamos los tramos|sumas de riemann|calculamos la suma con/, t: 'Sumas de Riemann', x: 'El área bajo la curva se aproxima con rectángulos. Cuantos más (y más finitos) usemos, mejor la aproximación; en el límite da exactamente la integral.', e: '\\int_a^b f=\\lim_{n\\to\\infty}\\sum f(x_i)\\Delta x' },
  { re: /intercambiamos x e y|inversa/, t: 'Función inversa', x: 'La inversa “deshace” lo que hace la función. Al intercambiar x e y, su gráfico es el reflejo del original respecto de la recta y = x.', e: 'f(f^{-1}(x))=x' },
  { re: /funcion partida|dominio|restricciones|cada condicion|probamos un valor/, t: 'Dominio', x: 'Son los valores de x donde la fórmula tiene sentido: no se puede dividir por 0, ni sacar raíz par de un negativo, ni logaritmo de algo que no sea positivo.', e: '\\sqrt{x-2}\\Rightarrow x\\ge 2' },
  { re: /signo de la derivada|tabla de signos|monoton/, t: 'Crecimiento', x: 'Si la derivada es positiva, la pendiente es positiva y la función sube; si es negativa, baja.', e: 'f\'(x)>0\\Rightarrow f\\text{ crece}' },
  { re: /comparamos los grados|cortes con los ejes|amplitud|periodo/, t: 'Leer una función', x: 'Los cortes con los ejes, los grados (en límites al infinito) y parámetros como amplitud o período dicen cómo es la gráfica sin tener que dibujarla punto por punto.', e: 'y=A\\operatorname{sen}(Bx):\\;T=\\tfrac{2\\pi}{B}' },
  { re: /velocidad|aceleracion|reposo|instante|posicion/, t: 'Velocidad y aceleración', x: 'La velocidad es cuánto cambia la posición por unidad de tiempo (la derivada); la aceleración, cuánto cambia la velocidad.', e: 'v=s\'(t),\\quad a=v\'(t)=s\'\'(t)' },
  { re: /complemento|al menos/, t: 'Suceso complementario', x: 'Un suceso y su complemento cubren todas las posibilidades, así que sus probabilidades suman 1. A veces es más fácil calcular lo contrario y restar.', e: 'P(\\text{al menos uno})=1-P(\\text{ninguno})' },
  { re: /tg\^2|sec\^2|demas razones/, t: 'Relaciones entre razones', x: 'Dividiendo sen² + cos² = 1 por cos² se obtiene 1 + tg² = sec². Con una razón y el cuadrante salen todas las demás.', e: '1+\\operatorname{tg}^2\\alpha=\\sec^2\\alpha' },
  { re: /frecuencia relativa|grandes numeros|simulamos|experimento/, t: 'Ley de los Grandes Números', x: 'Si repetimos un experimento muchas veces, la proporción de veces que ocurre un suceso se acerca a su probabilidad.', e: 'f_n=\\tfrac{\\text{éxitos}}{n}\\to p' },
  { re: /primero la interseccion|venn|totales|conjuntas y marginales|contingencia/, t: 'Tablas y diagramas de conteo', x: 'Se empieza por la parte común (la intersección) para no contar dos veces; los totales de filas y columnas dan las probabilidades marginales.', e: 'n(A\\cup B)=n(A)+n(B)-n(A\\cap B)' },
  { re: /arbol|composicion|sumamos las probabilidades|respondemos/, t: 'Diagramas de árbol', x: 'En cada rama va la probabilidad de ese paso (teniendo en cuenta lo anterior). Un camino se calcula multiplicando y varios caminos, sumando.', e: 'P(RR)=\\tfrac35\\cdot\\tfrac24=\\tfrac{3}{10}' },
  { re: /estimacion puntual|valor critico|t de student|estadistico|decidimos|calculamos β/, t: 'Inferencia', x: 'Con una muestra estimamos lo que pasa en toda la población. Como la muestra varía, se trabaja con distribuciones (normal, t, chi-cuadrado) para medir cuánto confiar.', e: 't=\\frac{\\bar{x}-\\mu_0}{s/\\sqrt{n}}' },
  { re: /pronostic|medias moviles|serie en el tiempo|prediccion/, t: 'Series temporales', x: 'Las medias móviles suavizan los altibajos; la recta de tendencia resume hacia dónde va la serie y sirve para pronosticar (con cuidado lejos de los datos).', e: '\\hat{y}_{t}=a+b\\,t' },
  { re: /frecuencias|ordenamos y contamos|intervalos de clase|armamos los intervalos|histograma|sectores|barras|dispersion/, t: 'Tablas y gráficos estadísticos', x: 'Contar cuántas veces aparece cada valor (frecuencia) y graficarlo permite ver de un vistazo cómo se reparten los datos.', e: 'h_i=\\tfrac{f_i}{n},\\quad \\sum h_i=1' },
  { re: /clasificamos cada variable|recordamos la clasificacion/, t: 'Tipos de variables', x: 'Saber el tipo de variable dice qué podemos calcular: con cualitativas solo contamos (moda); con cuantitativas, también promedios y dispersión.', e: '\\text{cuantitativa continua: se mide}' },
  { re: /rango|desvios|tabla anova|sumas de desvios/, t: 'Dispersión', x: 'Dos grupos pueden tener la misma media y ser muy distintos: las medidas de dispersión dicen cuánto se separan los datos de su centro.', e: 'R=x_{\\max}-x_{\\min}' },
  { re: /fraccion|numerador|denominador/, t: 'Fracciones', x: 'Una fracción indica una división: el denominador dice en cuántas partes iguales se divide y el numerador, cuántas se toman.', e: '\\tfrac{3}{4}=3:4=0{,}75' },
  { re: /inecuacion|doble desigualdad|tres partes/, t: 'Inecuaciones', x: 'Se despeja como en una ecuación, pero si multiplicamos o dividimos por un número negativo, la desigualdad cambia de sentido.', e: '-2x<6\\Rightarrow x>-3' },
  { re: /nuevo origen|traslacion|rotacion|simetria|homotecia/, t: 'Transformaciones', x: 'Trasladar, rotar o reflejar mueve la figura sin deformarla (conserva distancias y ángulos). La homotecia la agranda o achica desde un centro.', e: '(x;y)\\to(x+a;\\,y+b)' },
  { re: /elevamos al cuadrado/, t: 'Elevar al cuadrado', x: 'Elevar los dos miembros al cuadrado sirve para sacar raíces, pero puede agregar soluciones falsas: por eso después hay que verificar.', e: '\\sqrt{x}=-2\\Rightarrow x=4\\;(\\text{¡no verifica!})' },
  { re: /elegimos δ/, t: 'Definición ε-δ', x: 'Probar un límite por definición es mostrar que podemos acercar f(x) a L tanto como queramos (ε), con tal de tomar x suficientemente cerca de a (δ).', e: '|x-a|<\\delta\\Rightarrow|f(x)-L|<\\varepsilon' },
  { re: /mas de una|cuatrinomio/, t: 'Cubo de un binomio', x: 'El cubo de un binomio desarrolla cuatro términos: cubo del primero, triple del primero al cuadrado por el segundo, triple del primero por el segundo al cuadrado y cubo del segundo.', e: '(a+b)^3=a^3+3a^2b+3ab^2+b^3' },
  { re: /^verificamos/, t: '¿Por qué verificar?', x: 'Verificar es comprobar el resultado por otro camino (reemplazando, derivando, sumando…). Si las dos cuentas coinciden, es muy difícil que haya un error.', e: '\\checkmark' },
  /* --- Respaldo: pasos de planteo, cuenta o dibujo --- */
  { re: /^(escribimos|anotamos|identificamos|planteamos|leemos|reconocemos|interpretamos)/, t: 'Plantear bien', x: 'Antes de calcular conviene escribir con claridad qué datos tenemos, qué buscamos y de qué tipo es el problema. Muchos errores aparecen por copiar mal o confundir los datos.', e: '\\text{datos}\\to\\text{incógnita}\\to\\text{método}' },
  { re: /grafic|lo vemos|dibujamos|ubicamos/, t: '¿Para qué el gráfico?', x: 'Ver el problema dibujado ayuda a entenderlo y a controlar el resultado: si la cuenta dice una cosa y el dibujo muestra otra, algo anda mal.', e: '\\text{dibujo}\\approx\\text{cuenta}' },
  { re: /^(armamos|completamos|ordenamos|los ordenamos|explicacion)/, t: 'Ordenar la información', x: 'Organizar los datos en una tabla o en orden evita olvidos y deja ver patrones (lo que se repite, lo que crece, dónde está el medio).', e: '\\text{tabla}\\to\\text{patrón}' },
  { re: /^(elegimos|separamos|dividimos|dejamos|sacamos|pasamos|usamos|aplicamos|buscamos|contamos|clasificamos|describimos|expresamos|evaluamos|comparamos|como se evita|columna)/, t: 'Elegir el camino', x: 'Cada paso usa una herramienta conocida (una propiedad, una fórmula o una regla) para acercarnos a la respuesta. Si no ves por qué, mirá el paso anterior: suele preparar este.', e: '\\text{propiedad}\\Rightarrow\\text{paso siguiente}' },
  { re: /^(calculamos|sumamos|restamos|multiplicamos|resolvemos|operamos|reemplazamos|hacemos|derivamos|derivada de orden|integramos|completamos|probamos|tachamos)/, t: 'Hacer la cuenta', x: 'Una vez planteado, se opera con cuidado respetando la jerarquía de las operaciones y los signos. Conviene escribir cada paso intermedio: así es más fácil encontrar un error.', e: '2+3\\cdot 4=14' },
  { re: /./, t: 'Paso intermedio', x: 'Este paso conecta el anterior con el siguiente. Si te cuesta seguirlo, probá hacer la misma cuenta con números más simples.', e: '\\text{simplificar}\\to\\text{entender}' }
];
function buscarGlosario(paso) {
  const t = plano(`${paso.titulo} ${paso.texto || ''}`);
  return GLOSARIO.find(g => g.re.test(t)) || null;
}
// HTML del botón y la explicación para un paso (lo usa interfaz.js al armar los pasos)
function ayudaPasoHTML(paso, i) {
  const g = buscarGlosario(paso); if (!g) return '';
  return `<button type="button" class="porque" data-porque="${i}" aria-expanded="false">¿Por qué?</button>
    <div class="explica" id="explica${i}" hidden><b>${escapar(g.t)}</b><p>${escapar(g.x)}</p><div class="formula">${katexHTML(g.e, false)}</div></div>`;
}

/* -----------------------------------------------------------------------
 * 2. COMPROBAR LA RESPUESTA DEL ALUMNO
 * Se separa el resultado en partes ("x₁ = 3", "x₂ = 2"…), se evalúa cada
 * una (número o expresión en x) y se compara con lo que escribió el alumno.
 * --------------------------------------------------------------------- */
/* --- Lectura de valores: del resultado (LaTeX) y de lo que escribe el alumno (texto) ---
 * Tipos: { num } { inf } { expr, vars } { complejo:[re,im] } { punto:[x,y] } { matriz:[[..]] }
 *        { conjunto:[..] } { intervalos:[{a,b,ca,cb}] } { texto } */
const LETRAS_OK = ['x', 'y', 't', 'k', 'h'];
function exprMultivariable(s) {                     // cambia letras sueltas (a, b, z, n…) por las que entiende el motor
  const nombres = ['sen', 'sin', 'cos', 'tg', 'tan', 'cotg', 'cot', 'sec', 'cosec', 'csc', 'ln', 'log', 'sqrt', 'raiz', 'arcsen', 'arccos', 'arctg', 'pi', 'e'];
  s = s.replace(/[a-zñ]+/gi, w => (nombres.includes(w.toLowerCase()) || w.length === 1 ? w : w.split('').join('*')));   // 4ab → 4a*b
  const letras = [...new Set((s.match(/(?<![a-záéíóúñ])[a-df-z](?![a-záéíóúñ])/gi) || []).map(l => l.toLowerCase()))].filter(l => !nombres.includes(l));
  if (letras.length > LETRAS_OK.length) return null;
  const mapa = {}; let libres = LETRAS_OK.filter(l => !letras.includes(l));
  letras.forEach(l => { mapa[l] = LETRAS_OK.includes(l) ? l : libres.shift(); });
  const t = s.replace(/(?<![a-záéíóúñ])[a-df-z](?![a-záéíóúñ])/gi, l => mapa[l.toLowerCase()] || l);
  try { const e = cS(t); const vars = [...new Set(Object.values(mapa))].filter(v => cTiene(e, v)); return { e, vars, mapa }; } catch (err) { return null; }
}
// Montos de dinero: "134.009,56" (punto de miles y coma decimal) → número
const finNumA = s => { s = String(s).replace(/\$|\s/g, ''); return parseFloat(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.')); };
// Ángulo sexagesimal "56° 10' 30''" (o "56°10'") → grados con decimales; null si no es un ángulo
function gradosDeTexto(s) {
  const m = s.replace(/\^\(?°\)?|\^\{?\\circ\}?|º/g, '°').replace(/\\,|\\;|\s+/g, '').replace(/′/g, "'").replace(/″|''/g, '"')
    .match(/^(-?\d+(?:[.,]\d+)?)°(?:(\d+(?:[.,]\d+)?)')?(?:(\d+(?:[.,]\d+)?)")?$/);
  if (!m) return null; const sg = m[1].startsWith('-') ? -1 : 1, n = v => (v ? +v.replace(',', '.') : 0);
  return sg * (Math.abs(n(m[1])) + n(m[2]) / 60 + n(m[3]) / 3600);
}
// Decimal periódico "2,(3)" o "8,1\overline{6}" → número
function periodico(s) {
  const m = s.replace(/\{,\}/g, ',').match(/^(-?)(\d+)[.,](\d*)(?:\\overline\{(\d+)\}|\((\d+)\))$/); if (!m) return null;
  const ent = +m[2], np = m[3], p = m[4] || m[5], v = ent + (np ? +np / 10 ** np.length : 0) + +p / ((10 ** p.length - 1) * 10 ** np.length);
  return m[1] ? -v : v;
}
function evaluarTexto(s) {                          // texto (sin LaTeX) → valor numérico o expresión
  s = String(s).replace(/\s+/g, ' ').replace(/^\s*[a-zA-Z]\w*(?:\(\w\))?\s*=\s*/, '').trim(); if (!s) return null;
  s = s.replace(/\^\(?°\)?|\^\{\\circ\}|º/g, '°');
  const dinero = s.replace(/^\$\s*/, '').replace(/\s+/g, ''); if (/^\$/.test(s) || /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(dinero)) { const v = finNumA(dinero); if (isFinite(v)) return { num: v }; }   // $ 134.009,56
  const g = gradosDeTexto(s); if (g !== null) return { num: g, grados: true };
  const per = periodico(s); if (per !== null) return { num: per };
  if (/^-?\d+(?:[.,]\d+)?\s*%$/.test(s)) return { num: +s.replace('%', '').replace(',', '.').trim(), pct: true };
  if (/^\d+(?:[.,]\d+)?\s*:\s*\d+(?:[.,]\d+)?$/.test(s)) { const [a, b] = s.split(':').map(x => +x.trim().replace(',', '.')); return { num: a / b }; }
  if (/\b(sen|sin|cos|tg|tan|cotg|sec|cosec)\b/.test(s) && /°/.test(s)) s = s.replace(/(\d+(?:[.,]\d+)?)\s*°/g, '($1*π/180)');   // funciones trigonométricas en grados
  if (/^[+-]?\s*(∞|inf|infinito)$/i.test(s)) return { inf: /^-/.test(s) ? -1 : 1 };
  if (/(?<![a-záéíóúñ])i(?![a-záéíóúñ])/i.test(s) && !/\b(sin|lim|int)\b/.test(s)) {     // número complejo a + bi
    try { const e = cS(s.replace(/(?<![a-záéíóúñ])i(?![a-záéíóúñ])/gi, 'y')); if (!cTiene(e, 'x')) { const re = cNum(e, { x: 0, y: 0 }), im = cNum(e, { x: 0, y: 1 }) - re; if (isFinite(re) && isFinite(im) && cerca(cNum(e, { x: 0, y: 2 }), re + 2 * im)) return { complejo: [re, im] }; } } catch (err) { /* sigue */ }
  }
  try { const e = cS(s); if (!['y', 't', 'k', 'h'].some(v => cTiene(e, v))) { if (cTiene(e, 'x')) return { expr: e, vars: ['x'] }; const n = cNum(e, 0); return isFinite(n) ? { num: n } : null; } } catch (err) { /* probamos con otras letras */ }
  const m = exprMultivariable(s); if (m) return m.vars.length ? { expr: m.e, vars: m.vars, mapa: m.mapa } : (isFinite(cNum(m.e, 0)) ? { num: cNum(m.e, 0) } : null);
  return null;
}
const numDeTexto = s => { const v = evaluarTexto(String(s).trim()); return v && v.num !== undefined ? v.num : v && v.inf ? v.inf * Infinity : NaN; };
// Intervalos en texto: "(2, 3]", "[2; +inf)", "(-∞,1) U (3,∞)", "R", "2 < x <= 3", "x > 2"
function leerIntervalos(s) {
  s = s.replace(/\{,\}/g, '.').replace(/−/g, '-').replace(/\\infty|infinito|inf\b/gi, '∞').replace(/\\cup|∪|\bu\b/gi, ' U ').replace(/\\mathbb\{R\}|ℝ/g, 'R').replace(/\\left|\\right|\\,|\\;/g, '').replace(/\\le(q)?/g, '≤').replace(/\\ge(q)?/g, '≥').replace(/<=/g, '≤').replace(/>=/g, '≥');
  const sin = s.match(/R\s*-\s*\\?\{([^}\\]*)\\?\}/);
  if (sin) { const pts = sin[1].split(/[;,]/).map(numDeTexto).filter(isFinite).sort((a, b) => a - b); const ivs = []; let a = -Infinity; pts.forEach(p => { ivs.push({ a, b: p, ca: false, cb: false }); a = p; }); ivs.push({ a, b: Infinity, ca: false, cb: false }); return ivs; }
  if (/^\s*(x\s*∈\s*)?R\s*$/.test(s)) return [{ a: -Infinity, b: Infinity, ca: false, cb: false }];
  const ivs = [];
  const conPyC = /[\(\[\]][^\)\]\[]*;/.test(s);        // si separa con ; la coma puede ser decimal: (48,7; 55,3)
  const reIv = conPyC ? /([\(\[\]])\s*([^;\(\)\[\]]+?)\s*;\s*([^;\(\)\[\]]+?)\s*([\)\]\[])/g : /([\(\[\]])\s*([^,;\(\)\[\]]+?)\s*[,;]\s*([^,;\(\)\[\]]+?)\s*([\)\]\[])/g;
  for (const m of s.matchAll(reIv)) {
    const a = /∞/.test(m[2]) ? -Infinity : numDeTexto(latexATexto(m[2])), b = /∞/.test(m[3]) ? Infinity : numDeTexto(latexATexto(m[3]));
    if (!isNaN(a) && !isNaN(b)) ivs.push({ a, b, ca: m[1] === '[', cb: m[4] === ']' });
  }
  if (ivs.length) return ivs;
  for (const parte of s.split(/\s+(?:o|U|or)\s+/i)) {                      // desigualdades con x
    let m = parte.match(/(-?[\d.,/√π]+)\s*(<|≤)\s*x\s*(<|≤)\s*(-?[\d.,/√π]+)/);
    if (m) { ivs.push({ a: numDeTexto(m[1]), b: numDeTexto(m[4]), ca: m[2] === '≤', cb: m[3] === '≤' }); continue; }
    m = parte.match(/x\s*(<|≤|>|≥)\s*(-?[\d.,/√π]+)/);
    if (m) { const v = numDeTexto(m[2]); ivs.push(m[1] === '<' || m[1] === '≤' ? { a: -Infinity, b: v, ca: false, cb: m[1] === '≤' } : { a: v, b: Infinity, ca: m[1] === '≥', cb: false }); }
  }
  return ivs.length ? ivs : null;
}
function leerMatriz(s) {
  const lx = s.match(/\\begin\{[pbv]?matrix\}([\s\S]*?)\\end/);
  const filas = lx ? lx[1].split('\\\\').map(f => f.split('&')) : (s.includes('[[') ? s.replace(/^\s*\[|\]\s*$/g, '').split(/\]\s*,?\s*\[/).map(f => f.replace(/[\[\]]/g, '').split(/[;,]\s*|\s+/)) : s.split(/;|\n/).map(f => f.trim().split(/\s+|,\s+/)));
  const M = filas.map(f => f.map(x => numDeTexto(lx ? latexATexto(x) : x)).filter(v => !isNaN(v))).filter(f => f.length);
  return M.length && M.every(f => f.length === M[0].length) ? M : null;
}
function leerPunto(s) {                              // "(3; 4)", "(√2/2; 3√2/2)", "(4/3, 1)": separa por ; (o por , si no hay ;) en el primer nivel
  s = s.replace(/\\left|\\right|\\,/g, '').trim();
  const i = s.indexOf('('); if (i < 0) return null;
  let prof = 0, fin = -1; for (let k = i; k < s.length; k++) { if (s[k] === '(') prof++; else if (s[k] === ')') { prof--; if (!prof) { fin = k; break; } } }
  if (fin < 0) return null;
  const dentro = s.slice(i + 1, fin), sep = dentro.includes(';') ? ';' : ',', partes = []; let cur = ''; prof = 0;
  for (const ch of dentro) { if (ch === '(' || ch === '{') prof++; if (ch === ')' || ch === '}') prof--; if (ch === sep && !prof) { partes.push(cur); cur = ''; } else cur += ch; }
  partes.push(cur); if (partes.length < 2 || partes.length > 3) return null;          // puntos del plano o vectores del espacio
  const v = partes.map(p => numDeTexto(latexATexto(p))); return v.every(isFinite) ? v : null;
}
function leerConjunto(s) { const m = s.match(/\\?\{([^{}]*)\\?\}/) || [null, s]; const v = m[1].split(/[;,]/).map(x => numDeTexto(latexATexto(x))).filter(isFinite); return v.length ? [...new Set(v)].sort((a, b) => a - b) : null; }
const SIN_TEXTO = s => s.replace(/\\text\{[^}]*\}/g, ' ').replace(/\\[;,:!]/g, ' ');
function valorResultado(lx) {                        // un trozo del resultado en LaTeX → valor
  if (/^\s*\\\$/.test(lx)) { const v = finNumA(lx.replace(/\\\$|\\,|\s/g, '').replace(/\{\.\}/g, '.').replace(/\{,\}/g, ',')); if (isFinite(v)) return { num: v }; }
  const t = lx.trim().replace(/\\;\(\+\\,k\\cdot[^)]*\)\s*$/, '');   // sacamos "(+ k·360°)"
  const base = t.match(/^([0-9A-Z]+)_\{\((\d+)\)\}$/); if (base) return { cifras: base[1], base: +base[2] };
  const per = periodico(t); if (per !== null) return { num: per };
  if (/<|>/.test(t) && !/\\in/.test(t)) { const v = t.split(/<|>|\\le|\\ge/).map(x => numDeTexto(latexATexto(x))); if (v.length > 2 && v.every(isFinite)) return { secuencia: v }; }
  if (/^[+-]?\\infty$/.test(t)) return { inf: t.startsWith('-') ? -1 : 1 };
  if (/\\begin\{[pbv]?matrix\}/.test(t)) { const M = leerMatriz(t); return M ? { matriz: M } : null; }
  if (/\\mathbb\{R\}|^[\(\[].*[,;].*[\)\]](\\cup.*)?$/.test(t.replace(/\\left|\\right/g, '')) && !/^\\left\(.*\\,;\\,/.test(t)) { const iv = leerIntervalos(t); if (iv && /[\(\[]/.test(t) || /\\mathbb\{R\}/.test(t)) return { intervalos: iv }; }
  if (/^\\\{.*\\\}$/.test(t)) { const c = leerConjunto(t); return c ? { conjunto: c } : null; }
  if (/^\\left\(.*;.*\\right\)$/.test(t)) { const p = leerPunto(t); if (p) return { punto: p }; }
  const v = evaluarTexto(latexATexto(SIN_TEXTO(t)).replace(/\s*\(\s*\)\s*$/, '')); if (v) return v;
  const txt = (t.match(/\\text\{([^}]*)\}/g) || []).map(x => x.slice(6, -1)).join(' ');
  return txt ? { texto: txt } : null;
}
function partesResultado(lx) {
  const crudas = lx.split(/,\\quad|,\\;|;\\;|\\quad|\\;\\text\{y\}\\;/).map(p => p.trim()).filter(Boolean), out = [];
  for (const p of crudas) {
    const sinC = p.replace(/\+C\s*$/, ''), oculto = sinC.replace(/\\text\{[^}]*\}/g, m => '#'.repeat(m.length)), iEq = /\\begin/.test(sinC) ? oculto.indexOf('=') : oculto.lastIndexOf('=');
    const lhs = iEq >= 0 ? sinC.slice(0, iEq) : '', rhs0 = (iEq >= 0 ? sinC.slice(iEq + 1) : sinC).replace(/^\s*\\approx\s*/, '');
    const rhs = rhs0.split('\\approx')[0].trim(), resto = rhs0.split('\\approx').slice(1).pop();
    const conIn = lhs.match(/\\in(?![a-z])\s*$/) ? null : rhs.match(/^(.*?)\\in(?![a-z])\s*(.*)$/);   // \in, pero no \infty           // "x ∈ (2, 3)"
    const base = conIn && !/\\mathbb\{[QZNI]\}/.test(conIn[2]) ? conIn[2] : rhs;
    const pm = base.match(/^(.*?)\\pm\s*(.*)$/);
    if (pm) { [`${pm[1]}+${pm[2]}`, `${pm[1]}-${pm[2]}`].forEach((q, k) => out.push({ lhs: lhs.replace(/,2\}/, k ? ',2}^{-}' : ',2}^{+}'), rhs: q, valor: valorResultado(q) })); continue; }
    let valor = valorResultado(base); if (!valor && resto) valor = valorResultado(resto);
    out.push({ lhs, rhs: base, valor });
  }
  return out;
}
const cerca = (a, b, tol = 1e-6) => (a === b) || Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
function compararExpr(a, b, vars = ['x']) {          // 'igual' | 'constante' | 'signo' | null
  const pruebas = [0.37, 0.81, 1.43, 2.17, -0.6].map((v, i) => Object.fromEntries(vars.map((x, j) => [x, v + 0.29 * j * (i + 1)])));
  const va = pruebas.map(p => cNum(a, p)), vb = pruebas.map(p => cNum(b, p)), idx = pruebas.map((_, i) => i).filter(i => isFinite(va[i]) && isFinite(vb[i]));
  if (idx.length < 2) return null;
  if (idx.every(i => cerca(va[i], vb[i]))) return 'igual';
  const d = va[idx[0]] - vb[idx[0]]; if (idx.every(i => cerca(va[i] - vb[i], d, 1e-6))) return 'constante';
  if (idx.every(i => cerca(va[i], -vb[i]))) return 'signo';
  return null;
}
function diagnosticoNumero(v, c) {                  // ¿qué pasó con el número del alumno?
  if (cerca(v, c)) return { ok: true };
  if (Math.abs(v - c) <= 0.01 * Math.max(1, Math.abs(c))) return { ok: true, nota: 'Está bien, pero redondeado.' };
  if (cerca(v, -c)) return { ok: false, nota: 'El número está bien, pero el signo está cambiado. Revisá los signos al pasar términos o al operar con negativos.' };
  if (Math.abs(c) > 1e-12 && cerca(v * c, 1)) return { ok: false, nota: 'Te dio el inverso del resultado: revisá si diste vuelta una fracción o una división.' };
  if (Math.abs(c) > 1e-12 && (cerca(v, 2 * c) || cerca(2 * v, c))) return { ok: false, nota: `Te quedó ${cerca(v, 2 * c) ? 'el doble' : 'la mitad'} del resultado: fijate si te faltó (o sobró) dividir por 2.` };
  for (const k of [10, 100, 1000]) if (Math.abs(c) > 1e-12 && (cerca(v, c * k) || cerca(v * k, c))) return { ok: false, nota: 'El número es parecido pero corrido: revisá la coma decimal.' };
  return { ok: false };
}
const GENERICAS = new Set(['las', 'los', 'una', 'uno', 'son', 'esta', 'estan', 'como', 'para', 'con', 'del', 'que', 'rectas', 'recta', 'puntos', 'punto', 'funcion', 'numero', 'grafico', 'variable', 'variables', 'resultado', 'sistema']);
const palabras = s => plano(s).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !GENERICAS.has(w));
const niega = s => /\b(no|ni|sin|nunca|ningun|ninguna)\b/.test(plano(s));
function compararTexto(al, res) {
  const clave = palabras(res), dichas = palabras(al);
  if (niega(al) !== niega(res)) return { ok: false, nota: niega(res) ? 'Es al revés: la respuesta es negativa.' : 'Es al revés: la respuesta es afirmativa.' };
  const faltan = clave.filter(w => !dichas.some(d => d.slice(0, 5) === w.slice(0, 5)));
  return faltan.length ? { ok: false, nota: `Revisá: la respuesta habla de “${faltan.join(', ')}”.` } : { ok: true };
}
function compararIntervalos(A, R) {
  const ord = v => [...v].sort((x, y) => x.a - y.a);
  A = ord(A); R = ord(R);
  if (A.length !== R.length) return { ok: false, nota: `La respuesta tiene ${R.length} intervalo${R.length > 1 ? 's' : ''} y vos escribiste ${A.length}.` };
  const extremos = [], corchetes = [];
  const red = (p, q) => p === q || Math.abs(p - q) <= 0.01 * Math.max(1, Math.abs(q)); let redondeado = false;
  R.forEach((r, i) => { const a = A[i]; if (!cerca(a.a, r.a) || !cerca(a.b, r.b)) { if (red(a.a, r.a) && red(a.b, r.b)) redondeado = true; else extremos.push(i); } else { if (isFinite(r.a) && a.ca !== r.ca) corchetes.push(`${fmtX(r.a)} va ${r.ca ? 'incluido: corchete [' : 'excluido: paréntesis ('}`); if (isFinite(r.b) && a.cb !== r.cb) corchetes.push(`${fmtX(r.b)} va ${r.cb ? 'incluido: corchete ]' : 'excluido: paréntesis )'}`); } });
  if (extremos.length) return { ok: false, nota: 'Los extremos del intervalo no coinciden.' };
  return corchetes.length ? { ok: false, nota: 'Los números están bien, pero revisá los extremos: ' + corchetes.join('; ') + '.' } : redondeado ? { ok: true, nota: 'Está bien, pero redondeado.' } : { ok: true };
}
function compararValor(a, p, r, sAlumno) {           // → { ok, nota } o null si no son comparables
  const v = p.valor;
  if (v.num !== undefined && a.num !== undefined) return diagnosticoNumero(a.num, v.num);
  if (v.inf && a.inf) return a.inf === v.inf ? { ok: true } : { ok: false, nota: 'El signo del infinito está cambiado.' };
  if (v.complejo && (a.complejo || a.num !== undefined)) { const c = a.complejo || [a.num, 0]; if (cerca(c[0], v.complejo[0]) && cerca(c[1], v.complejo[1])) return { ok: true }; if (cerca(c[0], v.complejo[0]) && cerca(c[1], -v.complejo[1])) return { ok: false, nota: 'Te quedó el conjugado: revisá el signo de la parte imaginaria.' }; return { ok: false, nota: cerca(c[0], v.complejo[0]) ? 'La parte real está bien; revisá la imaginaria.' : cerca(c[1], v.complejo[1]) ? 'La parte imaginaria está bien; revisá la real.' : null }; }
  if (v.punto && a.punto && v.punto.length === 3) { if (a.punto.length !== 3) return { ok: false, nota: 'El vector tiene tres componentes (x; y; z).' }; const mal = v.punto.filter((x, i) => !cerca(a.punto[i], x)).length; return mal ? { ok: false, nota: `Hay ${mal} componente${mal > 1 ? 's' : ''} que no coincide${mal > 1 ? 'n' : ''}.` } : { ok: true }; }
  if (v.punto && a.punto) { if (cerca(a.punto[0], v.punto[0]) && cerca(a.punto[1], v.punto[1])) return { ok: true }; const red = (p, q) => Math.abs(p - q) <= 0.01 * Math.max(1, Math.abs(q)); if (red(a.punto[0], v.punto[0]) && red(a.punto[1], v.punto[1])) return { ok: true, nota: 'Está bien, pero redondeado.' }; if (cerca(a.punto[0], v.punto[1]) && cerca(a.punto[1], v.punto[0])) return { ok: false, nota: 'Invertiste las coordenadas: primero va x y después y.' }; return { ok: false, nota: cerca(a.punto[0], v.punto[0]) ? 'La coordenada x está bien; revisá la y.' : cerca(a.punto[1], v.punto[1]) ? 'La coordenada y está bien; revisá la x.' : null }; }
  if (v.matriz && a.matriz) { const M = v.matriz, N = a.matriz; if (M.length === N.length && M[0].length === N[0].length) { const mal = M.flatMap((f, i) => f.map((x, j) => (cerca(N[i][j], x) ? null : 1))).filter(Boolean).length; return mal ? { ok: false, nota: `Hay ${mal} elemento${mal > 1 ? 's' : ''} que no coincide${mal > 1 ? 'n' : ''}.` } : { ok: true }; } if (M.length === N[0].length && M[0].length === N.length && M.every((f, i) => f.every((x, j) => cerca(N[j][i], x)))) return { ok: false, nota: 'Escribiste la matriz traspuesta: cambiaste filas por columnas.' }; return { ok: false, nota: `La matriz tiene que ser de ${M.length}×${M[0].length}.` }; }
  if (v.conjunto && a.conjunto) { const sobran = a.conjunto.filter(x => !v.conjunto.some(y => cerca(x, y))), faltan = v.conjunto.filter(x => !a.conjunto.some(y => cerca(x, y))); return !sobran.length && !faltan.length ? { ok: true } : { ok: false, nota: [faltan.length ? `faltan ${faltan.map(x => fmtX(x)).join(', ')}` : '', sobran.length ? `sobran ${sobran.map(x => fmtX(x)).join(', ')}` : ''].filter(Boolean).join(' y ').replace(/^./, c => c.toUpperCase()) + '.' }; }
  if (v.intervalos && a.intervalos) return compararIntervalos(a.intervalos, v.intervalos);
  if (v.expr && a.expr) {
    const vars = [...new Set([...(v.vars || ['x']), ...(a.vars || ['x'])])], c = compararExpr(a.expr, v.expr, vars);
    let d = c === 'igual' ? { ok: true } : c === 'constante' && /\+C/.test(r.resultado) ? { ok: true, nota: 'Difiere en una constante: en una integral indefinida está bien (acordate del + C).' } : c === 'signo' ? { ok: false, nota: 'La expresión tiene el signo cambiado.' } : c === 'constante' ? { ok: false, nota: 'Te difiere en un número sumado: revisá el término independiente.' } : { ok: false };
    if (d.ok && /\)\s*\(|^\w*\(/.test(p.rhs.replace(/\\left|\\right/g, '')) && !/\(/.test(sAlumno) && r.tema === 'factorizacion') d = { ok: false, nota: 'Es equivalente, pero no está factorizado: hay que escribirlo como producto.' };
    return d;
  }
  if (v.cifras) { const al = sAlumno.toUpperCase().replace(/_[\s({]*\d+[\s)}]*$/, '').replace(/[^0-9A-Z]/g, ''); return al === v.cifras ? { ok: true } : { ok: false, nota: `En base ${v.base} el número es otro: revisá las divisiones o las potencias de ${v.base}.` }; }
  if (v.secuencia) { const s2 = sAlumno.split(/<|>|;|,\s+/).map(x => numDeTexto(x)).filter(isFinite); if (s2.length !== v.secuencia.length) return { ok: false, nota: `Hay que ordenar ${v.secuencia.length} números.` }; const ok = s2.every((x, i) => cerca(x, v.secuencia[i])); const alReves = !ok && s2.every((x, i) => cerca(x, v.secuencia[v.secuencia.length - 1 - i])); return ok ? { ok: true } : { ok: false, nota: alReves ? 'Los ordenaste de mayor a menor: se pedía de menor a mayor.' : 'El orden no es correcto: pasá todos a decimal para compararlos.' }; }
  if (v.texto) return compararTexto(sAlumno, v.texto);
  return null;
}
function valorAlumno(s, tipo) {                      // lee lo que escribió el alumno, sabiendo qué tipo se espera
  if (tipo === 'cifras' || tipo === 'secuencia') return { [tipo]: true };
  if (tipo === 'intervalos') { const iv = leerIntervalos(s); return iv ? { intervalos: iv } : null; }
  if (tipo === 'matriz') { const M = leerMatriz(s); return M ? { matriz: M } : null; }
  if (tipo === 'conjunto') { const c = leerConjunto(s); return c ? { conjunto: c } : null; }
  if (tipo === 'punto') { const p = leerPunto(s); return p ? { punto: p } : null; }
  if (tipo === 'texto') return { texto: s };
  return evaluarTexto(s);
}
const tipoDe = v => Object.keys(v).find(k => ['num', 'inf', 'complejo', 'punto', 'matriz', 'conjunto', 'intervalos', 'texto', 'expr', 'cifras', 'secuencia'].includes(k));
function comprobarRespuesta(textoAlumno, r) {
  textoAlumno = textoAlumno.replace(/\(?\s*\+\s*k\s*[·*.]?\s*(?:360|180|2π|π)\s*°?\s*\)?/gi, ' ').trim();   // "(+ k·360°)" no se compara
  const res = partesResultado(r.resultado).filter(p => p.valor);
  if (!res.length) return { tipo: 'manual', msg: 'Este resultado no se puede comprobar automáticamente: compará tu respuesta con el resultado final.' };
  const tipos = res.map(p => tipoDe(p.valor)), unico = res.length === 1 && ['intervalos', 'matriz', 'conjunto', 'punto', 'texto', 'cifras', 'secuencia'].includes(tipos[0]);
  let trozos;
  if (unico || tipos.every(t => t === 'texto')) trozos = [textoAlumno.trim()];
  else if (tipos.every(t => t === 'punto')) trozos = textoAlumno.match(/\([^()]*\)/g) || [textoAlumno];
  else trozos = textoAlumno.split(/;\s*(?![^()\[\]]*[\)\]])|\s+y\s+(?!=)|,\s+(?=[a-zA-Z]\w*\s*=)|,\s+(?=-?\d)/).map(s => s.trim()).filter(Boolean);
  const alumno = trozos.map(s => ({ s, valores: [...new Set(tipos)].map(t => valorAlumno(s, t)).filter(Boolean) }));
  if (!alumno.length || alumno.every(a => !a.valores.length)) return { tipo: 'error', msg: 'No pude leer tu respuesta. Escribila como número (3/4, 2,5, √2), como expresión, como intervalo [2; 5) o como punto (3; 4); si hay varias, separalas con punto y coma.' };
  if (tipos.every(t => t === 'texto') && res.length > 1) {                   // varias respuestas en palabras: se compara el texto completo
    const d = compararTexto(textoAlumno, res.map(p => p.valor.texto).join(' '));
    return { tipo: d.ok ? 'bien' : 'mal', filas: [{ ok: d.ok, s: textoAlumno, nota: d.nota }], faltan: [], todoBien: d.ok };
  }
  const usados = new Set(), filas = [];
  for (const a of alumno) {
    if (!a.valores.length) { filas.push({ ok: false, s: a.s, nota: 'No pude leer este valor.' }); continue; }
    let mejor = null;
    res.forEach((p, i) => {
      if (usados.has(i)) return;
      for (const val of a.valores) { const d = compararValor(val, p, r, a.s); if (d && (!mejor || (d.ok && !mejor.d.ok) || (d.nota && !mejor.d.nota && !mejor.d.ok))) mejor = { i, d }; }
    });
    if (mejor && (mejor.d.ok || mejor.d.nota)) { usados.add(mejor.i); filas.push({ ok: mejor.d.ok, s: a.s, nota: mejor.d.nota, lhs: res[mejor.i].lhs }); }
    else filas.push({ ok: false, s: a.s, nota: 'Este valor no coincide con el resultado.' });
  }
  const faltan = res.filter((_, i) => !usados.has(i)), bien = filas.filter(f => f.ok).length;
  const todoBien = bien === filas.length && !faltan.length;
  return { tipo: todoBien ? 'bien' : bien ? 'parcial' : 'mal', filas, faltan, todoBien };
}

function devolucionHTML(c) {
  if (c.tipo === 'manual' || c.tipo === 'error') return `<p class="dev-info">${escapar(c.msg)}</p>`;
  const titulo = { bien: '¡Muy bien! Tu respuesta es correcta.', parcial: 'Vas bien, pero hay algo para revisar.', mal: 'Todavía no: revisá lo que te marcamos.' }[c.tipo];
  const filas = c.filas.map(f => `<li class="${f.ok ? 'ok' : 'no'}"><span class="marca-dev">${f.ok ? '✓' : '✗'}</span><span><code>${escapar(f.s)}</code>${f.lhs ? ` <small>(${katexHTML(f.lhs, false)})</small>` : ''}${f.nota ? `<br><small>${escapar(f.nota)}</small>` : ''}</span></li>`).join('');
  const faltan = c.faltan.length ? `<li class="no"><span class="marca-dev">…</span><span>Te ${c.faltan.length > 1 ? `faltan ${c.faltan.length} valores` : 'falta un valor'}${c.faltan.some(f => f.lhs) ? ': ' + c.faltan.map(f => katexHTML(f.lhs || '?', false)).join(', ') : ''}.</span></li>` : '';
  return `<p class="dev-titulo ${c.tipo}">${titulo}</p><ul class="dev-lista">${filas}${faltan}</ul>${c.todoBien ? '' : '<p class="dev-info">Podés pedir una pista para ver el paso siguiente.</p>'}`;
}

/* -----------------------------------------------------------------------
 * 3. MODO PRÁCTICA: ejercicios parecidos
 * Se cambian los números del ejercicio (sin tocar exponentes ni subíndices)
 * y se acepta el nuevo solo si el motor lo resuelve con el mismo tema.
 * --------------------------------------------------------------------- */
function ejercicioParecido(texto, resolverFn, temaOriginal, resultadoOriginal) {
  const RARO = /\\approx|\\sqrt|\\pm|[0-9}]i\b|\\nexists|\\varnothing|\\emptyset|no existe|sin solución|no tiene/i;
  const conComa = s => /\d(?:\{,\}|,)\d/.test(String(s || '').replace(/\\;|\\,/g, ' '));      // 8,5 o 8{,}5 (los problemas con enunciado mejor con números enteros)
  const lindo = r => (!RARO.test(r.resultado) || RARO.test(resultadoOriginal || '')) && !(temaOriginal === 'problemas' && conComa(r.resultado) && !conComa(resultadoOriginal));
  let mejor = null;
  const prob = temaOriginal === 'problemas';
  for (let intento = 0; intento < (prob ? 200 : 50); intento++) {
    let cambios = 0; const conExp = intento >= 15;          // si no hay otros números, también se cambian exponentes
    const nuevo = texto.replace(/(\^\(?|_\(?|[a-zA-Z]\(?)?(\d+(?:[.,]\d+)?)/g, (m0, antes, num) => {   // "^(2)" es como lo escribe MathLive
      const esExp = !!antes && antes[0] === '^';
      if ((antes && antes[0] === '_') || (esExp && (!conExp || Math.random() < 0.5))) return m0;   // subíndices quedan igual; exponentes, solo si hace falta
      if (antes && /[a-zA-Z]/.test(antes) && !/[xytn]\(?$/.test(antes)) return m0;   // nombres como log2, P1…
      const dec = num.includes(',') || num.includes('.'), v = parseFloat(num.replace(',', '.'));
      if (!dec && (v === 0 || v === 1)) return m0;
      const decs = dec ? (num.split(/[.,]/)[1] || '').length : 0, k = 10 ** decs;
      let w; do {
        if (dec && v < 1) w = Math.round((0.05 + Math.random() * 0.9) * k) / k;            // probabilidades y proporciones: siguen entre 0 y 1
        else w = dec ? Math.round((v + (Math.random() * 2 - 1) * Math.max(1, v * 0.3)) * k) / k : prob ? v + Math.round((Math.random() * 2 - 1) * Math.max(3, v * 0.25)) : v + Math.floor(Math.random() * 7) - 3;
      } while (w === v || (!dec && w < 2) || (dec && (w <= 0 || (v < 1 && w >= 1))));
      cambios++;
      if (esExp) w = Math.max(2, Math.min(6, w));
      return (antes || '') + (dec ? String(w).replace('.', ',') : String(w));
    });
    if (!cambios || nuevo === texto) continue;
    const limpio = nuevo.replace(/\^\((\d+)\)/g, '^$1');      // "x^(2)" de MathLive → "x^2", más fácil de leer
    try { const r = resolverFn(limpio); if (r.tema !== temaOriginal) continue; if (lindo(r)) return { texto: limpio, r }; if (!mejor) mejor = { texto: limpio, r }; } catch (e) { /* probamos otro */ }
  }
  return mejor;
}
const PUNTAJE = 'mpp-practica';
const leerPuntaje = () => guardado.leer(PUNTAJE, { aciertos: 0, intentos: 0, racha: 0, mejor: 0 });
function anotarPuntaje(bien) {
  const p = leerPuntaje(); p.intentos++; if (bien) { p.aciertos++; p.racha++; p.mejor = Math.max(p.mejor, p.racha); } else p.racha = 0;
  guardado.escribir(PUNTAJE, p); return p;
}

/* -----------------------------------------------------------------------
 * 4. TECLADO VIRTUAL DE MATHLIVE SEGÚN EL ÁREA
 * --------------------------------------------------------------------- */
const TECLAS = {
  arit: ['\\frac{#@}{#?}', '\\sqrt{#0}', '\\sqrt[#?]{#0}', '#@^{#?}', '\\%', '\\left(#0\\right)', '\\cdot', '\\div', ',', '\\pi'],
  alg: ['x', 'y', '#@^{2}', '#@^{#?}', '\\sqrt{#0}', '\\frac{#@}{#?}', '\\le', '\\ge', '\\ne', '\\left|#0\\right|', '\\log_{#?}{#0}', 'i'],
  geo: ['(#0,#?)', 'x', 'y', '#@^{2}', '\\sqrt{#0}', '\\frac{#@}{#?}', '\\pi', '='],
  trig: ['\\sin', '\\cos', '\\tan', '#@^{\\circ}', "'", '\\pi', '\\alpha', '\\beta', '\\theta', '\\sqrt{#0}', '\\frac{#@}{#?}', 'i'],
  calc: ['\\lim_{x\\to#?}', '\\to', '\\infty', '\\frac{d}{dx}', "f'", '\\sin', '\\cos', '\\ln', 'e^{#0}', '\\sqrt{#0}', '\\frac{#@}{#?}', '#@^{#?}'],
  integ: ['\\int', '\\int_{#?}^{#?}', 'dx', '\\sum_{i=#?}^{#?}', '\\sin', '\\cos', '\\ln', 'e^{#0}', '\\sqrt{#0}', '\\frac{#@}{#?}', '#@^{#?}', '\\pi'],
  est: ['\\mu', '\\sigma', '\\lambda', '\\bar{x}', 'P\\left(#0\\right)', '\\cap', '\\cup', '\\mid', '\\le', '\\ge', '\\%', '\\sqrt{#0}']
};
function tecladoArea(a) {
  try {
    if (!window.mathVirtualKeyboard) return false;
    const teclas = (TECLAS[a] || TECLAS.alg).map(l => ({ latex: l, insert: l }));
    const filas = []; for (let i = 0; i < teclas.length; i += 6) filas.push(teclas.slice(i, i + 6));
    window.mathVirtualKeyboard.layouts = [{ label: datosArea(a).nombre ? datosArea(a).nombre.split(' ')[0] : 'Área', tooltip: 'Símbolos del área', rows: filas }, 'numeric', 'symbols', 'alphabetic'];
    return true;
  } catch (e) { return false; }
}

// Barra de símbolos del área debajo del campo de MathLive (funciona también dentro de la pizarra)
function pintarSimbolos(a) {
  const caja = document.getElementById('simbolos'); if (!caja) return;
  caja.innerHTML = (TECLAS[a] || []).map((l, i) => `<button type="button" data-s="${i}" title="Insertar">${katexHTML(l.replace(/#@|#\?|#0/g, '\\square'), false)}</button>`).join('');
  caja.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => {
    const l = TECLAS[a][+b.dataset.s], mf = document.getElementById('campoMath');
    if (mf && mf.executeCommand) { mf.executeCommand(['insert', l, { focus: true, selectionMode: 'placeholder' }]); mf.focus(); }
  }));
}
