/* REPASSO MED · get-audio-manifest — lista (só leitura) dos audiobooks PRONTOS da matéria do piloto
   para o UID autorizado. Toda a lógica e as garantias estão em _audio/lib.js. */
'use strict';
const { criar } = require('./_audio/lib.js');
const RMAudio = require('../../assets/rm-audio.js');   // o MESMO validador do motor (recusa URL/caminho/token)

exports.handler = function (event) {
  return criar({ env: process.env, fetch: fetch, validateItem: RMAudio.validateItem }).manifesto(event);
};
