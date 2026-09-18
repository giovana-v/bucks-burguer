/* INTERFACE GERAL — header, menu, carrossel e os dados que vêm de config.js. */

/* ---------- Header ---------- */
function iniciarHeader() {
  const header = document.querySelector('.header');
  if (!header) return;
  const atualizar = () => header.classList.toggle('rolado', window.scrollY > 40);
  atualizar();
  window.addEventListener('scroll', atualizar, { passive: true });
}

/* ---------- Menu mobile ---------- */
function iniciarMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const aberto = nav.classList.toggle('aberto');
    toggle.classList.toggle('aberto', aberto);
    toggle.setAttribute('aria-expanded', String(aberto));
  });

  nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('aberto');
      toggle.classList.remove('aberto');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---------- Link ativo na navegação ---------- */
function marcarLinkAtivo() {
  const normalizar = (caminho) => {
    const semAncora = String(caminho).split('#')[0].split('?')[0];
    const ultimo = semAncora.replace(/\/+$/, '').split('/').pop();
    return ultimo.replace(/\.html$/, '') || 'index';
  };

  const atual = normalizar(location.pathname);

  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href') || '';

    if (href.includes('#')) return;

    if (normalizar(href) === atual) {
      link.classList.add('ativo');
      link.setAttribute('aria-current', 'page');
    }
  });
}

let observadorRevelar = null;

/* ---------- Animação de entrada ---------- */
function iniciarRevelar() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.revelar').forEach(el => el.classList.add('visivel'));
    return;
  }

  observadorRevelar = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add('visivel');
      observadorRevelar.unobserve(entrada.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -60px 0px' });

  observar();
}

