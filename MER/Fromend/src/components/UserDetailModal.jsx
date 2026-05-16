function avatarUrl(first, last) {
  const seed = encodeURIComponent(`${first} ${last}`)
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&fontFamily=Helvetica`
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

const rows = [
  { label: 'First Name',    key: 'first_name' },
  { label: 'Last Name',     key: 'last_name' },
  { label: 'Email',         key: 'email' },
  { label: 'Gender',        key: 'gender' },
  { label: 'IP Address',    key: 'ip_address' },
  { label: 'Last Activity', key: 'lastActivity', render: fmt },
  { label: 'Member Since',  key: 'createdAt', render: fmt },
  { label: 'Last Updated',  key: 'updatedAt', render: fmt },
]

export default function UserDetailModal({ user, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>

        <div className="detail-header">
          <img
            className="detail-avatar"
            src={avatarUrl(user.first_name, user.last_name)}
            alt={`${user.first_name} ${user.last_name}`}
          />
          <div className="detail-title">
            <h2>{user.first_name} {user.last_name}</h2>
            <span className={`pill ${user.gender?.toLowerCase()}`}>{user.gender || '—'}</span>
          </div>
          <button className="icon-btn detail-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        <div className="detail-table-wrap">
          <table className="detail-table">
            <tbody>
              {rows.map(({ label, key, render }) => (
                <tr key={key}>
                  <th>{label}</th>
                  <td>{render ? render(user[key]) : (user[key] || '—')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
