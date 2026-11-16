/**
 * Liga o quadro de desenho ao classificador DoodleNet.
 *
 * Estados possíveis: carregando o modelo, pronto, classificando e erro. A
 * classificacao acontece automaticamente a cada 500 ms enquanto houver tinta
 * no quadro; o unico botoeira restante e o de limpar o quadro.
 */
(function () {
  'use strict';

  var canvas = document.getElementById('drawing-canvas');
  var botaoLimpar = document.getElementById('clear-button');

  if (!canvas || !botaoLimpar) {
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

  // Expõe o quadro para que o modo jogo possa limpar o canvas a cada rodada.
  if (window.Jogo && typeof window.Jogo.setQuadro === 'function') {
    window.Jogo.setQuadro(quadro);
  }

  var modeloPronto = false;
  var analisando = false;
  var intervaloClassificacao = null;
  var desenhoMudou = false;
  var ultimoResultado = null;

  function sincronizarControles() {
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
    if (!modeloPronto || analisando) {
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
        // No modo jogo, o proprio modulo Jogo exibe o palpite da IA.
        // Fora do jogo, atualiza o painel de resultado com as barras.
        if (window.Jogo && window.Jogo.estaAtivo()) {
          if (typeof window.Jogo.aoReceberPalpites === 'function') {
            window.Jogo.aoReceberPalpites(palpites);
          }
          return;
        }

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

  sincronizarControles();
  carregarModelo();

  // Classificação em tempo real: tenta classificar a cada 500 ms enquanto houver
  // tinta no quadro, o modelo estiver pronto e não estiver classificando no momento.
  intervaloClassificacao = setInterval(function () {
    adivinhar();
  }, 500);
})();
