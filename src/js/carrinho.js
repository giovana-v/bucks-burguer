/* CARRINHO — itens, totais, painel lateral e persistência no navegador. */

const Carrinho = (() => {
  const CHAVE = 'bucks:carrinho:v2';
  let itens = [];

  function carregar() {
    try {
      const bruto = JSON.parse(localStorage.getItem(CHAVE));
      itens = Array.isArray(bruto) ? bruto.map(normalizarItem).filter(Boolean) : [];
    } catch (e) {
      itens = [];
    }
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(itens));
    } catch (e) { /* modo privado ou storage cheio: segue sem persistir */ }
  }

  function normalizarItem(item) {
    if (!item || item.id === undefined) return null;
    const precoCentavos = Number.isFinite(item.precoCentavos)
      ? item.precoCentavos
      : Loja.paraCentavos(item.preco);

    return {
      id: item.id,
      nome: String(item.nome || ''),
      imagem: item.imagem || '',
      precoCentavos,
      qtd: Math.max(1, Math.min(99, parseInt(item.qtd, 10) || 1)),
      adicionais: (item.adicionais || []).map(a => ({
        id: a.id,
        nome: String(a.nome || ''),
        precoCentavos: Number.isFinite(a.precoCentavos)
          ? a.precoCentavos
          : Loja.paraCentavos(a.preco)
      })),
      obs: Loja.normalizarObs(item.obs)
    };
  }

  function revalidarComCatalogo(produtos) {
    if (!Array.isArray(produtos) || !produtos.length) return { atualizados: 0, removidos: [] };

    const porId = new Map(produtos.map(p => [p.id, p]));
    let atualizados = 0;
    const removidos = [];

    for (let i = itens.length - 1; i >= 0; i--) {
      const item = itens[i];
      const produto = porId.get(item.id);
      if (!produto) {
        removidos.push(item.nome);
        itens.splice(i, 1);
        continue;
      }

      const atual = Loja.paraCentavos(produto.preco);
      if (atual !== item.precoCentavos) {
        item.precoCentavos = atual;
        atualizados++;
      }
      if (produto.nome && produto.nome !== item.nome) item.nome = produto.nome;
      if (produto.imagem) item.imagem = produto.imagem;
    }

    if (atualizados || removidos.length) {
      salvar();
      renderizar();
    }

    if (removidos.length) {
      toast(removidos.length === 1
        ? `"${removidos[0]}" saiu do cardápio e foi retirado do carrinho.`
        : `${removidos.length} itens saíram do cardápio e foram retirados.`);
    } else if (atualizados) {
      toast(atualizados === 1
        ? 'O preço de um item do seu carrinho foi atualizado.'
        : `O preço de ${atualizados} itens do seu carrinho foi atualizado.`);
    }

    return { atualizados, removidos };
  }

  /* ---------- Operações ---------- */
  function adicionar(produto, qtd = 1, adicionais = [], obs = '') {
    const novo = normalizarItem({ ...produto, qtd, adicionais, obs });
    if (!novo) return;

    const existente = itens.find(i => Loja.chaveItem(i) === Loja.chaveItem(novo));
    if (existente) existente.qtd = Math.min(99, existente.qtd + novo.qtd);
    else itens.push(novo);

    salvar();
    renderizar();
    toast(`${novo.nome} adicionado ao carrinho`);
  }

  function capturarObsPendente(indice) {
    const lista = document.getElementById('carrinhoLista');
    const campo = lista?.children[indice]?.querySelector('.obs-inline__campo');
    const item = itens[indice];
    if (!campo || !item) return;

    const nova = Loja.normalizarObs(campo.value);
    if (nova !== item.obs) item.obs = nova;
  }

  function alterarQtd(indice, delta) {
    capturarObsPendente(indice);
    const item = itens[indice];
    if (!item) return;

    const nova = item.qtd + delta;
    if (nova <= 0) itens.splice(indice, 1);
    else item.qtd = Math.min(99, nova);

    salvar();
    renderizar();
  }

  function definirObs(indice, texto) {
    const item = itens[indice];
    if (!item) return false;

    const nova = Loja.normalizarObs(texto);
    if (nova === item.obs) return false;

    item.obs = nova;
    salvar();

    atualizarItemNaTela(indice);
    return false;
  }

  function fundirDuplicados() {
    const porChave = new Map();
    let mudou = false;

    for (const item of itens) {
      const chave = Loja.chaveItem(item);
      const existente = porChave.get(chave);
      if (existente) {
        existente.qtd = Math.min(99, existente.qtd + item.qtd);
        mudou = true;
      } else {
        porChave.set(chave, item);
      }
    }

    if (mudou) itens = [...porChave.values()];
    return mudou;
  }

  function atualizarItemNaTela(indice) {
    const lista = document.getElementById('carrinhoLista');
    const raiz = lista?.children[indice];
    const item = itens[indice];
    if (!raiz || !item) return;

    const preco = raiz.querySelector('.item-carrinho__preco');
    if (preco) preco.textContent = Loja.formatarMoeda(Loja.precoItem(item));

    const salvarBtn = raiz.querySelector('.obs-inline__salvar');
    if (salvarBtn) salvarBtn.hidden = true;

    renderizarResumo();
  }

  function remover(indice) {
    itens.splice(indice, 1);
    salvar();
    renderizar();
  }

  function limpar() {
    itens = [];
    salvar();
    renderizar();  }

  function limparComConfirmacao() {
    if (vazio()) return;
    const qtd = quantidade();
    const pergunta = qtd === 1
      ? 'Remover o item do carrinho?'
      : `Remover os ${qtd} itens do carrinho?`;
    if (!window.confirm(pergunta)) return;

    limpar();
    toast('Carrinho esvaziado.');
  }

  const listar = () => itens.map(i => ({ ...i }));
  const quantidade = () => itens.reduce((s, i) => s + i.qtd, 0);
  const vazio = () => itens.length === 0;

  /* ---------- Render ---------- */
  function renderizar() {
    if (fundirDuplicados()) salvar();

    const lista = document.getElementById('carrinhoLista');
    const contador = document.getElementById('carrinhoContador');

    if (contador) {
      contador.textContent = String(quantidade());
      contador.hidden = quantidade() === 0;
    }

    renderizarResumo();

    if (!lista) return;
    lista.textContent = '';

    if (!itens.length) {
      const p = document.createElement('p');
      p.className = 'carrinho__vazio';
      p.textContent = 'Seu carrinho está vazio. Escolha um burger no cardápio para começar.';
      lista.appendChild(p);
      return;
    }

    itens.forEach((item, i) => lista.appendChild(montarItem(item, i)));
  }

  function montarItem(item, i) {
    const raiz = document.createElement('div');
    raiz.className = 'item-carrinho';

    raiz.appendChild(montarFoto(item));

    const corpo = document.createElement('div');
    corpo.className = 'item-carrinho__corpo';

    const nome = document.createElement('p');
    nome.className = 'item-carrinho__nome';
    nome.textContent = item.nome;    corpo.appendChild(nome);

    if (item.adicionais.length) {
      const extras = document.createElement('p');
      extras.className = 'item-carrinho__extras';
      extras.textContent = `+ ${item.adicionais.map(a => a.nome).join(', ')}`;
      corpo.appendChild(extras);
    }

    const preco = document.createElement('p');
    preco.className = 'item-carrinho__preco';
    preco.textContent = Loja.formatarMoeda(Loja.precoItem(item));
    corpo.appendChild(preco);

    const qtdBox = document.createElement('div');
    qtdBox.className = 'item-carrinho__qtd';
    qtdBox.append(
      botao('−', 'menos', i, `Diminuir quantidade de ${item.nome}`),
      texto('span', String(item.qtd)),
      botao('+', 'mais', i, `Aumentar quantidade de ${item.nome}`)
    );
    corpo.appendChild(qtdBox);

    corpo.appendChild(montarObs(item, i));
    raiz.appendChild(corpo);

    const remover = botao('×', 'remover', i, `Remover ${item.nome} do carrinho`);
    remover.className = 'item-carrinho__remover';
    raiz.appendChild(remover);

    return raiz;
  }

  function montarFoto(item) {
    const placeholder = () => {
      const div = document.createElement('div');
      div.className = 'ph item-carrinho__foto';
      div.setAttribute('data-label', 'IMG');
      div.setAttribute('aria-hidden', 'true');
      return div;
    };

    if (!item.imagem) return placeholder();

    const img = document.createElement('img');
    img.className = 'item-carrinho__foto';
    img.src = item.imagem;
    img.alt = item.nome;
    img.width = 68;
    img.height = 68;    img.loading = 'lazy';
    img.decoding = 'async';

    img.addEventListener('error', () => img.replaceWith(placeholder()), { once: true });

    return img;
  }

  function montarObs(item, i) {
    const box = document.createElement('div');
    box.className = 'obs-inline';

    const idCampo = `obs-item-${i}`;
    const label = document.createElement('label');
    label.className = 'obs-inline__label';
    label.setAttribute('for', idCampo);
    label.textContent = `Observação para ${item.nome}`;

    const campo = document.createElement('textarea');
    campo.id = idCampo;
    campo.className = 'obs-inline__campo';
    campo.rows = 2;
    campo.maxLength = Loja.LIMITE_OBS;
    campo.placeholder = 'Ex.: sem cebola — alergia a castanhas';
    campo.value = item.obs;    campo.dataset.i = String(i);

    const rodape = document.createElement('div');
    rodape.className = 'obs-inline__rodape';

    const contador = document.createElement('span');
    contador.className = 'obs-inline__contador';
    contador.setAttribute('aria-live', 'polite');
    const atualizarContador = () => {
      contador.textContent = `${campo.value.length}/${Loja.LIMITE_OBS}`;
    };
    atualizarContador();

    const salvarBtn = document.createElement('button');
    salvarBtn.type = 'button';
    salvarBtn.className = 'obs-inline__salvar';
    salvarBtn.textContent = 'Salvar observação';
    salvarBtn.hidden = true;

    campo.addEventListener('input', () => {
      atualizarContador();
      salvarBtn.hidden = Loja.normalizarObs(campo.value) === item.obs;
    });
    campo.addEventListener('blur', () => definirObs(i, campo.value));
    salvarBtn.addEventListener('mousedown', (e) => e.preventDefault());    salvarBtn.addEventListener('click', () => definirObs(i, campo.value));

    rodape.append(contador, salvarBtn);
    box.append(label, campo, rodape);
    return box;
  }

  function botao(rotulo, acao, i, aria) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = rotulo;
    b.dataset.acao = acao;
    b.dataset.i = String(i);
    b.setAttribute('aria-label', aria);
    return b;
  }

  function texto(tag, conteudo) {
    const el = document.createElement(tag);
    el.textContent = conteudo;
    return el;
  }

  function renderizarResumo() {
    const box = document.getElementById('carrinhoResumo');
    const finalizar = document.getElementById('carrinhoFinalizar');
    const aviso = document.getElementById('carrinhoAviso');
    if (!box) return;

    const totais = Loja.calcularTotais(itens, BUSINESS_CONFIG, { tipoPedido: null });
    const estado = Loja.estaAberto(BUSINESS_CONFIG.businessHours);

    box.textContent = '';
    box.appendChild(linhaResumo('Subtotal', Loja.formatarMoeda(totais.subtotal)));

    if (totais.minimo !== null && !totais.atingiuMinimo) {
      const falta = linhaResumo(
        'Falta para o pedido mínimo',
        Loja.formatarMoeda(totais.faltaParaMinimo)
      );
      falta.classList.add('resumo__linha--alerta');
      box.appendChild(falta);
    }

    box.appendChild(linhaResumo('Taxa de entrega', 'calculada na finalização', true));

    const total = linhaResumo('Total', Loja.formatarMoeda(totais.subtotal));
    total.classList.add('resumo__linha--total');
    box.appendChild(total);

    const bloqueios = [];
    if (vazio()) bloqueios.push('Adicione ao menos um item.');
    if (!estado.aberto) {
      bloqueios.push(estado.proximaAbertura
        ? `${estado.motivo} Abrimos ${estado.proximaAbertura}.`
        : estado.motivo);
    }
    if (!totais.atingiuMinimo) {
      bloqueios.push(`Pedido mínimo de ${Loja.formatarMoeda(totais.minimo)}.`);
    }

    if (aviso) {
      aviso.textContent = bloqueios.join(' ');
      aviso.hidden = bloqueios.length === 0;
    }
    if (finalizar) finalizar.disabled = bloqueios.length > 0;

    const limparBtn = document.getElementById('carrinhoLimpar');
    if (limparBtn) limparBtn.hidden = vazio();
  }

  function linhaResumo(rotulo, valor, suave = false) {
    const linha = document.createElement('div');
    linha.className = 'resumo__linha';
    if (suave) linha.classList.add('resumo__linha--suave');
    linha.append(texto('span', rotulo), texto('strong', valor));
    return linha;
  }

  /* ---------- Drawer ---------- */
  function abrir() {
    const drawer = document.getElementById('carrinhoDrawer');
    if (!drawer) return;
    drawer.classList.add('aberto');
    drawer.removeAttribute('inert');
    drawer.setAttribute('aria-hidden', 'false');
    document.getElementById('overlay')?.classList.add('ativo');
    document.body.classList.add('modal-aberto');
    document.getElementById('carrinhoFechar')?.focus();
  }

  function fechar() {
    const drawer = document.getElementById('carrinhoDrawer');
    if (!drawer) return;
    drawer.classList.remove('aberto');
    drawer.setAttribute('inert', '');
    drawer.setAttribute('aria-hidden', 'true');
    document.getElementById('overlay')?.classList.remove('ativo');
    document.body.classList.remove('modal-aberto');
    document.getElementById('carrinhoAbrir')?.focus();
  }

  const estaAberto = () => document.getElementById('carrinhoDrawer')?.classList.contains('aberto');

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add('visivel'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visivel'), 2800);
  }

  /* ---------- Eventos ---------- */
  function iniciar() {
    carregar();

    const drawer = document.getElementById('carrinhoDrawer');
    if (drawer) {
      drawer.setAttribute('inert', '');
      drawer.setAttribute('aria-hidden', 'true');
    }

    renderizar();

    document.getElementById('carrinhoAbrir')?.addEventListener('click', abrir);
    document.getElementById('carrinhoFechar')?.addEventListener('click', fechar);
    document.getElementById('carrinhoLimpar')?.addEventListener('click', limparComConfirmacao);
    document.getElementById('overlay')?.addEventListener('click', fechar);

    document.getElementById('carrinhoLista')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-acao]');
      if (!btn) return;
      const i = Number(btn.dataset.i);
      if (btn.dataset.acao === 'mais') alterarQtd(i, 1);
      if (btn.dataset.acao === 'menos') alterarQtd(i, -1);
      if (btn.dataset.acao === 'remover') remover(i);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && estaAberto()) fechar();
    });

    setInterval(renderizarResumo, 60000);
  }

  return {
    iniciar, adicionar, alterarQtd, definirObs, remover, limpar, revalidarComCatalogo,
    limparComConfirmacao, listar, quantidade, vazio, abrir, fechar,
    renderizar, toast
  };
})();

document.addEventListener('DOMContentLoaded', Carrinho.iniciar);
