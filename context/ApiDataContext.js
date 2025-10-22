import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

//services and context
import apiService from '../services/apiService';
import { useUser } from './UserContext';

//data context for managing groups and transactions
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
  
  const [userTransactions, setUserTransactions] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [userBalances, setUserBalances] = useState(null); 

  useEffect(() => {
    if (currentUser) {
      initializeData();
    } 
    else {
      //if no user is authenticated, reset state
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

      //initialize api service
      await apiService.init();

      // If there's no auth token after init, don't call protected endpoints.
      // This avoids noisy 401 logs when the app has a local cached user but no valid token.
      if (!apiService.token) {
        console.warn('ApiDataContext: no auth token available; skipping protected data load');
        setGroups([]);
        setTransactions([]);
        return;
      }

      //load user's groups
      await loadGroups();
      await fetchUserBalances();

    } 
    catch (error) {
      console.error('Error initializing data:', error);
      setError(error.message);
    } 
    finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await apiService.getGroups();

      // Acceptable shapes from backend:
      // - array of groups
      // - { success: true, data: { groups: [...] } }
      // - a single group object
      if (Array.isArray(response)) {
        setGroups(response);
      } else if (response && response.success && response.data && Array.isArray(response.data.groups)) {
        setGroups(response.data.groups);
      } else if (response && typeof response === 'object' && response.id) {
        // single group object returned
        setGroups([response]);
      } else {
        setGroups([]);
      }
    } 
    catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
      handleApiError(error);
    }
  };

  const loadTransactions = async (groupId) => {
    try {
      const response = await apiService.getTransactions(groupId);
      // Backend may return different shapes:
      // - { success: true, data: [tx, ...] }
      // - { success: true, data: { transactions: [...] } }
      // - directly an array
      if (response && response.success) {
        const payload = response.data ?? response;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload.transactions)) return payload.transactions;
        if (Array.isArray(payload.data)) return payload.data;
        return [];
      }
    } 
    catch (error) {
      console.error('Error loading transactions:', error);
      handleApiError(error);
      return [];
    }
  };

  const handleApiError = (error) => {
    if (error.message.includes('Authentication failed')) {
      Alert.alert(
        'Session Expired',
        'Please log in again to continue.',
        [{ text: 'OK', onPress: () => {/* Navigate to login */ } }]
      );
    } 
    else if (error.message.includes('Cannot connect')) {
      setError('Cannot connect to server. Please check your internet connection.');
    } 
    else {
      setError(error.message);
    }
  };

  const createGroup = async (groupData) => {
    // Create a new group on the backend, then append it to local state.
    try {
      setError(null);
      const response = await apiService.createGroup(groupData);

      
      if (response.success) {
        const newGroup = response.group || response.data?.group;
        if (newGroup) {
          setGroups(prevGroups => [newGroup, ...prevGroups]);
          return newGroup;
        }
      } 
      else {
        throw new Error(response.message || 'Failed to create group');
      }
    } 
    catch (error) {
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
    } 
    catch (error) {
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
        setTransactions(prevTransactions => 
          prevTransactions.filter(transaction => 
            transaction.group !== groupId && transaction.groupId !== groupId
          )
        );
      }
    } 
    catch (error) {
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
    } 
    catch (error) {
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
    } 
    catch (error) {
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
        setTransactions(prevTransactions => 
          prevTransactions.filter(transaction => transaction.group !== groupId)
        );
      }
    } 
    catch (error) {
      console.error('Error leaving group:', error);
      handleApiError(error);
      throw error;
    }
  };

  const createTransaction = async (transactionData) => {
    // Send a new transaction to the backend and update local cache.
    try {
      setError(null);
      const response = await apiService.createTransaction(transactionData);

      if (response && response.success) {
        // normalize possible shapes
        const newTransaction = response.data?.transaction ?? response.data ?? response.transaction ?? null;
        if (newTransaction) {
          setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
          await loadGroups();
          return newTransaction;
        }
      }
    } 
    catch (error) {
      console.error('Error creating transaction:', error);
      handleApiError(error);
      throw error;
    }
  };

  const updateTransaction = async (transactionId, transactionData) => {
    try {
      setError(null);
      const response = await apiService.updateTransaction(transactionId, transactionData);

      if (response && response.success) {
        const updatedTransaction = response.data?.transaction ?? response.data ?? response.transaction ?? null;
        if (updatedTransaction) {
          setTransactions(prevTransactions => 
            prevTransactions.map(transaction => 
              transaction._id === transactionId ? updatedTransaction : transaction
            )
          );
          await loadGroups();
          return updatedTransaction;
        }
      }
    } 
    catch (error) {
      console.error('Error updating transaction:', error);
      handleApiError(error);
      throw error;
    }
  };

  const deleteTransaction = async (transactionId) => {
    try {
      setError(null);
      const response = await apiService.deleteTransaction(transactionId);

      if (response && response.success) {
        setTransactions(prevTransactions => 
          prevTransactions.filter(transaction => transaction._id !== transactionId)
        );
        await loadGroups();
      }
    } 
    catch (error) {
      console.error('Error deleting transaction:', error);
      handleApiError(error);
      throw error;
    }
  };

  const markTransactionPaid = async (transactionId, userId, paid = true) => {
    // Mark a participant as paid in a transaction; update the local transactions list.
    try {
      setError(null);
      const response = await apiService.markTransactionPaid(transactionId, userId, paid);

      if (response && response.success) {
        const updatedTransaction = response.data?.transaction ?? response.data ?? response.transaction ?? null;
        if (updatedTransaction) {
          setTransactions(prevTransactions => 
            prevTransactions.map(transaction => 
              transaction._id === transactionId ? updatedTransaction : transaction
            )
          );
          return updatedTransaction;
        }
      }
    } 
    catch (error) {
      console.error('Error marking transaction paid:', error);
      handleApiError(error);
      throw error;
    }
  };

  const getUserGroups = () => {
    if (!currentUser) return [];
    
    const userGroups = groups.filter(group => {
      if (!group || !group.members) {
        return false;
      }
      
      return group.members.some(member => {
        const memberId = member.user?._id || member.user?.id || member._id || member.id;
        const currentUserId = currentUser.id || currentUser._id;
        
        return memberId === currentUserId;
      });
    });
    
    return userGroups;
  };

  const getUserTransactions = () => {
    // Return transactions where the current user is the payer or a participant
    if (!currentUser) return [];
    return transactions.filter(transaction =>
      (transaction.payer && (transaction.payer._id || transaction.payer) === (currentUser.id || currentUser._id)) ||
      (Array.isArray(transaction.participants) && transaction.participants.some(p => (p.user && (p.user._id || p.user) === (currentUser.id || currentUser._id))))
    );
  };
  const calculateUserBalance = useCallback(() => {
    if (!currentUser || !Array.isArray(transactions)) {
      return { owed: 0, owes: 0, net: 0 };
    }
    // Compute what others owe the user (owed) and what the user owes (owes)
    let totalOwed = 0;
    let totalOwing = 0;
    
    try {
      transactions.forEach(transaction => {
        if (!transaction || typeof transaction.amount !== 'number' || !Array.isArray(transaction.participants)) {
          return;
        }
        
        const currentUserId = currentUser.id || currentUser._id;
        const payerId = transaction.payer?._id || transaction.payer?.id || transaction.payer;
        // If the current user is the payer, others owe their share; otherwise, the user owes their participant amount
        // Check if current user is the payer
        if (payerId === currentUserId) {
          // User paid the full amount
          const userParticipant = transaction.participants.find(p => {
            const participantId = p.user?._id || p.user?.id || p.user;
            return participantId === currentUserId;
          });
          
            if (userParticipant) {
              // User paid the full amount but also owes their share
              // So others owe: (total amount - user's share)
              const othersOwe = transaction.amount - userParticipant.amount;
              totalOwed += othersOwe;
            }
        } else {
          // User is a participant, check how much they owe
          const userParticipant = transaction.participants.find(p => {
            const participantId = p.user?._id || p.user?.id || p.user;
            return participantId === currentUserId;
          });
          
            if (userParticipant) {
              totalOwing += userParticipant.amount;
            }
        }
      });
    } 
    catch (error) {
      console.warn('Error calculating user balance:', error);
      return { owed: 0, owes: 0, net: 0 };
    }
    
    const result = {
      owed: Math.max(0, totalOwed),
      owes: Math.max(0, totalOwing),
      net: totalOwed - totalOwing
    };
    
    // Result holds the totals: owed (others owe user), owes (user owes), net (owed - owes)
    
    return result;
  }, [currentUser, transactions]);

