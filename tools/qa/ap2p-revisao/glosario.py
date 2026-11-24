# AP II Práctica · glosario clicable (rmc-gl) para toda la materia. Definiciones cortas, en castellano simple, para quien empieza.
# Reglas: solo texto de enseñanza (no preguntas, respuestas, tarjetas, títulos, pies de figura ni atlas); hasta MAXIMO apariciones por término y bloque; nunca dentro de otro glosario.
import re

MAXIMO = 2
CLOSE = '<b class="rmc-gl-close">Tocá de nuevo para cerrar</b>'

# patrón regex (sin distinguir mayúsculas) -> definición HTML. El orden no importa: se aplica «lo más largo primero».
NUEVOS = {
 r'perlas? (?:de queratina|córneas)': '<b>Perla de queratina</b>: formación <b>concéntrica</b> de queratina, «en capas de cebolla», dentro de un nido tumoral. Muestra que el tumor aún intenta madurar como epitelio escamoso.',
 r'contenido mixoide|estroma mixoide|tejido mixoide|fondo mixoide|mixoide': '<b>Mixoide</b>: tejido <b>laxo, pálido y gelatinoso</b>, rico en una sustancia mucosa. Se ve claro, con células que parecen «flotar» en él.',
 r'linitis plástica': '<b>Linitis plástica</b>: engrosamiento y <b>rigidez de toda la pared del estómago</b>, que queda como un tubo de cuero. Es la imagen del adenocarcinoma gástrico <b>difuso</b>; no se trata de un tumor «bultoso».',
 r'intraepitelial(?:es)?': '<b>Intraepitelial</b>: <b>dentro</b> del epitelio, sin haber cruzado la membrana basal. Si las células malignas siguen ahí, es un cáncer <b>in situ</b>: todavía no invade.',
 r'in situ': '<b>In situ</b>: cáncer que <b>todavía no pasó la membrana basal</b>; está contenido en el lugar donde nació. Si la atraviesa, pasa a ser <b>invasivo</b>.',
 r'granulomas?(?! no caseificante)': '<b>Granuloma</b>: pequeño nódulo de <b>macrófagos activados</b> (células epitelioides), a veces con células gigantes, rodeado de linfocitos. Es una forma de inflamación <b>crónica</b>.',
 r'granulomas? no caseificantes?': '<b>Granuloma no caseificante</b>: granuloma <b>sin necrosis caseosa</b> en su centro (como en la enfermedad de Crohn). Si el centro fuera «de queso», sería caseificante.',
 r'necrosis caseificante|necrosis caseosa': '<b>Necrosis caseificante</b>: muerte de tejido con aspecto de <b>queso blanco desmenuzable</b> (típica de la tuberculosis). Al microscopio es un material rosado, granular y sin estructura.',
 r'metaplasia(?! intestinal)(?: escamosa)?': '<b>Metaplasia</b>: un epitelio adulto es <b>reemplazado por otro tipo de epitelio adulto</b> como respuesta a una agresión (por ejemplo, cilíndrico que pasa a plano). No es cáncer, pero es terreno donde puede aparecer.',
 r'displasia(?! escamosa)': '<b>Displasia</b>: las células pierden el orden normal (núcleos grandes, oscuros y desiguales) <b>sin invadir</b> todavía. Puede ser el paso previo al cáncer.',
 r'atipias?': '<b>Atipia</b>: aspecto <b>anormal</b> de las células, sobre todo del núcleo (grande, oscuro, de forma rara). A más atipia, más se aleja la célula de la normal.',
 r'pleomorfismo|pleomórficas?|pleomórficos?': '<b>Pleomorfismo</b>: <b>variación marcada</b> en el tamaño y la forma de las células o de los núcleos dentro del mismo tumor.',
 r'anisonucleosis': '<b>Anisonucleosis</b>: núcleos de <b>tamaño muy desigual</b> dentro de un mismo grupo de células.',
 r'mitosis atípicas?': '<b>Mitosis atípica</b>: división celular con <b>forma anormal</b> (por ejemplo, con más de dos polos). Es un signo que apunta a malignidad.',
 r'angiogénesis': '<b>Angiogénesis</b>: formación de <b>vasos sanguíneos nuevos</b>. Aparece en toda reparación de tejido y también en los tumores.',
 r'fibrosis': '<b>Fibrosis</b>: el tejido normal es <b>reemplazado por colágeno</b> (cicatriz). Se ve como bandas rosadas.',
 r'linfoplasmocitari[oa]s?|linfoplasmocitari[oa]': '<b>Linfoplasmocitario</b>: mezcla de <b>linfocitos</b> y <b>plasmocitos</b> (células que fabrican anticuerpos). Es el infiltrado típico de una inflamación crónica.',
 r'tiroidización': '<b>Tiroidización</b>: en el riñón, túbulos <b>dilatados y llenos de material rosado homogéneo</b>, que se parecen a folículos tiroideos con coloide. Es la palabra clave de la pielonefritis crónica.',
 r'cuerpos? de psamoma|psamomas?': '<b>Cuerpo de psamoma</b>: calcificación <b>redonda, en capas concéntricas</b>, que se ve violeta y a veces rompe el corte. Se describe en el carcinoma papilar de tiroides.',
 r'vidrio esmerilado': '<b>Núcleo en vidrio esmerilado</b>: núcleo <b>pálido, «lechoso»</b>, de borde marcado, porque la cromatina se ve clara. Es un rasgo del carcinoma papilar de tiroides.',
 r'células de Hürthle|células de Hurthle': '<b>Célula de Hürthle</b>: célula tiroidea <b>grande, de citoplasma rosado y granular</b> (rico en mitocondrias). Aparece en la tiroiditis de Hashimoto.',
 r'centros? germinativos?': '<b>Centro germinativo</b>: zona <b>más pálida</b> en el centro de un folículo linfoide, donde los linfocitos se multiplican y maduran. Indica una respuesta inmune activa.',
 r'coilocit(?:os|osis)': '<b>Coilocito</b>: célula escamosa con un <b>halo claro</b> alrededor de un núcleo arrugado y oscuro: es la huella del virus del papiloma (VPH). <b>Coilocitosis</b> = presencia de coilocitos.',
 r'papilomatosis|papilas': '<b>Papila</b>: proyección <b>en forma de dedo</b> con un eje de tejido conectivo. <b>Papilomatosis</b>: el epitelio crece en muchas papilas.',
 r'amiloide': '<b>Amiloide</b>: proteína anormal que se <b>deposita fuera de las células</b>; en la lámina es material <b>rosado, amorfo y homogéneo</b>.',
 r'fila india': '<b>Fila india</b>: células infiltrantes <b>alineadas de a una</b>, como personas en fila, dentro de un estroma fibroso.',
 r'cribiforme': '<b>Cribiforme</b>: patrón «de colador»: grupos de células con <b>espacios redondos</b> como agujeros.',
 r'células epitelioides': '<b>Células epitelioides</b>: macrófagos activados de citoplasma <b>rosado y abundante</b> que se parecen a células epiteliales. Forman los granulomas.',
 r'células gigantes de Langhans': '<b>Célula gigante de Langhans</b>: célula grande con <b>muchos núcleos en herradura</b> en la periferia. Se ve en los granulomas.',
 r'cuerpos amiláceos': '<b>Cuerpos amiláceos</b>: concreciones <b>rosadas y redondeadas</b> dentro de la luz de las glándulas prostáticas.',
 r'células de Sertoli': '<b>Células de Sertoli</b>: células de <b>sostén</b> dentro del túbulo seminífero; acompañan y nutren a las células germinales.',
 r'células de Leydig': '<b>Células de Leydig</b>: células del <b>intersticio</b> del testículo que fabrican testosterona.',
 r'glándulas de Brunner': '<b>Glándulas de Brunner</b>: glándulas mucosas <b>propias del duodeno</b>, bajo la mucosa; se ven como lóbulos pálidos y espumosos.',
 r'PanIN': '<b>PanIN</b> (neoplasia intraepitelial pancreática): lesión <b>precursora</b> que crece <b>dentro de los conductos pequeños</b> del páncreas, antes del adenocarcinoma.',
 r'esteatorrea': '<b>Esteatorrea</b>: heces <b>grasosas</b> y voluminosas por no poder absorber las grasas.',
 r'hialinización': '<b>Hialinización</b>: depósito de un material <b>rosado, homogéneo y vítreo</b> en el estroma.',
 r'mucina': '<b>Mucina</b>: sustancia <b>viscosa</b> (moco) que secretan algunas glándulas; en los tumores se ve como material pálido, azulado o rosado.',
 r'pseudoglándulas?|seudoglándulas?': '<b>Pseudoglándula</b>: espacio redondeado formado por células tumorales que <b>parece una glándula</b> pero no lo es.',
 r'unilocular(?:es)?': '<b>Unilocular</b>: adipocito con <b>una sola gota grande</b> de grasa; es la grasa «madura» normal.',
 r'halo de linfocitos|coronas? linfocit[aá]rias?|corona linfocitaria': '<b>Halo / corona de linfocitos</b>: anillo de <b>células pequeñas y oscuras</b> alrededor de una estructura (por ejemplo, un granuloma).',
 r'hendiduras? nucleares?': '<b>Hendidura nuclear</b>: surco longitudinal en el núcleo, como un «grano de café».',
}

