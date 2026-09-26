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
  subjectFilter: document.querySelector('#subjectFilter'),
  topicFilter: document.querySelector('#topicFilter'),
  deckEyebrow: document.querySelector('#deckEyebrow'),
  toast: document.querySelector('#toast')
};

const SUBJECTS = [
  {
    id: 'dados-e-ia',
    label: 'Dados e IA',
    eyebrow: 'DADOS E IA / DECK 01',
    dataFile: 'data/cards-dados-e-ia.json'
  },
  {
    id: 'portugues',
    label: 'Português',
    eyebrow: 'PORTUGUÊS / DECK 02',
    dataFile: 'data/cards-portugues.json'
  }
];

let allCards = [];
let deck = [];
let currentIndex = 0;
let scoreConfig;
let score;
let toastTimer;
let waitingMathJax = false;
let activeSubject = SUBJECTS[0];
let subjectLoadToken = 0;

async function loadApp() {
  try {
    const scoresResponse = await fetch('data/scores.json');
    if (!scoresResponse.ok) throw new Error('Falha ao carregar os dados.');
    scoreConfig = await scoresResponse.json();
    populateSubjects();
    await loadSubject(activeSubject.id);
    window.lucide?.createIcons();
  } catch (error) {
    elements.question.textContent = 'Não foi possível carregar o baralho.';
    elements.answer.textContent = 'Abra o projeto por um servidor local para permitir o carregamento dos arquivos JSON.';
    console.error(error);
  }
}

async function loadSubject(subjectId) {
  const subject = SUBJECTS.find(item => item.id === subjectId);
  if (!subject) throw new Error('Disciplina inválida.');
  const currentLoadToken = ++subjectLoadToken;

  const cardsResponse = await fetch(subject.dataFile);
  if (!cardsResponse.ok) throw new Error('Falha ao carregar a disciplina.');

  const cardsData = await cardsResponse.json();
  if (!Array.isArray(cardsData.cards)) throw new Error('Formato de cards inválido para a disciplina.');
  if (currentLoadToken !== subjectLoadToken) return false;

  activeSubject = subject;
  allCards = cardsData.cards;
  score = loadScore();

  renderSubjectInfo();
  populateTopics();
  applyTopicFilter('all');
  renderScore();
  return true;
}

function getScoreStorageKey() {
  return activeSubject.id === 'dados-e-ia'
    ? scoreConfig.storageKey
    : `${scoreConfig.storageKey}:${activeSubject.id}`;
}

function loadScore() {
  try {
    const saved = JSON.parse(localStorage.getItem(getScoreStorageKey()));
    return { ...scoreConfig.initialState, ...saved, cardScores: saved?.cardScores ?? {} };
  } catch {
    return structuredClone(scoreConfig.initialState);
  }
}

function saveScore() {
  localStorage.setItem(getScoreStorageKey(), JSON.stringify(score));
}

function populateSubjects() {
  elements.subjectFilter.length = 0;
  SUBJECTS.forEach(subject => elements.subjectFilter.add(new Option(subject.label, subject.id)));
}

function renderSubjectInfo() {
  elements.subjectFilter.value = activeSubject.id;
  elements.deckEyebrow.textContent = activeSubject.eyebrow;
  document.title = `Easy Flashes — ${activeSubject.label}`;
}

