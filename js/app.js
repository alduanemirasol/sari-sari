// ============================================================
// APP INIT
// ============================================================

function confirmResetDb() {
  if (
    !confirm("I-reset ang lahat ng data sa demo data? Hindi na mababawi ito!")
  )
    return;
  resetDb();
  location.reload();
}

// Boot
const isLoggedIn = authInit();
if (!isLoggedIn) {
  showLoginScreen();
} else {
  onAfterLogin();
}
