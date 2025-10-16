import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../services/apiService';

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
    items: [], // itemized list: { id, name, price, quantity, assignees: [userIds] }
    entryMode: 'scan', // 'scan' or 'manual'
    ...initialData
  });
  
  //ui state management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const selectedGroup = groups.find(g => g.id === formData.groupId);
  const allMembers = selectedGroup ? selectedGroup.members : [];
  const [friends, setFriends] = useState([]);
  const [selectMode, setSelectMode] = useState('groups'); // 'groups' or 'friends'

  // compute assignable users for items: if a group is selected use its members, otherwise use selected friends + you
  const assignableUsers = (() => {
    if (selectedGroup && selectedGroup.members && selectedGroup.members.length > 0) {
      return selectedGroup.members.map(m => {
        const id = m.user ? (m.user._id || m.user.id) : (m._id || m.id || m);
        return { _id: id, id, name: m.user ? m.user.name : (m.name || m.email || 'Member'), email: m.user?.email || m.email };
      });
    }
    // for friends mode, include current user + only the friends selected in formData.participants
    const selectedFriendIds = formData.participants || [];
    const selectedFriends = (friends || []).filter(f => selectedFriendIds.includes(f._id || f.id));
    const current = [{ _id: currentUser.id || currentUser._id, id: currentUser.id || currentUser._id, name: currentUser.name, email: currentUser.email }];
    return [...current, ...selectedFriends];
  })();

  // keep existing items' assignees in sync when selection changes
  useEffect(() => {
    const allowed = (assignableUsers || []).map(u => u._id || u.id).filter(Boolean);
    if (!formData.items || formData.items.length === 0) return;

    const sanitized = (formData.items || []).map(it => {
      const filtered = (it.assignees || []).filter(a => allowed.includes(a));
      // if nothing remains, default to allowed users so items remain assigned
      return { ...it, assignees: filtered.length ? filtered : allowed };
    });

    // only update if different to avoid unnecessary renders
    const changed = JSON.stringify(sanitized) !== JSON.stringify(formData.items);
    if (changed) updateFormData('items', sanitized);
  }, [formData.groupId, formData.participants]);

  // when items change, auto-calc the total amount and set it into formData.amount
  useEffect(() => {
    const items = formData.items || [];
    if (!items || items.length === 0) return;
    const sum = items.reduce((s, it) => s + ((parseFloat(String(it.price).replace(/[^0-9.-]/g, '')) || 0) * (parseInt(it.quantity) || 1)), 0);
    const rounded = Math.round(sum * 100) / 100;
    const formatted = formatToTwoDecimals(rounded);
    if (formatToTwoDecimals(formData.amount) !== formatted) {
      updateFormData('amount', formatted);
    }
  }, [JSON.stringify(formData.items || [])]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper: normalize user numeric input while typing (allow only digits and one dot, max 2 decimals)
  const normalizeNumericInput = (text) => {
    if (text == null) return '';
    // remove everything except digits and dot
    let cleaned = String(text).replace(/[^0-9.]/g, '');
    // if multiple dots, keep first and remove others
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    if (cleaned.startsWith('.')) cleaned = '0' + cleaned;
    // limit decimals to 2 places while typing
    const [intPart, decPart] = cleaned.split('.');
    if (typeof decPart !== 'undefined') {
      return intPart + '.' + decPart.slice(0, 2);
    }
    return intPart;
  };

  // Helper: format a numeric string/value to fixed 2-decimal representation (or empty string)
  const formatToTwoDecimals = (val) => {
    const num = parseFloat(String(val || '').replace(/[^0-9.-]/g, ''));
    if (isNaN(num)) return '';
    return num.toFixed(2);
  };

  const validateForm = () => {
    if (!formData.description.trim()) return 'Please enter a description';
    // if items provided and amount empty, auto-calc
    if ((!formData.amount || Number(formData.amount) <= 0) && formData.items && formData.items.length > 0) {
      const sum = (formData.items || []).reduce((s, it) => s + ((parseFloat(String(it.price).replace(/[^0-9.-]/g, '')) || 0) * (parseInt(it.quantity) || 1)), 0);
      updateFormData('amount', String(Math.round(sum * 100) / 100));
    }
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      return 'Please enter a valid amount';
    }
    if (!formData.groupId && (!formData.participants || formData.participants.length === 0)) return 'Please select a group or at least one friend';
    // if exact split, ensure participant amounts don't exceed total
    if (formData.splitType === 'exact') {
      const amountNum = parseFloat(formData.amount) || 0;
      const custom = formData.customAmounts || {};
      const participantsTotal = (formData.participants || []).reduce((s, id) => s + (parseFloat(custom[id]) || 0), 0);
      if (participantsTotal > amountNum) return 'Participant amounts exceed total amount. Adjust exact shares.';
    }
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
      // normalize members to user ids
      const memberIds = group.members.map(m => (m.user ? (m.user._id || m.user.id) : (m._id || m.id || m)));
      updateFormData('participants', memberIds);
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

  const updateParticipantAmount = (userId, amount) => {
    // store customAmounts map on formData for exact splits
    // amount is stored as a string here; final parsing happens in the submit handler
    const custom = formData.customAmounts || {};
    custom[userId] = amount;
    updateFormData('customAmounts', custom);
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

  // map scanned items into form items (name, price, quantity, no assignees by default)
  useEffect(() => {
    // if the receipt scanner produced data stored into initialData via props, it will be handled by handleReceiptScanned
  }, []);

  const addItem = () => {
    const id = `item-${Date.now()}`;
    // default assignees to current assignable users (to avoid assigning every time)
    const defaultAssignees = (assignableUsers && assignableUsers.length > 0) ? assignableUsers.map(u => u._id || u.id) : [];
    // store price as string to allow formatted input handling
    const newItem = { id, name: '', price: '', quantity: 1, assignees: defaultAssignees };
    updateFormData('items', [...(formData.items || []), newItem]);
  };

  const updateItem = (id, field, value) => {
    const updated = (formData.items || []).map(it => it.id === id ? { ...it, [field]: value } : it);
    updateFormData('items', updated);
  };

  const removeItem = (id) => {
    updateFormData('items', (formData.items || []).filter(it => it.id !== id));
  };

  const toggleItemAssignee = (itemId, userId) => {
    const updated = (formData.items || []).map(it => {
      if (it.id !== itemId) return it;
      const assignees = it.assignees || [];
      const exists = assignees.includes(userId);
      return { ...it, assignees: exists ? assignees.filter(a => a !== userId) : [...assignees, userId] };
    });
    updateFormData('items', updated);
  };

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      const raw = (e && e.endCoordinates && e.endCoordinates.height) ? e.endCoordinates.height : 300;
      // cap the keyboard height to prevent footer floating overly high on some devices
      const capped = Math.min(raw, 260);
      setKeyboardOffset(capped);
    };
    const onHide = () => setKeyboardOffset(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // fetch friends when the modal opens
  useEffect(() => {
    let mounted = true;
    const loadFriends = async () => {
      try {
        const res = await apiService.getFriends();
        if (res && res.friends && mounted) {
          setFriends(res.friends);
        }
      } catch (err) {
        console.error('Failed to load friends for expense form', err);
      }
    };
    if (visible) loadFriends();
    return () => { mounted = false; };
  }, [visible]);

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
              Select Group
            </Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity onPress={() => setSelectMode('groups')} style={[styles.segmentButton, selectMode === 'groups' && { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.segmentText, selectMode === 'groups' && { color: 'white' }]}>Groups</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectMode('friends')} style={[styles.segmentButton, selectMode === 'friends' && { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.segmentText, selectMode === 'friends' && { color: 'white' }]}>Friends</Text>
              </TouchableOpacity>
            </View>

            {selectMode === 'groups' ? (
              <ScrollView style={styles.groupList} removeClippedSubviews={false}>
                {groups.map(group => (
                  <GroupItem key={group.id} group={group} />
                ))}
              </ScrollView>
            ) : (
              <ScrollView style={styles.groupList} removeClippedSubviews={false}>
                {friends.map((f, idx) => {
                  const fid = f._id || f.id || `friend-${idx}`;
                  const isSelected = formData.participants.includes(fid);
                  return (
                    <TouchableOpacity key={fid} style={[styles.friendRowItem, { backgroundColor: isSelected ? theme.colors.primary : theme.colors.card }]} onPress={() => toggleParticipant(fid)}>
                      <View style={[styles.avatarSmall, { backgroundColor: theme.colors.primary }]}>
                        <Text style={{ color: 'white', fontWeight: '700' }}>{f.name?.[0] || 'U'}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: isSelected ? 'white' : theme.colors.text }}>{f.name || f.email}</Text>
                        <Text style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary, fontSize: 12 }}>{f.email}</Text>
                      </View>
                      <View style={{ width: 32, alignItems: 'center' }}>
                        {isSelected && <Text style={{ color: 'white' }}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
              Expense Details
            </Text>

            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <TouchableOpacity onPress={() => updateFormData('entryMode', 'scan')} style={[styles.segmentButton, formData.entryMode === 'scan' && { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.segmentText, formData.entryMode === 'scan' && { color: 'white' }]}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => updateFormData('entryMode', 'manual')} style={[styles.segmentButton, formData.entryMode === 'manual' && { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.segmentText, formData.entryMode === 'manual' && { color: 'white' }]}>Manual</Text>
              </TouchableOpacity>
            </View>

            {formData.entryMode === 'scan' ? (
              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: theme.colors.accent }]}
                onPress={() => setShowReceiptScanner(true)}
              >
                <Ionicons name="camera-outline" size={20} color="white" />
                <Text style={[styles.scanButtonText, { marginLeft: 8 }]}>Scan Receipt</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Items</Text>
                {(formData.items || []).map(it => (
                  <View key={it.id} style={{ marginBottom: 8, backgroundColor: theme.colors.card, padding: 10, borderRadius: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput placeholder="Item name" placeholderTextColor={theme.colors.textSecondary} value={it.name} onChangeText={(t) => updateItem(it.id, 'name', t)} style={[styles.input, { flex: 1, marginRight: 8, paddingVertical: 8, color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]} />
                      <TextInput
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={String(it.price || '')}
                        onChangeText={(t) => updateItem(it.id, 'price', normalizeNumericInput(t))}
                        onEndEditing={() => updateItem(it.id, 'price', formatToTwoDecimals(it.price))}
                        keyboardType="decimal-pad"
                        style={[styles.input, { width: 100, paddingVertical: 8, color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center' }}>
                      <Text style={{ color: theme.colors.textSecondary, marginRight: 8 }}>Assign to:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {(assignableUsers || []).map((u, idx) => {
                          const uid = u._id || u.id || `u-${idx}`;
                          const selected = (it.assignees || []).includes(uid);
                          return (
                            <TouchableOpacity key={uid} onPress={() => toggleItemAssignee(it.id, uid)} style={{ padding: 8, backgroundColor: selected ? theme.colors.primary : theme.colors.surface, borderRadius: 8, marginRight: 8 }}>
                              <Text style={{ color: selected ? 'white' : theme.colors.text }}>{u.name || u.email || 'You'}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                      <TouchableOpacity onPress={() => removeItem(it.id)}>
                        <Text style={{ color: '#DC2626' }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity onPress={addItem} style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="add-outline" size={18} color="white" />
                  <Text style={[styles.scanButtonText, { marginLeft: 8 }]}>Add Item</Text>
                </TouchableOpacity>
              </View>
            )}
            
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
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Amount ($)</Text>
              {formData.items && formData.items.length > 0 ? (
                <View style={[styles.totalContainer, { backgroundColor: theme.colors.surface }]}> 
                  <Text style={[styles.totalText, { color: theme.colors.text }]}>${formatToTwoDecimals(formData.amount) || '0.00'}</Text>
                </View>
              ) : (
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
              )}
              {formData.items && formData.items.length > 0 && (
                <Text style={{ color: theme.colors.textSecondary, marginTop: 6 }}>Total calculated from items — edit items to change total.</Text>
              )}
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

      case 3: {
        const amountNum = parseFloat(formData.amount) || 0;

        const items = formData.items || [];

        // compute per-user totals from items when items exist
        const computeTotalsFromItems = () => {
          const map = {}; // userId -> amount
          items.forEach(it => {
            const price = parseFloat(String(it.price).replace(/[^0-9.-]/g, '')) || 0;
            const assignees = it.assignees && it.assignees.length > 0 ? it.assignees : [];
            if (assignees.length === 0) {
              // no assignees -> assign to payer
              const pid = currentUser.id || currentUser._id || 'you';
              map[pid] = (map[pid] || 0) + price;
            } else {
              const share = Math.round((price / assignees.length) * 100) / 100;
              assignees.forEach(a => {
                map[a] = (map[a] || 0) + share;
              });
            }
          });
          return map;
        };

        const itemTotals = computeTotalsFromItems();

        // build participants data with names/emails
        let participantsData = [];
        if (selectedGroup && selectedGroup.members && selectedGroup.members.length > 0) {
          participantsData = selectedGroup.members.map(m => {
            const id = m.user ? (m.user._id || m.user.id) : (m._id || m.id || m);
            const name = m.user ? m.user.name : (m.name || m.email || 'Member');
            const email = m.user?.email || m.email;
            return { id, name, email };
          });
        } else {
          participantsData = (formData.participants || []).map(pid => {
            const friend = friends.find(f => (f._id === pid || f.id === pid || f._id === String(pid) || f.id === String(pid)));
            return { id: pid, name: friend?.name || friend?.email || pid, email: friend?.email };
          });
        }

        // merge item totals into participantsData shares (and compute payer's from items)
        participantsData = participantsData.map(p => ({ ...p, share: Math.round(((itemTotals[p.id] || 0) * 100)) / 100 }));
        const payerId = currentUser.id || currentUser._id || 'you';
        const payerFromItems = Math.round(((itemTotals[payerId] || 0) * 100)) / 100;

        // If no items present, fallback to previous split logic
        let payerShare = payerFromItems;
        if (!items || items.length === 0) {
          // previous behavior
          const totalPeople = participantsData.length + 1;
          if (participantsData.length > 0) {
            if (formData.splitType === 'equal') {
              const per = Number.isFinite(amountNum) && totalPeople > 0 ? (amountNum / totalPeople) : 0;
              const roundedPer = Math.round(per * 100) / 100;
              participantsData = participantsData.map(p => ({ ...p, share: roundedPer }));
              payerShare = roundedPer;
            } else {
              const custom = formData.customAmounts || {};
              participantsData = participantsData.map(p => ({ ...p, share: Math.round((parseFloat(custom[p.id]) || 0) * 100) / 100 }));
              const totalAssigned = participantsData.reduce((s, p) => s + (p.share || 0), 0);
              payerShare = Math.round((amountNum - totalAssigned) * 100) / 100;
            }
          } else {
            payerShare = Math.round(amountNum * 100) / 100;
          }
        }

        const totalAssigned = participantsData.reduce((s, p) => s + (p.share || 0), 0) + (payerShare || 0);
        const exactOverAssigned = formData.splitType === 'exact' && totalAssigned > amountNum;

        return (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: theme.colors.text }]}>Split Details</Text>

            <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Summary</Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.primary }]}>${amountNum.toFixed(2)}</Text>
              <Text style={[styles.summaryDescription, { color: theme.colors.textSecondary }]}>{formData.description}</Text>
              <Text style={[styles.summaryGroup, { color: theme.colors.textSecondary }]}>{selectedGroup?.name ? `${selectedGroup.name} • ${participantsData.length + 1} people` : `${participantsData.length + 1} people (including you)`}</Text>
            </View>

            <View style={{ marginTop: 16 }}>
              {items && items.length > 0 ? (
                <>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Itemized summary</Text>
                  {/* Items list */}
                  {(items || []).map((it) => (
                    <View key={it.id} style={{ backgroundColor: theme.colors.card, padding: 12, borderRadius: 12, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{it.name || 'Item'}</Text>
                        <Text style={{ color: theme.colors.textSecondary }}>${formatToTwoDecimals(it.price) || '0.00'}</Text>
                      </View>
                      <Text style={{ color: theme.colors.textSecondary, marginTop: 6 }}>Qty: {it.quantity || 1} • Assigned to: {(it.assignees || []).map(a => {
                        const found = assignableUsers.find(u => (u._id || u.id) === a);
                        return found ? found.name : (a === (currentUser.id || currentUser._id) ? (currentUser.name || 'You') : a);
                      }).join(', ')}</Text>
                    </View>
                  ))}

                  {/* Per-user totals computed from items */}
                  <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>Per-person totals</Text>
                  <View style={{ marginTop: 8 }}>
                    <View key={payerId} style={[styles.participantRow, { backgroundColor: theme.colors.card, padding: 12, borderRadius: 12, marginBottom: 8 }]}>
                      <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{currentUser.name || 'You'} (you)</Text>
                      <Text style={{ color: theme.colors.textSecondary }}>${formatToTwoDecimals(payerShare) || '0.00'}</Text>
                    </View>

                    {participantsData.length === 0 ? (
                      <Text style={{ color: theme.colors.textSecondary }}>No other participants selected</Text>
                    ) : (
                      participantsData.map(p => (
                        <View key={p.id} style={[styles.participantRow, { backgroundColor: theme.colors.card, padding: 12, borderRadius: 12, marginBottom: 8 }]}>
                          <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{p.name}</Text>
                          <Text style={{ color: theme.colors.textSecondary }}>${formatToTwoDecimals(p.share) || '0.00'}</Text>
                        </View>
                      ))
                    )}
                  </View>

                  <Text style={{ color: theme.colors.textSecondary, marginTop: 6 }}>Totals are derived from the item assignments above.</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Split method</Text>
                  <View style={styles.splitRow}>
                    <TouchableOpacity onPress={() => updateFormData('splitType', 'equal')} style={[styles.splitBtn, formData.splitType === 'equal' ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.splitBtnText, formData.splitType === 'equal' ? { color: 'white' } : { color: theme.colors.text }]}>Equal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => updateFormData('splitType', 'exact')} style={[styles.splitBtn, formData.splitType === 'exact' ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.splitBtnText, formData.splitType === 'exact' ? { color: 'white' } : { color: theme.colors.text }]}>Exact</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.label, { color: theme.colors.textSecondary, marginTop: 16 }]}>Participants & shares</Text>

                  {/* Payer row */}
                  <View key={payerId} style={[styles.participantRow, { backgroundColor: theme.colors.card, padding: 12, borderRadius: 12, marginBottom: 8 }]}>
                    <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{currentUser.name || 'You'} (you)</Text>
                    <Text style={{ color: theme.colors.textSecondary }}>${(payerShare || 0).toFixed(2)}</Text>
                  </View>

                  {participantsData.length === 0 ? (
                    <Text style={{ color: theme.colors.textSecondary }}>No other participants selected</Text>
                  ) : (
                    participantsData.map(p => (
                      <View key={p.id} style={[styles.participantRow, { backgroundColor: theme.colors.card, padding: 12, borderRadius: 12, marginBottom: 8 }]}>
                        <Text style={{ color: theme.colors.text, fontWeight: '600' }}>{p.name}</Text>
                        <Text style={{ color: theme.colors.textSecondary }}>${(p.share || 0).toFixed(2)}</Text>
                      </View>
                    ))
                  )}

                  {formData.splitType === 'exact' && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ color: exactOverAssigned ? '#DC2626' : theme.colors.textSecondary }}>Assigned total to participants + payer: ${totalAssigned.toFixed(2)}. Transaction total: ${amountNum.toFixed(2)}.</Text>
                      {exactOverAssigned && <Text style={{ color: '#DC2626', marginTop: 6 }}>Assigned amounts exceed total bill. Please adjust exact amounts or items.</Text>}
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        );
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
            contentContainerStyle={{ paddingBottom: 120 + keyboardOffset }}
          >
            {renderStep()}
          </ScrollView>

  <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.background, position: 'absolute', left: 0, right: 0, bottom: (keyboardOffset ? Math.min(keyboardOffset + 10, 50) : 0) }]}>
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
              onPress={() => {
                if (loading) return;
                // Prevent moving from selection (step 1) to details (step 2) without selection
                if (currentStep === 1) {
                  if (!formData.groupId && (!formData.participants || formData.participants.length === 0)) {
                    Alert.alert('Select participants', 'Please select a group or at least one friend before entering expense details.');
                    return;
                  }
                }
                // Prevent moving from details (step 2) to summary (step 3) without a description
                if (currentStep === 2) {
                  if (!formData.description || !formData.description.trim()) {
                    Alert.alert('Add description', 'Please enter a description for the expense before continuing.');
                    return;
                  }
                }
                if (currentStep === 3) return handleSubmit();
                setCurrentStep(currentStep + 1);
              }}
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
      </KeyboardAvoidingView>
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

  // Non-editable total display (shouldn't look like an input)
  totalContainer: {
    // visually distinct from inputs: subtle background, no heavy border
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  totalText: {
    fontSize: 16,
    fontWeight: '700'
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
  splitRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  splitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)'
  },
  splitBtnText: {
    fontWeight: '700',
  },
  segmentRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  segmentText: {
    fontWeight: '700',
  },
  groupList: {
    flex: 1,
  },
  friendRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    // elevated above content
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
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
    padding: 12,
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