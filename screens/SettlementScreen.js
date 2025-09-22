import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  SafeAreaView
} from 'react-native';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useTheme } from '../context/ThemeContext';

const SettlementScreen = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { currentUser, findUserById } = useUser();
  const { 
    getUserTransactions, 
    getUserGroups, 
    settleTransaction,
    calculateUserBalance 
  } = useData();
  
  const [selectedSettlement, setSelectedSettlement] = useState(null);

  const calculateDetailedBalance = () => {
    const userTransactions = getUserTransactions();
    const userGroups = getUserGroups();
    
    // Calculate balances with each user
    const balancesByUser = {};
    const transactionsByUser = {};

    userTransactions.forEach(transaction => {
      if (transaction.settled) return;

      const splitAmount = transaction.amount / transaction.participants.length;
      const isCurrentUserPayer = transaction.payerId === currentUser.id;

      transaction.participants.forEach(participantId => {
        if (participantId === currentUser.id) return;

        if (!balancesByUser[participantId]) {
          balancesByUser[participantId] = 0;
          transactionsByUser[participantId] = [];
        }

        if (isCurrentUserPayer) {
          // Current user paid, participant owes them
          balancesByUser[participantId] += splitAmount;
        } else if (transaction.payerId === participantId) {
          // Participant paid, current user owes them
          balancesByUser[participantId] -= splitAmount;
        }

        transactionsByUser[participantId].push({
          ...transaction,
          splitAmount,
          isCurrentUserPayer
        });
      });
    });

    return { balancesByUser, transactionsByUser };
  };

  const { balancesByUser, transactionsByUser } = calculateDetailedBalance();

  // Group settlements by amount owed/owed to
  const settlements = Object.keys(balancesByUser)
    .map(userId => {
      const user = findUserById(userId);
      const balance = balancesByUser[userId];
      const transactions = transactionsByUser[userId];

      return {
        userId,
        user,
        balance: Math.abs(balance),
        owes: balance < 0, // Current user owes this person
        owed: balance > 0, // This person owes current user
        transactions
      };
    })
    .filter(settlement => settlement.balance > 0.01) // Filter out tiny amounts
    .sort((a, b) => b.balance - a.balance); // Sort by amount descending

  const handleSettleUp = (settlement) => {
    setSelectedSettlement(settlement);
  };

  const confirmSettlement = async () => {
    if (!selectedSettlement) return;

    Alert.alert(
      'Settle Up',
      `Mark all transactions with ${selectedSettlement.user?.name || 'Unknown'} as settled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: async () => {
            try {
              // Settle all transactions with this user
              for (const transaction of selectedSettlement.transactions) {
                await settleTransaction(transaction.id);
              }
              
              Alert.alert('Success', 'Transactions settled successfully!');
              setSelectedSettlement(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to settle transactions');
            }
          }
        }
      ]
    );
  };

  const openPaymentApp = (app, amount, recipientName) => {
    const urls = {
      venmo: `venmo://paycharge?txn=pay&recipients=${recipientName.replace(' ', '')}&amount=${amount}&note=Splitsy%20Settlement`,
      paypal: `https://paypal.me/${recipientName.replace(' ', '').toLowerCase()}/${amount}`,
      zelle: 'https://www.zellepay.com/',
    };

    const url = urls[app];
    if (url) {
      import('react-native').then(({ Linking }) => {
        Linking.openURL(url).catch(() => {
          Alert.alert('App not found', `Please install ${app} or use the web version`);
        });
      });
    }
  };

  const SettlementCard = ({ settlement }) => (
    <View style={styles.settlementCard}>
      <View style={styles.settlementHeader}>
        <View style={styles.settlementLeft}>
          <View style={[
            styles.settlementAvatar, 
            { backgroundColor: settlement.owes ? '#EF4444' : '#10B981' }
          ]}>
            <Text style={styles.settlementAvatarText}>
              {settlement.user?.avatar || 'U'}
            </Text>
          </View>
          <View style={styles.settlementInfo}>
            <Text style={styles.settlementName}>
              {settlement.user?.name || 'Unknown User'}
            </Text>
            <Text style={styles.settlementDescription}>
              {settlement.transactions.length} transaction{settlement.transactions.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.settlementRight}>
          <Text style={[
            styles.settlementAmount,
            settlement.owes ? styles.owesAmount : styles.owedAmount
          ]}>
            {settlement.owes ? '-' : '+'}${settlement.balance.toFixed(2)}
          </Text>
          <Text style={styles.settlementLabel}>
            {settlement.owes ? 'You owe' : 'Owes you'}
          </Text>
        </View>
      </View>

      <View style={styles.settlementActions}>
        {settlement.owes ? (
          <View style={styles.paymentButtons}>
            <TouchableOpacity
              style={[styles.paymentMethodButton, { backgroundColor: '#6366F1' }]}
              onPress={() => openPaymentApp('venmo', settlement.balance.toFixed(2), settlement.user?.name)}
            >
              <Text style={styles.paymentMethodText}>📱 Venmo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentMethodButton, { backgroundColor: '#0066CC' }]}
              onPress={() => openPaymentApp('paypal', settlement.balance.toFixed(2), settlement.user?.name)}
            >
              <Text style={styles.paymentMethodText}>💳 PayPal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentMethodButton, { backgroundColor: '#6B21A8' }]}
              onPress={() => openPaymentApp('zelle', settlement.balance.toFixed(2), settlement.user?.name)}
            >
              <Text style={styles.paymentMethodText}>💰 Zelle</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.remindButton}
            onPress={() => Alert.alert('Reminder Sent', `We'll remind ${settlement.user?.name} about their debt.`)}
          >
            <Text style={styles.remindButtonText}>Send Reminder</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.settleButton}
          onPress={() => handleSettleUp(settlement)}
        >
          <Text style={styles.settleButtonText}>Mark as Settled</Text>
        </TouchableOpacity>
      </View>

      {/* Transaction Details */}
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDetailsTitle}>Transactions:</Text>
        {settlement.transactions.slice(0, 3).map((transaction, index) => (
          <View key={transaction.id} style={styles.transactionDetailItem}>
            <Text style={styles.transactionDetailDescription}>
              {transaction.description}
            </Text>
            <Text style={styles.transactionDetailAmount}>
              ${transaction.splitAmount.toFixed(2)}
            </Text>
          </View>
        ))}
        {settlement.transactions.length > 3 && (
          <Text style={styles.moreTransactions}>
            +{settlement.transactions.length - 3} more
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Settle Up</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: theme.colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          {settlements.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>✅</Text>
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>All Settled Up!</Text>
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                You don't have any outstanding balances with anyone.
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Settlement Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>You owe:</Text>
                  <Text style={[styles.summaryValue, styles.owesAmount]}>
                    ${settlements
                      .filter(s => s.owes)
                      .reduce((sum, s) => sum + s.balance, 0)
                      .toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>You're owed:</Text>
                  <Text style={[styles.summaryValue, styles.owedAmount]}>
                    ${settlements
                      .filter(s => s.owed)
                      .reduce((sum, s) => sum + s.balance, 0)
                      .toFixed(2)}
                  </Text>
                </View>
              </View>

              {settlements.map((settlement) => (
                <SettlementCard key={settlement.userId} settlement={settlement} />
              ))}
            </>
          )}
        </ScrollView>

        {/* Settlement Confirmation Modal */}
        <Modal
          visible={!!selectedSettlement}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.confirmationOverlay}>
            <View style={styles.confirmationCard}>
              <Text style={styles.confirmationTitle}>Confirm Settlement</Text>
              <Text style={styles.confirmationText}>
                Are you sure you want to mark all transactions with{' '}
                <Text style={styles.confirmationName}>
                  {selectedSettlement?.user?.name}
                </Text>{' '}
                as settled?
              </Text>
              <Text style={styles.confirmationAmount}>
                Amount: ${selectedSettlement?.balance.toFixed(2)}
              </Text>
              
              <View style={styles.confirmationButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setSelectedSettlement(null)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={confirmSettlement}
                >
                  <Text style={styles.confirmButtonText}>Settle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  owesAmount: {
    color: '#EF4444',
  },
  owedAmount: {
    color: '#10B981',
  },
  settlementCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settlementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settlementAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settlementAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  settlementInfo: {
    flex: 1,
  },
  settlementName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  settlementDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  settlementRight: {
    alignItems: 'flex-end',
  },
  settlementAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  settlementLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  settlementActions: {
    marginBottom: 16,
  },
  paymentButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  paymentMethodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  paymentMethodText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  remindButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  remindButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  settleButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  settleButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  transactionDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  transactionDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  transactionDetailDescription: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  transactionDetailAmount: {
    fontSize: 14,
    color: '#6B7280',
  },
  moreTransactions: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 4,
  },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  confirmationName: {
    fontWeight: '600',
    color: '#111827',
  },
  confirmationAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#10B981',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettlementScreen;