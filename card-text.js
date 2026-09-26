function renderCardText(element, text, display) {
  element.replaceChildren();

  if (!display?.text) {
    element.textContent = text ?? '';
    return;
  }

  const localizedText = document.createElement('span');
  localizedText.className = 'localized-text';

  if (!display.furigana) {
    localizedText.textContent = display.text;
    element.append(localizedText);
    return;
  }

  const ruby = document.createElement('ruby');
  ruby.append(document.createTextNode(display.text));

  const reading = document.createElement('rt');
  reading.textContent = display.furigana;
  ruby.append(reading);

  localizedText.append(ruby);
  element.append(localizedText);
}

if (typeof window !== 'undefined') {
  window.renderCardText = renderCardText;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderCardText };
}
