import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/ApiDataContext';
import { useUser } from '../context/UserContext';

const GroupManagementScreen = ({ visible, onClose, groupId }) => {
  const { theme } = useTheme();
  const { getUserGroups, getUserTransactions, updateGroup, deleteGroup, loadTransactions, getGroupBalances, addGroupMember } = useData();
  const { currentUser, users } = useUser();
  
  const allGroups = getUserGroups();
  const group = allGroups.find(g => g && g.id === groupId);
  const allUsers = users;
  // local state for up-to-date transactions and balances for this group
  const [groupTransactions, setGroupTransactions] = useState([]);
  const [groupBalances, setGroupBalances] = useState([]);

  // initialize local transactions and balances when modal opens
  useEffect(() => {
    let mounted = true;
    if (groupId) {
      // Load transactions and balances for this group when the modal opens.
      (async () => {
        try {
          const txResp = await loadTransactions(groupId);
          if (mounted && Array.isArray(txResp)) setGroupTransactions(txResp);

          const balances = await getGroupBalances(groupId);
          if (mounted && balances) setGroupBalances(balances || []);
        } catch (err) {
          // ignore - DataContext handles errors
          console.warn('Failed to load group data', err.message || err);
        }
      })();
    }

    return () => { mounted = false; };
  }, [groupId]);
  
  const [editMode, setEditMode] = useState(false);
  const [groupName, setGroupName] = useState(group?.name || '');
  const [groupDescription, setGroupDescription] = useState(group?.description || '');
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  if (!group) {
    return null;
  }

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    try {
      await updateGroup(groupId, {
        name: groupName.trim(),
        description: groupDescription.trim()
      });
      setEditMode(false);
      Alert.alert('Success', 'Group updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update group');
    }
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
          onPress: async () => {
            try {
              await deleteGroup(groupId);
              onClose();
              Alert.alert('Success', 'Group deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete group');
            }
          }
        }
      ]
    );
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    const existingUser = allUsers.find(u => u.email === newMemberEmail.trim());
    if (!existingUser) {
      Alert.alert('Error', 'User not found. They need to create an account first.');
      return;
    }

    // robustly check membership by id (members may be stored as objects or ids)
    const alreadyMember = group.members.some(m => {
      const memberId = m && (m.user?._id || m.user?.id || m._id || m.id || m);
      return String(memberId) === String(existingUser.id || existingUser._id);
    });

    if (alreadyMember) {
      Alert.alert('Error', 'User is already a member of this group');
      return;
    }

    try {
      // Use DataContext.addGroupMember which calls POST /groups/:id/members
      await addGroupMember(groupId, newMemberEmail.trim());
      setNewMemberEmail('');
      setShowAddMember(false);
      Alert.alert('Success', 'Member added successfully');
      // Refresh transactions and balances
      const txResp = await loadTransactions(groupId);
      setGroupTransactions(txResp || []);
      const balances = await getGroupBalances(groupId);
      setGroupBalances(balances || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to add member');
    }
  };

  const getGroupStats = () => {
    const totalExpenses = groupTransactions.reduce((sum, t) => sum + t.amount, 0);
    const memberCount = group.members.length;
    const transactionCount = groupTransactions.length;
    
    return { totalExpenses, memberCount, transactionCount };
  };

  const stats = getGroupStats();

  const MemberItem = ({ memberId }) => {
    const member = allUsers.find(u => u.id === memberId);
    if (!member) return null;

    return (
      <View style={[styles.memberItem, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.memberAvatarText}>
            {member.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: theme.colors.text }]}>
            {member.name}
          </Text>
          <Text style={[styles.memberEmail, { color: theme.colors.textSecondary }]}>
            {member.email}
          </Text>
        </View>
        {member.id === currentUser.id && (
          <View style={[styles.ownerBadge, { backgroundColor: theme.colors.success }]}>
            <Text style={styles.ownerBadgeText}>You</Text>
          </View>
        )}
      </View>
    );
  };

  const StatCard = ({ title, value, subtitle }) => (
    <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.iconText, { color: theme.colors.text }]}>←</Text>
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Group Settings
          </Text>

          <TouchableOpacity 
            onPress={() => setEditMode(!editMode)} 
            style={styles.editButton}
          >
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.iconText}>{editMode ? '✓' : 'E'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.groupInfo, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.groupIcon, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.groupIconText}>G</Text>
            </View>
            
            {editMode ? (
              <View style={styles.editForm}>
                <TextInput
                  style={[styles.editInput, { 
                    backgroundColor: theme.colors.surface, 
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }]}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="Group name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
                <TextInput
                  style={[styles.editInput, styles.descriptionInput, { 
                    backgroundColor: theme.colors.surface, 
                    borderColor: theme.colors.border,
                    color: theme.colors.text 
                  }]}
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  placeholder="Group description (optional)"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.colors.success }]}
                  onPress={handleSaveGroup}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.groupDetails}>
                <Text style={[styles.groupName, { color: theme.colors.text }]}>
                  {group.name}
                </Text>
                {group.description && (
                  <Text style={[styles.groupDescription, { color: theme.colors.textSecondary }]}>
                    {group.description}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Group Statistics
            </Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Expenses"
                value={`$${stats.totalExpenses.toFixed(2)}`}
              />
              <StatCard
                title="Members"
                value={stats.memberCount}
              />
              <StatCard
                title="Transactions"
                value={stats.transactionCount}
              />
            </View>
          </View>

          {/* Recent transactions for this group */}
          <View style={styles.transactionsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Transactions</Text>
            {groupTransactions.length === 0 ? (
              <Text style={[{ color: theme.colors.textSecondary, marginTop: 8 }]}>No transactions yet</Text>
            ) : (
              groupTransactions.slice(0, 6).map(tx => (
                <View key={tx._id || tx.id} style={[styles.transactionRow, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.transactionLeft}>
                    <View style={[styles.memberAvatar, { backgroundColor: theme.colors.primary }]}> 
                      <Text style={styles.memberAvatarText}>{(tx.payer?.name || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.transactionInfo}>
                      <Text style={[styles.memberName, { color: theme.colors.text }]}>{tx.description}</Text>
                      <Text style={[styles.memberEmail, { color: theme.colors.textSecondary }]}>{tx.payer?.name || tx.payer?.email}</Text>
                    </View>
                  </View>
                  <View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>{`$${(tx.amount || 0).toFixed(2)}`}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.membersSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Members ({group.members.length})
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddMember(true)}
                style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.membersList}>
              {group.members.map((member) => {
                const memberId = member && (member.user?._id || member.user?.id || member._id || member.id || member);
                return <MemberItem key={String(memberId)} memberId={memberId} />;
              })}
            </View>
          </View>

          <View style={styles.dangerSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.error }]}>
              Danger Zone
            </Text>
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: theme.colors.error }]}
              onPress={handleDeleteGroup}
            >
              <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>
                Delete Group
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal visible={showAddMember} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.addMemberModal, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Add New Member
              </Text>
              <TextInput
                style={[styles.emailInput, { 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border,
                  color: theme.colors.text 
                }]}
                placeholder="Enter email address"
                placeholderTextColor={theme.colors.textSecondary}
                value={newMemberEmail}
                onChangeText={setNewMemberEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.surface }]}
                  onPress={() => {
                    setShowAddMember(false);
                    setNewMemberEmail('');
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleAddMember}
                >
                  <Text style={styles.modalButtonText}>Add Member</Text>
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
  editButton: {
    width: 40,
    alignItems: 'flex-end',
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
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 200,
  },
  groupInfo: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  groupIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  groupIconText: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
  },
  groupDetails: {
    alignItems: 'center',
  },
  groupName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  groupDescription: {
    fontSize: 16,
    textAlign: 'center',
  },
  editForm: {
    width: '100%',
  },
  editInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  membersSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
  },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ownerBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  dangerSection: {
    marginBottom: 40,
  },
  deleteButton: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addMemberModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  emailInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});

export default GroupManagementScreen;