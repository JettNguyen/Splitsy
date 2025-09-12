import React, { useState } from 'react';
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
} from 'react-native';

const SplitsyApp = () => {
  const [currentTab, setCurrentTab] = useState('home');
  const [showModal, setShowModal] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    group: 1,
  });

  // Sample data
  const users = [
    { id: 1, name: 'Jett Nguyen', email: 'jett@email.com', avatar: 'JN' },
    { id: 2, name: 'Chandler Rosen', email: 'chandler@email.com', avatar: 'CR' },
    { id: 3, name: 'Dominic Ghizzoni', email: 'dominic@email.com', avatar: 'DG' }
  ];

  const groups = [
    { id: 1, name: 'House', members: [1, 2], color: '#6366F1' },
    { id: 2, name: 'Vegas Trip 2024', members: [1, 2, 3], color: '#EC4899' }
  ];

  const [transactions, setTransactions] = useState([
    { id: 1, groupId: 1, payerId: 1, amount: 84.50, description: 'Grocery shopping', date: '2025-09-01', participants: [1, 2], settled: false },
    { id: 2, groupId: 2, payerId: 2, amount: 120.00, description: 'Hotel booking', date: '2024-01-14', participants: [1, 2, 3], settled: false },
    { id: 3, groupId: 1, payerId: 2, amount: 45.30, description: 'Utilities bill', date: '2025-08-13', participants: [1, 2], settled: true }
  ]);

  const calculateBalance = () => {
    let owes = 0;
    let owed = 0;

    transactions.forEach(transaction => {
      if (!transaction.settled && transaction.participants.includes(1)) {
        const splitAmount = transaction.amount / transaction.participants.length;
        
        if (transaction.payerId === 1) {
          owed += splitAmount * (transaction.participants.length - 1);
        } else {
          owes += splitAmount;
        }
      }
    });

    return { owes: owes.toFixed(2), owed: owed.toFixed(2), net: (owed - owes).toFixed(2) };
  };

  const addExpense = () => {
    if (!expenseForm.description || !expenseForm.amount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newTransaction = {
      id: transactions.length + 1,
      groupId: expenseForm.group,
      payerId: 1,
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description,
      date: new Date().toISOString().split('T')[0],
      participants: [1, 2],
      settled: false
    };

    setTransactions([newTransaction, ...transactions]);
    setExpenseForm({ description: '', amount: '', group: 1 });
    setShowModal(null);
    Alert.alert('Success', 'Expense added successfully!');
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
    const balance = calculateBalance();

    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeTitle}>Hello, Jett!</Text>
              <Text style={styles.welcomeSubtitle}>Here's your balance summary</Text>
            </View>
            <TouchableOpacity style={styles.notificationIcon}>
              <Text style={styles.notificationEmoji}>🔔</Text>
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>!</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Balance Cards */}
          <View style={styles.balanceGrid}>
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceIcon}>↗️</Text>
                <Text style={styles.balanceLabel}>You're owed</Text>
              </View>
              <Text style={styles.balanceAmount}>${balance.owed}</Text>
            </View>
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceIcon}>↙️</Text>
                <Text style={styles.balanceLabel}>You owe</Text>
              </View>
              <Text style={styles.balanceAmount}>${balance.owes}</Text>
            </View>
          </View>

          {/* Net Balance */}
          <View style={styles.netBalance}>
            <Text style={styles.netLabel}>Net Balance</Text>
            <Text style={[
              styles.netAmount, 
              parseFloat(balance.net) >= 0 ? styles.positive : styles.negative
            ]}>
              ${Math.abs(parseFloat(balance.net)).toFixed(2)}
            </Text>
            <Text style={styles.netSubtext}>
              {parseFloat(balance.net) >= 0 ? "You're ahead!" : "You owe overall"}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton]}
            onPress={() => setShowModal('expense')}
          >
            <Text style={styles.actionButtonText}>➕ Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.successButton]}
            onPress={() => setShowModal('settle')}
          >
            <Text style={styles.actionButtonText}>✅ Settle Up</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>

          {transactions.slice(0, 5).map((transaction) => {
            const payer = users.find(u => u.id === transaction.payerId);
            const group = groups.find(g => g.id === transaction.groupId);
            const isCurrentUserPayer = transaction.payerId === 1;
            const splitAmount = transaction.amount / transaction.participants.length;

            return (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionContent}>
                  <View style={styles.transactionLeft}>
                    <View style={[styles.avatar, { backgroundColor: group.color }]}>
                      <Text style={styles.avatarText}>{payer.avatar}</Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>{transaction.description}</Text>
                      <Text style={styles.transactionSubtitle}>
                        {group.name} • {transaction.date}
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
    <ScrollView style={styles.container}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Groups</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>➕</Text>
        </TouchableOpacity>
      </View>
      
      {groups.map((group) => {
        const groupTransactions = transactions.filter(t => t.groupId === group.id);
        const totalAmount = groupTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        return (
          <View key={group.id} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={styles.groupLeft}>
                <View style={[styles.groupIcon, { backgroundColor: group.color + '20' }]}>
                  <Text style={[styles.groupIconText, { color: group.color }]}>👥</Text>
                </View>
                <View>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupSubtitle}>
                    {group.members.length} members • ${totalAmount.toFixed(2)} total
                  </Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
            
            <View style={styles.memberAvatars}>
              {group.members.map(memberId => {
                const member = users.find(u => u.id === memberId);
                return (
                  <View
                    key={memberId}
                    style={[styles.memberAvatar, { backgroundColor: group.color }]}
                  >
                    <Text style={styles.memberAvatarText}>{member.avatar}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  const ActivityScreen = () => {
    const notifications = [
      { id: 1, type: 'owe', amount: 42.25, to: 'Jett Nguyen', description: 'Grocery shopping' },
      { id: 2, type: 'owed', amount: 40.00, from: 'Dominic Ghizzoni', description: 'Hotel booking' }
    ];

    return (
      <ScrollView style={styles.container}>
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Activity</Text>
        </View>
        
        {notifications.map((notification) => (
          <View key={notification.id} style={styles.notificationCard}>
            <View style={styles.notificationLeft}>
              <View style={[
                styles.notificationIconContainer,
                notification.type === 'owe' ? styles.oweIcon : styles.owedIcon
              ]}>
                <Text style={styles.notificationIconText}>
                  {notification.type === 'owe' ? '↙️' : '↗️'}
                </Text>
              </View>
              <View style={styles.notificationInfo}>
                <Text style={styles.notificationTitle}>
                  {notification.type === 'owe' ? 'You owe' : "You're owed"} ${notification.amount}
                </Text>
                <Text style={styles.notificationSubtitle}>
                  {notification.type === 'owe' ? `to ${notification.to}` : `from ${notification.from}`} • {notification.description}
                </Text>
              </View>
            </View>
            
            <View style={styles.notificationActions}>
              {notification.type === 'owe' && (
                <TouchableOpacity 
                  style={styles.payButton}
                  onPress={() => setShowModal('settle')}
                >
                  <Text style={styles.payButtonText}>Pay Now</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.remindButton}>
                <Text style={styles.remindButtonText}>Remind</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#6366F1" />
      
      {/* Main Content */}
      <View style={styles.mainContainer}>
        {currentTab === 'home' && <HomeScreen />}
        {currentTab === 'groups' && <GroupsScreen />}
        {currentTab === 'activity' && <ActivityScreen />}
        {currentTab === 'profile' && (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholderText}>Profile Screen</Text>
          </View>
        )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {[
          { id: 'home', emoji: '🏠', label: 'Home' },
          { id: 'groups', emoji: '👥', label: 'Groups' },
          { id: 'activity', emoji: '🔔', label: 'Activity' },
          { id: 'profile', emoji: '⚙️', label: 'Profile' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.navItem,
              currentTab === tab.id && styles.navItemActive
            ]}
            onPress={() => setCurrentTab(tab.id)}
          >
            <Text style={styles.navIcon}>{tab.emoji}</Text>
            <Text style={[
              styles.navLabel,
              currentTab === tab.id && styles.navLabelActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Expense Modal */}
      <Modal
        visible={showModal === 'expense'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TouchableOpacity onPress={() => setShowModal(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={styles.formInput}
                placeholder="What was this expense for?"
                value={expenseForm.description}
                onChangeText={(text) => setExpenseForm({...expenseForm, description: text})}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={expenseForm.amount}
                  onChangeText={(text) => setExpenseForm({...expenseForm, amount: text})}
                />
              </View>
            </View>
            
            <TouchableOpacity style={styles.submitButton} onPress={addExpense}>
              <Text style={styles.submitButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Settle Up Modal */}
      <Modal
        visible={showModal === 'settle'}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settle Up</Text>
            <TouchableOpacity onPress={() => setShowModal(null)}>
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
                    style={styles.paymentButton}
                    onPress={() => {
                      openPaymentApp(method.key);
                      setShowModal(null);
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
                  setShowModal(null);
                }}
              >
                <Text style={styles.sendButtonText}>Send 📤</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  mainContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#6366F1',
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
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  netBalance: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  netLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  netAmount: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  positive: {
    color: '#10B981',
  },
  negative: {
    color: '#F87171',
  },
  netSubtext: {
    color: 'rgba(255,255,255,0.7)',
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
    backgroundColor: '#6366F1',
  },
  successButton: {
    backgroundColor: '#10B981',
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
    color: '#111827',
  },
  viewAllButton: {
    color: '#6366F1',
    fontWeight: '600',
    fontSize: 16,
  },
  transactionCard: {
    backgroundColor: 'white',
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
    color: '#111827',
    marginBottom: 2,
  },
  transactionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
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
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navItemActive: {
    // Active state styling handled by text color
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  navLabelActive: {
    color: '#6366F1',
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#6366F1',
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
    backgroundColor: 'white',
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
    color: '#111827',
    marginBottom: 2,
  },
  groupSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  chevron: {
    fontSize: 20,
    color: '#9CA3AF',
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#6B7280',
  },
  notificationCard: {
    backgroundColor: 'white',
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
    color: '#111827',
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  payButton: {
    backgroundColor: '#6366F1',
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
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
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
    backgroundColor: '#6366F1',
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

export default SplitsyApp;