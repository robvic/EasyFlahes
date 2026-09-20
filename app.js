const elements = {
  flashcard: document.querySelector('#flashcard'),
  question: document.querySelector('#question'),
  answer: document.querySelector('#answer'),
  topic: document.querySelector('#topic'),
  backTopic: document.querySelector('#backTopic'),
  cardType: document.querySelector('#cardType'),
  code: document.querySelector('#codeExample'),
  formula: document.querySelector('#formulaExample'),
  image: document.querySelector('#cardImage'),
  source: document.querySelector('#sourceLink'),
  counter: document.querySelector('#counter'),
  progress: document.querySelector('#progressBar'),
  answeredCount: document.querySelector('#answeredCount'),
  points: document.querySelector('#points'),
  streak: document.querySelector('#streak'),
  accuracy: document.querySelector('#accuracy'),
  ratings: document.querySelector('#ratingActions'),
  topicFilter: document.querySelector('#topicFilter'),
  toast: document.querySelector('#toast')
};

let allCards = [];
let deck = [];
let currentIndex = 0;
let scoreConfig;
let score;
let toastTimer;
let waitingMathJax = false;

async function loadApp() {
  try {
    const [cardsResponse, scoresResponse] = await Promise.all([
      fetch('data/cards.json'),
      fetch('data/scores.json')
    ]);

    if (!cardsResponse.ok || !scoresResponse.ok) throw new Error('Falha ao carregar os dados.');

    const cardsData = await cardsResponse.json();
    scoreConfig = await scoresResponse.json();
    allCards = cardsData.cards;
    deck = [...allCards];
    score = loadScore();

    populateTopics();
    renderCard();
    renderScore();
    window.lucide?.createIcons();
  } catch (error) {
    elements.question.textContent = 'Não foi possível carregar o baralho.';
    elements.answer.textContent = 'Abra o projeto por um servidor local para permitir o carregamento dos arquivos JSON.';
    console.error(error);
  }
}

function loadScore() {
  try {
    const saved = JSON.parse(localStorage.getItem(scoreConfig.storageKey));
    return { ...scoreConfig.initialState, ...saved, cardScores: saved?.cardScores ?? {} };
  } catch {
    return structuredClone(scoreConfig.initialState);
  }
}

function saveScore() {
  localStorage.setItem(scoreConfig.storageKey, JSON.stringify(score));
}

