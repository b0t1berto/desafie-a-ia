/**
 * Desenha os estados do painel de resultado: carregando, instrução,
 * classificando, palpites e erro.
 *
 * Tudo é criado via DOM, sem innerHTML, para que nada seja interpretado como
 * HTML — inclusive os rótulos que vêm do modelo.
 */
(function (global) {
  'use strict';

  var area = null;

  function obterArea() {
    if (!area) {
      area = document.getElementById('result');
    }
    return area;
  }

  function limparArea() {
    var elemento = obterArea();
    if (!elemento) {
      return null;
    }
    elemento.innerHTML = '';
    return elemento;
  }

  function criarParagrafo(classe, texto) {
    var paragrafo = document.createElement('p');
    paragrafo.className = classe;
    paragrafo.textContent = texto;
    return paragrafo;
  }

  function mostrarMensagem(classe, texto) {
    var elemento = limparArea();
    if (!elemento) {
      return;
    }
    elemento.appendChild(criarParagrafo(classe, texto));
  }

  function mostrarCarregando() {
    mostrarMensagem(
      'result__placeholder',
      'Carregando IA...'
    );
  }

  function mostrarInstrucao() {
    mostrarMensagem(
      'result__placeholder',
      'Modelo pronto. Desenhe algo no quadro e clique em Adivinhar.'
    );
  }

  function mostrarClassificando() {
    mostrarMensagem('result__placeholder', 'Analisando o desenho...');
  }

  function mostrarErro(mensagem) {
    mostrarMensagem('result__erro', mensagem);
  }

  function formatarConfianca(confianca) {
    var porcentagem = confianca * 100;
    if (porcentagem > 0 && porcentagem < 1) {
      return '<1%';
    }
    return Math.round(porcentagem) + '%';
  }

  /**
   * Monta um item da lista: rótulo + porcentagem e, abaixo, uma barra cuja
   * largura representa a confiança. A barra é decorativa; o número ao lado
   * carrega a informação para leitores de tela.
   */
  function criarPalpite(palpite, posicao) {
    var item = document.createElement('li');
    item.className =
      posicao === 0 ? 'palpite palpite--principal' : 'palpite';

    var linha = document.createElement('div');
    linha.className = 'palpite__linha';

    var rotulo = document.createElement('span');
    rotulo.className = 'palpite__rotulo';
    rotulo.textContent = palpite.rotulo;

    var valor = document.createElement('span');
    valor.className = 'palpite__valor';
    valor.textContent = formatarConfianca(palpite.confianca);

    linha.appendChild(rotulo);
    linha.appendChild(valor);

    var barra = document.createElement('div');
    barra.className = 'barra';
    barra.setAttribute('aria-hidden', 'true');

    var preenchimento = document.createElement('div');
    preenchimento.className = 'barra__preenchimento';
    // Mínimo visível para palpites muito baixos não sumirem por completo.
    preenchimento.style.width = Math.max(palpite.confianca * 100, 2) + '%';

    barra.appendChild(preenchimento);
    item.appendChild(linha);
    item.appendChild(barra);

    return item;
  }

  function mostrarPalpites(palpites) {
    var elemento = limparArea();
    if (!elemento) {
      return;
    }

    if (!palpites || palpites.length === 0) {
      elemento.appendChild(
        criarParagrafo(
          'result__placeholder',
          'O modelo não devolveu nenhum palpite. Tente desenhar de novo.'
        )
      );
      return;
    }

    // Linha principal no formato solicitado: "Acho que é: [rotulo], [confianca]%"
    var principal = palpites[0];
    elemento.appendChild(
      criarParagrafo(
        'result__principal',
        'Acho que é: ' + principal.rotulo + ', ' + formatarConfianca(principal.confianca)
      )
    );

    // Os demais palpites, se houver
    var restantes = palpites.slice(1);
    if (restantes.length > 0) {
      var restanteTexto = restantes
        .map(function (p) {
          return p.rotulo + ' (' + formatarConfianca(p.confianca) + ')';
        })
        .join(', ');
      elemento.appendChild(
        criarParagrafo('result__restantes', 'Também vi: ' + restanteTexto)
      );
    }

    elemento.appendChild(
      criarParagrafo(
        'result__nota',
        'Os rótulos vêm em inglês: é o vocabulário de 345 categorias do QuickDraw usado no treino.'
      )
    );
  }

  global.PainelResultado = {
    mostrarCarregando: mostrarCarregando,
    mostrarInstrucao: mostrarInstrucao,
    mostrarClassificando: mostrarClassificando,
    mostrarPalpites: mostrarPalpites,
    mostrarErro: mostrarErro
  };
})(window);
