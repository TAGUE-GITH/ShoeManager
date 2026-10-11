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
