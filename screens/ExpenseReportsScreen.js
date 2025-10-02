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
import { useData } from '../context/ApiDataContext';
import { useUser } from '../context/UserContext';

const ExpenseReportsScreen = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { getUserTransactions, getUserGroups } = useData();
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
    'all', 'food', 'transportation', 'entertainment', 
    'utilities', 'shopping', 'other'
  ];

  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate = new Date();

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
      const dateMatch = transactionDate >= startDate;
      return categoryMatch && dateMatch;
    });
  };

  const generateSummary = () => {
    const filtered = getFilteredTransactions();
    const totalExpenses = filtered.reduce((sum, t) => sum + t.amount, 0);
    const transactionCount = filtered.length;
    const averageExpense = transactionCount > 0 ? totalExpenses / transactionCount : 0;

    const categoryBreakdown = {};
    filtered.forEach(t => {
      const cat = t.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + t.amount;
    });

    const groupBreakdown = {};
    filtered.forEach(t => {
      const group = groups.find(g => g.id === t.groupId);
      const groupName = group ? group.name : 'Unknown Group';
      groupBreakdown[groupName] = (groupBreakdown[groupName] || 0) + t.amount;
    });

    return {
      totalExpenses,
      transactionCount,
      averageExpense,
      categoryBreakdown,
      groupBreakdown
    };
  };

  const summary = generateSummary();

  const PeriodButton = ({ period }) => {
    const isSelected = selectedPeriod === period.id;
    return (
      <TouchableOpacity
        style={[
          styles.periodButton,
          { 
            backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
            borderColor: theme.colors.border 
          }
        ]}
        onPress={() => setSelectedPeriod(period.id)}
      >
        <Text style={[
          styles.periodButtonText,
          { color: isSelected ? 'white' : theme.colors.text }
        ]}>
          {period.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const CategoryButton = ({ category }) => {
    const isSelected = selectedCategory === category;
    const label = category === 'all' ? 'All Categories' : 
                  category.charAt(0).toUpperCase() + category.slice(1);
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryChip,
          { 
            backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
            borderColor: theme.colors.border 
          }
        ]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text style={[
          styles.categoryChipText,
          { color: isSelected ? 'white' : theme.colors.text }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const SummaryCard = ({ title, value, subtitle, color }) => (
    <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.summaryValue, { color: color || theme.colors.text }]}>
        {value}
      </Text>
      <Text style={[styles.summaryTitle, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
      {subtitle && (
        <Text style={[styles.summarySubtitle, { color: theme.colors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );

  const BreakdownItem = ({ label, amount, total }) => {
    const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0;
    
    return (
      <View style={[styles.breakdownItem, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.breakdownInfo}>
          <Text style={[styles.breakdownLabel, { color: theme.colors.text }]}>
            {label}
          </Text>
          <Text style={[styles.breakdownPercentage, { color: theme.colors.textSecondary }]}>
            {percentage}%
          </Text>
        </View>
        <Text style={[styles.breakdownAmount, { color: theme.colors.text }]}>
          ${amount.toFixed(2)}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: theme.colors.surface }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: theme.colors.primary,
                width: `${percentage}%` 
              }
            ]} 
          />
        </View>
      </View>
    );
  };

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
            Expense Reports
          </Text>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.filtersSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Time Period
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodButtons}>
              {periods.map(period => (
                <PeriodButton key={period.id} period={period} />
              ))}
            </ScrollView>
          </View>

          <View style={styles.filtersSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Categories
            </Text>
            <View style={styles.categoryChips}>
              {categories.map(category => (
                <CategoryButton key={category} category={category} />
              ))}
            </View>
          </View>

          <View style={styles.summarySection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Summary
            </Text>
            <View style={styles.summaryGrid}>
              <SummaryCard
                title="Total Spent"
                value={`$${summary.totalExpenses.toFixed(2)}`}
                color={theme.colors.primary}
              />
              <SummaryCard
                title="Transactions"
                value={summary.transactionCount}
              />
              <SummaryCard
                title="Average"
                value={`$${summary.averageExpense.toFixed(2)}`}
                subtitle="per transaction"
              />
            </View>
          </View>

          {Object.keys(summary.categoryBreakdown).length > 0 && (
            <View style={styles.breakdownSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                By Category
              </Text>
              <View style={[styles.breakdownCard, { backgroundColor: theme.colors.card }]}>
                {Object.entries(summary.categoryBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, amount]) => (
                    <BreakdownItem
                      key={category}
                      label={category.charAt(0).toUpperCase() + category.slice(1)}
                      amount={amount}
                      total={summary.totalExpenses}
                    />
                  ))}
              </View>
            </View>
          )}

          {Object.keys(summary.groupBreakdown).length > 0 && (
            <View style={styles.breakdownSection}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                By Group
              </Text>
              <View style={[styles.breakdownCard, { backgroundColor: theme.colors.card }]}>
                {Object.entries(summary.groupBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .map(([groupName, amount]) => (
                    <BreakdownItem
                      key={groupName}
                      label={groupName}
                      amount={amount}
                      total={summary.totalExpenses}
                    />
                  ))}
              </View>
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
    backgroundColor: '#fafbfc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 200,
  },
  filtersSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#673e9dff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  summarySubtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  breakdownSection: {
    marginBottom: 24,
  },
  breakdownCard: {
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
    shadowRadius: 10,
    elevation: 8,
  },
  breakdownItem: {
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  breakdownInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownPercentage: {
    fontSize: 12,
    fontWeight: '500',
  },
  breakdownAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

export default ExpenseReportsScreen;