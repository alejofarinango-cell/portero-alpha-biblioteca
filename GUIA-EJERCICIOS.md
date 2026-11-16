# Guía para agregar ejercicios a la biblioteca

Esta guía es para quien agregue ejercicios (una sesión de Claude, cada semana o cuando Alejandro lo pida).
La app de Portero Alpha Academy descarga `library.json` desde este repositorio cuando se abre con internet.

## Reglas de oro
1. Editar SOLO `library.json`. Agregar el ejercicio nuevo al final de `exercises`.
2. Subir `version` en +1 y poner la fecha de hoy en `updated` (AAAA-MM-DD). Si la versión no sube, la app no se entera.
3. No borrar ni cambiar los ids existentes. Id nuevo: `lib-<abreviatura>-NN` (ej. `lib-est-05`) y único.
4. Validar el JSON antes de subir (que cargue sin errores y que cada ejercicio tenga todos los campos).
5. Mensaje de commit claro, por ejemplo: `Biblioteca v3: agrega "Nombre del ejercicio"`.
6. Lenguaje sencillo, en español, pensado para entrenadores y niños/jóvenes (nada de jerga académica).

## Campos de cada ejercicio
```
{ "id": "lib-est-05", "source": "lib", "title": "...", "level": 1|2|3,
  "cat": "<una categoría de la lista>", "min": <minutos>,
  "obj": "Objetivo en una frase.",
  "desc": "1. Paso uno.\n2. Paso dos.\n3. ...\n4. ...",
  "mat": "Material necesario.",
  "keys": "• Punto clave 1.\n• Punto clave 2.\n• Punto clave 3.",
  "scene": { ... } }
```
Categorías válidas: Calentamiento, Posición y desplazamientos, Blocaje y atajadas, Reacciones, Estiradas,
Juego aéreo, Salidas y 1 contra 1, Juego con los pies, Saques con la mano, Situaciones de juego.
Niveles: 1 Iniciación, 2 Intermedio, 3 Avanzado. Mantener la biblioteca equilibrada entre niveles.

## La pizarra (`scene`)
`{ "frames": [ { "items": [...], "arrows": [...] }, ... ] }` — de 2 a 5 cuadros; la app anima de un cuadro al siguiente.
- Cada ficha: `{ "id", "t", "x", "y", "n" }`. `t`: gk (portero), pl (jugador azul), op (rival rojo), cone, ball, goal (mini arco), wall (barrera).
- Una ficha se identifica por su `id`: debe tener el MISMO id en todos los cuadros para que se mueva (y no aparezca/desaparezca).
- Flechas: `{ "k": "run"|"pass"|"gk", "pts": [[x,y],[x,y],...] }` (correr, pase/tiro punteado, recorrido del portero naranja).
- Lienzo de 700 x 600.

### Vista desde arriba (por defecto, sin `view`)
Arco arriba (centro x=350, y≈40), área grande y=40..220, medio campo abajo. Portero típico en (350, 60).

### Vista de frente (`"view": "front"` dentro de `scene`)
Se usa SOLO cuando el ejercicio lo amerita (estiradas, balones altos, tiros, barrera, técnica de postura).
El arco se ve desde el tirador: postes en x=130 y x=570, travesaño en y=184, línea de gol en y=330 (60 px = 1 metro).
- `x, y` = donde apoya los pies o el balón en el piso. Portero normal: (350, 338). Tiradores/lanzadores: y entre 440 y 540 (más abajo = más cerca de quien mira).
- `z` (opcional) = altura en el aire en píxeles. Balón a la altura del pecho del portero ≈ 60; ángulo superior ≈ 140.
- Solo gk, pl, op y ball admiten `z`. Los jugadores (pl, op) se ven de espaldas; con `"fr": 1` se ven de frente (ej. un entrenador que mira).
- Solo para el portero/jugadores: `r` = inclinación en grados (negativo cae a la izquierda, positivo a la derecha; ±75 = estirada tendida),
  `k` = 1 de rodillas, `u` = 1 brazos arriba (si hay `r` grande los brazos suben solos).
