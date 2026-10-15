// Photos de la vitrine : photos libres de droits (licence Unsplash, usage commercial gratuit),
// servies par le CDN d'Unsplash a la taille voulue. A remplacer par les photos de la boutique FranckShoese.

export const PHOTOS = {
  hero: { id: 'photo-1760302318631-a8d342cd4951', alt: 'Rangées de baskets exposées sur les étagères d’un magasin' },
  wall: { id: 'photo-1633464129147-777bdcc97c1d', alt: 'Mur de chaussures en vitrine' },
  boxes: { id: 'photo-1528734056081-a1149a9a0856', alt: 'Paires de chaussures posées sur leurs boîtes' },
  Hommes: { id: 'photo-1602426688750-d58c9d81b7a4', alt: 'Homme en jean et baskets blanches' },
  Femmes: { id: 'photo-1596703263926-eb0762ee17e4', alt: 'Femme en chaussures à talons en cuir noir' },
  Enfants: { id: 'photo-1605523741177-cd660595c2cf', alt: 'Baskets blanches et rouges pour enfant sur l’herbe' },
}

/** Adresse de la photo recadree a la taille voulue, au format le plus leger pour le navigateur. */
export function photoUrl(photo, width, height) {
  const params = new URLSearchParams({ w: String(width), ...(height ? { h: String(height) } : {}), fit: 'crop', auto: 'format', q: '70' })
  return `https://images.unsplash.com/${photo.id}?${params}`
}

/** Plusieurs largeurs : le telephone charge une petite image. */
export function photoSrcSet(photo, widths, ratio) {
  return widths.map((width) => `${photoUrl(photo, width, Math.round(width / ratio))} ${width}w`).join(', ')
}
