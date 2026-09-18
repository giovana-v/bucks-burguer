# Buck's Burguer

Site de uma hamburgueria: cardápio, carrinho e pedido finalizado pelo WhatsApp.

🔗 **[bucks-burguer.pages.dev](https://bucks-burguer.pages.dev)**

![Buck's Burguer](public/assets/images/produtos/the-king-800.webp)

---

## Sobre o projeto

Projeto **feito com inteligência artificial, para fins educacionais**.

A hamburgueria **Buck's Burguer** foi usada apenas como referência para a
criação do site. Não é um site oficial e não tem ligação com o
estabelecimento.

Tudo aqui é demonstração: o número de WhatsApp não existe, nenhum pedido é
enviado para ninguém e a loja aparece como aberta a qualquer hora.

---

## Como funciona

Site estático — HTML, CSS e JavaScript puros, sem framework e sem build.
Basta abrir os arquivos de `public/` em qualquer servidor.

```
src/css/ src/js/   o código que você edita
public/            o site publicado (css/site.css e js/site.js são gerados)
  data/            produtos.json — o cardápio
  assets/          imagens e fontes
modelos/           CSS crítico
ferramentas/       scripts de build (CSS+JS, fotos, fontes)
fotos-originais/   fotos antes de virarem WebP
fontes-originais/  fontes antes de serem reduzidas
tests/             testes das regras de negócio
```

**Edite em `src/`, nunca em `public/css/site.css` ou `public/js/site.js`** —
esses dois são gerados e sobrescritos a cada `npm run build`.

O cardápio inteiro vem de `public/data/produtos.json` e os dados da loja
(contato, endereço, horário, entrega) de `public/js/config.js`. Para mudar
preço, produto ou telefone, não se mexe em HTML.

---

## Rodando

```bash
npm install          # só as ferramentas de autoria
npm test             # testes das regras de negócio
npx serve public     # abre o site localmente
```

### Adicionar a foto de um produto

1. Salve a foto em `fotos-originais/` com o nome do produto
   (ex.: `smoky-bacon.jpg`)
2. `npm run fotos` — gera WebP 4:3 em 400px e 800px
3. Aponte o campo `imagem` do produto em `produtos.json` para o arquivo
   `-800.webp` gerado

### Editar CSS ou JavaScript

O build junta e minifica `src/css/` num `public/css/site.css` e `src/js/`
num `public/js/site.js`, e cola `modelos/critico.css` dentro do `<head>`
de cada página para a primeira tela aparecer sem esperar download.
Depois de editar qualquer coisa em `src/`:

```bash
npm run build
```

### Trocar uma fonte

Ponha o `.woff2` original em `fontes-originais/` e rode `npm run fontes`.
O script corta os caracteres que o site não usa e fixa o eixo de peso
das fontes decorativas — as seis fontes caem de 257 KB para 86 KB.

---

## Publicando

```bash
npm run publicar
```

Roda os testes e publica no Cloudflare Pages.

---

## Créditos

Fotos dos produtos e do banner: bancos de imagem gratuitos.
Fontes: Anton, Montserrat e Caveat (Google Fonts, servidas localmente).
