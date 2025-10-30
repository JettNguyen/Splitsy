import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Linking } from 'react-native';

// api service for communicating with the backend
// backend server url (uses expo extras in development)
const { IP_ADDRESS, PORT, PROD_API_URL } = (Constants.expoConfig && Constants.expoConfig.extra) || {};
const devIp = IP_ADDRESS || 'localhost';
const devPort = PORT || '3000';
export const API_BASE_URL = __DEV__
  ? `http://${devIp}:${devPort}/api`
  : PROD_API_URL;

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
  }

  // initialize the service and load stored token
  async init() {
    try {
      if (this.token) return;

      const token = await AsyncStorage.getItem('authToken');
      if (token) this.token = token;
    } catch (error) {
      console.error('Error loading token:', error);
    }
  }

  async setAuthToken(token) {
    this.token = token;
    try {
      if (token) await AsyncStorage.setItem('authToken', token);
      else await AsyncStorage.removeItem('authToken');
    } catch (e) {
      console.error('ApiService.setAuthToken: storage error', e);
    }
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // generic api call method
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const mergedHeaders = { ...this.getAuthHeaders(), ...(options.headers || {}) };
    const config = {
      method: options.method || 'GET',
      ...options,
      headers: mergedHeaders,
    };

  // convert body to json if it exists
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
  // add a timeout wrapper to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out')), 15000)
      );
      
      const response = await Promise.race([
        fetch(url, config),
        timeoutPromise
      ]);
      
  // handle different response types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

  // treat non-2xx responses as errors and provide friendly messages
    if (!response.ok) {
  // prefer server-provided message when available
        const serverMessage = (data && data.message) ? data.message : null;
        // handle different http error codes
        if (response.status === 401) {
    // token expired or invalid
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

  // parsed response (json or text)
      return data;
    } catch (error) {
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
        throw new Error('cannot connect to server. please check your internet connection.');
      }
      if (error.message.includes('timed out') || error.message.includes('Request timed out')) {
        throw new Error('network request timed out');
      }
      // re-throw for callers (contexts will show alerts)
      throw error;
    }
  }

  // authentication methods
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

  // payment methods
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

  // Linking helpers (exposed for UI components)
  async linkCanOpenURL(url) {
    try {
      return await Linking.canOpenURL(url);
    } catch (err) {
      console.warn('linkCanOpenURL error', err);
      return false;
    }
  }

  async linkOpenURL(url) {
    try {
      return await Linking.openURL(url);
    } catch (err) {
      console.warn('linkOpenURL error', err);
      throw err;
    }
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

  // remove/unfriend a user (mutual removal)
  async removeFriend(friendId) {
    const encoded = encodeURIComponent(String(friendId));
    return await this.makeRequest(`/users/friends/${encoded}`, {
      method: 'DELETE'
    });
  }

  // group methods
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

  // transaction methods
  async getTransactions(groupId, page = 1, limit = 20) {
    return await this.makeRequest(`/transactions/group/${groupId}?page=${page}&limit=${limit}=`);
  }

  // need to gettransactions for a user
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

  // mark a participant (or the current user) as paid for a transaction.
  // the backend settle endpoint expects { userid?, paid?, paymentmethod? }.
  // we keep this method simple and explicit so callers can pass the user being marked.
  async markTransactionPaid(transactionId, userId = null, paid = true, paymentMethod = null) {
    // backend expects paymentMethodId in the body when provided
    const body = {};
    if (paymentMethod) body.paymentMethodId = paymentMethod;
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

  // friend request methods
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

  // utility methods
  async healthCheck() {
    return await this.makeRequest('/health', {
      headers: { 'Content-Type': 'application/json' } // don't include auth for health check
    });
  }


  async getDebugUser() {
    return await this.makeRequest('/users/debug');
  }

}

// create singleton instance
const apiService = new ApiService();
export default apiService;