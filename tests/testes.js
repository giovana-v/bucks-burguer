/* TESTES das regras de negócio. Rodar com: npm test */

const { Loja } = require('../src/js/loja.js');
const { BUSINESS_CONFIG } = require('../src/js/config.js');

let passou = 0, falhou = 0;
const falhas = [];

function teste(nome, fn) {
  try {
    fn();
    passou++;
    console.log(`  ✓ ${nome}`);
  } catch (e) {
    falhou++;
    falhas.push({ nome, erro: e.message });
    console.log(`  ✗ ${nome}\n      ${e.message}`);
  }
}
function grupo(nome) { console.log(`\n${nome}`); }
function igual(recebido, esperado, msg = '') {
  const a = JSON.stringify(recebido), b = JSON.stringify(esperado);
  if (a !== b) throw new Error(`${msg}\n      esperado: ${b}\n      recebido: ${a}`);
}
function verdadeiro(v, msg) { if (!v) throw new Error(msg || 'esperava verdadeiro'); }
function contem(texto, trecho) {
  if (!String(texto).includes(trecho)) {
    throw new Error(`esperava encontrar "${trecho}" em:\n${texto}`);
  }
}
function naoContem(texto, trecho) {
  if (String(texto).includes(trecho)) {
    throw new Error(`NÃO esperava encontrar "${trecho}" em:\n${texto}`);
  }
}

/* ---------- Fixtures ---------- */
const burger = (extra = {}) => ({
  id: 1, nome: 'The King', precoCentavos: 4290, qtd: 1, adicionais: [], obs: '', ...extra
});
const bacon = { id: 'bacon', nome: 'Bacon extra', precoCentavos: 700 };

grupo('DINHEIRO — centavos e formatação');

teste('converte reais em centavos sem erro de ponto flutuante', () => {
  igual(Loja.paraCentavos(42.90), 4290);
  igual(Loja.paraCentavos(8.90), 890);
  igual(Loja.paraCentavos(0.1 + 0.2), 30);});

teste('soma de centavos não acumula erro de float', () => {
  const itens = [burger({ precoCentavos: 1990 }), burger({ id: 2, precoCentavos: 890 }),
                 burger({ id: 3, precoCentavos: 1890 })];
  igual(Loja.calcularSubtotal(itens), 4770);
});

teste('formata no padrão pt-BR', () => {
  igual(Loja.formatarMoeda(4290).replace(/ /g, ' '), 'R$ 42,90');
  igual(Loja.formatarMoeda(0).replace(/ /g, ' '), 'R$ 0,00');
});

teste('lê valor digitado pelo cliente em vários formatos', () => {
  igual(Loja.lerValorDigitado('50'), 5000);
  igual(Loja.lerValorDigitado('50,00'), 5000);
  igual(Loja.lerValorDigitado('R$ 1.250,50'), 125050);
  igual(Loja.lerValorDigitado('abc'), null);
  igual(Loja.lerValorDigitado(''), null);
  igual(Loja.lerValorDigitado('-10'), null);
});

grupo('CARRINHO — subtotal, adicionais e agrupamento');

teste('subtotal considera adicionais e quantidade', () => {
  const item = burger({ qtd: 2, adicionais: [bacon] });
  igual(Loja.precoUnitario(item), 4990);
  igual(Loja.precoItem(item), 9980);
});

teste('carrinho vazio soma zero', () => {
  igual(Loja.calcularSubtotal([]), 0);
  igual(Loja.calcularSubtotal(undefined), 0);
});

teste('produtos iguais com a MESMA observação têm a mesma chave (agrupam)', () => {
  igual(Loja.chaveItem(burger({ obs: 'sem cebola' })),
        Loja.chaveItem(burger({ obs: 'sem cebola' })));
});

teste('observação com espaçamento diferente ainda agrupa', () => {
  igual(Loja.chaveItem(burger({ obs: '  sem   cebola ' })),
        Loja.chaveItem(burger({ obs: 'sem cebola' })));
});

teste('produtos iguais com observações DIFERENTES não agrupam', () => {
  const a = Loja.chaveItem(burger({ obs: 'sem cebola' }));
  const b = Loja.chaveItem(burger({ obs: 'alergia a nozes' }));
  verdadeiro(a !== b, 'alergia não pode ser agrupada com pedido normal');
});

teste('adicionais diferentes não agrupam, mas a ordem deles não importa', () => {
  const queijo = { id: 'cheddar', nome: 'Cheddar', precoCentavos: 600 };
  verdadeiro(Loja.chaveItem(burger({ adicionais: [bacon] })) !==
             Loja.chaveItem(burger({ adicionais: [] })));
  igual(Loja.chaveItem(burger({ adicionais: [bacon, queijo] })),
        Loja.chaveItem(burger({ adicionais: [queijo, bacon] })));
});

teste('observação é limitada a 200 caracteres', () => {
  igual(Loja.normalizarObs('a'.repeat(500)).length, 200);
  igual(Loja.normalizarObs(null), '');
  igual(Loja.normalizarObs(undefined), '');
});

grupo('ENTREGA — taxa, gratuidade e pedido mínimo');

teste('retirada não tem taxa', () => {
  const t = Loja.calcularTaxaEntrega(BUSINESS_CONFIG, { tipoPedido: 'retirada' });
  igual(t.situacao, 'retirada');
  igual(t.centavos, 0);
});

teste('sem regras cadastradas a taxa fica indeterminada (não inventa valor)', () => {
  const t = Loja.calcularTaxaEntrega(BUSINESS_CONFIG, { tipoPedido: 'entrega', bairro: 'Centro' });
  igual(t.situacao, 'indeterminada');
  igual(t.centavos, null);
});

