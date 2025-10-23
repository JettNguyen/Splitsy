import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/ApiDataContext';
import { useUser } from '../context/UserContext';
import { FONT_FAMILY, FONT_FAMILY_BOLD } from '../styles/AppStyles';



const ActivityScreen = () => {
  const { theme } = useTheme();
  
  const {userBalances, fetchUserBalances, getUserGroups, getUserTransactions } = useData();
  const userGroups = getUserGroups();
  const userTransactions = getUserTransactions();

  const { currentUser } = useUser();
  const [filter, setFilter] = useState('all');
  useEffect(() => {
  fetchUserBalances();
}, []); // run once on mount

useEffect(() => {
  fetchUserBalances(); 
}, [userTransactions?.length]); // also run when transaction count changes


  const getFilteredActivity = () => {
    // console.log('User Transactions:', userTransactions);
    let activities = [...(userTransactions || [])];
    
    activities.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
    
    if (filter === 'expenses') {
      activities = activities.filter(t => t.type !== 'settlement');
    } 
    else if (filter === 'settlements') {
      activities = activities.filter(t => t.type === 'settlement');
    }
    
    return activities;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getActivityIcon = (transaction) => {
    if (transaction.type === 'settlement') return 'card';
    if (transaction.paidBy === currentUser?.id) return 'arrow-up';
    return 'arrow-down';
  };

  const getActivityColor = (transaction) => {
    if (transaction.type === 'settlement') return theme.colors.accent;
    if (transaction.paidBy === currentUser?.id) return theme.colors.error;
    return theme.colors.success;
  };

  const getActivityDescription = (transaction) => {
    const group = userGroups?.find(g => g.id === transaction.group);
    const groupName = group?.name || 'Unknown Group';
    
    if (transaction.type === 'settlement') {
      return `Settlement in ${groupName}`;
    }
    
    if (transaction.paidBy === currentUser?.id) {
      return `You paid for ${transaction.description} in ${groupName}`;
    }
    
    const paidByUser = transaction.participants?.find(p => p.userId === transaction.paidBy);
    const paidByName = paidByUser?.name || 'Someone';
    return `${paidByName} paid for ${transaction.description} in ${groupName}`;
  };

  const FilterButton = ({ filterType, label }) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        { 
          backgroundColor: filter === filterType ? theme.colors.primary : 'transparent'
        }
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text style={[
        styles.filterButtonText,
        { 
          color: filter === filterType ? '#ffffff' : theme.colors.textSecondary,
          fontFamily: FONT_FAMILY
        }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const ActivityItem = ({ transaction }) => (
    <View style={[styles.activityItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={[styles.activityIcon, { backgroundColor: getActivityColor(transaction) }]}>
        <Ionicons 
          name={getActivityIcon(transaction)} 
          size={18} 
          color="white"
        />
      </View>
      
      <View style={styles.activityContent}>
        <Text style={[styles.activityDescription, { color: theme.colors.text }]}>
          {getActivityDescription(transaction)}
        </Text>
        <Text style={[styles.activityDate, { color: theme.colors.textSecondary }]}>
          {formatDate(transaction.date || transaction.createdAt)}
        </Text>
      </View>
      
      <View style={styles.activityAmount}>
        <Text style={[
          styles.amountText, 
          { 
            color: transaction.paidBy === currentUser?.id ? theme.colors.error : theme.colors.success 
          }
        ]}>
          {transaction.paidBy === currentUser?.id ? '-' : '+'}${transaction.amount?.toFixed(2) || '0.00'}
        </Text>
      </View>
    </View>
  );

  const filteredActivity = getFilteredActivity();

  return (
    
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/*header*/}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Recent Activity
          </Text>
        </View>
        {/* User Balances */}
        {userBalances && (
          <View style={{ paddingHorizontal: 25, marginBottom: 20 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '600' }}>
              Net Balance: ${userBalances.summary.netBalance.toFixed(2)}
            </Text>
            <Text style={{ color: theme.colors.textSecondary }}>
              You are owed: ${userBalances.summary.totalOwedToMe.toFixed(2)}
            </Text>
            <Text style={{ color: theme.colors.textSecondary }}>
              You owe: ${userBalances.summary.totalIOwe.toFixed(2)}
            </Text>
          </View>
        )}


        {/*filter buttons*/}
        <View style={[styles.filterContainer, { backgroundColor: theme.colors.card }]}>
          <FilterButton filterType="all" label="All" />
          <FilterButton filterType="expenses" label="Expenses" />
          <FilterButton filterType="settlements" label="Settlements" />
        </View>
      
        {/*activity list*/}
        <View style={styles.activityContainer}>
          {filteredActivity.length > 0 ? (
            filteredActivity.map((transaction, index) => (
              <ActivityItem key={transaction.id || index} transaction={transaction} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.colors.accent }]}>
                <Ionicons name="list" size={32} color="white" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No Activity Yet
              </Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Your recent expenses and settlements will appear here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    padding: 25,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: FONT_FAMILY_BOLD,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY,
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 25,
    borderRadius: 25,
    padding: 5,
    marginBottom: 25,
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 5,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityContainer: {
    paddingHorizontal: 25,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    fontFamily: FONT_FAMILY,
  },
  activityDate: {
    fontSize: 14,
    fontFamily: FONT_FAMILY,
  },
  activityAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_BOLD,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: FONT_FAMILY_BOLD,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FONT_FAMILY,
  },
});

export default ActivityScreen;