import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data on app start
  useEffect(() => {
    loadUserData();
    
    // Fail-safe timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('UserContext: Loading timeout reached, stopping loading state');
        setIsLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Check for JWT token (new API authentication)
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        try {
          // Import ApiService dynamically to avoid circular dependencies
          const { default: apiService } = await import('../services/apiService');
          await apiService.init();
          
          // Try to get user profile from API
          const profile = await apiService.getUserProfile();
          if (profile.success) {
            setCurrentUser(profile.user);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.log('API authentication failed, falling back to local storage');
          // Clear invalid token
          await AsyncStorage.removeItem('authToken');
        }
      }
      
      // Fallback to old AsyncStorage system for backwards compatibility
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AsyncStorage timeout')), 3000)
      );
      
      const storedUsers = await Promise.race([
        AsyncStorage.getItem('users'),
        timeout
      ]);
      
      if (storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        // Filter out any invalid users without email
        const validUsers = parsedUsers.filter(user => user && user.email && typeof user.email === 'string');
        setUsers(validUsers);
      }

      const currentUserId = await Promise.race([
        AsyncStorage.getItem('currentUserId'),
        timeout
      ]);
      
      if (currentUserId && storedUsers) {
        const parsedUsers = JSON.parse(storedUsers);
        const user = parsedUsers.find(u => u.id === currentUserId);
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUsers = async (newUsers) => {
    try {
      // Filter out any invalid users before saving
      const validUsers = newUsers.filter(user => user && user.email && typeof user.email === 'string');
      await AsyncStorage.setItem('users', JSON.stringify(validUsers));
      setUsers(validUsers);
    } catch (error) {
      console.error('Error saving users:', error);
    }
  };

  const generateUserId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const registerUser = async (userData) => {
    try {
      // Use API service for registration
      const { default: apiService } = await import('../services/apiService');
      await apiService.init();
      
      const result = await apiService.register(userData.name, userData.email, userData.password);
      console.log('Registration result:', result);
      
      if (result.success) {
        console.log('Setting current user:', result.user);
        // Set the user and authentication state
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        
        // For backwards compatibility, also save to local storage
        const newUser = {
          ...result.user,
          avatar: userData.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
        };
        const updatedUsers = [...users, newUser];
        await saveUsers(updatedUsers);
        await AsyncStorage.setItem('currentUserId', result.user.id);
      }
      
      return result;
    } catch (error) {
      console.error('Error registering user:', error);
      return { success: false, error: error.message };
    }
  };

  const loginUser = async (email, password) => {
    try {
      console.log('Login attempt with email:', email);
      
      // Validate input parameters
      if (!email || typeof email !== 'string') {
        return { success: false, error: 'Please provide a valid email address' };
      }
      
      if (!password || typeof password !== 'string') {
        return { success: false, error: 'Please provide a valid password' };
      }
      
      // Use API service for login
      const { default: apiService } = await import('../services/apiService');
      await apiService.init();
      
      const result = await apiService.login(email, password);
      console.log('Login result:', result);
      
      if (result.success) {
        // Set the user and authentication state
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        
        // For backwards compatibility, also save to local storage
        const newUser = {
          ...result.user,
          avatar: result.user.name ? result.user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
        };
        const existingUserIndex = users.findIndex(u => u.email && email && u.email.toLowerCase() === email.toLowerCase());
        let updatedUsers;
        if (existingUserIndex >= 0) {
          updatedUsers = [...users];
          updatedUsers[existingUserIndex] = newUser;
        } else {
          updatedUsers = [...users, newUser];
        }
        await saveUsers(updatedUsers);
        await AsyncStorage.setItem('currentUserId', result.user.id);
      }
      
      return result;
    } catch (error) {
      console.error('Error logging in user:', error);
      return { success: false, error: error.message };
    }
  };

  const oldLoginUser = async (email, password) => {
    try {
      const user = users.find(u => u.email && email && u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      if (user.password !== password) {
        return { success: false, error: 'Invalid password' };
      }

      await AsyncStorage.setItem('currentUserId', user.id);
      setCurrentUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (error) {
      console.error('Error logging in:', error);
      return { success: false, error: error.message };
    }
  };

  const logoutUser = async () => {
    try {
      // Clear API token
      const { default: apiService } = await import('../services/apiService');
      apiService.setAuthToken(null);
      
      // Clear local storage
      await AsyncStorage.removeItem('currentUserId');
      await AsyncStorage.removeItem('authToken');
      setCurrentUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      );
      
      await saveUsers(updatedUsers);
      
      if (currentUser && currentUser.id === userId) {
        setCurrentUser({ ...currentUser, ...updates });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
  };

  const findUserByEmail = (email) => {
    return users.find(u => u.email && email && u.email.toLowerCase() === email.toLowerCase());
  };

  const findUserById = (id) => {
    return users.find(u => u.id === id);
  };

  const value = {
    currentUser,
    users,
    isAuthenticated,
    isLoading,
    registerUser,
    loginUser,
    logoutUser,
    updateUser,
    findUserByEmail,
    findUserById
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};