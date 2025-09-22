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
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Load all users
      const storedUsers = await AsyncStorage.getItem('users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      }

      // Load current user
      const currentUserId = await AsyncStorage.getItem('currentUserId');
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
      await AsyncStorage.setItem('users', JSON.stringify(newUsers));
      setUsers(newUsers);
    } catch (error) {
      console.error('Error saving users:', error);
    }
  };

  const generateUserId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const registerUser = async (userData) => {
    try {
      const newUser = {
        id: generateUserId(),
        ...userData,
        createdAt: new Date().toISOString(),
        avatar: userData.name ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U',
        paymentMethods: []
      };

      const updatedUsers = [...users, newUser];
      await saveUsers(updatedUsers);
      
      // Auto-login the new user
      await AsyncStorage.setItem('currentUserId', newUser.id);
      setCurrentUser(newUser);
      setIsAuthenticated(true);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Error registering user:', error);
      return { success: false, error: error.message };
    }
  };

  const loginUser = async (email, password) => {
    try {
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
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
      await AsyncStorage.removeItem('currentUserId');
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
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
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