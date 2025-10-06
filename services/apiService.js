import AsyncStorage from '@react-native-async-storage/async-storage';

//api service for handling backend communication
//backend server url (using the correct ip and port)
const API_BASE_URL = __DEV__ ? 'http://10.20.0.192:3000/api' : 'https://your-production-api.com/api'; // change the second url to your local ip address

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  //initialize the service and load stored token
  async init() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        this.token = token;
      }
    } catch (error) {
      console.error('Error loading token:', error);
    }
  }

  //set authentication token
  setAuthToken(token) {
    this.token = token;
    if (token) {
      AsyncStorage.setItem('authToken', token);
    } else {
      AsyncStorage.removeItem('authToken');
    }
  }

  //get authentication headers
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  //generic api call method
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      method: 'GET',
      headers: this.getAuthHeaders(),
      ...options,
    };

    // Convert body to JSON if it exists
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      // Add timeout wrapper to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 15000)
      );
      
      const response = await Promise.race([
        fetch(url, config),
        timeoutPromise
      ]);
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Handle different HTTP error codes
        if (response.status === 401) {
          // Token expired or invalid
          this.setAuthToken(null);
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied.');
        } else if (response.status === 404) {
          throw new Error('Resource not found.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
      }

      return data;
    } catch (error) {
      console.error(`API Error [${config.method} ${url}]:`, error.message);
      console.error('Request details:', {
        url,
        baseURL: this.baseURL,
        method: config.method,
        hasAuth: !!this.token
      });
      
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }
      if (error.message.includes('timed out') || error.message.includes('Request timed out')) {
        throw new Error('Network request timed out');
      }
      throw error;
    }
  }

  // Authentication methods
  async register(name, email, password) {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });

      if (response.token) {
        this.setAuthToken(response.token);
        return { success: true, user: response.user, token: response.token };
      }

      return { success: true, ...response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async login(email, password) {
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      if (response.token) {
        this.setAuthToken(response.token);
        return { success: true, user: response.user, token: response.token };
      }

      return { success: true, ...response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    this.setAuthToken(null);
    return { success: true, message: 'Logged out successfully' };
  }

  async getCurrentUser() {
    return await this.makeRequest('/auth/me');
  }

  async getUserProfile() {
    try {
      const response = await this.makeRequest('/auth/me');
      return { success: true, user: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateProfile(userData) {
    return await this.makeRequest('/auth/me', {
      method: 'PUT',
      body: userData,
    });
  }

  async updatePassword(passwordData) {
    return await this.makeRequest('/auth/updatepassword', {
      method: 'PUT',
      body: passwordData,
    });
  }

  // Payment methods
  async addPaymentMethod(paymentData) {
    return await this.makeRequest('/auth/payment-methods', {
      method: 'POST',
      body: paymentData,
    });
  }

  async removePaymentMethod(paymentId) {
    return await this.makeRequest(`/auth/payment-methods/${paymentId}`, {
      method: 'DELETE',
    });
  }

  // Group methods
  async getGroups() {
    return await this.makeRequest('/groups');
  }

  async createGroup(groupData) {
    return await this.makeRequest('/groups', {
      method: 'POST',
      body: groupData,
    });
  }

  async getGroup(groupId) {
    return await this.makeRequest(`/groups/${groupId}`);
  }

  async updateGroup(groupId, groupData) {
    return await this.makeRequest(`/groups/${groupId}`, {
      method: 'PUT',
      body: groupData,
    });
  }

  async deleteGroup(groupId) {
    return await this.makeRequest(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  async addGroupMember(groupId, email) {
    return await this.makeRequest(`/groups/${groupId}/members`, {
      method: 'POST',
      body: { email },
    });
  }

  async removeGroupMember(groupId, userId) {
    return await this.makeRequest(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async leaveGroup(groupId) {
    return await this.makeRequest(`/groups/${groupId}/leave`, {
      method: 'POST',
    });
  }

  async getGroupBalances(groupId) {
    return await this.makeRequest(`/groups/${groupId}/balances`);
  }

  // Transaction methods
  async getTransactions(groupId, page = 1, limit = 20) {
    return await this.makeRequest(`/transactions/group/${groupId}?page=${page}&limit=${limit}`);
  }

  async createTransaction(transactionData) {
    return await this.makeRequest('/transactions', {
      method: 'POST',
      body: transactionData,
    });
  }

  async updateTransaction(transactionId, transactionData) {
    return await this.makeRequest(`/transactions/${transactionId}`, {
      method: 'PUT',
      body: transactionData,
    });
  }

  async deleteTransaction(transactionId) {
    return await this.makeRequest(`/transactions/${transactionId}`, {
      method: 'DELETE',
    });
  }

  async markTransactionPaid(transactionId, paymentMethod = null) {
    return await this.makeRequest(`/transactions/${transactionId}/settle`, {
      method: 'POST',
      body: { paymentMethod }
    });
  }

  async getUserBalances() {
    return await this.makeRequest('/transactions/user/balances');
  }

  // Utility methods
  async healthCheck() {
    return await this.makeRequest('/health', {
      headers: { 'Content-Type': 'application/json' } // Don't include auth for health check
    });
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService;