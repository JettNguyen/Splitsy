import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const PaymentMethodsScreen = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const paymentTypes = ['Venmo', 'PayPal', 'CashApp', 'Zelle'];
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMethod, setNewMethod] = useState({ type: 'Venmo', handle: '' });
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  const translateY = useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');
  
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 3 && gestureState.dy > 0 && !keyboardVisible;
    },
    onPanResponderGrant: () => {
      translateY.setOffset(translateY._value);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0 && !keyboardVisible) {
        translateY.setValue(gestureState.dy * 0.75);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      translateY.flattenOffset();
      if ((gestureState.dy > height * 0.2 || gestureState.vy > 1.2) && !keyboardVisible) {
        Animated.timing(translateY, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }).start(() => onClose());
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    if (showAddModal) {
      ensureValidSelectedType();
    }
  }, [showAddModal, paymentMethods]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const getMethodIcon = (type) => {
    switch (type) {
      case 'Venmo': return '💙';
      case 'PayPal': return 'P';
      case 'CashApp': return '💵';
      case 'Zelle': return 'Z';
      default: return '$';
    }
  };

  const getInputSymbol = (type) => {
    switch (type) {
      case 'Venmo': return '@';
      case 'PayPal': return '@';
      case 'CashApp': return '$';
      case 'Zelle': return '';
      default: return '';
    }
  };

  const getInputLabel = (type) => {
    switch (type) {
      case 'Venmo': return 'Venmo Username';
      case 'PayPal': return 'PayPal Username';
      case 'CashApp': return 'CashApp Handle';
      case 'Zelle': return 'Email or Phone Number';
      default: return 'Handle';
    }
  };

  const getAvailablePaymentTypes = () => {
    const addedTypes = paymentMethods.map(method => method.type);
    return paymentTypes.filter(type => !addedTypes.includes(type));
  };

  const ensureValidSelectedType = () => {
    const availableTypes = getAvailablePaymentTypes();
    if (availableTypes.length > 0 && !availableTypes.includes(newMethod.type)) {
      setNewMethod({ ...newMethod, type: availableTypes[0], handle: '' });
    }
  };

  const getPlaceholderText = (type) => {
    switch (type) {
      case 'Venmo':
        return 'username';
      case 'PayPal':
        return 'username';
      case 'CashApp':
        return 'cashtag';
      case 'Zelle':
        return 'email@domain.com or phone number';
      default:
        return 'Enter your handle';
    }
  };

  const addPaymentMethod = () => {
    if (!newMethod.handle.trim()) return;
    
    let processedHandle = newMethod.handle.trim();
    
    if (newMethod.type === 'CashApp' && processedHandle.startsWith('$')) {
      processedHandle = processedHandle.substring(1);
    }
    
    const method = {
      id: Date.now().toString(),
      type: newMethod.type,
      handle: processedHandle,
    };
    
    setPaymentMethods([...paymentMethods, method]);
    setNewMethod({ type: 'Venmo', handle: '' });
    setShowAddModal(false);
  };

  const deletePaymentMethod = (id) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setPaymentMethods(paymentMethods.filter(method => method.id !== id));
          }
        }
      ]
    );
  };

  const PaymentMethodCard = ({ method }) => (
    <View style={[styles.methodCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.methodInfo}>
        <Text style={styles.methodIcon}>{getMethodIcon(method.type)}</Text>
        <View style={styles.methodDetails}>
          <Text style={[styles.methodType, { color: theme.colors.text }]}>{method.type}</Text>
          <Text style={[styles.methodHandle, { color: theme.colors.textSecondary }]}>
            {getInputSymbol(method.type)}{method.handle}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => deletePaymentMethod(method.id)}
        style={styles.deleteButton}
      >
        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          { flex: 1 }, 
          { 
            backgroundColor: theme.colors.background,
            transform: [{ translateY }]
          }
        ]}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 60}
          style={{ flex: 1 }}
        >
          <View style={[styles.backgroundExtension, { backgroundColor: theme.colors.background }]} />
          <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/*drag indicator*/}
            <View style={styles.dragIndicatorContainer} {...panResponder.panHandlers}>
              <View style={[styles.dragIndicator, { backgroundColor: theme.colors.textTertiary }]} />
            </View>
          
          {/*header*/}
          <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary, opacity: 0.7 }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>Payment Methods</Text>
            {getAvailablePaymentTypes().length > 0 ? (
              <TouchableOpacity onPress={() => setShowAddModal(true)} style={[styles.addButton, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.addButton, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.addButtonText, { color: theme.colors.textSecondary }]}>Complete</Text>
              </View>
            )}
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: (!showAddModal && !keyboardVisible) ? 15 : 80 }
            ]}
          >
            {paymentMethods.map((method) => (
              <PaymentMethodCard key={method.id} method={method} />
            ))}

            {paymentMethods.length > 0 && getAvailablePaymentTypes().length === 0 && (
              <View style={styles.completedState}>
                <Text style={[styles.completedText, { color: theme.colors.textSecondary }]}>
                  🎉 All payment methods added! You're ready to settle expenses.
                </Text>
              </View>
            )}

            {paymentMethods.length === 0 && !showAddModal && getAvailablePaymentTypes().length > 0 && (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  No payment methods added yet
                </Text>
                <TouchableOpacity 
                  style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowAddModal(true)}
                >
                  <Text style={[styles.emptyButtonText, { color: 'white' }]}>Add Your First Method</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/*add payment method form*/}
          {showAddModal && getAvailablePaymentTypes().length > 0 && (
            <View style={[styles.addForm, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
              <View style={styles.addFormHeader}>
                <Text style={[styles.addFormTitle, { color: theme.colors.text }]}>Add New Payment Method</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeFormButton}>
                  <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Payment Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {getAvailablePaymentTypes().map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      { 
                        backgroundColor: newMethod.type === type ? theme.colors.primary : theme.colors.surface,
                        borderColor: newMethod.type === type ? theme.colors.primary : theme.colors.border
                      },
                    ]}
                    onPress={() => setNewMethod({ ...newMethod, type })}
                  >
                    <Text style={styles.typeButtonEmoji}>{getMethodIcon(type)}</Text>
                    <Text style={[styles.typeButtonText, { 
                      color: newMethod.type === type ? 'white' : theme.colors.text 
                    }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                {getInputLabel(newMethod.type)}
              </Text>
              <View style={styles.inputContainer}>
                {getInputSymbol(newMethod.type) !== '' && (
                  <Text style={[styles.inputSymbol, { color: theme.colors.textSecondary }]}>
                    {getInputSymbol(newMethod.type)}
                  </Text>
                )}
                <TextInput
                  style={[styles.input, {
                    backgroundColor: theme.colors.surface, 
                    color: theme.colors.text, 
                    borderColor: theme.colors.border,
                    paddingLeft: getInputSymbol(newMethod.type) !== '' ? 10 : 10
                  }]}
                  placeholder={getPlaceholderText(newMethod.type)}
                  placeholderTextColor={theme.colors.textTertiary}
                  value={newMethod.handle}
                  onChangeText={(text) => setNewMethod({ ...newMethod, handle: text })}
                  autoFocus={true}
                />
              </View>

              <TouchableOpacity 
                style={[styles.addFormButton, { backgroundColor: theme.colors.primary }]}
                onPress={addPaymentMethod}
                disabled={!newMethod.handle.trim()}
              >
                <Text style={[styles.addFormButtonText, { color: 'white' }]}>Add Method</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/*done button*/}
          {!showAddModal && !keyboardVisible && (
            <View style={[styles.doneButtonContainer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
              <TouchableOpacity 
                style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}
                onPress={onClose}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backgroundExtension: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -200,
    zIndex: -1,
  },
  container: {
    flex: 1,
    ...(Platform.OS === 'ios' && {
      paddingBottom: 0,
    }),
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  methodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  methodDetails: {
    flex: 1,
  },
  methodType: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  methodHandle: {
    fontSize: 14,
  },
  deleteButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 25,
    textAlign: 'center',
  },
  emptyButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  completedText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  doneButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 35 : 15,
    borderTopWidth: 1,
    marginTop: 'auto',
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  addForm: {
    margin: 15,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    marginBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  addFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addFormTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeFormButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeButtonEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  inputSymbol: {
    fontSize: 16,
    fontWeight: '500',
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderWidth: 0,
  },
  addFormButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addFormButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentMethodsScreen;