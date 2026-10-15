/**
 * Contact form — honest submission behaviour.
 * - Client-side validation with inline, announced errors.
 * - If PUBLIC_CONTACT_ENDPOINT is not configured, nothing is sent and the form says so.
 * - If configured, the form POSTs JSON and reports success only on a 2xx response.
 */
/** Accept only HTTPS endpoints (plain HTTP only for localhost during development). */
const validEndpoint = (raw: string): string => {
  if (!raw) return '';
  try {
    const u = new URL(raw);
    const local = ['localhost', '127.0.0.1'].includes(u.hostname);
    if (u.protocol === 'https:' || (u.protocol === 'http:' && local)) return u.href;
  } catch {}
  console.warn('[contact] PUBLIC_CONTACT_ENDPOINT is not a valid HTTPS URL; submissions are disabled.');
  return '';
};
const ENDPOINT = validEndpoint((import.meta.env.PUBLIC_CONTACT_ENDPOINT ?? '').trim());
const TIMEOUT_MS = 15000;

/** A submission counts as delivered only on a 2xx response whose body (if JSON)
 *  does not report an error — some form services answer 200 with { ok: false }. */
const confirmed = async (res: Response): Promise<boolean> => {
  if (!res.ok) return false;
  if (!(res.headers.get('content-type') ?? '').includes('json')) return true;
  try {
    const body = (await res.json()) as Record<string, unknown>;
    return body.ok !== false && body.success !== false && !body.error && !body.errors;
  } catch {
    return false; // claimed JSON but unparseable: do not claim success
  }
};

export const initContactForm = (): void => {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;
  const status = form.querySelector<HTMLElement>('[data-form-status]')!;
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  form.noValidate = true;

  const messages: Record<string, string> = {
    name: 'Please enter your name.',
    email: 'Please enter a valid e-mail address.',
    message: 'Please add a short message (at least 20 characters).',
    consent: 'Please confirm we may use these details to reply.',
  };

  const setError = (field: HTMLInputElement | HTMLTextAreaElement, msg: string | null): void => {
    const err = form.querySelector<HTMLElement>(`[data-error-for="${field.name}"]`);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg ?? '';
  };

  const validate = (field: HTMLInputElement | HTMLTextAreaElement): boolean => {
    let ok = field.checkValidity();
    if (field.name === 'message' && field.value.trim().length < 20) ok = false;
    if (field.type === 'checkbox') ok = (field as HTMLInputElement).checked;
    setError(field, ok ? null : messages[field.name] ?? 'Please check this field.');
    return ok;
  };

  const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-validate]')];
  fields.forEach((f) =>
    f.addEventListener('blur', () => {
      if (f.value || f.getAttribute('aria-invalid') === 'true') validate(f);
    }),
  );

  const say = (kind: 'error' | 'info' | 'success', text: string): void => {
    status.dataset.kind = kind;
    status.textContent = text;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = fields.filter((f) => !validate(f));
    if (invalid.length) {
      say('error', `Please correct ${invalid.length === 1 ? 'the highlighted field' : `the ${invalid.length} highlighted fields`}.`);
      invalid[0].focus();
      return;
    }
    // Honeypot: real people never fill this hidden field.
    const trap = form.querySelector<HTMLInputElement>('input[name="company_site"]');
    if (trap?.value) {
      say('error', 'Your message could not be sent. Please clear any auto-filled hidden fields and try again.');
      return;
    }

    if (!ENDPOINT) {
      say(
        'info',
        'Your message has not been sent: online enquiries are not connected yet on this site. Nothing was stored or transmitted.',
      );
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    delete data.company_site;
    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    say('info', 'Sending…');
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        signal: ctrl.signal,
        credentials: 'omit',
        referrerPolicy: 'strict-origin-when-cross-origin',
      });
      if (!(await confirmed(res))) throw new Error(String(res.status));
      form.reset();
      fields.forEach((f) => f.setAttribute('aria-invalid', 'false'));
      say('success', 'Thank you — your message was received. We will reply to the address you provided.');
    } catch {
      say('error', 'Your message could not be sent. Please try again in a moment.');
    } finally {
      window.clearTimeout(timer);
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
    }
  });
};
