import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  SafeAreaView
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import ReceiptScanner from './ReceiptScanner';

const ExpenseCategories = [
  { id: 'food', name: 'Food & Dining', emoji: '🍽️', color: '#EF4444' },
  { id: 'groceries', name: 'Groceries', emoji: '🛒', color: '#10B981' },
  { id: 'transportation', name: 'Transportation', emoji: '🚗', color: '#3B82F6' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬', color: '#8B5CF6' },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#EC4899' },
  { id: 'utilities', name: 'Utilities', emoji: '⚡', color: '#F59E0B' },
  { id: 'travel', name: 'Travel', emoji: '✈️', color: '#06B6D4' },
  { id: 'healthcare', name: 'Healthcare', emoji: '🏥', color: '#84CC16' },
  { id: 'other', name: 'Other', emoji: '📝', color: '#6B7280' }
];

const SplitOptions = [
  { id: 'equal', name: 'Split Equally', description: 'Split the cost evenly among all participants' },
  { id: 'custom', name: 'Custom Split', description: 'Choose specific amounts for each person' },
  { id: 'percentage', name: 'By Percentage', description: 'Split by percentage of the total' }
];

const EnhancedExpenseForm = ({ 
  visible, 
  onClose, 
  onSubmit, 
  groups, 
  currentUser,
  initialData = {}
}) => {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    groupId: '',
    category: 'other',
    splitType: 'equal',
    participants: [],
    customSplits: {},
    notes: '',
    receiptData: null,
    ...initialData
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const totalSteps = 4;

  const selectedGroup = groups.find(g => g.id === formData.groupId);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReceiptScanned = (receiptData) => {
    setFormData(prev => ({
      ...prev,
      description: receiptData.merchant || prev.description,
      amount: receiptData.total.toString(),
      receiptData: receiptData
    }));
    setShowReceiptScanner(false);
  };

  const handleSubmit = () => {
    // Validate form
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!formData.groupId) {
      Alert.alert('Error', 'Please select a group');
      return;
    }
    if (formData.participants.length === 0) {
      Alert.alert('Error', 'Please select at least one participant');
      return;
    }

    // Calculate final split amounts
    let finalParticipants = formData.participants;
    let splitAmounts = {};

    if (formData.splitType === 'equal') {
      const splitAmount = parseFloat(formData.amount) / formData.participants.length;
      formData.participants.forEach(id => {
        splitAmounts[id] = splitAmount;
      });
    } else if (formData.splitType === 'custom') {
      splitAmounts = formData.customSplits;
    }

    const expenseData = {
      ...formData,
      amount: parseFloat(formData.amount),
      splitAmounts,
      payerId: currentUser.id
    };

    onSubmit(expenseData);
    
    // Reset form
    setFormData({
      description: '',
      amount: '',
      groupId: '',
      category: 'other',
      splitType: 'equal',
      participants: [],
      customSplits: {},
      notes: ''
    });
    setCurrentStep(1);
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Expense Details</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>What did you pay for?</Text>
        <TextInput
          style={styles.formInput}
          placeholder="e.g., Dinner at restaurant, Groceries"
          value={formData.description}
          onChangeText={(text) => setFormData({...formData, description: text})}
        />
      </View>

      {/* Receipt Scanner Button */}
      <View style={styles.formGroup}>
        <TouchableOpacity 
          style={styles.receiptScanButton}
          onPress={() => setShowReceiptScanner(true)}
        >
          <Text style={styles.receiptScanEmoji}>📷</Text>
          <View style={styles.receiptScanTextContainer}>
            <Text style={styles.receiptScanText}>Scan Receipt</Text>
            <Text style={styles.receiptScanSubtext}>Auto-fill from receipt photo</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>How much?</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            keyboardType="numeric"
            value={formData.amount}
            onChangeText={(text) => setFormData({...formData, amount: text})}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryContainer}>
            {ExpenseCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryOption,
                  formData.category === category.id && styles.categoryOptionSelected,
                  { borderColor: category.color }
                ]}
                onPress={() => setFormData({...formData, category: category.id})}
              >
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Notes (Optional)</Text>
        <TextInput
          style={[styles.formInput, styles.textArea]}
          placeholder="Add any additional details..."
          value={formData.notes}
          onChangeText={(text) => setFormData({...formData, notes: text})}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Group</Text>
      
      {groups.map((group) => (
        <TouchableOpacity
          key={group.id}
          style={[
            styles.groupOption,
            formData.groupId === group.id && styles.groupOptionSelected,
            { borderColor: group.color }
          ]}
          onPress={() => {
            setFormData({
              ...formData, 
              groupId: group.id,
              participants: group.members
            });
          }}
        >
          <View style={styles.groupOptionContent}>
            <View style={[styles.groupIcon, { backgroundColor: group.color + '20' }]}>
              <Text style={[styles.groupIconText, { color: group.color }]}>👥</Text>
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupSubtitle}>{group.members.length} members</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How to Split?</Text>
      
      {SplitOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.splitOption,
            formData.splitType === option.id && styles.splitOptionSelected
          ]}
          onPress={() => setFormData({...formData, splitType: option.id})}
        >
          <View style={styles.splitOptionContent}>
            <Text style={styles.splitOptionName}>{option.name}</Text>
            <Text style={styles.splitOptionDescription}>{option.description}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {formData.splitType === 'custom' && (
        <View style={styles.customSplitContainer}>
          <Text style={styles.customSplitTitle}>Custom Amounts</Text>
          {formData.participants.map((participantId) => (
            <View key={participantId} style={styles.customSplitRow}>
              <Text style={styles.participantName}>
                {participantId === currentUser.id ? 'You' : 'Member'}
              </Text>
              <View style={styles.customAmountInput}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.customAmountField}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={formData.customSplits[participantId]?.toString() || ''}
                  onChangeText={(text) => setFormData({
                    ...formData,
                    customSplits: {
                      ...formData.customSplits,
                      [participantId]: parseFloat(text) || 0
                    }
                  })}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Review & Confirm</Text>
      
      <View style={styles.reviewCard}>
        <Text style={styles.reviewTitle}>{formData.description}</Text>
        <Text style={styles.reviewAmount}>${formData.amount}</Text>
        
        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Group</Text>
          <Text style={styles.reviewSectionValue}>{selectedGroup?.name}</Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Category</Text>
          <Text style={styles.reviewSectionValue}>
            {ExpenseCategories.find(c => c.id === formData.category)?.name}
          </Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Split</Text>
          <Text style={styles.reviewSectionValue}>
            {formData.splitType === 'equal' 
              ? `$${(parseFloat(formData.amount) / formData.participants.length).toFixed(2)} per person`
              : 'Custom amounts'
            }
          </Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={styles.reviewSectionTitle}>Participants</Text>
          <Text style={styles.reviewSectionValue}>{formData.participants.length} people</Text>
        </View>

        {formData.notes && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Notes</Text>
            <Text style={styles.reviewSectionValue}>{formData.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return renderStep1();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: theme.colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Expense</Text>
          <Text style={[styles.stepIndicator, { color: theme.colors.textSecondary }]}>{currentStep}/{totalSteps}</Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressContainer, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.borderLight }]}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(currentStep / totalSteps) * 100}%`, backgroundColor: theme.colors.primary }
              ]} 
            />
          </View>
        </View>

        <ScrollView style={styles.modalContent}>
          {renderCurrentStep()}
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[
              styles.nextButton,
              currentStep === 1 && (!formData.description || !formData.amount) && styles.disabledButton,
              currentStep === 2 && !formData.groupId && styles.disabledButton
            ]}
            onPress={currentStep === totalSteps ? handleSubmit : handleNext}
            disabled={
              (currentStep === 1 && (!formData.description || !formData.amount)) ||
              (currentStep === 2 && !formData.groupId)
            }
          >
            <Text style={styles.nextButtonText}>
              {currentStep === totalSteps ? 'Add Expense' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Receipt Scanner Modal */}
      <ReceiptScanner
        visible={showReceiptScanner}
        onClose={() => setShowReceiptScanner(false)}
        onReceiptScanned={handleReceiptScanned}
      />
    </Modal>
  );
};

// Styles would be extensive - I'll provide a condensed version
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
  stepIndicator: {
    fontSize: 16,
    color: '#6B7280',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    paddingTop: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dollarSign: {
    fontSize: 16,
    color: '#6B7280',
    paddingLeft: 12,
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  categoryOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    minWidth: 80,
  },
  categoryOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  groupOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  groupOptionSelected: {
    backgroundColor: '#EEF2FF',
  },
  groupOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupIconText: {
    fontSize: 20,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  groupSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  splitOption: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  splitOptionSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  splitOptionContent: {
    alignItems: 'center',
  },
  splitOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  splitOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  customSplitContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  customSplitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  customSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantName: {
    fontSize: 14,
    color: '#374151',
  },
  customAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    backgroundColor: 'white',
    width: 100,
  },
  customAmountField: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  reviewAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 20,
  },
  reviewSection: {
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  reviewSectionValue: {
    fontSize: 16,
    color: '#111827',
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#6366F1',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  receiptScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#6366F1',
    borderStyle: 'dashed',
  },
  receiptScanEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  receiptScanTextContainer: {
    flex: 1,
  },
  receiptScanText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 2,
  },
  receiptScanSubtext: {
    fontSize: 14,
    color: '#6366F1',
    opacity: 0.8,
  },
});

export default EnhancedExpenseForm;