const fetchUserBalances = async () => {
  if (!currentUser) return;

  try {
    const response = await apiService.getUserBalances();

    if (response && response.success && response.data) {
      setUserBalances(response.data);
    } else {
      console.warn('Failed to fetch user balances:', response?.message || 'Unknown error');
      setUserBalances(null);
    }
  } catch (error) {
    console.error('Error fetching user balances:', error.message);
    setUserBalances(null);
  }
};


  const getGroupBalances = async (groupId) => {
    try {
      const response = await apiService.getGroupBalances(groupId);
      if (response.success) {
        return response.data.balances;
      }
      return [];
    } 
    catch (error) {
      console.error('Error getting group balances:', error);
      handleApiError(error);
      return [];
    }
  };

  const clearData = () => {
    setGroups([]);
    setTransactions([]);
    setError(null);
    setIsLoading(false);
  };

  const retry = () => {
    if (currentUser) {
      initializeData();
    }
  };

  const value = useMemo(() => ({
  groups,
  transactions,
  isLoading,
  error,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  getUserGroups,
  getGroupBalances,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  markTransactionPaid,
  getUserTransactions,
  loadTransactions,
  calculateUserBalance,
  fetchUserBalances,
  userBalances,
  clearData,
  retry,
  refresh: initializeData,
}), [
  groups,
  transactions,
  isLoading,
  error,
  userBalances, 
]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export default DataProvider;