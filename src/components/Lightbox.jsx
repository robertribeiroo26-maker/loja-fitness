export default function Lightbox({ src, alt, onClose }) {
  if (!src) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--radius)' }}
      />
    </div>
  )
}
