/* REPASSO MED · get-audio-url — URL assinada (10 min) de UM audiobook, só para o UID autorizado
   e só para um audio_id do manifesto do servidor. Toda a lógica e as garantias estão em _audio/lib.js. */
'use strict';
const { criar } = require('./_audio/lib.js');
const RMAudio = require('../../assets/rm-audio.js');

exports.handler = function (event) {
  return criar({ env: process.env, fetch: fetch, validateItem: RMAudio.validateItem }).assinar(event);
};
