import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } 
    catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const saveNotifications = async (newNotifications) => {
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(newNotifications));
      setNotifications(newNotifications);
    } 
    catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const addNotification = async (notification) => {
    const newNotification = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification
    };

    const updated = [newNotification, ...notifications];
    await saveNotifications(updated);
    
    return newNotification;
  };

  const markAsRead = async (notificationId) => {
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    await saveNotifications(updated);
  };

  const markAllAsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    await saveNotifications(updated);
  };

  const clearNotifications = async () => {
    await saveNotifications([]);
  };

  const removeNotification = async (notificationId) => {
    const updated = notifications.filter(n => n.id !== notificationId);
    await saveNotifications(updated);
  };

  // notification types
  const notifyExpenseAdded = async (expense, groupName) => {
    return await addNotification({
      type: 'expense_added',
      title: 'New Expense Added',
      message: `${expense.description} - $${expense.amount.toFixed(2)} in ${groupName}`,
      icon: '💳',
      data: { expenseId: expense.id, groupId: expense.groupId }
    });
  };

  const notifyPaymentRequest = async (amount, fromUser, forExpense) => {
    return await addNotification({
      type: 'payment_request',
      title: 'Payment Request',
      message: `${fromUser} requests $${amount.toFixed(2)} for ${forExpense}`,
      icon: '💰',
      data: { amount, fromUser, forExpense }
    });
  };

  const notifyPaymentReceived = async (amount, fromUser) => {
    return await addNotification({
      type: 'payment_received',
      title: 'Payment Received',
      message: `You received $${amount.toFixed(2)} from ${fromUser}`,
      icon: '✅',
      data: { amount, fromUser }
    });
  };

  const notifyGroupInvite = async (groupName, inviterName) => {
    return await addNotification({
      type: 'group_invite',
      title: 'Group Invitation',
      message: `${inviterName} invited you to join "${groupName}"`,
      icon: '👥',
      data: { groupName, inviterName }
    });
  };

  const notifyReminder = async (amount, toUser, forExpense) => {
    return await addNotification({
      type: 'reminder',
      title: 'Payment Reminder',
      message: `Reminder: You owe ${toUser} $${amount.toFixed(2)} for ${forExpense}`,
      icon: '⏰',
      data: { amount, toUser, forExpense }
    });
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const value = {
    notifications,
    unreadCount,
    getUnreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
    notifyExpenseAdded,
    notifyPaymentRequest,
    notifyPaymentReceived,
    notifyGroupInvite,
    notifyReminder
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};