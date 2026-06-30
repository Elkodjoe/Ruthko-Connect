// Protect admin pages.
(function () {
  document.documentElement.classList.add('auth-checking');
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof window.ruthkoRequireAdmin === 'function') {
      window.ruthkoRequireAdmin();
    }
  });
})();
