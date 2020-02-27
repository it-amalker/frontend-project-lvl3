import { watch } from 'melanke-watchjs';

const renderFeedList = (state) => {
  const container = document.querySelector('.container-fluid');
  const ul = document.createElement('ul');
  ul.classList.add('list-group', 'list-group-flush');
  state.feeds.forEach((feed) => {
    const li = document.createElement('li');
    li.classList.add('list-group-item');
    li.innerHTML = `<b>${feed.title}</b> - ${feed.description}`;
    state.posts.forEach((post) => {
      if (feed.id === post.id) {
        const postList = document.createElement('ul');
        postList.classList.add('list-group');
        const postItem = document.createElement('li');
        postItem.classList.add('list-group-item', 'pb-0', 'pt-0', 'border-0');
        postItem.innerHTML = `<a href="${post.link}">${post.title}</a>`;
        postList.appendChild(postItem);
        li.appendChild(postList);
      }
    });
    ul.appendChild(li);
  });
  if (container.childNodes) {
    container.innerHTML = '';
  }
  container.appendChild(ul);
};

const renderErrors = (errors) => {
  const errorNames = Object.keys(errors);
  const errContainer = document.querySelector('.error-container');
  if (errContainer.childNodes) {
    errContainer.innerHTML = '';
  }
  if (errorNames.length > 0) {
    errorNames.forEach((name) => {
      const div = document.createElement('div');
      div.classList.add('alert', 'alert-danger', 'pb-0', 'pt-0', 'mb-1');
      div.innerHTML = `<strong>Ouch...Houston, we’ve had a problem: </strong> ${errors[name]}`;
      errContainer.appendChild(div);
    });
  }
};

export default (state) => {
  const inputField = document.querySelector('.form-control');
  const submitButton = document.querySelector('.btn');

  watch(state.form, 'valid', () => {
    submitButton.disabled = !state.form.valid;
  });

  watch(state.form, 'fields', () => {
    const inputValue = state.form.fields.url;
    if (inputValue === '') {
      inputField.classList.remove('is-invalid', 'is-valid');
    } else {
      inputField.classList.add(state.form.valid ? 'is-valid' : 'is-invalid');
      inputField.classList.remove(state.form.valid ? 'is-invalid' : 'is-valid');
    }
  });

  watch(state.form, 'errors', () => {
    renderErrors(state.form.errors);
  });

  watch(state.form, 'processState', () => {
    const { processState } = state.form;
    switch (processState) {
      case 'filling':
        submitButton.disabled = false;
        inputField.value = '';
        inputField.classList.remove('is-valid');
        break;
      case 'sending':
        submitButton.disabled = true;
        break;
      case 'finished':
        console.log('Success!!');
        renderFeedList(state);
        break;
      default:
        throw new Error(`Unknown state: ${processState}`);
    }
  });
};
