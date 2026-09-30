/**
 * Sidebar "Send Feedback" dialog. There is no server, so sending opens a
 * pre-filled GitHub issue or the player's email app; "Copy" is the fallback.
 */
import { FEEDBACK_ISSUES_URL, FEEDBACK_EMAIL } from '../core/constants.js'
import { state } from '../core/state.js'
import { toast } from '../core/utils.js'

const APP_LABEL = 'LumenForge v5 (build 5.2.2)'
// Browsers and GitHub cap URL length; keep the message well under it.
const MAX_MESSAGE_LENGTH = 4000
const KIND_LABELS = { bug: 'Bug', idea: 'Idea', other: 'Feedback' }

function readForm(form) {
  const kind = KIND_LABELS[form.elements.kind.value] ? form.elements.kind.value : 'other'
  const message = form.elements.message.value.trim().slice(0, MAX_MESSAGE_LENGTH)
  const includeInfo = form.elements.includeInfo.checked
  return { kind, message, includeInfo }
}

export function buildFeedback({ kind, message, includeInfo }, context = {}) {
  const firstLine = message.split('\n')[0].trim()
  const summary = firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine
  const title = `${KIND_LABELS[kind] || KIND_LABELS.other}: ${summary || 'no summary'}`
  const lines = [message]
  if (includeInfo) {
    lines.push('', '---', `App: ${APP_LABEL}`, `Tab: ${context.tab || 'unknown'}`, `Browser: ${context.userAgent || 'unknown'}`)
  }
  return { title, body: lines.join('\n') }
}

export function githubIssueUrl(feedback) {
  const params = new URLSearchParams({ title: feedback.title, body: feedback.body })
  return `${FEEDBACK_ISSUES_URL}?${params}`
}

export function mailtoUrl(feedback, address = FEEDBACK_EMAIL) {
  const params = new URLSearchParams({ subject: `LumenForge ${feedback.title}`, body: feedback.body })
  // mailto wants %20 for spaces, not +.
  return `mailto:${address}?${params.toString().replace(/\+/g, '%20')}`
}

function currentFeedback(form) {
  return buildFeedback(readForm(form), { tab: state.tab, userAgent: navigator.userAgent })
}

export function setupFeedback() {
  const dialog = document.querySelector('#feedback-dialog')
  const form = dialog?.querySelector('form')
  if (!dialog || !form) return
  const emailButton = form.querySelector('[data-feedback-send="email"]')
  if (emailButton) emailButton.hidden = !FEEDBACK_EMAIL

  document.querySelector('#open-feedback')?.addEventListener('click', () => {
    dialog.showModal()
    form.elements.message.focus()
  })

  form.addEventListener('click', async event => {
    const button = event.target.closest('button')
    if (!button || !form.contains(button)) return
    if (button.hasAttribute('data-feedback-cancel')) {
      dialog.close()
      return
    }
    const target = button.dataset.feedbackSend
    if (!target) return
    event.preventDefault()
    if (!form.elements.message.value.trim()) {
      toast('Write a message first.')
      form.elements.message.focus()
      return
    }
    const feedback = currentFeedback(form)
    if (target === 'copy') {
      try {
        await navigator.clipboard.writeText(`${feedback.title}\n\n${feedback.body}`)
        toast('Feedback copied. Paste it wherever you talk to your GM.')
      } catch {
        toast('Could not copy automatically. Select the message and copy it by hand.')
      }
      return
    }
    const url = target === 'email' ? mailtoUrl(feedback) : githubIssueUrl(feedback)
    window.open(url, '_blank', 'noopener')
    form.reset()
    dialog.close()
    toast(target === 'email' ? 'Opening your email app...' : 'Opening GitHub. Press "Create" there to send it.')
  })

  // Clicking the dimmed area outside the card closes the dialog.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close()
  })
}
