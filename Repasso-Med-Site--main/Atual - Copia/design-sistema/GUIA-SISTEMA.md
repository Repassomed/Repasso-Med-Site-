# Repasso Med · Sistema visual de materias (guía corta)
Diseño, no producción. Referencia aprobada: piloto de Semiología II (`consolidada/`).

## Idea
1 esqueleto + 8 componentes fijos + 1 tema por materia (6 decisiones). Nunca un layout por materia.

## Constante (no tocar por materia)
Header #13314F con borde dorado · logo oficial · papel #FFFDF8 · Fraunces/Literata/JetBrains Mono · Literata 20/530 · cards de recursos C3 y sus colores · notas P4 (dato clave, no confundir, alerta, mi nota) · colores correcto/incorrecto · Caveat solo en "Mi nota".

## Los 8 componentes
C-01 Título de materia (T1) · C-02 Índice/lateral (L1-COLOR) · C-03 Título de bloque (B2 + asignatura) · C-04 Resumen (RT2-B) · C-05 Tabla (TB2-A color) · C-06 Pregunta · C-07 Notas P4 · C-08 Infografía + recursos C3.
Todos leen las variables del tema; ninguno tiene colores propios por materia.

## Crear el tema de una materia nueva (6 pasos)
1. **Superficie**: un tono suave (L > 85%) distinto del papel y de las otras materias del mismo semestre; lateral = misma familia, más clara.
2. **Paleta**: 6 colores de capítulo coordinados. Ninguno igual o cercano al rojo de alerta #C0392B.
3. **Agrupamiento**: decidir por qué se agrupan los capítulos (unidad, parcial, clase, nivel anatómico). Los capítulos de un mismo grupo comparten familia.
4. **Asignatura**: UN solo motivo, aplicado únicamente al número del bloque (faja, portaobjetos, cápsula, nodo…).
5. **Viñeta**: forma única (círculo, blíster, nodo) + anillo en el color de acento.
6. **Ilustración**: hero y viñetas en acuarela + tinta, sin texto; pueden ser recortes limpios de infografías aprobadas.
Registrar el tema en `tokens-materias.json`.

## Reglas anti-polución
- Color fuerte solo en: etiqueta del índice, aba/cabecera de tabla, asignatura, selección activa.
- Máx. 1 hero por materia y 1 viñeta por bloque.
- Sin emoji, sin 3D, sin mezclar estilos de ícono.
- Las notas P4 y los recursos nunca cambian de color con la materia.

## Contenido
- No reescribir ni resumir texto médico; usar el HTML real de cada materia.
- No inventar capítulos, contagens, progreso ni anotaciones. Contagens = leídas del archivo.
- Texto "maquetación" en los ejemplos = placeholder a reemplazar.

## Estado de los ejemplos
- Anatomía Patológica II: contenido real (bloque 02).
- Farmacología II: no hay archivo en el repositorio; ejemplo con contenido real de Farmacología I (bloque 04).
- Neurología: títulos de las infografías reales + enunciado real; resumen/tabla/alerta = maquetación (falta leer neurologia.html).

## Implementación (para Claude 2)
- Implementar el tema como variables CSS por materia (`--rm-surface`, `--rm-side`, `--rm-accent`, `--rm-pal-1…6`, `--rm-tag-radius`, `--rm-vig-radius`) en un único stylesheet; la asignatura como una clase por materia.
- Mantener HTML, ids y scripts existentes de cada materia (quiz-item, flashcard, anotaciones). Solo cambia la apariencia.
- Ver también `consolidada/GUIA-IMPLEMENTACION.md`.
