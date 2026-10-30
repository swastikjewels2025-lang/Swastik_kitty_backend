/**
 * Swastik Jewellers Admin Vault - Centralized API Service
 */

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('swastik_admin_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('swastik_admin_token', token);
    } else {
      localStorage.removeItem('swastik_admin_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('swastik_admin_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(json?.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.code = json?.code;
        error.data = json;
        throw error;
      }

      return json?.data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth
  async adminLogin(identifier, password) {
    const data = await this.request('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    if (data?.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async sendOtp(phone) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  }

  async verifyOtp(phone, otp) {
    const data = await this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp })
    });
    if (data?.token) {
      this.setToken(data.token);
    }
    return data;
  }

  // Dashboard Stats
  async getDashboardStats() {
    return this.request('/admin/dashboard/stats');
  }

  // Users Directory
  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/users?${query}`);
  }

  async getUserDetail(userId) {
    return this.request(`/admin/users/${userId}`);
  }

  async updateUser(userId, payload) {
    return this.request(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  // KYC Queue
  async getPendingKyc() {
    return this.request('/admin/kyc/pending');
  }

  async reviewKyc(userId, status, rejectionReason = '') {
    return this.request(`/admin/kyc/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectionReason })
    });
  }

  // Payments Ledger
  async getPayments(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/payments?${query}`);
  }

  async recordCashPayment(payload) {
    return this.request('/admin/payments/record-cash', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Doorstep Cash Pickups
  async getPickups(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/pickups?${query}`);
  }

  async confirmCashPickup(requestId, verificationOtp) {
    return this.request('/admin/payments/confirm-cash-pickup', {
      method: 'POST',
      body: JSON.stringify({ requestId, verificationOtp })
    });
  }

  // Schemes Management
  async getSchemes() {
    return this.request('/admin/schemes');
  }

  async createScheme(payload) {
    return this.request('/admin/schemes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateScheme(id, payload) {
    return this.request(`/admin/schemes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async deleteScheme(id) {
    return this.request(`/admin/schemes/${id}`, {
      method: 'DELETE'
    });
  }

  // Memberships & Token slots
  async getMemberships(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/memberships?${query}`);
  }

  async manualEnroll(payload) {
    return this.request('/admin/memberships/manual-enroll', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Bullion Bookings
  async getBookings(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/admin/bookings?${query}`);
  }

  async updateBookingStatus(bookingId, status, notes = '') {
    return this.request(`/admin/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    });
  }

  // Gold Rates
  async getGoldRates() {
    return this.request('/rates/gold');
  }

  async updateGoldRates(payload) {
    return this.request('/admin/rates/gold', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Lucky Draw
  async getDrawEligible(schemeId) {
    return this.request(`/admin/draw/eligible/${schemeId}`);
  }

  async recordDrawWinner(payload) {
    return this.request('/admin/draw/record-winner', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Broadcast Notifications
  async broadcastNotification(payload) {
    return this.request('/admin/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}

export const api = new ApiService();
