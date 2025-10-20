import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { FONT_FAMILY, FONT_FAMILY_BOLD } from '../styles/AppStyles';
import apiService from '../services/apiService';

import { useData } from '../context/ApiDataContext';
import { useUser } from '../context/UserContext'; // check authentication state

function FriendsScreen({ theme, currentUser, userFriends = [], userGroups = [] }) {
  const { deleteGroup: deleteGroupAPI } = useData();
  const [activeTab, setActiveTab] = useState('friends');
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedFriends, setSelectedFriends] = useState([]);

  const [friends, setFriends] = useState(userFriends || []);
  const [selectedFriendForDetails, setSelectedFriendForDetails] = useState(null);
  const [showFriendDetails, setShowFriendDetails] = useState(false);

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
        setFriendEmail('');
        setShowAddFriend(false);
      } else {
        alert('Friend added, but could not fetch updated friends list.');
        setFriendEmail(''); // Clear even if friends list couldn't be fetched
        setShowAddFriend(false);
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
const handleRemoveSelectedFriend = async (friend) => {
  try {
    const res = await apiService.removeFriend(friend.id); // send the correct id
    if (res.success) {
      setFriends(res.friends || []);
      Alert.alert('Removed', 'Friend removed successfully');
      setShowFriendDetails(false);
      setSelectedFriendForDetails(null);
    } else {
      Alert.alert('Error', res.message || 'Failed to remove friend');
    }
  } catch (err) {
    Alert.alert('Error', err.message || 'Server error');
  }
};


  const { isAuthenticated } = useUser();

  React.useEffect(() => {
    const fetchFriends = async () => {
      try {
        const result = await apiService.getFriends();
        if (result && result.success && Array.isArray(result.friends)) {
          setFriends(result.friends);
        }
      } catch (err) {
        console.error('Error fetching friends:', err);
      }
    };

    const fetchRequests = async () => {
      try {
        const res = await apiService.listFriendRequests();
        if (res && typeof res === 'object') {
          setRequests({ incoming: res.incoming || [], outgoing: res.outgoing || [] });
        }
      } catch (err) {
        console.error('Error fetching requests:', err);
      }
    };

    // Only fetch protected data when user is authenticated and an auth token exists
    if (isAuthenticated && apiService.token) {
      fetchFriends();
      fetchRequests();
    } else {
      console.warn('FriendsScreen: user not authenticated or missing token; skipping friends/requests fetch');
    }
  }, [isAuthenticated]); // re-run when auth state changes

  const { createGroup: createGroupAPI } = useData();

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    // Prepare payload: backend accepts optional memberEmails
    const memberEmails = selectedFriends.length > 0
      ? friends
          .filter(f => selectedFriends.includes(f.id) || selectedFriends.includes(f._id))
          .map(f => f.email)
      : [];

    try {
      const payload = { name: groupName };
      if (memberEmails.length > 0) payload.memberEmails = memberEmails;

      const newGroup = await createGroupAPI(payload);
      if (newGroup) {
        setGroupName('');
        setSelectedFriends([]);
        setShowCreateGroup(false);
        Alert.alert('Success', 'Group created successfully!');
      } else {
        Alert.alert('Error', 'Failed to create group');
      }
    } catch (err) {
      console.error('Create group error:', err);
      Alert.alert('Error', err.message || 'Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    // Perform delete immediately without a confirmation alert
    try {
      await deleteGroupAPI(groupId);
      setGroups(prev => prev.filter(group => group.id !== groupId));
      // no user-facing Alert per request
    } catch (error) {
      console.error('Error deleting group:', error);
      // keep silent for now; could show a toast/snackbar later
    }
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
      <View style={styles.cardWrapper}>
        {/* behind-card shadow so parent clipping won't hide it */}
        <View style={[styles.cardShadow, { shadowColor: '#673e9dff' }]} pointerEvents="none" />
        <TouchableOpacity 
          style={[styles.friendItem, { backgroundColor: theme.colors.card }]}
          onPress={showCreateGroup ? () => toggleFriendSelection(item.id) : () => { setSelectedFriendForDetails(item); setShowFriendDetails(true); }}
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
            
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Friend details modal handlers

  const handleAccept = async (requestId) => {
    try {
      await apiService.acceptFriendRequest(requestId);
      // refresh requests and friends
      const r = await apiService.listFriendRequests();
      setRequests({ incoming: r.incoming || [], outgoing: r.outgoing || [] });
      const f = await apiService.getFriends();
      if (f && f.friends) setFriends(f.friends);
    } catch (err) {
      console.error('Accept error:', err);
      Alert.alert('Error', 'Unable to accept request');
    }
  };

  const handleDecline = async (requestId) => {
    try {
      await apiService.declineFriendRequest(requestId);
      const r = await apiService.listFriendRequests();
      setRequests({ incoming: r.incoming || [], outgoing: r.outgoing || [] });
    } catch (err) {
      console.error('Decline error:', err);
      Alert.alert('Error', 'Unable to decline request');
    }
  };

  const renderGroupItem = ({ item }) => {
    if (!item) return null;
    
    return (
      <View style={styles.cardWrapper}>
        <View style={[styles.cardShadow, { shadowColor: '#673e9dff' }]} pointerEvents="none" />
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
                  <Text style={styles.addButtonText}>Add Friend</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/*friends list*/}
          {friends.length > 0 ? (
            <FlatList
              data={friends}
              renderItem={renderFriendItem}
              keyExtractor={(item, index) => item._id || item.id || `friend-${index}`}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              removeClippedSubviews={false}
              nestedScrollEnabled={true}
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
      if (activeTab === 'requests') {
        return (
          <View style={styles.tabContent}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text }]}>Incoming Requests</Text>
            {requests.incoming.length > 0 ? (
              <FlatList
                data={requests.incoming}
                keyExtractor={(item, index) => item.id || item._id || `inc-${index}`}
                renderItem={({ item }) => (
                  <View style={[styles.requestItem, { backgroundColor: theme.colors.card }]}> 
                    <View style={styles.requestInfo}>
                      <Text style={{ color: theme.colors.text }}>{item.from?.name || item.from?.email || 'Unknown'}</Text>
                      <Text style={{ color: theme.colors.textSecondary }}>{item.message || ''}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: theme.colors.success }]} onPress={() => handleAccept(item.id || item._id)}>
                        <Text style={styles.actionText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.declineBtn, { backgroundColor: theme.colors.error }]} onPress={() => handleDecline(item.id || item._id)}>
                        <Text style={styles.actionText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            ) : (
              <Text style={{ color: theme.colors.textSecondary }}>No incoming requests</Text>
            )}

            <Text style={[styles.sectionLabel, { color: theme.colors.text, marginTop: 16 }]}>Outgoing Requests</Text>
            {requests.outgoing.length > 0 ? (
              <FlatList
                data={requests.outgoing}
                keyExtractor={(item, index) => item.id || item._id || `out-${index}`}
                renderItem={({ item }) => (
                  <View style={[styles.requestItem, { backgroundColor: theme.colors.card }]}> 
                    <View style={styles.requestInfo}>
                      <Text style={{ color: theme.colors.text }}>{item.to?.name || item.to?.email || 'Unknown'}</Text>
                      <Text style={{ color: theme.colors.textSecondary }}>{item.message || ''}</Text>
                    </View>
                    <View style={styles.requestActions}>
                      <Text style={{ color: theme.colors.textSecondary }}>Pending</Text>
                    </View>
                  </View>
                )}
              />
            ) : (
              <Text style={{ color: theme.colors.textSecondary }}>No outgoing requests</Text>
            )}
          </View>
        );
      }
      
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
                keyExtractor={(item, index) => item._id || item.id || `friend-${index}`}
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
                keyExtractor={(item, index) => item._id || item.id || `group-${index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                removeClippedSubviews={false}
                nestedScrollEnabled={true}
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
              // Allow creating a group even if the user has no friends yet.
              setShowCreateGroup(true);
            }
          }}
        >
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/*tab navigation*/}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.card }]}>
        {/* Friends Tab */}
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

        {/* Groups Tab */}
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

      {/* Friend details modal */}
      {selectedFriendForDetails && (
        <Modal
          visible={showFriendDetails}
          animationType="fade"
          transparent={true}
          onRequestClose={() => { setShowFriendDetails(false); setSelectedFriendForDetails(null); }}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => { setShowFriendDetails(false); setSelectedFriendForDetails(null); }}>
            <SafeAreaView style={[styles.modalContainer, { justifyContent: 'center', alignItems: 'center' }]}> 
              <TouchableOpacity activeOpacity={1} style={[styles.friendDetailsModal, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedFriendForDetails.name || 'Friend'}</Text>
                <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>{selectedFriendForDetails.email}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.colors.textSecondary, marginRight: 8 }]} onPress={() => { setShowFriendDetails(false); setSelectedFriendForDetails(null); }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.error }]} onPress={() => handleRemoveSelectedFriend(selectedFriendForDetails)}>
                    <Text style={styles.addButtonText}>Remove Friend</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </SafeAreaView>
          </TouchableOpacity>
        </Modal>
      )}
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
    elevation: 6,
  },
  cardWrapper: {
    marginBottom: 12,
    // keep overflow visible so shadows show
    overflow: 'visible',
    zIndex: 5,
  },
  cardShadow: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 6,
    bottom: -6,
    borderRadius: 14,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
  removeFriendButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
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
    elevation: 6,
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
  requestItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.15)'
  },
  requestInfo: {
    flex: 1,
    paddingRight: 8
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  acceptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  declineBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  actionText: {
    color: 'white',
    fontWeight: '600'
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  friendDetailsModal: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
    // ensure the modal content doesn't push to top
    alignItems: 'flex-start'
  },
  modalContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
});

export default FriendsScreen;