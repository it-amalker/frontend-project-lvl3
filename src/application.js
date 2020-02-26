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
      const postLink = post.querySelector('a').href;
      state.posts.push({ id, title: postTitle, link: postLink });
    }
  });
};

export default () => {
  const state = {
    form: {
      processState: 'filling',
      fields: {
        url: '',
      },
      valid: false,
    },
    feeds: [],
    posts: [],
  };

  const form = document.querySelector('.form');
  const inputField = document.querySelector('.form-control');
  const container = document.querySelector('.container-fluid');


  inputField.addEventListener('input', (e) => {
    const inputedUrl = e.target.value;
    state.form.fields.url = inputedUrl;
    schema
      .isValid({
        feed: inputedUrl,
      })
      .then((inputValid) => {
        const isFeedAlreadyExist = state.feeds.filter((feed) => feed.url === inputedUrl).length > 0;
        state.form.valid = inputValid && !isFeedAlreadyExist && inputedUrl !== '';
      });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.processState = 'sending';
    const feedHost = state.form.fields.url.replace(/^https?:\/\//i, '');
    const proxy = 'https://cors-anywhere.herokuapp.com/';
    axios.get(`${proxy}${feedHost}`)
      .then((response) => response.data)
      .catch((error) => {
        state.form.processState = 'filling';
        console.log(error);
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
    console.log(state);
  });

  watch(state);
};
