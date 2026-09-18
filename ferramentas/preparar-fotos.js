#!/usr/bin/env node
/* Converte fotos-originais/ em WebP 4:3 nas larguras 400 e 800. Rodar: npm run fotos */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const raiz = path.resolve(__dirname, '..');
const origem = path.join(raiz, 'fotos-originais');
const destino = path.join(raiz, 'public', 'assets', 'images', 'produtos');

const LARGURAS = [400, 800];
const PROPORCAO = 4 / 3;
const QUALIDADE = 80;

const ACEITAS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif', '.tif', '.tiff']);

async function main() {
  if (!fs.existsSync(origem)) {
    console.error(`Pasta ${path.relative(raiz, origem)} não existe. Crie-a e ponha as fotos lá.`);
    process.exit(1);
  }
  fs.mkdirSync(destino, { recursive: true });

  const arquivos = fs.readdirSync(origem)
    .filter(f => ACEITAS.has(path.extname(f).toLowerCase()));

  if (!arquivos.length) {
    console.log('Nenhuma foto em fotos-originais/. Nada a fazer.');
    return;
  }

  for (const arquivo of arquivos) {
    const slug = path.basename(arquivo, path.extname(arquivo));
    const entrada = path.join(origem, arquivo);
    const meta = await sharp(entrada).metadata();

    for (const largura of LARGURAS) {
      const altura = Math.round(largura / PROPORCAO);
      const saida = path.join(destino, `${slug}-${largura}.webp`);

      await sharp(entrada)
        .resize(largura, altura, { fit: 'cover', position: sharp.strategy.attention })
        .webp({ quality: QUALIDADE, effort: 6 })
        .toFile(saida);

      const kb = (fs.statSync(saida).size / 1024).toFixed(0);
      console.log(`  ${path.relative(raiz, saida)}  ${largura}x${altura}  ${kb} KB`);
    }

    console.log(`${slug}: original ${meta.width}x${meta.height} (${meta.format}) → 2 arquivos\n`);
  }

  console.log('Pronto. Confira se produtos.json aponta para <slug>-800.webp.');
}

main().catch(e => { console.error(e.message); process.exit(1); });
