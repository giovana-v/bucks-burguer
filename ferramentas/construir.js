#!/usr/bin/env node
/* Gera public/css/site.css e cola o CSS crítico no <head>. Rodar: npm run build */

const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const pastaCss = path.join(raiz, 'public', 'css');
const paginas = path.join(raiz, 'public');

/* A ordem é a cascata: tokens, depois componentes, depois os ajustes
   por largura de tela. Um arquivo só, e não três, porque o navegador
   aplica cada folha assim que ela chega: com três, existe um instante
   em que components.css já valeu e responsive.css ainda não, e a
   página inteira se desloca quando o segundo arquivo corrige o
   primeiro. Junto, só existe um antes e um depois. */
const FONTES = ['global.css', 'components.css', 'responsive.css'];
const SAIDA = 'site.css';

const INICIO = '<!-- CRITICO:INICIO -->';
const FIM = '<!-- CRITICO:FIM -->';

function minificar(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

/* ---------- 1. Junta as folhas ---------- */
const juntas = FONTES
  .map(f => `/* ${f} */\n${fs.readFileSync(path.join(pastaCss, f), 'utf8')}`)
  .join('\n\n');

fs.writeFileSync(path.join(pastaCss, SAIDA), juntas);
console.log(`${SAIDA}: ${(juntas.length / 1024).toFixed(1)} KB (${FONTES.join(' + ')})`);

/* ---------- 2. Cola o CSS crítico ---------- */
const critico = minificar(fs.readFileSync(path.join(raiz, 'modelos', 'critico.css'), 'utf8'));

let tocados = 0;
for (const arquivo of fs.readdirSync(paginas).filter(f => f.endsWith('.html'))) {
  const caminho = path.join(paginas, arquivo);
  const html = fs.readFileSync(caminho, 'utf8');

  const i = html.indexOf(INICIO);
  const f = html.indexOf(FIM);
  if (i === -1 || f === -1) {
    console.warn(`  ! ${arquivo}: sem os marcadores CRITICO — pulado`);
    continue;
  }

  const novo = html.slice(0, i + INICIO.length) +
    '\n<style>' + critico + '</style>\n' +
    html.slice(f);

  if (novo !== html) { fs.writeFileSync(caminho, novo); tocados++; }
}

console.log(`CSS crítico: ${(critico.length / 1024).toFixed(1)} KB em ${tocados} página(s).`);
