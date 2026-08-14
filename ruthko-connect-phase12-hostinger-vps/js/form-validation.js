// Phase 26: client-side form validation for public intake forms
(function () {
  'use strict';

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function validatePhone(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    return d.length >= 7 && d.length <= 15;
  }

  function showErrors(formEl, errors) {
    clearErrors(formEl);
    if (!errors || !errors.length) return;
    const banner = document.createElement('div');
    banner.className = 'form-error-banner bg-red-900/40 border border-red-700 text-red-300 rounded-xl p-4 text-sm mb-4 space-y-1';
    banner.innerHTML = errors.map(function (e) { return '<p>• ' + e + '</p>'; }).join('');
    formEl.insertBefore(banner, formEl.firstChild);
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearErrors(formEl) {
    formEl.querySelectorAll('.form-error-banner').forEach(function (el) { el.remove(); });
  }

  function validate(formEl, opts) {
    opts = opts || {};
    var errors = [];
    var data = {};
    var labels = opts.labels || {};

    (opts.required || []).forEach(function (name) {
      var el = formEl.querySelector('[name="' + name + '"]');
      if (!el) return;
      var val = (el.type === 'checkbox') ? (el.checked ? el.value || 'yes' : '') : el.value.trim();
      if (!val) {
        errors.push((labels[name] || name.replace(/_/g, ' ')) + ' is required.');
      } else {
        data[name] = val;
      }
    });

    (opts.optional || []).forEach(function (name) {
      var el = formEl.querySelector('[name="' + name + '"]');
      if (el) {
        data[name] = (el.type === 'checkbox') ? el.checked : el.value.trim();
      }
    });

    if (data.email && !validateEmail(data.email)) {
      errors.push('Please enter a valid email address.');
    }

    if (data.phone && String(data.phone).length > 0 && !validatePhone(data.phone)) {
      errors.push('Please enter a valid phone number.');
    }

    if (opts.requireConsent) {
      var consentEl = formEl.querySelector('[name="consent_given"]');
      if (!consentEl || !consentEl.checked) {
        errors.push('You must agree to the consent statement to submit.');
      } else {
        data.consent_given = true;
      }
    }

    return { errors: errors, data: data };
  }

  window.ruthkoFormValidation = {
    validate: validate,
    validateEmail: validateEmail,
    validatePhone: validatePhone,
    showErrors: showErrors,
    clearErrors: clearErrors
  };
})();