function populateTopics() {
  elements.topicFilter.replaceChildren(new Option('Todos os tópicos', 'all'));
  const topics = [...new Set(allCards.map(card => card.topic))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  topics.forEach(topic => elements.topicFilter.add(new Option(topic, topic)));
}

function applyTopicFilter(topic = 'all') {
  elements.topicFilter.value = topic;
  deck = topic === 'all' ? [...allCards] : allCards.filter(card => card.topic === topic);
  currentIndex = 0;
  renderCard();
}

function renderCard() {
  const card = deck[currentIndex];
  if (!card) {
    renderEmptyDeck();
    return;
  }

  elements.flashcard.classList.remove('flipped');
  elements.flashcard.setAttribute('aria-pressed', 'false');
  elements.ratings.classList.remove('visible');
  elements.question.textContent = card.question;
  elements.answer.textContent = card.answer;
  elements.topic.textContent = card.topic;
  elements.backTopic.textContent = card.topic;
  elements.cardType.textContent = card.type === 'code' ? 'Python' : card.type === 'formula' ? 'Fórmula' : 'Conceito';
  elements.source.hidden = !card.source;
  elements.source.href = card.source ?? '#';
  elements.counter.textContent = `${currentIndex + 1} / ${deck.length}`;
  elements.progress.style.width = `${((currentIndex + 1) / deck.length) * 100}%`;

  elements.code.hidden = !card.code;
  elements.code.textContent = card.code ?? '';
  handleFormulaRendering(card);
  elements.image.hidden = !card.image;
  elements.image.src = card.image ?? '';
  elements.image.alt = card.image ? `Referência visual para ${card.topic}` : '';
}

function renderEmptyDeck() {
  elements.flashcard.classList.remove('flipped');
  elements.flashcard.setAttribute('aria-pressed', 'false');
  elements.ratings.classList.remove('visible');
  elements.question.textContent = 'Nenhum card disponível nesta disciplina.';
  elements.answer.textContent = 'Adicione cards ao arquivo JSON da disciplina selecionada.';
  elements.topic.textContent = activeSubject.label;
  elements.backTopic.textContent = activeSubject.label;
  elements.cardType.textContent = 'Conceito';
  elements.source.hidden = true;
  elements.code.hidden = true;
  elements.code.textContent = '';
  elements.formula.hidden = true;
  elements.formula.textContent = '';
  elements.image.hidden = true;
  elements.image.src = '';
  elements.image.alt = '';
  elements.counter.textContent = '0 / 0';
  elements.progress.style.width = '0%';
}

function handleFormulaRendering(card) {
  elements.formula.hidden = !card.formula;
  elements.formula.dataset.source = card.formula ?? '';
  elements.formula.textContent = card.formula ?? '';

  if (!card.formula) return;

  if (window.__mathjaxReady) {
    typesetFormula(card.formula);
    return;
  }

  if (window.__mathjaxFailed) {
    waitingMathJax = false;
    return;
  }

  if (!waitingMathJax) {
    const formulaCardId = card.id;
    waitingMathJax = true;
    window.addEventListener('mathjax:ready', () => {
      waitingMathJax = false;
      if (deck[currentIndex]?.id === formulaCardId) typesetFormula(card.formula);
    }, { once: true });
    window.addEventListener('mathjax:failed', () => {
      waitingMathJax = false;
    }, { once: true });
  }
}

function typesetFormula(formulaSource = elements.formula.dataset.source) {
  if (!formulaSource || !window.MathJax?.typesetPromise) return;
  elements.formula.replaceChildren(document.createTextNode(formulaSource));
  window.MathJax.typesetClear?.([elements.formula]);
  window.MathJax.typesetPromise([elements.formula]).catch(() => markMathJaxFailed());
}

function markMathJaxFailed() {
  if (window.__mathjaxFailed) return;
  window.__mathjaxFailed = true;
  window.dispatchEvent(new Event('mathjax:failed'));
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
  if (!deck.length) return;
  const flipped = elements.flashcard.classList.toggle('flipped');
  elements.flashcard.setAttribute('aria-pressed', String(flipped));
  elements.ratings.classList.toggle('visible', flipped);
}

function move(direction) {
  if (deck.length < 2) return;
  currentIndex = (currentIndex + direction + deck.length) % deck.length;
  renderCard();
}

function rateCard(rating) {
  const card = deck[currentIndex];
  if (!card) return;
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
  applyTopicFilter(topic);
}

function shuffleDeck() {
  if (deck.length < 2) {
    showToast('Poucos cards para embaralhar');
    return;
  }
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
elements.subjectFilter.addEventListener('change', async event => {
  const previousSubjectId = activeSubject.id;
  const requestedSubjectId = event.target.value;
  elements.subjectFilter.disabled = true;

  try {
    const loaded = await loadSubject(requestedSubjectId);
    if (loaded) showToast(`Disciplina: ${activeSubject.label}`);
  } catch (error) {
    if (activeSubject.id === previousSubjectId && elements.subjectFilter.value === requestedSubjectId) {
      elements.subjectFilter.value = previousSubjectId;
    } else {
      elements.subjectFilter.value = activeSubject.id;
    }
    console.error(error);
    showToast('Não foi possível carregar a disciplina');
  } finally {
    elements.subjectFilter.disabled = false;
  }
});
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