/* Sets light/dark and colour theme before the page paints (no flash). Kept as a
 * separate file so the page's Content-Security-Policy can forbid inline scripts. */
(function () {
  var theme = localStorage.getItem('lumenforge_theme') || 'midnight';
  if (theme === 'forge') theme = 'midnight';
  document.documentElement.setAttribute('data-theme', theme);
  var appearance = localStorage.getItem('lumenforge_appearance') || 'dark';
  document.documentElement.setAttribute('data-appearance', appearance === 'light' ? 'light' : 'dark');
})();
