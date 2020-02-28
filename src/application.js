import _ from 'lodash';
import i18next from 'i18next';
import en from './locales/en';
import parse from './parser';
import watch from './watchers';

const yup = require('yup');
const axios = require('axios').default;

const schema = yup.object().shape({
  feed: yup.string().url(),
});

const getProxyUrl = (url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com/';
  const feedHost = url.replace(/^https?:\/\//i, '');
  return `${proxy}${feedHost}`;
};

const updateFeedsState = (feedState, feedHTML) => {
  const state = feedState;
  const id = _.uniqueId();
  const title = feedHTML.querySelector('title').innerText;
  const description = feedHTML.querySelector('description').innerText;
  state.feeds.unshift({
    id, title, description, url: state.form.fields.url,
  });

  const postItems = feedHTML.querySelectorAll('item');
  postItems.forEach((post) => {
    const postTitle = post.querySelector('title').innerText.replace('<![CDATA[', '').replace(']]>', '');
    const postLink = post.querySelector('a') ? post.querySelector('a').href : post.querySelector('link').innerText;
    state.posts.push({ id, title: postTitle, link: postLink });
  });
  state.lastUpdate = Date.now();
};

const addNewPosts = (feed, posts, feedState) => {
  const state = feedState;
  const feedID = feed.id;
  posts.forEach((post) => {
    const postTitle = post.querySelector('title').innerText.replace('<![CDATA[', '').replace(']]>', '');
    const postLink = post.querySelector('a') ? post.querySelector('a').href : post.querySelector('link').innerText;
    state.posts.unshift({ id: feedID, title: postTitle, link: postLink });
  });
  state.lastUpdate = Date.now();
};

const validate = (inputValid, state) => {
  const errors = {};
  const inputedValue = state.form.fields.url;
  const isFeedAlreadyExist = state.feeds.filter((feed) => feed.url === inputedValue).length > 0;
  if (inputedValue === '') {
    errors.emptyInput = i18next.t('errors.emptyInput');
  } else if (isFeedAlreadyExist) {
    errors.alreadyExist = i18next.t('errors.feedAlreadyExist', { value: inputedValue });
  } else if (!inputValid) {
    errors.invalidUrl = i18next.t('errors.invalidUrl');
  }
  return errors;
};

const autoupdate = (feedState) => {
  const state = feedState;
  state.updated = true;
  state.feeds.forEach((feed) => {
    axios.get(getProxyUrl(feed.url))
      .then((response) => response.data)
      .catch(() => {
        console.log('Network problems');
      })
      .then((data) => {
        const html = parse(data);
        const posts = html.querySelectorAll('item');
        const newPosts = [...posts].filter((post) => {
          const postDate = post.querySelector('pubdate').innerText;
          return Date.parse(postDate) > state.lastUpdate;
        });
        if (newPosts.length > 0) {
          addNewPosts(feed, newPosts, state);
          state.updated = false;
        }
      });
  });
  setTimeout(autoupdate, 15 * 1000, state);
};

export default () => {
  i18next.init({
    lng: 'en',
    debug: true,
    resources: {
      en,
    },
  });

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
    updated: true,
    lastUpdate: 0,
  };

  const form = document.querySelector('.form');
  const inputField = document.querySelector('.form-control');
  const feedsContainer = document.querySelector('.accordion');

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
    axios.get(getProxyUrl(state.form.fields.url))
      .then((response) => response.data)
      .catch(() => {
        state.form.processState = 'filling';
        state.form.errors = { network: i18next.t('errors.networkIssue') };
      })
      .then((data) => {
        updateFeedsState(state, parse(data));
        state.form.processState = 'finished';
        if (state.feeds.length < 2) {
          autoupdate(state);
        }
      });
  });

  feedsContainer.addEventListener('DOMNodeInserted', () => {
    state.form.processState = 'filling';
    state.form.valid = false;
    state.form.fields.url = '';
  });

  watch(state);
};
