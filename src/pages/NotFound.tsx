import { Button } from '../components/ui.tsx'

export default function NotFound() {
  return (
    <section className="section bg-cream">
      <div className="container center-col stack" style={{ gap: 24, minHeight: '46vh', justifyContent: 'center' }}>
        <span className="overline">404</span>
        <h1 className="h2">This page has checked out</h1>
        <p className="lead" style={{ maxWidth: 520 }}>
          The page you're looking for isn't here. Let's get you back to a warm welcome.
        </p>
        <Button to="/" variant="primary">RETURN HOME</Button>
      </div>
    </section>
  )
}
