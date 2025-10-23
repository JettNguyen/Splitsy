import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity, Alert, ActivityIndicator, Animated, Easing, StyleSheet } from 'react-native';
import AppStyles from '../styles/AppStyles';
import apiService from '../services/apiService';

export default function BalanceDetailsModal({ visible, onClose, transactions = [], currentUserId, onSettled, theme }) {
  const [loading, setLoading] = useState(false);
  const [settlingId, setSettlingId] = useState(null);
  const [isMounted, setIsMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(400)).current; // start off-screen

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      // show backdrop immediately; animate panel up
      slideAnim.setValue(400);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      // animate down then unmount
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setIsMounted(false));
      setLoading(false);
      setSettlingId(null);
    }
  }, [visible]);

  const handleSettle = async (transactionId) => {
    try {
      setSettlingId(transactionId);
      // fetch user's payment methods
      const methodsResp = await apiService.getPaymentMethods();
      const methods = (methodsResp && (methodsResp.data?.paymentMethods || methodsResp.paymentMethods)) || methodsResp || [];

      if (!methods || methods.length === 0) {
        Alert.alert('No payment methods', 'Please add a payment method in Settings before settling.');
        setSettlingId(null);
        return;
      }

      // pick the first configured method as a default
      const method = methods[0];

      const resp = await apiService.markTransactionPaid(transactionId, currentUserId, true, method.id || method._id);
      if (resp && (resp.success || resp.data)) {
        Alert.alert('Settled', 'Transaction marked as settled');
        onSettled && onSettled(transactionId);
      } else {
        Alert.alert('Error', resp?.message || 'Failed to settle transaction');
      }
    } catch (err) {
      console.error('Error settling transaction:', err);
      Alert.alert('Error', err.message || 'Failed to settle transaction');
    } finally {
      setSettlingId(null);
    }
  };

  const renderItem = ({ item }) => {
    const payerId = item.payer?._id || item.payer?.id || item.payer;
    const isPayer = String(payerId) === String(currentUserId);
    const participant = item.participants?.find(p => {
      const pid = p && (p.user?._id || p.user?.id || p.user || p._id || p.id);
      return String(pid) === String(currentUserId);
    });

    const amount = participant && typeof participant.amount === 'number'
      ? participant.amount
      : (item.participants && item.participants.length ? (Number(item.amount || 0) / item.participants.length) : Number(item.amount || 0));

    const settled = !!(item.settled || item.status === 'settled' || item.isPaid);

    return (
      <View style={[AppStyles.transactionCard, { marginBottom: 8, backgroundColor: theme?.colors?.card || '#fff' }]}> 
        <View style={AppStyles.transactionRow}>
          <View style={AppStyles.transactionInfo}>
            <Text style={[AppStyles.transactionTitle, { color: theme?.colors?.text }]}>{item.description || 'Expense'}</Text>
            <Text style={[AppStyles.transactionSubtitle, { color: theme?.colors?.textSecondary || '#666' }]}>
              {isPayer ? `You lent • $${Number(amount).toFixed(2)}` : `You owe • $${Number(amount).toFixed(2)}`}
            </Text>
          </View>
          <View style={AppStyles.transactionAmount}>
            {settled ? (
              <Text style={[AppStyles.amount, { color: '#4CAF50' }]}>Settled</Text>
            ) : (
              <TouchableOpacity
                style={[AppStyles.settleButton, { paddingHorizontal: 12 }]}
                onPress={() => handleSettle(item._id || item.id)}
                disabled={settlingId === (item._id || item.id)}
              >
                {settlingId === (item._id || item.id) ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Settle</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={isMounted} animationType="none" transparent={true}>
      {/* backdrop appears instantly; panel is animated manually */}
      <View style={{ flex: 1 }}>
        {/* backdrop */}
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: theme?.colors?.overlay || 'rgba(0,0,0,0.5)' }} />

  {/* animated panel anchored to bottom */}
  <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, transform: [{ translateY: slideAnim }] }, AppStyles.modalContainer, AppStyles.modalPanelShadow, { maxHeight: '80%', backgroundColor: theme?.colors?.card || 'white', borderColor: theme?.colors?.border || '#ccc', borderWidth: 1 }]}> 
          <View style={[AppStyles.modalHeader, { borderBottomWidth: 1, borderColor: theme?.colors?.borderLight || '#e2e8f0', paddingVertical: 12, paddingHorizontal: 16 }]}>
            <Text style={[AppStyles.modalTitle, { color: theme?.colors?.text || '#000' }]}>Balance details</Text>
            <TouchableOpacity onPress={onClose} style={[AppStyles.modalCloseButton, { backgroundColor: theme?.colors?.primaryDark || '#6d28d9' }]}>
              <Text style={[AppStyles.modalCloseButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={transactions}
            keyExtractor={t => t._id || t.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12 }}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme?.colors?.textSecondary || '#666' }}>No transactions</Text>}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}