function populateTopics() {
  const topics = [...new Set(allCards.map(card => card.topic))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  topics.forEach(topic => elements.topicFilter.add(new Option(topic, topic)));
}

function renderCard() {
  const card = deck[currentIndex];
  if (!card) return;

  elements.flashcard.classList.remove('flipped');
  elements.flashcard.setAttribute('aria-pressed', 'false');
  elements.ratings.classList.remove('visible');
  elements.question.textContent = card.question;
  elements.answer.textContent = card.answer;
  elements.topic.textContent = card.topic;
  elements.backTopic.textContent = card.topic;
  elements.cardType.textContent = card.type === 'code' ? 'Python' : card.type === 'formula' ? 'Fórmula' : 'Conceito';
  elements.source.href = card.source;
  elements.counter.textContent = `${currentIndex + 1} / ${deck.length}`;
  elements.progress.style.width = `${((currentIndex + 1) / deck.length) * 100}%`;

  elements.code.hidden = !card.code;
  elements.code.textContent = card.code ?? '';
  elements.formula.hidden = !card.formula;
  elements.formula.textContent = card.formula ?? '';
  if (card.formula) {
    if (window.__mathjaxReady) {
      typesetFormula();
    } else if (window.__mathjaxFailed) {
      waitingMathJax = false;
    } else if (!waitingMathJax) {
      waitingMathJax = true;
      window.addEventListener('mathjax:ready', () => {
        waitingMathJax = false;
        typesetFormula();
      }, { once: true });
      window.addEventListener('mathjax:failed', () => {
        waitingMathJax = false;
      }, { once: true });
    }
  }
  elements.image.hidden = !card.image;
  elements.image.src = card.image ?? '';
  elements.image.alt = card.image ? `Referência visual para ${card.topic}` : '';
}

function typesetFormula() {
  if (!elements.formula.textContent || !window.MathJax?.typesetPromise) return;
  window.MathJax.typesetClear?.([elements.formula]);
  window.MathJax.typesetPromise([elements.formula]).catch(console.error);
}

function renderScore() {
  const uniqueAnswered = Object.keys(score.cardScores).length;
  const knownCards = Object.values(score.cardScores).filter(value => value === 'known').length;
  const mastery = uniqueAnswered ? Math.round((knownCards / uniqueAnswered) * 100) : 0;

  elements.points.textContent = score.points;
  elements.streak.textContent = score.streak;
  elements.accuracy.textContent = `${mastery}%`;
  elements.answeredCount.textContent = `${uniqueAnswered} respondidos`;
}

function flipCard() {
  const flipped = elements.flashcard.classList.toggle('flipped');
  elements.flashcard.setAttribute('aria-pressed', String(flipped));
  elements.ratings.classList.toggle('visible', flipped);
}

function move(direction) {
  currentIndex = (currentIndex + direction + deck.length) % deck.length;
  renderCard();
}

function rateCard(rating) {
  const card = deck[currentIndex];
  const previousRating = score.cardScores[card.id];
  const previousPoints = previousRating ? scoreConfig.scoring[previousRating] : 0;
  const nextPoints = scoreConfig.scoring[rating];

  score.points += nextPoints - previousPoints;
  score.answered += previousRating ? 0 : 1;
  score.known += (rating === 'known' ? 1 : 0) - (previousRating === 'known' ? 1 : 0);
  score.streak = rating === 'known' ? score.streak + 1 : 0;
  score.bestStreak = Math.max(score.bestStreak, score.streak);
  score.cardScores[card.id] = rating;

  saveScore();
  renderScore();
  showToast(rating === 'known' ? '+2 pontos' : rating === 'hard' ? '+1 ponto' : 'Vamos rever este card');
  move(1);
}

function filterDeck(topic) {
  deck = topic === 'all' ? [...allCards] : allCards.filter(card => card.topic === topic);
  currentIndex = 0;
  renderCard();
}

function shuffleDeck() {
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[randomIndex]] = [deck[randomIndex], deck[index]];
  }
  currentIndex = 0;
  renderCard();
  showToast('Baralho embaralhado');
}

function resetProgress() {
  if (!window.confirm('Reiniciar toda a pontuação e o progresso?')) return;
  score = structuredClone(scoreConfig.initialState);
  saveScore();
  renderScore();
  showToast('Progresso reiniciado');
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('visible');
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('visible'), 1600);
}

elements.flashcard.addEventListener('click', event => {
  if (!event.target.closest('a')) flipCard();
});
elements.flashcard.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target === elements.flashcard) flipCard();
});
document.querySelector('#previousButton').addEventListener('click', () => move(-1));
document.querySelector('#nextButton').addEventListener('click', () => move(1));
document.querySelector('#shuffleButton').addEventListener('click', shuffleDeck);
document.querySelector('#resetButton').addEventListener('click', resetProgress);
elements.topicFilter.addEventListener('change', event => filterDeck(event.target.value));
elements.ratings.addEventListener('click', event => {
  const button = event.target.closest('[data-rating]');
  if (button) rateCard(button.dataset.rating);
});

document.addEventListener('keydown', event => {
  if (event.target.matches('select, button, a')) return;
  if (event.code === 'Space') { event.preventDefault(); flipCard(); }
  if (event.key === 'ArrowLeft') move(-1);
  if (event.key === 'ArrowRight') move(1);
  if (elements.flashcard.classList.contains('flipped') && ['1', '2', '3'].includes(event.key)) {
    rateCard({ 1: 'again', 2: 'hard', 3: 'known' }[event.key]);
  }
});

loadApp();