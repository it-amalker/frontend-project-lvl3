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

const updatePostsState = (feedID, posts, feedState) => {
  const state = feedState;
  const reversedPosts = _.reverse([...posts]);
  reversedPosts.forEach((post) => {
    const postTitleEl = post.querySelector('title');
    const postTitle = postTitleEl.innerText.replace('<![CDATA[', '').replace(']]>', '');
    const postLinkEl = post.querySelector('a');
    const postLinkElAlternative = post.querySelector('link');
    const postLink = postLinkEl ? postLinkEl.href : postLinkElAlternative.innerText;
    state.posts.unshift({ id: feedID, title: postTitle, link: postLink });
  });
  state.lastUpdate = Date.now();
};

const updateFeedsState = (feedState, feedHTML) => {
  const state = feedState;
  const id = _.uniqueId();
  const titleEl = feedHTML.querySelector('title');
  const title = titleEl.innerText;
  const descriptionEl = feedHTML.querySelector('description');
  const description = descriptionEl.innerText;
  state.feeds.unshift({
    id, title, description, url: state.form.fields.url,
  });
  const postItems = feedHTML.querySelectorAll('item');
  updatePostsState(id, postItems, state);
};

const validate = (inputValid, state) => {
  const errors = {};
  const inputedValue = state.form.fields.url;
  const isFeedAlreadyExist = state.feeds.find((feed) => feed.url === inputedValue);
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
        state.form.errors = { network: i18next.t('errors.networkUpdateIssue') };
      })
      .then((data) => {
        const html = parse(data);
        const posts = html.querySelectorAll('item');
        const newPosts = [...posts].filter((post) => {
          const postDateEl = post.querySelector('pubdate');
          const postDate = postDateEl.innerText;
          return Date.parse(postDate) > state.lastUpdate;
        });
        if (newPosts.length > 0) {
          updatePostsState(feed.id, newPosts, state);
          state.updated = false;
        }
      });
  });
  setTimeout(autoupdate, 5 * 1000, state);
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
      .then((response) => [response.data, response.headers])
      .catch(() => {
        state.form.processState = 'filling';
        state.form.errors = { network: i18next.t('errors.networkSubmitIssue') };
      })
      .then(([data, headers]) => {
        const isXmlData = headers['content-type'].includes('xml');
        if (isXmlData) {
          updateFeedsState(state, parse(data));
          state.form.processState = 'finished';
          if (state.feeds.length < 2) {
            autoupdate(state);
          }
        } else {
          throw new Error('Unsupported content type');
        }
      })
      .catch(() => {
        state.form.processState = 'filling';
        state.form.errors = { network: i18next.t('errors.unsupportedFeedFormat') };
      });
  });

  feedsContainer.addEventListener('DOMNodeInserted', () => {
    state.form.processState = 'filling';
    state.form.valid = false;
    state.form.fields.url = '';
  });

  watch(state);
};
