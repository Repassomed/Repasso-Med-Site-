# Auditoria das matérias — rodada 2026-10-16-0305

> Relatório **somente leitura** feito pela API do ChatGPT. Nada foi corrigido.
> Cada achado precisa ser **conferido** por um Claude antes de virar correção.

**Modo:** rapida · **Modelo:** `gpt-5.6-terra` · **Custo calculado:** US$ 0.22 (limite US$ 5.00) · 2 chamada(s), 74.660 tokens lidos e 6.249 escritos

**Placar:** 🟠 editorial 1 · 🔴 grave 1

| # | matéria | veredito | achados | voz de prova | G0 | densidade | repetição | precisa editorial? |
|---|---|---|---|---|---|---|---|---|
| 1 | [Medicina Familiar](rodadas/2026-10-16-0305/materias/medicina-familiar.md) | 🟠 editorial | P1:4 P2:4 P3:1 | 13 | parcial | excessiva | alta | sim |
| 2 | [Dermatología](rodadas/2026-10-16-0305/materias/dermatologia.md) | 🔴 grave | P0:1 P1:3 P2:4 | 0 | parcial | densa | media | sim |

## Achados P0/P1 (olhar primeiro)

- **medicina-familiar-01** (P1, questoes) Medicina Familiar: A própria matéria afirma que entre 12 meses e 2 anos não há fórmula própria e que os tramos não se tocam, mas a resposta estende arbitrariamente a fórmula de 2–6 anos para 16 meses.
- **medicina-familiar-02** (P1, ciencia) Medicina Familiar: A tabela apresenta os índices como se peso/talla começasse apenas após 2 anos e como se bastassem dois índices antes dessa idade. Isso não corresponde ao uso antropométrico pediátrico atual das curvas OMS, que inclui relação peso-comprimento/altura e IMC por idade conforme a idade e o objetivo clínico.
- **medicina-familiar-03** (P1, questoes) Medicina Familiar: A pergunta pede um único componente bem desenvolvido, mas a resposta reconhece três componentes defensáveis. Assim, a questão fica ambígua.
- **medicina-familiar-04** (P1, consistencia) Medicina Familiar: A simbologia das relações é apresentada de modos diferentes no trecho: depois, a relação conflitante aparece como zigzag e a linha dupla como relação muito unida. Como as questões cobram os símbolos, a falta de padronização pode induzir erro.
- **dermatologia-01** (P0, questoes) Dermatología: O gabarito afirma que a cátedra usa corte de 0,5 cm, mas a tabela anterior da própria matéria define vesícula como < 1 cm e ampolla como ≥ 1 cm. A questão cobra uma resposta incompatível com o resumo e com os flashcards.
- **dermatologia-02** (P1, ciencia) Dermatología: O texto transforma Nikolsky positivo em sinônimo de acantólise. Isso não vale para todas as doenças citadas: na NET há necrose epidérmica extensa, e na SSSS a clivagem decorre da toxina estafilocócica, não de acantólise autoimune como no pênfigo.
- **dermatologia-03** (P1, ciencia) Dermatología: A explicação apresenta a desmogleína 3 como único alvo do pênfigo vulgar. Há formas mucocutâneas com anticorpos contra desmogleína 1 e 3; a associação exclusiva com Dsg3 simplifica demais o mecanismo.
- **dermatologia-04** (P1, ciencia) Dermatología: A frase torna dermatoscopia e biópsia obrigatórias para toda lesão nova, mutável, assimétrica ou com sangramento. Esses achados exigem avaliação clínica prioritária, mas a indicação de biópsia depende da suspeita e da avaliação especializada.

## Legenda

✅ ok · 🟡 ajustes pontuais · 🟠 precisa passada editorial · 🔴 grave (erro científico/gabarito) · ⚠️ falhou · ⏸️ parou no limite de gasto · 🚫 adiada pelo José · ⚪ só checagem automática

Como corrigir: ver `coordination/auditoria-api/README.md`, seção «Passar as correções para um Claude».
