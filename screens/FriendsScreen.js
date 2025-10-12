import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { FONT_FAMILY, FONT_FAMILY_BOLD } from '../styles/AppStyles';
import apiService from '../services/apiService';

import { useData } from '../context/ApiDataContext';
// import { useUser } from '../context/UserContext'; //for future friends management

function FriendsScreen({ theme, currentUser, userFriends = [], userGroups = [] }) {
  const { deleteGroup: deleteGroupAPI } = useData();
  const [activeTab, setActiveTab] = useState('friends');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);

  const [friends, setFriends] = useState(userFriends || []);

  const [groups, setGroups] = useState([]);
  
  React.useEffect(() => {
    const sanitizedGroups = (userGroups || []).map(group => ({
      ...group,
      totalOwed: group.totalOwed || 0,
      memberCount: group.memberCount || group.members?.length || 0,
      lastActivity: group.lastActivity || 'No activity',
      members: group.members || []
    }));
    setGroups(sanitizedGroups);
  }, [userGroups]);

  const handleAddFriend = async () => {
  if (!friendEmail.trim()) {
    alert('Please enter a valid email.');
    return;
  }

  try {
    const result = await apiService.addFriend(friendEmail); // goes to apiService.js, addFriend method

    if (result.success) {
      // Check if the friends array exists and has changed
      if (result.user && Array.isArray(result.user.friends)) {
        setFriends(result.user.friends); // update UI
        alert(`${friendEmail} has been added to your friends list!`);
      } else {
        alert('Friend added, but could not fetch updated friends list.');
      }
    } else {
      // Show backend-provided error or fallback
      alert(result.message || result.error || 'Failed to add friend.');
    }
  } catch (err) {
    console.error('Add friend error:', err);
    alert('An unexpected error occurred. Please try again.');
  }
};

