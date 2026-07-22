import type { SVGProps } from 'react'

// Minimal 20px line icons (no emoji per §1). Inherit currentColor.
type P = SVGProps<SVGSVGElement>
const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
}

export const IconSearch = (p: P) => (<svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>)
export const IconPin = (p: P) => (<svg {...base} width={14} height={14} {...p}><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>)
export const IconChevron = (p: P) => (<svg {...base} width={14} height={14} {...p}><path d="m6 9 6 6 6-6" /></svg>)
export const IconWifi = (p: P) => (<svg {...base} {...p}><path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 16a5 5 0 0 1 7 0" /><path d="M2 9a15 15 0 0 1 20 0" /><circle cx="12" cy="19" r="1" /></svg>)
export const IconAc = (p: P) => (<svg {...base} {...p}><rect x="3" y="5" width="18" height="8" rx="2" /><path d="M7 17c0 1.5-.8 2-2 2M12 17c0 1.5-.8 2-2 2M17 17c0 1.5-.8 2-2 2" /></svg>)
export const IconBreakfast = (p: P) => (<svg {...base} {...p}><path d="M4 8h13a3 3 0 0 1 0 6h-1" /><path d="M4 8v6a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8Z" /><path d="M8 2v2M11 2v2" /></svg>)
export const IconParking = (p: P) => (<svg {...base} {...p}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 16V8h3.5a2.5 2.5 0 0 1 0 5H9" /></svg>)
export const IconDesk = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>)
export const IconRoom = (p: P) => (<svg {...base} {...p}><path d="M3 20v-9l9-6 9 6v9" /><path d="M9 20v-5h6v5" /></svg>)
export const IconPhone = (p: P) => (<svg {...base} width={18} height={18} {...p}><path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2Z" /></svg>)
export const IconMail = (p: P) => (<svg {...base} width={18} height={18} {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>)
export const IconWhatsapp = (p: P) => (<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.17c-.24.68-1.42 1.32-1.95 1.36-.5.05-.97.24-3.27-.68-2.77-1.09-4.53-3.92-4.67-4.1-.14-.19-1.12-1.49-1.12-2.84 0-1.35.71-2.02.96-2.29.24-.27.53-.34.7-.34.17 0 .35 0 .5.01.16.01.38-.06.59.45.24.58.79 2.01.86 2.16.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.29-.12.57.17.29.75 1.24 1.61 2.01 1.11.99 2.05 1.3 2.34 1.44.29.14.46.12.63-.07.17-.19.72-.85.91-1.14.19-.29.38-.24.64-.14.26.1 1.66.78 1.94.93.29.14.48.21.55.33.07.12.07.69-.17 1.36Z" /></svg>)
export const IconFacebook = (p: P) => (<svg {...base} {...p}><path d="M14 8h2V5h-2a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2.2l.8-3H14V8Z" /></svg>)
export const IconX = (p: P) => (<svg {...base} {...p}><path d="M4 4l16 16M20 4 4 20" /></svg>)
export const IconInstagram = (p: P) => (<svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17" cy="7" r="1" /></svg>)
export const IconLinkedin = (p: P) => (<svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 17v-7" /></svg>)
export const IconStar = (p: P) => (<svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" {...p}><path d="m12 3 2.7 5.5 6 .9-4.35 4.24 1.03 6-5.38-2.83L6.6 19.6l1.03-6L3.3 9.4l6-.9L12 3Z" /></svg>)
export const IconArrowLeft = (p: P) => (<svg {...base} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>)
export const IconArrowRight = (p: P) => (<svg {...base} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>)
export const IconCheck = (p: P) => (<svg {...base} {...p}><path d="M20 6 9 17l-5-5" /></svg>)
export const IconTv = (p: P) => (<svg {...base} {...p}><rect x="2" y="7" width="20" height="13" rx="2" /><path d="m17 2-5 5-5-5" /></svg>)
export const IconShield = (p: P) => (<svg {...base} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>)
export const IconShower = (p: P) => (<svg {...base} {...p}><path d="M4 4h7a2 2 0 0 1 2 2v2" /><path d="M12 8a3 3 0 0 1 3 3v1H9v-1a3 3 0 0 1 3-3Z" /><path d="M10 16v1M14 16v1M12 19v1" /></svg>)
export const IconTowel = (p: P) => (<svg {...base} {...p}><path d="M4 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Z" /><path d="M4 9h16M8 14h8" /></svg>)
export const IconToiletries = (p: P) => (<svg {...base} {...p}><path d="M9 3h6v3H9zM10 6v3h4V6M8 9h8v12H8z" /></svg>)
export const IconBell = (p: P) => (<svg {...base} {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>)

