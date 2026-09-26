const { test, after } = require('node:test');
const assert = require('node:assert/strict');

function createMockNode(tagName = 'div') {
  let rawText = '';
  const node = {
    tagName: tagName.toUpperCase(),
    className: '',
    attributes: {},
    children: [],
    append(...children) {
      rawText = '';
      this.children.push(...children);
    },
    replaceChildren(...children) {
      rawText = '';
      this.children = [...children];
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    get textContent() {
      if (rawText) return rawText;
      return this.children.map(child => typeof child === 'string' ? child : child.textContent).join('');
    },
    set textContent(value) {
      rawText = value;
      this.children = [];
    }
  };

  return node;
}

const originalDocument = global.document;

global.document = {
  createElement: tagName => createMockNode(tagName),
  createTextNode: value => value
};

const { renderCardText } = require('../card-text.js');

after(() => {
  if (originalDocument === undefined) {
    delete global.document;
    return;
  }

  global.document = originalDocument;
});

test('renderCardText keeps plain text cards unchanged', () => {
  const target = createMockNode('strong');
  renderCardText(target, 'plain text');

  assert.equal(target.textContent, 'plain text');
  assert.equal(target.children.length, 0);
});

test('renderCardText renders localized text without furigana', () => {
  const target = createMockNode('strong');
  renderCardText(target, 'とても', { text: 'とても' });

  assert.equal(target.children.length, 1);
  assert.equal(target.children[0].className, 'localized-text');
  assert.equal(target.children[0].textContent, 'とても');
});

test('renderCardText renders ruby markup when furigana is provided', () => {
  const target = createMockNode('strong');
  renderCardText(target, '日本', { text: '日本', furigana: 'にほん' });

  const wrapper = target.children[0];
  const ruby = wrapper.children[0];
  const reading = ruby.children[1];

  assert.equal(wrapper.className, 'localized-text');
  assert.equal(ruby.tagName, 'RUBY');
  assert.equal(ruby.children[0], '日本');
  assert.equal(reading.tagName, 'RT');
  assert.equal(reading.textContent, 'にほん');
});

test('renderCardText prefers localized display text over fallback text when they differ', () => {
  const target = createMockNode('strong');
  renderCardText(target, 'city, cities', { text: '都市', furigana: 'とし' });

  const wrapper = target.children[0];
  const ruby = wrapper.children[0];

  assert.equal(target.textContent, '都市とし');
  assert.equal(ruby.children[0], '都市');
  assert.equal(ruby.children[1].textContent, 'とし');
});
