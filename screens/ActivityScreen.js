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
import BalanceDetailsModal from '../components/BalanceDetailsModal';
import apiService from '../services/apiService';



const ActivityScreen = () => {
  const { theme } = useTheme();
  
  const {userBalances, fetchUserBalances, getUserGroups } = useData();
  const userGroups = getUserGroups();
  const { currentUser } = useUser();
  const [filter, setFilter] = useState('all');
  const [userTransactions, setUserTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!currentUser) return;
    fetchUserBalances();
  }, [currentUser]);

const getFilteredActivity = () => {
  let activities = [...(userTransactions || [])];

  // Sort by date (newest first)
  activities.sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
  );

  if (filter === "expenses") {
    activities = activities.filter(
      (t) =>
        t.payer?._id !== currentUser?.id &&
        t.payer !== currentUser?.id
    );
  } 
  else if (filter === "settlements" || filter === "all") {
    let expanded = [];
    activities.forEach((t) => {
      const isPayer =
        t.payer?._id === currentUser?.id || t.payer === currentUser?.id;

    
      t.participants.forEach((p) => {
        const participantId = p.user?._id || p.user;
        const unpaid = !p.paid;

        // For settlements tab — only include unpaid participants if you're the payer
        if (filter === "settlements") {
          if (isPayer && participantId !== currentUser?.id && unpaid) {
            expanded.push({ ...t, singleParticipant: p });
          }
        } 
        // For all tab — include all participants (paid and unpaid)
        else if (filter === "all") {
          if (isPayer && participantId !== currentUser?.id) {
            expanded.push({ ...t, singleParticipant: p });
          } 
          // If you're not the payer, show your own owe entry
          else if (!isPayer && participantId === currentUser?.id) {
            expanded.push({ ...t, singleParticipant: p });
          }
        }
      });
    });
    activities = expanded;
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
  const isPayer =
    transaction.payer?._id === currentUser?.id ||
    transaction.payer === currentUser?.id;

  const someoneUnpaid = transaction.participants?.some((p) => !p.paid);

  if (isPayer && someoneUnpaid) return "arrow-up"; // you're owed
  if (!isPayer) return "arrow-down"; // you owe
  return "checkmark"; // settled or even
};

const getActivityColor = (transaction) => {
  const isPayer =
    transaction.payer?._id === currentUser?.id ||
    transaction.payer === currentUser?.id;

  const someoneUnpaid = transaction.participants?.some((p) => !p.paid);

  if (isPayer && someoneUnpaid) return theme.colors.success; // you’re owed
  if (!isPayer) return theme.colors.error; // you owe
  return theme.colors.textSecondary; // settled
};

const getActivityDescription = (transaction) => {
  const isPayer =
    transaction.payer?._id === currentUser?.id ||
    transaction.payer === currentUser?.id;

  const groupName =
    transaction.group
      ? userGroups?.find(
          (g) => g.id === transaction.group || g._id === transaction.group
        )?.name
      : null;

  const itemName = transaction.description || "Transaction";

  if (isPayer) {
    const unpaidParticipants = transaction.participants.filter(
  (p) =>
    (p.user._id !== currentUser?.id && p.user !== currentUser?.id) &&
    !p.paid
);
    
   return (
  <View style={{ paddingVertical: 6 }}>
    <View style={{ backgroundColor: theme.colors.primary + '11', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 16, fontWeight: '700' }}>{transaction.description || "Transaction"}</Text>
    </View>

    <View style={{ marginTop: 5 }}>
      {unpaidParticipants.map((p) => (
        <View
          key={p.user._id}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
        >
          <View
            style={{
              backgroundColor: theme.colors.success + '22',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
              marginRight: 6,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.success }}>
              {p.user.name || p.name || "Someone"}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 14,
              fontStyle: 'italic',
              color: theme.colors.textSecondary,
            }}
          >
            owes you{transaction.group ? ` ‣ ${userGroups?.find(g => g.id === transaction.group || g._id === transaction.group)?.name || ''}` : ''}
          </Text>
        </View>
      ))}
    </View>
  </View>
);
  } else {
    const payerParticipant =
      transaction.payer?._id === currentUser?.id ? null : transaction.payer;

    const participantName =
      payerParticipant?.name || payerParticipant?.user?.name || "Someone";

    return (
      <View style={{ paddingVertical: 6 }}>
        <View style={{ backgroundColor: theme.colors.primary + '11', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 16, fontWeight: '700'}}>{itemName}</Text>
        </View>


        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
          <Text
            style={{
              fontSize: 14,
              fontStyle: 'italic',
              color: theme.colors.textSecondary,
            }}
          >
            You owe{' '}
          </Text>
          <View
            style={{
              backgroundColor: theme.colors.error + '22', // subtle orange pill
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
              marginRight: 6,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.colors.error }}>
              {participantName}
            </Text>
          </View>
          {groupName && (
            <Text
              style={{
                fontSize: 14,
                fontStyle: 'italic',
                color: theme.colors.textSecondary,
              }}
            >
              ‣ {groupName}
            </Text>
          )}
        </View>
      </View>
    );
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

  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedTxForModal, setSelectedTxForModal] = useState(null);

