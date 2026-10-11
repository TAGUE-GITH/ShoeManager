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
