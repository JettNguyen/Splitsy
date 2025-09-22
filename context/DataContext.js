import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load groups
      const storedGroups = await AsyncStorage.getItem('groups');
      if (storedGroups) {
        setGroups(JSON.parse(storedGroups));
      }

      // Load transactions
      const storedTransactions = await AsyncStorage.getItem('transactions');
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveGroups = async (newGroups) => {
    try {
      await AsyncStorage.setItem('groups', JSON.stringify(newGroups));
      setGroups(newGroups);
    } catch (error) {
      console.error('Error saving groups:', error);
    }
  };

  const saveTransactions = async (newTransactions) => {
    try {
      await AsyncStorage.setItem('transactions', JSON.stringify(newTransactions));
      setTransactions(newTransactions);
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  };

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Group management
  const createGroup = async (groupData) => {
    try {
      const newGroup = {
        id: generateId(),
        ...groupData,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id,
        members: [currentUser.id, ...(groupData.members || [])],
        color: groupData.color || '#6366F1'
      };

      const updatedGroups = [...groups, newGroup];
      await saveGroups(updatedGroups);
      
      return { success: true, group: newGroup };
    } catch (error) {
      console.error('Error creating group:', error);
      return { success: false, error: error.message };
    }
  };

  const updateGroup = async (groupId, updates) => {
    try {
      const updatedGroups = groups.map(group => 
        group.id === groupId ? { ...group, ...updates } : group
      );
      
      await saveGroups(updatedGroups);
      return { success: true };
    } catch (error) {
      console.error('Error updating group:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      // Remove group
      const updatedGroups = groups.filter(group => group.id !== groupId);
      await saveGroups(updatedGroups);
      
      // Remove related transactions
      const updatedTransactions = transactions.filter(t => t.groupId !== groupId);
      await saveTransactions(updatedTransactions);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting group:', error);
      return { success: false, error: error.message };
    }
  };

  const addMemberToGroup = async (groupId, memberId) => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      if (group.members.includes(memberId)) {
        return { success: false, error: 'User is already a member' };
      }

      const updatedMembers = [...group.members, memberId];
      await updateGroup(groupId, { members: updatedMembers });
      
      return { success: true };
    } catch (error) {
      console.error('Error adding member:', error);
      return { success: false, error: error.message };
    }
  };

  const removeMemberFromGroup = async (groupId, memberId) => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) {
        return { success: false, error: 'Group not found' };
      }

      const updatedMembers = group.members.filter(id => id !== memberId);
      await updateGroup(groupId, { members: updatedMembers });
      
      return { success: true };
    } catch (error) {
      console.error('Error removing member:', error);
      return { success: false, error: error.message };
    }
  };

  // Transaction management
  const addTransaction = async (transactionData) => {
    try {
      const newTransaction = {
        id: generateId(),
        ...transactionData,
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        settled: false
      };

      const updatedTransactions = [newTransaction, ...transactions];
      await saveTransactions(updatedTransactions);
      
      return { success: true, transaction: newTransaction };
    } catch (error) {
      console.error('Error adding transaction:', error);
      return { success: false, error: error.message };
    }
  };

  const updateTransaction = async (transactionId, updates) => {
    try {
      const updatedTransactions = transactions.map(transaction => 
        transaction.id === transactionId ? { ...transaction, ...updates } : transaction
      );
      
      await saveTransactions(updatedTransactions);
      return { success: true };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return { success: false, error: error.message };
    }
  };

  const settleTransaction = async (transactionId) => {
    try {
      await updateTransaction(transactionId, { settled: true, settledAt: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      console.error('Error settling transaction:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteTransaction = async (transactionId) => {
    try {
      const updatedTransactions = transactions.filter(t => t.id !== transactionId);
      await saveTransactions(updatedTransactions);
      return { success: true };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return { success: false, error: error.message };
    }
  };

  // Utility functions
  const getUserGroups = () => {
    if (!currentUser) return [];
    return groups.filter(group => group.members.includes(currentUser.id));
  };

  const getUserTransactions = () => {
    if (!currentUser) return [];
    return transactions.filter(transaction => 
      transaction.participants && transaction.participants.includes(currentUser.id)
    );
  };

  const calculateUserBalance = () => {
    if (!currentUser) return { owes: 0, owed: 0, net: 0 };

    let owes = 0;
    let owed = 0;

    const userTransactions = getUserTransactions();
    
    userTransactions.forEach(transaction => {
      if (!transaction.settled && transaction.participants && transaction.participants.includes(currentUser.id)) {
        const splitAmount = transaction.amount / transaction.participants.length;
        
        if (transaction.payerId === currentUser.id) {
          owed += splitAmount * (transaction.participants.length - 1);
        } else {
          owes += splitAmount;
        }
      }
    });

    return { 
      owes: parseFloat(owes.toFixed(2)), 
      owed: parseFloat(owed.toFixed(2)), 
      net: parseFloat((owed - owes).toFixed(2)) 
    };
  };

  const getGroupTransactions = (groupId) => {
    return transactions.filter(t => t.groupId === groupId);
  };

  const value = {
    groups,
    transactions,
    isLoading,
    createGroup,
    updateGroup,
    deleteGroup,
    addMemberToGroup,
    removeMemberFromGroup,
    addTransaction,
    updateTransaction,
    settleTransaction,
    deleteTransaction,
    getUserGroups,
    getUserTransactions,
    calculateUserBalance,
    getGroupTransactions
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};