SKIP_TAGS = {'script', 'style', 'h1', 'h2', 'h3', 'h4', 'h5', 'th', 'button', 'figcaption', 'a', 'option', 'label', 'summary'}
SKIP_CLASS = re.compile(r'(?:^|\s)(?:quiz-item|quiz-question|answer|flashcard|fc-front|fc-back|fc-grid|rmc-gl|rmc-pill|rmatlas\S*|ap2p-acto|section-marker\S*|rmc-fig|tf-buttons|reveal-btn|ap2p-big|ap2p-lam-h|ap2p-tab-h|rmc-cap|rmc-note|ap2p-wrap-h|rmc-freq|rmc-bar)(?:\s|$)')
VOID = {'br', 'img', 'hr', 'meta', 'link', 'input', 'col', 'source', 'wbr'}
LET = 'A-Za-záéíóúüñÁÉÍÓÚÜÑ0-9_'

def extraer_existentes(t):
    """términos que ya tiene el sitio (rmc-gl) -> (patrón, definición): se reutiliza su definición para marcar las repeticiones."""
    out = {}
    for m in re.finditer(r'<span class="rmc-gl">(.*?)<b>\?</b><i><b class="rmc-gl-close">[^<]*</b>(.*?)</i></span>', t, re.S):
        term = re.sub(r'<[^>]+>', '', m.group(1)).strip()
        if term and len(term) > 3: out[re.escape(term)] = m.group(2)
    return out

