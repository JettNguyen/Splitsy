import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';

const ExpenseReportsScreen = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { getUserTransactions, getUserGroups } = useData();
  const { currentUser } = useUser();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const transactions = getUserTransactions();
  const groups = getUserGroups();

  const periods = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' },
  ];

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'food', label: '🍕 Food & Dining' },
    { id: 'transport', label: '🚗 Transportation' },
    { id: 'entertainment', label: '🎬 Entertainment' },
    { id: 'shopping', label: '🛍️ Shopping' },
    { id: 'utilities', label: '💡 Utilities' },
    { id: 'other', label: '📦 Other' },
  ];

  // Filter transactions by period
  const getFilteredTransactions = () => {
    const now = new Date();
    const startDate = new Date();
    
    switch (selectedPeriod) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const categoryMatch = selectedCategory === 'all' || t.category === selectedCategory;
      return transactionDate >= startDate && categoryMatch;
    });
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate statistics
  const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalTransactions = filteredTransactions.length;
  const averageExpense = totalTransactions > 0 ? totalSpent / totalTransactions : 0;
  const myExpenses = filteredTransactions.filter(t => t.payerId === currentUser.id);
  const myTotal = myExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown
  const categoryBreakdown = categories.slice(1).map(category => {
    const categoryTransactions = filteredTransactions.filter(t => t.category === category.id);
    const categoryTotal = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    const percentage = totalSpent > 0 ? (categoryTotal / totalSpent) * 100 : 0;
    
    return {
      ...category,
      total: categoryTotal,
      percentage,
      count: categoryTransactions.length,
    };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  // Group breakdown
  const groupBreakdown = groups.map(group => {
    const groupTransactions = filteredTransactions.filter(t => t.groupId === group.id);
    const groupTotal = groupTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      ...group,
      total: groupTotal,
      count: groupTransactions.length,
    };
  }).filter(g => g.total > 0).sort((a, b) => b.total - a.total);

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

  const CategoryRow = ({ category }) => (
    <View style={[styles.categoryRow, { borderBottomColor: theme.colors.border }]}>
      <Text style={[styles.categoryLabel, { color: theme.colors.text }]}>{category.label}</Text>
      <View style={styles.categoryStats}>
        <Text style={[styles.categoryAmount, { color: theme.colors.text }]}>
          ${category.total.toFixed(2)}
        </Text>
        <Text style={[styles.categoryPercentage, { color: theme.colors.textSecondary }]}>
          {category.percentage.toFixed(1)}%
        </Text>
      </View>
      <View style={[styles.categoryBar, { backgroundColor: theme.colors.border }]}>
        <View 
          style={[
            styles.categoryBarFill, 
            { 
              backgroundColor: theme.colors.accent,
              width: `${Math.min(category.percentage, 100)}%`
            }
          ]} 
        />
      </View>
    </View>
  );

  const GroupRow = ({ group }) => (
    <View style={[styles.groupRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <View style={[styles.groupIcon, { backgroundColor: theme.colors.accent }]}>
        <Text style={styles.groupIconText}>{group.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.groupInfo}>
        <Text style={[styles.groupName, { color: theme.colors.text }]}>{group.name}</Text>
        <Text style={[styles.groupStats, { color: theme.colors.textSecondary }]}>
          {group.count} expense{group.count !== 1 ? 's' : ''}
        </Text>
      </View>
      <Text style={[styles.groupAmount, { color: theme.colors.text }]}>
        ${group.total.toFixed(2)}
      </Text>
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
          <Text style={[styles.title, { color: theme.colors.text }]}>Expense Reports</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Period Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Time Period</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodSelector}>
              {periods.map((period) => (
                <TouchableOpacity
                  key={period.id}
                  style={[
                    styles.periodButton,
                    { 
                      backgroundColor: selectedPeriod === period.id ? theme.colors.accent : theme.colors.surface,
                      borderColor: theme.colors.border,
                    }
                  ]}
                  onPress={() => setSelectedPeriod(period.id)}
                >
                  <Text style={[
                    styles.periodButtonText,
                    { color: selectedPeriod === period.id ? 'white' : theme.colors.text }
                  ]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Category Filter */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Category Filter</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    { 
                      backgroundColor: selectedCategory === category.id ? theme.colors.accent : theme.colors.surface,
                      borderColor: theme.colors.border,
                    }
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={[
                    styles.categoryButtonText,
                    { color: selectedCategory === category.id ? 'white' : theme.colors.text }
                  ]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Statistics */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Spent"
                value={`$${totalSpent.toFixed(2)}`}
                subtitle={`${totalTransactions} transactions`}
                color={theme.colors.error}
                icon="💰"
              />
              <StatCard
                title="You Paid"
                value={`$${myTotal.toFixed(2)}`}
                subtitle={`${myExpenses.length} expenses`}
                color={theme.colors.success}
                icon="💸"
              />
              <StatCard
                title="Average"
                value={`$${averageExpense.toFixed(2)}`}
                subtitle="per expense"
                color={theme.colors.info}
                icon="📊"
              />
              <StatCard
                title="Groups"
                value={groupBreakdown.length}
                subtitle="with activity"
                color={theme.colors.accent}
                icon="👥"
              />
            </View>
          </View>

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Spending by Category</Text>
              <View style={[styles.breakdownCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                {categoryBreakdown.map((category) => (
                  <CategoryRow key={category.id} category={category} />
                ))}
              </View>
            </View>
          )}

          {/* Group Breakdown */}
          {groupBreakdown.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Spending by Group</Text>
              {groupBreakdown.map((group) => (
                <GroupRow key={group.id} group={group} />
              ))}
            </View>
          )}

          {/* Empty State */}
          {filteredTransactions.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyIcon, { color: theme.colors.textTertiary }]}>📊</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No expenses found
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
                Try adjusting your filters or add some expenses
              </Text>
            </View>
          )}
        </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  periodSelector: {
    marginBottom: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categorySelector: {
    marginBottom: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '500',
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
  breakdownCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryRow: {
    padding: 12,
    borderBottomWidth: 1,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryPercentage: {
    fontSize: 14,
  },
  categoryBar: {
    height: 4,
    borderRadius: 2,
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupIconText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  groupStats: {
    fontSize: 12,
  },
  groupAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ExpenseReportsScreen;