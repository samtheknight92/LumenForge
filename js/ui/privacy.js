/**
 * Sidebar "Privacy, terms & your data" dialog, plus its "Delete everything on
 * this device" button. The text itself lives in index.html.
 */
// Namespace import: a browser still holding an older cached storage.js won't fail to boot.
import * as storage from '../core/storage.js'
import { toast } from '../core/utils.js'

export function setupPrivacy() {
  const dialog = document.querySelector('#privacy-dialog')
  if (!dialog) return

  document.addEventListener('click', event => {
    if (event.target.closest('#open-privacy, [data-open-privacy]')) {
      event.preventDefault()
      document.querySelector('#feedback-dialog[open]')?.close()
      dialog.showModal()
      dialog.querySelector('[data-privacy-close]')?.focus()
    }
  })

  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target.closest('[data-privacy-close]')) {
      dialog.close()
      return
    }
    if (!event.target.closest('[data-delete-all-data]')) return
    const sure = window.confirm('Delete ALL characters, notes, homebrew and settings saved in this browser?\n\nThis cannot be undone. Press Cancel if you want to use Export Save first.')
    if (!sure) return
    if (typeof storage.wipeAllSavedData !== 'function' || !storage.wipeAllSavedData()) {
      toast('Could not delete the saved data. Try clearing this site\'s data in your browser settings.')
      return
    }
    // Reload without any ?tab=... in the address so the app starts fresh.
    window.location.replace(window.location.pathname)
  })
}
