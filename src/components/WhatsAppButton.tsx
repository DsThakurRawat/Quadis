import { IconWhatsapp } from './icons.tsx'

export default function WhatsAppButton() {
  return (
    <a
      className="wa-fab"
      href="https://wa.me/919217373532"
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with Quadis Hotels on WhatsApp"
    >
      <IconWhatsapp />
    </a>
  )
}
