import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, FlatList, TouchableOpacity, Alert, ActivityIndicator, Animated, Easing, StyleSheet, SafeAreaView } from 'react-native';
import AppStyles from '../styles/AppStyles';
import apiService from '../services/apiService';

// runtime-safe clipboard helper: try expo-clipboard, then react-native / @react-native-clipboard/clipboard
const copyToClipboard = async (text) => {
  try {
    // try expo-clipboard
    // eslint-disable-next-line global-require
    const expoClip = require('expo-clipboard');
    if (expoClip && typeof expoClip.setStringAsync === 'function') {
      await expoClip.setStringAsync(String(text));
      return true;
    }
  } catch (e) {
    // ignore
  }

  try {
    // try react-native Clipboard (older RN) or the community package
    // eslint-disable-next-line global-require
    const rn = require('@react-native-clipboard/clipboard');
    if (rn && typeof rn.setString === 'function') {
      rn.setString(String(text));
      return true;
    }
    // some versions expose setStringAsync
    if (rn && typeof rn.setStringAsync === 'function') {
      await rn.setStringAsync(String(text));
      return true;
    }
  } catch (e) {
    // try react-native's deprecated Clipboard
    try {
      // eslint-disable-next-line global-require
      const RN = require('react-native');
      const Clip = RN.Clipboard || RN.ClipboardManager;
      if (Clip && typeof Clip.setString === 'function') {
        Clip.setString(String(text));
        return true;
      }
    } catch (ee) {
      // ignore
    }
  }

  return false;
};

