/**
 * Quadro de desenho em <canvas> controlado por Pointer Events, o que cobre
 * mouse, toque (dedo) e caneta com o mesmo conjunto de eventos.
 *
 * Expõe window.QuadroDeDesenho.criar(canvas), que devolve um controlador
 * com os métodos limpar(), estaVazio() e a propriedade contexto.
 */
(function (global) {
  'use strict';

  // O DoodleNet foi treinado com traços grossos do QuickDraw (~16 px).
  // Traços muito finos (o default 10 px) baixam a confiança do modelo.
  var LARGURA_DO_TRACO = 16;
  var COR_DO_TRACO = '#16181d';
  // O fundo é pintado no próprio canvas (não só pelo CSS) para que o estado
  // inicial e o estado depois de limpar() sejam o mesmo bitmap branco.
  var COR_DO_FUNDO = '#ffffff';

  /**
   * Converte a posição do ponteiro (coordenadas de tela) para as coordenadas
   * internas do canvas, levando em conta o redimensionamento via CSS.
   */
  function obterPonto(canvas, evento) {
    var caixa = canvas.getBoundingClientRect();
    var escalaX = caixa.width === 0 ? 1 : canvas.width / caixa.width;
    var escalaY = caixa.height === 0 ? 1 : canvas.height / caixa.height;

    return {
      x: (evento.clientX - caixa.left) * escalaX,
      y: (evento.clientY - caixa.top) * escalaY
    };
  }

  function configurarPincel(contexto) {
    contexto.lineWidth = LARGURA_DO_TRACO;
    contexto.lineCap = 'round';
    contexto.lineJoin = 'round';
    contexto.strokeStyle = COR_DO_TRACO;
    contexto.fillStyle = COR_DO_TRACO;
  }

  /**
   * Apaga o quadro e repinta o fundo de branco.
   *
   * clearRect() zera os canais, deixando os pixels transparentes; o fillRect
   * por cima devolve um fundo opaco de cor conhecida, então quem lê os pixels
   * pode comparar cores em vez de tratar transparência.
   */
  function pintarFundo(contexto, canvas) {
    contexto.clearRect(0, 0, canvas.width, canvas.height);
    contexto.fillStyle = COR_DO_FUNDO;
    contexto.fillRect(0, 0, canvas.width, canvas.height);
  }

  function criar(canvas, opcoes) {
    var contexto = canvas.getContext('2d');
    var aoMudar = (opcoes && opcoes.aoMudar) || function () {};
    var desenhando = false;
    var temTraco = false;
    // Id do ponteiro que está desenhando: garante um traço por vez, mesmo
    // quando outro dedo ou a palma da mão toca a tela no meio do desenho.
    var ponteiroAtivo = null;

    // O canvas nasce transparente; começar com o mesmo branco que limpar()
    // repinta evita que o primeiro traço apareça sobre fundo diferente.
    pintarFundo(contexto, canvas);
    configurarPincel(contexto);

    /**
     * Só o botão principal do mouse inicia um traço. Dedo e caneta chegam
     * com button 0 no pointerdown, então passam direto.
     */
    function podeIniciar(evento) {
      return evento.button === 0 && evento.isPrimary !== false;
    }

    function desenharPonto(evento) {
      var ponto = obterPonto(canvas, evento);
      contexto.lineTo(ponto.x, ponto.y);
      contexto.stroke();
    }

    function iniciarTraco(evento) {
      if (ponteiroAtivo !== null || !podeIniciar(evento)) {
        return;
      }

      evento.preventDefault();
      desenhando = true;
      ponteiroAtivo = evento.pointerId;

      // Mantém os eventos chegando mesmo se o ponteiro sair do quadro,
      // como ao arrastar rápido com o dedo ou a caneta.
      if (canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(evento.pointerId);
        } catch (erro) {
          // Ponteiro já liberado pelo navegador: segue sem captura.
        }
      }

      var ponto = obterPonto(canvas, evento);
      configurarPincel(contexto);

      // Toque único (sem arrastar) não gera segmento; pintamos o ponto
      // inicial como um círculo do diâmetro do pincel para que o toque
      // deixe marca mesmo sem movimento.
      contexto.beginPath();
      contexto.fillStyle = COR_DO_TRACO;
      contexto.arc(ponto.x, ponto.y, LARGURA_DO_TRACO / 2, 0, Math.PI * 2);
      contexto.fill();

      // Começa o caminho do traço nesse ponto para o arrasto continuar dele.
      contexto.beginPath();
      contexto.moveTo(ponto.x, ponto.y);

      temTraco = true;
      aoMudar();
    }

    function continuarTraco(evento) {
      if (!desenhando || evento.pointerId !== ponteiroAtivo) {
        return;
      }

      evento.preventDefault();

      // Canetas e telas de alta taxa de amostragem entregam vários pontos
      // entre dois quadros; desenhá-los todos evita traços "quebrados".
      var eventos = evento.getCoalescedEvents ? evento.getCoalescedEvents() : null;
      if (eventos && eventos.length > 0) {
        for (var i = 0; i < eventos.length; i += 1) {
          desenharPonto(eventos[i]);
        }
        return;
      }

      desenharPonto(evento);
    }

    function finalizarTraco(evento) {
      if (!desenhando) {
        return;
      }

      // pointerup de outro ponteiro (ex.: segundo dedo) não encerra o traço.
      if (evento && evento.pointerId !== ponteiroAtivo) {
        return;
      }

      desenhando = false;
      contexto.closePath();

      if (evento && canvas.releasePointerCapture && canvas.hasPointerCapture) {
        try {
          if (canvas.hasPointerCapture(evento.pointerId)) {
            canvas.releasePointerCapture(evento.pointerId);
          }
        } catch (erro) {
          // Captura já liberada pelo navegador.
        }
      }

      ponteiroAtivo = null;
    }

    function limpar() {
      pintarFundo(contexto, canvas);
      desenhando = false;
      ponteiroAtivo = null;
      temTraco = false;
      configurarPincel(contexto);
      aoMudar();
    }

    function estaVazio() {
      return !temTraco;
    }

    canvas.addEventListener('pointerdown', iniciarTraco);
    canvas.addEventListener('pointermove', continuarTraco);
    canvas.addEventListener('pointerup', finalizarTraco);
    // pointercancel: o navegador cancelou o gesto (ex.: rolagem ou troca de app).
    canvas.addEventListener('pointercancel', finalizarTraco);
    canvas.addEventListener('lostpointercapture', finalizarTraco);
    // Impede a seleção de texto ao arrastar o ponteiro sobre o quadro.
    canvas.addEventListener('dragstart', function (evento) {
      evento.preventDefault();
    });

    return {
      contexto: contexto,
      limpar: limpar,
      estaVazio: estaVazio
    };
  }

  global.QuadroDeDesenho = {
    criar: criar,
    LARGURA_DO_TRACO: LARGURA_DO_TRACO,
    // Exposto para quem for ler os pixels (ex.: contar traços) comparar
    // contra a cor real do fundo em vez de repetir o valor.
    COR_DO_FUNDO: COR_DO_FUNDO
  };
})(window);
