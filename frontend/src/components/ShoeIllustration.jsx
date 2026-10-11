// Illustration vectorielle d'une chaussure, dans la couleur du produit (en attendant les photos)
const SHAPES = {
  sneaker: (fill, line) => (
    <>
      <path d="M18 92h164a8 8 0 0 1 0 16H26a8 8 0 0 1-8-8z" fill="#f5f5f4" stroke={line} strokeWidth="2" />
      <path
        d="M24 92c-2-22 6-42 24-48l22-4c6-1 10 2 14 8l16 18c12 6 40 8 66 12 14 2 20 8 18 14z"
        fill={fill}
        stroke={line}
        strokeWidth="2"
      />
      <path d="M28 92c0-14 6-26 16-32" fill="none" stroke={line} strokeOpacity=".35" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${76 + i * 8} ${50 + i * 5}l9 -4`} stroke={line} strokeWidth="3" strokeLinecap="round" />
      ))}
      <path d="M130 92c8-6 26-8 46-6" fill="none" stroke={line} strokeOpacity=".35" strokeWidth="2" />
    </>
  ),
  classic: (fill, line) => (
    <>
      <path d="M18 94h166a6 6 0 0 1 0 12H24a6 6 0 0 1-6-6z" fill="#292524" />
      <path
        d="M22 94c0-18 8-32 24-36l42-6c12-2 22 4 32 14 12 10 30 14 50 18 12 2 16 6 14 10z"
        fill={fill}
        stroke={line}
        strokeWidth="2"
      />
      <path d="M86 54c6 8 10 16 12 26" fill="none" stroke={line} strokeOpacity=".4" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${92 + i * 8} ${60 + i * 6}l8 -3`} stroke={line} strokeWidth="2.5" strokeLinecap="round" />
      ))}
    </>
  ),
  heel: (fill, line) => (
    <>
      <path d="M36 84h10l4 26h-10z" fill="#292524" />
      <path
        d="M30 70c0-12 10-18 22-14l68 22c20 6 40 6 56 8 8 2 10 8 4 10H60c-12 0-20-4-24-12z"
        fill={fill}
        stroke={line}
        strokeWidth="2"
      />
      <path d="M52 56c10 12 28 20 50 24" fill="none" stroke={line} strokeOpacity=".35" strokeWidth="2" />
    </>
  ),
  sandal: (fill, line) => (
    <>
      <path
        d="M20 96c0-8 10-10 20-10h130c12 0 16 6 14 12-2 6-8 8-16 8H36c-10 0-16-4-16-10z"
        fill="#d6c3a5"
        stroke={line}
        strokeWidth="2"
      />
      <path d="M60 86c10-24 40-26 52 0" fill="none" stroke={fill} strokeWidth="11" strokeLinecap="round" />
      <path d="M120 86c8-16 30-16 36 0" fill="none" stroke={fill} strokeWidth="11" strokeLinecap="round" />
      <path d="M40 86c-2-16 6-24 16-24" fill="none" stroke={fill} strokeWidth="8" strokeLinecap="round" />
    </>
  ),
}

// Contour lisible meme pour une chaussure blanche ou beige
function outline(hex) {
  const value = parseInt(hex.slice(1), 16)
  const luminance = (0.299 * (value >> 16) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255)) / 255
  return luminance > 0.75 ? '#78716c' : '#1c1917'
}

export default function ShoeIllustration({ shape = 'sneaker', color = '#c2410c', className = '' }) {
  return (
    <svg viewBox="0 0 200 120" className={className} aria-hidden="true">
      <ellipse cx="100" cy="112" rx="84" ry="5" fill="#000" opacity=".08" />
      {(SHAPES[shape] ?? SHAPES.sneaker)(color, outline(color))}
    </svg>
  )
}
