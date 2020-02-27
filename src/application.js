import _ from 'lodash';
import parse from './parser';
import watch from './watchers';

const yup = require('yup');
const axios = require('axios').default;

const schema = yup.object().shape({
  feed: yup.string().url(),
});

const updateFeedsState = (state, feedHTML) => {
  const id = _.uniqueId();
  const title = feedHTML.querySelector('title').innerText;
  const description = feedHTML.querySelector('description').innerText;
  state.feeds.unshift({
    id, title, description, url: state.form.fields.url,
  });

  const postItems = feedHTML.querySelectorAll('item');
  postItems.forEach((post, i) => {
    if (i < 5) {
      const postTitle = post.querySelector('title').innerText.replace('<![CDATA[', '').replace(']]>', '');
      const postLink = post.querySelector('a') ? post.querySelector('a').href : post.querySelector('link').innerText;
      state.posts.push({ id, title: postTitle, link: postLink });
    }
  });
};

const validate = (inputValid, state) => {
  const errors = {};
  const inputedValue = state.form.fields.url;
  const isFeedAlreadyExist = state.feeds.filter((feed) => feed.url === inputedValue).length > 0;
  if (inputedValue === '') {
    errors.emptyInput = 'Empty input field not allowed';
  } else if (isFeedAlreadyExist) {
    errors.alreadyExist = `Inputed feed <b>${inputedValue}</b> already in the feeds list below`;
  } else if (!inputValid) {
    errors.invalidUrl = 'Invalid RSS feed URL. Example of feed URL: <b>http://example.com/feed</b>';
  }
  return errors;
};

export default () => {
  const state = {
    form: {
      processState: 'filling',
      fields: {
        url: '',
      },
      valid: false,
      errors: {},
    },
    feeds: [],
    posts: [],
  };

  const form = document.querySelector('.form');
  const inputField = document.querySelector('.form-control');
  const container = document.querySelector('.container-fluid');

  inputField.addEventListener('input', (e) => {
    state.form.fields.url = e.target.value;
    schema
      .isValid({
        feed: e.target.value,
      })
      .then((inputValid) => {
        const errors = validate(inputValid, state);
        state.form.errors = errors;
        state.form.valid = _.isEqual(errors, {});
      });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.processState = 'sending';
    const feedHost = state.form.fields.url.replace(/^https?:\/\//i, '');
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    axios.get(`${proxy}${feedHost}`)
      .then((response) => response.data)
      .catch(() => {
        state.form.processState = 'filling';
        state.form.errors = { network: 'Network problems, try again.' };
      })
      .then((data) => {
        updateFeedsState(state, parse(data));
        state.form.processState = 'finished';
      });
  });

  container.addEventListener('DOMNodeInserted', () => {
    state.form.processState = 'filling';
    state.form.valid = false;
    state.form.fields.url = '';
  });

  watch(state);
};
