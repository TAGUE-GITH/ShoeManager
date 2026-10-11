import { api } from './client'

const data = (response) => response.data

export const authApi = {
  register: (form) => api.post('/auth/register/', form).then(data),
  login: (credentials) => api.post('/auth/login/', credentials).then(data),
  me: () => api.get('/auth/me/').then(data),
}

export const catalogApi = {
  products: (params) => api.get('/products/', { params }).then(data),
  product: (slug) => api.get(`/products/${slug}/`).then(data),
  categories: () => api.get('/categories/').then(data),
  brands: () => api.get('/brands/').then(data),
  colors: () => api.get('/colors/').then(data),
}

export const cartApi = {
  get: () => api.get('/cart/').then(data),
  add: (variant, quantity = 1) => api.post('/cart/items/', { variant, quantity }).then(data),
  update: (id, quantity) => api.patch(`/cart/items/${id}/`, { quantity }).then(data),
  remove: (id) => api.delete(`/cart/items/${id}/`),
}

export const ordersApi = {
  list: () => api.get('/orders/').then(data),
  get: (id) => api.get(`/orders/${id}/`).then(data),
  place: (form) => api.post('/orders/', form).then(data),
  cancel: (id) => api.post(`/orders/${id}/cancel/`).then(data),
}

export const manageOrdersApi = {
  list: (params) => api.get('/manage/orders/', { params }).then(data),
  setStatus: (id, status) => api.patch(`/manage/orders/${id}/status/`, { status }).then(data),
}

export const reservationsApi = {
  list: () => api.get('/reservations/').then(data),
  create: (variant) => api.post('/reservations/', { variant }).then(data),
  cancel: (id) => api.post(`/reservations/${id}/cancel/`).then(data),
}

export const manageReservationsApi = {
  list: (params) => api.get('/manage/reservations/', { params }).then(data),
  honor: (id, payment_method) => api.post(`/manage/reservations/${id}/honor/`, { payment_method }).then(data),
  cancel: (id) => api.post(`/manage/reservations/${id}/cancel/`).then(data),
}

export const salesApi = {
  list: () => api.get('/manage/sales/').then(data),
  create: (sale) => api.post('/manage/sales/', sale).then(data),
  // Le recu est protege par le jeton : on le telecharge puis on l'ouvre dans un nouvel onglet
  openReceipt: async (id) => {
    const response = await api.get(`/manage/sales/${id}/receipt/`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  },
}

export const accountApi = {
  demo: (role) => api.post('/auth/demo/', { role }).then(data),
  requestReset: (email) => api.post('/auth/password-reset/', { email }).then(data),
  confirmReset: (form) => api.post('/auth/password-reset/confirm/', form).then(data),
}

export const manageApi = {
  dashboard: () => api.get('/manage/dashboard/').then(data),
  stockAlerts: () => api.get('/manage/stock-alerts/').then(data),
  team: () => api.get('/manage/team/').then(data),
  addMember: (member) => api.post('/manage/team/', member).then(data),
  updateMember: (id, changes) => api.patch(`/manage/team/${id}/`, changes).then(data),
  customers: (params) => api.get('/manage/customers/', { params }).then(data),
  products: (params) => api.get('/manage/products/', { params }).then(data),
  product: (id) => api.get(`/manage/products/${id}/`).then(data),
  saveProduct: (id, product) =>
    (id ? api.patch(`/manage/products/${id}/`, product) : api.post('/manage/products/', product)).then(data),
  categories: () => api.get('/manage/categories/').then(data),
  brands: () => api.get('/manage/brands/').then(data),
  addBrand: (name) => api.post('/manage/brands/', { name }).then(data),
  colors: () => api.get('/manage/colors/').then(data),
  addColor: (color) => api.post('/manage/colors/', color).then(data),
  variants: (product) => api.get('/manage/variants/', { params: { product, page_size: 100 } }).then(data),
  addVariant: (variant) => api.post('/manage/variants/', variant).then(data),
  updateVariant: (id, changes) => api.patch(`/manage/variants/${id}/`, changes).then(data),
  deleteVariant: (id) => api.delete(`/manage/variants/${id}/`),
  uploadImage: (productId, file) => {
    const body = new FormData()
    body.append('image', file)
    return api.post(`/manage/products/${productId}/images/`, body).then(data)
  },
  deleteImage: (id) => api.delete(`/manage/images/${id}/`),
}
