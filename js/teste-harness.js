/**
 * Harness de teste temporário: desenha uma casa no quadro via Pointer Events
 * e dispara a classificação de verdade, exatamente como um usuário faria.
 * O resultado é escrito em #log e no título do documento.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('drawing-canvas');
  var botaoAdivinhar = document.getElementById('guess-button');
  var botaoLimpar = document.getElementById('clear-button');
  var resultado = document.getElementById('result');
  var log = document.getElementById('log');

  var linhas = [];

  function registrar(mensagem) {
    linhas.push(mensagem);
    log.textContent = linhas.join('\n');
    console.log('[teste] ' + mensagem);
  }

  function falhar(mensagem) {
    registrar('FALHA: ' + mensagem);
    document.title = 'TESTE FALHOU';
  }

  function textoDoResultado() {
    return resultado.textContent.replace(/\s+/g, ' ').trim();
  }

  function esperar(condicao, limiteMs, descricao) {
    return new Promise(function (resolve, reject) {
      var inicio = Date.now();
      (function verificar() {
        if (condicao()) {
          resolve();
          return;
        }
        if (Date.now() - inicio > limiteMs) {
          reject(new Error('tempo esgotado esperando ' + descricao));
          return;
        }
        setTimeout(verificar, 150);
      })();
    });
  }

  function pontoDaTela(x, y) {
    var caixa = canvas.getBoundingClientRect();
    return {
      clientX: caixa.left + (x * caixa.width) / canvas.width,
      clientY: caixa.top + (y * caixa.height) / canvas.height
    };
  }

  function criarEvento(tipo, ponto) {
    return new PointerEvent(tipo, {
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      buttons: 1,
      bubbles: true,
      cancelable: true,
      clientX: ponto.clientX,
      clientY: ponto.clientY
    });
  }

  function tracar(pontos) {
    canvas.dispatchEvent(criarEvento('pointerdown', pontoDaTela(pontos[0][0], pontos[0][1])));
    for (var i = 1; i < pontos.length; i += 1) {
      canvas.dispatchEvent(criarEvento('pointermove', pontoDaTela(pontos[i][0], pontos[i][1])));
    }
    var ultimo = pontos[pontos.length - 1];
    canvas.dispatchEvent(criarEvento('pointerup', pontoDaTela(ultimo[0], ultimo[1])));
  }

  // Casa desenhada na metade inferior esquerda de propósito: se o recorte do
  // pré-processamento não funcionar, o modelo quase não vê o traço.
  var CASA = [
    [[60, 300], [150, 210], [240, 300]],
    [[85, 300], [85, 380], [215, 380], [215, 300]],
    [[150, 335], [150, 380]]
  ];

  function coletarPalpites() {
    var rotulos = resultado.querySelectorAll('.palpite__rotulo');
    var valores = resultado.querySelectorAll('.palpite__valor');
    var palpites = [];

    for (var i = 0; i < rotulos.length; i += 1) {
      var valor = valores[i] ? valores[i].textContent : '?';
      palpites.push(rotulos[i].textContent + ' ' + valor);
    }

    return palpites;
  }

  function executar() {
    registrar('versao ml5: ' + (window.ml5 ? window.ml5.version : 'ausente'));

    esperar(
      function () {
        return /Modelo pronto|erro/i.test(textoDoResultado());
      },
      120000,
      'o modelo carregar'
    )
      .then(function () {
        registrar('estado apos carregar: ' + textoDoResultado());
        if (textoDoResultado().indexOf('Modelo pronto') !== 0) {
          throw new Error('o painel nao indica modelo pronto');
        }
        if (!botaoAdivinhar.disabled) {
          throw new Error('botao Adivinhar deveria estar desabilitado sem tinta');
        }
        registrar('botao desabilitado com quadro vazio: ok');

        CASA.forEach(tracar);
        registrar('desenho aplicado; botao habilitado: ' + !botaoAdivinhar.disabled);

        var dados = canvas
          .getContext('2d')
          .getImageData(0, 0, canvas.width, canvas.height).data;
        var caixa = window.Preprocessamento.encontrarCaixaDeTinta(
          dados,
          canvas.width,
          canvas.height
        );
        registrar('caixa de tinta: ' + JSON.stringify(caixa));

        var entrada = window.Preprocessamento.normalizar(canvas);
        registrar('canvas normalizado: ' + (entrada ? entrada.width + 'x' + entrada.height : 'null'));

        botaoAdivinhar.click();

        return esperar(
          function () {
            return /O que a IA viu|erro|nao devolveu/i.test(textoDoResultado());
          },
          60000,
          'a classificacao terminar'
        );
      })
      .then(function () {
        var palpites = coletarPalpites();
        registrar('palpites: ' + (palpites.length ? palpites.join(' | ') : '(nenhum)'));
        registrar('texto do painel: ' + textoDoResultado());

        botaoLimpar.click();

        return esperar(
          function () {
            return resultado.querySelector('.palpite') === null;
          },
          5000,
          'o painel limpar'
        ).then(function () {
          registrar('apos limpar: ' + textoDoResultado());
          if (!botaoAdivinhar.disabled) {
            throw new Error('botao deveria voltar a desabilitar apos limpar');
          }
          document.title = 'TESTE OK — ' + (palpites[0] || 'sem palpite');
        });
      })
      .catch(function (erro) {
        falhar(erro && erro.message ? erro.message : String(erro));
      });
  }

  if (document.readyState === 'complete') {
    executar();
  } else {
    window.addEventListener('load', executar);
  }
})();
