import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Modal,
  Linking,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import AppStyles, { FONT_FAMILY, FONT_FAMILY_BOLD } from '../styles/AppStyles';
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
  const [friendBalance, setFriendBalance] = useState(null);
  const [friendBalances, setFriendBalances] = useState({}); // store balances for all friends

  // payment modal & options
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState([]);
  const [isLoadingPaymentOptions, setIsLoadingPaymentOptions] = useState(false);
  const [paymentTargetUser, setPaymentTargetUser] = useState(null);

  const [groups, setGroups] = useState([]);
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [groupBalance, setGroupBalance] = useState(null);
  
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
      setFriendBalance(null);
    } else {
      Alert.alert('Error', res.message || 'Failed to remove friend');
    }
  } catch (err) {
    Alert.alert('Error', err.message || 'Server error');
  }
};

const fetchFriendBalance = async (friendId) => {
  try {
    const result = await apiService.getFriendBalance(friendId);
    if (result && result.success) {
      setFriendBalance(result);
    }
  } catch (err) {
    console.error('Error fetching friend balance:', err);
    setFriendBalance(null);
  }
};

const fetchAllFriendBalances = async () => {
  try {
    const balances = {};
    for (const friend of friends) {
      const result = await apiService.getFriendBalance(friend.id);
      if (result && result.success) {
        balances[friend.id] = result.balance;
      }
    }
    setFriendBalances(balances);
  } catch (err) {
    console.error('Error fetching friend balances:', err);
  }
};

const handleSettleFriendBalance = async () => {
  if (!selectedFriendForDetails || !friendBalance) return;
  
  try {
    // Open payment method selector so user can choose how they want to pay
    setPaymentTargetUser(selectedFriendForDetails);
    await loadPaymentOptions(selectedFriendForDetails.id);
    setShowPaymentModal(true);
  } catch (err) {
    console.error('Error settling friend balance:', err);
    Alert.alert('Error', 'Failed to settle balance');
  }
};

const fetchGroupBalance = async (groupId) => {
  try {
    const result = await apiService.getGroupBalances(groupId);
    if (result && result.success) {
      setGroupBalance(result);
    }
  } catch (err) {
    console.error('Error fetching group balance:', err);
    setGroupBalance(null);
  }
};

const handleSettleGroupBalance = async () => {
  if (!selectedGroupForDetails || !groupBalance) return;
  
  try {
    // For groups, show same modal but target is the group owner or group itself.
    // For now, pick the group's creator as the settlement target if available.
    const target = selectedGroupForDetails.createdBy || (selectedGroupForDetails.members && selectedGroupForDetails.members[0]);
    if (!target) {
      Alert.alert('Error', 'No valid payment recipient configured for this group');
      return;
    }
    setPaymentTargetUser({ id: target });
    await loadPaymentOptions(target);
    setShowPaymentModal(true);
  } catch (err) {
    console.error('Error settling group balance:', err);
    Alert.alert('Error', 'Failed to settle balance');
  }
};

// load and intersect payment options between current user and target user
const loadPaymentOptions = async (targetUserId) => {
  setIsLoadingPaymentOptions(true);
  try {
    const myMethodsResp = await apiService.getPaymentMethods();
    const friendMethodsResp = await apiService.getFriendPaymentMethods(targetUserId);

    const myMethods = (myMethodsResp && myMethodsResp.data && myMethodsResp.data.paymentMethods) ? myMethodsResp.data.paymentMethods : myMethodsResp.paymentMethods || myMethodsResp || [];
    const friendMethods = (friendMethodsResp && friendMethodsResp.data && friendMethodsResp.data.paymentMethods) ? friendMethodsResp.data.paymentMethods : friendMethodsResp.paymentMethods || friendMethodsResp || [];

  // only show payment methods that the other user has configured (target)
  // we will present friendMethods as options to pay to (since you pay to their handle)
    if (!friendMethods || friendMethods.length === 0) {
      Alert.alert('No payment methods', 'This user has not added any payment methods.');
      setPaymentOptions([]);
      return;
    }

    const validMethods = friendMethods.map(m => ({ id: m.id || m._id, type: m.type, handle: m.handle }));
    setPaymentOptions(validMethods);
  } catch (err) {
    console.error('Error loading payment options:', err);
    setPaymentOptions([]);
  } finally {
    setIsLoadingPaymentOptions(false);
  }
};

  // deep link map for common payment apps
