/**
 * Liga o quadro de desenho aos controles da página.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('drawing-canvas');
  var botaoLimpar = document.getElementById('clear-button');
  var botaoAdivinhar = document.getElementById('guess-button');
  var areaResultado = document.getElementById('result');

  if (!canvas || !botaoLimpar || !botaoAdivinhar || !areaResultado) {
    return;
  }

  var MENSAGEM_INICIAL = 'Aguardando um desenho...';
  // Abaixo deste valor de luminância (0-255) o pixel é considerado traço.
  // O fundo branco é 255 e o traço é quase preto, então a antialiasing das
  // bordas fica de fora da contagem.
  var LIMIAR_DE_TINTA = 160;
  var CANAIS_POR_PIXEL = 4;

  var quadro = window.QuadroDeDesenho.criar(canvas, {
    aoMudar: atualizarBotoes
  });

  function atualizarBotoes() {
    botaoAdivinhar.disabled = quadro.estaVazio();
  }

  function mostrarResultado(mensagem) {
    areaResultado.innerHTML = '';

    var paragrafo = document.createElement('p');
    paragrafo.className = 'result__placeholder';
    paragrafo.textContent = mensagem;

    areaResultado.appendChild(paragrafo);
  }

  /**
   * Conta os pixels que receberam tinta. O quadro tem fundo branco opaco, então
   * não dá para usar o canal alpha: o critério é o quão escuro o pixel ficou.
   */
  function contarPixelsDesenhados() {
    var dados = quadro.contexto.getImageData(0, 0, canvas.width, canvas.height).data;
    var total = 0;

    for (var i = 0; i < dados.length; i += CANAIS_POR_PIXEL) {
      var luminancia = (dados[i] + dados[i + 1] + dados[i + 2]) / 3;
      if (luminancia < LIMIAR_DE_TINTA) {
        total += 1;
      }
    }

    return total;
  }

  botaoLimpar.addEventListener('click', function () {
    quadro.limpar();
    mostrarResultado(MENSAGEM_INICIAL);
  });

  botaoAdivinhar.addEventListener('click', function () {
    if (quadro.estaVazio()) {
      return;
    }

    var pixels = contarPixelsDesenhados();
    mostrarResultado('Desenho capturado: ' + pixels + ' pixels traçados.');
  });

  atualizarBotoes();
})();
