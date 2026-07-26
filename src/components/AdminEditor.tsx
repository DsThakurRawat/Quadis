import { useState, useEffect } from 'react'
import { DEFAULT_CONTENT, refreshContent } from '../data/content.ts'
import { getApiUrl } from '../config/api'

/**
 * The editing half of the admin panel.
 *
 * Three things a hotel manager should be able to change without a developer:
 *  1. the property record — name, address, contact, nightly rate, rating, live/paused
 *  2. each room category — its rate, meal supplements, bed count, inventory
 *  3. the marketing copy blocks registered in data/content.ts
 *
 * Editing is deliberately explicit: a form per record with its own Save. There
 * is no autosave, because these fields set the price a guest is charged and a
 * stray keystroke should not reprice the hotel.
 */

export interface EditableProperty {
  id: string
  name: string
  slug: string
  city: string
  address?: string
  phone?: string
  whatsapp?: string
  email?: string
  base_price: number
  rating?: number
  is_active?: boolean
  weekend_surcharge_percent?: number
  extra_adult_percent?: number
  child_free_under_age?: number
}

export interface EditableRoom {
  id: string
  name: string
  slug: string
  description?: string
  size_sqft?: string
  bed_type?: string
  max_guests?: number
  price_offset: number
  breakfast_offset?: number
  all_meals_offset?: number
  total_units: number
  available_units: number
  is_available: boolean
}

export interface EditablePropertyItem {
  property: EditableProperty
  rooms: EditableRoom[]
}

type AuthedFetch = (endpoint: string, init?: RequestInit) => Promise<any>

const s = {
  panel: { background: '#1c1917', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' } as const,
  h2: { fontSize: '1.1rem', fontWeight: 800, margin: '0 0 .25rem' } as const,
  hint: { color: '#a8a29e', fontSize: '.82rem', margin: '0 0 1rem', lineHeight: 1.5 } as const,
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.75rem' } as const,
  label: { display: 'flex', flexDirection: 'column', gap: '.3rem', fontSize: '.75rem', color: '#a8a29e', letterSpacing: '.04em' } as const,
  input: {
    padding: '.6rem .7rem', borderRadius: '6px', border: '1px solid #44403c',
    background: '#292524', color: '#f5f5f4', fontSize: '.9rem', width: '100%',
  } as const,
  textarea: {
    padding: '.6rem .7rem', borderRadius: '6px', border: '1px solid #44403c',
    background: '#292524', color: '#f5f5f4', fontSize: '.9rem', width: '100%',
    minHeight: '84px', resize: 'vertical' as const, fontFamily: 'inherit', lineHeight: 1.5,
  } as const,
  save: {
    marginTop: '.85rem', padding: '.55rem 1.1rem', borderRadius: '6px', border: 'none',
    background: '#d97706', color: '#0c0a09', fontWeight: 700, fontSize: '.82rem',
    letterSpacing: '.06em', cursor: 'pointer',
  } as const,
  record: { border: '1px solid #292524', borderRadius: '8px', padding: '1rem', marginBottom: '.85rem' } as const,
  recordHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '.75rem', marginBottom: '.75rem' } as const,
  ok: { color: '#4ade80', fontSize: '.8rem', marginLeft: '.75rem' } as const,
  err: { color: '#f87171', fontSize: '.8rem', marginLeft: '.75rem' } as const,
  sectionTitle: { fontSize: '.72rem', letterSpacing: '.14em', color: '#d97706', fontWeight: 700, margin: '1.25rem 0 .5rem' } as const,
}

