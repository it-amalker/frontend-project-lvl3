import { watch } from 'melanke-watchjs';
import i18next from 'i18next';
import generateFeedCards from './componets';

const renderErrors = (errors) => {
  const alertContainer = document.querySelector('.alert-container');
  if (alertContainer.childNodes) {
    alertContainer.innerHTML = '';
  }
  if (errors.length > 0) {
    errors.forEach((error) => {
      const div = document.createElement('div');
      div.classList.add('alert', 'alert-danger', 'pb-0', 'pt-0', 'mb-1');
      div.innerHTML = `<strong>${i18next.t('alerts.problem')}</strong> ${i18next.t(`errors.${error}`)}`;
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
  const { processState } = state.form;
  const alertPropertiesByProcessState = {
    sending: { type: 'primary', delay: 120 },
    finished: { type: 'success', delay: 10 },
  };
  const { type: alertType, delay } = alertPropertiesByProcessState[processState];
  div.classList.add('alert', `alert-${alertType}`, 'pb-0', 'pt-0', 'mb-1');
  div.innerHTML = `<strong>${i18next.t(`alerts.${processState}`)}</strong>`;
  alertContainer.appendChild(div);
  setTimeout(removeAlert, delay * 1000);
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
    if (!state.updated) {
      generateFeedCards(state.feeds, state.posts);
    }
  });

  watch(state.form, 'processState', () => {
    const { processState } = state.form;
    const resetInput = () => {
      inputField.value = '';
      inputField.classList.remove('is-valid');
    };
    switch (processState) {
      case 'filling':
        resetInput();
        submitButton.disabled = false;
        break;
      case 'sending':
        submitButton.disabled = true;
        renderAlert(state);
        break;
      case 'finished':
        renderAlert(state);
        generateFeedCards(state.feeds, state.posts);
        resetInput();
        console.log('finished!!!!');
        break;
      default:
        throw new Error(`Unknown state: ${processState}`);
    }
  });
};
