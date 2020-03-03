import * as yup from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import en from './locales/en';
import getFeedData from './parser';
import watch from './watchers';

const schema = yup.object().shape({
  feed: yup.string().url(),
});

const getProxyUrl = (url) => {
  const proxy = 'https://cors-anywhere.herokuapp.com/';
  const feedHost = url.replace(/^https?:\/\//i, '');
  return `${proxy}${feedHost}`;
};

const resetFormState = (feedState) => {
  const state = feedState;
  state.form.valid = false;
  state.form.fields.url = '';
};

const updatePostsState = (feedState, posts, id) => {
  const state = feedState;
  posts.forEach((post) => {
    state.posts.unshift({ ...post, id });
  });
  state.lastUpdate = Date.now();
};

const updateFeedsState = (state, feedData) => {
  const [feed, posts] = feedData;
  state.feeds.unshift({ ...feed, url: state.form.fields.url });
  updatePostsState(state, posts, feed.id);
};

const validate = (inputValid, feedState) => {
  const state = feedState;
  const errors = [];
  const inputedValue = state.form.fields.url;
  const isFeedAlreadyExist = state.feeds.find((feed) => feed.url === inputedValue);
  if (inputedValue === '') {
    errors.push('emptyInput');
  } else if (isFeedAlreadyExist) {
    errors.push('feedAlreadyExist');
  } else if (!inputValid) {
    errors.push('invalidUrl');
  }
  state.form.errors = errors;

  return errors.length < 1;
};

const autoupdate = (feedState) => {
  console.log(feedState.form.processState);
  const state = feedState;
  state.updated = true;
  state.feeds.forEach((feed) => {
    axios.get(getProxyUrl(feed.url))
      .then((response) => response.data)
      .catch(() => {
        state.form.errors = [...state.form.errors, 'networkUpdateIssue'];
      })
      .then((data) => {
        const [, posts] = getFeedData(data);
        const newPosts = [...posts].filter((post) => Date.parse(post.date) > state.lastUpdate);
        if (newPosts.length > 0) {
          updatePostsState(state, newPosts, feed.id);
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
      errors: [],
    },
    feeds: [],
    posts: [],
    updated: true,
    lastUpdate: 0,
  };

  const form = document.querySelector('.form');
  const inputField = document.querySelector('.form-control');

  inputField.addEventListener('input', (e) => {
    state.form.processState = 'filling';
    state.form.fields.url = e.target.value;
    schema
      .isValid({
        feed: e.target.value,
      })
      .then((inputValid) => {
        state.form.valid = validate(inputValid, state);
      });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.processState = 'sending';
    axios.get(getProxyUrl(state.form.fields.url))
      .then((response) => [response.data, response.headers])
      .catch(() => {
        state.form.processState = 'filling';
        resetFormState(state);
        state.form.errors = [...state.form.errors, 'networkSubmitIssue'];
      })
      .then(([data, headers]) => {
        const isXmlData = headers['content-type'].includes('xml');
        if (isXmlData) {
          updateFeedsState(state, getFeedData(data));
          resetFormState(state);
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
        resetFormState(state);
        state.form.errors = [...state.form.errors, 'unsupportedFeedFormat'];
      });
  });

  watch(state);
};
