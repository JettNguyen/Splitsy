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
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Expense Details</Text>
      
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: theme.colors.text }]}>What did you pay for?</Text>
        <TextInput
          style={[
            styles.formInput, 
            { 
              backgroundColor: theme.colors.card, 
              borderColor: theme.colors.border, 
              color: theme.colors.text 
            }
          ]}
          placeholder="e.g., Dinner at restaurant, Groceries"
          placeholderTextColor={theme.colors.textSecondary}
          value={formData.description}
          onChangeText={(text) => setFormData({...formData, description: text})}
        />
      </View>

      {/* Receipt Scanner Button */}
      <View style={styles.formGroup}>
        <TouchableOpacity 
          style={[
            styles.receiptScanButton,
            { 
              backgroundColor: theme.colors.primary + '20', 
              borderColor: theme.colors.primary 
            }
          ]}
          onPress={() => setShowReceiptScanner(true)}
        >
          <Text style={styles.receiptScanEmoji}>📷</Text>
          <View style={styles.receiptScanTextContainer}>
            <Text style={[styles.receiptScanText, { color: theme.colors.primary }]}>Scan Receipt</Text>
            <Text style={[styles.receiptScanSubtext, { color: theme.colors.primary }]}>Auto-fill from receipt photo</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: theme.colors.text }]}>How much?</Text>
        <View style={[
          styles.amountInputContainer,
          { 
            backgroundColor: theme.colors.card, 
            borderColor: theme.colors.border 
          }
        ]}>
          <Text style={[styles.dollarSign, { color: theme.colors.textSecondary }]}>$</Text>
          <TextInput
            style={[styles.amountInput, { color: theme.colors.text }]}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            value={formData.amount}
            onChangeText={(text) => setFormData({...formData, amount: text})}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: theme.colors.text }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryContainer}>
            {ExpenseCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryOption,
                  { 
                    backgroundColor: theme.colors.card,
                    borderColor: formData.category === category.id ? theme.colors.primary : theme.colors.border
                  },
                  formData.category === category.id && { backgroundColor: theme.colors.primary + '20' }
                ]}
                onPress={() => setFormData({...formData, category: category.id})}
              >
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={[styles.categoryName, { color: theme.colors.text }]}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: theme.colors.text }]}>Notes (Optional)</Text>
        <TextInput
          style={[
            styles.formInput, 
            styles.textArea,
            { 
              backgroundColor: theme.colors.card, 
              borderColor: theme.colors.border, 
              color: theme.colors.text 
            }
          ]}
          placeholder="Add any additional details..."
          placeholderTextColor={theme.colors.textSecondary}
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
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Select Group</Text>
      
      {groups && groups.length > 0 ? (
        groups.map((group) => (
          <TouchableOpacity
            key={group.id}
            style={[
              styles.groupOption,
              { 
                backgroundColor: theme.colors.card,
                borderColor: formData.groupId === group.id ? theme.colors.primary : theme.colors.border
              },
              formData.groupId === group.id && { backgroundColor: theme.colors.primary + '20' }
            ]}
            onPress={() => {
              setFormData({
                ...formData, 
                groupId: group.id,
                participants: group.members || []
              });
            }}
          >
            <View style={styles.groupOptionContent}>
              <View style={[styles.groupIcon, { backgroundColor: (group.color || theme.colors.primary) + '20' }]}>
                <Text style={[styles.groupIconText, { color: group.color || theme.colors.primary }]}>👥</Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={[styles.groupName, { color: theme.colors.text }]}>{group.name}</Text>
                <Text style={[styles.groupSubtitle, { color: theme.colors.textSecondary }]}>
                  {(group.members || []).length} members
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <View style={[styles.noGroupsContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.noGroupsText, { color: theme.colors.textSecondary }]}>
            No groups available. Create a group first to add expenses.
          </Text>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>How to Split?</Text>
      
      {SplitOptions.map((option) => (
        <TouchableOpacity
          key={option.id}
          style={[
            styles.splitOption,
            { 
              backgroundColor: theme.colors.card,
              borderColor: formData.splitType === option.id ? theme.colors.primary : theme.colors.border
            },
            formData.splitType === option.id && { backgroundColor: theme.colors.primary + '20' }
          ]}
          onPress={() => setFormData({...formData, splitType: option.id})}
        >
          <View style={styles.splitOptionContent}>
            <Text style={[styles.splitOptionName, { color: theme.colors.text }]}>{option.name}</Text>
            <Text style={[styles.splitOptionDescription, { color: theme.colors.textSecondary }]}>{option.description}</Text>
          </View>
        </TouchableOpacity>
      ))}

      {formData.splitType === 'custom' && (
        <View style={[styles.customSplitContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.customSplitTitle, { color: theme.colors.text }]}>Custom Amounts</Text>
          {formData.participants.map((participantId) => (
            <View key={participantId} style={styles.customSplitRow}>
              <Text style={[styles.participantName, { color: theme.colors.text }]}>
                {participantId === currentUser.id ? 'You' : 'Member'}
              </Text>
              <View style={[styles.customAmountInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.dollarSign, { color: theme.colors.textSecondary }]}>$</Text>
                <TextInput
                  style={[styles.customAmountField, { color: theme.colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textSecondary}
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
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Review & Confirm</Text>
      
      <View style={[styles.reviewCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.reviewTitle, { color: theme.colors.text }]}>{formData.description}</Text>
        <Text style={[styles.reviewAmount, { color: theme.colors.primary }]}>${formData.amount}</Text>
        
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewSectionTitle, { color: theme.colors.textSecondary }]}>Group</Text>
          <Text style={[styles.reviewSectionValue, { color: theme.colors.text }]}>{selectedGroup?.name}</Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={[styles.reviewSectionTitle, { color: theme.colors.textSecondary }]}>Category</Text>
          <Text style={[styles.reviewSectionValue, { color: theme.colors.text }]}>
            {ExpenseCategories.find(c => c.id === formData.category)?.name}
          </Text>
        </View>

        <View style={styles.reviewSection}>
          <Text style={[styles.reviewSectionTitle, { color: theme.colors.textSecondary }]}>Split</Text>
          <Text style={[styles.reviewSectionValue, { color: theme.colors.text }]}>
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
        <View style={[styles.navigationContainer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
          {currentStep > 1 && (
            <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: theme.colors.background }]} 
              onPress={handleBack}
            >
              <Text style={[styles.backButtonText, { color: theme.colors.textSecondary }]}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[
              styles.nextButton,
              { backgroundColor: theme.colors.primary },
              ((currentStep === 1 && (!formData.description || !formData.amount)) ||
               (currentStep === 2 && !formData.groupId)) && 
               { backgroundColor: theme.colors.textSecondary }
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

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 24,
  },
  stepIndicator: {
    fontSize: 16,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
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
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 8,
  },
  dollarSign: {
    fontSize: 16,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  groupOption: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  noGroupsContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  noGroupsText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
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
    marginBottom: 2,
  },
  groupSubtitle: {
    fontSize: 14,
  },
  splitOption: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  splitOptionContent: {
    alignItems: 'center',
  },
  splitOptionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  splitOptionDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  customSplitContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  customSplitTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  customAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    width: 100,
  },
  customAmountField: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
  },
  reviewCard: {
    borderRadius: 12,
    padding: 20,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  reviewAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  reviewSection: {
    marginBottom: 12,
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewSectionValue: {
    fontSize: 16,
  },
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
  },
  receiptScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
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
    marginBottom: 2,
  },
  receiptScanSubtext: {
    fontSize: 14,
    opacity: 0.8,
  },
});



export default EnhancedExpenseForm;