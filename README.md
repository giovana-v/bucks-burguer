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
public/         o site publicado
  css/ js/      estilos e scripts
  data/         produtos.json — o cardápio
  assets/       imagens e fontes
modelos/        CSS crítico e modelo do sitemap
ferramentas/    scripts de build (CSS e fotos)
fotos-originais/ fotos antes de virarem WebP
tests/          testes das regras de negócio
```

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

### Editar o CSS

As três folhas de `public/css/` viram um `site.css` só, e
`modelos/critico.css` é colado dentro do `<head>` de cada página para a
primeira tela aparecer sem esperar download. Depois de editar qualquer
CSS:

```bash
npm run build
```

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
