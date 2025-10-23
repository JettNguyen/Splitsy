import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import ReceiptScanner from './ReceiptScanner';
import apiService from '../services/apiService';

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


const ExpenseForm = ({visible,
  onClose,
  onSubmit,
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
    items: [],            // data from receipt
    subtotal: 0,
    service_charge: 0,
    ...initialData
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);

  // "unit" assignments for split by item (expand qty → units)
  const [unitAssignments, setUnitAssignments] = useState([]); // [{ unitid, memberid }]
  const [openUnit, setOpenUnit] = useState(null); // which unitid's dropdown is open (kept but unused now)

  const [assignModal, setAssignModal] = useState({ open: false, unitId: null });

// fetch friends from db
const [friends, setFriends] = useState([]);
const [loadingFriends, setLoadingFriends] = useState(false);

useEffect(() => {
  const fetchFriends = async () => {
    setLoadingFriends(true);
    try {
      const result = await apiService.getFriends();
      if (result && result.success && Array.isArray(result.friends)) {
        setFriends(result.friends);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  };
  fetchFriends();
}, []);

// fetch groups from db
const [groups, setGroups] = useState([]);
const [loadingGroups, setLoadingGroups] = useState(false);

useEffect(() => {
  const fetchGroups = async () => {
  setLoadingGroups(true);
  try {
    const result = await apiService.getGroups();
    if (Array.isArray(result)) {
      setGroups(result);
    }
  } catch (err) {
    console.error('Error fetching groups:', err);
  } finally {
    setLoadingGroups(false);
  }
};

  fetchGroups();
}, []);

  const selectedGroup = groups.find(g => g.id === formData.groupId);
  const allMembers = selectedGroup ? selectedGroup.members : [];


  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // -------------------------
  // validation + submit
  // -------------------------
  const validateForm = () => {
    if (!formData.description.trim()) return 'Please enter a description';
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      return 'Please enter a valid amount';
    }
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

      setFormData({
        description: '',
        amount: '',
        groupId: '',
        category: 'other',
        splitType: 'equal',
        participants: [],
        items: [],
        subtotal: 0,
        service_charge: 0
      });
      setUnitAssignments([]);
      setOpenUnit(null);
      setCurrentStep(1);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------
  // group + participants
  // -------------------------
const handleGroupSelect = (groupId) => {
  const current = formData.groupId;
  if (current === groupId) {
    // if clicked the same group, unselect it
    updateFormData('groupId', '');
    updateFormData('participants', []);
  } else {
    const group = groups.find(g => g.id === groupId);
    updateFormData('groupId', groupId);

    if (group) {
      // extract unique user ids
      const uniqueUserIds = Array.from(
        new Set(group.members.map(member => member.user.id))
      );
      updateFormData('participants', uniqueUserIds);
    }
  }
};


  // handle individual friend selection
const handleFriendSelect = (friendId) => {
  setFormData(prev => {
    let participantsById = prev.participants.includes(friendId)
      ? prev.participants.filter(id => id !== friendId) // remove
      : [...prev.participants, friendId]; // add

    // ensure current user is always included
    if (!participantsById.includes(currentUser.id)) {
      participantsById = [currentUser.id, ...participantsById];
    }

    return { ...prev, participants: participantsById };
  });
};

  // -------------------------
  // receipt scanner → populate fields
  // -------------------------
  const handleReceiptScanned = (receiptData) => {
    if (receiptData) {
      const merchant = receiptData.merchant || receiptData.description || '';
      const totalStr = receiptData.total?.toString() || '';
      const itemsIn = Array.isArray(receiptData.items) ? receiptData.items : [];

      const normItems = itemsIn.map(it => ({
        name: (it.name || it.description || '').toString(),
        price: parseFloat(it.price ?? it.amount ?? 0) || 0, // line total
        qty: parseInt(it.qty ?? 1, 10) || 1,
      }));

      const subtotal = normItems.reduce((s, it) => s + it.price, 0);
      const total = parseFloat(totalStr) || 0;
      const service_charge = Math.max(0, total - subtotal);

      // test participants for now
      let participants = formData.participants;
      if (!formData.groupId || participants.length === 0) {
        participants = ['Harry', 'Ron', 'Hermione'];
      }

      // build flat assignment units
      const flatUnits = [];
      normItems.forEach((it, idx) => {
        const qty = Math.max(1, it.qty);
        const unitPrice = qty > 0 ? (it.price / qty) : it.price;
        for (let u = 0; u < qty; u++) {
          flatUnits.push({ unitId: `${idx}-${u}`, name: it.name, unitPrice });
        }
      });

      setUnitAssignments(flatUnits.map(u => ({ unitId: u.unitId, memberId: null })));

      // auto-categorize
      const merchantLower = merchant.toLowerCase();
      let category = 'other';
      if (merchantLower.includes('restaurant') || merchantLower.includes('cafe') || merchantLower.includes('food')) {
        category = 'food';
      } else if (merchantLower.includes('gas') || merchantLower.includes('fuel')) {
        category = 'transportation';
      } else if (merchantLower.includes('grocery') || merchantLower.includes('market')) {
        category = 'groceries';
      }

      setFormData(prev => ({
        ...prev,
        description: merchant,
        amount: total ? total.toFixed(2) : '',
        category,
        items: normItems,
        subtotal,
        service_charge,
        participants
      }));
    }
    setShowReceiptScanner(false);
  };

  // -------------------------
  // split logic (equal / by item)
  // -------------------------
  const nMoney = (v) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);
  const nInt = (v, d = 1) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

const memberList = useMemo(() => {
  return (formData.participants || []).map(userId => {
    // first check friends
    const friend = friends.find(f => f.id === userId);
    if (friend) return { id: friend.id, name: friend.name };

    // then check selected group members
    const groupMember = groups
      .flatMap(g => g.members)
      .find(m => m.user.id === userId);

    if (groupMember) return { id: userId, name: groupMember.user.name };

    // fallback
    return { id: userId, name: 'Unknown' };
  });
}, [formData.participants, friends, groups]);


  const flatUnits = useMemo(() => {
    const arr = [];
    formData.items.forEach((it, idx) => {
      const qty = nInt(it.qty, 1);
      const lineTotal = nMoney(it.price);
      const unitPrice = qty > 0 ? lineTotal / qty : lineTotal;
      for (let u = 0; u < qty; u++) {
        arr.push({ unitId: `${idx}-${u}`, name: it.name, unitPrice });
      }
    });
    return arr;
  }, [formData.items]);

  const totalNum = nMoney(formData.amount);
  const subtotalNum = formData.subtotal || formData.items.reduce((s, it) => s + nMoney(it.price), 0);
  const groupSize = Math.max(1, memberList.length);

  // total - subtotal (includes tax & all fees)
  const serviceChargeAmount = Math.max(0, totalNum - subtotalNum);
  const baseFeePerPerson = serviceChargeAmount / groupSize;

  const owedByPerson = useMemo(() => {
    const map = new Map(memberList.map(m => [m.id, 0]));
    memberList.forEach(m => map.set(m.id, map.get(m.id) + baseFeePerPerson));
    unitAssignments.forEach(assign => {
      const unit = flatUnits.find(u => u.unitId === assign.unitId);
      if (unit && assign.memberId && map.has(assign.memberId)) {
       map.set(assign.memberId, map.get(assign.memberId) + unit.unitPrice);
      } 
    });
    return map;
  }, [memberList, baseFeePerPerson, unitAssignments, flatUnits]);

  const getAssignedName = (unitId) => {
    const a = unitAssignments.find(x => x.unitId === unitId);
    const m = a ? memberList.find(mm => mm.id === a.memberId) : null;
    return m?.name || 'Assign to';
  };

  // -------------------------
  // render helpers
  // -------------------------
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
          <Ionicons name={category.icon} size={24} color="white" />
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
const FriendItem = ({ friend }) => {
  const isSelected = formData.participants.includes(friend.id);
  return (
    <TouchableOpacity
      style={[
        styles.groupItem,
        {
          backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
        }
      ]}
      onPress={() => handleFriendSelect(friend.id)}
    >
      <View style={[
        styles.groupIcon,
        { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.colors.primary }
      ]}>
        <Text style={styles.groupIconText}>{friend.name[0]}</Text>
      </View>
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: isSelected ? 'white' : theme.colors.text }]}>
          {friend.name}
        </Text>
        <Text style={[styles.groupMembers, { color: isSelected ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }]}>
          Friend
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
              <Text style={styles.scanButtonText}>Scan Receipt</Text>
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
            Select Members
          </Text>

          <ScrollView style={styles.groupList} showsVerticalScrollIndicator={false}>

            {/* --- groups section --- */}
            <View style={[styles.sectionContainer, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Groups</Text>
              {groups.map(group => (
                <GroupItem key={group.id} group={group} />
              ))}
            </View>

            {/* --- friends section --- */}
            <View style={[styles.sectionContainer, { backgroundColor: theme.colors.card, marginTop: 16 }]}>
              <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Friends</Text>
              {friends.map(friend => (
                <FriendItem key={friend.id} friend={friend} />
              ))}
            </View>
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
                ${formData.amount || '0.00'}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, marginBottom: 6 }}>
                Subtotal: ${subtotalNum.toFixed(2)}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, marginBottom: 6 }}>
                Service Charge (including tax): ${serviceChargeAmount.toFixed(2)}
              </Text>
              <Text style={[styles.summaryDescription, { color: theme.colors.textSecondary }]}>
                {formData.description}
              </Text>
              <Text style={[styles.summaryGroup, { color: theme.colors.textSecondary }]}>
                {selectedGroup?.name || 'No group'} • {memberList.length} people
              </Text>
            </View>

            {/* split mode toggle */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => updateFormData('splitType', 'equal')}
                style={[
                  styles.splitToggle,
                  {
                    backgroundColor: formData.splitType === 'equal' ? theme.colors.primary : theme.colors.surface,
                    borderColor: theme.colors.primary
                  }
                ]}>
                <Text style={{ color: formData.splitType === 'equal' ? 'white' : theme.colors.primary, fontWeight: '700' }}>
                  Split Evenly
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => updateFormData('splitType', 'byItem')}
                style={[
                  styles.splitToggle,
                  {
                    backgroundColor: formData.splitType === 'byItem' ? theme.colors.primary : theme.colors.surface,
                    borderColor: theme.colors.primary
                  }
                ]}>
                <Text style={{ color: formData.splitType === 'byItem' ? 'white' : theme.colors.primary, fontWeight: '700' }}>
                  Split by Item
                </Text>
              </TouchableOpacity>
            </View>

            {formData.splitType === 'equal' ? (
              // -------------------------
              // split evenly
              // -------------------------
              <View style={{ marginTop: 16 }}>
                {memberList.map(m => (
                  <View key={m.id} style={styles.oweRow}>
                    <Text style={[styles.oweName, { color: theme.colors.text }]}>{m.name}</Text>
                    <Text style={[styles.oweAmount, { color: theme.colors.text }]}>
                      ${(totalNum / Math.max(1, memberList.length)).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              // -------------------------
              // split by item
              // -------------------------
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.label, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
                  Assign each item to a person: 
                </Text>

                {flatUnits.length === 0 ? (
                  <Text style={{ color: theme.colors.textSecondary }}>No items found on this receipt.</Text>
                ) : (
                  flatUnits.map(u => {
                    const a = unitAssignments.find(x => x.unitId === u.unitId);
                    const selectedId = a?.memberId || (memberList[0] && memberList[0].id);
                    return (
                      <View key={u.unitId} style={styles.unitRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.colors.text }}>{u.name}</Text>
                          <Text style={{ color: theme.colors.textSecondary }}>${u.unitPrice.toFixed(2)}</Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => setAssignModal({ open: true, unitId: u.unitId })}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: theme.colors.primary,
                            backgroundColor: theme.colors.surface,
                            minWidth: 140,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                            {getAssignedName(u.unitId)}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}

                {/* per-person totals */}
                <View style={[styles.summaryCard, { backgroundColor: theme.colors.card, marginTop: 16 }]}>
                  <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Who owes what</Text>
                  <Text style={{ color: theme.colors.textSecondary, marginBottom: 6 }}>
                    Base fee per person (fees + tax): ${baseFeePerPerson.toFixed(2)}
                  </Text>
                  {memberList.map(m => (
                    <View key={m.id} style={styles.oweRow}>
                      <Text style={[styles.oweName, { color: theme.colors.text }]}>{m.name}: </Text>
                      <Text style={[styles.oweAmount, { color: theme.colors.text }]}>
                        ${Math.max(0, owedByPerson.get(m.id)).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        );
    }
  };

  // -------------------------
  // render
  // -------------------------
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

        <AssignMemberModal
          visible={assignModal.open}
          onClose={() => setAssignModal({ open: false, unitId: null })}
          memberList={memberList}
          theme={theme}
          onPick={(memberId) => {
            const unitId = assignModal.unitId;
            setUnitAssignments(prev =>
              prev.map(x => x.unitId === unitId ? { ...x, memberId } : x)
            );
            setAssignModal({ open: false, unitId: null });
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const AssignMemberModal = ({ visible, onClose, memberList, theme, onPick }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{
          position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)'
        }} />
      </TouchableWithoutFeedback>

      {/* dialog */}
      <View style={{
        position: 'absolute', left: 20, right: 20, top: '25%',
        borderRadius: 16, overflow: 'hidden',
        backgroundColor: theme.colors.card,
        borderWidth: 1, borderColor: theme.colors.border,
        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
      }}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: theme.colors.border }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.text }}>Assign to</Text>
        </View>

        <ScrollView style={{ maxHeight: 320 }}>
          {memberList.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => onPick(m.id)}
              style={{
                paddingHorizontal: 16, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
              }}
            >
              <Text style={{ fontSize: 16, color: theme.colors.text }}>{m.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ padding: 12 }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              alignItems: 'center',
              paddingVertical: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ color: theme.colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// -------------------------
// styles
// -------------------------
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
  closeButton: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  iconContainer: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  iconText: { fontSize: 18, fontWeight: '700' },

  stepIndicator: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20,
  },
  stepContainer: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2,
  },
  stepNumber: { fontSize: 14, fontWeight: '700' },
  stepLine: { width: 40, height: 2, marginHorizontal: 10 },

  content: { flex: 1, padding: 20 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 24, fontWeight: '700', marginBottom: 25, textAlign: 'center' },

  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  input: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 15, fontSize: 16 },

  categoryScroll: { flexDirection: 'row' },
  categoryItem: {
    alignItems: 'center', padding: 16, borderRadius: 12, marginRight: 12, borderWidth: 2, minWidth: 100,
  },
  categoryIcon: {
    width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  categoryName: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  groupList: { flex: 1 },
  groupItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2,
  },
  groupIcon: {
    width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  groupIconText: { fontSize: 18, fontWeight: '800', color: 'white' },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  groupMembers: { fontSize: 14 },
  selectedIndicator: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  selectedIndicatorText: { color: 'white', fontSize: 14, fontWeight: '700' },

  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  summaryTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  summaryAmount: { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  summaryDescription: { fontSize: 16, marginBottom: 4 },
  summaryGroup: { fontSize: 14 },

  footer: { borderTopWidth: 1, padding: 20 },
  footerButtons: { flexDirection: 'row', gap: 12 },
  footerButton: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  footerButtonText: { fontSize: 16, fontWeight: '700' },
  primaryButton: { flex: 2 },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },

  scanButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, marginBottom: 20,
  },
  scanButtonText: { color: 'white', fontSize: 16, fontWeight: '700' },

  splitToggle: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 12,
  },
  oweRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  oweName: { fontSize: 16, fontWeight: '600' },
  oweAmount: { fontSize: 16, fontWeight: '700' },

  // dropdown (kept for style references; not used by new popup)
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 2,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    right: 0,
    left: 0,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  sectionContainer: {
  borderRadius: 16,
  padding: 12,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.05)',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 3,
},
sectionHeader: {
  fontSize: 16,
  fontWeight: '700',
  marginBottom: 8,
  textAlign: 'center',
},
});

export default ExpenseForm;