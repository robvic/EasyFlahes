const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { renderCardText } = require('../card-text.js');

test('renderCardText updates the flashcard DOM with ruby markup', () => {
  const dom = new JSDOM('<strong id="question"></strong>');
  const originalDocument = global.document;
  global.document = dom.window.document;

  try {
    const target = dom.window.document.querySelector('#question');

    renderCardText(target, 'city, cities', { text: '都市', furigana: 'とし' });

    const wrapper = target.querySelector('.localized-text');
    const ruby = target.querySelector('ruby');
    const rt = target.querySelector('rt');

    assert.ok(wrapper);
    assert.ok(ruby);
    assert.equal(ruby.firstChild.textContent, '都市');
    assert.equal(rt.textContent, 'とし');
    assert.equal(target.textContent, '都市とし');
  } finally {
    if (originalDocument === undefined) {
      delete global.document;
    } else {
      global.document = originalDocument;
    }
    dom.window.close();
  }
});