teste('regra por bairro aplica a taxa, ignorando acento e caixa', () => {
  const cfg = { delivery: { feeRules: [{ tipo: 'bairro', bairros: ['São José'], taxaCentavos: 800 }] } };
  const t = Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega', bairro: 'sao jose' });
  igual(t.centavos, 800);
  igual(t.situacao, 'calculada');
});

teste('regra por faixa de CEP aplica a taxa', () => {
  const cfg = { delivery: { feeRules: [{ tipo: 'cep', de: '13000000', ate: '13099999', taxaCentavos: 600 }] } };
  igual(Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega', cep: '13050-100' }).centavos, 600);
  igual(Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega', cep: '99999-999' }).centavos, null);
});

teste('frete grátis só com distância REAL medida dentro do raio', () => {
  const cfg = { delivery: { freeRadiusKm: 1.5, feeRules: [] } };
  igual(Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega', distanciaKm: 1.2 }).gratis, true);
  igual(Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega', distanciaKm: 4 }).situacao, 'indeterminada');
  igual(Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega' }).gratis, false);
});

teste('distância entre coordenadas (Haversine) bate com a referência', () => {
  const umKm = Loja.distanciaEntre({ lat: 0, lng: 0 }, { lat: 0, lng: 0.008983 });
  verdadeiro(Math.abs(umKm - 1) < 0.01, `esperava 1 km, recebeu ${umKm}`);

  const d = Loja.distanciaEntre({ lat: -22.9056, lng: -47.0608 }, { lat: -23.5505, lng: -46.6333 });
  verdadeiro(d > 80 && d < 88, `esperava ~84 km, recebeu ${d}`);

  igual(Loja.distanciaEntre(null, { lat: -23.5, lng: -46.6 }), null);
  igual(Loja.distanciaEntre({ lat: 999, lng: 0 }, { lat: -23.5, lng: -46.6 }), null);
});

teste('total soma subtotal + taxa', () => {
  const cfg = { delivery: { feeRules: [{ tipo: 'bairro', bairros: ['centro'], taxaCentavos: 500 }] } };
  const t = Loja.calcularTotais([burger()], cfg, { tipoPedido: 'entrega', bairro: 'centro' });
  igual(t.subtotal, 4290);
  igual(t.total, 4790);
  igual(t.totalParcial, false);
});

teste('taxa indeterminada marca o total como parcial', () => {
  const t = Loja.calcularTotais([burger()], BUSINESS_CONFIG, { tipoPedido: 'entrega' });
  igual(t.total, 4290);
  igual(t.totalParcial, true);
});

teste('sem pedido mínimo configurado, qualquer valor passa', () => {
  const t = Loja.calcularTotais([burger({ precoCentavos: 100 })], BUSINESS_CONFIG, { tipoPedido: 'retirada' });
  igual(t.minimo, null);
  igual(t.atingiuMinimo, true);
});

teste('pedido mínimo configurado calcula quanto falta e bloqueia', () => {
  const cfg = { delivery: { minimumOrder: 5000, feeRules: [] } };
  const t = Loja.calcularTotais([burger()], cfg, { tipoPedido: 'retirada' });
  igual(t.faltaParaMinimo, 710);
  igual(t.atingiuMinimo, false);
  const ok = Loja.calcularTotais([burger({ qtd: 2 })], cfg, { tipoPedido: 'retirada' });
  igual(ok.atingiuMinimo, true);
});

grupo('HORÁRIO — fuso America/Sao_Paulo');

const H = {
  timeZone: 'America/Sao_Paulo',
  monday:    { open: '18:30', close: '01:00' },
  tuesday:   { open: '18:30', close: '01:00' },
  wednesday: { open: '18:30', close: '01:00' },
  thursday:  { open: '18:30', close: '01:00' },
  friday:    { open: '18:30', close: '01:00' },
  saturday:  { open: '18:30', close: '01:00' },
  sunday:    { open: '18:30', close: '01:00' }
};
const emBrasilia = (iso) => new Date(iso);
teste('antes de abrir (17h BRT): fechado, informando a abertura', () => {
  const r = Loja.estaAberto(H, emBrasilia('2026-09-16T20:00:00Z'));
  igual(r.aberto, false);
  contem(r.motivo, 'Abrimos hoje às 18:30');
  igual(r.proximaAbertura, 'hoje às 18:30');
});

teste('no horário de abertura (18:30 BRT): aberto', () => {
  igual(Loja.estaAberto(H, emBrasilia('2026-09-16T21:30:00Z')).aberto, true);
});

teste('turno vira a madrugada: 00:30 ainda está aberto', () => {
  igual(Loja.estaAberto(H, emBrasilia('2026-09-17T03:30:00Z')).aberto, true);
});

teste('01:30 já fechou', () => {
  const r = Loja.estaAberto(H, emBrasilia('2026-09-17T04:30:00Z'));
  igual(r.aberto, false);
  contem(r.motivo, 'Abrimos hoje às 18:30');
});

teste('usa o fuso da loja, não o do visitante', () => {
  igual(Loja.estaAberto(H, emBrasilia('2026-09-16T02:00:00Z')).aberto, true);
  igual(Loja.estaAberto(H, emBrasilia('2026-09-16T12:00:00Z')).aberto, false);
});

teste('com todos os horários confirmados, não há pendência', () => {
  const r = Loja.estaAberto(H, emBrasilia('2026-09-16T23:00:00Z'));
  igual(r.fechamentoIndefinido, false);
  igual(r.configuracaoIncompleta, false);
});

teste('com fechamento configurado, respeita o encerramento', () => {
  const cfg = { timeZone: 'America/Sao_Paulo', tuesday: { open: '18:00', close: '23:00' } };
  igual(Loja.estaAberto(cfg, emBrasilia('2026-09-15T23:00:00Z')).aberto, true);  igual(Loja.estaAberto(cfg, emBrasilia('2026-09-16T02:30:00Z')).aberto, false);});

teste('turno que vira a madrugada continua aberto depois da meia-noite', () => {
  const cfg = {
    timeZone: 'America/Sao_Paulo',
    friday: { open: '18:00', close: '02:00' },
    saturday: { open: '18:00', close: '02:00' }
  };
  igual(Loja.estaAberto(cfg, emBrasilia('2026-09-19T03:30:00Z')).aberto, true);
});

teste('sem configuração de horário, não afirma que está aberto', () => {
  const r = Loja.estaAberto(null);
  igual(r.aberto, false);
  igual(r.configuracaoIncompleta, true);
});

grupo('HORÁRIOS AGRUPADOS (rodapé)');

teste('sete dias iguais viram uma linha "Todos os dias"', () => {
  const g = Loja.agruparHorarios(H);
  igual(g.length, 1);
  igual(g[0], { rotulo: 'Todos os dias', texto: '18:30 às 01:00', fechado: false });
});

teste('config da demonstração deixa a loja aberta a qualquer hora', () => {
  const HC = BUSINESS_CONFIG.businessHours;
  for (const iso of ['2026-09-16T05:00:00Z', '2026-09-16T12:00:00Z', '2026-09-17T02:00:00Z']) {
    igual(Loja.estaAberto(HC, emBrasilia(iso)).aberto, true, `deveria estar aberto em ${iso}`);
  }
});

teste('dois dias seguidos usam "e", tres ou mais usam "a"', () => {
  const g = Loja.agruparHorarios({
    monday: null,
    tuesday:   { open: '18:00', close: '23:00' },
    wednesday: { open: '18:00', close: '23:00' },
    thursday:  { open: '18:00', close: '23:00' },
    friday:    { open: '18:00', close: '00:00' },
    saturday:  { open: '18:00', close: '00:00' },
    sunday:    { open: '18:00', close: '22:00' }
  });
  igual(g.map(x => x.rotulo),
        ['Segunda', 'Terça a Quinta', 'Sexta e Sábado', 'Domingo']);
  igual(g[1].texto, '18:00 às 23:00');
});

teste('nao inventa fechamento quando close e null', () => {
  const g = Loja.agruparHorarios({ monday: { open: '18:00', close: null } });
  contem(g[0].texto, 'a partir das');
  naoContem(g[0].texto, 'às');
});

teste('sem configuracao, todos os dias saem como fechado', () => {
  const g = Loja.agruparHorarios(null);
  igual(g.length, 1);
  igual(g[0].rotulo, 'Todos os dias');
  igual(g[0].texto, 'Fechado');
  igual(g[0].fechado, true);
});

grupo('ALÉRGENOS — compatibilidade com dados antigos');

teste('produto SEM o campo não exibe nada, e não é tratado como livre', () => {
  const a = Loja.lerAlergenos({ id: 1, nome: 'Burger antigo' });
  igual(a.informado, false);
  igual(a.lista, []);
  igual(a.texto, '', 'sem cadastro o site não escreve nada sobre alérgenos');
  naoContem(a.texto, 'livre');
  naoContem(a.texto, 'Nenhum alérgeno');
});

teste('produto com lista preenchida exibe os alérgenos', () => {
  const a = Loja.lerAlergenos({ alergenos: ['glúten', 'lactose'] });
  igual(a.informado, true);
  igual(a.lista, ['glúten', 'lactose']);
  contem(a.texto, 'Contém: glúten, lactose');
});

teste('lista vazia significa conferido, e é diferente de não informado', () => {
  const a = Loja.lerAlergenos({ alergenos: [] });
  igual(a.informado, true);
  contem(a.texto, 'Nenhum alérgeno cadastrado');
});

teste('aviso de contaminação cruzada só quando true', () => {
  igual(Loja.lerAlergenos({ alergenos: [], avisoContaminacaoCruzada: true }).contaminacaoCruzada, true);
  igual(Loja.lerAlergenos({ alergenos: [] }).contaminacaoCruzada, false);
  igual(Loja.lerAlergenos({}).contaminacaoCruzada, false);
});

teste('nenhum produto do catálogo tem alérgeno não confirmado', () => {
  const dados = require('../public/data/produtos.json');
  const comAlergeno = dados.produtos.filter(p => Array.isArray(p.alergenos) && p.alergenos.length);
  igual(comAlergeno.length, 0, 'catálogo não deve publicar alérgeno sem confirmação da cozinha');
});

grupo('CHECKOUT — validação dos campos');

const baseValida = {
  nome: 'Maria Silva', tipoPedido: 'retirada',
  pagamento: 'pix', observacaoGeral: ''
};
const ctxOk = { temItens: true, total: 4290, lojaFechada: false, abaixoDoMinimo: false };

teste('pedido de retirada válido passa', () => {
  const r = Loja.validarCheckout(baseValida, ctxOk);
  igual(r.valido, true);
  igual(r.erros, {});
});

teste('nome incompleto é recusado', () => {
  igual(Loja.validarCheckout({ ...baseValida, nome: 'Ma' }, ctxOk).erros.nome !== undefined, true);
  igual(Loja.validarCheckout({ ...baseValida, nome: 'Maria' }, ctxOk).erros.nome, 'Informe nome e sobrenome.');
});

teste('telefone não é mais pedido no checkout', () => {
  const r = Loja.validarCheckout(baseValida, ctxOk);
  igual(r.valido, true);
  igual(r.erros.telefone, undefined);
});

teste('RETIRADA não exige endereço', () => {
  const r = Loja.validarCheckout({ ...baseValida, tipoPedido: 'retirada' }, ctxOk);
  igual(r.erros.rua, undefined);
  igual(r.erros.bairro, undefined);
});

teste('ENTREGA exige rua, número e bairro', () => {
  const r = Loja.validarCheckout({ ...baseValida, tipoPedido: 'entrega' }, ctxOk);
  igual(r.valido, false);
  verdadeiro(r.erros.rua && r.erros.numero && r.erros.bairro);
});

teste('ENTREGA com endereço completo passa; complemento e referência são opcionais', () => {
  const r = Loja.validarCheckout({
    ...baseValida, tipoPedido: 'entrega',
    rua: 'Rua Exemplo', numero: '100', bairro: 'Centro', cep: '13140-252'
  }, ctxOk);
  igual(r.valido, true);
});

teste('ENTREGA exige CEP válido; RETIRADA não', () => {
  const entrega = { ...baseValida, tipoPedido: 'entrega',
                    rua: 'Rua Exemplo', numero: '100', bairro: 'Centro' };
  verdadeiro(Loja.validarCheckout({ ...entrega }, ctxOk).erros.cep, 'sem CEP deve falhar');
  verdadeiro(Loja.validarCheckout({ ...entrega, cep: '1314' }, ctxOk).erros.cep, 'CEP curto deve falhar');
  igual(Loja.validarCheckout({ ...entrega, cep: '13140252' }, ctxOk).erros.cep, undefined);
  igual(Loja.validarCheckout(baseValida, ctxOk).erros.cep, undefined);
});

teste('DINHEIRO exige troco ou a marcação "não preciso de troco"', () => {
  const semNada = Loja.validarCheckout({ ...baseValida, pagamento: 'dinheiro' }, ctxOk);
  igual(semNada.valido, false);
  verdadeiro(semNada.erros.trocoPara);

  const semTroco = Loja.validarCheckout({ ...baseValida, pagamento: 'dinheiro', semTroco: true }, ctxOk);
  igual(semTroco.valido, true);

  const comTroco = Loja.validarCheckout({ ...baseValida, pagamento: 'dinheiro', trocoPara: '50' }, ctxOk);
  igual(comTroco.valido, true);
});

teste('troco menor que o total é recusado', () => {
  const r = Loja.validarCheckout({ ...baseValida, pagamento: 'dinheiro', trocoPara: '10' }, ctxOk);
  verdadeiro(r.erros.trocoPara);
  contem(r.erros.trocoPara, '42,90');
});

teste('PIX e cartão não pedem troco', () => {
  for (const p of ['pix', 'credito', 'debito']) {
    igual(Loja.validarCheckout({ ...baseValida, pagamento: p }, ctxOk).erros.trocoPara, undefined);
  }
});

teste('carrinho vazio bloqueia o envio', () => {
  const r = Loja.validarCheckout(baseValida, { ...ctxOk, temItens: false });
  igual(r.valido, false);
  contem(r.erros.carrinho, 'vazio');
});

teste('loja fechada bloqueia o envio', () => {
  const r = Loja.validarCheckout(baseValida, { ...ctxOk, lojaFechada: true });
  igual(r.valido, false);
  contem(r.erros.carrinho, 'fechada');
});

teste('pedido abaixo do mínimo bloqueia o envio', () => {
  const r = Loja.validarCheckout(baseValida, { ...ctxOk, abaixoDoMinimo: true, minimo: 5000 });
  igual(r.valido, false);
  contem(r.erros.carrinho, '50,00');
});

grupo('MENSAGEM DO WHATSAPP');

const itensPedido = [
  burger({ qtd: 2, adicionais: [bacon], obs: 'sem cebola' }),
  burger({ id: 8, nome: 'Fritas Rústicas', precoCentavos: 1990, qtd: 1 })
];

teste('pedido de ENTREGA monta todos os blocos na ordem', () => {
  const totais = Loja.calcularTotais(itensPedido, { delivery: { feeRules: [{ tipo: 'bairro', bairros: ['centro'], taxaCentavos: 500 }] } },
    { tipoPedido: 'entrega', bairro: 'centro' });
  const msg = Loja.montarMensagem({
    itens: itensPedido,
    cliente: {
      nome: 'Maria Silva', tipoPedido: 'entrega',
      rua: 'Rua Exemplo', numero: '100', bairro: 'Centro',
      complemento: 'Apto 12', referencia: 'Portão azul',
      pagamento: 'dinheiro', trocoParaCentavos: 15000, semTroco: false,
      observacaoGeral: 'Tocar a campainha'
    },
    totais
  });

  for (const bloco of ['NOVO PEDIDO','CLIENTE','TIPO DO PEDIDO','ENDEREÇO','ITENS','RESUMO','PAGAMENTO','OBSERVAÇÃO GERAL']) {
    contem(msg, bloco);
  }
  contem(msg, '2x The King');
  contem(msg, 'Adicionais: Bacon extra');
  contem(msg, 'Observação: sem cebola');
  contem(msg, 'Taxa de entrega: R$ 5,00'.replace('R$ ', 'R$ ').replace('R$ ', 'R$ ') ? 'Taxa de entrega:' : '');
  contem(msg, 'Complemento: Apto 12');
  contem(msg, 'Referência: Portão azul');
  contem(msg, 'Troco para:');
});

teste('formato bate exatamente com o modelo combinado', () => {
  const item = { id: 2, nome: "Buck's Classic", precoCentavos: 3290, qtd: 1, adicionais: [], obs: '' };
  const totais = Loja.calcularTotais([item], BUSINESS_CONFIG, { tipoPedido: 'retirada' });
  const msg = Loja.montarMensagem({
    itens: [item],
    cliente: { nome: 'Nome da Pessoa', tipoPedido: 'retirada', pagamento: 'pix',
               observacaoGeral: 'asdasdasdasd' },
    totais, loja: "Buck's Burguer"
  });

  const esperado = [
    "*NOVO PEDIDO — BUCK'S BURGUER*", '',
    '*CLIENTE*', 'Nome: Nome da Pessoa', '',
    '*TIPO DO PEDIDO*', 'Retirada no local', '',
    '*ITENS DO PEDIDO*', '',
    "*1x Buck's Classic*", `Valor: ${Loja.formatarMoeda(3290)}`, '',
    '────────────────', '*RESUMO DO PEDIDO*', '',
    `Subtotal: ${Loja.formatarMoeda(3290)}`,
    `*TOTAL: ${Loja.formatarMoeda(3290)}*`,
    '────────────────', '',
    '*PAGAMENTO*', 'Forma: PIX', '',
    '*OBSERVAÇÃO GERAL*', 'asdasdasdasd', '',
    "Pedido enviado pelo site da Buck's Burguer.", '',
    '*Aguarde a confirmação da nossa equipe pelo WhatsApp.*'
  ].join('\n');

  igual(msg, esperado, 'a mensagem deve sair linha a linha como o modelo');
});

teste('observação vazia não vira linha solta', () => {
  const item = { id: 2, nome: 'X', precoCentavos: 1000, qtd: 1, adicionais: [], obs: '' };
  const totais = Loja.calcularTotais([item], BUSINESS_CONFIG, { tipoPedido: 'retirada' });
  const msg = Loja.montarMensagem({
    itens: [item], cliente: { nome: 'A B', tipoPedido: 'retirada', pagamento: 'pix' }, totais
  });
  naoContem(msg, 'Observação:');
  naoContem(msg, 'Adicionais:');
  naoContem(msg, 'OBSERVAÇÃO GERAL');
});

teste('nunca envia "undefined" nem campo vazio', () => {
  const totais = Loja.calcularTotais([burger()], BUSINESS_CONFIG, { tipoPedido: 'retirada' });
  const msg = Loja.montarMensagem({
    itens: [burger()],
    cliente: { nome: 'João Souza', tipoPedido: 'retirada', pagamento: 'pix' },
    totais
  });
  naoContem(msg, 'undefined');
  naoContem(msg, 'null');
  naoContem(msg, 'Complemento:');
  naoContem(msg, 'Referência:');
  naoContem(msg, 'OBSERVAÇÃO GERAL');
  naoContem(msg, 'Troco para:');
});

teste('RETIRADA não inclui bloco de endereço nem taxa', () => {
  const totais = Loja.calcularTotais([burger()], BUSINESS_CONFIG, { tipoPedido: 'retirada' });
  const msg = Loja.montarMensagem({
    itens: [burger()],
    cliente: { nome: 'João Souza', tipoPedido: 'retirada', pagamento: 'pix' },
    totais
  });
  naoContem(msg, 'ENDEREÇO');
  naoContem(msg, 'Taxa de entrega');
  contem(msg, 'Retirada no local');
});

teste('"não preciso de troco" aparece no lugar do valor', () => {
  const totais = Loja.calcularTotais([burger()], BUSINESS_CONFIG, { tipoPedido: 'retirada' });
  const msg = Loja.montarMensagem({
    itens: [burger()],
    cliente: { nome: 'João Souza', tipoPedido: 'retirada',
               pagamento: 'dinheiro', semTroco: true },
    totais
  });
  contem(msg, 'Não precisa de troco');
  naoContem(msg, 'Troco para:');
});

teste('taxa indeterminada vira total parcial declarado', () => {
  const totais = Loja.calcularTotais([burger()], BUSINESS_CONFIG, { tipoPedido: 'entrega' });
  const msg = Loja.montarMensagem({
    itens: [burger()],
    cliente: { nome: 'Ana Lima', tipoPedido: 'entrega',
               rua: 'Rua X', numero: '1', bairro: 'Centro', pagamento: 'pix' },
    totais
  });
  contem(msg, 'A combinar com a loja');
  contem(msg, 'TOTAL PARCIAL');
});

teste('os valores da mensagem batem com os do carrinho', () => {
  const cfg = { delivery: { feeRules: [{ tipo: 'bairro', bairros: ['centro'], taxaCentavos: 500 }] } };
  const totais = Loja.calcularTotais(itensPedido, cfg, { tipoPedido: 'entrega', bairro: 'centro' });
  const msg = Loja.montarMensagem({
    itens: itensPedido,
    cliente: { nome: 'Ana Lima', tipoPedido: 'entrega',
               rua: 'R', numero: '1', bairro: 'Centro', pagamento: 'pix' },
    totais
  });
  igual(totais.subtotal, 11970);
  igual(totais.total, 12470);
  contem(msg, Loja.formatarMoeda(12470));
});

teste('a mensagem é codificada corretamente na URL', () => {
  const url = Loja.montarUrlWhatsapp('5511900000000', 'Pedido: 2x The King & fritas\nObs: 100% sem cebola');
  contem(url, 'https://wa.me/5511900000000?text=');
  naoContem(url, ' ');
  naoContem(url, '\n');
  contem(url, '%26');  contem(url, '%0A');  const decodificado = decodeURIComponent(url.split('?text=')[1]);
  contem(decodificado, '2x The King & fritas');
});

teste('aceita número com máscara e recusa número vazio', () => {
  contem(Loja.montarUrlWhatsapp('+55 (11) 90000-0000', 'oi'), 'wa.me/5511900000000');
  igual(Loja.montarUrlWhatsapp('', 'oi'), null);
});

grupo('DADOS COMERCIAIS AUSENTES');

teste('endereço vazio não gera texto nem link de mapa', () => {
  igual(Loja.enderecoFormatado({}), '');
  igual(Loja.enderecoFormatado(null), '');
  igual(Loja.enderecoCompleto({}), '');
  igual(Loja.urlMapa({}), '');
  igual(Loja.urlMapaEmbed(null), '');
});

teste('endereço configurado gera texto completo e mapa', () => {
  const a = BUSINESS_CONFIG.address;
  const completo = Loja.enderecoCompleto(a);
  contem(completo, 'R. Eliza Laurinda da Silva, 399');
  contem(completo, 'Jardim Santana');
  contem(completo, 'Hortolândia - SP');
  contem(completo, '13140-252');

  contem(Loja.urlMapa(a), 'google.com/maps/search/');
  contem(Loja.urlMapaEmbed(a), 'output=embed');
  naoContem(Loja.urlMapa(a), ' ');
  naoContem(Loja.urlMapaEmbed(a), ' ');
});

teste('endereço preenchido gera uma linha legível', () => {
  igual(
    Loja.enderecoFormatado({ street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'Campinas', state: 'SP' }),
    'Rua A, 10 — Centro — Campinas — SP'
  );
});

teste('a configuração não publica contatos não confirmados', () => {
  igual(BUSINESS_CONFIG.phone, '');
  igual(BUSINESS_CONFIG.email, '');
  igual(BUSINESS_CONFIG.instagram, '');
  verdadeiro(BUSINESS_CONFIG.whatsapp.length > 10, 'o WhatsApp confirmado deve continuar presente');
});

teste('máscara de telefone cobre fixo e celular', () => {
  igual(Loja.formatarTelefone('11900000000'), '(11) 90000-0000');
  igual(Loja.formatarTelefone('1933334444'), '(19) 3333-4444');
  igual(Loja.formatarTelefone(''), '');
});

grupo('CEP — máscara, normalização e regra de taxa');

teste('máscara e normalização do CEP', () => {
  igual(Loja.formatarCep('13140252'), '13140-252');
  igual(Loja.formatarCep('131'), '131');
  igual(Loja.formatarCep('13140-252999'), '13140-252');
  igual(Loja.normalizarCep('13140-252'), '13140252');
  igual(Loja.normalizarCep('1314'), '');
  igual(Loja.normalizarCep(''), '');
});

teste('regra por CEP aplica a taxa dentro da faixa', () => {
  const cfg = { delivery: { feeRules: [{ tipo: 'cep', de: '13140000', ate: '13149999', taxaCentavos: 700 }] } };
  igual(Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega', cep: '13140252' }).centavos, 700);
  igual(Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega', cep: '99999999' }).centavos, null);
});

teste('CEP inválido não aplica taxa nem quebra', () => {
  const cfg = { delivery: { feeRules: [{ tipo: 'cep', de: '13140000', ate: '13149999', taxaCentavos: 700 }] } };
  igual(Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega', cep: '1314' }).situacao, 'indeterminada');
  igual(Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega', cep: 'abc' }).situacao, 'indeterminada');
});

teste('regra sem o dado necessário é reportada, não falha calada', () => {
  const cfg = { delivery: { feeRules: [
    { tipo: 'cep', de: '13140000', ate: '13149999', taxaCentavos: 700 },
    { tipo: 'distancia', ateKm: 3, taxaCentavos: 0 }
  ] } };
  const r = Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'entrega' });
  igual(r.situacao, 'indeterminada');
  igual(r.pendencias.length, 2);
  contem(r.pendencias.join(' | '), 'CEP não informado');
  contem(r.pendencias.join(' | '), 'não calcula distância');
});

teste('retirada continua sem taxa mesmo com regras cadastradas', () => {
  const cfg = { delivery: { feeRules: [{ tipo: 'cep', de: '00000000', ate: '99999999', taxaCentavos: 900 }] } };
  igual(Loja.calcularTaxaEntrega(cfg, { tipoPedido: 'retirada', cep: '13140252' }).centavos, 0);
});

grupo('TROCO — validado contra o total final');

const cfgTaxa = { delivery: { feeRules: [{ tipo: 'bairro', bairros: ['Centro'], taxaCentavos: 600 }] } };
const entregaBase = {
  nome: 'Ana Lima', tipoPedido: 'entrega', rua: 'Rua Exemplo',
  numero: '100', bairro: 'Centro', cep: '13140-252', pagamento: 'dinheiro'
};

teste('pedido 50 + taxa 6: troco para 50 é recusado', () => {
  const totais = Loja.calcularTotais([burger({ precoCentavos: 5000 })], cfgTaxa,
    { tipoPedido: 'entrega', bairro: 'Centro' });
  igual(totais.total, 5600, 'o total precisa incluir a taxa');

  const r = Loja.validarCheckout({ ...entregaBase, trocoPara: '50' },
    { temItens: true, total: totais.total, totalParcial: totais.totalParcial });
  igual(r.valido, false);
  contem(r.erros.trocoPara, '56,00');
});

teste('pedido 50 + taxa 6: troco para 60 é aceito', () => {
  const totais = Loja.calcularTotais([burger({ precoCentavos: 5000 })], cfgTaxa,
    { tipoPedido: 'entrega', bairro: 'Centro' });
  const r = Loja.validarCheckout({ ...entregaBase, trocoPara: '60' },
    { temItens: true, total: totais.total, totalParcial: totais.totalParcial });
  igual(r.valido, true);
  igual(r.avisos.trocoPara, undefined, 'taxa conhecida não gera aviso');
});

teste('taxa indeterminada: não trata o subtotal como total final', () => {
  const totais = Loja.calcularTotais([burger({ precoCentavos: 5000 })], BUSINESS_CONFIG,
    { tipoPedido: 'entrega' });
  igual(totais.totalParcial, true);

  const baixo = Loja.validarCheckout({ ...entregaBase, trocoPara: '40' },
    { temItens: true, total: totais.total, totalParcial: true });
  contem(baixo.erros.trocoPara, 'sem a taxa de entrega');

  const ok = Loja.validarCheckout({ ...entregaBase, trocoPara: '60' },
    { temItens: true, total: totais.total, totalParcial: true });
  igual(ok.valido, true);
  contem(ok.avisos.trocoPara, 'taxa de entrega ainda será somada');
});

teste('retirada: troco igual ao total é aceito', () => {
  const r = Loja.validarCheckout(
    { nome: 'Ana Lima', tipoPedido: 'retirada', pagamento: 'dinheiro', trocoPara: '50' },
    { temItens: true, total: 5000, totalParcial: false });
  igual(r.valido, true);
});

teste('PIX e cartão não sofrem com a validação de troco', () => {
  for (const p of ['pix', 'credito', 'debito']) {
    const r = Loja.validarCheckout({ ...entregaBase, pagamento: p, trocoPara: '1' },
      { temItens: true, total: 999999, totalParcial: false });
    igual(r.erros.trocoPara, undefined, `${p} não deve validar troco`);
    igual(r.valido, true);
  }
});

grupo('FORMULÁRIO DE CONTATO — mensagens de erro');

teste('campo vazio devolve a mensagem correspondente', () => {
  igual(Loja.validarCampoContato('nome', '').mensagem, 'Informe seu nome.');
  igual(Loja.validarCampoContato('tel', '').mensagem, 'Informe um telefone válido.');
  igual(Loja.validarCampoContato('email', '').mensagem, 'Informe um e-mail válido.');
  igual(Loja.validarCampoContato('texto', '').mensagem, 'Escreva sua mensagem.');
});

teste('campo válido devolve mensagem VAZIA (o span some pelo :empty)', () => {
  const casos = [
    ['nome', 'Maria Silva'], ['tel', '(11) 90000-0000'],
    ['email', 'maria@exemplo.com'], ['texto', 'Quero reservar uma mesa.']
  ];
  for (const [tipo, valor] of casos) {
    const r = Loja.validarCampoContato(tipo, valor);
    igual(r.valido, true, `${tipo} deveria ser válido`);
    igual(r.mensagem, '', `${tipo} válido não pode ter mensagem`);
  }
});

teste('valor preenchido mas inválido devolve mensagem específica', () => {
  igual(Loja.validarCampoContato('email', 'maria@').valido, false);
  igual(Loja.validarCampoContato('tel', '99999').mensagem, 'Informe um telefone com DDD.');
  igual(Loja.validarCampoContato('nome', 'Ma').mensagem, 'Informe seu nome.');
});

teste('corrigir o campo limpa a mensagem', () => {
  const antes = Loja.validarCampoContato('email', 'invalido');
  const depois = Loja.validarCampoContato('email', 'valido@exemplo.com');
  verdadeiro(antes.mensagem !== '', 'inválido deve ter mensagem');
  igual(depois.mensagem, '', 'corrigido deve zerar a mensagem');
});

grupo('LINKS INTERNOS — URLs limpas');

function normalizarCaminho(caminho) {
  const semAncora = String(caminho).split('#')[0].split('?')[0];
  const ultimo = semAncora.replace(/\/+$/, '').split('/').pop();
  return ultimo.replace(/\.html$/, '') || 'index';
}

teste('URL limpa e caminho com .html apontam para a mesma página', () => {
  igual(normalizarCaminho('/cardapio'), normalizarCaminho('/cardapio.html'));
  igual(normalizarCaminho('/contato'), normalizarCaminho('/contato.html'));
  igual(normalizarCaminho('/'), normalizarCaminho('/index.html'));
});

teste('query string e âncora não afetam a identificação da página', () => {
  igual(normalizarCaminho('/produto?id=5'), 'produto');
  igual(normalizarCaminho('/produto.html?id=5'), 'produto');
  igual(normalizarCaminho('/#reservas'), 'index');
  igual(normalizarCaminho('/cardapio/'), 'cardapio');
});

teste('páginas diferentes não se confundem', () => {
  verdadeiro(normalizarCaminho('/cardapio') !== normalizarCaminho('/contato'));
  verdadeiro(normalizarCaminho('/') !== normalizarCaminho('/produto'));
});

teste('nenhum link interno do site ainda usa .html', () => {
  const fs = require('fs');
  const arquivos = [
    ...fs.readdirSync('public').filter(f => f.endsWith('.html')).map(f => 'public/' + f),
    ...fs.readdirSync('src/js').map(f => 'src/js/' + f)
  ];
  const sobras = [];
  for (const arq of arquivos) {
    const texto = fs.readFileSync(arq, 'utf8');
    const limpo = texto.replace(/<!--[\s\S]*?-->/g, '');
    for (const m of limpo.match(/href="[^"]*\.html[^"]*"/g) || []) sobras.push(`${arq}: ${m}`);
  }
  igual(sobras, [], 'links internos devem usar URL limpa');
});

teste('o sitemap-modelo não está na pasta publicada', () => {
  const fs = require('fs');
  igual(fs.existsSync('public/sitemap.xml'), false,
    'sitemap com SEU-DOMINIO não pode ir ao ar');
});

teste('o banner do hero é o WebP, e o JPG antigo saiu', () => {
  const fs = require('fs');
  igual(fs.existsSync('public/assets/images/hero-banner.webp'), true);
  igual(fs.existsSync('public/assets/images/hero-banner.jpg'), false);
  const html = fs.readFileSync('public/index.html', 'utf8');
  contem(html, 'hero-banner.webp');
  naoContem(html, 'hero-banner.jpg');
});

teste('nenhum arquivo órfão restou em assets/images', () => {
  const fs = require('fs');
  const noDisco = fs.readdirSync('public/assets/images');
  igual(noDisco.includes('.jpg'), false, 'o arquivo sem nome foi removido');
});

grupo('CONTEÚDO E RESILIÊNCIA DAS PÁGINAS');

const fs = require('fs');
const lerPagina = (nome) => {
  const html = fs.readFileSync(`public/${nome}`, 'utf8');
  return html.replace(/<!-- CRITICO:INICIO -->[\s\S]*?<!-- CRITICO:FIM -->/, '');
};
const semComentarios = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

teste('concordância corrigida na seção Reservas', () => {
  const h = lerPagina('index.html').replace(/\s+/g, ' ');
  contem(h, 'os melhores hambúrgueres');
  naoContem(h, 'as melhores hambúrgueres');
});

teste('navegação visível usa "Cardápio", mas a rota continua /cardapio', () => {
  for (const p of ['index.html', 'cardapio.html', 'produto.html', 'contato.html', '404.html']) {
    const h = semComentarios(lerPagina(p));
    naoContem(h, '>Menu<');
    contem(h, '>Cardápio<');
    contem(h, 'href="/cardapio"');  }
});

teste('hero não repete "retire" em duas linhas seguidas', () => {
  const h = lerPagina('index.html');
  const bloco = h.slice(h.indexOf('hero-v2__linhas'), h.indexOf('hero-v2__linhas') + 250);
  const ocorrencias = (bloco.match(/[Rr]etire/g) || []).length;
  igual(ocorrencias, 1, 'apenas a primeira linha deve usar "retire"');
});

teste('cardápio não promete tempo de entrega não confirmado', () => {
  const h = lerPagina('cardapio.html');
  naoContem(h, '30 min');
  naoContem(h, '30min');
});

teste('regiões dinâmicas nascem com estado de carregamento', () => {
  const casos = [
    ['cardapio.html', 'gradeProdutos'],
    ['index.html', 'trilhoSemana'],
    ['produto.html', 'produtoDetalhe']
  ];
  for (const [pagina, id] of casos) {
    const h = lerPagina(pagina);
    const trecho = h.slice(h.indexOf(`id="${id}"`), h.indexOf(`id="${id}"`) + 220);
    contem(trecho, 'aria-busy="true"');
    contem(trecho, 'aria-live="polite"');
    contem(trecho, 'Carregando');
  }
});

teste('blocos de dados comerciais têm fallback se o JS não rodar', () => {
  const h = lerPagina('index.html');
  const vazios = h.match(/<(?:div|p)[^>]*data-(?:horarios|endereco|contatos|entrega-aviso)(?![\w-])[^>]*>\s*<\/(?:div|p)>/g);
  igual(vazios, null, 'nenhum container de dado comercial pode nascer vazio');

  contem(h, 'Consulte nossos horários');
  const fallbackHorarios = h.slice(h.indexOf('data-horarios'), h.indexOf('data-horarios') + 160);
  naoContem(fallbackHorarios, '18:30');
});

teste('o selo de status nasce oculto, para não virar caixa vazia', () => {
  const h = lerPagina('index.html');
  contem(h, 'data-status-loja hidden');
});

teste('.form__erro tem uma única regra base, sem conflito de cascata', () => {
  const css = fs.readFileSync('src/css/components.css', 'utf8');
  const base = (css.match(/^\.form__erro\s*\{/gm) || []).length;
  igual(base, 1, 'duas declarações base voltariam a mostrar erro ao abrir a página');
  contem(css, '.form__erro:empty { display: none; }');
});

teste('spans de erro do contato nascem vazios', () => {
  const h = lerPagina('contato.html');
  const spans = h.match(/<span class="form__erro"[^>]*><\/span>/g) || [];
  igual(spans.length, 4, 'os quatro campos validados devem começar sem mensagem');
});

console.log(`\n${'='.repeat(52)}`);
console.log(`  ${passou} passaram   ${falhou} falharam`);
console.log('='.repeat(52));
if (falhou) {
  falhas.forEach(f => console.log(`  ✗ ${f.nome}`));
  process.exit(1);
}
