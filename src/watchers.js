import { watch } from 'melanke-watchjs';
import i18next from 'i18next';
import _ from 'lodash';
import generateFeedCards from './componets';

const debounce = () => {
  let setTimeoutId;
  return (fn, delay) => {
    if (setTimeoutId) {
      clearTimeout(setTimeoutId);
    }
    setTimeoutId = setTimeout(fn, delay);
  };
};

const setDelay = debounce();

const removeErrors = () => {
  const errorContainer = document.querySelector('.error-container');
  if (errorContainer.childNodes) {
    errorContainer.innerHTML = '';
  }
};

const renderErrors = (errors) => {
  const errorContainer = document.querySelector('.error-container');
  removeErrors();

  _.uniq(errors).forEach((errorName) => {
    const div = document.createElement('div');
    div.classList.add('alert', 'alert-danger', 'pb-0', 'pt-0', 'mb-1');
    div.innerHTML = `<strong>${i18next.t('alerts.problem')}</strong> ${i18next.t(`errors.${errorName}`)}`;
    errorContainer.appendChild(div);
  });

  const delay = 5;
  setDelay(removeErrors, delay * 1000);
};

const removeAlerts = () => {
  const alertContainer = document.querySelector('.alert-container');
  if (alertContainer.childNodes) {
    alertContainer.innerHTML = '';
  }
};

const renderAlert = (state) => {
  removeAlerts();
  const alertContainer = document.querySelector('.alert-container');
  const { processState } = state.form;
  const alertPropertiesByProcessState = {
    sending: { alertType: 'primary', delay: 120 },
    finished: { alertType: 'success', delay: 10 },
  };
  const { alertType, delay } = alertPropertiesByProcessState[processState];

  const div = document.createElement('div');
  div.classList.add('alert', `alert-${alertType}`, 'pb-0', 'pt-0', 'mb-1');
  div.innerHTML = `<strong>${i18next.t(`alerts.${processState}`)}</strong>`;
  alertContainer.appendChild(div);
  setDelay(removeAlerts, delay * 1000);
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
      inputField.value = '';
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
    if (!state.updated) {
      generateFeedCards(state.feeds, state.posts);
    }
  });

  watch(state.form, 'processState', () => {
    const { processState } = state.form;
    switch (processState) {
      case 'filling':
        removeAlerts();
        break;
      case 'sending':
        submitButton.disabled = true;
        renderAlert(state);
        break;
      case 'finished':
        renderAlert(state);
        generateFeedCards(state.feeds, state.posts);
        break;
      case 'failed':
        removeAlerts();
        break;
      default:
        throw new Error(`Unknown state: ${processState}`);
    }
  });
};