- Estirada típica a la izquierda: portero `{x:240, y:338, r:-62, z:100, u:1}`; balón en sus guantes a unos 70 px más a la izquierda y más arriba.
- Los balones se dibujan siempre encima; el orden de las fichas debe ser el mismo en todos los cuadros.

### Detalles para que se entienda mejor (opcionales, pero recomendados)
Cada cuadro puede llevar `"cap"` (una frase corta, máx. 120 letras, que explica qué pasa en ese cuadro, ej. `"El portero espera en posición base."`)
y `"marks"` (marcas dibujadas encima de la cancha). Usarlas en ejercicios donde ayudan a entender; no hace falta en todos.
Las marcas son sencillas y no se mueven; si quedan iguales entre cuadros, se mantienen en pantalla.
- Zona: `{"k":"zone","x","y","w","h","c":"g"|"b"|"y"|"r","t":"Nombre"}` (rectángulo; x,y = esquina superior izquierda; g verde, b azul, y amarillo, r rojo). El nombre es opcional y se escribe arriba de la zona.
- Texto: `{"k":"label","x","y","t":"Texto corto"}` (máx. 40 letras, centrado en x,y).
- Medida: `{"k":"dist","a":[x,y],"b":[x,y],"t":"5 m"}` (línea con tope en los dos extremos).
- Paso: `{"k":"num","x","y","t":"1"}` (círculo amarillo numerado, para el orden de las acciones).
- Aro: `{"k":"ring","x","y","r","c":"y"}` (círculo punteado para resaltar un punto).
Medidas aproximadas en vista de arriba: 1 metro ≈ 11 px (línea de gol y=40, área grande de x=130 a 570). En vista de frente: 60 px = 1 metro.
Evitar poner textos encima de las fichas; mejor a un lado o arriba. Al terminar, el ejercicio se ve con una leyenda y cada cuadro muestra su frase.

### Vista ilustrada (deportistas dibujados de cuerpo completo)
La app tiene un botón "Ilustrado / Pizarra". En "Ilustrado" cada ficha se dibuja como un deportista con cuerpo, brazos y piernas, haciendo la acción. Funciona sola con cualquier ejercicio, pero se ve mucho mejor si cada ficha de persona lleva su postura. Campos opcionales dentro de cada ficha (gk, pl, op):
- `"p"`: postura. Valores: `base` (posición base), `stand` (de pie), `shuffle` (pasos laterales), `run` (corriendo), `catch_chest` (atrapa al pecho), `catch_low` (atrapa abajo), `catch_high` (salta y atrapa), `block_low` (de rodillas), `dive_l` / `dive_r` (vuela a su izquierda / derecha), `lie_l` / `lie_r` (tendido), `punch` (despeja de puños), `hold` (balón en manos), `throw_wind` (prepara lanzamiento), `throw_over` (lanza por arriba), `throw_under_back` / `throw_under` (prepara y hace saque rodado), `kick_back` / `kick` / `kick_follow` (pase o tiro: prepara, patea, termina), `receive` (recibe el balón), `squat` (agachado), `point` (señala).
- `"h"`: hacia dónde mira, en grados (0 = hacia quien mira la pizarra; 180 = hacia el arco; 90 y 270 = de lado). Si no se pone, la app lo calcula según el movimiento y el balón.
- Balón en las manos de alguien: en la ficha del balón poner `"g":"<id de la persona>"` y `"gw":"B"` (dos manos), `"L"` o `"R"`. El balón sigue a esa persona en la animación.
- Muro de rebote: en una ficha `wall` poner `"w":"board"` para dibujarlo como tablero de rebote.
- En vista desde arriba, el balón también admite `z` (altura en píxeles) para pases por aire.
Regla práctica: dar `p` a cada persona en cada cuadro donde haga algo distinto a estar parada o correr (la app ya dibuja de pie / corriendo por defecto). La postura debe coincidir con la frase `cap` de ese cuadro.
