import logo from './Atmos-logo.png'

export function AtmosLogo({ size = 40 }) {
  return (
    <img
      src={logo}
      alt="ATMOS"
      width={size}
      height={size}
      className="atmos-logo"
      style={{ borderRadius: 10, display: 'block', objectFit: 'cover' }}
    />
  )
}