const ActivityItem = ({ transaction }) => {
const isPayer =
  transaction.payer?._id === currentUser?.id ||
  transaction.payer === currentUser?.id;

const participant = transaction.singleParticipant; // set during flattening
let amount = 0;

if (participant) {
  // In flattened mode (each card represents a specific participant)
  amount = participant.amount || 0;
} else if (isPayer) {
  // You're the payer → show how much each *unpaid participant* owes you total
  const unpaidParticipants = transaction.participants?.filter(
    (p) => !p.paid && (p.user !== currentUser?.id && p.user?._id !== currentUser?.id)
  );
  amount = unpaidParticipants?.reduce((sum, p) => sum + (p.amount || 0), 0);
} else {
  const userParticipant = transaction.participants?.find(
    (p) => p.user === currentUser?.id || p.user?._id === currentUser?.id
  );
  amount = userParticipant?.amount || 0;
}

const sign = isPayer ? "+" : "-";
const formattedAmount = `${sign}${Math.abs(amount).toFixed(2)}`;

  // --- figure out who owes who ---
  let displayName = "";
  let owesText = "";
  let color = theme.colors.textSecondary;

  if (isPayer) {
    const name = participant?.user?.name || participant?.name || "Someone";
    displayName = name;
    owesText = "owes you";
    color = theme.colors.success;
  } else {
    const payerName =
      transaction.payer?.name || transaction.payer?.user?.name || "Someone";
    displayName = payerName;
    owesText = "You owe";
    color = theme.colors.error;
  }

  const iconName = isPayer ? "arrow-up" : "arrow-down";

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => {
        setSelectedTxForModal(transaction);
        setShowBalanceModal(true);
      }}
    >
      <View
        style={[
          styles.activityItem,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        ]}
      >
        {/* Left icon */}
        <View style={[styles.activityIcon, { backgroundColor: color }]}>
          <Ionicons name={iconName} size={18} color="white" />
        </View>

        {/* Center content */}
        <View style={styles.activityContent}>
          <Text
            style={[styles.activityDescription, { color: theme.colors.text }]}
          >
            {transaction.description || "Transaction"}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 5 }}>
  {isPayer ? (
    <>
      <View
        style={{
          backgroundColor: color + "22",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 12,
          marginRight: 6,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color }}>
          {displayName}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 14,
          fontStyle: "italic",
          color: theme.colors.textSecondary,
        }}
      >
        owes you
      </Text>
    </>
  ) : (
    <>
      <Text
        style={{
          fontSize: 14,
          fontStyle: "italic",
          color: theme.colors.textSecondary,
        }}
      >
        You owe{' '}
      </Text>
      <View
        style={{
          backgroundColor: color + "22",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 12,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color }}>
          {displayName}
        </Text>
      </View>
    </>
  )}
</View>


          <Text
            style={[styles.activityDate, { color: theme.colors.textSecondary }]}
          >
            {formatDate(transaction.date || transaction.createdAt)}
          </Text>
        </View>

        {/* Right amount */}
        <View style={styles.activityAmount}>
          <Text style={[styles.amountText, { color }]}>{formattedAmount}</Text>
        </View>
      </View>
    </TouchableOpacity>
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
          <FilterButton filterType="expenses" label="To Pay" />
          <FilterButton filterType="settlements" label="To Receive" />
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
      <BalanceDetailsModal
        visible={showBalanceModal}
        onClose={() => { setShowBalanceModal(false); setSelectedTxForModal(null); }}
        transactions={selectedTxForModal ? [selectedTxForModal] : []}
        currentUserId={currentUser?.id || currentUser?._id}
        onSettled={(txId) => {
          setFilteredActivity(prev => prev);
          setShowBalanceModal(false);
        }}
        theme={theme}
      />
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