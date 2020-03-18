import * as yup from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import _ from 'lodash';
import en from './locales/en';
import getFeedData from './parser';
import watch from './watchers';

const getProxyUrl = (url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com/';
  const feedUrl = new URL(url);
  const proxyUrl = new URL(`${feedUrl.host}${feedUrl.pathname}`, proxy);

  return proxyUrl.href;
};

const resetFormState = (feedState) => {
  const state = feedState;
  state.form.valid = false;
  state.form.fields.url = '';
};

const createFeed = (feedData, url) => {
  const id = _.uniqueId();
  const { title, description } = feedData;
  return {
    id, title, description, url,
  };
};

const createPosts = (feedData, id) => {
  const reversedPosts = _.reverse(feedData.posts);
  return reversedPosts.map((post) => ({ ...post, id }));
};

const updatePosts = (feedState, posts) => {
  const state = feedState;
  posts.forEach((post) => {
    state.posts.unshift(post);
  });
  state.lastUpdatedAt = Date.now();
};

const addNewFeed = (state, feedData) => {
  const feed = createFeed(feedData, state.form.fields.url);
  state.feeds.unshift(feed);

  const posts = createPosts(feedData, feed.id);
  updatePosts(state, posts);
};

const autoupdate = (feedState) => {
  const state = feedState;
  const delayInSeconds = 5;
  state.updated = true;
  state.feeds.forEach(async (feed) => {
    try {
      const response = await axios.get(getProxyUrl(feed.url));
      const feedData = getFeedData(response.data);
      const posts = createPosts(feedData, feed.id);
      const newPosts = [...posts].filter((post) => Date.parse(post.date) > state.lastUpdatedAt);
      if (newPosts.length > 0) {
        updatePosts(state, newPosts);
        state.updated = false;
      }
    } catch {
      state.form.processState = 'failed';
      state.form.errors = [...state.form.errors, 'networkUpdateIssue'];
    }
  });
  setTimeout(autoupdate, delayInSeconds * 1000, state);
};

const validate = async (inputedValue, feeds) => {
  const schema = yup.object().shape({
    feed: yup.string().url(),
  });

  const errors = [];
  const isValid = await schema.isValid({ feed: inputedValue });
  const isFeedAlreadyExist = feeds.find((feed) => feed.url === inputedValue);
  if (!isValid) {
    errors.push('invalidUrl');
  }
  if (!inputedValue) {
    errors.push('emptyInput');
  }
  if (isFeedAlreadyExist) {
    errors.push('feedAlreadyExist');
  }
  return errors;
};

const updateValidateState = async (feedState, errorsPromise) => {
  const state = feedState;
  const errors = await errorsPromise;
  state.form.errors = errors;
  state.form.valid = errors.length < 1;
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
      errors: [],
    },
    feeds: [],
    posts: [],
    updated: true,
    lastUpdatedAt: 0,
  };

  const form = document.querySelector('.form');
  const inputField = document.querySelector('.form-control');

  inputField.addEventListener('input', (e) => {
    state.form.processState = 'filling';
    state.form.fields.url = e.target.value;
    const errorsPromise = validate(e.target.value, state.feeds);
    updateValidateState(state, errorsPromise);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.form.processState = 'sending';
    try {
      const response = await axios.get(getProxyUrl(state.form.fields.url));
      addNewFeed(state, getFeedData(response.data));
      state.form.processState = 'finished';
      resetFormState(state);
      if (state.feeds.length < 2) {
        autoupdate(state);
      }
    } catch (err) {
      state.form.processState = 'failed';
      resetFormState(state);
      if (err.response) {
        state.form.errors = [...state.form.errors, 'networkSubmitIssue'];
      } else {
        state.form.errors = [...state.form.errors, 'unsupportedFeedFormat'];
      }
    }
  });

  watch(state);
};
