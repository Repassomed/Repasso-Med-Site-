# Guía corta para implementación · Semiología II (Repasso Med)
Prototipo = referencia visual. Reaprovechar el HTML y scripts del sitio real; no sustituir el motor de contenido. No publicar desde aquí.

## 1. Anotaciones
- Mantener el motor de anotaciones existente (marcador/lápiz/borrador); cambiar solo la apariencia.
- No migrar claves de almacenamiento existentes. `rm-semio2-notas` es demo; si se adopta "Mi nota", guardarla junto a las anotaciones reales (cuenta del usuario).
- Anclar trazos y resaltados al id del párrafo/bloque, no a coordenadas: el nuevo layout cambia anchos (texto 760 px; columna de notas ≥1280 px).

## 2. Preguntas
- Preservar .quiz-item, .tf-btn y checkTF() originales; solo estilo nuevo. Origen (examen / complementaria) sale de .quiz-tag.
- 120 preguntas únicas en los bloques; el Banco general reutiliza las mismas 120 — no sumar.
- No agregar progreso, aciertos ni "seguir donde lo dejaste" si el sistema no los guarda.

## 3. Flashcards
- Preservar .flashcard (.fc-front / .fc-back) y el giro. 172 tarjetas en los bloques; s2-flashcards reúne las mismas.
- Reverso: texto y negrita blancos sobre #33266F.

## 4. Navegación
- Mantener ids s2-guia, s2-b01…s2-b10, s2-tablas, s2-banco, s2-flashcards y anclas internas; el índice usa los h3 reales.
- Header fijo 60 px (54 px celular): usar scroll-margin-top en anclas.
- Lateral recogible ≥1024; gaveta <1024; barra inferior <700; cerrar gaveta al navegar.
- Quitar etiqueta PROTOTIPO y parámetros de revisión (#w=…, #id=…, #from=…).

## 5. Medios y contenido
- No reescribir texto médico.
- Auscultación: usar players y audios originales (/assets/audio/semio2/).
- Vignetas (assets/vig/) son recortes de infografías aprobadas; servir WebP 1:1 ~480 px.
