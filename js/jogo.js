/**
 * Modo Jogo: a IA sorteia uma categoria do DoodleNet (vocabulario QuickDraw)
 * e o jogador tem 20 segundos para desenha-la. Ganha ponto se o palpite
 * principal da IA coincidir com a categoria sorteada antes do tempo acabar.
 *
 * Como o DoodleNet nao expede a lista de 345 classes em tempo de execucao,
 * mantemos aqui um subconjunto das categorias mais comuns do QuickDraw,
 * com o rotulo em ingles (o que o modelo devolve) e traducao para exibicao.
 */
(function (global) {
  'use strict';

  var TEMPO_LIMITE_SEGUNDOS = 20;
  var LIMITE_DESENHOS_POR_PARTIDA = 5;

  // rotulo em ingles eh o que o DoodleNet devolve (vocabulario QuickDraw);
  // portugues eh para exibicao. Nomes conferidos com as categorias oficiais
  // do QuickDraw (345 classes).
  var CATEGORIAS = [
    { portugues: 'casa', ingles: 'house' },
    { portugues: 'gato', ingles: 'cat' },
    { portugues: 'cachorro', ingles: 'dog' },
    { portugues: 'bicicleta', ingles: 'bicycle' },
    { portugues: 'guarda-chuva', ingles: 'umbrella' },
    { portugues: 'arvore', ingles: 'tree' },
    { portugues: 'flor', ingles: 'flower' },
    { portugues: 'carro', ingles: 'car' },
    { portugues: 'aviao', ingles: 'airplane' },
    { portugues: 'lua', ingles: 'moon' },
    { portugues: 'sol', ingles: 'sun' },
    { portugues: 'estrela', ingles: 'star' },
    { portugues: 'nuvem', ingles: 'cloud' },
    { portugues: 'chuva', ingles: 'rain' },
    { portugues: 'neve', ingles: 'snowflake' },
    { portugues: 'pizza', ingles: 'pizza' },
    { portugues: 'hamburguer', ingles: 'hamburger' },
    { portugues: 'bolo de aniversario', ingles: 'birthday cake' },
    { portugues: 'relogio', ingles: 'clock' },
    { portugues: 'cama', ingles: 'bed' },
    { portugues: 'cadeira', ingles: 'chair' },
    { portugues: 'mesa', ingles: 'table' },
    { portugues: 'livro', ingles: 'book' },
    { portugues: 'lapiseira', ingles: 'pencil' },
    { portugues: 'telefone', ingles: 'telephone' },
    { portugues: 'sorvete', ingles: 'ice cream' },
    { portugues: 'guitarra', ingles: 'guitar' },
    { portugues: 'chinelo', ingles: 'flip flops' },
    { portugues: 'mochila', ingles: 'backpack' },
    { portugues: 'ovo', ingles: 'egg' },
    { portugues: 'relogio de pulso', ingles: 'wristwatch' }
  ];

  var areaJogo = null;
  var botaoIniciar = null;
  var palavraEl = null;
  var tempoEl = null;
  var feedbackEl = null;
  var pontosEl = null;
  var recordeEl = null;
  var palpiteIaEl = null;
  var quadro = null;

  var CHAVE_LOCALSTORAGE = 'desafio-ia-jogo-pontos';

  var estado = {
    ativo: false,
    categoriaAtual: null,
    pontos: 0,
    recorde: 0,
    desenhosFeitos: 0,
    tempoRestante: TEMPO_LIMITE_SEGUNDOS,
    temporizador: null,
    tempoEsgotado: false
  };

  function obterElementos() {
    if (areaJogo) {
      return;
    }
    areaJogo = document.getElementById('jogo');
    botaoIniciar = document.getElementById('jogo-iniciar');
    palavraEl = document.getElementById('jogo-palavra');
    tempoEl = document.getElementById('jogo-tempo');
    feedbackEl = document.getElementById('jogo-feedback');
    pontosEl = document.getElementById('jogo-pontos');
    recordeEl = document.getElementById('jogo-recorde');
    palpiteIaEl = document.getElementById('jogo-palpite-ia');
  }

  function carregarPontuacao() {
    try {
      var salva = localStorage.getItem(CHAVE_LOCALSTORAGE);
      if (salva !== null) {
        estado.recorde = Number(salva) || 0;
      }
    } catch (erro) {
      // localStorage indisponível (ex.: modo privado): ignora a persistência.
      estado.recorde = 0;
    }
    if (recordeEl) {
      recordeEl.textContent = estado.recorde;
    }
  }

  function salvarPontuacao() {
    try {
      localStorage.setItem(CHAVE_LOCALSTORAGE, String(estado.recorde));
    } catch (erro) {
      // localStorage indisponível: ignora a persistência.
    }
  }

  function sortearCategoria() {
    var indice = Math.floor(Math.random() * CATEGORIAS.length);
    return CATEGORIAS[indice];
  }

  function formatarConfianca(confianca) {
    var porcentagem = confianca * 100;
    if (porcentagem > 0 && porcentagem < 1) {
      return '<1%';
    }
    return Math.round(porcentagem) + '%';
  }

  function atualizarPlacar() {
    if (pontosEl) {
      pontosEl.textContent = estado.pontos;
    }
    // Se a pontuação da sessão supera o recorde, atualiza e persiste.
    if (estado.pontos > estado.recorde) {
      estado.recorde = estado.pontos;
      if (recordeEl) {
        recordeEl.textContent = estado.recorde;
      }
      salvarPontuacao();
    }
  }

  function iniciarTemporizador() {
    pararTemporizador();
    estado.temporizador = setInterval(function () {
      estado.tempoRestante -= 1;
      if (tempoEl) {
        tempoEl.textContent = estado.tempoRestante + 's';
      }
      if (estado.tempoRestante <= 0) {
        finalizarRodada(false);
      }
    }, 1000);
  }

  function pararTemporizador() {
    if (estado.temporizador) {
      clearInterval(estado.temporizador);
      estado.temporizador = null;
    }
  }

  function limparFeedback() {
    if (feedbackEl) {
      feedbackEl.textContent = '';
      feedbackEl.className = 'jogo__feedback';
    }
  }
  function proximaRodada() {
    obterElementos();
    if (!areaJogo || !palavraEl || !tempoEl) {
      return;
    }

    // Limite de desenhos por partida atingido: encerra a partida.
    if (estado.desenhosFeitos >= LIMITE_DESENHOS_POR_PARTIDA) {
      encerrarPartida();
      return;
    }

    pararTemporizador();
    estado.categoriaAtual = sortearCategoria();
    estado.tempoRestante = TEMPO_LIMITE_SEGUNDOS;
    estado.tempoEsgotado = false;

    estado.desenhosFeitos += 1;

    palavraEl.textContent = 'Desenhe uma: ' + estado.categoriaAtual.portugues;
    tempoEl.textContent = estado.tempoRestante + 's';
    limparFeedback();
    if (quadro && quadro.contexto && quadro.contexto.canvas) {
      quadro.contexto.canvas.classList.remove('canvas--acerto');
    }

    // Limpa o quadro para a nova tentativa, se o app forneceu a referencia.
    if (quadro && typeof quadro.limpar === 'function') {
      quadro.limpar();
    }

    iniciarTemporizador();
  }

  function iniciarJogo() {
    obterElementos();
    if (!areaJogo) {
      return;
    }

    carregarPontuacao();

    if (!estado.ativo) {
      estado.ativo = true;
      estado.pontos = 0;
      estado.desenhosFeitos = 0;
      estado.tempoEsgotado = false;
      atualizarPlacar();
    }

    if (botaoIniciar) {
      botaoIniciar.textContent = 'Nova palavra';
      botaoIniciar.className = 'button button--secondary';
    }

    document.body.classList.add('jogo-ativo');
    proximaRodada();
  }

  function verificarAcerto(rotuloIngles) {
    if (!estado.ativo || estado.tempoEsgotado || !estado.categoriaAtual) {
      return false;
    }
    return rotuloIngles === estado.categoriaAtual.ingles;
  }

  /**
   * Chamada pelo app sempre que o classificador devolve palpites, enquanto o
   * modo jogo estiver ativo. Se o palpite principal coincidir com a categoria
   * sorteada, encerra a rodada como acerto.
   */
  function aoReceberPalpites(palpites) {
    if (!estado.ativo || estado.tempoEsgotado) {
      return;
    }
    if (!Array.isArray(palpites) || palpites.length === 0) {
      return;
    }

    var principal = palpites[0];

    // Mostra o que a IA está reconhecendo (ajuda o usuario a entender o jogo).
    if (palpiteIaEl && principal) {
      var conf = formatarConfianca(principal.confianca);
      palpiteIaEl.textContent = 'IA acha que e: ' + principal.rotulo + ' (' + conf + ')';
      console.log('[jogo] palpite IA:', principal.rotulo, conf, '| categoria sorteada:', estado.categoriaAtual ? estado.categoriaAtual.ingles : '(nenhuma)');
    }

    if (principal && verificarAcerto(principal.rotulo)) {
      console.log('[jogo] ACERTO! categoria:', estado.categoriaAtual.ingles);
      finalizarRodada(true);
    }
  }

  function finalizarRodada(acertou) {
    pararTemporizador();
    estado.tempoEsgotado = true;

    if (acertou) {
      estado.pontos += 1;
      atualizarPlacar();
      if (feedbackEl) {
        feedbackEl.textContent =
          'Acertou! A IA reconheceu o seu desenho como: ' +
          estado.categoriaAtual.portugues +
          '. Voce ganhou um ponto.';
        feedbackEl.className = 'jogo__feedback jogo__feedback--acerto';
      }
      // Destaca o quadro desenhado para ficar claro que a IA acertou.
      if (quadro && quadro.contexto && quadro.contexto.canvas) {
        quadro.contexto.canvas.classList.add('canvas--acerto');
      }
      // Mantem a mensagem de acerto visivel ate o usuario iniciar a proxima rodada.
    } else {
      if (feedbackEl) {
        feedbackEl.textContent =
          'Tempo esgotado! A palavra era: ' + estado.categoriaAtual.portugues;
        feedbackEl.className = 'jogo__feedback jogo__feedback--erro';
      }
      // Erro: limpa o feedback apos um curto intervalo.
      setTimeout(function () {
        estado.tempoEsgotado = false;
        limparFeedback();
        if (quadro && quadro.contexto && quadro.contexto.canvas) {
          quadro.contexto.canvas.classList.remove('canvas--acerto');
        }
        if (botaoIniciar) {
          botaoIniciar.textContent = 'Nova palavra';
          botaoIniciar.className = 'button button--secondary';
        }
      }, 2000);
    }
  }

  /**
   * Encerra a partida quando o limite de desenhos e atingido. Desativa o jogo,
   * esconde o quadro, mostra o placar final e deixa o botao pronto para uma
   * nova partida.
   */
  function encerrarPartida() {
    pararTemporizador();
    estado.ativo = false;
    estado.tempoEsgotado = true;

    document.body.classList.remove('jogo-ativo');

    if (feedbackEl) {
      feedbackEl.textContent =
        'Fim de partida! Voce fez ' +
        estado.pontos +
        ' ponto' +
        (estado.pontos !== 1 ? 's' : '') +
        '.';
      feedbackEl.className = 'jogo__feedback';
    }

    if (botaoIniciar) {
      botaoIniciar.textContent = 'Jogar novamente';
      botaoIniciar.className = 'button button--primary';
    }
  }

  /**
   * Recebe a referencia do quadro de desenho (exposta pelo app.js) para que
   * o jogo possa limpar o canvas ao iniciar cada rodada.
   */
  function setQuadro(quadroReferencia) {
    quadro = quadroReferencia;
  }

  function estaAtivo() {
    return estado.ativo;
  }

  function init() {
    obterElementos();
    if (!areaJogo || !botaoIniciar) {
      return;
    }

    carregarPontuacao();

    botaoIniciar.addEventListener('click', iniciarJogo);

    global.Jogo = {
      aoReceberPalpites: aoReceberPalpites,
      setQuadro: setQuadro,
      estaAtivo: estaAtivo
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);