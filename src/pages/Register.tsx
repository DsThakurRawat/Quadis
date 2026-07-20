import { Link } from 'react-router-dom'
import { registerImages } from '../data/images.ts'
import { Field, PasswordField, Button } from '../components/ui.tsx'
import { HeroMedia } from '../components/media.tsx'
import { useForm, SuccessPanel, isEmail, isPhone, required } from '../components/forms.tsx'
import type { RegisterPayload } from '../types.ts'

export default function Register() {
  const bg = registerImages[0]

  const f = useForm<RegisterPayload>(
    { fullName: '', username: '', email: '', phone: '', password: '', referral: '', terms: false },
    (v) => {
      const e: Partial<Record<keyof RegisterPayload, string>> = {}
      if (!required(v.fullName)) e.fullName = 'Enter your full name'
      if (!required(v.username)) e.username = 'Choose a username'
      if (!isEmail(v.email)) e.email = 'Enter a valid email'
      if (!isPhone(v.phone)) e.phone = 'Enter a valid 10-digit phone'
      if (!v.password || v.password.length < 6) e.password = 'Minimum 6 characters'
      if (!v.terms) e.terms = 'Please accept the terms to continue'
      return e
    }
  )

  return (
    <section className="auth scrim">
      <HeroMedia src={bg} />
      <div className="auth__card auth__card--wide">
        <div className="auth__header">
          <span className="wordmark wordmark--auth">
            <span className="wordmark__main">QUADIS<sup>™</sup></span>
            <span className="wordmark__sub">HOTELS</span>
          </span>
          <p className="auth__welcome">Create your account in seconds</p>
        </div>
        <div className="auth__body">
          {f.done ? (
            <SuccessPanel title="Account created">Welcome to Quadis. You can now sign in and start planning your stay.</SuccessPanel>
          ) : (
            <form className="auth__form" onSubmit={f.submit()} noValidate>
              <div className="auth__two">
                <Field label="Full name" value={f.values.fullName} onChange={f.set('fullName')} error={f.errors.fullName} autoComplete="name" />
                <Field label="Username" value={f.values.username} onChange={f.set('username')} error={f.errors.username} autoComplete="username" />
              </div>
              <Field label="Email" type="email" value={f.values.email} onChange={f.set('email')} error={f.errors.email} autoComplete="email" />
              <Field label="Phone" type="tel" value={f.values.phone} onChange={f.set('phone')} error={f.errors.phone} placeholder="+91 " autoComplete="tel" />
              <PasswordField label="Password" value={f.values.password} onChange={f.set('password')} error={f.errors.password} autoComplete="new-password" />
              <Field label="Referral ID (optional)" value={f.values.referral} onChange={f.set('referral')} />
              <label className={`checkbox checkbox--terms ${f.errors.terms ? 'is-error' : ''}`}>
                <input type="checkbox" checked={f.values.terms} onChange={f.set('terms')} aria-invalid={!!f.errors.terms} />
                <span>I agree to the <Link to="/contactus">Terms</Link> &amp; <Link to="/contactus">Privacy Policy</Link></span>
              </label>
              {f.errors.terms && <span className="field__error" role="alert">{f.errors.terms}</span>}
              <Button as="button" type="submit" variant="primary" className="auth__submit" disabled={f.pending}>
                {f.pending ? 'Creating…' : 'CREATE FREE ACCOUNT'}
              </Button>
            </form>
          )}
          <p className="auth__alt">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
      </div>
    </section>
  )
}