const paymentDeepLink = (method, handle) => {
  switch (method) {
    case 'Venmo':
      return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(handle)}`;
    case 'CashApp':
      // Cash App supports cashtag deep links via cashapp://$cashtag
      return `cashapp://$${encodeURIComponent(handle)}`;
    case 'PayPal':
      return `paypal://send?recipient=${encodeURIComponent(handle)}`;
    case 'Zelle':
  // zelle deep links vary by bank; fallback to mailto for email or tel for phone
      if (handle.includes('@')) return `mailto:${handle}`;
      return `tel:${handle}`;
    default:
      return null;
  }
};

const openPaymentApp = async (method) => {
  try {
    const url = paymentDeepLink(method.type, method.handle);
    if (url) {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
      // fallback: copy handle to clipboard and show instructions
        Alert.alert('Open Payment App', `Could not open ${method.type} app. Please use handle: ${method.handle}`);
      }
  // mark transaction/participant as paid on backend (best-effort)
      if (selectedFriendForDetails && friendBalance) {
        try {
          // find a transaction to mark as paid: in friend flows we don't have a single tx id; the app marks using settle endpoint on relevant tx ids.
          // for simplicity we'll call the backend settle endpoint with paymentMethodId so it records the attempt against the last transaction if applicable.
          // note: this is a best-effort placeholder; ideally we'd pass a specific transaction id and amount.
          await apiService.markTransactionPaid(selectedFriendForDetails.id, null, true, method.id);
        } catch (err) {
          console.warn('Failed to mark backend paid:', err.message || err);
        }
      }
    } else {
      Alert.alert('Unsupported', `No deep link available for ${method.type}. Use handle: ${method.handle}`);
    }
  } catch (err) {
    console.error('Error opening payment app:', err);
    Alert.alert('Error', 'Failed to open payment app');
  } finally {
    setShowPaymentModal(false);
  }
};


  const { isAuthenticated } = useUser();

  React.useEffect(() => {
    const fetchFriends = async () => {
      try {
        const result = await apiService.getFriends();
        if (result && result.success && Array.isArray(result.friends)) {
          setFriends(result.friends);
          // fetch balances for all friends
          const balances = {};
          for (const friend of result.friends) {
            try {
              const balanceResult = await apiService.getFriendBalance(friend.id);
              if (balanceResult && balanceResult.success) {
                balances[friend.id] = balanceResult.balance;
              }
            } catch (err) {
              console.error(`Error fetching balance for friend ${friend.id}:`, err);
            }
          }
          setFriendBalances(balances);
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

  // only fetch protected data when user is authenticated and an auth token exists
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

      // prepare payload: backend accepts optional memberEmails
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

  const handleLeaveGroup = async (groupId, groupName) => {
    // leave group
    try {
      const result = await apiService.leaveGroup(groupId);
      if (result && result.success) {
        setGroups(prev => prev.filter(group => group.id !== groupId));
        // close modal if it's open
        if (selectedGroupForDetails && selectedGroupForDetails.id === groupId) {
          setShowGroupDetails(false);
          setSelectedGroupForDetails(null);
          setGroupBalance(null);
        }
        Alert.alert('Success', 'You have left the group');
      } else {
        Alert.alert('Error', result.message || 'Failed to leave group');
      }
    } catch (error) {
      console.error('Error leaving group:', error);
      Alert.alert('Error', 'Failed to leave group');
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    // Perform delete immediately without a confirmation alert
    try {
      await deleteGroupAPI(groupId);
      setGroups(prev => prev.filter(group => group.id !== groupId));
      // Close modal if it's open
      if (selectedGroupForDetails && selectedGroupForDetails.id === groupId) {
        setShowGroupDetails(false);
        setSelectedGroupForDetails(null);
        setGroupBalance(null);
      }
  // no user-facing alert per request
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

    const balance = friendBalances[item.id] || 0;
    const balanceColor = balance > 0 ? '#4CAF50' : balance < 0 ? '#f44336' : theme.colors.textSecondary;

    return (
      <View style={styles.cardWrapper}>
        {/* behind-card shadow so parent clipping won't hide it */}
        <View style={[styles.cardShadow, { shadowColor: '#673e9dff' }]} pointerEvents="none" />
        <TouchableOpacity 
          style={[styles.friendItem, { backgroundColor: theme.colors.card }]}
          onPress={showCreateGroup ? () => toggleFriendSelection(item.id) : () => { 
            setSelectedFriendForDetails(item); 
            setShowFriendDetails(true); 
            fetchFriendBalance(item.id);
          }}
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
            {showCreateGroup ? (
              <View style={[
                styles.checkbox,
                {
                  backgroundColor: selectedFriends.includes(item.id) ? theme.colors.primary : 'transparent',
                  borderColor: theme.colors.primary,
                }
              ]}>
                {selectedFriends.includes(item.id) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            ) : (
              <View style={styles.balanceContainer}>
                <Text style={[styles.balanceAmount, { color: balanceColor }]}>
                  ${Math.abs(balance).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // friend details modal handlers

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
    
    const balance = item.totalOwed || 0;
    const balanceColor = balance > 0 ? '#4CAF50' : balance < 0 ? '#f44336' : theme.colors.textSecondary;
    
    return (
      <View style={styles.cardWrapper}>
        <View style={[styles.cardShadow, { shadowColor: '#673e9dff' }]} pointerEvents="none" />
        <TouchableOpacity 
          style={[styles.friendItem, { backgroundColor: theme.colors.card }]}
          onPress={() => {
            setSelectedGroupForDetails(item);
            setShowGroupDetails(true);
            fetchGroupBalance(item.id);
          }}
        >
          <View style={styles.friendInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>👥</Text>
            </View>
            <View style={styles.friendDetails}>
              <Text style={[styles.friendName, { color: theme.colors.text }]}>{item.name || 'Untitled Group'}</Text>
              <Text style={[styles.friendEmail, { color: theme.colors.textSecondary }]}>
                {item.memberCount || 0} members
              </Text>
            </View>
          </View>

          <View style={styles.friendActions}>
            <View style={styles.balanceContainer}>
              <Text style={[styles.balanceAmount, { color: balanceColor }]}>
                ${Math.abs(balance).toFixed(2)}
              </Text>
            </View>
          </View>
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
            <View style={AppStyles.empty}>
              <Text style={[AppStyles.emptyText, { color: theme.colors.textSecondary }]}>No friends yet. Add friends to start splitting expenses!</Text>
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
        {/* friends Tab */}
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

        {/* groups Tab */}
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

      {/* friend details modal */}
      {selectedFriendForDetails && (
        <Modal
          visible={showFriendDetails}
          animationType="fade"
          transparent={true}
          onRequestClose={() => { setShowFriendDetails(false); setSelectedFriendForDetails(null); }}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => { setShowFriendDetails(false); setSelectedFriendForDetails(null); }}>
            <SafeAreaView style={[styles.modalContainer, { justifyContent: 'center', alignItems: 'stretch' }]}> 
              <TouchableOpacity activeOpacity={1} style={[styles.friendDetailsModal, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedFriendForDetails.name || 'Friend'}</Text>
                <Text style={{ color: theme.colors.textSecondary, marginBottom: 12 }}>{selectedFriendForDetails.email}</Text>
                
                {/* balance Information */}
                {friendBalance && (
                  <View style={{ marginBottom: 20, padding: 15, backgroundColor: theme.colors.background, borderRadius: 8, width: '100%' }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 8 }}>Running Balance</Text>
                    <Text style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold', 
                      color: friendBalance.balance >= 0 ? '#4CAF50' : '#f44336',
                      marginBottom: 8
                    }}>
                      ${Math.abs(friendBalance.balance).toFixed(2)}
                    </Text>
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginBottom: 4 }}>
                        You paid: ${friendBalance.totalPaid.toFixed(2)}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        You owe: ${friendBalance.totalOwed.toFixed(2)}
                      </Text>
                    </View>
                    {friendBalance.balance !== 0 && (
                      <TouchableOpacity 
                        style={[styles.settleButton, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
                        onPress={handleSettleFriendBalance}
                      >
                        <Text style={{ color: 'white', fontWeight: '600' }}>Settle Balance</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                {!friendBalance && (
                  <View style={{ marginBottom: 20, padding: 15, backgroundColor: theme.colors.background, borderRadius: 8 }}>
                    <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>Loading balance...</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.colors.textSecondary, marginRight: 8 }]} onPress={() => { setShowFriendDetails(false); setSelectedFriendForDetails(null); setFriendBalance(null); }}>
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

      {/* group details modal */}
      {selectedGroupForDetails && (
        <Modal
          visible={showGroupDetails}
          animationType="fade"
          transparent={true}
          onRequestClose={() => { setShowGroupDetails(false); setSelectedGroupForDetails(null); setGroupBalance(null); }}
        >
          <TouchableOpacity activeOpacity={1} style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => { setShowGroupDetails(false); setSelectedGroupForDetails(null); setGroupBalance(null); }}>
            <SafeAreaView style={[styles.modalContainer, { justifyContent: 'center', alignItems: 'stretch' }]}> 
              <TouchableOpacity activeOpacity={1} style={[styles.friendDetailsModal, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedGroupForDetails.name || 'Group'}</Text>
                {/* show a list of group members (avatars + names) instead of just a count */}
                <View style={{ marginBottom: 12 }}>
                  {(selectedGroupForDetails.members || []).length === 0 ? (
                    <Text style={{ color: theme.colors.textSecondary }}>No members</Text>
                  ) : (
                    (selectedGroupForDetails.members || []).map((m, idx) => {
                      const memberKey = String(m?.user?._id || m?.user?.id || (typeof m?.user === 'string' ? m.user : null) || m?.id || idx);
                      return (
                      <View key={memberKey} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                          <Text style={{ color: 'white', fontWeight: '700' }}>{(m.user && m.user.name) ? (m.user.name[0]) : (m.name ? m.name[0] : '?')}</Text>
                        </View>
                        <Text style={{ color: theme.colors.text }}>{m.user?.name || m.name || m.email || 'Member'}</Text>
                      </View>
                    )})
                  )}
                </View>
                
                {/* balance Information */}
                {groupBalance && (
                  <View style={{ marginBottom: 20, padding: 15, backgroundColor: theme.colors.background, borderRadius: 8, width: '100%' }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 8 }}>Your Group Balance</Text>
                    <Text style={{ 
                      fontSize: 24, 
                      fontWeight: 'bold', 
                      color: groupBalance.balance >= 0 ? '#4CAF50' : '#f44336',
                      marginBottom: 8
                    }}>
                      ${Math.abs(groupBalance.balance || 0).toFixed(2)}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                        Total owed: ${selectedGroupForDetails.totalOwed?.toFixed(2) || '0.00'}
                      </Text>
                    </View>
                    {(groupBalance.balance || 0) !== 0 && (
                      <TouchableOpacity 
                        style={[styles.settleButton, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
                        onPress={handleSettleGroupBalance}
                      >
                        <Text style={{ color: 'white', fontWeight: '600' }}>Settle Balance</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                {!groupBalance && (
                  <View style={{ marginBottom: 20, padding: 15, backgroundColor: theme.colors.background, borderRadius: 8 }}>
                    <Text style={{ color: theme.colors.textSecondary, textAlign: 'center' }}>Loading balance...</Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.colors.textSecondary, marginRight: 8 }]} onPress={() => { setShowGroupDetails(false); setSelectedGroupForDetails(null); setGroupBalance(null); }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.colors.error }]} onPress={() => handleLeaveGroup(selectedGroupForDetails.id, selectedGroupForDetails.name)}>
                    <Text style={styles.addButtonText}>Leave Group</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </SafeAreaView>
          </TouchableOpacity>
        </Modal>
      )}

      {/* payment method selection modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <TouchableOpacity activeOpacity={1} style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]} onPress={() => setShowPaymentModal(false)}>
          <SafeAreaView style={[styles.modalContainer, { justifyContent: 'center', alignItems: 'stretch' }]}> 
            <TouchableOpacity activeOpacity={1} style={[styles.friendDetailsModal, { backgroundColor: theme.colors.card }]}> 
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Choose payment method</Text>
              {isLoadingPaymentOptions ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : paymentOptions.length === 0 ? (
                <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>No payment methods available for this user.</Text>
              ) : (
                paymentOptions.map(pm => (
                  <TouchableOpacity key={pm.id || pm._id} style={[styles.settleButton, { backgroundColor: theme.colors.background, marginTop: 8 }]} onPress={() => openPaymentApp(pm)}>
                    <Text style={{ color: theme.colors.text }}>{pm.type} — {pm.handle}</Text>
                  </TouchableOpacity>
                ))
              )}

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
                <TouchableOpacity style={[styles.cancelButton, { borderColor: theme.colors.textSecondary, marginRight: 8 }]} onPress={() => setShowPaymentModal(false)}>
                  <Text style={{ color: theme.colors.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
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
    shadowRadius: 3,
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
    shadowRadius: 3,
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
    shadowRadius: 2,
    elevation: 6,
  },
  cardWrapper: {
    marginBottom: 12,
    overflow: 'visible',
    zIndex: 5,
    // reserve space so the shadow is not clipped by neighboring containers
    paddingHorizontal: 3,
    paddingTop: 2,
  },
  cardShadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 14,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    shadowRadius: 4,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 25,
    backgroundColor: 'rgba(0,0,0,0.4)'
  },
  friendDetailsModal: {
    width: '100%',
    maxWidth: 820,
    borderRadius: 12,
    padding: 24,
  },
  modalContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  settleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
});

export default FriendsScreen;