// Correções documentadas do texto preexistente do bloco 20 (punção lumbar), #682.
// Aplica ao HTML da base as únicas substituições permitidas, para os testes de preservação continuarem byte a byte.
const P=require('./b20-correcoes.json');
module.exports=h=>{for(const [o,n,c] of P){if(h.split(o).length-1!==c)throw new Error('base sem o trecho esperado: '+o.slice(0,50));h=h.split(o).join(n);}return h;};