function observar() {
  if (!observadorRevelar) return;
  document.querySelectorAll('.revelar:not(.visivel)').forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 80}ms`;
    observadorRevelar.observe(el);
  });
}

/* ---------- Faixa corrida ---------- */
function iniciarFaixa() {
  document.querySelectorAll('.faixa__trilho').forEach(trilho => {
    trilho.insertAdjacentHTML('beforeend', trilho.innerHTML);
  });
}

/* ---------- Agenda trabalho para depois da primeira pintura ---------- */
function agendarAposPintura(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

/* ---------- Carrossel do menu da semana ---------- */
function iniciarCarrossel() {
  document.querySelectorAll('.carrossel').forEach(carrossel => {
    const trilho = carrossel.querySelector('.carrossel__trilho');
    const anterior = carrossel.querySelector('[data-carrossel="anterior"]');
    const proximo = carrossel.querySelector('[data-carrossel="proximo"]');
    if (!trilho) return;

    const passo = () => {
      const card = trilho.querySelector('.dia');
      return card ? card.offsetWidth + 24 : trilho.clientWidth * .8;
    };

    let agendado = false;
    const medirEAplicar = () => {
      agendado = false;
      const larguraRolagem = trilho.scrollWidth;      const larguraVisivel = trilho.clientWidth;      const posicao = trilho.scrollLeft;
      const fim = larguraRolagem - larguraVisivel - 2;
      if (anterior) anterior.disabled = posicao <= 2;      if (proximo) proximo.disabled = posicao >= fim;    };

    const atualizarSetas = () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(medirEAplicar);
    };

    anterior?.addEventListener('click', () => trilho.scrollBy({ left: -passo() }));
    proximo?.addEventListener('click', () => trilho.scrollBy({ left: passo() }));
    trilho.addEventListener('scroll', atualizarSetas, { passive: true });
    window.addEventListener('resize', atualizarSetas);
    document.addEventListener('carrossel:pronto', atualizarSetas);
    atualizarSetas();
  });
}

/* ===== DADOS COMERCIAIS (vêm de js/config.js) ===== */

function renderizarStatusLoja() {
  const alvos = document.querySelectorAll('[data-status-loja]');
  if (!alvos.length) return;

  const estado = Loja.estaAberto(BUSINESS_CONFIG.businessHours);

  alvos.forEach(alvo => {
    alvo.textContent = '';
    alvo.hidden = false;    alvo.classList.toggle('status-loja--aberto', estado.aberto);
    alvo.classList.toggle('status-loja--fechado', !estado.aberto);

    const ponto = document.createElement('span');
    ponto.className = 'status-loja__ponto';
    ponto.setAttribute('aria-hidden', 'true');

    const texto = document.createElement('span');
    texto.textContent = estado.aberto ? 'Aberto agora' : 'Fechado agora';

    alvo.append(ponto, texto);

    if (!estado.aberto && estado.proximaAbertura) {
      const prox = document.createElement('small');
      prox.textContent = `Abrimos ${estado.proximaAbertura}`;
      alvo.appendChild(prox);
    }
  });
}

/* ---------- Horários ---------- */
function renderizarHorarios() {
  const alvos = document.querySelectorAll('[data-horarios]');
  if (!alvos.length) return;

  const grupos = Loja.agruparHorarios(BUSINESS_CONFIG.businessHours);

  alvos.forEach(alvo => {
    alvo.textContent = '';

    grupos.forEach(g => {
      const linha = document.createElement('p');
      linha.className = 'horario-linha';
      if (g.fechado) linha.classList.add('horario-linha--fechado');

      const nome = document.createElement('strong');
      nome.textContent = `${g.rotulo}:`;

      const valor = document.createElement('span');
      valor.textContent = g.texto;

      linha.append(nome, valor);
      alvo.appendChild(linha);
    });
  });
}

/* ---------- Endereço e mapa ---------- */
function renderizarEndereco() {
  const a = BUSINESS_CONFIG.address;
  const linha = Loja.enderecoCompleto(a);

  if (!linha) {
    document.querySelectorAll('[data-some-sem-endereco]').forEach(el => { el.hidden = true; });
    return;
  }

  document.querySelectorAll('[data-endereco]').forEach(el => {
    el.textContent = linha;
    el.classList.remove('dado-indisponivel');  });

  document.querySelectorAll('[data-endereco-bairro]').forEach(el => {
    el.textContent = [a.neighborhood, a.city].filter(Boolean).join(' — ');
  });

  const rota = Loja.urlMapa(a);
  document.querySelectorAll('[data-mapa-link]').forEach(el => {
    if (!rota) { el.hidden = true; return; }
    el.href = rota;
  });

  montarMapa(Loja.urlMapaEmbed(a));
}

/* ---------- Mapa sob demanda ----------
   O embed do Google traz ~450 KiB de JavaScript (main.js, places,
   controls, map...). Isso é mais que o site inteiro, para um mapa que
   a maioria das pessoas nem rola até ver.

   Então a página nasce com uma prévia estática, feita em CSS, e o
   iframe de verdade só entra quando alguém clica. Quem só quer o
   caminho continua tendo o link "Como chegar" logo acima, que não
   custa um byte de JavaScript. */
function montarMapa(embed) {
  const botao = document.querySelector('[data-mapa-abrir]');
  const cartao = botao?.closest('.mapa-card');
  if (!botao || !cartao) return;

  if (!embed) { cartao.remove(); return; }

  botao.hidden = false;
  cartao.hidden = false;

  const carregar = () => {
    const iframe = document.createElement('iframe');
    iframe.title = "Mapa da Buck's Burguer";
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.loading = 'lazy';
    iframe.src = embed;
    botao.replaceWith(iframe);
    /* O clique abriu o mapa; quem usa teclado esperaria continuar de
       onde estava, e o botão que tinha o foco acabou de sair do DOM. */
    iframe.focus?.();
  };

  botao.addEventListener('click', carregar, { once: true });

  /* Quando a prévia se aproxima da tela, abrimos a conexão com os
     servidores do Google por antecipação. Não baixa o mapa: só paga
     o DNS e o handshake TLS adiantado, para o clique responder logo.
     Preconnect fixo no <head> seria pior — reservaria a conexão já no
     carregamento, competindo com o que a primeira tela precisa. */
  if (!('IntersectionObserver' in window)) return;

  const observador = new IntersectionObserver((entradas, obs) => {
    if (!entradas.some(e => e.isIntersecting)) return;
    obs.disconnect();
    for (const origem of ['https://www.google.com', 'https://maps.googleapis.com', 'https://maps.gstatic.com']) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origem;
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }, { rootMargin: '400px' });

  observador.observe(cartao);
}

/* ---------- Contatos ---------- */
function renderizarContatos() {
  const c = BUSINESS_CONFIG;

  document.querySelectorAll('[data-contatos]').forEach(alvo => {
    alvo.textContent = '';
    const links = [];

    if (c.whatsapp) {
      links.push(linkContato(
        `https://wa.me/${c.whatsapp.replace(/\D/g, '')}`,
        Loja.formatarTelefone(c.whatsapp.replace(/^55/, '')),
        'WhatsApp', iconeWhatsapp()
      ));
    }
    if (c.phone) {
      links.push(linkContato(`tel:+55${c.phone.replace(/\D/g, '')}`,
        Loja.formatarTelefone(c.phone), 'Telefone', iconeTelefone()));
    }
    if (c.email && c.email.includes('@')) {
      links.push(linkContato(`mailto:${c.email}`, c.email, 'E-mail', iconeEmail()));
    }
    if (c.instagram) {
      const usuario = c.instagram.replace(/^@/, '');
      links.push(linkContato(`https://instagram.com/${usuario}`, `@${usuario}`, 'Instagram', iconeInstagram()));
    }

    if (!links.length) {
      const p = document.createElement('p');
      p.className = 'dado-indisponivel';
      p.textContent = 'Canais de contato em breve.';
      alvo.appendChild(p);
      return;
    }
    links.forEach(l => alvo.appendChild(l));
  });

  document.querySelectorAll('[data-social="instagram"]').forEach(el => {
    if (!c.instagram) { el.hidden = true; return; }
    el.href = `https://instagram.com/${c.instagram.replace(/^@/, '')}`;
  });
  document.querySelectorAll('[data-social="whatsapp"]').forEach(el => {
    if (!c.whatsapp) { el.hidden = true; return; }
    el.href = `https://wa.me/${c.whatsapp.replace(/\D/g, '')}`;
  });
}

