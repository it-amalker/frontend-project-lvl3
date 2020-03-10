import * as yup from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import _ from 'lodash';
import en from './locales/en';
import getFeedElement from './parser';
import watch from './watchers';

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

const createFeed = (feedEl, url) => {
  const id = _.uniqueId();
  const titleEl = feedEl.querySelector('title');
  const descriptionEl = feedEl.querySelector('description');
  return {
    id, title: titleEl.innerText, description: descriptionEl.innerText, url,
  };
};

const createPosts = (feedEl, id) => {
  const postItems = feedEl.querySelectorAll('item');
  const reversedPosts = _.reverse([...postItems]);
  const posts = reversedPosts.map((post) => {
    const postTitleEl = post.querySelector('title');
    const postTitle = postTitleEl.innerText.replace('<![CDATA[', '').replace(']]>', '');
    const postLinkEl = post.querySelector('a');
    const postLinkElAlternative = post.querySelector('link');
    const postLink = postLinkEl ? postLinkEl.href : postLinkElAlternative.innerText;
    const postDateEl = post.querySelector('pubdate');
    const postDate = postDateEl.innerText;
    return {
      title: postTitle, link: postLink, date: postDate, id,
    };
  });
  return posts;
};

const updatePosts = (feedState, posts) => {
  const state = feedState;
  posts.forEach((post) => {
    state.posts.unshift(post);
  });
  state.lastUpdatedAt = Date.now();
};

const addNewFeed = (state, feedEl) => {
  const feed = createFeed(feedEl, state.form.fields.url);
  state.feeds.unshift(feed);

  const posts = createPosts(feedEl, feed.id);
  updatePosts(state, posts);
};

const autoupdate = (feedState) => {
  const state = feedState;
  state.updated = true;
  state.feeds.forEach((feed) => {
    axios.get(getProxyUrl(feed.url))
      .then((response) => [response.data, response.headers])
      .catch(() => {
        state.form.errors = [...state.form.errors, 'networkUpdateIssue'];
      })
      .then(([data, headers]) => {
        const feedEl = getFeedElement(data, headers);
        const posts = createPosts(feedEl, feed.id);
        const newPosts = [...posts].filter((post) => Date.parse(post.date) > state.lastUpdatedAt);
        if (newPosts.length > 0) {
          updatePosts(state, newPosts);
          state.updated = false;
        }
      });
  });
  setTimeout(autoupdate, 5 * 1000, state);
};

const validate = (state) => {
  const inputedValue = state.form.fields.url;
  const schema = yup.object().shape({
    feed: yup.string().url(),
  });
  const isFeedAlreadyExist = state.feeds.find((feed) => feed.url === inputedValue);
  return schema
    .isValid({ feed: inputedValue })
    .then((isValid) => {
      const errors = [];
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
    });
};

const updateValidateState = (feedState, errorsPromise) => {
  const state = feedState;
  errorsPromise.then((errors) => {
    state.form.errors = errors;
    state.form.valid = errors.length < 1;
  });
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
    const errorsPromise = validate(state);
    updateValidateState(state, errorsPromise);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.processState = 'sending';
    axios.get(getProxyUrl(state.form.fields.url))
      .then((response) => [response.data, response.headers])
      .catch(() => {
        state.form.processState = 'failed';
        resetFormState(state);
        state.form.errors = [...state.form.errors, 'networkSubmitIssue'];
      })
      .then(([data, headers]) => {
        addNewFeed(state, getFeedElement(data, headers));
        state.form.processState = 'finished';
        resetFormState(state);
        if (state.feeds.length < 2) {
          autoupdate(state);
        }
      })
      .catch(() => {
        state.form.processState = 'failed';
        resetFormState(state);
        state.form.errors = [...state.form.errors, 'unsupportedFeedFormat'];
      });
  });

  watch(state);
};
