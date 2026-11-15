/**
 * Prepara o desenho do quadro para o DoodleNet.
 *
 * O modelo foi treinado com os rabiscos do QuickDraw, que são normalizados:
 * o desenho ocupa quase todo o quadrado e fica centralizado. O quadro da
 * página é 400x400 e aceita rabiscos pequenos em qualquer canto, então antes
 * de classificar recortamos a área com tinta e a recolocamos centralizada
 * num quadrado com uma folga pequena.
 *
 * Sem esse recorte, um desenho de 80px num canto vira ~6px depois da redução
 * do modelo para 28x28 e o palpite degrada muito.
 */
(function (global) {
  'use strict';

  var CANAIS_POR_PIXEL = 4;
  // Luminância (0-255) abaixo da qual o pixel conta como traço. O fundo é
  // branco (255) e o pincel é quase preto (22), então a antialiasing das
  // bordas fica de fora do recorte.
  var LIMIAR_DE_TINTA = 160;
  // Folga em volta do desenho, proporcional ao maior lado da caixa de tinta.
  var MARGEM_RELATIVA = 0.12;
  // Piso para o recorte: um pingo isolado não pode virar um zoom absurdo.
  var LADO_MINIMO = 24;
  // Resolução do canvas entregue ao ml5. Ele reduz para 28x28 por conta
  // própria; 128x128 preserva o traço sem custo relevante.
  var LADO_DA_ENTRADA = 128;
  var COR_DO_FUNDO = '#ffffff';

  var canvasDeEntrada = null;

  function luminancia(dados, indice) {
    return (dados[indice] + dados[indice + 1] + dados[indice + 2]) / 3;
  }

  /**
   * Varre os pixels e devolve a menor caixa que contém toda a tinta, ou null
   * se o quadro está vazio.
   *
   * Como os quatro extremos precisam ser atualizados ao mesmo tempo, a
   * varredura é linear simples pelos pixels — rápida o bastante para os
   * 160 mil pixels do quadro.
   */
  function encontrarCaixaDeTinta(dados, largura, altura) {
    var menorX = largura;
    var menorY = altura;
    var maiorX = -1;
    var maiorY = -1;

    for (var y = 0; y < altura; y += 1) {
      for (var x = 0; x < largura; x += 1) {
        var indice = (y * largura + x) * CANAIS_POR_PIXEL;
        if (luminancia(dados, indice) >= LIMIAR_DE_TINTA) {
          continue;
        }

        if (x < menorX) {
          menorX = x;
        }
        if (x > maiorX) {
          maiorX = x;
        }
        if (y < menorY) {
          menorY = y;
        }
        if (y > maiorY) {
          maiorY = y;
        }
      }
    }

    if (maiorX < 0 || maiorY < 0) {
      return null;
    }

    return {
      x: menorX,
      y: menorY,
      largura: maiorX - menorX + 1,
      altura: maiorY - menorY + 1
    };
  }

  /**
   * Converte a caixa de tinta no quadrado (mesma medida nos dois eixos) que
   * será recortado, já com a margem aplicada e centrado no desenho.
   */
  function quadradoComMargem(caixa) {
    var maiorLado = Math.max(caixa.largura, caixa.altura);
    var lado = Math.max(maiorLado * (1 + 2 * MARGEM_RELATIVA), LADO_MINIMO);

    return {
      x: caixa.x + caixa.largura / 2 - lado / 2,
      y: caixa.y + caixa.altura / 2 - lado / 2,
      lado: lado
    };
  }

  function obterCanvasDeEntrada() {
    if (!canvasDeEntrada) {
      canvasDeEntrada = document.createElement('canvas');
      canvasDeEntrada.width = LADO_DA_ENTRADA;
      canvasDeEntrada.height = LADO_DA_ENTRADA;
    }
    return canvasDeEntrada;
  }

  /**
   * Recorta o quadrado do desenho e o redesenha em 128x128 sobre fundo
   * branco. Partes do recorte que caem fora do quadro original ficam brancas,
   * que é exatamente a moldura esperada pelo modelo.
   *
   * Devolve o canvas normalizado, ou null quando não há tinta para recortar.
   */
  function normalizar(canvasOrigem) {
    var contextoOrigem = canvasOrigem.getContext('2d');
    var dados = contextoOrigem.getImageData(
      0,
      0,
      canvasOrigem.width,
      canvasOrigem.height
    ).data;

    var caixa = encontrarCaixaDeTinta(
      dados,
      canvasOrigem.width,
      canvasOrigem.height
    );
    if (!caixa) {
      return null;
    }

    var recorte = quadradoComMargem(caixa);
    var canvasDestino = obterCanvasDeEntrada();
    var contextoDestino = canvasDestino.getContext('2d');

    contextoDestino.fillStyle = COR_DO_FUNDO;
    contextoDestino.fillRect(0, 0, LADO_DA_ENTRADA, LADO_DA_ENTRADA);
    contextoDestino.imageSmoothingEnabled = true;
    contextoDestino.imageSmoothingQuality = 'high';
    contextoDestino.drawImage(
      canvasOrigem,
      recorte.x,
      recorte.y,
      recorte.lado,
      recorte.lado,
      0,
      0,
      LADO_DA_ENTRADA,
      LADO_DA_ENTRADA
    );

    return canvasDestino;
  }

  global.Preprocessamento = {
    normalizar: normalizar,
    encontrarCaixaDeTinta: encontrarCaixaDeTinta,
    LADO_DA_ENTRADA: LADO_DA_ENTRADA
  };
})(window);
