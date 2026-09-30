/**
 * Sidebar "Send Feedback" dialog. The static site has no server, so the form
 * posts to Web3Forms, which emails it to FEEDBACK_EMAIL. "Copy text" is the
 * fallback when sending fails.
 */
import { FEEDBACK_ENDPOINT, FEEDBACK_ACCESS_KEY, FEEDBACK_EMAIL } from '../core/constants.js'
import { state } from '../core/state.js'
import { toast } from '../core/utils.js'

const APP_LABEL = 'LumenForge v5 (build 5.3.0)'
const MAX_MESSAGE_LENGTH = 4000
const KIND_LABELS = { bug: 'Bug', idea: 'Idea', other: 'Feedback' }

function readForm(form) {
  const kind = KIND_LABELS[form.elements.kind.value] ? form.elements.kind.value : 'other'
  return {
    kind,
    message: form.elements.message.value.trim().slice(0, MAX_MESSAGE_LENGTH),
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    includeInfo: form.elements.includeInfo.checked
  }
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

/**
 * The JSON Web3Forms expects. Web3Forms stored but did not email submissions
 * without `name` and `email`, so both are always sent; with no player email the
 * reply-to falls back to the feedback inbox itself.
 */
export function buildSubmission(fields, context = {}) {
  const feedback = buildFeedback(fields, context)
  const name = fields.name || 'LumenForge player'
  return {
    access_key: FEEDBACK_ACCESS_KEY,
    subject: `LumenForge ${feedback.title}`,
    from_name: name,
    name,
    email: fields.email || FEEDBACK_EMAIL,
    message: feedback.body
  }
}

async function submitFeedback(payload) {
  const response = await fetch(FEEDBACK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`)
}

export function setupFeedback() {
  const dialog = document.querySelector('#feedback-dialog')
  const form = dialog?.querySelector('form')
  if (!dialog || !form) return
  const sendButton = form.querySelector('[data-feedback-send="submit"]')
  const context = () => ({ tab: state.tab, userAgent: navigator.userAgent })

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
    const action = button.dataset.feedbackSend
    if (!action) return
    event.preventDefault()
    if (!form.elements.message.value.trim()) {
      toast('Write a message first.')
      form.elements.message.focus()
      return
    }
    const fields = readForm(form)
    if (action === 'copy') {
      const feedback = buildFeedback(fields, context())
      try {
        await navigator.clipboard.writeText(`${feedback.title}\n\n${feedback.body}`)
        toast(`Feedback copied. You can paste it into an email to ${FEEDBACK_EMAIL}.`)
      } catch {
        toast('Could not copy automatically. Select the message and copy it by hand.')
      }
      return
    }
    // Hidden field only bots fill in; pretend it worked.
    if (form.elements.botcheck.checked) {
      form.reset()
      dialog.close()
      return
    }
    sendButton.disabled = true
    sendButton.textContent = 'Sending...'
    try {
      await submitFeedback(buildSubmission(fields, context()))
      form.reset()
      dialog.close()
      toast('Thanks! Your feedback was sent.')
    } catch (error) {
      console.warn('Feedback send failed', error)
      toast(`Could not send right now. Use Copy text and email it to ${FEEDBACK_EMAIL}.`)
    } finally {
      sendButton.disabled = false
      sendButton.textContent = 'Send'
    }
  })

  // Clicking the dimmed area outside the card closes the dialog.
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close()
  })
}
