/* Copia de datos/ejemplos.json para cuando la página se abre con doble clic
 * (file://), donde el navegador no deja leer el .json. Si editás ejemplos,
 * cambiá los dos archivos (o solo este, si siempre abrís la página local). */
window.DATOS_EJEMPLOS = {
  "version": 1,
  "descripcion": "Ejemplos, tips y textos de ayuda de cada área. \"lx\" se carga en MathLive; \"t\" en el campo de texto.",
  "areaInicial": "est",
  "areas": {
    "arit": {
      "nombre": "Aritmética",
      "placeholder": "Por ejemplo: mcd(12, 18) · 3,5 km a m · 20% de 350",
      "tip": "Tips: los decimales van con coma (3,25); los periódicos con paréntesis en el período (0,1(6)); los números mixtos con un espacio (2 1/3). En el campo de palabras podés escribir consignas como “¿es primo 91?”, “255 a base 16”, “2 h 45 min + 1 h 30 min”, “repartir 1200 en partes proporcionales a 2, 3 y 5”.",
      "auto": [
        {
          "lx": "\\frac{1}{2}+\\frac{2}{3}\\cdot\\frac{3}{4}"
        },
        {
          "t": "mcd(12, 18)"
        },
        {
          "lx": "\\sqrt{72}"
        },
        {
          "t": "3,5 km a m"
        },
        {
          "t": "255 a base 16"
        },
        {
          "t": "20% de 350"
        },
        {
          "t": "clasificar √2"
        }
      ],
      "porTema": {
        "reales": [
          {
            "t": "clasificar √2"
          },
          {
            "t": "clasificar 0,(3)"
          },
          {
            "t": "ordenar 3/4; -1; 0,7; √2; π"
          },
          {
            "lx": "\\left|-5\\right|+\\left|3-8\\right|"
          }
        ],
        "enteros": [
          {
            "lx": "-8+5\\cdot\\left(-3\\right)-\\left(-12\\right)\\div4"
          },
          {
            "lx": "47\\div6"
          },
          {
            "t": "La temperatura era -3 °C, subió 8 grados y después bajó 12"
          },
          {
            "t": "Tenía 1500 pesos, gasté 800 y cobré 2300"
          }
        ],
        "numeros": [
          {
            "t": "mcd(12, 18)"
          },
          {
            "t": "mcm 24 36 60"
          },
          {
            "t": "¿es primo 91?"
          },
          {
            "t": "criba hasta 50"
          },
          {
            "t": "divisibilidad de 2340"
          },
          {
            "t": "divisores de 36"
          },
          {
            "t": "factorizar 360"
          }
        ],
        "racionales": [
          {
            "lx": "\\frac{1}{2}+\\frac{2}{3}\\cdot\\frac{3}{4}"
          },
          {
            "lx": "\\frac{84}{126}"
          },
          {
            "lx": "2\\frac{1}{3}"
          },
          {
            "lx": "\\left(\\frac{3}{5}-\\frac{1}{2}\\right)\\div\\frac{1}{10}"
          }
        ],
        "decimales": [
          {
            "lx": "3{,}25+12{,}4-0{,}75"
          },
          {
            "lx": "3{,}25\\cdot1{,}4"
          },
          {
            "lx": "7{,}5\\div0{,}25"
          },
          {
            "t": "leer 3,045"
          },
          {
            "t": "escribir tres enteros cuarenta y cinco milésimos"
          },
          {
            "t": "generatriz 0,1(6)"
          }
        ],
        "potencias": [
          {
            "lx": "2^3\\cdot2^4"
          },
          {
            "lx": "\\left(-2\\right)^3+3^2-5^0"
          },
          {
            "lx": "\\sqrt{72}"
          },
          {
            "lx": "\\sqrt[3]{54}"
          },
          {
            "lx": "\\left(2^3\\right)^2\\div2^4"
          },
          {
            "lx": "\\sqrt{\\frac{16}{25}}+8^{\\frac{2}{3}}"
          }
        ],
        "cientifica": [
          {
            "t": "notación científica 0,000032"
          },
          {
            "lx": "\\left(3\\cdot10^5\\right)\\cdot\\left(4\\cdot10^{-2}\\right)"
          },
          {
            "lx": "\\log_{2}\\left(8\\right)"
          },
          {
            "lx": "\\log\\left(1000\\right)+\\ln\\left(e^2\\right)"
          },
          {
            "lx": "\\log_{3}\\left(10\\right)"
          }
        ],
        "proporciones": [
          {
            "t": "3/4 = x/12"
          },
          {
            "t": "5 → 20; 8 → x"
          },
          {
            "t": "4 obreros → 12 días; 6 obreros → x inversa"
          },
          {
            "t": "razón entre 12 y 18"
          }
        ],
        "numeracion": [
          {
            "t": "1011 de base 2 a base 10"
          },
          {
            "t": "255 a base 16"
          },
          {
            "t": "FF de base 16 a binario"
          },
          {
            "t": "1994 a romano"
          },
          {
            "t": "XLIV"
          }
        ],
        "metrico": [
          {
            "t": "3,5 km a m"
          },
          {
            "t": "2500 g a kg"
          },
          {
            "t": "1,2 ha a m2"
          },
          {
            "t": "3 l a cm3"
          },
          {
            "t": "2 h 45 min + 1 h 30 min"
          },
          {
            "t": "8000 s a h min s"
          },
          {
            "t": "35° 40' + 20° 30'"
          }
        ],
        "razonamiento": [
          {
            "t": "20% de 350"
          },
          {
            "t": "qué porcentaje es 45 de 180"
          },
          {
            "t": "precio 5000 con descuento del 30%"
          },
          {
            "t": "repartir 1200 en partes proporcionales a 2, 3 y 5"
          },
          {
            "t": "promedio de 7; 8,5; 9"
          },
          {
            "t": "si el 25% es 60, cuál es el total"
          }
        ],
        "financiera": [
          {
            "t": "capital $ 100.000 al 5 % mensual durante 6 meses, interés compuesto"
          },
          {
            "t": "interés simple de $ 20.000 al 3 % mensual durante 8 meses"
          },
          {
            "t": "cuota de un préstamo de $ 500.000 al 4 % mensual en 12 cuotas"
          },
          {
            "t": "¿cuánto hay que depositar hoy para tener $ 1.000.000 en 2 años al 40 % anual?"
          },
          {
            "t": "plazo fijo de $ 250.000 al 36 % anual durante 30 días"
          }
        ]
      }
    },
    "alg": {
      "nombre": "Álgebra",
      "placeholder": "Por ejemplo: x^2 - 5x + 6 = 0 · factorizar x^3 - 4x · 2x + y = 7; x - y = 2",
      "tip": "Tips: las potencias van con ^ (x^2); los sistemas, con las ecuaciones separadas por punto y coma; las matrices así: [[1, 2], [3, 4]]; los conjuntos así: A = {1, 2, 3}; B = {2, 3}; A ∪ B. Para lógica podés usar ∧ ∨ ¬ → ↔ o escribir ^, v, ~, ->, <->.",
      "auto": [
        {
          "lx": "x^2-5x+6=0"
        },
        {
          "t": "factorizar x^3 - 4x"
        },
        {
          "lx": "\\left(x+3\\right)^2"
        },
        {
          "t": "2x + y = 7; x - y = 2"
        },
        {
          "t": "x^2 - 5x + 6 < 0"
        },
        {
          "t": "(3 + 2i)(1 - i)"
        },
        {
          "t": "det [[1, 2], [3, 4]]"
        }
      ],
      "porTema": {
        "conjuntos": [
          {
            "t": "A = {1, 2, 3, 4}; B = {3, 4, 5}; A ∪ B"
          },
          {
            "t": "A = {1,2,3}; B = {2,3,4}; U = {1,2,3,4,5,6}; (A ∩ B)'"
          },
          {
            "t": "p ∧ ¬q → r"
          },
          {
            "t": "tabla de verdad (p -> q) <-> (~q -> ~p)"
          }
        ],
        "basicos": [
          {
            "t": "valor numérico de 3x^2 - 2y para x = 2, y = -1"
          },
          {
            "lx": "3x+2y-x+5y"
          },
          {
            "lx": "2\\left(x+3\\right)-3\\left(x-1\\right)+x^2"
          },
          {
            "t": "(x^3 - 2x + 1) : (x - 1)"
          }
        ],
        "notables": [
          {
            "lx": "\\left(x+3\\right)^2"
          },
          {
            "lx": "\\left(2a-b\\right)^2"
          },
          {
            "lx": "\\left(x+2\\right)\\left(x-2\\right)"
          },
          {
            "lx": "\\left(x-1\\right)^3"
          },
          {
            "lx": "\\left(x+3\\right)\\left(x+5\\right)"
          }
        ],
        "factorizacion": [
          {
            "t": "factorizar x^3 - 4x"
          },
          {
            "t": "factorizar x^3 + 2x^2 + 3x + 6"
          },
          {
            "t": "factorizar x^2 + 10x + 25"
          },
          {
            "t": "factorizar x^3 - 6x^2 + 12x - 8"
          },
          {
            "t": "factorizar 4a^2 - 9b^2"
          },
          {
            "t": "factorizar x^3 - 2x^2 - 5x + 6"
          }
        ],
        "fracciones": [
          {
            "lx": "\\frac{x^2-9}{x^2+6x+9}"
          },
          {
            "lx": "\\frac{1}{x-1}+\\frac{2}{x+1}"
          },
          {
            "t": "(x^2-4)/(x+1) * (x+1)/(x-2)"
          }
        ],
        "primergrado": [
          {
            "lx": "3x-5=2x+7"
          },
          {
            "lx": "2\\left(x+3\\right)=5x-9"
          },
          {
            "lx": "\\frac{x}{2}+\\frac{x}{3}=10"
          }
        ],
        "lineal": [
          {
            "t": "y = 2x - 3"
          },
          {
            "t": "recta que pasa por (1, 2) y (3, 8)"
          },
          {
            "t": "pendiente 3 y pasa por (1, 5)"
          }
        ],
        "sistemas": [
          {
            "t": "2x + y = 7; x - y = 2"
          },
          {
            "t": "x + y + z = 6; 2x - y + z = 3; x + 2y - z = 2"
          },
          {
            "t": "x + y = 3; 2x + 2y = 10"
          }
        ],
        "potenciacion": [
          {
            "lx": "\\frac{\\left(2x^3y^2\\right)^2\\cdot x^{-1}}{4xy}"
          },
          {
            "lx": "\\left(a^2\\right)^3\\cdot a"
          },
          {
            "lx": "x^5\\cdot x^{-2}\\div x^3"
          }
        ],
        "radicacion": [
          {
            "lx": "\\sqrt{72x^5y^2}"
          },
          {
            "lx": "3\\sqrt{2}+5\\sqrt{8}-\\sqrt{18}"
          },
          {
            "lx": "\\frac{3}{\\sqrt{2}}"
          },
          {
            "lx": "\\frac{4}{3-\\sqrt{5}}"
          }
        ],
        "complejos": [
          {
            "t": "(3 + 2i)(1 - i)"
          },
          {
            "t": "(2 + 3i)/(1 - i)"
          },
          {
            "t": "i^23"
          },
          {
            "t": "módulo de 3 + 4i"
          }
        ],
        "segundogrado": [
          {
            "lx": "x^2-5x+6=0"
          },
          {
            "lx": "2x^2+3x=5"
          },
          {
            "lx": "x^2-2x-1=0"
          },
          {
            "lx": "x^2+2x+5=0"
          },
          {
            "lx": "3x^2=12x"
          }
        ],
        "desigualdades": [
          {
            "t": "3x - 5 > 2x + 1"
          },
          {
            "t": "x^2 - 5x + 6 < 0"
          },
          {
            "t": "|x - 3| < 5"
          },
          {
            "t": "-3 < 2x + 1 <= 7"
          }
        ],
        "logaritmos": [
          {
            "t": "desarrollar log(x^2·y/z)"
          },
          {
            "t": "log_2(x) + log_2(x - 2) = 3"
          },
          {
            "t": "2^(x+1) = 32"
          },
          {
            "t": "3^x = 7"
          }
        ],
        "progresiones": [
          {
            "t": "3, 7, 11, 15, ..."
          },
          {
            "t": "2, 6, 18, 54, …"
          },
          {
            "t": "progresión aritmética a1 = 5, d = 3, término 20"
          }
        ],
        "matrices": [
          {
            "t": "det [[2, 0, 1], [1, 3, 2], [1, 1, 1]]"
          },
          {
            "t": "inversa [[2, 1], [5, 3]]"
          },
          {
            "t": "[[1, 2], [3, 4]] · [[5, 6], [7, 8]]"
          },
          {
            "t": "transpuesta [[1, 2, 3], [4, 5, 6]]"
          }
        ],
        "raices": [
          {
            "t": "raíces de x^3 - 6x^2 + 11x - 6"
          },
          {
            "t": "raíces de x^4 - 1"
          },
          {
            "lx": "x^3-2x^2-x+2=0"
          }
        ],
        "problemas": [
          {
            "t": "El doble de un número aumentado en 7 es 25. ¿Cuál es el número?"
          },
          {
            "t": "La suma de tres números consecutivos es 45"
          },
          {
            "t": "Juan tiene el triple de la edad de su hijo y entre los dos suman 48 años"
          },
          {
            "t": "El largo de un rectángulo mide 3 cm más que el ancho y su área es 40 cm2"
          },
          {
            "t": "3 cuadernos y 2 lapiceras cuestan $ 1300. Cada cuaderno cuesta $ 200 más que una lapicera"
          },
          {
            "t": "Después de un aumento del 20 % un producto cuesta $ 3600. ¿Cuánto costaba antes?"
          },
          {
            "t": "Dos autos salen al mismo tiempo de dos ciudades separadas por 450 km, uno a 80 km/h y el otro a 70 km/h. ¿En cuánto tiempo se encuentran?"
          },
          {
            "t": "Una canilla llena un tanque en 4 horas y otra en 6 horas. ¿Cuánto tardan las dos juntas?"
          }
        ]
      }
    },
    "geo": {
      "nombre": "Geometría analítica",
      "placeholder": "Por ejemplo: distancia entre (1, 2) y (4, 6) · recta que pasa por (1, 2) y (3, 8) · centro (2, -3) y radio 5",
      "tip": "Tips: los puntos se escriben (x, y); si usás decimales con coma, separá con punto y coma: (1,5; 2). Las rectas y circunferencias van con x e y (por ejemplo 2x − 3y + 6 = 0 o x^2 + y^2 − 4x + 6y − 3 = 0). Los ángulos, en grados (60°) o con π (3π/4).",
      "auto": [
        {
          "t": "distancia entre (1, 2) y (4, 6)"
        },
        {
          "t": "recta que pasa por (1, 2) y (3, 8)"
        },
        {
          "t": "centro (2, -3) y radio 5"
        },
        {
          "t": "pendiente de 2x + 3y - 6 = 0"
        },
        {
          "t": "lugar geométrico con foco (0, 2) y directriz y = -2"
        },
        {
          "t": "polares de (1, √3)"
        }
      ],
      "porTema": {
        "uni": [
          {
            "t": "distancia entre -3 y 5"
          },
          {
            "t": "punto medio entre -3 y 5"
          },
          {
            "t": "dividir el segmento de -2 a 10 en razón 1:3"
          }
        ],
        "bi": [
          {
            "t": "distancia entre (1, 2) y (4, 6)"
          },
          {
            "t": "punto medio de (1, 2) y (5, 8)"
          },
          {
            "t": "área del triángulo (0, 0), (4, 0), (0, 3)"
          },
          {
            "t": "dividir el segmento de (1, 2) a (7, 8) en razón 1:2"
          },
          {
            "t": "¿son colineales (1, 2), (3, 4) y (5, 6)?"
          }
        ],
        "pendiente": [
          {
            "t": "pendiente entre (1, 2) y (3, 8)"
          },
          {
            "t": "pendiente de 2x + 3y - 6 = 0"
          },
          {
            "t": "pendiente de una recta de 60°"
          },
          {
            "t": "¿son paralelas 2x + y = 3 y 4x + 2y = 1?"
          },
          {
            "t": "ángulo entre y = 2x + 1 y y = -x + 3"
          }
        ],
        "lugar": [
          {
            "t": "lugar geométrico de los puntos que equidistan de (1, 2) y (5, 4)"
          },
          {
            "t": "lugar geométrico de los puntos a distancia 3 de (2, 1)"
          },
          {
            "t": "lugar geométrico con foco (0, 2) y directriz y = -2"
          },
          {
            "t": "lugar geométrico de los puntos cuya distancia a (0, 0) es el doble que a (3, 0)"
          }
        ],
        "recta": [
          {
            "t": "recta que pasa por (1, 2) y (3, 8)"
          },
          {
            "t": "recta por (2, 1) paralela a 3x - y + 2 = 0"
          },
          {
            "t": "recta por (2, 1) perpendicular a 3x - y + 2 = 0"
          },
          {
            "t": "intersección de 2x + y = 7 y x - y = 2"
          },
          {
            "t": "distancia de (1, 2) a 3x + 4y - 5 = 0"
          },
          {
            "lx": "2x-3y+6=0"
          }
        ],
        "circunferencia": [
          {
            "t": "centro (2, -3) y radio 5"
          },
          {
            "lx": "x^2+y^2-4x+6y-3=0"
          },
          {
            "t": "circunferencia que pasa por (1, 1), (5, 1) y (3, 5)"
          },
          {
            "t": "diámetro de extremos (1, 2) y (7, 10)"
          },
          {
            "t": "tangente a x^2 + y^2 = 25 en (3, 4)"
          },
          {
            "t": "intersección de x^2 + y^2 = 25 y x + y = 7"
          }
        ],
        "transformacion": [
          {
            "t": "trasladar el punto (5, 3) al nuevo origen (2, -1)"
          },
          {
            "t": "trasladar x^2 + y^2 - 4x + 6y - 3 = 0 al origen (2, -3)"
          },
          {
            "t": "rotar el punto (2, 1) 45°"
          },
          {
            "t": "rotar los ejes 30°: punto (3, 1)"
          },
          {
            "t": "polares de (1, √3)"
          },
          {
            "t": "cartesianas de r = 2, θ = 60°"
          }
        ],
        "vectores": [
          {
            "t": "u = (1, 2, 3), v = (4, 0, -1)"
          },
          {
            "t": "ángulo entre u = (1, 0, 1) y v = (0, 1, 1)"
          },
          {
            "t": "producto vectorial de u = (2, -1, 3) y v = (1, 4, -2)"
          },
          {
            "t": "área del triángulo con u = (1, 2, 0) y v = (3, 1, 2)"
          },
          {
            "t": "volumen del paralelepípedo u = (1, 0, 2), v = (2, 1, 0), w = (0, 3, 1)"
          },
          {
            "t": "vector entre los puntos A(1, 2, 3) y B(4, 0, 5)"
          }
        ]
      }
    },
    "trig": {
      "nombre": "Geometría y trigonometría",
      "placeholder": "Por ejemplo: complemento de 35° 20' · sen 30° + cos 60° · volumen del cilindro de radio 3 y altura 10",
      "tip": "Tips: los ángulos van con ° (y minutos con ', segundos con ''): 35° 20'. En trigonometría escribí sen, cos, tg, cotg, sec o cosec. Para triángulos oblicuángulos, los lados en minúscula (a, b, c) y los ángulos opuestos en mayúscula (A, B, C). Las medidas pueden llevar unidad: cm, m, dm.",
      "auto": [
        {
          "t": "complemento de 35° 20'"
        },
        {
          "t": "sen 30° + cos 60°"
        },
        {
          "t": "área del rectángulo de base 8 cm y altura 3 cm"
        },
        {
          "t": "volumen del cilindro de radio 3 cm y altura 10 cm"
        },
        {
          "t": "triángulo rectángulo con a = 3 y b = 4"
        },
        {
          "t": "2 sen x - 1 = 0"
        },
        {
          "t": "forma trigonométrica de 1 + i"
        }
      ],
      "porTema": {
        "basicosg": [
          {
            "t": "punto medio de un segmento de 15 cm"
          },
          {
            "t": "AB = 5 cm y BC = 7 cm son segmentos consecutivos"
          },
          {
            "t": "dividir un segmento de 15 cm en partes proporcionales a 2 y 3"
          }
        ],
        "angulos": [
          {
            "t": "complemento de 35° 20'"
          },
          {
            "t": "suplemento de 112° 45' 30''"
          },
          {
            "t": "48° 35' + 27° 40'"
          },
          {
            "t": "135° a radianes"
          },
          {
            "t": "5π/6 a grados"
          }
        ],
        "paralelas": [
          {
            "t": "paralelas cortadas por una transversal, un ángulo mide 65°"
          },
          {
            "t": "ángulos alternos internos 3x + 10 y 5x - 30"
          },
          {
            "t": "ángulos conjugados internos 2x + 20 y 3x - 40"
          }
        ],
        "triangulos": [
          {
            "t": "triángulo con ángulos de 50° y 65°"
          },
          {
            "t": "ángulos de un triángulo: x, 2x y 3x"
          },
          {
            "t": "triángulo de lados 5, 6 y 7"
          },
          {
            "t": "ángulo exterior de un triángulo con interiores no adyacentes de 40° y 75°"
          }
        ],
        "cuadrilateros": [
          {
            "t": "cuadrilátero con ángulos de 80°, 95° y 110°"
          },
          {
            "t": "paralelogramo con un ángulo de 65°"
          },
          {
            "t": "ángulos de un cuadrilátero: x, 2x, 3x y 4x"
          },
          {
            "t": "diagonal del rectángulo de base 8 y altura 6"
          }
        ],
        "poligonos": [
          {
            "t": "hexágono regular"
          },
          {
            "t": "polígono de 9 lados"
          },
          {
            "t": "polígono regular de ángulo interior 140°"
          },
          {
            "t": "polígono con 20 diagonales"
          }
        ],
        "transfg": [
          {
            "t": "trasladar (1, 2), (3, 2) y (2, 4) con el vector (4, -1)"
          },
          {
            "t": "rotar (2, 0), (4, 0) y (4, 2) 90°"
          },
          {
            "t": "simetría de (2, 3), (5, 1) respecto del eje x"
          },
          {
            "t": "homotecia de (1, 2), (3, 1) y (2, 4) con centro (0, 0) y razón 2"
          }
        ],
        "circulo": [
          {
            "t": "círculo de radio 5 cm"
          },
          {
            "t": "sector circular de radio 6 cm y 60°"
          },
          {
            "t": "corona circular de radios 5 y 3"
          },
          {
            "t": "ángulo inscripto que abarca un ángulo central de 80°"
          }
        ],
        "perimetros": [
          {
            "t": "área del rectángulo de base 8 cm y altura 3 cm"
          },
          {
            "t": "rombo de diagonales 8 y 6 cm"
          },
          {
            "t": "trapecio de base mayor 10, base menor 6 y altura 4"
          },
          {
            "t": "hexágono regular de lado 4 cm, área"
          }
        ],
        "cuerpos": [
          {
            "t": "prisma pentagonal: caras, aristas y vértices"
          },
          {
            "t": "pirámide hexagonal"
          },
          {
            "t": "octaedro"
          }
        ],
        "areas": [
          {
            "t": "área total del cilindro de radio 3 cm y altura 10 cm"
          },
          {
            "t": "área total del cono de radio 3 y altura 4"
          },
          {
            "t": "área total de la pirámide cuadrangular de lado 6 y altura 4"
          }
        ],
        "volumenes": [
          {
            "t": "volumen del cilindro de radio 3 cm y altura 10 cm"
          },
          {
            "t": "volumen de la esfera de radio 6 cm"
          },
          {
            "t": "volumen de la pirámide cuadrangular de lado 6 y altura 4"
          },
          {
            "t": "volumen del cubo de arista 5 dm"
          }
        ],
        "funciones": [
          {
            "t": "sen α = 3/5, α en el II cuadrante"
          },
          {
            "t": "tg α = -2, α en el IV cuadrante"
          },
          {
            "t": "razones trigonométricas de 150°"
          }
        ],
        "notables": [
          {
            "t": "sen 30° + cos 60°"
          },
          {
            "t": "sen^2 45° + cos^2 45°"
          },
          {
            "t": "2 sen 30° · cos 30°"
          },
          {
            "t": "sen 150° - cos 240° + tg 315°"
          }
        ],
        "graficas": [
          {
            "t": "y = 2 sen(3x - π/2) + 1"
          },
          {
            "t": "y = -cos(x/2)"
          },
          {
            "t": "y = tg(2x)"
          }
        ],
        "identidades": [
          {
            "t": "tg x · cos x = sen x"
          },
          {
            "t": "demostrar que sec^2 x - tg^2 x = 1"
          },
          {
            "t": "2 sen x - 1 = 0"
          },
          {
            "t": "2 cos^2 x - cos x - 1 = 0"
          },
          {
            "t": "2 sen^2 x + 3 cos x - 3 = 0"
          }
        ],
        "rectangulos": [
          {
            "t": "triángulo rectángulo con a = 3 y b = 4"
          },
          {
            "t": "triángulo rectángulo con hipotenusa c = 10 y α = 30°"
          },
          {
            "t": "triángulo rectángulo con cateto b = 5 y β = 60°"
          }
        ],
        "oblicuangulos": [
          {
            "t": "a = 5, b = 6, c = 7"
          },
          {
            "t": "a = 7, b = 5, C = 60°"
          },
          {
            "t": "A = 40°, B = 60°, c = 10"
          },
          {
            "t": "a = 6, b = 8, A = 35°"
          }
        ],
        "complejost": [
          {
            "t": "forma trigonométrica de 1 + i"
          },
          {
            "t": "(1 + i)^8"
          },
          {
            "t": "raíces cúbicas de 8i"
          },
          {
            "t": "producto de 2(cos 30° + i sen 30°) y 3(cos 60° + i sen 60°)"
          }
        ]
      }
    },
    "calc": {
      "nombre": "Cálculo diferencial",
      "placeholder": "Por ejemplo: derivada de sen(2x)·e^x · lim x→2 (x^2 − 4)/(x − 2) · dominio de f(x) = √(x − 2)",
      "tip": "Tips: definí la función como f(x) = … y agregá lo que querés: dominio, imagen, paridad, inversa, (f∘g)(x), derivada, recta tangente en x = 1, máximos y mínimos… Límites: lim x→2 …, lim x→∞ …, lim x→2+ … Funciones partidas: x^2 si x < 1; 2x − 1 si x ≥ 1.",
      "auto": [
        {
          "t": "dominio de f(x) = √(x - 2)"
        },
        {
          "t": "lim x→2 (x^2 - 4)/(x - 2)"
        },
        {
          "t": "continuidad de f(x) = (x^2 - 1)/(x - 1)"
        },
        {
          "t": "derivada de ln(x^2 + 1)"
        },
        {
          "t": "recta tangente a f(x) = x^2 en x = 1"
        },
        {
          "t": "máximos y mínimos de f(x) = x^3 - 3x"
        }
      ],
      "porTema": {
        "funcionesc": [
          {
            "t": "dominio de f(x) = √(4 - x^2)/(x - 1)"
          },
          {
            "t": "imagen de f(x) = x^2 - 4x + 1"
          },
          {
            "t": "paridad de f(x) = x^4 - 3x^2"
          },
          {
            "t": "¿es inyectiva f(x) = x^2 - 4x?"
          },
          {
            "t": "f(x) = x^2 + 1, g(x) = 2x - 3, (f∘g)(x)"
          },
          {
            "t": "inversa de f(x) = (2x + 3)/(x - 1)"
          },
          {
            "t": "¿es función x^2 + y^2 = 4?"
          },
          {
            "t": "gráfica de f(x) = 1/(x - 2)"
          }
        ],
        "limites": [
          {
            "t": "lim x→2 (x^2 - 4)/(x - 2)"
          },
          {
            "t": "lim x→∞ (3x^2 + 1)/(x^2 - 5)"
          },
          {
            "t": "lim x→3 (√(x + 1) - 2)/(x - 3)"
          },
          {
            "t": "lim x→0 sen(3x)/x"
          },
          {
            "t": "lim x→2+ 1/(x - 2)"
          },
          {
            "t": "lim x→∞ (1 + 1/x)^x"
          },
          {
            "t": "demostrar que lim x→2 (3x - 1) = 5"
          }
        ],
        "continuidad": [
          {
            "t": "f(x) = x^2 si x < 1; 2x - 1 si x ≥ 1, continuidad en x = 1"
          },
          {
            "t": "f(x) = kx + 1 si x < 2; x^2 si x ≥ 2, hallar k para que sea continua"
          },
          {
            "t": "discontinuidades de f(x) = (x^2 - 4)/(x^2 - x - 2)"
          },
          {
            "t": "¿es continua f(x) = 1/(x - 3) en [0; 2]?"
          }
        ],
        "derivada": [
          {
            "t": "derivada de sen(2x)·e^x"
          },
          {
            "t": "derivada de (2x + 3)/(x - 1)"
          },
          {
            "t": "derivada de arctg(3x)"
          },
          {
            "t": "derivada por definición de f(x) = x^2 + 3x"
          },
          {
            "t": "derivada implícita de x^2 + y^2 = 25"
          },
          {
            "t": "derivada segunda de f(x) = x^4 - 2x^3"
          },
          {
            "t": "derivada de f(x) = x^3 en x = 2"
          }
        ],
        "aplicaciones": [
          {
            "t": "recta tangente y normal a f(x) = √x en x = 4"
          },
          {
            "t": "máximos y mínimos de f(x) = x^3 - 3x"
          },
          {
            "t": "concavidad y puntos de inflexión de f(x) = x^3 - 6x^2 + 9x"
          },
          {
            "t": "estudio completo de f(x) = x^4 - 4x^3"
          },
          {
            "t": "posición s(t) = t^3 - 6t^2 + 9t, velocidad y aceleración en t = 2"
          },
          {
            "t": "aproximar √4,1 usando la recta tangente"
          }
        ]
      }
    },
    "integ": {
      "nombre": "Cálculo integral",
      "placeholder": "Por ejemplo: ∫ x e^x dx · ∫_0^2 x^2 dx · área entre f(x) = x^2 y g(x) = x · ∑_{i=1}^{n} (2i + 3)",
      "tip": "Tips: escribí la integral con ∫ y dx (∫ x^2 dx) o en palabras (integral de x^2). Definida: ∫_0^2 x^2 dx o “integral de 0 a 2 de x^2”. Podés pedir el método: “por partes”, “por sustitución”, “fracciones parciales”, “sustitución trigonométrica”. Sumatorias: ∑_{i=1}^{n} (2i + 3).",
      "auto": [
        {
          "t": "∑_{i=1}^{10} i^2"
        },
        {
          "t": "∫ (3x^2 - 4x + 5) dx"
        },
        {
          "t": "∫ sen^3 x dx"
        },
        {
          "t": "∫ x e^x dx por partes"
        },
        {
          "t": "∫_0^2 x^2 dx"
        },
        {
          "t": "área entre f(x) = x^2 y g(x) = x"
        },
        {
          "t": "tabla de integrales"
        },
        {
          "t": "y' = 3y, y(0) = 2"
        },
        {
          "t": "serie ∑_{n=1}^{∞} 1/2^n"
        }
      ],
      "porTema": {
        "sumas": [
          {
            "t": "∑_{i=1}^{10} i^2"
          },
          {
            "t": "∑_{i=1}^{n} (2i + 3)"
          },
          {
            "t": "∑_{k=3}^{8} (k^2 - k)"
          },
          {
            "t": "suma de Riemann de f(x) = x^2 en [0, 2] con n = 4 rectángulos inscritos"
          },
          {
            "t": "suma de Riemann de f(x) = x^2 en [0, 2] con n = 4 rectángulos circunscritos"
          },
          {
            "t": "límite de la suma de Riemann de f(x) = x^2 en [0, 2]"
          }
        ],
        "inmediatas": [
          {
            "t": "∫ (3x^2 - 4x + 5) dx"
          },
          {
            "t": "∫ (x^2 + 1)/x dx"
          },
          {
            "t": "∫ (2x + 3)^5 dx"
          },
          {
            "t": "∫ 1/(x^2 + 9) dx"
          },
          {
            "t": "∫ 3^x dx"
          }
        ],
        "trigint": [
          {
            "t": "∫ sen^3 x dx"
          },
          {
            "t": "∫ sen^2 x cos^2 x dx"
          },
          {
            "t": "∫ cos^4 x dx"
          },
          {
            "t": "∫ tg^3 x dx"
          },
          {
            "t": "∫ sec^3 x dx"
          },
          {
            "t": "∫ sen^5 x cos^2 x dx"
          }
        ],
        "metodos": [
          {
            "t": "∫ x e^x dx por partes"
          },
          {
            "t": "∫ e^x sen x dx"
          },
          {
            "t": "∫ (x + 5)/(x^2 + x - 2) dx"
          },
          {
            "t": "∫ (3x + 1)/(x^2 + 2x + 5) dx"
          },
          {
            "t": "∫ √(4 - x^2) dx"
          },
          {
            "t": "∫ x cos(x^2) dx"
          },
          {
            "t": "∫ x^3√(1 + x^2) dx por diferencial binomia"
          }
        ],
        "aplicacionesi": [
          {
            "t": "∫_0^π sen x dx"
          },
          {
            "t": "área entre f(x) = x^2 y g(x) = x"
          },
          {
            "t": "volumen al girar f(x) = √x entre x = 0 y x = 4 alrededor del eje x"
          },
          {
            "t": "volumen por arandelas entre f(x) = x y g(x) = x^2 alrededor del eje x"
          },
          {
            "t": "volumen por capas al girar f(x) = x^2 entre x = 0 y x = 2 alrededor del eje y"
          },
          {
            "t": "longitud de arco de f(x) = x^(3/2) entre x = 0 y x = 4"
          },
          {
            "t": "f'(x) = 3x^2 + 2, f(1) = 5"
          }
        ],
        "tablasi": [
          {
            "t": "tabla de integrales"
          },
          {
            "t": "tabla de integrales inmediatas"
          }
        ],
        "series": [
          {
            "t": "sucesión a_n = (2n + 1)/(n + 3)"
          },
          {
            "t": "serie ∑_{n=1}^{∞} 1/2^n"
          },
          {
            "t": "serie ∑_{n=1}^{∞} 1/n^2"
          },
          {
            "t": "serie ∑_{n=1}^{∞} n/2^n"
          },
          {
            "t": "serie ∑_{n=1}^{∞} (-1)^n/n"
          }
        ],
        "edo": [
          {
            "t": "y' = 3y, y(0) = 2"
          },
          {
            "t": "y' = 2xy"
          },
          {
            "t": "y' + 2y = 4, y(0) = 1"
          },
          {
            "t": "dy/dx = x/y"
          },
          {
            "t": "y' + y/x = x^2"
          }
        ]
      }
    },
    "est": {
      "nombre": "Estadística y probabilidad",
      "placeholder": "Por ejemplo: media, mediana y moda de 4, 7, 5, 9 · binomial n = 10, p = 0,3, P(X = 4) · P(A) = 0,4; P(A∩B) = 0,2",
      "tip": "Tips: separá los datos con coma y espacio (4, 7, 5) o con punto y coma si usás coma decimal (1,72; 1,65). Tablas: x: 1, 2, 3; f: 4, 6, 5. Intervalos: 0-10: 4, 10-20: 7. Probabilidades: P(A) = 0,4; P(A∩B) = 0,2; P(A|B). Distribuciones: n = 10, p = 0,3, P(X ≤ 2); μ = 50, σ = 10.",
      "auto": [
        {
          "t": "media, mediana y moda de 4, 7, 5, 9, 5, 6, 8"
        },
        {
          "t": "tabla de frecuencias: 3, 5, 2, 3, 4, 5, 3, 2, 1, 3, 4, 5"
        },
        {
          "t": "P(A) = 0,4; P(B) = 0,5; P(A∩B) = 0,2. Calcular P(A|B)"
        },
        {
          "t": "binomial n = 10, p = 0,3, P(X = 4)"
        },
        {
          "t": "normal μ = 50, σ = 10, P(X < 65)"
        },
        {
          "t": "intervalo de confianza del 95% para la media: x̄ = 52, s = 8, n = 25"
        },
        {
          "t": "regresión lineal x: 1, 2, 3, 4, 5; y: 2, 4, 5, 4, 6"
        }
      ],
      "porTema": {
        "tipos": [
          {
            "t": "clasificar: color de ojos, número de hermanos, estatura, nivel de estudios"
          },
          {
            "t": "¿qué tipo de variable es? datos: 1,72; 1,65; 1,80; 1,58"
          }
        ],
        "frecuencias": [
          {
            "t": "tabla de frecuencias: 3, 5, 2, 3, 4, 5, 3, 2, 1, 3, 4, 5"
          },
          {
            "t": "tabla de frecuencias agrupada: 12, 15, 22, 18, 30, 25, 27, 14, 19, 21, 33, 28, 16, 24, 26, 31, 20, 17, 23, 29"
          },
          {
            "t": "tabla de frecuencias: rojo, azul, rojo, verde, azul, rojo, amarillo"
          }
        ],
        "graficos": [
          {
            "t": "diagrama de barras: 3, 5, 2, 3, 4, 5, 3, 2, 1, 3"
          },
          {
            "t": "histograma: 12, 15, 22, 18, 30, 25, 27, 14, 19, 21, 33, 28, 16, 24, 26, 31, 20, 17"
          },
          {
            "t": "diagrama de sectores: fútbol, básquet, fútbol, tenis, fútbol, vóley, tenis"
          },
          {
            "t": "diagrama de dispersión x: 1, 2, 3, 4, 5; y: 2, 4, 5, 4, 6"
          }
        ],
        "central": [
          {
            "t": "media, mediana y moda de 4, 7, 5, 9, 5, 6, 8"
          },
          {
            "t": "media de x: 1, 2, 3, 4; f: 3, 5, 8, 4"
          },
          {
            "t": "media, mediana y moda: 0-10: 4, 10-20: 7, 20-30: 9, 30-40: 5"
          }
        ],
        "dispersion": [
          {
            "t": "varianza y desviación típica de 4, 7, 5, 9, 5, 6, 8"
          },
          {
            "t": "varianza muestral de 10, 12, 9, 15, 14"
          },
          {
            "t": "coeficiente de variación: 0-10: 4, 10-20: 7, 20-30: 9, 30-40: 5"
          }
        ],
        "forma": [
          {
            "t": "asimetría y curtosis de 2, 3, 3, 4, 4, 4, 5, 9, 12"
          },
          {
            "t": "asimetría de 1, 2, 3, 4, 5, 6, 7"
          }
        ],
        "posicion": [
          {
            "t": "cuartiles de 3, 7, 8, 5, 12, 14, 21, 13, 18"
          },
          {
            "t": "percentil 90 y decil 3 de 15, 20, 35, 40, 50, 22, 28, 31, 45, 18"
          },
          {
            "t": "cuartiles: 0-10: 4, 10-20: 7, 20-30: 9, 30-40: 5"
          }
        ],
        "condicional": [
          {
            "t": "P(A) = 0,4; P(B) = 0,5; P(A∩B) = 0,2. Calcular P(A|B) y P(A∪B)"
          },
          {
            "t": "P(A) = 0,3; P(B) = 0,6; P(A|B) = 0,25; ¿son independientes?"
          }
        ],
        "bayes": [
          {
            "t": "P(A1) = 0,5; P(A2) = 0,3; P(A3) = 0,2; P(D|A1) = 0,02; P(D|A2) = 0,03; P(D|A3) = 0,05"
          },
          {
            "t": "teorema de Bayes: P(E) = 0,01; P(T|E) = 0,95; P(T|S) = 0,08"
          }
        ],
        "diagramas": [
          {
            "t": "diagrama de Venn: n(A) = 30, n(B) = 20, n(A∩B) = 8, total = 50"
          },
          {
            "t": "urna con 3 bolillas rojas y 2 azules, se extraen 2 sin reposición, diagrama de árbol"
          },
          {
            "t": "tabla de contingencia: columnas: Sí, No; Varones: 20, 30; Mujeres: 25, 25"
          }
        ],
        "distribuciones": [
          {
            "t": "binomial n = 10, p = 0,3, P(X = 4)"
          },
          {
            "t": "binomial n = 20, p = 0,1, al menos 2"
          },
          {
            "t": "Poisson λ = 3, P(X = 2)"
          },
          {
            "t": "normal μ = 50, σ = 10, P(40 < X < 60)"
          },
          {
            "t": "normal μ = 100, σ = 15, percentil 90"
          },
          {
            "t": "variable aleatoria x: 0, 1, 2, 3; p: 0,1; 0,3; 0,4; 0,2"
          },
          {
            "t": "ley de los grandes números con un dado"
          }
        ],
        "estimacion": [
          {
            "t": "intervalo de confianza del 95% para la media: x̄ = 52, s = 8, n = 25"
          },
          {
            "t": "intervalo de confianza 90%: n = 200, 84 éxitos, proporción"
          },
          {
            "t": "intervalo de confianza del 99% con σ = 5: datos 48, 52, 50, 47, 53, 51, 49, 50"
          }
        ],
        "hipotesis": [
          {
            "t": "contraste de hipótesis: μ0 = 50, x̄ = 53, s = 6, n = 36, α = 0,05, la media es mayor"
          },
          {
            "t": "chi cuadrado observadas: 18, 22, 20, 40"
          },
          {
            "t": "chi cuadrado de independencia: Varones: 20, 30; Mujeres: 35, 15"
          },
          {
            "t": "prueba t para dos muestras: grupo A: 12, 15, 14, 10, 13; grupo B: 18, 17, 16, 19, 15"
          },
          {
            "t": "contraste μ0 = 100, σ = 15, x̄ = 106, n = 25, μ1 = 108, error tipo II"
          }
        ],
        "modelos": [
          {
            "t": "regresión lineal x: 1, 2, 3, 4, 5; y: 2, 4, 5, 4, 6, predecir para x = 7"
          },
          {
            "t": "ANOVA A: 5, 7, 6, 8; B: 8, 9, 7, 10; C: 4, 5, 6, 5"
          },
          {
            "t": "serie temporal ventas: 120, 135, 128, 150, 162, 158, 175, 180"
          }
        ],
        "combinatoria": [
          {
            "t": "C(10, 4)"
          },
          {
            "t": "V(7, 3)"
          },
          {
            "t": "permutaciones de la palabra BANANA"
          },
          {
            "t": "¿de cuántas formas se pueden elegir 3 alumnos de 10?"
          },
          {
            "t": "¿de cuántas formas se pueden sentar 6 personas en una mesa redonda?"
          },
          {
            "t": "¿cuántos números de 3 cifras se pueden formar con los dígitos 1, 2, 3, 4, 5?"
          }
        ]
      }
    }
  }
};
