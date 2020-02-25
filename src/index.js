import { watch } from 'melanke-watchjs';
import parse from './parser';

const yup = require('yup');
const axios = require('axios').default;

const state = {
  form: {
    processState: 'filling',
    fields: {
      feed: '',
    },
    valid: false,
  },
  feeds: [],
};

const schema = yup.object().shape({
  feed: yup.string().url(),
});

const addToList = (dom) => {
  const container = document.querySelector('.container-fluid');
  const exsistingList = document.querySelector('.list-group');
  const title = dom.querySelector('title').innerText;
  const description = dom.querySelector('description').innerText;
  const li = document.createElement('li');
  li.classList.add('list-group-item');
  li.innerHTML = `<b>${title}</b> - ${description}`;
  if (exsistingList !== null) {
    exsistingList.appendChild(li);
  } else {
    const ul = document.createElement('ul');
    ul.classList.add('list-group', 'list-group-flush');
    ul.appendChild(li);
    container.appendChild(ul);
  }
};

const form = document.querySelector('.form');
const inputField = document.querySelector('.form-control');
const submitButton = document.querySelector('.btn');

inputField.addEventListener('input', (e) => {
  state.form.fields.feed = e.target.value;
  schema
    .isValid({
      feed: e.target.value,
    })
    .then((inputValid) => {
      const inputValue = state.form.fields.feed;
      const isAlreadyAddedFeed = state.feeds.includes(inputValue);
      if (inputValid && inputValue !== '' && !isAlreadyAddedFeed) {
        state.form.valid = true;
      } else {
        state.form.valid = false;
      }
    });
});

watch(state.form, 'fields', () => {
  const inputValue = state.form.fields.feed;
  if (state.form.valid) {
    inputField.classList.add('is-valid');
    inputField.classList.remove('is-invalid');
  } else if (inputValue === '') {
    inputField.classList.remove('is-invalid', 'is-valid');
  } else {
    inputField.classList.add('is-invalid');
    inputField.classList.remove('is-valid');
  }
});

watch(state.form, 'valid', () => {
  submitButton.disabled = !state.form.valid;
});

watch(state.form, 'processState', () => {
  const { processState } = state.form;
  switch (processState) {
    case 'filling':
      submitButton.disabled = false;
      break;
    case 'sending':
      submitButton.disabled = true;
      break;
    case 'finished':
      // renderFeedList(state);
      inputField.value = '';
      inputField.classList.remove('is-valid');
      console.log('Success!!');
      console.log(state.feeds);
      break;
    default:
      throw new Error(`Unknown state: ${processState}`);
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const feedHost = state.form.fields.feed.replace(/^https?:\/\//i, '');
  const proxy = 'https://cors-anywhere.herokuapp.com/';
  state.form.processState = 'sending';

  axios.get(`${proxy}${feedHost}`)
    .then((response) => response.data)
    .catch((error) => {
      state.form.processState = 'filling';
      console.log(error);
    })
    .then((data) => {
      state.form.processState = 'finished';
      state.feeds.push(state.form.fields.feed);
      const html = parse(data);
      addToList(html);
      console.log('html ', html);
    });
});
