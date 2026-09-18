/* CARDÁPIO — carrega produtos.json e monta cards, filtros e página de produto. */

const Cardapio = (() => {
  let dados = { produtos: [], categorias: [], adicionais: [] };
  let filtroAtual = 'todos';
  let termoBusca = '';

  const moeda = (centavos) => Loja.formatarMoeda(centavos);
  const centavos = (p) => Loja.paraCentavos(p);

  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  /* ---------- Carregamento ---------- */
  async function carregar() {
    try {
      const resp = await fetch('data/produtos.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      dados = await resp.json();
      return true;
    } catch (e) {
      console.error('Falha ao carregar produtos.json', e);
      ['gradeProdutos', 'trilhoSemana', 'produtoDetalhe'].forEach(id => {
        definirEstado(id,
          'Não foi possível carregar o cardápio. Tente novamente.',
          ' <button type="button" class="btn btn--pequeno" onclick="location.reload()">Recarregar</button>');
      });
      return false;
    }
  }

  const acharProduto = (id) => dados.produtos.find(p => p.id === id);

  function definirEstado(id, mensagem, acao = '') {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    alvo.setAttribute('aria-busy', 'false');
    if (mensagem) {
      alvo.innerHTML = `<p class="estado-vazio">${mensagem}${acao}</p>`;
    }
  }

  /* ---------- Alérgenos (fonte única: Loja.lerAlergenos) ---------- */
  function htmlAlergenos(produto, compacto = false) {
    const a = Loja.lerAlergenos(produto);

    if (!a.informado) return '';

    const classe = a.informado
      ? (a.lista.length ? 'alergenos--contem' : 'alergenos--limpo')
      : 'alergenos--desconhecido';

    const icone = a.informado && !a.lista.length ? '✓' : 'ⓘ';

    const cruzada = a.contaminacaoCruzada && !compacto
      ? `<p class="alergenos__cruzada"><span aria-hidden="true">⚠</span>
           Consulte a equipe sobre contaminação cruzada</p>`
      : '';

    return `
      <div class="alergenos ${classe}">
        <p class="alergenos__linha">
          <span class="alergenos__icone" aria-hidden="true">${icone}</span>
          <span>${esc(a.texto)}</span>
        </p>
        ${cruzada}
      </div>`;
  }

  function htmlFoto(p, sizes, prioridade = false) {
    if (!p.imagem) {
      return `<div class="ph" data-label="Foto&#10;${esc(p.nome)}"></div>`;
    }

    const menor = p.imagem.replace(/-800\.webp$/, '-400.webp');
    const srcset = menor === p.imagem
      ? ''
      : ` srcset="${esc(menor)} 400w, ${esc(p.imagem)} 800w" sizes="${esc(sizes)}"`;

    return `<img class="foto-produto" src="${esc(p.imagem)}"${srcset}
                 width="800" height="600"
                 alt="${esc(p.nome)}"
                 ${prioridade ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }

  /* ---------- Card de produto ---------- */
  function templateCard(p) {
    const preco = centavos(p.preco);
    const tag = p.tag
      ? `<span class="card__tag card__tag--${esc(p.tagCor || 'vermelho')}">${esc(p.tag)}</span>`
      : '';

    return `
      <article class="card" data-categoria="${esc(p.categoria)}">
        <a class="card__midia" href="/produto?id=${p.id}" aria-label="Ver detalhes de ${esc(p.nome)}">
          ${tag}
          ${htmlFoto(p, '(max-width: 640px) 100vw, (max-width: 1100px) 45vw, 300px')}
        </a>
        <div class="card__corpo">
          <h3 class="card__titulo">
            <a href="/produto?id=${p.id}">${esc(p.nome)}</a>
          </h3>
          <p class="card__desc">${esc(p.descricao)}</p>
          ${htmlAlergenos(p, true)}
          <div class="card__rodape">
            <span class="card__preco">
              ${moeda(preco)}
              ${p.precoAntigo ? `<small><s>${moeda(centavos(p.precoAntigo))}</s></small>` : ''}
            </span>
            <button class="card__add" type="button" data-produto="${p.id}"
                    aria-label="Personalizar e adicionar ${esc(p.nome)} ao carrinho">+</button>
          </div>
        </div>
      </article>`;
  }

  /* ---------- Grade do cardápio ---------- */
  function filtrar() {
    const termo = termoBusca.toLowerCase().trim();
    return dados.produtos.filter(p => {
      const okCategoria = filtroAtual === 'todos' || p.categoria === filtroAtual;
      const okBusca = !termo ||
        p.nome.toLowerCase().includes(termo) ||
        p.descricao.toLowerCase().includes(termo);
      return okCategoria && okBusca;
    });
  }

  function renderizarGrade() {
    const grade = document.getElementById('gradeProdutos');
    if (!grade) return;

    grade.setAttribute('aria-busy', 'false');

    if (!dados.produtos.length) {
      grade.innerHTML = '<p class="estado-vazio">Nenhum produto disponível no momento.</p>';
      const contadorVazio = document.getElementById('contadorProdutos');
      if (contadorVazio) contadorVazio.textContent = '';
      return;
    }

    const lista = filtrar();
    grade.innerHTML = lista.length
      ? lista.map(templateCard).join('')
      : `<p class="estado-vazio">Nenhum item encontrado para essa busca.</p>`;

    const contador = document.getElementById('contadorProdutos');
    if (contador) contador.textContent = `${lista.length} ${lista.length === 1 ? 'item' : 'itens'}`;
  }

  /* ---------- Carrossel da semana ---------- */
  const DIAS = ['Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  function renderizarSemana() {
    const trilho = document.getElementById('trilhoSemana');
    if (!trilho) return;

    const burgers = dados.produtos.filter(p => p.categoria === 'burgers').slice(0, DIAS.length);

    trilho.setAttribute('aria-busy', 'false');

    if (!burgers.length) {
      trilho.innerHTML = '<p class="estado-vazio">Nenhum produto disponível no momento.</p>';
      return;
    }

    trilho.innerHTML = burgers.map((p, i) => `
      <div class="dia">
        <span class="dia__rotulo">${DIAS[i]}</span>
        <div class="dia__card">
          <a href="/produto?id=${p.id}" aria-label="Ver detalhes de ${esc(p.nome)}">
            ${htmlFoto(p, '(max-width: 640px) 78vw, (max-width: 1100px) 45vw, 300px')}
          </a>
          <h3 class="dia__nome">${esc(p.nome)}</h3>
          <p class="dia__desc">${esc(p.ingredientes.slice(0, 4).join(', '))}</p>
          <button class="dia__preco card__add" type="button" data-produto="${p.id}"
                  aria-label="Personalizar e adicionar ${esc(p.nome)} — ${moeda(centavos(p.preco))}">
            ${moeda(centavos(p.preco))}
          </button>
        </div>
      </div>`).join('');

    document.dispatchEvent(new CustomEvent('carrossel:pronto'));
  }

  /* ---------- Filtros e busca ---------- */
  function renderizarFiltros() {
    const box = document.getElementById('filtros');
    if (!box) return;

    box.innerHTML = dados.categorias.map(c => `
      <button class="filtro ${c.id === filtroAtual ? 'ativo' : ''}" type="button"
              data-cat="${esc(c.id)}" aria-pressed="${c.id === filtroAtual}">
        ${esc(c.nome)}
      </button>`).join('');

    box.addEventListener('click', (e) => {
      const btn = e.target.closest('.filtro');
      if (!btn) return;
      filtroAtual = btn.dataset.cat;
      box.querySelectorAll('.filtro').forEach(b => {
        const ativo = b === btn;
        b.classList.toggle('ativo', ativo);
        b.setAttribute('aria-pressed', String(ativo));
      });
      renderizarGrade();
    });
  }

  function iniciarBusca() {
    const input = document.getElementById('buscaInput');
    if (!input) return;

    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        termoBusca = input.value;
        renderizarGrade();
      }, 220);
    });
  }

  /* ---------- Página de produto ---------- */
  function renderizarProduto() {
    const box = document.getElementById('produtoDetalhe');
    if (!box) return;

    box.setAttribute('aria-busy', 'false');

    const parametro = new URLSearchParams(location.search).get('id');
    const p = acharProduto(Number(parametro));

    if (!p) {
      box.innerHTML = `
        <div class="estado-vazio estado-vazio--pagina">
          <h2>Produto não encontrado</h2>
          <p>O item que você procura não está mais no cardápio ou o link está incorreto.</p>
          <a class="btn btn--primario" href="/cardapio">Ver o cardápio</a>
        </div>`;
      const titulo = document.getElementById('tituloPagina');
      if (titulo) titulo.textContent = 'Produto não encontrado';
      const migalha = document.getElementById('migalhaProduto');
      if (migalha) migalha.textContent = 'Não encontrado';
      document.title = "Produto não encontrado — Buck's Burguer";
      return;
    }

    document.title = `${p.nome} — Buck's Burguer`;
    const titulo = document.getElementById('tituloPagina');
    if (titulo) titulo.textContent = p.nome;
    const migalha = document.getElementById('migalhaProduto');
    if (migalha) migalha.textContent = p.nome;

    const categoria = dados.categorias.find(c => c.id === p.categoria)?.nome || p.categoria;

    box.innerHTML = `
      <div class="produto__galeria">
        <!-- Uma foto por produto. A fileira de miniaturas que existia
             aqui apontava para quatro arquivos que nunca chegaram a
             ser fotografados: quatro placeholders idênticos embaixo da
             foto de verdade só ocupavam a tela sem mostrar nada. Volta
             quando houver um segundo ângulo para mostrar. -->
        <div class="produto__principal">
          ${htmlFoto(p, '(max-width: 1024px) 100vw, 560px', true)}
        </div>
      </div>

      <div class="produto__info">
        <span class="produto__categoria">${esc(categoria)}</span>
        <h2>${esc(p.nome)}</h2>
        <p class="produto__desc">${esc(p.descricao)}</p>
        <p class="produto__preco">
          ${moeda(centavos(p.preco))}
          ${p.precoAntigo ? `<small>${moeda(centavos(p.precoAntigo))}</small>` : ''}
        </p>

        <div class="produto__bloco">
          <h3>Ingredientes</h3>
          <div class="ingredientes">
            ${p.ingredientes.map(i => `<span class="ingrediente">${esc(i)}</span>`).join('')}
          </div>
        </div>

        ${Loja.lerAlergenos(p).informado ? `
        <div class="produto__bloco">
          <h3>Alérgenos</h3>
          ${htmlAlergenos(p)}
        </div>` : ''}

        <div class="produto__bloco">
          <h3>Turbine seu pedido</h3>
          <div class="adicionais" id="adicionais">
            ${dados.adicionais.map(a => `
              <label class="adicional">
                <input type="checkbox" value="${esc(a.id)}"
                       data-centavos="${centavos(a.preco)}" data-nome="${esc(a.nome)}">
                <span>${esc(a.nome)}</span>
                <span>+ ${moeda(centavos(a.preco))}</span>
              </label>`).join('')}
          </div>
        </div>

        <div class="produto__bloco">
          <h3>Observações</h3>
          <div class="campo">
            <label for="produtoObs" class="obs-ajuda">
              Alguma restrição, alergia ou ingrediente que devemos tirar?
            </label>
            <textarea id="produtoObs" class="obs-campo" maxlength="${Loja.LIMITE_OBS}" rows="3"
                      placeholder="Ex.: sem cebola, sem picles — alergia a castanhas"></textarea>
            <span class="obs-contador"><span id="obsContador">0</span>/${Loja.LIMITE_OBS}</span>
          </div>
        </div>

        <div class="produto__bloco">
          <div class="produto__compra">
            <div class="seletor-qtd">
              <button type="button" id="qtdMenos" aria-label="Diminuir quantidade">−</button>
              <input type="text" id="qtdValor" value="1" inputmode="numeric" aria-label="Quantidade">
              <button type="button" id="qtdMais" aria-label="Aumentar quantidade">+</button>
            </div>
            <button class="btn btn--primario" type="button" id="btnAdicionar">
              Adicionar — <span id="precoTotal">${moeda(centavos(p.preco))}</span>
            </button>
          </div>
        </div>
      </div>`;

    ligarProduto(p);
    renderizarRelacionados(p);
  }

  function ligarProduto(p) {
    const qtdEl = document.getElementById('qtdValor');
    const totalEl = document.getElementById('precoTotal');
    const obsEl = document.getElementById('produtoObs');
    const obsContador = document.getElementById('obsContador');
    const checks = [...document.querySelectorAll('#adicionais input')];

    const qtd = () => Math.max(1, Math.min(99, parseInt(qtdEl.value, 10) || 1));
    const escolhidos = () => checks.filter(c => c.checked).map(c => ({
      id: c.value, nome: c.dataset.nome, precoCentavos: Number(c.dataset.centavos)
    }));

    const atualizar = () => {
      const extras = escolhidos().reduce((s, a) => s + a.precoCentavos, 0);
      totalEl.textContent = moeda((centavos(p.preco) + extras) * qtd());
    };

    document.getElementById('qtdMenos').addEventListener('click', () => {
      qtdEl.value = Math.max(1, qtd() - 1); atualizar();
    });
    document.getElementById('qtdMais').addEventListener('click', () => {
      qtdEl.value = Math.min(99, qtd() + 1); atualizar();
    });
    qtdEl.addEventListener('input', () => {
      qtdEl.value = qtdEl.value.replace(/\D/g, '').slice(0, 2);
      atualizar();
    });
    checks.forEach(c => c.addEventListener('change', atualizar));

    obsEl.addEventListener('input', () => {
      obsContador.textContent = String(obsEl.value.length);
    });

    document.getElementById('btnAdicionar').addEventListener('click', () => {
      Carrinho.adicionar(
        { id: p.id, nome: p.nome, precoCentavos: centavos(p.preco), imagem: p.imagem },
        qtd(), escolhidos(), obsEl.value
      );
      Carrinho.abrir();
    });

  }

  function renderizarRelacionados(p) {
    const grade = document.getElementById('gradeRelacionados');
    if (!grade) return;

    const mesmaCategoria = dados.produtos.filter(x => x.categoria === p.categoria && x.id !== p.id);
    const lista = (mesmaCategoria.length ? mesmaCategoria : dados.produtos.filter(x => x.id !== p.id)).slice(0, 4);
    grade.innerHTML = lista.map(templateCard).join('');
  }

  let dialogRapido = null;
  let produtoAtual = null;

  function montarModalRapido() {
    if (dialogRapido) return;

    dialogRapido = document.createElement('dialog');
    dialogRapido.id = 'modalProduto';
    dialogRapido.className = 'dialogo dialogo--produto';
    dialogRapido.setAttribute('aria-labelledby', 'modalProdutoTitulo');
    dialogRapido.innerHTML = `
      <div class="dialogo__caixa">
        <header class="dialogo__topo">
          <h2 id="modalProdutoTitulo" class="dialogo__titulo"></h2>
          <button type="button" class="dialogo__fechar" data-fechar aria-label="Fechar sem adicionar">×</button>
        </header>

        <div class="dialogo__corpo">
          <p class="dialogo__desc" id="modalProdutoDesc"></p>
          <div id="modalProdutoAlergenos"></div>

          <div class="campo">
            <label for="modalObs">Observação <small>(opcional)</small></label>
            <textarea id="modalObs" rows="3" maxlength="${Loja.LIMITE_OBS}"
                      placeholder="Ex.: sem cebola — alergia a castanhas"></textarea>
            <span class="obs-contador"><span id="modalObsContador">0</span>/${Loja.LIMITE_OBS}</span>
          </div>
        </div>

        <footer class="dialogo__rodape">
          <div class="seletor-qtd">
            <button type="button" id="modalQtdMenos" aria-label="Diminuir quantidade">−</button>
            <input type="text" id="modalQtd" value="1" inputmode="numeric" aria-label="Quantidade">
            <button type="button" id="modalQtdMais" aria-label="Aumentar quantidade">+</button>
          </div>
          <button type="button" class="btn btn--primario" id="modalAdicionar">
            Adicionar — <span id="modalTotal"></span>
          </button>
        </footer>
      </div>`;

    document.body.appendChild(dialogRapido);
    Modal.preparar(dialogRapido);
    ligarModalRapido();
  }

  function ligarModalRapido() {
    const qtdEl = dialogRapido.querySelector('#modalQtd');
    const obsEl = dialogRapido.querySelector('#modalObs');
    const totalEl = dialogRapido.querySelector('#modalTotal');
    const contador = dialogRapido.querySelector('#modalObsContador');

    const qtd = () => Math.max(1, Math.min(99, parseInt(qtdEl.value, 10) || 1));
    const atualizar = () => {
      if (!produtoAtual) return;
      totalEl.textContent = moeda(centavos(produtoAtual.preco) * qtd());
    };

    dialogRapido.querySelector('#modalQtdMenos').addEventListener('click', () => {
      qtdEl.value = Math.max(1, qtd() - 1); atualizar();
    });
    dialogRapido.querySelector('#modalQtdMais').addEventListener('click', () => {
      qtdEl.value = Math.min(99, qtd() + 1); atualizar();
    });
    qtdEl.addEventListener('input', () => {
      qtdEl.value = qtdEl.value.replace(/\D/g, '').slice(0, 2);
      atualizar();
    });
    obsEl.addEventListener('input', () => { contador.textContent = String(obsEl.value.length); });

    dialogRapido.querySelector('#modalAdicionar').addEventListener('click', () => {
      if (!produtoAtual) return;
      Carrinho.adicionar(
        {
          id: produtoAtual.id, nome: produtoAtual.nome,
          precoCentavos: centavos(produtoAtual.preco), imagem: produtoAtual.imagem
        },
        qtd(), [], obsEl.value
      );
      Modal.fechar(dialogRapido);
    });
  }

  function abrirModalRapido(produto, gatilho) {
    montarModalRapido();
    produtoAtual = produto;

    dialogRapido.querySelector('#modalProdutoTitulo').textContent = produto.nome;
    dialogRapido.querySelector('#modalProdutoDesc').textContent = produto.descricao;
    dialogRapido.querySelector('#modalProdutoAlergenos').innerHTML = htmlAlergenos(produto);
    dialogRapido.querySelector('#modalObs').value = '';
    dialogRapido.querySelector('#modalObsContador').textContent = '0';
    dialogRapido.querySelector('#modalQtd').value = '1';
    dialogRapido.querySelector('#modalTotal').textContent = moeda(centavos(produto.preco));

    Modal.abrir(dialogRapido, { gatilho, focoInicial: '#modalObs' });
  }

  /* ---------- Botão "+" de qualquer card ---------- */
  function ligarBotoesAdd() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.card__add');
      if (!btn) return;
      const p = acharProduto(Number(btn.dataset.produto));
      if (!p) return;
      abrirModalRapido(p, btn);
    });
  }

  /* ---------- Boot ---------- */
  async function iniciar() {
    if (!(await carregar())) return;

    Carrinho.revalidarComCatalogo(dados.produtos);

    renderizarSemana();
    renderizarFiltros();
    iniciarBusca();
    renderizarGrade();
    renderizarProduto();
    ligarBotoesAdd();
  }

  return { iniciar };
})();

document.addEventListener('DOMContentLoaded', Cardapio.iniciar);
