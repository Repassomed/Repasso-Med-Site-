# Nova Era · Anatomía Patológica II · relatório do preparo

- Matéria `anatomia-patologica-ii` (tab `anato2`): 8 blocos `ap2b01–ap2b08` (marcador «BLOQUE NN · PARCIAL 1/2/FINAL · TEMA», sem «UNIDAD X»), `bancoap2`, `bancofcap2`, `ap2biblio`, `ap2intro`.
- `TEMAS['anatomia-patologica-ii']` + `clasificarAP2` em `rm-materia-sistema.js`; bloco de identidade de cor em `rm-materia-sistema.css`; `CANDIDATAS`/`VER`/tag em `rm-pilot.js`/`index.html`.
- `ap2biblio` e `ap2intro` não são blocos mas o módulo monta toda `section.container`: foram classificadas no grupo REPASO (R, S) para não criar um grupo «otro» solto. `ap2intro` não tem título (só guarda grifos antigos).
- Testes: `temas-ap2`, `real-ap2`, `integracao-ap2` (gerados do mesmo gabarito de Fisio II/Farmaco II), mais regressão compartilhada.
- Fora do escopo: `anatomia-patologica-ii-practica`, `anatomiapatologica-ii*` (arquivos duplicados sem rota no `index.html`), conteúdo médico.
- Nenhum SQL executado; nenhuma matéria ativada.
