/**
 * Liga o quadro de desenho ao classificador DoodleNet.
 *
 * Estados possíveis: carregando o modelo, pronto, classificando e erro. Os
 * botões só liberam quando o modelo está pronto e há tinta no quadro.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('drawing-canvas');
  var botaoLimpar = document.getElementById('clear-button');
  var botaoAdivinhar = document.getElementById('guess-button');

  if (!canvas || !botaoLimpar || !botaoAdivinhar) {
    return;
  }

  var MENSAGEM_ERRO_GENERICA =
    'Não foi possível analisar o desenho. Tente novamente.';

  var quadro = window.QuadroDeDesenho.criar(canvas, {
    aoMudar: function () {
      desenhoMudou = true;
      sincronizarControles();
    }
  });

  var modeloPronto = false;
  var analisando = false;
  var intervaloClassificacao = null;
  var desenhoMudou = false;
  var ultimoResultado = null;

  function sincronizarControles() {
    botaoAdivinhar.disabled = !modeloPronto || analisando || quadro.estaVazio();
    botaoLimpar.disabled = analisando;
  }

  function descreverErro(erro, padrao) {
    if (erro && typeof erro.message === 'string' && erro.message.length > 0) {
      return padrao + ' Detalhe: ' + erro.message;
    }
    return padrao;
  }

  function carregarModelo() {
    window.PainelResultado.mostrarCarregando();

    window.ClassificadorDoodle.carregar()
      .then(function () {
        modeloPronto = true;
        window.PainelResultado.mostrarInstrucao();
      })
      .catch(function (erro) {
        modeloPronto = false;
        window.PainelResultado.mostrarErro(
          descreverErro(
            erro,
            'Não foi possível carregar o modelo DoodleNet. Verifique a conexão e recarregue a página.'
          )
        );
      })
      .then(function () {
        sincronizarControles();
      });
  }

  /**
   * Recorta e normaliza o desenho antes de classificar: o DoodleNet espera o
   * rabisco centralizado e ocupando quase todo o quadro, como no QuickDraw.
   */
  function prepararEntrada() {
    return window.Preprocessamento.normalizar(canvas);
  }

  function resultadoIgual(a, b) {
    if (!a || !b || a.length !== b.length) {
      return false;
    }
    for (var i = 0; i < a.length; i += 1) {
      if (a[i].rotulo !== b[i].rotulo || a[i].confianca !== b[i].confianca) {
        return false;
      }
    }
    return true;
  }

  function adivinhar() {
    if (!modeloPronto || analisando || quadro.estaVazio()) {
      return;
    }

    // Só classificar se o desenho mudou desde a última classificação.
    if (!desenhoMudou) {
      return;
    }
    desenhoMudou = false;

    var entrada = prepararEntrada();
    if (!entrada) {
      window.PainelResultado.mostrarInstrucao();
      return;
    }

    analisando = true;
    window.PainelResultado.mostrarClassificando();
    sincronizarControles();

    window.ClassificadorDoodle.classificar(entrada)
      .then(function (palpites) {
        // Só atualiza o DOM se o resultado realmente mudou, evitando
        // recriar elementos e fazer a página "voltar para cima".
        if (!resultadoIgual(palpites, ultimoResultado)) {
          ultimoResultado = palpites;
          window.PainelResultado.mostrarPalpites(palpites);
        }
      })
      .catch(function (erro) {
        window.PainelResultado.mostrarErro(
          descreverErro(erro, MENSAGEM_ERRO_GENERICA)
        );
      })
      .then(function () {
        analisando = false;
        sincronizarControles();
      });
  }

  botaoLimpar.addEventListener('click', function () {
    quadro.limpar();
    if (modeloPronto) {
      window.PainelResultado.mostrarInstrucao();
    }
  });

  botaoAdivinhar.addEventListener('click', adivinhar);

  // Atalho de teclado: Enter confirma o desenho, como em qualquer formulário.
  document.addEventListener('keydown', function (evento) {
    if (evento.key !== 'Enter' || evento.target === botaoAdivinhar) {
      return;
    }
    if (botaoAdivinhar.disabled) {
      return;
    }
    adivinhar();
  });

  sincronizarControles();
  carregarModelo();

  // Classificação em tempo real: tenta classificar a cada 500 ms enquanto houver
  // tinta no quadro, o modelo estiver pronto e não estiver classificando no momento.
  intervaloClassificacao = setInterval(function () {
    adivinhar();
  }, 500);
})();
