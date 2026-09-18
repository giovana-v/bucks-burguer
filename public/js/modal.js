/* MODAL — abre, fecha e prende o foco dentro do diálogo. */

const Modal = (() => {
  let ultimoGatilho = null;

  function abrir(dialog, opcoes = {}) {
    if (!dialog) return;
    ultimoGatilho = opcoes.gatilho || document.activeElement;

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    document.body.classList.add('modal-aberto');

    const alvo = opcoes.focoInicial
      ? dialog.querySelector(opcoes.focoInicial)
      : dialog.querySelector('[autofocus], input, select, textarea, button');
    requestAnimationFrame(() => alvo?.focus());

    if (opcoes.fecharAoClicarFora !== false) ligarCliqueFora(dialog);
  }

  function fechar(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function ligarCliqueFora(dialog) {
    if (dialog.dataset.cliqueForaLigado) return;
    dialog.dataset.cliqueForaLigado = '1';

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) fechar(dialog);
    });
  }

  function ligarRetornoDeFoco(dialog) {
    if (!dialog || dialog.dataset.retornoLigado) return;
    dialog.dataset.retornoLigado = '1';

    dialog.addEventListener('close', () => {
      document.body.classList.remove('modal-aberto');
      if (ultimoGatilho && document.contains(ultimoGatilho)) {
        ultimoGatilho.focus();
      }
      ultimoGatilho = null;
    });
  }

  function preparar(dialog) {
    if (!dialog) return;
    ligarRetornoDeFoco(dialog);
    dialog.querySelectorAll('[data-fechar]').forEach(btn => {
      btn.addEventListener('click', () => fechar(dialog));
    });
  }

  return { abrir, fechar, preparar };
})();

if (typeof window !== 'undefined') window.Modal = Modal;
