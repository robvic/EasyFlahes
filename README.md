# Easy Flashes

## Sobre o projeto

O Easy Flashes é uma aplicação web de estudo baseada em flashcards para revisão de conteúdos por disciplina.

A proposta do projeto é simples e prática: permitir que o usuário revise tópicos importantes em pequenos blocos, com foco em memorização ativa, rapidez de consulta e progresso contínuo. Os cards podem ser organizados por disciplina, com baralhos separados em arquivos JSON, cobrindo temas como:

- fundamentos de machine learning
- estatística e avaliação
- modelos lineares, árvores e ensembles
- clustering, PCA e redes neurais
- boas práticas de produção e ética em IA

O app funciona como um baralho interativo em que o usuário:

- vira o card para ver a resposta
- avalia se acertou, errou ou encontrou dificuldade
- acumula pontos e sequência de acertos
- filtra por tópico
- embaralha o baralho

Tudo isso em uma interface leve e estática, sem necessidade de backend.

---

## Arquitetura

O projeto é estruturado como uma aplicação estática web, com separação clara entre front-end e dados.

### Estrutura principal

- `index.html` — estrutura da interface do app
- `styles.css` — estilos visuais e layout
- `app.js` — lógica da aplicação, renderização dos cards (conceito, código e fórmula LaTeX), filtros, pontuação e interação
- `data/cards-dados-e-ia.json` — baralho da disciplina de dados e IA
- `data/cards-portugues.json` — baralho da disciplina de português
- `data/scores.json` — configuração de pontuação e persistência do progresso
- `scripts/upload-to-gcs.ps1` — script de sincronização com o bucket no Google Cloud Storage

### Fluxo de funcionamento

1. O navegador carrega `index.html`.
2. O JavaScript executa `loadApp()` e busca os arquivos JSON em `data/`.
3. O usuário escolhe a disciplina no submenu e o respectivo arquivo JSON é carregado em memória.
4. A interação do usuário ocorre no front-end:
   - selecionar disciplina
   - virar card
   - navegar entre cards
   - filtrar por assunto
   - atribuir avaliação (`again`, `hard`, `known`)
5. A pontuação e o estado do usuário são armazenados no `localStorage` do navegador.

### Dados dos cards

Os cards ficam em arquivos como `data/cards-dados-e-ia.json` e `data/cards-portugues.json`, e cada item pode conter campos como:

- `id`: identificador único
- `topic`: tópico do card
- `type`: `concept`, `code` ou `formula`
- `question`: pergunta principal
- `answer`: resposta explicativa
- `source`: referência externa
- `code`: trecho de código opcional
- `formula`: expressão matemática em LaTeX opcional (renderizada no card)
- `image`: URL opcional para imagem/ilustração

Esse formato permite enriquecer o conteúdo sem necessidade de alterar a lógica do front-end.

---

## Hospedagem

O projeto está sendo hospedado no Google Cloud Storage (GCS), aproveitando a natureza estática do app.

### Características da hospedagem

- não há backend ou servidor dinâmico
- os arquivos são servidos diretamente como conteúdo estático
- o bucket do GCS expõe a aplicação via URL pública
- o script `scripts/upload-to-gcs.ps1` sincroniza o conteúdo do projeto com o bucket

### Publicação e sincronização

O script de upload usa o Google Cloud CLI (`gcloud`) e faz uma sincronização recursiva do repositório com o bucket configurado:

```powershell
./scripts/upload-to-gcs.ps1
```

Ele também suporta modo de simulação e remoção de arquivos remotos não correspondentes ao projeto.

Exemplo:

```powershell
./scripts/upload-to-gcs.ps1 -DryRun
./scripts/upload-to-gcs.ps1 -DeleteRemote
```

### CI/CD (deploy automático)

O deploy para o GCS é automatizado via GitHub Actions, definido em `.github/workflows/deploy.yml`.

- **Gatilho**: toda vez que há um `push` na branch `main`.
- **Passos do workflow**:
  1. `actions/checkout` — faz o checkout do repositório.
  2. `google-github-actions/auth` — autentica no Google Cloud usando a service account armazenada no secret `GCP_SA_KEY`.
  3. `google-github-actions/setup-gcloud` — instala o Google Cloud CLI no runner.
  4. Execução do `scripts/upload-to-gcs.ps1 -DeleteRemote` (via `pwsh`, disponível por padrão nos runners do GitHub) — sincroniza o repositório com o bucket e remove do bucket os arquivos que não existem mais no projeto.

Ou seja, qualquer alteração enviada para `main` é publicada automaticamente no GCS, sem necessidade de rodar o script manualmente.

---

## Como acessar?

A aplicação está disponível em:

[Easy Flashes — Data Science](https://storage.googleapis.com/easy-flashes/index.html)

Esse é o endereço público do app hospedado no GCS.

---

## Como manter o projeto (enriquecimento dos cards)

A manutenção mais importante do projeto está nos arquivos de cards em `data/`, um por disciplina.

### Como adicionar ou ajustar cards

1. Abra o arquivo JSON da disciplina desejada em `data/`.
2. Adicione um novo objeto no array `cards`.
3. Preserve a estrutura do JSON.
4. Use `id` único para cada card.
5. Defina `topic` com um tópico consistente para filtro e organização.
6. Escolha `type`:
   - `concept` para explicação teórica
   - `code` para exemplos de código
   - `formula` para ligar conceito a uma expressão matemática em LaTeX
7. Inclua `source` sempre que possível, para referência e confiabilidade.
8. Se o card exigir e.g. snippet de Python, use `code`.
9. Se o card exigir equação, use `formula` com delimitadores LaTeX (`$$ ... $$`).
10. Se houver ilustração relevante, use `image` com URL externa.

### Exemplo de card

```json
{
  "id": "ds-101",
  "topic": "Fundamentos",
  "type": "concept",
  "question": "O que é overfitting?",
  "answer": "É o ajuste excessivo ao conjunto de treino, que captura ruído e reduz a capacidade de generalização.",
  "source": "https://developers.google.com/machine-learning/crash-course/overfitting"
}
```

### Boas práticas de enriquecimento

- mantenha as perguntas curtas e objetivas
- priorize conceitos frequentes em entrevistas e revisão de estudos
- use uma mistura de teoria e exemplos práticos
- revise a fonte antes de incluir o card
- mantenha consistência entre tópicos e terminologia
- evite duplicação de conceitos em temas parecidos

### Revisão e publicação

Depois de atualizar os cards:

1. valide o JSON para garantir que está sintaticamente correto
2. teste a aplicação localmente
3. publique por meio do script de sincronização para o GCS

---

## Observações finais

Este projeto foi pensado para funcionar como um material de estudo leve, acessível e fácil de manter. A simplicidade da arquitetura — HTML, CSS, JavaScript e JSON — torna o processo de evolução muito simples: adicionar conteúdo é quase todo o trabalho, e a aplicação continua estável e rápida.

Se o objetivo for expandir o projeto, o principal caminho é continuar enriquecendo os arquivos JSON das disciplinas com mais tópicos, explicações e exemplos relevantes para cada área.
