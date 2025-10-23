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
import AppStyles, { FONT_FAMILY, FONT_FAMILY_BOLD } from '../styles/AppStyles';
import apiService from '../services/apiService';



const ActivityScreen = () => {
  const { theme } = useTheme();
  
  const {userBalances, fetchUserBalances, getUserGroups } = useData();
  const userGroups = getUserGroups();
  const { currentUser } = useUser();
  const [filter, setFilter] = useState('all');
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // load the user's transactions (includes friend transactions)
  useEffect(() => {
    const loadUserTransactions = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const result = await apiService.getUsersTransactions(currentUser.id);
        
        if (result?.success) {
          setUserTransactions(result.data || []);
        } else {
          console.error('Failed to load user transactions:', result?.message);
          setUserTransactions([]);
        }
      } catch (error) {
        console.error('Error loading user transactions:', error);
        setUserTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserTransactions();
  }, [currentUser]);

  // fetch balances when current user becomes available
  useEffect(() => {
    if (!currentUser) return;
    fetchUserBalances();
  }, [currentUser]);

  const getFilteredActivity = () => {
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
    
  // calculate whether the user lent (arrow up) or borrowed (arrow down)
    const userWasPayer = transaction.payer && transaction.payer._id === currentUser?.id;
    const userParticipant = transaction.participants?.find(p => 
      p.user === currentUser?.id || p.user?._id === currentUser?.id
    );
    const userOwedAmount = userParticipant?.amount || 0;
    const userPaidAmount = userWasPayer ? transaction.amount : 0;
    const netAmount = userPaidAmount - userOwedAmount;
    
  // arrow up = lent, arrow down = borrowed
    return netAmount > 0 ? 'arrow-up' : 'arrow-down';
  };

  const getActivityColor = (transaction) => {
    if (transaction.type === 'settlement') return theme.colors.accent;
    
  // calculate if the user lent money (positive) or borrowed money (negative)
    const userWasPayer = transaction.payer && transaction.payer._id === currentUser?.id;
    const userParticipant = transaction.participants?.find(p => 
      p.user === currentUser?.id || p.user?._id === currentUser?.id
    );
    const userOwedAmount = userParticipant?.amount || 0;
    const userPaidAmount = userWasPayer ? transaction.amount : 0;
    const netAmount = userPaidAmount - userOwedAmount;
    
  // green = lending (positive), red = borrowing (negative)
    return netAmount > 0 ? theme.colors.success : theme.colors.error;
  };

  const getActivityDescription = (transaction) => {
    if (transaction.type === 'settlement') {
      const group = userGroups?.find(g => g.id === transaction.group);
      const groupName = group?.name || 'Unknown Group';
      return `Settlement in ${groupName}`;
    }
    
  // determine whether the current user was the payer
    const userWasPayer = transaction.payer && transaction.payer._id === currentUser?.id;
    
  // calculate what the user owes vs what they paid
    const userParticipant = transaction.participants?.find(p => 
      p.user === currentUser?.id || p.user?._id === currentUser?.id
    );
    const userOwedAmount = userParticipant?.amount || 0;
    const userPaidAmount = userWasPayer ? transaction.amount : 0;
    
  // determine if user lent (paid more than they owe) or borrowed (paid less than they owe)
    const isLending = userPaidAmount > userOwedAmount;
    const isBorrowing = userPaidAmount < userOwedAmount;
    
  // find the other person's name for one-on-one transactions
    let otherPersonName = '';
    if (!transaction.group) {
      if (userWasPayer) {
        // Current user paid, find who they lent to
        const otherParticipant = transaction.participants?.find(p => 
          (p.user?._id || p.user) !== currentUser?.id
        );
        otherPersonName = otherParticipant?.user?.name || otherParticipant?.name || 'Friend';
      } else {
        // Current user owes, show who they borrowed from
        otherPersonName = transaction.payer?.name || 'Friend';
      }
    }
    
  // build a friendly description for each activity item
    const itemName = transaction.description;
    const groupName = transaction.group ? 
      (userGroups?.find(g => g.id === transaction.group)?.name || 'Unknown Group') : 
      null;
    
    if (isLending) {
      return groupName ? 
        `You lent • ${itemName} • ${groupName}` : 
        `${otherPersonName} owes you • ${itemName}`;
    } else if (isBorrowing) {
      return groupName ? 
        `You borrowed • ${itemName} • ${groupName}` : 
        `You owe ${otherPersonName} • ${itemName}`;
    } else {
      return groupName ? 
        `Split evenly • ${itemName} • ${groupName}` : 
        `Split evenly • ${itemName}`;
    }
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

  const ActivityItem = ({ transaction }) => {
  // calculate user's financial position for this transaction
    const userWasPayer = transaction.payer && transaction.payer._id === currentUser?.id;
    const userParticipant = transaction.participants?.find(p => 
      p.user === currentUser?.id || p.user?._id === currentUser?.id
    );
    const userOwedAmount = userParticipant?.amount || 0;
    const userPaidAmount = userWasPayer ? transaction.amount : 0;
    
   // calculate net amount and ensure numeric coercion
   const netAmount = Number(userPaidAmount) - Number(userOwedAmount);
   const sign = netAmount >= 0 ? '+' : '-';
   const formattedAmount = `${sign}${Math.abs(netAmount).toFixed(2)}`;
    
    const isSettled = !!(transaction.settled || transaction.settlements?.length || transaction.status === 'settled' || transaction.isPaid);

    return (
      <View style={[styles.activityItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        {/* left icon */}
        <View style={[styles.activityIcon, { backgroundColor: getActivityColor(transaction) }]}> 
          <Ionicons name={getActivityIcon(transaction)} size={18} color="white" />
        </View>

        {/* center content */}
        <View style={styles.activityContent}>
          <Text style={[styles.activityDescription, { color: theme.colors.text }]}>
            {getActivityDescription(transaction)}
          </Text>
          <Text style={[styles.activityDate, { color: theme.colors.textSecondary }]}>
            {formatDate(transaction.date || transaction.createdAt)}
          </Text>
        </View>

        {/* right amount + status */}
        <View style={styles.activityAmount}> 
          <Text style={[
            styles.amountText, 
            { color: Number(netAmount) > 0 ? theme.colors.success : theme.colors.error }
          ]}>
           {formattedAmount}
          </Text>
          {/* color-coded status circle matching home page */}
          <View style={[AppStyles.statusCircle, { backgroundColor: isSettled ? '#4CAF50' : '#FF9800', marginTop: 6 }]} />
        </View>
      </View>
    );
  };

  const filteredActivity = getFilteredActivity();

  return (
    
    <SafeAreaView style={[AppStyles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={AppStyles.main}
        contentContainerStyle={AppStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/*header*/}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Recent Activity
          </Text>
        </View>
        {/* (Balances display removed from Activity view per UX request) */}


        {/*filter buttons*/}
        <View style={[styles.filterContainer, { backgroundColor: theme.colors.card }]}>
          <FilterButton filterType="all" label="All" />
          <FilterButton filterType="expenses" label="Expenses" />
          <FilterButton filterType="settlements" label="Settlements" />
        </View>
      
        {/*activity list*/}
        <View style={styles.activityContainer}>
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                Loading...
              </Text>
            </View>
              ) : filteredActivity.length > 0 ? (
            filteredActivity.map((transaction, index) => (
              <ActivityItem key={transaction.id || index} transaction={transaction} />
            ))
          ) : (
                <View style={AppStyles.empty}>
                  <View style={[AppStyles.emptyIcon, { backgroundColor: theme.colors.accent }]}>
                    <Ionicons name="list" size={32} color="white" />
                  </View>
                  <Text style={[AppStyles.emptyTitle, { color: theme.colors.text }] }>
                    No Activity Yet
                  </Text>
                  <Text style={[AppStyles.emptyText, { color: theme.colors.textSecondary }]}>
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
        shadowRadius: 3,
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
        padding: 14,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 0.5,
        shadowColor: '#673e9dff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      activityIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      },
      activityAmount: {
        width: 110,
        alignItems: 'center',
        justifyContent: 'center',
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
    });

export default ActivityScreen;