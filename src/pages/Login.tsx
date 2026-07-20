import { Link } from 'react-router-dom'
import { loginImages } from '../data/images.ts'
import { Field, PasswordField, Button } from '../components/ui.tsx'
import { HeroMedia } from '../components/media.tsx'
import { useForm, SuccessPanel, required } from '../components/forms.tsx'
import type { LoginPayload } from '../types.ts'

export default function Login() {
  // Own-property photo, never generic stock (§6.8). Dark placeholder until then.
  const bg = loginImages[0]

  const f = useForm<LoginPayload>(
    { id: '', password: '', remember: false },
    (v) => {
      const e: Partial<Record<keyof LoginPayload, string>> = {}
      if (!required(v.id)) e.id = 'Enter your email or username'
      if (!required(v.password)) e.password = 'Enter your password'
      return e
    }
  )

  return (
    <section className="auth scrim">
      <HeroMedia src={bg} />
      <div className="auth__card">
        <div className="auth__header">
          <span className="wordmark wordmark--auth">
            <span className="wordmark__main">QUADIS<sup>™</sup></span>
            <span className="wordmark__sub">HOTELS</span>
          </span>
          <p className="auth__welcome">Welcome back! Please login to continue</p>
        </div>
        <div className="auth__body">
          {f.done ? (
            <SuccessPanel title="Signed in">You're logged in. Enjoy your stay planning with Quadis.</SuccessPanel>
          ) : (
            <form className="auth__form" onSubmit={f.submit()} noValidate>
              <Field label="Email or Username" value={f.values.id} onChange={f.set('id')} error={f.errors.id} autoComplete="username" />
              <PasswordField label="Password" value={f.values.password} onChange={f.set('password')} error={f.errors.password} autoComplete="current-password" />
              <div className="auth__row">
                <label className="checkbox">
                  <input type="checkbox" checked={f.values.remember} onChange={f.set('remember')} /> <span>Remember me</span>
                </label>
                <Link to="/login" className="auth__link">Forgot password?</Link>
              </div>
              <Button as="button" type="submit" variant="primary" className="auth__submit" disabled={f.pending}>
                {f.pending ? 'Signing in…' : 'LOGIN TO ACCOUNT'}
              </Button>
            </form>
          )}
          <p className="auth__alt">New to Quadis? <Link to="/register">Create an account</Link></p>
        </div>
      </div>
    </section>
  )
}