def construir_mapa(t):
    """patrón -> definición. Si el sitio YA define un término (rmc-gl existente), manda esa definición: un término, una sola definición en toda la materia."""
    mapa = {k: v for k, v in NUEVOS.items() if v}
    for k, v in extraer_existentes(t).items():
        term = re.sub(r'\\(.)', r'\1', k)
        cubiertos = [p for p in mapa if re.fullmatch(p, term, re.I)]
        if cubiertos:
            for p in cubiertos: mapa[p] = v
        else:
            mapa[k] = v
    return mapa

def aplicar(seccion, mapa, contador):
    """envuelve apariciones dentro de UNA sección; devuelve (html, n_envueltas)."""
    pats = sorted(mapa.keys(), key=lambda p: -len(p))
    rx = re.compile(r'(?<![' + LET + r'])(' + '|'.join(f'(?P<g{i}>{p})' for i, p in enumerate(pats)) + r')(?![' + LET + r'])', re.I)
    toks = re.split(r'(<[^>]+>)', seccion)
    stack = []; out = []; nuevas = 0
    for tk in toks:
        if tk.startswith('<') and tk.endswith('>'):
            out.append(tk)
            if tk.startswith('<!--'): continue
            m = re.match(r'</?\s*([a-zA-Z0-9]+)', tk)
            if not m: continue
            name = m.group(1).lower()
            if tk.startswith('</'):
                for i in range(len(stack) - 1, -1, -1):
                    if stack[i][0] == name: del stack[i:]; break
            elif name not in VOID and not tk.endswith('/>'):
                cm = re.search(r'class="([^"]*)"', tk)
                skip = name in SKIP_TAGS or bool(cm and SKIP_CLASS.search(cm.group(1)))
                stack.append((name, skip))
            continue
        if not tk.strip() or any(s for _, s in stack):
            out.append(tk); continue
        def rep(mo):
            nonlocal nuevas
            gi = next(i for i in range(len(pats)) if mo.group(f'g{i}') is not None)
            key = pats[gi]
            if contador.get(key, 0) >= MAXIMO: return mo.group(0)
            contador[key] = contador.get(key, 0) + 1; nuevas += 1
            return f'<span class="rmc-gl">{mo.group(0)}<b>?</b><i>{CLOSE}{mapa[key]}</i></span>'
        out.append(rx.sub(rep, tk))
    return ''.join(out), nuevas