function linkContato(href, texto, rotulo, svg) {
  const a = document.createElement('a');
  a.className = 'contato-item';
  a.href = href;
  a.setAttribute('aria-label', `${rotulo}: ${texto}`);
  if (href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
  a.innerHTML = svg;  const span = document.createElement('span');
  span.textContent = texto;  a.appendChild(span);
  return a;
}

const iconeWhatsapp = () => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 21l2.3-5.3A8.4 8.4 0 1 1 21 11.5z"/></svg>`;
const iconeTelefone = () => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>`;
const iconeEmail = () => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>`;
const iconeInstagram = () => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>`;

/* ---------- Aviso de entrega ---------- */
function renderizarAvisoEntrega() {
  const alvos = document.querySelectorAll('[data-entrega-aviso]');
  if (!alvos.length) return;

  const d = BUSINESS_CONFIG.delivery || {};
  const temRegras = (d.feeRules || []).length > 0;
  const temCoordenadas = !!(BUSINESS_CONFIG.address && BUSINESS_CONFIG.address.coords);

  alvos.forEach(alvo => {
    alvo.textContent = temRegras || temCoordenadas
      ? `Entrega gratuita para quem está a até ${d.freeRadiusKm} km da loja.`
      : 'Consulte as condições e a taxa de entrega no atendimento.';
  });
}

/* ---------- Ano no rodapé ---------- */
function atualizarAno() {
  document.querySelectorAll('[data-ano]').forEach(el => {
    el.textContent = String(new Date().getFullYear());
  });
}

/* ---------- Formulário de contato ---------- */
function iniciarFormulario() {
  const form = document.getElementById('formContato');
  if (!form) return;

  const tipoDoCampo = (input) => {
    if (input.type === 'email') return 'email';
    if (input.type === 'tel') return 'tel';
    if (input.tagName === 'TEXTAREA') return 'texto';
    return 'nome';
  };

  const validar = (campo) => {
    const input = campo.querySelector('input, textarea');
    if (!input) return true;
    const { valido, mensagem } = Loja.validarCampoContato(tipoDoCampo(input), input.value);

    const erro = campo.querySelector('.form__erro');
    if (erro) erro.textContent = mensagem;    campo.classList.toggle('invalido', !valido);
    input.setAttribute('aria-invalid', String(!valido));

    return valido;
  };

  const limparErro = (campo) => {
    const erro = campo.querySelector('.form__erro');
    if (erro) erro.textContent = '';
    campo.classList.remove('invalido');
    campo.querySelector('input, textarea')?.removeAttribute('aria-invalid');
  };

  form.querySelectorAll('.campo').forEach(campo => {
    const input = campo.querySelector('input, textarea');
    if (!input) return;
    input.addEventListener('blur', () => validar(campo));
    input.addEventListener('input', () => {
      if (campo.classList.contains('invalido')) limparErro(campo);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const campos = [...form.querySelectorAll('.campo')];
    if (!campos.map(validar).every(Boolean)) {
      form.querySelector('.campo.invalido input, .campo.invalido textarea')?.focus();
      return;
    }

    const texto = [
      'CONTATO PELO SITE', '',
      `Nome: ${form.nome.value.trim()}`,
      `Telefone: ${form.telefone.value.trim()}`,
      `E-mail: ${form.email.value.trim()}`,
      `Assunto: ${form.assunto.value}`, '',
      form.mensagem.value.trim()
    ].join('\n');

    const url = Loja.montarUrlWhatsapp(BUSINESS_CONFIG.whatsapp, texto);
    if (url) window.open(url, '_blank', 'noopener');
    Carrinho.toast('Abrindo o WhatsApp para enviar sua mensagem.');
  });

  const tel = form.querySelector('input[type="tel"]');
  tel?.addEventListener('input', () => { tel.value = Loja.formatarTelefone(tel.value); });
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  iniciarHeader();
  iniciarMenu();
  marcarLinkAtivo();
  iniciarRevelar();
  atualizarAno();
  iniciarFormulario();

  renderizarStatusLoja();
  renderizarHorarios();
  renderizarEndereco();
  renderizarContatos();
  renderizarAvisoEntrega();

  setInterval(renderizarStatusLoja, 60000);
  document.addEventListener('carrossel:pronto', observar);

  agendarAposPintura(() => {
    iniciarFaixa();
    iniciarCarrossel();
  });
});
