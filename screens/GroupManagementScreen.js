import React, { useState, useRef } from 'react';
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
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/ApiDataContext';
import { useUser } from '../context/UserContext';

const GroupManagementScreen = ({ visible, onClose, groupId }) => {
  const { theme } = useTheme();
  const { getUserGroups, getUserTransactions, updateGroup, deleteGroup } = useData();
  const { currentUser, users } = useUser();
  
  const allGroups = getUserGroups();
  const group = allGroups.find(g => g && g.id === groupId);
  const allUsers = users;
  const groupTransactions = getUserTransactions().filter(t => t.groupId === groupId);
  
  const [editMode, setEditMode] = useState(false);
  const [groupName, setGroupName] = useState(group?.name || '');
  const [groupDescription, setGroupDescription] = useState(group?.description || '');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showGroupStats, setShowGroupStats] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  // Animation values
  const translateY = useRef(new Animated.Value(0)).current;
  const { height } = Dimensions.get('window');
  
  // Pan responder for smooth drag gestures
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 5 && gestureState.dy > 0;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 0) {
        translateY.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dy > height * 0.25 || gestureState.vy > 1.5) {
        Animated.timing(translateY, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }).start(() => onClose());
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  if (!group) {
    return null;
  }
  
  // Enhanced Settings Modal Component
  const GroupSettingsModal = () => (
    <Modal 
      visible={showSettingsModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSettingsModal(false)}
    >
      <View style={styles.settingsOverlay}>
        <View style={[styles.settingsModal, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.settingsHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.settingsTitle, { color: theme.colors.text }]}>Group Settings</Text>
            <TouchableOpacity 
              onPress={() => setShowSettingsModal(false)}
              style={styles.settingsCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingsContent}>
            <TouchableOpacity 
              style={[styles.settingsOption, { borderBottomColor: theme.colors.border }]}
              onPress={() => {
                setShowSettingsModal(false);
                setEditMode(true);
              }}
            >
              <Ionicons name="pencil" size={20} color={theme.colors.accent} style={styles.settingsIcon} />
              <View style={styles.settingsOptionText}>
                <Text style={[styles.settingsOptionTitle, { color: theme.colors.text }]}>Edit Group Info</Text>
                <Text style={[styles.settingsOptionSubtitle, { color: theme.colors.textSecondary }]}>Change name and description</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingsOption, { borderBottomColor: theme.colors.border }]}
              onPress={() => {
                setShowSettingsModal(false);
                setShowAddMember(true);
              }}
            >
              <Ionicons name="person-add" size={20} color={theme.colors.accent} style={styles.settingsIcon} />
              <View style={styles.settingsOptionText}>
                <Text style={[styles.settingsOptionTitle, { color: theme.colors.text }]}>Add Members</Text>
                <Text style={[styles.settingsOptionSubtitle, { color: theme.colors.textSecondary }]}>Invite new people to group</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingsOption, { borderBottomColor: theme.colors.border }]}
              onPress={() => {
                setShowSettingsModal(false);
                setShowGroupStats(true);
              }}
            >
              <Ionicons name="stats-chart" size={20} color={theme.colors.accent} style={styles.settingsIcon} />
              <View style={styles.settingsOptionText}>
                <Text style={[styles.settingsOptionTitle, { color: theme.colors.text }]}>Group Statistics</Text>
                <Text style={[styles.settingsOptionSubtitle, { color: theme.colors.textSecondary }]}>View spending analytics</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.settingsOption}
              onPress={() => {
                setShowSettingsModal(false);
                handleDeleteGroup();
              }}
            >
              <Ionicons name="trash" size={20} color={theme.colors.error} style={styles.settingsIcon} />
              <View style={styles.settingsOptionText}>
                <Text style={[styles.settingsOptionTitle, { color: theme.colors.error }]}>Delete Group</Text>
                <Text style={[styles.settingsOptionSubtitle, { color: theme.colors.textSecondary }]}>Permanently remove this group</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const handleSaveGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    updateGroup(groupId, {
      name: groupName.trim(),
      description: groupDescription.trim(),
    });
    
    setEditMode(false);
    Alert.alert('Success', 'Group updated successfully');
  };

  const handleDeleteGroup = async () => {
    if (!group || !group.id) {
      Alert.alert('Error', 'Group not found');
      return;
    }

    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroup(group.id);
              onClose();
              Alert.alert('Success', 'Group deleted successfully');
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete group. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRemoveMember = (memberId) => {
    if (memberId === currentUser.id) {
      Alert.alert('Error', 'You cannot remove yourself from the group');
      return;
    }

    const memberTransactions = groupTransactions.filter(t => 
      t.payerId === memberId || t.participants.includes(memberId)
    );

    if (memberTransactions.length > 0) {
      Alert.alert(
        'Cannot Remove Member',
        'This member has transactions in the group. Please settle all expenses first.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the group?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updatedMembers = group.members.filter(id => id !== memberId);
            updateGroup(groupId, { members: updatedMembers });
            Alert.alert('Success', 'Member removed successfully');
          }
        }
      ]
    );
  };

  // Calculate group statistics
  const totalExpenses = groupTransactions.reduce((sum, t) => sum + t.amount, 0);
  const memberBalances = group ? group.members.map(memberObj => {
    // Extract the actual user from the member object
    const member = memberObj.user || memberObj;
    const memberId = member.id || member._id;
    
    const paid = groupTransactions
      .filter(t => t.payerId === memberId)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const owes = groupTransactions
      .filter(t => t.participants.includes(memberId))
      .reduce((sum, t) => sum + (t.amount / t.participants.length), 0);
    
    return {
      member,
      paid,
      owes,
      balance: paid - owes
    };
  }) : [];

  const MemberCard = ({ member, balance, showActions = true }) => {
    if (!member) {
      return null;
    }
    
    const memberId = member.id || member._id;
    const memberName = member.name || 'Unknown';
    const memberEmail = member.email || '';
    
    return (
      <View style={[styles.memberCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.memberInfo}>
          <View style={[styles.memberAvatar, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.memberAvatarText}>
              {memberName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberDetails}>
            <Text style={[styles.memberName, { color: theme.colors.text }]}>
              {memberName}
              {memberId === currentUser?.id && (
                <Text style={[styles.youLabel, { color: theme.colors.textTertiary }]}> (You)</Text>
              )}
            </Text>
            <Text style={[styles.memberEmail, { color: theme.colors.textSecondary }]}>
              {memberEmail}
            </Text>
          <View style={styles.memberBalance}>
            <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
              Balance: 
            </Text>
            <Text style={[
              styles.balanceAmount,
              { 
                color: balance.balance >= 0 ? theme.colors.success : theme.colors.error,
                fontWeight: '600'
              }
            ]}>
              ${Math.abs(balance.balance).toFixed(2)}
            </Text>
            <Text style={[styles.balanceStatus, { color: theme.colors.textTertiary }]}>
              {balance.balance >= 0 ? ' is owed' : ' owes'}
            </Text>
          </View>
        </View>
      </View>
      {showActions && memberId !== currentUser?.id && (
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
          onPress={() => handleRemoveMember(memberId)}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
    );
  };

  const StatCard = ({ title, value, subtitle, color, icon }) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Text style={styles.statIconText}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.statSubtitle, { color: theme.colors.textTertiary }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );

  // Safety check - if no group found, show error message
  if (!group && groupId) {
    return (
      <Modal 
        visible={visible} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <View style={styles.header}>
            <TouchableOpacity onClose={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              Group not found. Please try again.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      <GroupSettingsModal />
      <Modal 
        visible={visible} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <Animated.View 
          style={[
            styles.container, 
            { 
              backgroundColor: theme.colors.background,
              transform: [{ translateY }]
            }
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Drag Indicator */}
            <View style={styles.dragIndicatorContainer} {...panResponder.panHandlers}>
              <View style={[styles.dragIndicator, { backgroundColor: theme.colors.textTertiary }]} />
            </View>
            
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary, opacity: 0.7 }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: theme.colors.text }]}>Manage Group</Text>
              <TouchableOpacity 
                onPress={() => setShowSettingsModal(true)} 
                style={styles.settingsButton}
              >
                <Ionicons name="settings-outline" size={20} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Group Info */}
          <View style={styles.section}>
            {editMode ? (
              <View>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Group Name</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.colors.surface, 
                    color: theme.colors.text, 
                    borderColor: theme.colors.border 
                  }]}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Enter group name"
                  placeholderTextColor={theme.colors.textTertiary}
                />
                
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { 
                    backgroundColor: theme.colors.surface, 
                    color: theme.colors.text, 
                    borderColor: theme.colors.border 
                  }]}
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  placeholder="Enter group description (optional)"
                  placeholderTextColor={theme.colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />
                
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.colors.success }]}
                    onPress={handleSaveGroup}
                  >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={[styles.groupCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <View style={[styles.groupIcon, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.groupIconText}>{group.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.groupDetails}>
                  <Text style={[styles.groupName, { color: theme.colors.text }]}>{group.name}</Text>
                  {group.description && (
                    <Text style={[styles.groupDescription, { color: theme.colors.textSecondary }]}>
                      {group.description}
                    </Text>
                  )}
                  <Text style={[styles.groupMeta, { color: theme.colors.textTertiary }]}>
                    Created {new Date(group.createdAt).toLocaleDateString()} • {group.members.length} members
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Group Statistics */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Group Statistics</Text>
              <TouchableOpacity
                onPress={() => setShowGroupStats(!showGroupStats)}
                style={styles.toggleButton}
              >
                <Text style={[styles.toggleButtonText, { color: theme.colors.accent }]}>
                  {showGroupStats ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {showGroupStats && (
              <View style={styles.statsGrid}>
                <StatCard
                  title="Total Expenses"
                  value={`$${totalExpenses.toFixed(2)}`}
                  subtitle={`${groupTransactions.length} transactions`}
                  color={theme.colors.error}
                  icon="💰"
                />
                <StatCard
                  title="Average per Person"
                  value={`$${(totalExpenses / group.members.length).toFixed(2)}`}
                  subtitle="total spending"
                  color={theme.colors.info}
                  icon="📊"
                />
                <StatCard
                  title="Active Members"
                  value={group.members.length}
                  subtitle="in group"
                  color={theme.colors.success}
                  icon="👥"
                />
                <StatCard
                  title="Recent Activity"
                  value={groupTransactions.filter(t => {
                    const transactionDate = new Date(t.date);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return transactionDate >= weekAgo;
                  }).length}
                  subtitle="this week"
                  color={theme.colors.warning}
                  icon="⚡"
                />
              </View>
            )}
          </View>

          {/* Members */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Members ({group.members.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddMember(true)}
                style={[styles.addMemberButton, { backgroundColor: theme.colors.accent }]}
              >
                <Text style={styles.addMemberButtonText}>Add Member</Text>
              </TouchableOpacity>
            </View>

            {memberBalances.map(({ member, ...balance }) => (
              <MemberCard key={member?.id || member?._id || Math.random()} member={member} balance={balance} />
            ))}
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>Danger Zone</Text>
            <View style={[styles.dangerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.error }]}>
              <Text style={[styles.dangerTitle, { color: theme.colors.text }]}>Delete Group</Text>
              <Text style={[styles.dangerDescription, { color: theme.colors.textSecondary }]}>
                Permanently delete this group and all its data. This action cannot be undone.
              </Text>
              <TouchableOpacity
                style={[styles.dangerButton, { backgroundColor: theme.colors.error }]}
                onPress={handleDeleteGroup}
              >
                <Text style={styles.dangerButtonText}>Delete Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Add Member Notice */}
        {showAddMember && (
          <View style={[styles.addMemberNotice, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary }]}>
            <View style={styles.addMemberNoticeContent}>
              <Text style={[styles.addMemberNoticeTitle, { color: theme.colors.text }]}>Add Member</Text>
              <TouchableOpacity onPress={() => setShowAddMember(false)} style={styles.closeNoticeButton}>
                <Text style={[styles.closeNoticeButtonText, { color: theme.colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.addMemberNoticeDescription, { color: theme.colors.textSecondary }]}>
              💡 This feature is coming soon! Members will be able to join by scanning a QR code or using an invite link.
            </Text>
            <TouchableOpacity
              style={[styles.addMemberNoticeButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowAddMember(false)}
            >
              <Text style={styles.addMemberNoticeButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        )}
          </SafeAreaView>
        </Animated.View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleButton: {
    padding: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  groupCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupIconText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  groupDetails: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  groupMeta: {
    fontSize: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    marginTop: 20,
  },
  saveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statIconText: {
    fontSize: 16,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 10,
  },
  addMemberButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addMemberButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  memberCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  youLabel: {
    fontWeight: '400',
  },
  memberEmail: {
    fontSize: 12,
    marginBottom: 4,
  },
  memberBalance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
  },
  balanceAmount: {
    fontSize: 12,
  },
  balanceStatus: {
    fontSize: 12,
  },
  removeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  dangerCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dangerDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  dangerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  dangerButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  addMemberNotice: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  addMemberNoticeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addMemberNoticeTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeNoticeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeNoticeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addMemberNoticeDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  addMemberNoticeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addMemberNoticeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  // Settings Modal Styles
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  settingsModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    maxHeight: '80%',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingsCloseButton: {
    padding: 4,
  },
  settingsContent: {
    paddingVertical: 8,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  settingsIcon: {
    marginRight: 12,
    width: 20,
  },
  settingsOptionText: {
    flex: 1,
  },
  settingsOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingsOptionSubtitle: {
    fontSize: 13,
  },
  settingsButton: {
    padding: 8,
  },
  safeArea: {
    flex: 1,
  },
});

export default GroupManagementScreen;