import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import apiService from '../services/apiService';
import { useUser } from './UserContext';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { currentUser } = useUser();
  const [groups, setGroups] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      initializeData();
    } else {
      // If no user is authenticated, reset state
      setGroups([]);
      setTransactions([]);
      setIsLoading(false);
      setError(null);
    }
  }, [currentUser]);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize API service
      await apiService.init();

      // Load user's groups
      await loadGroups();

    } catch (error) {
      console.error('Error initializing data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await apiService.getGroups();
      console.log('Groups response:', response);
      // Backend now returns groups array directly
      if (Array.isArray(response)) {
        setGroups(response);
      } else if (response.success && response.data && response.data.groups) {
        // Fallback for old format
        setGroups(response.data.groups);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
      handleApiError(error);
    }
  };

  const loadTransactions = async (groupId) => {
    try {
      const response = await apiService.getTransactions(groupId);
      if (response.success) {
        return response.data.transactions || [];
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      handleApiError(error);
      return [];
    }
  };

  const handleApiError = (error) => {
    if (error.message.includes('Authentication failed')) {
      // Handle authentication errors by logging out user
      Alert.alert(
        'Session Expired',
        'Please log in again to continue.',
        [{ text: 'OK', onPress: () => {/* Navigate to login */ } }]
      );
    } else if (error.message.includes('Cannot connect')) {
      setError('Cannot connect to server. Please check your internet connection.');
    } else {
      setError(error.message);
    }
  };

  // Group management functions
  const createGroup = async (groupData) => {
    try {
      setError(null);
      const response = await apiService.createGroup(groupData);
      console.log('Create group response:', response);
      
      if (response.success) {
        // Backend now returns group directly in response.group
        const newGroup = response.group || response.data?.group;
        if (newGroup) {
          setGroups(prevGroups => [newGroup, ...prevGroups]);
          return newGroup;
        }
      } else {
        throw new Error(response.message || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      handleApiError(error);
      throw error;
    }
  };

  const updateGroup = async (groupId, groupData) => {
    try {
      setError(null);
      const response = await apiService.updateGroup(groupId, groupData);
      
      if (response.success) {
        const updatedGroup = response.data.group;
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group._id === groupId ? updatedGroup : group
          )
        );
        return updatedGroup;
      }
    } catch (error) {
      console.error('Error updating group:', error);
      handleApiError(error);
      throw error;
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      setError(null);
      const response = await apiService.deleteGroup(groupId);
      
      if (response.success) {
        setGroups(prevGroups => prevGroups.filter(group => 
          group.id !== groupId && group._id !== groupId
        ));
        // Also remove transactions for this group
        setTransactions(prevTransactions => 
          prevTransactions.filter(transaction => 
            transaction.group !== groupId && transaction.groupId !== groupId
          )
        );
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      handleApiError(error);
      throw error;
    }
  };

  const addGroupMember = async (groupId, email) => {
    try {
      setError(null);
      const response = await apiService.addGroupMember(groupId, email);
      
      if (response.success) {
        const updatedGroup = response.data.group;
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group._id === groupId ? updatedGroup : group
          )
        );
        return updatedGroup;
      }
    } catch (error) {
      console.error('Error adding group member:', error);
      handleApiError(error);
      throw error;
    }
  };

  const removeGroupMember = async (groupId, userId) => {
    try {
      setError(null);
      const response = await apiService.removeGroupMember(groupId, userId);
      
      if (response.success) {
        const updatedGroup = response.data.group;
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group._id === groupId ? updatedGroup : group
          )
        );
        return updatedGroup;
      }
    } catch (error) {
      console.error('Error removing group member:', error);
      handleApiError(error);
      throw error;
    }
  };

  const leaveGroup = async (groupId) => {
    try {
      setError(null);
      const response = await apiService.leaveGroup(groupId);
      
      if (response.success) {
        setGroups(prevGroups => prevGroups.filter(group => group._id !== groupId));
        // Also remove transactions for this group
        setTransactions(prevTransactions => 
          prevTransactions.filter(transaction => transaction.group !== groupId)
        );
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      handleApiError(error);
      throw error;
    }
  };

  // Transaction management functions
  const createTransaction = async (transactionData) => {
    try {
      setError(null);
      const response = await apiService.createTransaction(transactionData);
      
      if (response.success) {
        const newTransaction = response.data.transaction;
        setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
        
        // Update group totals
        await loadGroups();
        
        return newTransaction;
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      handleApiError(error);
      throw error;
    }
  };

  const updateTransaction = async (transactionId, transactionData) => {
    try {
      setError(null);
      const response = await apiService.updateTransaction(transactionId, transactionData);
      
      if (response.success) {
        const updatedTransaction = response.data.transaction;
        setTransactions(prevTransactions => 
          prevTransactions.map(transaction => 
            transaction._id === transactionId ? updatedTransaction : transaction
          )
        );
        
        // Update group totals
        await loadGroups();
        
        return updatedTransaction;
      }
    } catch (error) {
      console.error('Error updating transaction:', error);
      handleApiError(error);
      throw error;
    }
  };

  const deleteTransaction = async (transactionId) => {
    try {
      setError(null);
      const response = await apiService.deleteTransaction(transactionId);
      
      if (response.success) {
        setTransactions(prevTransactions => 
          prevTransactions.filter(transaction => transaction._id !== transactionId)
        );
        
        // Update group totals
        await loadGroups();
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      handleApiError(error);
      throw error;
    }
  };

  const markTransactionPaid = async (transactionId, userId, paid = true) => {
    try {
      setError(null);
      const response = await apiService.markTransactionPaid(transactionId, userId, paid);
      
      if (response.success) {
        const updatedTransaction = response.data.transaction;
        setTransactions(prevTransactions => 
          prevTransactions.map(transaction => 
            transaction._id === transactionId ? updatedTransaction : transaction
          )
        );
        
        return updatedTransaction;
      }
    } catch (error) {
      console.error('Error marking transaction paid:', error);
      handleApiError(error);
      throw error;
    }
  };

  // Helper functions for backward compatibility
  const getUserGroups = () => {
    if (!currentUser) return [];
    
    const userGroups = groups.filter(group => {
      if (!group || !group.members) {
        return false;
      }
      
      return group.members.some(member => {
        // Handle different member structure possibilities
        const memberId = member.user?._id || member.user?.id || member._id || member.id;
        const currentUserId = currentUser.id || currentUser._id;
        
        return memberId === currentUserId;
      });
    });
    
    return userGroups;
  };

  const getUserTransactions = () => {
    if (!currentUser) return [];
    return transactions.filter(transaction =>
      transaction.payer._id === currentUser.id ||
      transaction.participants.some(p => p.user._id === currentUser.id)
    );
  };

  const calculateUserBalance = () => {
    if (!currentUser) return { totalOwed: 0, totalOwing: 0, netBalance: 0 };
    
    // This will be replaced with real API call later
    // For now, return mock data for compatibility
    return {
      totalOwed: 0,
      totalOwing: 0,
      netBalance: 0
    };
  };

  const getGroupBalances = async (groupId) => {
    try {
      const response = await apiService.getGroupBalances(groupId);
      if (response.success) {
        return response.data.balances;
      }
      return [];
    } catch (error) {
      console.error('Error getting group balances:', error);
      handleApiError(error);
      return [];
    }
  };

  // Clear all data (for logout)
  const clearData = () => {
    setGroups([]);
    setTransactions([]);
    setError(null);
    setIsLoading(false);
  };

  // Retry failed operations
  const retry = () => {
    if (currentUser) {
      initializeData();
    }
  };

  const value = {
    // State
    groups,
    transactions,
    isLoading,
    error,

    // Group methods
    createGroup,
    updateGroup,
    deleteGroup,
    addGroupMember,
    removeGroupMember,
    leaveGroup,
    getUserGroups,
    getGroupBalances,

    // Transaction methods
    createTransaction,
    updateTransaction,
    deleteTransaction,
    markTransactionPaid,
    getUserTransactions,
    loadTransactions,
    calculateUserBalance,

    // Utility methods
    clearData,
    retry,
    refresh: initializeData
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataProvider;