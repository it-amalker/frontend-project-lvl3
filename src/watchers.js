import { watch } from 'melanke-watchjs';
import i18next from 'i18next';
import generateFeedCards from './componets';

const renderErrors = (errors) => {
  const errorNames = Object.keys(errors);
  const alertContainer = document.querySelector('.alert-container');
  if (alertContainer.childNodes) {
    alertContainer.innerHTML = '';
  }
  if (errorNames.length > 0) {
    errorNames.forEach((name) => {
      const div = document.createElement('div');
      div.classList.add('alert', 'alert-danger', 'pb-0', 'pt-0', 'mb-1');
      div.innerHTML = `<strong>${i18next.t('alerts.problem')}</strong> ${errors[name]}`;
      alertContainer.appendChild(div);
    });
  }
};

const renderAlert = (state) => {
  const alertContainer = document.querySelector('.alert-container');
  const removeAlert = () => {
    if (alertContainer.childNodes) {
      alertContainer.innerHTML = '';
    }
  };
  removeAlert();
  const div = document.createElement('div');
  const alertType = state.form.processState === 'sending' ? 'primary' : 'success';
  div.classList.add('alert', `alert-${alertType}`, 'pb-0', 'pt-0', 'mb-1');
  div.innerHTML = `<strong>${i18next.t(`alerts.${state.form.processState}`)}</strong>`;
  alertContainer.appendChild(div);
  setTimeout(removeAlert, 5 * 1000);
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

  watch(state, 'updated', () => {
    if (state.updated === false) {
      generateFeedCards(state.feeds, state.posts);
    }
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
        renderAlert(state);
        break;
      case 'finished':
        renderAlert(state);
        generateFeedCards(state.feeds, state.posts);
        break;
      default:
        throw new Error(`Unknown state: ${processState}`);
    }
  });
};
