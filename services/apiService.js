import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

//api service for handling backend communication
//backend server url (using the correct ip and port)
const { IP_ADDRESS, PORT, PROD_API_URL } = Constants.expoConfig.extra;
export const API_BASE_URL = __DEV__
  ? `http://${IP_ADDRESS}:${PORT}/api`
  : PROD_API_URL;

// Note: API_BASE_URL is configured from Expo constants in development.

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  //initialize the service and load stored token
  async init() {
  try {
      // If token is already set in-memory (e.g. just after login), prefer that to avoid
      // a race where AsyncStorage hasn't been written yet.
      if (this.token) return;

      const token = await AsyncStorage.getItem('authToken');
      if (token) this.token = token;
    } catch (error) {
      console.error('Error loading token:', error);
    }
  }

  //set authentication token
  async setAuthToken(token) {
    this.token = token;
    try {
      if (token) await AsyncStorage.setItem('authToken', token);
      else await AsyncStorage.removeItem('authToken');
    } catch (e) {
      console.error('ApiService.setAuthToken: storage error', e);
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
    // Debug: show whether a token is present at call time (redacted)
    // Intentionally avoid noisy debug logs here; errors are logged below when they occur.
    
    // Merge headers so callers can pass additional headers without removing Authorization
    const mergedHeaders = { ...this.getAuthHeaders(), ...(options.headers || {}) };
    const config = {
      method: options.method || 'GET',
      ...options,
      headers: mergedHeaders,
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

  // Treat non-2xx responses as errors and provide friendly messages
      if (!response.ok) {
        // Prefer server-provided message when available
        const serverMessage = (data && data.message) ? data.message : null;
        // Handle different HTTP error codes
        if (response.status === 401) {
          // Token expired or invalid
          this.setAuthToken(null);
          throw new Error(serverMessage || 'Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          throw new Error(serverMessage || 'Access denied.');
        } else if (response.status === 404) {
          throw new Error(serverMessage || 'Resource not found.');
        } else if (response.status >= 500) {
          throw new Error(serverMessage || 'Server error. Please try again later.');
        } else {
          throw new Error(serverMessage || (data && typeof data === 'string' ? data : `HTTP ${response.status}: ${response.statusText}`));
        }
      }

      // Parsed response (JSON or text)
      return data;
    } catch (error) {
      // Log a concise message and include context only in development
      console.error(`API Error [${config.method} ${url}]:`, error.message);
      if ((process.env.NODE_ENV || 'development') === 'development') {
        console.debug && console.debug('Request debug:', {
          url,
          baseURL: this.baseURL,
          method: config.method,
          hasAuth: !!this.token
        });
      }
      
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }
      if (error.message.includes('timed out') || error.message.includes('Request timed out')) {
        throw new Error('Network request timed out');
      }
      // Re-throw the error for callers to handle (DataContext shows alerts)
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
        await this.setAuthToken(response.token);
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
        await this.setAuthToken(response.token);
        return { success: true, user: response.user, token: response.token };
      }

      return { success: true, ...response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    await this.setAuthToken(null);
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

  async getPaymentMethods() {
    return await this.makeRequest('/auth/payment-methods', {
      method: 'GET',
    });
  }

  async getFriendPaymentMethods(friendId) {
    return await this.makeRequest(`/users/${friendId}/payment-methods`, {
      method: 'GET',
    });
  }

  // friend methods
  // add friend method
  async addFriend(friendEmail) {
  return await this.makeRequest('/users/add-friend', { // bridge between frontend and backend
    method: 'POST', 
    body: { email: friendEmail }
  });
}
 // get friends method
  async getFriends() {
    return await this.makeRequest('/users/friends', {
      method: 'GET',
    });
  }

  // Remove/unfriend a user (mutual removal)
  async removeFriend(friendId) {
    const encoded = encodeURIComponent(String(friendId));
    return await this.makeRequest(`/users/friends/${encoded}`, {
      method: 'DELETE'
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
    return await this.makeRequest(`/transactions/group/${groupId}?page=${page}&limit=${limit}=`);
  }

  // need to getTransactions for a user
  async getUsersTransactions(userId, page = 1, limit = 20) {
    return await this.makeRequest(`/transactions/user/${userId}?page=${page}&limit=${limit}`);
  }

 async createTransaction(transactionData) {
  return await this.makeRequest('/transactions', {
    method: 'POST',
    body: transactionData, // pass object directly
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

  // Mark a participant (or the current user) as paid for a transaction.
  // The backend settle endpoint expects { userId?, paid?, paymentMethod? }.
  // We keep this method simple and explicit so callers can pass the user being marked.
  async markTransactionPaid(transactionId, userId = null, paid = true, paymentMethod = null) {
    const body = { paymentMethod };
    if (userId) body.userId = userId;
    body.paid = paid;

    return await this.makeRequest(`/transactions/${transactionId}/settle`, {
      method: 'POST',
      body
    });
  }

  async getUserBalances() {
    try {
      const result = await this.makeRequest(`/transactions/user/balances`);
      return result;
    } catch (error) {
      console.error('Error fetching user balances:', error.message);
      throw error;
    }
  }

  async getFriendBalance(friendId) {
    try {
      const result = await this.makeRequest(`/transactions/friend/${friendId}/balance`);
      return result;
    } catch (error) {
      console.error('Error fetching friend balance:', error.message);
      throw error;
    }
  }

  // Friend request methods
  async sendFriendRequest(toId, message = '') {
    return await this.makeRequest('/users/requests', {
      method: 'POST',
      body: { toId, message }
    });
  }

  async listFriendRequests() {
    return await this.makeRequest('/users/requests');
  }

  async acceptFriendRequest(requestId) {
    return await this.makeRequest(`/users/requests/${requestId}/accept`, {
      method: 'POST'
    });
  }

  async declineFriendRequest(requestId) {
    return await this.makeRequest(`/users/requests/${requestId}`, {
      method: 'DELETE'
    });
  }

  // Utility methods
  async healthCheck() {
    return await this.makeRequest('/health', {
      headers: { 'Content-Type': 'application/json' } // Don't include auth for health check
    });
  }


  // Debug: return authenticated user and populated friends (dev only)
  async getDebugUser() {
    return await this.makeRequest('/users/debug');
  }

}

// Create singleton instance
const apiService = new ApiService();
export default apiService;