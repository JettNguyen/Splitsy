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
import { Ionicons } from '@expo/vector-icons';

//context and components
import { useTheme } from '../context/ThemeContext';
import ReceiptScanner from './ReceiptScanner';

//expense categories configuration with colors and icons
const ExpenseCategories = [
  { id: 'food', name: 'Food & Dining', icon: 'restaurant-outline', color: '#EF4444' },
  { id: 'groceries', name: 'Groceries', icon: 'basket-outline', color: '#10B981' },
  { id: 'transportation', name: 'Transportation', icon: 'car-outline', color: '#7c3aed' },
  { id: 'entertainment', name: 'Entertainment', icon: 'game-controller-outline', color: '#8B5CF6' },
  { id: 'shopping', name: 'Shopping', icon: 'bag-outline', color: '#A855F7' },
  { id: 'utilities', name: 'Utilities', icon: 'flash-outline', color: '#F59E0B' },
  { id: 'travel', name: 'Travel', icon: 'airplane-outline', color: '#06B6D4' },
  { id: 'healthcare', name: 'Healthcare', icon: 'medical-outline', color: '#84CC16' },
  { id: 'other', name: 'Other', icon: 'ellipse-outline', color: '#7C3AED' }
];

//main expense form component with 3-step process
const ExpenseForm = ({ 
  visible, 
  onClose, 
  onSubmit, 
  groups, 
  currentUser,
  initialData = {}
}) => {
  const { theme } = useTheme();
  
  //form state management
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    groupId: '',
    category: 'other',
    splitType: 'equal',
    participants: [],
    ...initialData
  });
  
  //ui state management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);

  const selectedGroup = groups.find(g => g.id === formData.groupId);
  const allMembers = selectedGroup ? selectedGroup.members : [];

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.description.trim()) return 'Please enter a description';
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      return 'Please enter a valid amount';
    }
    if (!formData.groupId) return 'Please select a group';
    if (formData.participants.length === 0) return 'Please select at least one participant';
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Error', error);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
        paidBy: currentUser.id,
        date: new Date().toISOString()
      });
      
      // Reset form
      setFormData({
        description: '',
        amount: '',
        groupId: '',
        category: 'other',
        splitType: 'equal',
        participants: []
      });
      setCurrentStep(1);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = (groupId) => {
    updateFormData('groupId', groupId);
    const group = groups.find(g => g.id === groupId);
    if (group) {
      updateFormData('participants', group.members);
    }
  };

  const toggleParticipant = (userId) => {
    const currentParticipants = formData.participants;
    const isSelected = currentParticipants.includes(userId);
    
    if (isSelected) {
      updateFormData('participants', currentParticipants.filter(id => id !== userId));
    } else {
      updateFormData('participants', [...currentParticipants, userId]);
    }
  };

  const handleReceiptScanned = (receiptData) => {
    if (receiptData) {
      updateFormData('description', receiptData.merchant || receiptData.description || '');
      updateFormData('amount', receiptData.total?.toString() || '');
      
      // Auto-categorize based on merchant name
      const merchant = (receiptData.merchant || '').toLowerCase();
      let category = 'other';
      if (merchant.includes('restaurant') || merchant.includes('cafe') || merchant.includes('food')) {
        category = 'food';
      } else if (merchant.includes('gas') || merchant.includes('fuel')) {
        category = 'transportation';
      } else if (merchant.includes('grocery') || merchant.includes('market')) {
        category = 'groceries';
      }
      updateFormData('category', category);
    }
    setShowReceiptScanner(false);
  };

  const CategoryItem = ({ category }) => {
    const isSelected = formData.category === category.id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          { 
            backgroundColor: isSelected ? category.color : theme.colors.surface,
            borderColor: isSelected ? category.color : theme.colors.border
          }
        ]}
        onPress={() => updateFormData('category', category.id)}
      >
        <View style={[
          styles.categoryIcon,
          { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : category.color }
        ]}>
          <Ionicons 
            name={category.icon} 
            size={24} 
            color="white" 
          />
        </View>
        <Text style={[
          styles.categoryName,
          { color: isSelected ? 'white' : theme.colors.text }
        ]}>
          {category.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const GroupItem = ({ group }) => {
    const isSelected = formData.groupId === group.id;
    return (
      <TouchableOpacity
        style={[
          styles.groupItem,
          { 
            backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border
          }
        ]}
        onPress={() => handleGroupSelect(group.id)}
      >
        <View style={[
          styles.groupIcon,
          { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.colors.primary }
        ]}>
          <Text style={styles.groupIconText}>G</Text>
        </View>
        <View style={styles.groupInfo}>
          <Text style={[
            styles.groupName,
            { color: isSelected ? 'white' : theme.colors.text }
          ]}>
            {group.name}
          </Text>
          <Text style={[
            styles.groupMembers,
            { color: isSelected ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }
          ]}>
            {group.members.length} members
          </Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedIndicatorText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const StepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map(step => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            { 
              backgroundColor: currentStep >= step ? theme.colors.primary : theme.colors.surface,
              borderColor: currentStep >= step ? theme.colors.primary : theme.colors.border
            }
          ]}>
            <Text style={[
              styles.stepNumber,
              { color: currentStep >= step ? 'white' : theme.colors.textSecondary }
            ]}>
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              { backgroundColor: currentStep > step ? theme.colors.primary : theme.colors.border }
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Expense Details
            </Text>

            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: theme.colors.accent }]}
              onPress={() => setShowReceiptScanner(true)}
            >
              <Text style={styles.scanButtonText}>S  Scan Receipt</Text>
            </TouchableOpacity>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Description
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                placeholder="What was this expense for?"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.description}
                onChangeText={(text) => updateFormData('description', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Amount ($)
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                value={formData.amount}
                onChangeText={(text) => updateFormData('amount', text)}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {ExpenseCategories.map(category => (
                  <CategoryItem key={category.id} category={category} />
                ))}
              </ScrollView>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Select Group
            </Text>
            
            <ScrollView style={styles.groupList}>
              {groups.map(group => (
                <GroupItem key={group.id} group={group} />
              ))}
            </ScrollView>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Split Details
            </Text>
            
            <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>
                Summary
              </Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.primary }]}>
                ${formData.amount}
              </Text>
              <Text style={[styles.summaryDescription, { color: theme.colors.textSecondary }]}>
                {formData.description}
              </Text>
              <Text style={[styles.summaryGroup, { color: theme.colors.textSecondary }]}>
                {selectedGroup?.name} • {formData.participants.length} people
              </Text>
            </View>

            <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 20 }]}>
              Each person pays: ${(parseFloat(formData.amount || 0) / formData.participants.length).toFixed(2)}
            </Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.iconText, { color: theme.colors.text }]}>×</Text>
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Add Expense
          </Text>

          <View style={{ width: 40 }} />
        </View>

        <StepIndicator />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <View style={styles.footerButtons}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={[styles.footerButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => setCurrentStep(currentStep - 1)}
              >
                <Text style={[styles.footerButtonText, { color: theme.colors.text }]}>
                  Back
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.primaryButton,
                { backgroundColor: theme.colors.primary },
                loading && styles.disabledButton
              ]}
              onPress={currentStep === 3 ? handleSubmit : () => setCurrentStep(currentStep + 1)}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Adding...' : (currentStep === 3 ? 'Add Expense' : 'Next')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ReceiptScanner
          visible={showReceiptScanner}
          onClose={() => setShowReceiptScanner(false)}
          onReceiptScanned={handleReceiptScanned}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafbfc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 10,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryItem: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    minWidth: 100,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  groupList: {
    flex: 1,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  groupMembers: {
    fontSize: 14,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  summaryDescription: {
    fontSize: 16,
    marginBottom: 4,
  },
  summaryGroup: {
    fontSize: 14,
  },
  footer: {
    borderTopWidth: 1,
    padding: 20,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    flex: 2,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ExpenseForm;