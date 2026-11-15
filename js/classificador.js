/**
 * Wrapper do DoodleNet do ml5 0.12.2.
 *
 * Na 0.x, ml5.imageClassifier(modelo, callback) aceita um callback disparado
 * quando o modelo termina de carregar, e classificador.classify(canvas,
 * callback) recebe (erro, resultados) — resultados como [{ label, confidence }].
 * Mantemos a interface externa baseada em Promises para não quebrar o app.js.
 */
(function (global) {
  'use strict';

  var NOME_DO_MODELO = 'DoodleNet';
  // O DoodleNet devolve 10 palpites por padrão; três bastam para a interface.
  var QUANTIDADE_DE_PALPITES = 3;
  // O DoodleNet devolve { label, confidence }; o MobileNet devolve
  // { className, probability }. Lemos os dois para não quebrar se o ml5 mudar
  // o formato de um modelo para o outro.
  var CAMPOS_DE_ROTULO = ['label', 'className'];

  var classificador = null;
  var carregamento = null;

  function ml5EstaDisponivel() {
    return (
      typeof global.ml5 !== 'undefined' &&
      typeof global.ml5.imageClassifier === 'function'
    );
  }

  function extrairRotulo(resultado) {
    for (var i = 0; i < CAMPOS_DE_ROTULO.length; i += 1) {
      var rotulo = resultado[CAMPOS_DE_ROTULO[i]];
      if (typeof rotulo === 'string' && rotulo.length > 0) {
        return rotulo;
      }
    }
    return 'desconhecido';
  }

  /**
   * Deixa o resultado no formato que a interface consome, descartando
   * entradas sem confiança numérica e ordenando da maior para a menor.
   */
  function normalizarResultados(resultados) {
    if (!Array.isArray(resultados)) {
      return [];
    }

    return resultados
      .map(function (resultado) {
        return {
          rotulo: extrairRotulo(resultado),
          confianca: Number(resultado.confidence)
        };
      })
      .filter(function (palpite) {
        return isFinite(palpite.confianca);
      })
      .sort(function (a, b) {
        return b.confianca - a.confianca;
      })
      .slice(0, QUANTIDADE_DE_PALPITES);
  }

  /**
   * Cria o classificador uma única vez e devolve a mesma Promise nas chamadas
   * seguintes. Na 0.x o carregamento é assíncrono via callback, então envolvemos
   * em uma Promise.
   */
  function carregar() {
    if (carregamento) {
      return carregamento;
    }

    if (!ml5EstaDisponivel()) {
      carregamento = Promise.reject(
        new Error(
          'A biblioteca ml5 não foi carregada. Verifique a conexão e recarregue a página.'
        )
      );
      return carregamento;
    }

    carregamento = new Promise(function (resolver, rejeitar) {
      try {
        global.ml5.imageClassifier(NOME_DO_MODELO, function (erro, instancia) {
          if (erro) {
            rejeitar(erro);
            return;
          }
          classificador = instancia;
          resolver(instancia);
        });
      } catch (excecao) {
        rejeitar(excecao);
      }
    });

    return carregamento;
  }

  function estaPronto() {
    return classificador !== null;
  }

  /**
   * Classifica o canvas entregue e resolve com até três palpites ordenados.
   * Na 0.x, classify(canvas, callback) recebe (erro, resultados).
   */
  function classificar(canvas) {
    if (!classificador) {
      return Promise.reject(
        new Error('O modelo ainda não terminou de carregar.')
      );
    }

    return new Promise(function (resolver, rejeitar) {
      try {
        classificador.classify(canvas, function (erro, resultados) {
          if (erro) {
            rejeitar(erro);
            return;
          }
          resolver(normalizarResultados(resultados));
        });
      } catch (excecao) {
        rejeitar(excecao);
      }
    });
  }

  global.ClassificadorDoodle = {
    carregar: carregar,
    classificar: classificar,
    estaPronto: estaPronto,
    QUANTIDADE_DE_PALPITES: QUANTIDADE_DE_PALPITES
  };
})(window);
