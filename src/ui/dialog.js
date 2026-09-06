export function createDialog({ sheet, backdrop, app, trigger, title, onClose = () => {} }) {
  let previous = null;
  let swipeStart = null;
  function open() {
    previous = document.activeElement;
    sheet.hidden = false; backdrop.hidden = false;
    sheet.removeAttribute('aria-hidden'); sheet.classList.add('is-open');
    app.inert = true; title.focus();
  }
  function close() {
    app.inert = false;
    (previous?.isConnected ? previous : trigger)?.focus();
    sheet.classList.remove('is-open'); sheet.hidden = true; sheet.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    onClose();
  }
  sheet.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key !== 'Tab') return;
    const focusable = [...sheet.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')].filter((el) => !el.disabled && el.getClientRects().length);
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === title)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  sheet.querySelector('.sheet-handle')?.addEventListener('pointerdown', (event) => { swipeStart = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); });
  sheet.querySelector('.sheet-handle')?.addEventListener('pointerup', (event) => { if (swipeStart !== null && event.clientY - swipeStart >= 60) close(); swipeStart = null; });
  return { open, close };
}

export function rovingKeys(event) {
  const role = event.target.getAttribute('role');
  if (!['tab', 'radio'].includes(role) || !['ArrowLeft', 'ArrowRight', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  const group = event.target.closest('[role="tablist"], [role="radiogroup"]');
  const buttons = [...group.querySelectorAll(`[role="${role}"]`)];
  let index = buttons.indexOf(event.target);
  if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = buttons.length - 1;
  else index = (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + buttons.length) % buttons.length;
  event.preventDefault(); buttons[index].focus(); buttons[index].click();
}
