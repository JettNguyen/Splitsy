import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Screen components
import AuthScreen from './screens/AuthScreen';
import ProfileScreen from './screens/ProfileScreen';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ExpenseReportsScreen from './screens/ExpenseReportsScreen';
import ExpenseForm from './components/ExpenseForm';
import FriendsScreen from './screens/FriendsScreen';
import ActivityScreen from './screens/ActivityScreen';
import apiService from './services/apiService';

// External libraries
import { Ionicons } from '@expo/vector-icons';

// Context providers
import { UserProvider, useUser } from './context/UserContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DataProvider, useData } from './context/ApiDataContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './context/NotificationContext';

// Styles
import AppStyles from './styles/AppStyles';

// Navigation configuration
const TABS = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'friends', icon: 'people', label: 'Friends' },
  { id: 'activity', icon: 'list', label: 'Activity' },
  { id: 'profile', icon: 'settings', label: 'Settings' }
];

// Reusable navigation button component
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

// Loading screen component
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

// Theme-aware text helper
function ThemedText({ style, color, children, theme }) {
  return (
    <Text style={[style, { color: color || theme.colors.text }]}>
      {children}
    </Text>
  );
}

// Balance card component  
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
        ${amount}
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

function TransactionItem({ transaction, theme }) {
  const isOwed = transaction.type === 'owed';
  const color = isOwed ? theme.colors.success : theme.colors.error;
  
  return (
    <View style={[AppStyles.transactionCard, { backgroundColor: theme.colors.card }]}>
      <View style={AppStyles.transactionRow}>
        <View style={[AppStyles.avatar, { backgroundColor: color }]}>
          <Text style={AppStyles.avatarText}>{transaction.user?.name?.[0] || 'U'}</Text>
        </View>
        <View style={AppStyles.transactionInfo}>
          <ThemedText style={AppStyles.transactionTitle} theme={theme}>
            {transaction.description}
          </ThemedText>
          <ThemedText style={AppStyles.transactionSubtitle} color={theme.colors.textSecondary} theme={theme}>
            {transaction.group?.name || 'Personal'}
          </ThemedText>
        </View>
        <View style={AppStyles.transactionAmount}>
          <ThemedText style={AppStyles.amount} color={color} theme={theme}>
            ${transaction.amount}
          </ThemedText>
          <View style={[AppStyles.status, { backgroundColor: theme.colors.surface }]}>
            <Text style={[
              AppStyles.statusText, 
              { color: transaction.settled ? theme.colors.success : theme.colors.textSecondary }
            ]}>
              {transaction.settled ? '✓' : '○'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function HomeContent({ theme, userGroups, userTransactions, balance, onAddExpense, currentUser }) {
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

      <View style={[AppStyles.netBalance, { backgroundColor: theme.colors.card }]}>
        <ThemedText style={AppStyles.netLabel} color={theme.colors.textSecondary} theme={theme}>
          Net Balance
        </ThemedText>
        <ThemedText 
          style={AppStyles.netAmount}
          color={balance.net >= 0 ? theme.colors.success : theme.colors.error}
          theme={theme}
        >
          ${Math.abs(balance.net).toFixed(2)}
        </ThemedText>
      </View>

      <View style={AppStyles.section}>
        <ThemedText style={AppStyles.sectionTitle} theme={theme}>Recent Activity</ThemedText>
        
        {userTransactions.length === 0 ? (
          <EmptyState 
            title="No transactions yet" 
            subtitle="Add an expense to get started"
            theme={theme}
          />
        ) : (
          userTransactions.slice(0, 5).map((transaction, index) => (
            <TransactionItem 
              key={index} 
              transaction={transaction} 
              theme={theme} 
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
      {/* Navigation Bar */}
      <View style={[AppStyles.bottomNav, { backgroundColor: theme.colors.card }]}>
        {/* Left Tabs */}
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
        
        {/* Center Add Button - Prominent Purple Circle */}
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
        
        {/* Right Tabs */}
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

// Modal state management helper
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
  // Prefer backend-computed balances when available (userBalances comes from /api/transactions/user/balances)
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


  // Called when the Add Expense form is submitted.
  // Transforms UI form data into the backend transaction payload and submits it.
  const addExpense = async (expenseData) => {
    try {
      // Transform the expenseData into API payload
      const amount = parseFloat(expenseData.amount);
      // normalize participants: they might be ids or objects; ensure { user } shape
      const participants = (expenseData.participants || []).map(id => ({ user: id }));

      // For now, do equal split calculation
      const perPerson = Math.round((amount / participants.length) * 100) / 100;
      let remaining = Math.round((amount - perPerson * participants.length) * 100) / 100;
      const participantsWithAmounts = participants.map((p, idx) => {
        const adj = idx === 0 ? remaining : 0; // first participant gets rounding remainder
        return { user: p.user, amount: Math.round((perPerson + adj) * 100) / 100 };
      });

      // Build final payload the backend expects
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
      // Refresh server-side computed balances and update the context
      if(expenseData.groupId) {
        await fetchUserBalances();
        const txResp = await apiService.getTransactions(expenseData.groupId);
        //setGroupTransactions(txResp || []); this does not even exist, only works when commented out
        const balances = await apiService.getGroupBalances(expenseData.groupId);
        //setGroupBalances(balances || []); this does not exist either, only works when commented out
      }

  hideAddExpenseModal();
      Alert.alert('Success', 'Expense added successfully');
    } catch (error) {
      console.log('ADD Expense Error:', error);
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
          />
        );
      case 'friends':
        return (
          <FriendsScreen
            theme={theme}
            currentUser={currentUser}
            userFriends={[]} // Friends integration ready for backend API
            userGroups={userGroups} // Use existing groups data
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

      {/* Modal screens */}
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
