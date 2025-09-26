import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  SafeAreaView,
  StatusBar,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { UserProvider, useUser } from './context/UserContext';
import { DataProvider, useData } from './context/DataContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import AuthScreen from './screens/AuthScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettlementScreen from './screens/SettlementScreen';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ExpenseReportsScreen from './screens/ExpenseReportsScreen';
import GroupManagementScreen from './screens/GroupManagementScreen';
import EnhancedExpenseForm from './components/EnhancedExpenseForm';

const SplitsyApp = () => {
  const { currentUser, isAuthenticated, isLoading: userLoading } = useUser();
  const { 
    groups, 
    transactions, 
    getUserGroups, 
    getUserTransactions, 
    calculateUserBalance,
    addTransaction,
    createGroup,
    isLoading: dataLoading 
  } = useData();
  const { notifications, getUnreadCount, notifyExpenseAdded, markAllAsRead } = useNotifications();
  const { showSuccess, showError, showInfo } = useToast();
  const { theme } = useTheme();
  

  
  const [currentTab, setCurrentTab] = useState('home');
  const [showModal, setShowModal] = useState(null);
  
  // Unified function to close all modals and prevent stacking
  const closeAllModals = () => {
    setShowModal(null);
  };
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    groupId: '',
    participants: []
  });
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: ''
  });

  // Debug loading states (development only)
  if (__DEV__) {
    console.log('App loading states:', { userLoading, dataLoading, isAuthenticated });
  }
  
  if (userLoading || dataLoading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>💰</Text>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading Splitsy...</Text>
          <Text style={[styles.debugText, { color: theme.colors.textSecondary }]}>
            {userLoading ? 'Loading user data...' : ''} 
            {dataLoading ? 'Loading app data...' : ''}
          </Text>
          <View style={styles.loadingDots}>
            <Text style={[styles.loadingDot, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.loadingDot, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.loadingDot, { color: theme.colors.primary }]}>•</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const userGroups = getUserGroups();
  const userTransactions = getUserTransactions();
  const balance = calculateUserBalance();

  const addExpense = async (expenseData) => {
    const result = await addTransaction(expenseData);

    if (result.success) {
      showSuccess('Expense added successfully!');
      
      // Create notification for expense
      const group = userGroups.find(g => g.id === expenseData.groupId);
      notifyExpenseAdded(
        expenseData.description,
        expenseData.amount,
        group?.name || 'Unknown Group'
      );
    } else {
      showError(result.error || 'Failed to add expense');
    }
  };

  const addGroup = async () => {
    if (!groupForm.name) {
      showError('Please enter a group name');
      return;
    }

    const result = await createGroup({
      name: groupForm.name,
      description: groupForm.description
    });

    if (result.success) {
      setGroupForm({ name: '', description: '' });
      closeAllModals();
      showSuccess('Group created successfully!');
    } else {
      showError(result.error || 'Failed to create group');
    }
  };

  const openPaymentApp = (app, amount = '40.00', recipient = 'Chandler Rosen') => {
    const urls = {
      venmo: `venmo://paycharge?txn=pay&recipients=${recipient.replace(' ', '')}&amount=${amount}&note=Split%20expense`,
      paypal: `https://paypal.me/${recipient.replace(' ', '').toLowerCase()}/${amount}`,
      zelle: 'https://www.zellepay.com/',
    };

    Linking.openURL(urls[app]).catch(() => {
      Alert.alert('App not found', `Please install ${app} or use the web version`);
    });
  };

  const HomeScreen = () => {
    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>Hello, {currentUser.name.split(' ')[0]}!</Text>
              <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>Here's your balance summary</Text>
            </View>
          </View>

          {/* Balance Cards */}
          <View style={styles.balanceGrid}>
            <View style={[styles.balanceCard, { 
              backgroundColor: theme.colors.card, 
              borderLeftColor: theme.colors.success, 
              borderLeftWidth: 4 
            }]}>
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceIcon, { color: theme.colors.success }]}>↗️</Text>
                <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>You're owed</Text>
              </View>
              <Text style={[styles.balanceAmount, { color: theme.colors.success }]}>${balance.owed}</Text>
            </View>
            <View style={[styles.balanceCard, { 
              backgroundColor: theme.colors.card, 
              borderLeftColor: theme.colors.error, 
              borderLeftWidth: 4 
            }]}>
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceIcon, { color: theme.colors.error }]}>↙️</Text>
                <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>You owe</Text>
              </View>
              <Text style={[styles.balanceAmount, { color: theme.colors.error }]}>${balance.owes}</Text>
            </View>
          </View>

          {/* Net Balance */}
          <View style={[styles.netBalance, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.netLabel, { color: theme.colors.text }]}>Net Balance</Text>
            <Text style={[
              styles.netAmount, 
              balance.net >= 0 ? { color: theme.colors.success } : { color: theme.colors.error }
            ]}>
              ${Math.abs(balance.net).toFixed(2)}
            </Text>
            <Text style={[styles.netSubtext, { color: theme.colors.textSecondary }]}>
              {balance.net >= 0 ? "You're ahead!" : "You owe overall"}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowModal('expense')}
          >
            <Text style={styles.actionButtonText}>➕ Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
            onPress={() => setShowModal('settle')}
          >
            <Text style={styles.actionButtonText}>✅ Settle Up</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllButton, { color: theme.colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {userTransactions.slice(0, 5).map((transaction) => {
            const group = userGroups.find(g => g.id === transaction.groupId);
            const isCurrentUserPayer = transaction.payerId === currentUser.id;
            const splitAmount = transaction.amount / transaction.participants.length;

            return (
              <View key={transaction.id} style={[styles.transactionCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.transactionContent}>
                  <View style={styles.transactionLeft}>
                    <View style={[styles.avatar, { backgroundColor: group?.color || theme.colors.primary }]}>
                      <Text style={[styles.avatarText, { color: theme.colors.background }]}>{currentUser.avatar}</Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={[styles.transactionTitle, { color: theme.colors.text }]}>{transaction.description}</Text>
                      <Text style={[styles.transactionSubtitle, { color: theme.colors.textSecondary }]}>
                        {group?.name || 'Unknown Group'} • {transaction.date}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.transactionAmount,
                      isCurrentUserPayer ? styles.positive : styles.negative
                    ]}>
                      {isCurrentUserPayer ? '+' : '-'}${splitAmount.toFixed(2)}
                    </Text>
                    <View style={styles.statusContainer}>
                      <Text style={styles.statusIcon}>
                        {transaction.settled ? '✅' : '⏱️'}
                      </Text>
                      <Text style={[
                        styles.statusText,
                        transaction.settled ? styles.settled : styles.pending
                      ]}>
                        {transaction.settled ? 'Settled' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const GroupsScreen = () => (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.screenHeader, { 
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border 
      }]}>
        <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Groups</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowModal('group')}
        >
          <Text style={styles.addButtonText}>➕</Text>
        </TouchableOpacity>
      </View>
      
      {userGroups.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: theme.colors.background }]}>
          <Text style={styles.emptyStateEmoji}>👥</Text>
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Groups Yet</Text>
          <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>Create a group to start splitting expenses with friends!</Text>
        </View>
      ) : (
        userGroups.map((group) => {
          const groupTransactions = userTransactions.filter(t => t.groupId === group.id);
          const totalAmount = groupTransactions.reduce((sum, t) => sum + t.amount, 0);
          
          return (
            <View key={group.id} style={[styles.groupCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.groupHeader}>
                <View style={styles.groupLeft}>
                  <View style={[styles.groupIcon, { backgroundColor: group.color + '20' }]}>
                    <Text style={[styles.groupIconText, { color: group.color }]}>👥</Text>
                  </View>
                  <View>
                    <Text style={[styles.groupName, { color: theme.colors.text }]}>{group.name}</Text>
                    <Text style={[styles.groupSubtitle, { color: theme.colors.textSecondary }]}>
                      {group.members.length} members • ${totalAmount.toFixed(2)} total
                    </Text>
                  </View>
                </View>
                <Text style={[styles.chevron, { color: theme.colors.textSecondary }]}>›</Text>
              </View>
              
              <View style={styles.memberAvatars}>
                {group.members.slice(0, 4).map(memberId => (
                  <View
                    key={memberId}
                    style={[styles.memberAvatar, { backgroundColor: group.color }]}
                  >
                    <Text style={styles.memberAvatarText}>
                      {memberId === currentUser.id ? currentUser.avatar : 'U'}
                    </Text>
                  </View>
                ))}
                {group.members.length > 4 && (
                  <View style={[styles.memberAvatar, { backgroundColor: theme.colors.textTertiary }]}>
                    <Text style={[styles.memberAvatarText, { color: theme.colors.background }]}>+{group.members.length - 4}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  const ActivityScreen = () => {
    const recentTransactions = userTransactions.slice(0, 10);
    
    // Calculate pending payments
    const pendingPayments = userTransactions
      .filter(t => !t.settled && t.payerId !== currentUser.id)
      .map(t => ({
        ...t,
        splitAmount: t.amount / t.participants.length,
        group: userGroups.find(g => g.id === t.groupId)
      }));

    const pendingReceipts = userTransactions
      .filter(t => !t.settled && t.payerId === currentUser.id && t.participants.length > 1)
      .map(t => ({
        ...t,
        splitAmount: t.amount / t.participants.length,
        owedAmount: (t.amount / t.participants.length) * (t.participants.length - 1),
        group: userGroups.find(g => g.id === t.groupId)
      }));

    const recentNotifications = notifications.slice(0, 8);

    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.screenHeader, { 
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border 
        }]}>
          <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Activity</Text>
          {getUnreadCount() > 0 && (
            <TouchableOpacity 
              style={[styles.markAllReadButton, { backgroundColor: theme.colors.primary }]}
              onPress={async () => {
                await markAllAsRead();
                showInfo('All notifications marked as read');
              }}
            >
              <Text style={styles.markAllReadText}>Mark All Read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Notifications */}
        {recentNotifications.length > 0 && (
          <View style={styles.activitySection}>
            <Text style={[styles.activitySectionTitle, { color: theme.colors.text }]}>🔔 Recent Notifications</Text>
            {recentNotifications.map((notification) => (
              <View key={notification.id} style={[
                styles.notificationCard,
                { backgroundColor: theme.colors.card },
                !notification.read && {
                  borderLeftWidth: 4,
                  borderLeftColor: theme.colors.primary,
                  backgroundColor: theme.colors.surface
                }
              ]}>
                <View style={styles.notificationLeft}>
                  <View style={[
                    styles.notificationIcon,
                    { backgroundColor: notification.read ? theme.colors.surface : theme.colors.primary + '20' }
                  ]}>
                    <Text style={styles.notificationIconText}>
                      {notification.type === 'expense_added' ? '💰' :
                       notification.type === 'payment_request' ? '💳' :
                       notification.type === 'payment_received' ? '✅' :
                       notification.type === 'group_invite' ? '👥' : '📢'}
                    </Text>
                  </View>
                  <View style={styles.notificationInfo}>
                    <Text style={[
                      styles.notificationTitle,
                      { color: theme.colors.text },
                      !notification.read && styles.unreadTitle
                    ]}>
                      {notification.title}
                    </Text>
                    <Text style={[styles.notificationSubtitle, { color: theme.colors.textSecondary }]}>
                      {notification.message}
                    </Text>
                    <Text style={[styles.notificationTime, { color: theme.colors.textSecondary }]}>
                      {new Date(notification.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        
        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <View style={styles.activitySection}>
            <Text style={[styles.activitySectionTitle, { color: theme.colors.text }]}>💳 You Owe</Text>
            {pendingPayments.map((transaction) => (
              <View key={transaction.id} style={[styles.notificationCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.notificationLeft}>
                  <View style={[styles.oweIcon, { backgroundColor: theme.colors.error + '20' }]}>
                    <Text style={styles.notificationIconText}>↙️</Text>
                  </View>
                  <View style={styles.notificationInfo}>
                    <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
                      Pay ${transaction.splitAmount.toFixed(2)}
                    </Text>
                    <Text style={[styles.notificationSubtitle, { color: theme.colors.textSecondary }]}>
                      {transaction.group?.name || 'Unknown Group'} • {transaction.description}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.notificationActions}>
                  <TouchableOpacity 
                    style={[styles.payButton, { backgroundColor: theme.colors.error }]}
                    onPress={() => setShowModal('settle')}
                  >
                    <Text style={styles.payButtonText}>Pay Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Pending Receipts */}
        {pendingReceipts.length > 0 && (
          <View style={styles.activitySection}>
            <Text style={[styles.activitySectionTitle, { color: theme.colors.text }]}>💰 You're Owed</Text>
            {pendingReceipts.map((transaction) => (
              <View key={transaction.id} style={[styles.notificationCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.notificationLeft}>
                  <View style={[styles.owedIcon, { backgroundColor: theme.colors.success + '20' }]}>
                    <Text style={styles.notificationIconText}>↗️</Text>
                  </View>
                  <View style={styles.notificationInfo}>
                    <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
                      Collect ${transaction.owedAmount.toFixed(2)}
                    </Text>
                    <Text style={[styles.notificationSubtitle, { color: theme.colors.textSecondary }]}>
                      {transaction.group?.name || 'Unknown Group'} • {transaction.description}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.notificationActions}>
                  <TouchableOpacity 
                    style={[styles.remindButton, { backgroundColor: theme.colors.success }]}
                    onPress={() => Alert.alert('Reminder Sent', 'We\'ll remind your friends to pay you back!')}
                  >
                    <Text style={styles.remindButtonText}>Remind</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        {recentTransactions.length > 0 && (
          <View style={styles.activitySection}>
            <Text style={[styles.activitySectionTitle, { color: theme.colors.text }]}>📝 Recent Activity</Text>
            {recentTransactions.map((transaction) => {
              const group = userGroups.find(g => g.id === transaction.groupId);
              const isCurrentUserPayer = transaction.payerId === currentUser.id;
              const splitAmount = transaction.amount / transaction.participants.length;

              return (
                <View key={transaction.id} style={[styles.activityCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.activityCardContent}>
                    <View style={styles.activityLeft}>
                      <View style={[styles.activityIcon, { backgroundColor: group?.color || theme.colors.primary }]}>
                        <Text style={styles.activityIconText}>
                          {isCurrentUserPayer ? '💸' : '💳'}
                        </Text>
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={[styles.activityTitle, { color: theme.colors.text }]}>{transaction.description}</Text>
                        <Text style={[styles.activitySubtitle, { color: theme.colors.textSecondary }]}>
                          {group?.name || 'Unknown Group'} • {transaction.date}
                        </Text>
                        <Text style={[styles.activityDetail, { color: theme.colors.textSecondary }]}>
                          {isCurrentUserPayer 
                            ? `You paid $${transaction.amount.toFixed(2)}`
                            : `Split $${transaction.amount.toFixed(2)}`
                          }
                        </Text>
                      </View>
                    </View>
                    <View style={styles.activityRight}>
                      <Text style={[
                        styles.activityAmount,
                        isCurrentUserPayer ? styles.positive : styles.negative
                      ]}>
                        {isCurrentUserPayer ? '+' : '-'}${splitAmount.toFixed(2)}
                      </Text>
                      <View style={styles.activityStatus}>
                        <Text style={styles.statusIcon}>
                          {transaction.settled ? '✅' : '⏱️'}
                        </Text>
                        <Text style={[
                          styles.statusText,
                          transaction.settled ? styles.settled : styles.pending
                        ]}>
                          {transaction.settled ? 'Settled' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {recentTransactions.length === 0 && pendingPayments.length === 0 && pendingReceipts.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.background }]}>
            <Text style={styles.emptyStateEmoji}>📱</Text>
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Activity Yet</Text>
            <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
              Start by adding an expense or joining a group to see your activity here.
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.fullScreenContainer, { backgroundColor: theme.colors.background }]}>
      <StatusBar 
        barStyle={theme.statusBar === 'light' ? 'light-content' : 'dark-content'} 
        backgroundColor={theme.colors.background}
        translucent={true}
      />
      
      {/* Main Content - extends full screen including status bar area */}
      <View style={[styles.mainContainer, { backgroundColor: theme.colors.background }]}>
        <SafeAreaView style={[styles.contentSafeArea, { backgroundColor: theme.colors.background }]}>
          {currentTab === 'home' && <HomeScreen />}
          {currentTab === 'groups' && <GroupsScreen />}
          {currentTab === 'activity' && <ActivityScreen />}
          {currentTab === 'profile' && 
            <ProfileScreen 
              onNavigateToPaymentMethods={() => setShowModal('paymentMethods')}
              onNavigateToNotifications={() => setShowModal('notifications')}
              onNavigateToExpenseReports={() => setShowModal('expenseReports')}
              onNavigateToGroupManagement={() => setShowModal('groupManagement')}
            />
          }
        </SafeAreaView>
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        {[
          { id: 'home', emoji: '🏠', label: 'Home' },
          { id: 'groups', emoji: '👥', label: 'Groups' },
          { id: 'activity', emoji: '🔔', label: 'Activity' },
          { id: 'profile', emoji: '⚙️', label: 'Profile' }
        ].map((tab) => {
          const unreadCount = tab.id === 'activity' ? getUnreadCount() : 0;
          
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.navItem,
                currentTab === tab.id && styles.navItemActive
              ]}
              onPress={() => setCurrentTab(tab.id)}
            >
              <View style={styles.navIconContainer}>
                <Text style={styles.navIcon}>{tab.emoji}</Text>
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.navLabel,
                { color: currentTab === tab.id ? theme.colors.primary : theme.colors.textTertiary }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Enhanced Expense Form */}
      <EnhancedExpenseForm
        visible={showModal === 'expense'}
        onClose={closeAllModals}
        onSubmit={addExpense}
        groups={userGroups}
        currentUser={currentUser}
      />

      {/* Add Group Modal */}
      <Modal
        visible={showModal === 'group'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TouchableOpacity onPress={closeAllModals}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Group Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., House, Trip to Hawaii, Dinner"
                value={groupForm.name}
                onChangeText={(text) => setGroupForm({...groupForm, name: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="What's this group for?"
                value={groupForm.description}
                onChangeText={(text) => setGroupForm({...groupForm, description: text})}
                multiline
                numberOfLines={3}
              />
            </View>
            
            <View style={styles.infoBox}>
              <Text style={[styles.infoText, { color: theme.colors.primary }]}>
                💡 You can add members to this group after creating it by sharing your group code.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                { backgroundColor: !groupForm.name ? theme.colors.textTertiary : theme.colors.primary }
              ]} 
              onPress={addGroup}
              disabled={!groupForm.name}
            >
              <Text style={styles.submitButtonText}>Create Group</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Settlement Screen */}
      <SettlementScreen
        visible={showModal === 'settle'}
        onClose={closeAllModals}
      />

      {/* Settle Up Modal - Legacy */}
      <Modal
        visible={showModal === 'settle'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settle Up</Text>
            <TouchableOpacity onPress={closeAllModals}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.paymentMethods}>
              <Text style={styles.paymentMethodsTitle}>Choose payment method:</Text>
              <View style={styles.paymentGrid}>
                {[
                  { name: 'Venmo', emoji: '📱', key: 'venmo' },
                  { name: 'PayPal', emoji: '💳', key: 'paypal' },
                  { name: 'Zelle', emoji: '💰', key: 'zelle' }
                ].map((method) => (
                  <TouchableOpacity
                    key={method.key}
                    style={[styles.paymentButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                      openPaymentApp(method.key);
                      closeAllModals();
                    }}
                  >
                    <Text style={styles.paymentEmoji}>{method.emoji}</Text>
                    <Text style={styles.paymentName}>{method.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.debtCard}>
              <View style={styles.debtInfo}>
                <Text style={styles.debtAmount}>Pay $40.00</Text>
                <Text style={styles.debtTo}>to Chandler Rosen</Text>
              </View>
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={() => {
                  openPaymentApp('venmo');
                  closeAllModals();
                }}
              >
                <Text style={styles.sendButtonText}>Send 📤</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Payment Methods Screen */}
      <Modal
        visible={showModal === 'paymentMethods'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <PaymentMethodsScreen 
          visible={showModal === 'paymentMethods'}
          onClose={closeAllModals} 
        />
      </Modal>

      {/* Notifications Screen */}
      <Modal
        visible={showModal === 'notifications'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <NotificationsScreen 
          visible={showModal === 'notifications'}
          onClose={closeAllModals} 
        />
      </Modal>

      {/* Expense Reports Screen */}
      <Modal
        visible={showModal === 'expenseReports'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ExpenseReportsScreen 
          visible={showModal === 'expenseReports'}
          onClose={closeAllModals} 
        />
      </Modal>

      {/* Group Management Screen */}
      <Modal
        visible={showModal === 'groupManagement'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <GroupManagementScreen 
          visible={showModal === 'groupManagement'}
          onClose={closeAllModals} 
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    // backgroundColor handled by theme
  },
  safeArea: {
    flex: 1,
    paddingTop: 0, // Let SafeAreaView handle top inset
    // backgroundColor handled by theme
  },
  mainContainer: {
    flex: 1,
    paddingBottom: 0, // Remove any bottom padding to let bottom nav handle it
  },
  contentSafeArea: {
    flex: 1,
    paddingBottom: 90, // Add padding to account for absolute positioned bottom nav
  },
  container: {
    flex: 1,
    // backgroundColor handled by theme
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor handled by theme
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    // color handled by theme
    marginBottom: 16,
  },
  debugText: {
    fontSize: 12,
    // color handled by theme
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    fontSize: 24,
    // color handled by theme
    opacity: 0.6,
  },
  header: {
    // backgroundColor handled by theme
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  notificationIcon: {
    position: 'relative',
  },
  notificationEmoji: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  balanceCard: {
    flex: 1,
    // backgroundColor handled by theme
    borderRadius: 12,
    padding: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceIcon: {
    fontSize: 20,
  },
  balanceLabel: {
    // color handled by theme
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    // color handled by theme
  },
  netBalance: {
    // backgroundColor handled by theme
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  netLabel: {
    // color handled by theme
    fontSize: 14,
    marginBottom: 4,
  },
  netAmount: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  positive: {
    // color handled by theme
  },
  negative: {
    // color handled by theme
  },
  netSubtext: {
    // color handled by theme
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    // backgroundColor handled by theme (purple)
  },
  successButton: {
    // backgroundColor handled by theme (green)
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  viewAllButton: {
    // color handled by theme (purple)
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  transactionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionSubtitle: {
    fontSize: 14,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  statusText: {
    fontSize: 12,
  },
  settled: {
    color: '#10B981',
  },
  pending: {
    color: '#F59E0B',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8, // Reduced to make it shorter
    paddingHorizontal: 16,
    paddingBottom: 34, // Extra bottom padding for iPhone home indicator area
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 6, // Reduced to make navigation shorter
    paddingHorizontal: 12, // Reduced horizontal padding
    borderRadius: 8,
    minHeight: 40, // Reduced minimum height for shorter nav bar
  },
  navItemActive: {
    // Active state styling handled by text color
  },
  navIconContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 18, // Reduced for shorter nav bar
    marginBottom: 2, // Reduced spacing for compact design
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  navLabel: {
    fontSize: 12,
    // color handled by theme
  },
  navLabelActive: {
    // color handled by theme
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  addButton: {
    // backgroundColor handled by theme (purple)
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 20,
  },
  groupCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIconText: {
    fontSize: 20,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  groupSubtitle: {
    fontSize: 14,
  },
  chevron: {
    fontSize: 20,
  },
  memberAvatars: {
    flexDirection: 'row',
    marginLeft: -8,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  placeholderText: {
    fontSize: 18,
    color: '#6B7280',
  },
  notificationCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activitySection: {
    marginBottom: 24,
  },
  activitySectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginHorizontal: 24,
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  activityCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIconText: {
    fontSize: 18,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  activityDetail: {
    fontSize: 12,
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  activityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  oweIcon: {
    backgroundColor: '#FEE2E2',
  },
  owedIcon: {
    backgroundColor: '#D1FAE5',
  },
  notificationIconText: {
    fontSize: 20,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 14,
  },
  notificationTime: {
    fontSize: 12,
    marginTop: 4,
  },
  unreadNotification: {
    // styling handled inline with theme colors
  },
  unreadTitle: {
    fontWeight: '700',
  },
  markAllReadButton: {
    // backgroundColor handled by theme (purple)
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  markAllReadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  payButton: {
    // backgroundColor handled by theme (red for pay)
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  remindButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  remindButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dollarSign: {
    fontSize: 16,
    color: '#6B7280',
    paddingLeft: 12,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
  },
  groupSelector: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  groupOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  groupOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  groupOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  participantsInfo: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    // color handled by theme (purple)
  },
  submitButton: {
    // backgroundColor handled by theme (purple)
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  disabledButton: {
    // backgroundColor handled inline with theme
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethods: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  paymentMethodsTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  paymentGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    // backgroundColor handled by theme (purple)
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  paymentEmoji: {
    fontSize: 20,
  },
  paymentName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  debtCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtInfo: {
    flex: 1,
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  debtTo: {
    fontSize: 14,
    color: '#6B7280',
  },
  sendButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Main App Component with Providers
const App = () => {
  return (
    <ThemeProvider>
      <UserProvider>
        <DataProvider>
          <NotificationProvider>
            <ToastProvider>
              <SplitsyApp />
            </ToastProvider>
          </NotificationProvider>
        </DataProvider>
      </UserProvider>
    </ThemeProvider>
  );
};

export default App;