import { useEffect, useState } from 'react'
import { getAvatarUrl } from '../../utils/avatar.js'

export default function UserAvatar({ name, image, className = 'dh-avatar dh-avatar--sm' }) {
  const [broken, setBroken] = useState(false)
  const src = broken ? getAvatarUrl(name, null) : getAvatarUrl(name, image)

  useEffect(() => {
    setBroken(false)
  }, [name, image])

  return (
    <img
      src={src}
      alt=""
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  )
}
