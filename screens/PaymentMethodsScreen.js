import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const PaymentMethodsScreen = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMethod, setNewMethod] = useState({ type: 'Venmo', handle: '' });

  const paymentTypes = ['Venmo', 'PayPal', 'CashApp', 'Zelle', 'Bank Transfer'];

  const addPaymentMethod = () => {
    if (!newMethod.handle.trim()) {
      Alert.alert('Error', 'Please enter a valid handle');
      return;
    }
    
    const newId = paymentMethods.length > 0 ? Math.max(...paymentMethods.map(m => m.id)) + 1 : 1;
    setPaymentMethods([...paymentMethods, {
      id: newId,
      type: newMethod.type,
      handle: newMethod.handle.trim(),
      verified: false
    }]);
    
    setNewMethod({ type: 'Venmo', handle: '' });
    setShowAddModal(false);
    Alert.alert('Success', 'Payment method added successfully!');
  };

  const removePaymentMethod = (id) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(paymentMethods.filter(m => m.id !== id));
          }
        }
      ]
    );
  };

  const PaymentMethodCard = ({ method }) => (
    <View style={[styles.methodCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.methodInfo}>
        <View style={[styles.methodIcon, { backgroundColor: getMethodColor(method.type) }]}>
          <Text style={styles.methodIconText}>{getMethodIcon(method.type)}</Text>
        </View>
        <View style={styles.methodDetails}>
          <Text style={[styles.methodType, { color: theme.colors.text }]}>{method.type}</Text>
          <Text style={[styles.methodHandle, { color: theme.colors.textSecondary }]}>{method.handle}</Text>
        </View>
        <View style={styles.methodStatus}>
          {method.verified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: theme.colors.success }]}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          ) : (
            <Text style={[styles.unverifiedText, { color: theme.colors.warning }]}>Pending</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
        onPress={() => removePaymentMethod(method.id)}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const getMethodIcon = (type) => {
    switch (type) {
      case 'Venmo': return '💙';
      case 'PayPal': return '💰';
      case 'CashApp': return '💵';
      case 'Zelle': return '🏦';
      case 'Bank Transfer': return '🏛️';
      default: return '💳';
    }
  };

  const getMethodColor = (type) => {
    switch (type) {
      case 'Venmo': return '#3D95CE';
      case 'PayPal': return '#003087';
      case 'CashApp': return '#00D632';
      case 'Zelle': return '#6D1ED4';
      case 'Bank Transfer': return '#1F2937';
      default: return '#64748B';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Payment Methods</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.addButton, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Manage your payment methods for quick settlements
          </Text>

          {paymentMethods.map((method) => (
            <PaymentMethodCard key={method.id} method={method} />
          ))}

          {paymentMethods.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No payment methods added yet
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={[styles.emptyButtonText, { color: theme.colors.background }]}>Add Your First Method</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Add Payment Method Modal */}
        <Modal visible={showAddModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Payment Method</Text>
              
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Payment Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {paymentTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      { backgroundColor: newMethod.type === type ? theme.colors.primary : theme.colors.surface },
                    ]}
                    onPress={() => setNewMethod({ ...newMethod, type })}
                  >
                    <Text style={[styles.typeButtonText, { 
                      color: newMethod.type === type ? theme.colors.background : theme.colors.text 
                    }]}>
                      {getMethodIcon(type)} {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Handle/Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder={`Enter your ${newMethod.type} handle`}
                placeholderTextColor={theme.colors.textTertiary}
                value={newMethod.handle}
                onChangeText={(text) => setNewMethod({ ...newMethod, handle: text })}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.surface }]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                  onPress={addPaymentMethod}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.background }]}>Add Method</Text>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  methodCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodIconText: {
    fontSize: 24,
  },
  methodDetails: {
    flex: 1,
  },
  methodType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodHandle: {
    fontSize: 14,
  },
  methodStatus: {
    alignItems: 'flex-end',
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  unverifiedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 16,
  },
  emptyButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  typeSelector: {
    marginBottom: 16,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
  },
});

export default PaymentMethodsScreen;