import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // User APIs
  getUsers: () => api.get('/users'),
  createUser: (userData) => api.post('/users', userData),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),

  // Product APIs
  getProducts: () => api.get('/products'),
  createProduct: (productData) => api.post('/products', productData),
  getProductById: (id) => api.get(`/products/${id}`),

  // Review APIs
  getReviews: () => api.get('/reviews'),
  createReview: (reviewData) => api.post('/reviews', reviewData),
  getReviewsByProduct: (productId) => api.get(`/reviews/product/${productId}`),
  voteOnReview: (reviewId, voteType) => api.post(`/reviews/${reviewId}/vote`, { voteType }),
  analyzeReview: (content) => api.post('/reviews/analyze', { content }),

  // Alert APIs
  getAlerts: () => api.get('/alerts'),
  getAlertsByType: (type) => api.get(`/alerts/type/${type}`),
  getAlertsBySeverity: (severity) => api.get(`/alerts/severity/${severity}`),
  resolveAlert: (id) => api.put(`/alerts/${id}/resolve`),
  dismissAlert: (id) => api.put(`/alerts/${id}/dismiss`),
  getAlertStats: () => api.get('/alerts/stats'),
};

export default apiService;
