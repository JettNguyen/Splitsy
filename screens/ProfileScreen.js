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
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FONT_FAMILY, FONT_FAMILY_BOLD } from '../styles/AppStyles';

//context imports
import { useUser } from '../context/UserContext';
import { useData } from '../context/ApiDataContext';
import { useTheme } from '../context/ThemeContext';

//profile and settings screen component
const ProfileScreen = ({ 
  onNavigateToPaymentMethods,
  onNavigateToNotifications,
  onNavigateToExpenseReports,
  onNavigateToGroupManagement 
}) => {
  const { currentUser, logoutUser, updateUser } = useUser();
  const { calculateUserBalance } = useData();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || ''
  });

  const balanceData = calculateUserBalance() || { owed: 0, owes: 0, net: 0 };
  const balance = balanceData.net || 0;

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: logoutUser
        }
      ]
    );
  };

  const handleUpdateProfile = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    const result = await updateUser(currentUser.id, {
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone
    });

    if (result.success) {
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const MenuItem = ({ icon, title, subtitle, onPress, showArrow = true }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemContent}>
        <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
        </View>
        {showArrow && <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />}
      </View>
    </TouchableOpacity>
  );

  const MenuSection = ({ title, children }) => (
    <View style={styles.menuSection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: theme.colors.card }]}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right', 'bottom']}> 
      <ScrollView style={[styles.scrollContainer, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContent}>
        {/*profile header*/}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.card }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{currentUser?.avatar || currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={[styles.userName, { color: theme.colors.text }]}>{currentUser?.name}</Text>
          <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>{currentUser?.email}</Text>
          
          {/*balance summary */}
          <View style={[styles.balanceContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.balanceItem}>
              <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>Total Balance</Text>
              <Text style={[
                styles.balanceAmount,
                { color: balance >= 0 ? theme.colors.success : theme.colors.error }
              ]}>
                ${Math.abs(balance).toFixed(2)}
              </Text>
              <Text style={[styles.balanceStatus, { color: theme.colors.textTertiary }]}>
                {balance >= 0 ? 'You are owed' : 'You owe'}
              </Text>
            </View>
          </View>
        </View>

        {/*account section*/}
        <MenuSection title="Account">
          <MenuItem
            icon="person-circle-outline"
            title="Edit Profile"
            subtitle="Update your name, email, and phone"
            onPress={() => setShowEditModal(true)}
          />
          <View style={styles.themeToggleContainer}>
            <View style={styles.menuItemContent}>
              <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={20} color={theme.colors.textSecondary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: theme.colors.text }]}>Dark Mode</Text>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textSecondary }]}>Toggle between light and dark themes</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ 
                  false: theme.colors.textTertiary, 
                  true: theme.colors.primary 
                }}
                thumbColor={isDarkMode ? theme.colors.card : '#FFFFFF'}
                ios_backgroundColor={theme.colors.textTertiary}
              />
            </View>
          </View>
          <MenuItem
            icon="card-outline"
            title="Payment Methods"
            subtitle="Manage your payment apps"
            onPress={onNavigateToPaymentMethods}
          />
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={onNavigateToNotifications}
          />
        </MenuSection>

        {/*groups section*/}
        <MenuSection title="Groups">
          <MenuItem
            icon="people-outline"
            title="Manage Groups"
            subtitle="View and edit your groups"
            onPress={() => {
              Alert.alert(
                'Manage Groups',
                'You can manage your groups from the Groups tab. Tap on any group to edit it.',
                [{ text: 'OK' }]
              );
            }}
          />
          <MenuItem
            icon="bar-chart-outline"
            title="Expense Reports"
            subtitle="View detailed spending reports"
            onPress={onNavigateToExpenseReports}
          />
        </MenuSection>

        {/*sign out*/}
        <View style={styles.signOutContainer}>
          <TouchableOpacity style={[styles.signOutButton, { backgroundColor: theme.colors.error }]} onPress={handleLogout}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
  </ScrollView>
      {/*edit profile modal*/}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHandleWrap}>
            <View style={[styles.modalHandle, { backgroundColor: theme.colors.textTertiary }]} />
          </View>
          <View style={[styles.modalHeader, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={[styles.modalCloseButton, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Profile</Text>
            <TouchableOpacity onPress={handleUpdateProfile}>
              <Text style={[styles.modalSaveButton, { color: theme.colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={[styles.modalContent, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={[styles.formGroup, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>Full Name</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editForm.name}
                onChangeText={(text) => setEditForm({...editForm, name: text})}
                placeholder="Enter your full name"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            <View style={[styles.formGroup, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editForm.email}
                onChangeText={(text) => setEditForm({...editForm, email: text})}
                placeholder="Enter your email"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.formGroup, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.formLabel, { color: theme.colors.textSecondary }]}>Phone (Optional)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({...editForm, phone: text})}
                placeholder="Enter your phone number"
                placeholderTextColor={theme.colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeAreaTop: {
    flex: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
    paddingTop: 0,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 25,
    marginHorizontal: 15,
    marginBottom: 30,
    borderRadius: 16,
    shadowColor: '#673e9dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    fontFamily: FONT_FAMILY_BOLD,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 5,
    fontFamily: FONT_FAMILY_BOLD,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 20,
    fontFamily: FONT_FAMILY,
  },
  balanceContainer: {
    borderRadius: 12,
    padding: 15,
    width: '100%',
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: FONT_FAMILY,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: FONT_FAMILY_BOLD,
  },
  balanceStatus: {
    fontSize: 14,
    fontFamily: FONT_FAMILY,
  },
  menuSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: FONT_FAMILY,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#673e9dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  themeToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: FONT_FAMILY,
  },
  menuSubtitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY,
  },

  signOutContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  signOutButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT_FAMILY,
  },
  modalContainer: {
    flex: 1,
  },
  modalHandleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    opacity: 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalCloseButton: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSaveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingTop: 24,
  },
  formGroup: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    shadowColor: '#673e9dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
});

export default ProfileScreen;