/** Number input that keeps an empty box empty instead of snapping it to 0. */
function NumField({ label, value, onChange, step = '1', min = '0' }: {
  label: string; value: number | undefined; onChange: (n: number) => void; step?: string; min?: string
}) {
  return (
    <label style={s.label}>
      {label}
      <input
        style={s.input}
        type="number"
        step={step}
        min={min}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </label>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <label style={s.label}>
      {label}
      <input style={s.input} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function useSaveState() {
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'ok' | 'err'; msg?: string }>({ kind: 'idle' })

  // Clear the confirmation after a few seconds so a stale "Saved" can't be
  // mistaken for confirmation of a later, unsaved edit.
  useEffect(() => {
    if (status.kind !== 'ok') return
    const t = setTimeout(() => setStatus({ kind: 'idle' }), 4000)
    return () => clearTimeout(t)
  }, [status.kind])

  return [status, setStatus] as const
}

/* ---------- Property ---------- */

function PropertyForm({ item, authedFetch, onSaved }: {
  item: EditablePropertyItem; authedFetch: AuthedFetch; onSaved: () => void
}) {
  const [draft, setDraft] = useState<EditableProperty>(item.property)
  const [status, setStatus] = useSaveState()

  // Re-seed when the dashboard reloads from the server.
  useEffect(() => { setDraft(item.property) }, [item.property])

  const set = <K extends keyof EditableProperty>(k: K) => (v: EditableProperty[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const save = async () => {
    setStatus({ kind: 'saving' })
    try {
      await authedFetch(`admin/properties/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: draft.name,
          address: draft.address,
          phone: draft.phone,
          whatsapp: draft.whatsapp,
          email: draft.email,
          base_price: Number(draft.base_price),
          rating: Number(draft.rating),
          is_active: !!draft.is_active,
          weekend_surcharge_percent: Number(draft.weekend_surcharge_percent ?? 0),
          extra_adult_percent: Number(draft.extra_adult_percent ?? 0),
          child_free_under_age: Number(draft.child_free_under_age ?? 18),
        }),
      })
      setStatus({ kind: 'ok' })
      onSaved()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Save failed' })
    }
  }

  return (
    <div style={s.record}>
      <div style={s.recordHead}>
        <strong style={{ fontSize: '.95rem' }}>{item.property.name}</strong>
        <label style={{ ...s.label, flexDirection: 'row', alignItems: 'center', gap: '.4rem' }}>
          <input type="checkbox" checked={!!draft.is_active} onChange={(e) => set('is_active')(e.target.checked)} />
          Live on the website
        </label>
      </div>

      <div style={s.grid}>
        <TextField label="Hotel name" value={draft.name} onChange={set('name')} />
        <TextField label="Address" value={draft.address} onChange={set('address')} />
        <TextField label="Phone" value={draft.phone} onChange={set('phone')} />
        <TextField label="WhatsApp" value={draft.whatsapp} onChange={set('whatsapp')} />
        <TextField label="Email" value={draft.email} onChange={set('email')} />
        <NumField label="Base rate / night (₹)" value={draft.base_price} onChange={set('base_price')} />
        <NumField label="Rating (0–5)" value={draft.rating} onChange={set('rating')} step="0.1" />
        <NumField label="Weekend surcharge (%)" value={draft.weekend_surcharge_percent} onChange={set('weekend_surcharge_percent')} />
      </div>

      {/* Occupancy policy. These two set the triple-occupancy rate directly —
          they are what a guest is charged, so they are labelled in plain words
          rather than in the field names the database uses. */}
      <div style={{ ...s.sectionTitle, marginBottom: '.5rem' }}>OCCUPANCY &amp; EXTRA GUESTS</div>
      <p style={{ ...s.hint, margin: '0 0 .6rem' }}>
        Every rate covers <strong>2 adults per room</strong>. A 3rd <strong>adult</strong> adds
        this percentage to the room rate for each night. A <strong>child</strong> adds nothing —
        leave the age at 18 so no child is ever charged, or lower it to start charging
        older children as adults.
      </p>
      <div style={s.grid}>
        <NumField label="Triple occupancy uplift (%)" value={draft.extra_adult_percent} onChange={set('extra_adult_percent')} step="1" />
        <NumField label="Counts as a child under age" value={draft.child_free_under_age} onChange={set('child_free_under_age')} />
      </div>
      {/* Worked example, so a manager sees the rupee effect of the percentage
          they just typed without doing the arithmetic themselves. */}
      <p style={{ ...s.hint, margin: '.5rem 0 0' }}>
        At {Number(draft.extra_adult_percent ?? 0)}%, this hotel&rsquo;s ₹
        {Number(draft.base_price || 0).toLocaleString('en-IN')} room costs{' '}
        <strong>
          ₹{Math.round(Number(draft.base_price || 0) * (1 + Number(draft.extra_adult_percent ?? 0) / 100)).toLocaleString('en-IN')}
        </strong>{' '}
        per night for 3 adults.
      </p>

      <button style={s.save} onClick={save} disabled={status.kind === 'saving'}>
        {status.kind === 'saving' ? 'SAVING…' : 'SAVE HOTEL'}
      </button>
      {status.kind === 'ok' && <span style={s.ok}>Saved</span>}
      {status.kind === 'err' && <span style={s.err}>{status.msg}</span>}
    </div>
  )
}

/* ---------- Room category ---------- */

function RoomForm({ room, propertyName, authedFetch, onSaved }: {
  room: EditableRoom; propertyName: string; authedFetch: AuthedFetch; onSaved: () => void
}) {
  const [draft, setDraft] = useState<EditableRoom>(room)
  const [status, setStatus] = useSaveState()

  useEffect(() => { setDraft(room) }, [room])

  const set = <K extends keyof EditableRoom>(k: K) => (v: EditableRoom[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const save = async () => {
    setStatus({ kind: 'saving' })
    try {
      await authedFetch(`admin/room-types/${draft.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: draft.name,
          description: draft.description ?? '',
          size_sqft: draft.size_sqft ?? '',
          bed_type: draft.bed_type ?? '',
          max_guests: Number(draft.max_guests ?? 2),
          price_offset: Number(draft.price_offset),
          breakfast_offset: Number(draft.breakfast_offset ?? 0),
          all_meals_offset: Number(draft.all_meals_offset ?? 0),
          total_units: Number(draft.total_units),
          is_available: !!draft.is_available,
        }),
      })
      setStatus({ kind: 'ok' })
      onSaved()
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Save failed' })
    }
  }

  return (
    <div style={s.record}>
      <div style={s.recordHead}>
        <strong style={{ fontSize: '.9rem' }}>{propertyName} — {room.name}</strong>
        <label style={{ ...s.label, flexDirection: 'row', alignItems: 'center', gap: '.4rem' }}>
          <input type="checkbox" checked={!!draft.is_available} onChange={(e) => set('is_available')(e.target.checked)} />
          Bookable
        </label>
      </div>

      <div style={s.grid}>
        <TextField label="Room name" value={draft.name} onChange={set('name')} />
        <TextField label="Size" value={draft.size_sqft} onChange={set('size_sqft')} />
        <TextField label="Bed type" value={draft.bed_type} onChange={set('bed_type')} />
        <NumField label="Sleeps (max)" value={draft.max_guests} onChange={set('max_guests')} min="1" />
        <NumField label="Rate above base (₹)" value={draft.price_offset} onChange={set('price_offset')} />
        <NumField label="Breakfast supplement (₹)" value={draft.breakfast_offset} onChange={set('breakfast_offset')} />
        <NumField label="All-meals supplement (₹)" value={draft.all_meals_offset} onChange={set('all_meals_offset')} />
        <NumField label="Rooms of this type" value={draft.total_units} onChange={set('total_units')} />
      </div>

      <label style={{ ...s.label, marginTop: '.75rem' }}>
        Description shown to guests
        <textarea style={s.textarea} value={draft.description ?? ''} onChange={(e) => set('description')(e.target.value)} />
      </label>

      <button style={s.save} onClick={save} disabled={status.kind === 'saving'}>
        {status.kind === 'saving' ? 'SAVING…' : 'SAVE ROOM'}
      </button>
      {status.kind === 'ok' && <span style={s.ok}>Saved</span>}
      {status.kind === 'err' && <span style={s.err}>{status.msg}</span>}
    </div>
  )
}

/* ---------- Copy blocks ---------- */

function ContentEditor({ authedFetch }: { authedFetch: AuthedFetch }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [status, setStatus] = useSaveState()

  // Load current overrides so the boxes show what is live, not the defaults.
  useEffect(() => {
    fetch(getApiUrl('content'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.success && j.data) setValues(j.data) })
      .catch(() => { /* boxes stay empty; placeholders show the defaults */ })
  }, [])

  const save = async () => {
    setStatus({ kind: 'saving' })
    try {
      await authedFetch('admin/content', {
        method: 'PUT',
        body: JSON.stringify({ entries: values }),
      })
      refreshContent()
      setStatus({ kind: 'ok' })
    } catch (err) {
      setStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Save failed' })
    }
  }

  // Group by the section each field declares, so related copy sits together.
  const bySection = Object.entries(DEFAULT_CONTENT).reduce<Record<string, Array<[string, typeof DEFAULT_CONTENT[string]]>>>(
    (acc, [key, field]) => {
      ;(acc[field.section] ??= []).push([key, field])
      return acc
    },
    {}
  )

  return (
    <div style={s.panel}>
      <h2 style={s.h2}>Website text</h2>
      <p style={s.hint}>
        Leave a box empty to use the website&rsquo;s built-in wording — the grey text in each box
        shows what that is. Anything you type here replaces it everywhere that text appears.
      </p>

      {Object.entries(bySection).map(([section, fields]) => (
        <div key={section}>
          <div style={s.sectionTitle}>{section.toUpperCase()}</div>
          {fields.map(([key, field]) => (
            <label key={key} style={{ ...s.label, marginBottom: '.7rem' }}>
              {field.label}
              {field.multiline ? (
                <textarea
                  style={s.textarea}
                  placeholder={field.value}
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                />
              ) : (
                <input
                  style={s.input}
                  placeholder={field.value}
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      ))}

      <button style={s.save} onClick={save} disabled={status.kind === 'saving'}>
        {status.kind === 'saving' ? 'SAVING…' : 'SAVE WEBSITE TEXT'}
      </button>
      {status.kind === 'ok' && <span style={s.ok}>Saved — refresh the website to see it</span>}
      {status.kind === 'err' && <span style={s.err}>{status.msg}</span>}
    </div>
  )
}

/* ---------- Composed editor ---------- */

export default function AdminEditor({ properties, authedFetch, onSaved }: {
  properties: EditablePropertyItem[]
  authedFetch: AuthedFetch
  onSaved: () => void
}) {
  const [tab, setTab] = useState<'hotels' | 'rooms' | 'text'>('hotels')

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        padding: '.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '.82rem',
        fontWeight: 700, letterSpacing: '.04em',
        border: tab === id ? '1px solid #d97706' : '1px solid #292524',
        background: tab === id ? '#d97706' : '#1c1917',
        color: tab === id ? '#0c0a09' : '#a8a29e',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabBtn('hotels', 'EDIT HOTELS')}
        {tabBtn('rooms', 'EDIT ROOMS & RATES')}
        {tabBtn('text', 'EDIT WEBSITE TEXT')}
      </div>

      {tab === 'hotels' && (
        <div style={s.panel}>
          <h2 style={s.h2}>Hotels</h2>
          <p style={s.hint}>
            The rate you set here is the rate a guest is quoted and charged. Unticking
            &ldquo;Live on the website&rdquo; hides the property from the site without deleting anything.
          </p>
          {properties.map((item) => (
            <PropertyForm key={item.property.id} item={item} authedFetch={authedFetch} onSaved={onSaved} />
          ))}
        </div>
      )}

      {tab === 'rooms' && (
        <div style={s.panel}>
          <h2 style={s.h2}>Rooms &amp; rates</h2>
          <p style={s.hint}>
            &ldquo;Rate above base&rdquo; is added to the hotel&rsquo;s base rate for this room type.
            Meal supplements are added on top when a guest picks that plan.
          </p>
          {properties.map((item) =>
            item.rooms.map((room) => (
              <RoomForm
                key={room.id}
                room={room}
                propertyName={item.property.name}
                authedFetch={authedFetch}
                onSaved={onSaved}
              />
            ))
          )}
        </div>
      )}

      {tab === 'text' && <ContentEditor authedFetch={authedFetch} />}
    </div>
  )
}
