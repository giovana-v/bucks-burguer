#!/usr/bin/env node
/* Reduz as fontes de fontes-originais/ ao que o site usa. Rodar: npm run fontes */

const fs = require('fs');
const path = require('path');
const subset = require('subset-font');

const raiz = path.resolve(__dirname, '..');
const origem = path.join(raiz, 'fontes-originais');
const destino = path.join(raiz, 'public', 'assets', 'fonts');

/* Latim básico, acentos do português e a pontuação que aparece em
   preços e endereços. Tudo fora desta lista some do arquivo — o site
   é em português e nenhum texto dele sai daqui. */
const LATIM =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
  '0123456789' +
  ' .,;:!?\'"()[]{}-–—/&@#%*+=<>|_\\$°ºª' +
  'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ';

/* peso: null mantém o eixo variável. Um número fixa o eixo, o que
   corta as instâncias intermediárias do arquivo.

   Caveat é decorativa e só aparece em título e legenda; entre o 500 e
   o 700 a diferença é quase imperceptível na tela, e fixar num 600
   tira 30 KB do recurso mais lento da cadeia crítica.

   Montserrat carrega o texto todo, de 400 a 800, e esses pesos são
   usados de verdade — o eixo fica. */
const FONTES = [
  { arquivo: 'caveat-latin.woff2',          peso: 600 },
  { arquivo: 'caveat-latin-ext.woff2',      peso: 600 },
  { arquivo: 'anton-latin.woff2',           peso: null },
  { arquivo: 'anton-latin-ext.woff2',       peso: null },
  { arquivo: 'montserrat-latin.woff2',      peso: null },
  { arquivo: 'montserrat-latin-ext.woff2',  peso: null }
];

const kb = (n) => (n / 1024).toFixed(0) + ' KB';

async function main() {
  for (const { arquivo, peso } of FONTES) {
    const entrada = path.join(origem, arquivo);
    if (!fs.existsSync(entrada)) { console.warn(`  ! ${arquivo}: não está em fontes-originais/`); continue; }

    const original = fs.readFileSync(entrada);
    const opcoes = { targetFormat: 'woff2' };
    if (peso !== null) opcoes.variationAxes = { wght: { min: peso, max: peso, default: peso } };

    const reduzida = await subset(original, LATIM, opcoes);
    fs.writeFileSync(path.join(destino, arquivo), reduzida);

    const corte = (1 - reduzida.length / original.length) * 100;
    console.log(`${arquivo.padEnd(28)} ${kb(original.length).padStart(6)} -> ${kb(reduzida.length).padStart(6)}  (-${corte.toFixed(0)}%)`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
