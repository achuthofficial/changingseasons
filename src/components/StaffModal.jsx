import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { IconX, IconImage } from './Icons.jsx'
import './StaffModal.css'

export default function StaffModal({ staffMember, onClose, onSave }) {
  const isEdit = Boolean(staffMember)
  const [name, setName] = useState(staffMember?.name ?? '')
  const [phone, setPhone] = useState(staffMember?.phone ?? '')
  const [role, setRole] = useState(staffMember?.role ?? '')
  const [active, setActive] = useState(staffMember?.active ?? true)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(staffMember?.photo_url ?? null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const isValid = name.trim()

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError(null)

    let photoUrl = staffMember?.photo_url ?? null

    if (photoFile) {
      const path = `${Date.now()}-${photoFile.name}`
      const { error: uploadError } = await supabase.storage.from('staff-photos').upload(path, photoFile)
      if (uploadError) {
        setError(uploadError.message)
        setSubmitting(false)
        return
      }
      const { data: publicUrlData } = supabase.storage.from('staff-photos').getPublicUrl(path)
      photoUrl = publicUrlData.publicUrl
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      role: role.trim() || null,
      active,
      photo_url: photoUrl,
    }

    const query = isEdit
      ? supabase.from('staff').update(payload).eq('id', staffMember.id)
      : supabase.from('staff').insert(payload)

    const { data, error: saveError } = await query.select().single()

    if (saveError) {
      setError(saveError.message)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onSave?.(data)
    onClose()
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>{isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <IconX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <label className="modal-field">
              <span>Name</span>
              <input
                type="text"
                placeholder="Staff member's name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </label>

            <label className="modal-field">
              <span>Phone number</span>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>

            <label className="modal-field">
              <span>Photo</span>
              <div className="staff-photo-upload">
                {photoPreview ? (
                  <img src={photoPreview} alt="Staff" className="staff-photo-preview" />
                ) : (
                  <div className="staff-photo-placeholder"><IconImage size={22} /></div>
                )}
                <label className="btn btn-ghost staff-photo-btn">
                  {photoPreview ? 'Replace photo' : 'Upload photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
                </label>
              </div>
            </label>

            <label className="modal-field">
              <span>Role</span>
              <input
                type="text"
                placeholder="e.g. Tailor, Designer"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </label>

            <label className="modal-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                style={{ width: 'auto' }}
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              <span>Active</span>
            </label>

            {error && <p className="modal-error">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