export default function BalanceDetailsModal({ visible, onClose, transactions = [], currentUserId, onSettled, theme }) {
  const [loading, setLoading] = useState(false);
  const [settlingId, setSettlingId] = useState(null);
  const [isMounted, setIsMounted] = useState(visible);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [requestMode, setRequestMode] = useState(false);
  const [selectedTxForPayment, setSelectedTxForPayment] = useState(null);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.96)).current;
  const [showZelleInstructions, setShowZelleInstructions] = useState(false);
  const [zelleMethodForInstructions, setZelleMethodForInstructions] = useState(null);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      // fade in overlay and pop in modal
      overlayOpacity.setValue(0);
      modalScale.setValue(0.96);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(modalScale, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      // fade out then unmount
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(modalScale, { toValue: 0.96, duration: 160, useNativeDriver: true }),
      ]).start(() => setIsMounted(false));
      setLoading(false);
      setSettlingId(null);
    }
  }, [visible]);

  const handleSettle = async (transactionId) => {
    // Instead of auto-picking a method, load the recipient's payment methods and display options
    try {
      // find the transaction in the list
      const tx = transactions.find(t => String(t._id || t.id) === String(transactionId));
      if (!tx) {
        Alert.alert('Error', 'Transaction not found');
        return;
      }

      // determine recipient: usually the payer (the person you owe)
      const recipientId = tx.payer?._id || tx.payer?.id || tx.payer;
      const isPayer = String(recipientId) === String(currentUserId);

      // If current user owes (not payer) -> send money to the payer (existing flow)
      if (!isPayer) {
        // show loading and fetch recipient's payment methods
        setPaymentLoading(true);
        setSelectedTxForPayment(tx);
        try {
          const resp = await apiService.getFriendPaymentMethods(recipientId);
          const methods = (resp && (resp.data?.paymentMethods || resp.paymentMethods)) || resp || [];
          if (!methods || methods.length === 0) {
            Alert.alert('No payment methods', 'This user has not added any payment methods.');
            setPaymentOptions([]);
            setPaymentLoading(false);
            return;
          }

          setPaymentOptions(methods.map(m => ({ id: m.id || m._id, type: m.type, handle: m.handle })));
          setRequestMode(false);
          setShowPaymentOptions(true);
        } catch (err) {
          console.error('Error loading friend payment methods:', err);
          Alert.alert('Error', 'Failed to load payment methods');
        } finally {
          setPaymentLoading(false);
        }
        return;
      }

      // If current user is the payer (you are owed) -> offer a "request" flow for participants who owe
      try {
        setPaymentLoading(true);
        setSelectedTxForPayment(tx);
        const owingParticipants = (tx.participants || []).filter(p => {
          const pid = p && (p.user?._id || p.user?.id || p.user || p._id || p.id);
          return String(pid) !== String(currentUserId);
        });

        if (!owingParticipants || owingParticipants.length === 0) {
          Alert.alert('No one to request from', 'There are no participants that owe on this transaction');
          return;
        }

        // fetch each participant's payment methods
        const grouped = [];
        for (const p of owingParticipants) {
          const pid = p.user?._id || p.user?.id || p.user || p._id || p.id;
          try {
            const presp = await apiService.getFriendPaymentMethods(pid);
            const pm = (presp && (presp.data?.paymentMethods || presp.paymentMethods)) || presp || [];
            if (pm && pm.length > 0) {
              grouped.push({ participant: p.user?.name || p.name || pid, participantId: pid, methods: pm.map(m => ({ id: m.id || m._id, type: m.type, handle: m.handle })) });
            }
          } catch (err) {
            console.warn('Error fetching participant methods', pid, err);
          }
        }

        if (grouped.length === 0) {
          Alert.alert('No payment methods', 'None of the participants have added payment methods. You can message them to request payment.');
          return;
        }

        setPaymentOptions(grouped);
        setRequestMode(true);
        setShowPaymentOptions(true);
      } catch (err) {
        console.error('Error preparing request flow:', err);
        Alert.alert('Error', 'Failed to prepare payment requests');
      } finally {
        setPaymentLoading(false);
      }
    } catch (err) {
      console.error('Error preparing settle flow:', err);
      Alert.alert('Error', err.message || 'Failed to prepare settlement');
    }
  };

  const paymentDeepLink = (methodType, handle, amount, name) => {
    const amt = encodeURIComponent(Number(amount).toFixed(2));
    const recipient = encodeURIComponent(handle || name || '');
    switch ((methodType || '').toLowerCase()) {
      case 'venmo':
      case 'venmo.com':
        return `venmo://paycharge?txn=pay&recipients=${recipient}&amount=${amt}&note=splitsy%20settlement`;
      case 'cashapp':
      case 'cash app':
      case 'cashapp.com':
        // cash app deep link with cashtag
        return `cashapp://$${recipient}?amount=${amt}`;
      case 'paypal':
      case 'paypal.me':
        return `paypal://send?recipient=${recipient}&amount=${amt}`;
      case 'zelle':
        // Zelle does not have a reliable universal deep link or web send URL.
        // Return a zelle scheme attempt (some banks may handle it) but fallbacks are handled in openPaymentApp.
        return `zelle://send?recipient=${recipient}&amount=${amt}`;
      default:
        return null;
    }
  };

  const openPaymentApp = async (method) => {
    if (!selectedTxForPayment) return;
    let skipCleanup = false;
    const amount = (() => {
      const p = selectedTxForPayment.participants?.find(pa => {
        const pid = pa && (pa.user?._id || pa.user?.id || pa.user || pa._id || pa.id);
        return String(pid) === String(currentUserId);
      });
      return p && typeof p.amount === 'number' ? p.amount : (selectedTxForPayment.amount && selectedTxForPayment.participants ? (selectedTxForPayment.amount / selectedTxForPayment.participants.length) : selectedTxForPayment.amount || 0);
    })();

    try {
      const name = selectedTxForPayment.payer?.name || selectedTxForPayment.payer;
      // For Zelle: do NOT attempt the unreliable zelle:// deep link. Immediately show in-modal instructions
      // so the user can copy the handle and amount into their bank app on first tap.
      const lower = (method.type || '').toLowerCase();
      if (lower.includes('zelle')) {
        const amt = Number(amount).toFixed(2);
        // prevent the finally cleanup from clearing state so instructions stay visible
        skipCleanup = true;
        setZelleMethodForInstructions({ method, amount: amt, name });
        setShowZelleInstructions(true);
        // keep the payment options visible so user can copy or dismiss when done
        return;
      }

      // non-Zelle providers: try deep link then fallback to web/mail
      const url = paymentDeepLink(method.type, method.handle, amount, name);
      if (url) {
        const supported = await apiService.linkCanOpenURL(url);
        if (supported) {
          await apiService.linkOpenURL(url);
        } else {
          // try web fallback if deep link didn't open
          // some providers return a URL with https in the deep link; try that as text
          if (url.startsWith('http')) {
            const canWeb = await apiService.linkCanOpenURL(url);
            if (canWeb) await apiService.linkOpenURL(url);
            else Alert.alert('Open Payment App', `Could not open ${method.type}. Please use handle: ${method.handle}`);
          } else {
            Alert.alert('Open Payment App', `Could not open ${method.type} app. Please use handle: ${method.handle}`);
          }
        }

        // mark transaction/participant as paid on backend (best-effort)
        try {
          await apiService.markTransactionPaid(selectedTxForPayment._id || selectedTxForPayment.id, currentUserId, true, method.id || method._id);
          onSettled && onSettled(selectedTxForPayment._id || selectedTxForPayment.id);
        } catch (err) {
          console.warn('Failed to mark backend paid:', err.message || err);
        }
      } else {
        Alert.alert('Unsupported', `No deep link available for ${method.type}. Use handle: ${method.handle}`);
      }
    } catch (err) {
      console.error('Error opening payment app:', err);
      Alert.alert('Error', 'Failed to open payment app');
    } finally {
      // If we intentionally showed Zelle instructions, keep the payment options mounted
      if (!skipCleanup) {
        setShowPaymentOptions(false);
        setSelectedTxForPayment(null);
      }
    }
  };

  // when in requestMode, open a request channel for a participant+method
  const openRequestMethod = async (participant, method) => {
    if (!selectedTxForPayment) return;
    const amount = (() => {
      // participant object may contain an explicit amount
      const p = selectedTxForPayment.participants?.find(pa => {
        const pid = pa && (pa.user?._id || pa.user?.id || pa.user || pa._id || pa.id);
        return String(pid) === String(participant.participantId || participant.id || participant.participant);
      });
      return p && typeof p.amount === 'number' ? p.amount : (selectedTxForPayment.amount && selectedTxForPayment.participants ? (selectedTxForPayment.amount / selectedTxForPayment.participants.length) : selectedTxForPayment.amount || 0);
    })();

    try {
      // try build a request deep link for common apps
      const type = (method.type || '').toLowerCase();
      const amt = Number(amount).toFixed(2);
      let url = null;
      if (type.includes('venmo')) {
        url = `venmo://paycharge?txn=request&recipients=${encodeURIComponent(method.handle)}&amount=${encodeURIComponent(amt)}&note=Payment%20request%20via%20Splitsy`;
      } else if (type.includes('cash')) {
        // Cash App doesn't have a stable request deep link; open fallback
        url = `cashapp://$${encodeURIComponent(method.handle)}`;
      } else if (method.handle) {
        // fallback: sms request with prefilled message
        const normalized = method.handle.replace(/[^0-9+]/g, '');
        url = `sms:${normalized}?body=Hi%20${encodeURIComponent(participant.participant)}%2C%0A%0APlease%20send%20payment%20of%20$${encodeURIComponent(amt)}%20for%20"${encodeURIComponent(selectedTxForPayment.description || 'expense')}"%20via%20your%20preferred%20payment%20method.%0A%0AThanks!`;
      }

      if (url) {
        const supported = await apiService.linkCanOpenURL(url);
        if (supported) {
          await apiService.linkOpenURL(url);
          Alert.alert('Requested', `Opened ${method.type} to request $${amt} from ${participant.participant}`);
        } else {
          // fallback: show handle and instruct user
          Alert.alert('Request', `Please request $${amt} from ${participant.participant} using ${method.type} handle: ${method.handle}`);
        }
      } else {
        Alert.alert('Unsupported', `No request deep-link available for ${method.type}. Use handle: ${method.handle}`);
      }
    } catch (err) {
      console.error('Error opening request link:', err);
      Alert.alert('Error', 'Failed to open request link');
    } finally {
      setShowPaymentOptions(false);
      setSelectedTxForPayment(null);
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

    // Check if transaction has itemized breakdown
    const hasItems = item.items && Array.isArray(item.items) && item.items.length > 0;
    const hasReceiptItems = item.receipt?.scannedData?.items && Array.isArray(item.receipt.scannedData.items) && item.receipt.scannedData.items.length > 0;
    
    return (
      <View style={[AppStyles.transactionCard, { marginBottom: 8, backgroundColor: theme?.colors?.card || '#fff' }]}> 
        <View style={AppStyles.transactionRow}>
          <View style={AppStyles.transactionInfo}>
            <Text style={[AppStyles.transactionTitle, { color: theme?.colors?.text }]}>{item.description || 'Expense'}</Text>
            <Text style={[AppStyles.transactionSubtitle, { color: theme?.colors?.textSecondary || '#666' }]}>
              {isPayer ? `You lent • $${Number(amount).toFixed(2)}` : `You owe • $${Number(amount).toFixed(2)}`}
            </Text>
            
            {/* Item breakdown display */}
            {(hasItems || hasReceiptItems) && (
              <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: theme?.colors?.borderLight || '#e2e8f0' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: theme?.colors?.text, marginBottom: 4 }}>Items:</Text>
                {hasItems && item.items.map((itm, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 11, color: theme?.colors?.textSecondary, flex: 1 }}>
                      {itm.quantity > 1 ? `${itm.quantity}x ` : ''}{itm.name || 'Item'}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme?.colors?.textSecondary }}>
                      ${Number(itm.price || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
                {!hasItems && hasReceiptItems && item.receipt.scannedData.items.map((itm, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 11, color: theme?.colors?.textSecondary, flex: 1 }}>
                      {itm.quantity > 1 ? `${itm.quantity}x ` : ''}{itm.name || 'Item'}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme?.colors?.textSecondary }}>
                      ${Number(itm.price || 0).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
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
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme?.colors?.overlay || 'rgba(0,0,0,0.5)', opacity: overlayOpacity }]} />

      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={[AppStyles.modalContainer, AppStyles.modalPanelShadow, { width: '92%', maxHeight: '85%', borderRadius: 12, padding: 0, transform: [{ scale: modalScale }], backgroundColor: theme?.colors?.card || 'white', borderColor: theme?.colors?.border || '#ccc', borderWidth: 1 }]}> 
          <View style={[AppStyles.modalHeader, { borderBottomWidth: 1, borderColor: theme?.colors?.borderLight || '#e2e8f0', paddingVertical: 12, paddingHorizontal: 16 }]}>
            <Text style={[AppStyles.modalTitle, { color: theme?.colors?.text || '#000' }]}>Balance details</Text>
            <TouchableOpacity onPress={onClose} style={[AppStyles.modalCloseButton, { backgroundColor: theme?.colors?.primaryDark || '#6d28d9' }]}>
              <Text style={[AppStyles.modalCloseButtonText]}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* payment options (shown after tapping Settle) */}
          {paymentLoading && (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme?.colors?.primary || '#6d28d9'} />
            </View>
          )}

          {showPaymentOptions ? (
            <View style={{ padding: 16, borderTopWidth: 1, borderColor: theme?.colors?.border || '#e5e7eb' }}>
              <Text style={{ fontWeight: '700', marginBottom: 12, color: theme?.colors?.text }}>Choose payment method</Text>
              {paymentOptions.map((pm) => (
                <TouchableOpacity
                  key={pm.id || pm._id}
                  style={{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: theme?.colors?.surface, marginBottom: 10 }}
                  onPress={() => openPaymentApp(pm)}
                >
                  <Text style={{ color: theme?.colors?.text, fontWeight: '600' }}>{`${pm.type} • ${pm.handle}`}</Text>
                </TouchableOpacity>
              ))}
              
              {/* Zelle instructions view */}
              {showZelleInstructions && zelleMethodForInstructions && (
                <View style={{ marginTop: 8, padding: 12, backgroundColor: theme?.colors?.background, borderRadius: 8 }}>
                  <Text style={{ fontWeight: '700', marginBottom: 8, color: theme?.colors?.text }}>Zelle instructions</Text>
                  {/* Determine whether current user owes money or is owed */}
                  {(() => {
                    // if selectedTxForPayment exists, determine whether current user owes
                    const payerId = selectedTxForPayment?.payer?._id || selectedTxForPayment?.payer?.id || selectedTxForPayment?.payer;
                    const iOwe = String(payerId) !== String(currentUserId);
                    const amtText = zelleMethodForInstructions.amount ? `$${Number(zelleMethodForInstructions.amount).toFixed(2)}` : '';
                    if (iOwe) {
                      return <Text style={{ color: theme?.colors?.textSecondary, marginBottom: 8 }}>Send {amtText} via Zelle to the recipient below using your bank's app.</Text>;
                    }
                    return <Text style={{ color: theme?.colors?.textSecondary, marginBottom: 8 }}>Request {amtText} via Zelle from the recipient below using your bank's app.</Text>;
                  })()}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ color: theme?.colors?.text, fontWeight: '600' }}>{zelleMethodForInstructions.method.type}</Text>
                    <Text style={{ color: theme?.colors?.textSecondary }}>{zelleMethodForInstructions.amount ? `$${Number(zelleMethodForInstructions.amount).toFixed(2)}` : ''}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: theme?.colors?.text }}>{zelleMethodForInstructions.method.handle}</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme?.colors?.primary, borderRadius: 8 }} onPress={async () => { const ok = await copyToClipboard(zelleMethodForInstructions.method.handle || ''); if (ok) Alert.alert('Copied', 'Zelle handle copied to clipboard'); else Alert.alert('Copy failed', 'Could not copy to clipboard'); }}>
                        <Text style={{ color: 'white', fontWeight: '700' }}>Copy handle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: theme?.colors?.primary, borderRadius: 8 }} onPress={async () => { if (zelleMethodForInstructions.amount) { const ok = await copyToClipboard(String(Number(zelleMethodForInstructions.amount).toFixed(2))); if (ok) Alert.alert('Copied', 'Amount copied to clipboard'); else Alert.alert('Copy failed', 'Could not copy to clipboard'); } else { Alert.alert('No amount', 'No amount available to copy'); } }}>
                        <Text style={{ color: 'white', fontWeight: '700' }}>Copy amount</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity style={{ marginTop: 10, alignSelf: 'flex-end' }} onPress={() => { setShowZelleInstructions(false); setZelleMethodForInstructions(null); setShowPaymentOptions(false); setSelectedTxForPayment(null); }}>
                    <Text style={{ color: theme?.colors?.textSecondary }}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={t => t._id || t.id}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 12 }}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: theme?.colors?.textSecondary || '#666' }}>No transactions</Text>}
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}
