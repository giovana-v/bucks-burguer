#!/usr/bin/env node
/* Gera public/css/site.css, public/js/site.js e cola o CSS crítico. Rodar: npm run build */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const raiz = path.resolve(__dirname, '..');
const src = path.join(raiz, 'src');
const paginas = path.join(raiz, 'public');

/* A ordem é a cascata. Um arquivo só, e não três, porque o navegador
   aplica cada folha assim que ela chega: com três, existe um instante
   em que components.css já valeu e responsive.css ainda não, e a
   página inteira se desloca quando o segundo corrige o primeiro. */
const CSS = ['global.css', 'components.css', 'responsive.css'];

/* Ordem de dependência: config e loja primeiro, main por último. */
const JS = ['config.js', 'loja.js', 'modal.js', 'carrinho.js', 'checkout.js', 'cardapio.js', 'main.js'];

const AVISO = '/* Gerado por `npm run build` a partir de src/. Não edite este arquivo. */\n';
const INICIO = '<!-- CRITICO:INICIO -->';
const FIM = '<!-- CRITICO:FIM -->';

const kb = (t) => (Buffer.byteLength(t) / 1024).toFixed(1) + ' KB';

async function minificar(codigo, loader) {
  const r = await esbuild.transform(codigo, {
    loader,
    minify: true,
    /* esnext = não traduzir sintaxe, só encurtar. O código-fonte é o
       mesmo que já roda nos navegadores hoje; pedir um alvo antigo
       faria o esbuild reescrever sintaxe moderna e mudar o
       comportamento sem necessidade. */
    target: 'esnext',
    legalComments: 'none'
  });
  return r.code;
}

async function main() {
  /* ---------- CSS ---------- */
  const cssBruto = CSS.map(f => fs.readFileSync(path.join(src, 'css', f), 'utf8')).join('\n');
  const css = await minificar(cssBruto, 'css');
  fs.mkdirSync(path.join(paginas, 'css'), { recursive: true });
  fs.writeFileSync(path.join(paginas, 'css', 'site.css'), AVISO + css);
  console.log(`css/site.css   ${kb(cssBruto)} -> ${kb(css)}`);

  /* ---------- JS ---------- */
  const jsBruto = JS.map(f => fs.readFileSync(path.join(src, 'js', f), 'utf8')).join('\n;\n');
  const js = await minificar(jsBruto, 'js');
  fs.mkdirSync(path.join(paginas, 'js'), { recursive: true });
  fs.writeFileSync(path.join(paginas, 'js', 'site.js'), AVISO + js);
  console.log(`js/site.js     ${kb(jsBruto)} -> ${kb(js)}`);

  /* ---------- CSS crítico, colado no <head> ---------- */
  const critico = await minificar(fs.readFileSync(path.join(raiz, 'modelos', 'critico.css'), 'utf8'), 'css');

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
  console.log(`crítico inline ${kb(critico)} em ${tocados} página(s)`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
