import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// screen components
import AuthScreen from './screens/AuthScreen';
import ProfileScreen from './screens/ProfileScreen';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ExpenseReportsScreen from './screens/ExpenseReportsScreen';
import ExpenseForm from './components/ExpenseForm';
import FriendsScreen from './screens/FriendsScreen';
import ActivityScreen from './screens/ActivityScreen';
import apiService from './services/apiService';

// external libraries
import { Ionicons } from '@expo/vector-icons';

// context providers
import { UserProvider, useUser } from './context/UserContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DataProvider, useData } from './context/ApiDataContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';

// styles
import AppStyles from './styles/AppStyles';

// navigation configuration
const TABS = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'friends', icon: 'people', label: 'Friends' },
  { id: 'activity', icon: 'list', label: 'Activity' },
  { id: 'profile', icon: 'settings', label: 'Settings' }
];

// reusable navigation button component
function NavButton({ tab, activeTab, scaleAnim, theme, onPress }) {
  const isActive = activeTab === tab.id;
  
  return (
    <Animated.View style={{ transform: [{ scale: isActive ? scaleAnim : 1 }] }}>
      <TouchableOpacity
        style={[
          AppStyles.tabButton,
          isActive && [AppStyles.activeTab, { backgroundColor: theme.colors.accent }]
        ]}
        onPress={() => onPress(tab.id)}
      >
        <Ionicons 
          name={tab.icon}
          size={22}
          color={isActive ? '#ffffff' : theme.colors.textSecondary}
        />
        <Text style={[
          AppStyles.tabLabel,
          { color: isActive ? '#ffffff' : theme.colors.textSecondary }
        ]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// loading screen component
function LoadingScreen({ theme }) {
  return (
    <SafeAreaView style={[AppStyles.container, { backgroundColor: theme.colors.background }]}>
      <View style={AppStyles.loading}>
        <View style={[AppStyles.logo, { backgroundColor: theme.colors.primary }]}>
          <Text style={AppStyles.logoText}>S</Text>
        </View>
        <Text style={[AppStyles.loadingText, { color: theme.colors.text }]}>Loading Splitsy</Text>
        <View style={AppStyles.progressBar}>
          <View style={[AppStyles.progress, { backgroundColor: theme.colors.primary }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// theme-aware text helper
function ThemedText({ style, color, children, theme }) {
  return (
    <Text style={[style, { color: color || theme.colors.text }]}>
      {children}
    </Text>
  );
}

// balance card component
function BalanceCard({ title, amount, color, icon, theme }) {
  return (
    <View style={[AppStyles.balanceCard, { 
      borderColor: color, 
      borderWidth: 2,
      backgroundColor: theme.colors.card 
    }]}>
      <View style={AppStyles.balanceHeader}>
        <View style={[AppStyles.iconContainer, { backgroundColor: color }]}>
          <Text style={AppStyles.iconText}>{icon}</Text>
        </View>
        <ThemedText style={AppStyles.balanceLabel} color={theme.colors.textSecondary} theme={theme}>
          {title}
        </ThemedText>
      </View>
      <ThemedText style={AppStyles.balanceAmount} color={color} theme={theme}>
        ${Number(amount).toFixed(2)}
      </ThemedText>
    </View>
  );
}

function EmptyState({ title, subtitle, theme }) {
  return (
    <View style={AppStyles.empty}>
      <View style={[AppStyles.emptyIcon, { backgroundColor: theme.colors.primary }]}>
        <Text style={AppStyles.emptyIconText}>📄</Text>
      </View>
      <ThemedText style={AppStyles.emptyTitle} theme={theme}>{title}</ThemedText>
      <ThemedText style={AppStyles.emptyText} color={theme.colors.textSecondary} theme={theme}>
        {subtitle}
      </ThemedText>
    </View>
  );
}

function TransactionItem({ transaction, theme, currentUserId, onSettleTransaction }) {
  // determine if this user is the payer
  const payerId = transaction.payer?._id || transaction.payer?.id || transaction.payer;
  const isPayer = String(payerId) === String(currentUserId);
  const isOwed = isPayer; // if user is payer, others owe them
  const color = isOwed ? theme.colors.success : theme.colors.error;
  
  // find the other user involved
  let otherUserName = '';
  if (transaction.group) {
    // for group transactions, show the group name
    otherUserName = transaction.group?.name || 'Group';
  } else {
    // for friend transactions, show the other person's name
    if (isPayer) {
      // current user paid, so show who they lent to
      const participant = transaction.participants?.find(p => 
        (p.user?._id || p.user) !== currentUserId
      );
      otherUserName = participant?.user?.name || participant?.name || 'Friend';
    } else {
      // current user owes, so show who they borrowed from
      otherUserName = transaction.payer?.name || 'Friend';
    }
  }

  // clean up transaction description by removing unnecessary text
  const cleanDescription = transaction.description
    ?.replace(/- Friend Transaction$/i, '')
    ?.replace(/Friend Transaction/i, '')
    ?.trim() || 'Expense';

  // determine settlement status and text
  const getStatusInfo = () => {
    if (transaction.status === 'settled' || transaction.settled) {
      return {
        text: 'Settled',
        icon: '✓',
        color: '#4CAF50', // green for settled
        backgroundColor: '#4CAF50' + '20' // 20% opacity
      };
    } else {
      return {
        text: 'Tap to settle',
        icon: '○',
        color: '#FF9800', // orange for pending
        backgroundColor: '#FF9800' + '15' // 15% opacity
      };
    }
  };

  const statusInfo = getStatusInfo();
  const canSettle = !transaction.settled && transaction.status !== 'settled';

  const handleStatusPress = () => {
    if (canSettle) {
      Alert.alert(
        'Settle Transaction',
        `Mark "${cleanDescription}" as settled?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Settle', 
            style: 'default',
            onPress: () => onSettleTransaction?.(transaction._id || transaction.id)
          }
        ]
      );
    }
  };
  
  return (
    <View style={[AppStyles.transactionCard, { backgroundColor: theme.colors.card }]}>
      <View style={AppStyles.transactionRow}>
        <View style={[AppStyles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={AppStyles.avatarText}>{otherUserName?.[0] || 'U'}</Text>
        </View>
        <View style={AppStyles.transactionInfo}>
          <ThemedText style={AppStyles.transactionTitle} theme={theme}>
            {cleanDescription}
          </ThemedText>
            <ThemedText style={AppStyles.transactionSubtitle} color={theme.colors.textSecondary} theme={theme}>
            {transaction.group ? 
              `${otherUserName} • ${isOwed ? 'You lent' : 'You borrowed'}` : 
              `${isOwed ? `${otherUserName} owes you` : `You owe ${otherUserName}`}`
            }
          </ThemedText>
        </View>
        <View style={AppStyles.transactionAmount}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText style={AppStyles.amount} color={color} theme={theme}>
            {(() => {
              // prefer explicit participant amount for current user; fallback to equal split
              try {
                const uid = currentUserId;
                if (!transaction || !transaction.participants || !Array.isArray(transaction.participants)) {
                  return `${isOwed ? '+' : '-'}$${Number(transaction.amount || 0).toFixed(2)}`;
                }
                const participant = transaction.participants.find(p => {
                  const pid = p && (p.user?._id || p.user?.id || (typeof p.user === 'string' ? p.user : null) || p._id || p.id);
                  return String(pid) === String(uid);
                });

                const amountToShow = participant && typeof participant.amount === 'number'
                  ? participant.amount
                  : (transaction.participants.length ? (Number(transaction.amount || 0) / transaction.participants.length) : Number(transaction.amount || 0));

                return `${isOwed ? '+' : '-'}$${Number(amountToShow || 0).toFixed(2)}`;
              } catch (e) {
                return `${isOwed ? '+' : '-'}$${Number(transaction.amount || 0).toFixed(2)}`;
              }
            })()}
          </ThemedText>
            <TouchableOpacity 
              style={[AppStyles.statusCircle, { 
                backgroundColor: statusInfo.color,
                opacity: canSettle ? 1 : 0.7
              }]}
              onPress={handleStatusPress}
              disabled={!canSettle}
            >
              {/* empty circle with just color indication */}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function HomeContent({ theme, userGroups, userTransactions, balance, onAddExpense, currentUser, fetchUserBalances }) {
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const handleSettleTransaction = async (transactionId) => {
    try {
      const result = await apiService.markTransactionPaid(transactionId, currentUser.id, true);
      
      if (result.success) {
        // update the local state to reflect the settlement
        setRecentActivity(prev => 
          prev.map(transaction => 
            (transaction._id || transaction.id) === transactionId 
              ? { ...transaction, status: 'settled', settled: true }
              : transaction
          )
        );
        
        // refresh user balances to reflect the settlement
        if (fetchUserBalances) {
          await fetchUserBalances();
        }
        
        Alert.alert('Success', 'Transaction marked as settled!');
      } else {
        Alert.alert('Error', result.message || 'Failed to settle transaction');
      }
    } catch (error) {
      console.error('Error settling transaction:', error);
      Alert.alert('Error', 'Failed to settle transaction');
    }
  };

  useEffect(() => {
  const fetchTransactions = async () => {
    try {
      setLoading(true);

      const result = await apiService.getUsersTransactions(currentUser.id);

      if (!result?.success) {
        throw new Error(result?.message || 'Failed to fetch transactions');
      }

      setRecentActivity(result.data || []);
    } catch (err) {
      console.error('APP.JS Error fetching transactions:', err);
      setError(err.message || 'Error fetching transactions');
    } finally {
      setLoading(false);
}
  };

  if (currentUser?.id || currentUser?._id) {
    fetchTransactions();
  }
}, [currentUser?.id, currentUser?._id]);

  return (
    <ScrollView 
      style={AppStyles.content} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={AppStyles.scrollContent}
    >
      <View style={AppStyles.header}>
        <ThemedText style={AppStyles.welcome} theme={theme}>
          Hello, {currentUser?.name?.split(' ')[0] || 'User'}!
        </ThemedText>
      </View>

      <View style={AppStyles.balanceGrid}>
        <BalanceCard 
          title="You're owed" 
          amount={balance.owed} 
          color={theme.colors.success}
          icon="↑"
          theme={theme}
        />
        <BalanceCard 
          title="You owe" 
          amount={balance.owes} 
          color={theme.colors.error}
          icon="↓"
          theme={theme}
        />
      </View>

      <View style={AppStyles.section}>
        <ThemedText style={AppStyles.sectionTitle} theme={theme}>Recent Activity</ThemedText>
        
        {loading ? (
          <ThemedText theme={theme}>Loading...</ThemedText>
        ) : error ? (
          <ThemedText color={theme.colors.error} theme={theme}>{error}</ThemedText>
        ) : recentActivity.length === 0 ? (
          <EmptyState 
            title="No transactions yet" 
            subtitle="Add an expense to get started"
            theme={theme}
          />
        ) : (
          recentActivity.slice(0, 5).map((transaction) => (
            <TransactionItem 
              key={transaction._id || transaction.id} 
              transaction={transaction} 
              theme={theme}
              currentUserId={currentUser?.id || currentUser?._id}
              onSettleTransaction={handleSettleTransaction}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function NavigationBar({ activeTab, onTabPress, onAddExpense, theme }) {
  const firstHalf = TABS.slice(0, 2);
  const secondHalf = TABS.slice(2);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isAddButtonPressed, setIsAddButtonPressed] = useState(false);
  
  const handleTabPress = (tabId) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    onTabPress(tabId);
  };
  
  return (
    <View style={AppStyles.navContainer}>
      {/* navigation bar */}
      <View style={[AppStyles.bottomNav, { backgroundColor: theme.colors.card }]}>
        {/* left tabs */}
        <View style={AppStyles.sideButtons}>
          {firstHalf.map(tab => (
            <NavButton 
              key={tab.id}
              tab={tab}
              activeTab={activeTab}
              scaleAnim={scaleAnim}
              theme={theme}
              onPress={handleTabPress}
            />
          ))}
        </View>
        
        {/* center add button - prominent purple circle */}
        <View style={AppStyles.centerSpace}>
          <TouchableOpacity
            style={[
              AppStyles.addButton,
              isAddButtonPressed && AppStyles.addButtonPressed
            ]}
            onPress={onAddExpense}
            onPressIn={() => setIsAddButtonPressed(true)}
            onPressOut={() => setIsAddButtonPressed(false)}
            activeOpacity={1}
          >
            <Ionicons 
              name="add" 
              size={26} 
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>
        
        {/* right tabs */}
        <View style={AppStyles.sideButtons}>
          {secondHalf.map(tab => (
            <NavButton 
              key={tab.id}
              tab={tab}
              activeTab={activeTab}
              scaleAnim={scaleAnim}
              theme={theme}
              onPress={handleTabPress}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// modal state management helper
function useModalState(initialState = false) {
  const [isVisible, setIsVisible] = useState(initialState);
  return [isVisible, () => setIsVisible(true), () => setIsVisible(false)];
}

function MainApp() {
  const { theme, isLoading: themeLoading } = useTheme();
  const { currentUser, isAuthenticated, userLoading } = useUser();
  const { groups, getUserGroups, getUserTransactions, calculateUserBalance, dataLoading, createTransaction, userBalances, fetchUserBalances } = useData();
  
  const [activeTab, setActiveTab] = useState('home');
  const [showAddExpense, showAddExpenseModal, hideAddExpenseModal] = useModalState();
  const [showPaymentMethods, showPaymentMethodsModal, hidePaymentMethodsModal] = useModalState();
  const [showNotifications, showNotificationsModal, hideNotificationsModal] = useModalState();
  const [showExpenseReports, showExpenseReportsModal, hideExpenseReportsModal] = useModalState();

  if (themeLoading || userLoading || dataLoading) {
    return <LoadingScreen theme={theme} />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const userGroups = getUserGroups() || [];
  const userTransactions = getUserTransactions() || [];
  // prefer backend-computed balances when available (userbalances comes from /api/transactions/user/balances)
  let balance;
  
  if (userBalances && userBalances.summary) {
    balance = {
      owed: userBalances.summary.totalOwedToMe || 0,
      owes: userBalances.summary.totalIOwe || 0,
      net: userBalances.summary.netBalance || 0
    };
  } else {
    const rawBalance = calculateUserBalance() || { owed: 0, owes: 0, net: 0 };
    balance = {
      owed: rawBalance.owed || 0,
      owes: rawBalance.owes || 0,
      net: rawBalance.net || 0
    };
  }


  // called when the add expense form is submitted.
  // transforms ui form data into the backend transaction payload and submits it.
  const addExpense = async (expenseData) => {
    try {
      // transform the expensedata into api payload
      const amount = parseFloat(expenseData.amount);
      // normalize participants: they might be ids or objects; ensure { user } shape
      const participants = (expenseData.participants || []).map(id => ({ user: id }));

      // for now, do equal split calculation
      const perPerson = Math.round((amount / participants.length) * 100) / 100;
      let remaining = Math.round((amount - perPerson * participants.length) * 100) / 100;
      const participantsWithAmounts = participants.map((p, idx) => {
        const adj = idx === 0 ? remaining : 0; // first participant gets rounding remainder
        return { user: p.user, amount: Math.round((perPerson + adj) * 100) / 100 };
      });

      // build final payload the backend expects
      const payload = {
        description: expenseData.description,
        amount,
        payer: currentUser.id || currentUser._id,
        category: expenseData.category || 'other',
        splitMethod: expenseData.splitType || 'equal',
        participants: participantsWithAmounts,
        notes: expenseData.notes || ''
      };
     if (expenseData.groupId) {
        payload.group = expenseData.groupId;
      }

      await createTransaction(payload);
      await getUserTransactions();
      // refresh server-side computed balances and update the context
      await fetchUserBalances();
      
      if(expenseData.groupId) {
        const txResp = await apiService.getTransactions(expenseData.groupId);
        // setgrouptransactions(txresp || []); this does not even exist, only works when commented out
        const balances = await apiService.getGroupBalances(expenseData.groupId);
        // setgroupbalances(balances || []); this does not exist either, only works when commented out
      }

  hideAddExpenseModal();
      Alert.alert('Success', 'Expense added successfully');
    } catch (error) {
    console.error('Failed to add expense:', error && (error.message || error));
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeContent 
            theme={theme}
            userGroups={userGroups}
            userTransactions={userTransactions}
            balance={balance}
            onAddExpense={() => setShowAddExpense(true)}
            currentUser={currentUser}
            fetchUserBalances={fetchUserBalances}
          />
        );
      case 'friends':
        return (
          <FriendsScreen
            theme={theme}
            currentUser={currentUser}
            userFriends={[]} // friends integration ready for backend api
            userGroups={userGroups} // use existing groups data
          />
        );
      case 'activity':
        return (
          <ActivityScreen 
          userTransactions={userTransactions} 
          userGroups={userGroups} 
          userBalances={balance}
        />
        );
      case 'profile':
        return (
          <ProfileScreen 
            onNavigateToPaymentMethods={showPaymentMethodsModal}
            onNavigateToNotifications={showNotificationsModal}
            onNavigateToExpenseReports={showExpenseReportsModal}
            onNavigateToGroupManagement={() => {}}
          />
        );
      default:
        return (
          <EmptyState 
            title="Coming Soon" 
            subtitle="This feature will be available soon"
            icon="hourglass-outline"
            theme={theme}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[AppStyles.container, { backgroundColor: theme.colors.background }]}>
      <View style={AppStyles.main}>
        {renderActiveScreen()}
        
        <NavigationBar 
          activeTab={activeTab}
          onTabPress={setActiveTab}
          onAddExpense={showAddExpenseModal}
          theme={theme}
        />
      </View>

      {/* modal screens */}
      <ExpenseForm
        visible={showAddExpense}
        onClose={hideAddExpenseModal}
        onSubmit={addExpense}
        groups={userGroups}
        currentUser={currentUser}
      />
      <PaymentMethodsScreen
        visible={showPaymentMethods}
        onClose={hidePaymentMethodsModal}
      />
      <NotificationsScreen
        visible={showNotifications}
        onClose={hideNotificationsModal}
      />
      <ExpenseReportsScreen
        visible={showExpenseReports}
        onClose={hideExpenseReportsModal}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <UserProvider>
          <DataProvider>
            <NotificationProvider>
              <ToastProvider>
                <MainApp />
              </ToastProvider>
            </NotificationProvider>
          </DataProvider>
        </UserProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
