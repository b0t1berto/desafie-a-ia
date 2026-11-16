# Desafio IA — Modo Jogo

Reconhecimento de desenhos em tempo real com o modelo **DoodleNet** (ml5.js), focado no **Modo Jogo**: a IA sorteia uma palavra e você tem 20 segundos para desenhá-la. Ganha ponto se a IA acertar o que você desenhou antes do tempo acabar.

🎮 **Jogue online:** https://b0t1berto.github.io/desafie-a-ia/

---

## O que é

Aplicativo de desenho no navegador onde:

1. A IA sorteia uma categoria (ex.: casa, gato, bicicleta, guarda-chuva, pizza, etc.).
2. Você desenha a palavra no quadro.
3. A IA classifica o desenho a cada 500 ms e mostra o chute em tempo real.
4. Se o palpite principal da IA coincidir com a categoria sorteada antes dos 20 segundos esgotarem, você ganha um ponto.
5. O placar e o recorde são salvos no `localStorage` (persistem ao recarregar a página).

---

## Tecnologias

| Tecnologia | Uso |
|------------|-----|
| HTML5 | Estrutura da página |
| CSS3 | Estilização, barras de progresso animadas, feedback visual |
| JavaScript (ES5/Vanilla) | Lógica do jogo, integração com ml5, DOM |
| [ml5.js](https://ml5js.org/) 0.12.2 | Biblioteca de machine learning no navegador |
| [DoodleNet](https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/doodlenet) | Modelo de reconhecimento de desenhos (QuickDraw, 345 categorias) |
| localStorage | Persistência do recorde do jogo |

Não há build step, npm ou servidor: é só abrir o `index.html` no navegador.

---

## Como rodar

### Localmente

1. Clone o repositório:

   ```bash
   git clone https://github.com/b0t1berto/desafie-a-ia.git
   cd desafie-a-ia/desafio-ia
   ```

2. Abra o arquivo `index.html` diretamente no navegador:

   ```bash
   # No Linux/macOS
   open index.html

   # No Windows
   start index.html
   ```

   Ou simplesmente dê duplo clique no arquivo `index.html`.

3. Clique em **Iniciar jogo** para começar. O quadro de desenho aparece e a palavra sorteada é exibida.

### Observação sobre o modelo

O DoodleNet é carregado via CDN (`unpkg.com/ml5@0.12.2`). É necessária conexão com a internet na primeira vez para baixar o modelo e a biblioteca ml5.

---

## Estrutura do projeto

```
desafio-ia/
├── index.html          # Página principal (somente modo jogo)
├── css/
│   └── style.css       # Estilos: barras animadas, modo jogo, feedback
├── js/
│   ├── app.js          # Orquestra canvas, classificador e modo jogo
│   ├── canvas.js       # Quadro de desenho (pointer events)
│   ├── preprocessamento.js # Normaliza o desenho para o DoodleNet
│   ├── classificador.js  # Wrapper ml5 DoodleNet
│   ├── resultado.js    # Painel de resultado (barras de confiança)
│   ├── jogo.js         # Modo jogo: sorteio, cronômetro, placar, localStorage
│   └── teste-harness.js  # Harness de teste automatizado
├── teste.html          # Página de teste automatizado
└── README.md           # Este arquivo
```

---

## Como jogar

1. Abra `index.html`.
2. Clique em **Iniciar jogo**.
3. Desenhe a palavra sorteada (ex.: "Desenhe uma: casa").
4. Acompanhe o chute da IA ("IA acha que é: house (85%)") e o cronômetro de 20s.
5. Se a IA acertar antes do tempo acabar, você ganha um ponto e a mensagem fica visível até a próxima rodada.
6. Clique em **Nova palavra** para jogar novamente.

O recorde é salvo automaticamente e persiste mesmo se você fechar o navegador.

---

## Licença

Projeto educacional — desafio de reconhecimento de desenhos com IA no navegador.