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
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';

const GroupManagementScreen = ({ visible, onClose, groupId }) => {
  const { theme } = useTheme();
  const { getUserGroups, getUserTransactions, updateGroup, deleteGroup } = useData();
  const { currentUser, users } = useUser();
  
  const group = getUserGroups().find(g => g.id === groupId);
  const allUsers = users;
  const groupTransactions = getUserTransactions().filter(t => t.groupId === groupId);
  
  const [editMode, setEditMode] = useState(false);
  const [groupName, setGroupName] = useState(group?.name || '');
  const [groupDescription, setGroupDescription] = useState(group?.description || '');
  const [showAddMember, setShowAddMember] = useState(false);
  const [showGroupStats, setShowGroupStats] = useState(false);

  if (!group) {
    return null;
  }

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

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            deleteGroup(groupId);
            onClose();
            Alert.alert('Success', 'Group deleted successfully');
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
  const memberBalances = group.members.map(memberId => {
    const member = allUsers.find(u => u.id === memberId);
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
  });

  const MemberCard = ({ member, balance, showActions = true }) => (
    <View style={[styles.memberCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={styles.memberInfo}>
        <View style={[styles.memberAvatar, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.memberAvatarText}>
            {member.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={[styles.memberName, { color: theme.colors.text }]}>
            {member.name}
            {member.id === currentUser.id && (
              <Text style={[styles.youLabel, { color: theme.colors.textTertiary }]}> (You)</Text>
            )}
          </Text>
          <Text style={[styles.memberEmail, { color: theme.colors.textSecondary }]}>
            {member.email}
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
      {showActions && member.id !== currentUser.id && (
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: theme.colors.error }]}
          onPress={() => handleRemoveMember(member.id)}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>Close</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Manage Group</Text>
          <TouchableOpacity 
            onPress={() => setEditMode(!editMode)} 
            style={styles.editButton}
          >
            <Text style={[styles.editButtonText, { color: theme.colors.accent }]}>
              {editMode ? 'Cancel' : 'Edit'}
            </Text>
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
              <MemberCard key={member.id} member={member} balance={balance} />
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

        {/* Add Member Modal */}
        <Modal visible={showAddMember} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Add Member</Text>
              <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
                This feature is coming soon! Members can be added by sharing an invite link.
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.accent }]}
                onPress={() => setShowAddMember(false)}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </TouchableOpacity>
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
    minWidth: 280,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default GroupManagementScreen;