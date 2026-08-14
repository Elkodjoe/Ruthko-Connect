// Phase 26: shared public form behavior — success, error, duplicate-submission guard
(function () {
  'use strict';

  function getSourcePage() {
    return (window.location.pathname || '').split('/').pop().replace('.html', '') || 'direct';
  }

  function showSuccess(formEl, opts) {
    opts = opts || {};
    formEl.style.display = 'none';
    var panel = document.getElementById('successPanel');
    if (panel) {
      panel.classList.remove('hidden');
      return;
    }
    var div = document.createElement('div');
    div.id = 'successPanel';
    div.className = 'glass border border-green-700 rounded-3xl p-8 text-center mt-4';
    div.innerHTML =
      '<div class="text-5xl mb-4">✅</div>' +
      '<h2 class="text-2xl font-bold text-green-400 mb-2">' + (opts.title || 'Submission Received!') + '</h2>' +
      '<p class="text-zinc-300">' + (opts.message || 'Thank you. A Ruthko team member will review your submission and reach out shortly.') + '</p>' +
      '<a href="index.html" class="inline-block mt-6 btn-primary px-6 py-3 rounded-xl font-bold text-sm">Return to Home</a>';
    var container = formEl.parentElement || document.body;
    container.appendChild(div);
  }

  function showError(formEl, message) {
    var banner = formEl.querySelector('.ruthko-form-error');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'ruthko-form-error bg-red-900/40 border border-red-700 text-red-300 rounded-xl p-4 text-sm mb-4';
      formEl.insertBefore(banner, formEl.firstChild);
    }
    banner.textContent = message || 'Something went wrong. Please try again.';
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearError(formEl) {
    formEl.querySelectorAll('.ruthko-form-error').forEach(function (el) { el.remove(); });
  }

  async function handleFormSubmit(formEl, submissionData, opts) {
    opts = opts || {};
    var submitBtn = formEl.querySelector('[type="submit"]');
    var originalText = submitBtn ? submitBtn.textContent : '';

    if (submitBtn && submitBtn.disabled) return; // prevent duplicate submit

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
    }

    clearError(formEl);

    try {
      var result;
      if (window.ruthkoCrmIntake) {
        result = await window.ruthkoCrmIntake.submit(submissionData);
      } else {
        // minimal fallback if service not loaded
        var local = [];
        try { local = JSON.parse(localStorage.getItem('ruthko_intake_submissions_v1') || '[]'); } catch (_) {}
        var id = Date.now().toString(36);
        local.unshift(Object.assign({ id: id, created_at: new Date().toISOString() }, submissionData));
        localStorage.setItem('ruthko_intake_submissions_v1', JSON.stringify(local.slice(0, 200)));
        result = { ok: true, source: 'local' };
      }

      if (result.ok) {
        showSuccess(formEl, opts.success);
        if (opts.onSuccess) opts.onSuccess(result);
      } else {
        showError(formEl, opts.errorMessage || (result.error ? String(result.error) : 'Submission failed. Please try again.'));
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
      }
    } catch (err) {
      showError(formEl, 'A network error occurred. Please check your connection and try again.');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
    }
  }

  window.ruthkoPublicForms = {
    submit: handleFormSubmit,
    showSuccess: showSuccess,
    showError: showError,
    clearError: clearError,
    getSourcePage: getSourcePage
  };
})();