React.useEffect(() => {
  const fetchFriends = async () => {
    try {
      const result = await apiService.getFriends(); // make sure you have this API method
      if (result.success && Array.isArray(result.friends)) {
        setFriends(result.friends);
      }
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  };

  fetchFriends();
}, []); // empty dependency array = run once on mount

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    if (selectedFriends.length === 0) {
      Alert.alert('Error', 'Please select at least one friend for the group');
      return;
    }
    
    //group creation API integrated via useData context
    //const result = await createGroup(groupName, selectedFriends);
    
    setGroupName('');
    setSelectedFriends([]);
    setShowCreateGroup(false);
    Alert.alert('Success', 'Group created successfully!');
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${groupName}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGroupAPI(groupId);
              
              setGroups(groups.filter(group => group.id !== groupId));
              Alert.alert('Success', 'Group deleted successfully!');
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Failed to delete group. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleFriendSelection = (friendId) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const renderFriendItem = ({ item }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity 
        style={[styles.friendItem, { backgroundColor: theme.colors.card }]}
        onPress={showCreateGroup ? () => toggleFriendSelection(item.id) : undefined}
      >
      <View style={styles.friendInfo}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.avatarText}>{item.avatar || item.name?.[0] || 'U'}</Text>
        </View>
        <View style={styles.friendDetails}>
          <Text style={[styles.friendName, { color: theme.colors.text }]}>{item.name || 'Unknown User'}</Text>
          <Text style={[styles.friendEmail, { color: theme.colors.textSecondary }]}>{item.email || 'No email'}</Text>
        </View>
      </View>
      <View style={styles.friendActions}>
        {showCreateGroup && (
          <View style={[
            styles.checkbox, 
            { 
              backgroundColor: selectedFriends.includes(item.id) 
                ? theme.colors.primary 
                : 'transparent',
              borderColor: theme.colors.primary 
            }
          ]}>
            {selectedFriends.includes(item.id) && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </View>
        )}
        <View style={[
          styles.statusDot, 
          { backgroundColor: (item.status === 'online') ? theme.colors.success : theme.colors.textSecondary }
        ]} />
      </View>
    </TouchableOpacity>
    );
  };

  const renderGroupItem = ({ item }) => {
    if (!item) return null;
    
    return (
      <View style={[styles.groupItem, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity 
          style={styles.groupContent}
          onLongPress={() => handleDeleteGroup(item.id, item.name)}
        >
          <View style={styles.groupHeader}>
            <View style={[styles.groupIcon, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.groupIconText}>👥</Text>
            </View>
            <View style={styles.groupDetails}>
              <Text style={[styles.groupName, { color: theme.colors.text }]}>{item.name || 'Untitled Group'}</Text>
              <Text style={[styles.groupMembers, { color: theme.colors.textSecondary }]}>
                {item.memberCount || 0} members • {item.lastActivity || 'No activity'}
              </Text>
            </View>
            <View style={styles.groupAmount}>
              <Text style={[styles.amountText, { color: theme.colors.primary }]}>
                ${(item.totalOwed || 0).toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={styles.membersList}>
            <Text style={[styles.membersText, { color: theme.colors.textSecondary }]}>
              {(item.members && item.members.length > 0) ? item.members.join(', ') : 'No members'}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/*delete button*/}
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
          onPress={() => handleDeleteGroup(item.id, item.name)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'friends') {
      return (
        <View style={styles.tabContent}>
          {/*add friend section*/}
          {showAddFriend && (
            <View style={[styles.addSection, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.addTitle, { color: theme.colors.text }]}>Add Friend</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                placeholder="Enter friend's email"
                placeholderTextColor={theme.colors.textSecondary}
                value={friendEmail}
                onChangeText={setFriendEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.addActions}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { borderColor: theme.colors.textSecondary }]}
                  onPress={() => setShowAddFriend(false)}
                >
                  <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleAddFriend}
                >
                  <Text style={styles.addButtonText}>Send Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/*friends list*/}
          {friends.length > 0 ? (
            <FlatList
              data={friends}
              renderItem={renderFriendItem}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No friends yet. Add friends to start splitting expenses!
              </Text>
            </View>
          )}
        </View>
      );
    } else {
      return (
        <View style={styles.tabContent}>
          {/*create group section*/}
          {showCreateGroup && (
            <View style={[styles.addSection, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.addTitle, { color: theme.colors.text }]}>Create Group</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }]}
                placeholder="Group name"
                placeholderTextColor={theme.colors.textSecondary}
                value={groupName}
                onChangeText={setGroupName}
              />
              <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Select Friends:</Text>
              <FlatList
                data={friends}
                renderItem={renderFriendItem}
                keyExtractor={(item) => item.id}
                style={styles.friendSelection}
                showsVerticalScrollIndicator={false}
              />
              <View style={styles.addActions}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { borderColor: theme.colors.textSecondary }]}
                  onPress={() => setShowCreateGroup(false)}
                >
                  <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleCreateGroup}
                >
                  <Text style={styles.addButtonText}>Create Group</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/*groups list*/}
          {groups.length > 0 ? (
            <>
              <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                Long press or tap the 🗑️ button to delete a group
              </Text>
              <FlatList
                data={groups}
                renderItem={renderGroupItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
              />
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                {friends.length > 0 
                  ? 'No groups yet. Create a group with your friends!'
                  : 'Add friends first to create groups.'
                }
              </Text>
            </View>
          )}
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['left', 'right', 'bottom']}>
      {/*header*/}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Friends & Groups</Text>
        <TouchableOpacity
          style={[styles.addIconButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            if (activeTab === 'friends') {
              setShowAddFriend(true);
            } else {
              if (friends.length === 0) {
                Alert.alert('No Friends', 'Add friends first to create a group');
                return;
              }
              setShowCreateGroup(true);
            }
          }}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/*tab navigation*/}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'friends' && { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'friends' ? 'white' : theme.colors.textSecondary }
          ]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'groups' && { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => setActiveTab('groups')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'groups' ? 'white' : theme.colors.textSecondary }
          ]}>
            Groups ({groups.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/*tab content*/}
      {renderTabContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 25,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: FONT_FAMILY_BOLD,
  },
  addIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: 'white',
    fontFamily: FONT_FAMILY,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 25,
    borderRadius: 25,
    padding: 5,
    marginBottom: 15,
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT_FAMILY,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 25,
  },
  addSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  addTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    fontFamily: FONT_FAMILY_BOLD,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: FONT_FAMILY,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    fontFamily: FONT_FAMILY,
  },
  friendSelection: {
    maxHeight: 200,
    marginBottom: 15,
  },
  addActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  addButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontFamily: FONT_FAMILY,
  },
  listContent: {
    paddingBottom: 100,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    fontFamily: FONT_FAMILY_BOLD,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: FONT_FAMILY,
  },
  friendEmail: {
    fontSize: 14,
    fontFamily: FONT_FAMILY,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  groupItem: {
    position: 'relative',
    paddingRight: 56,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupIconText: {
    fontSize: 20,
  },
  groupDetails: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: FONT_FAMILY,
  },
  groupMembers: {
    fontSize: 14,
    fontFamily: FONT_FAMILY,
  },
  groupAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_BOLD,
  },
  membersList: {
    paddingLeft: 60,
  },
  membersText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  groupContent: {
    flex: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteButtonText: {
    fontSize: 14,
    color: 'white',
  },
});

export default FriendsScreen;