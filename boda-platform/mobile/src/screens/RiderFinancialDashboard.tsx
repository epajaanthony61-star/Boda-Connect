/**
 * Rider Financial Dashboard Screen
 * 
 * React Native component for Boda Boda riders to track:
 * - Daily earnings and expenses
 * - Fuel costs logging (offline-first)
 * - Lease payment progress
 * - Net income tracking
 * 
 * Features:
 * - Offline-first architecture for areas with poor connectivity
 * - Mobile Money integration (M-Pesa, Airtel Money)
 * - Photo receipt capture for expenses
 * - Daily/weekly/monthly summaries
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; // or 'react-native-vector-icons'

// ============================================
// TYPES & INTERFACES
// ============================================

interface FinancialTransaction {
  id: string;
  type: 'ride_earning' | 'fuel_expense' | 'maintenance_expense' | 'lease_payment' | 'other';
  amount: number;
  currency: string;
  description?: string;
  category?: string;
  timestamp: string;
  isSynced: boolean;
  receiptImageUri?: string;
}

interface DailySummary {
  date: string;
  totalRides: number;
  totalEarnings: number;
  totalExpenses: number;
  fuelExpenses: number;
  maintenanceExpenses: number;
  netIncome: number;
  hoursOnline: number;
}

interface LeaseInfo {
  companyName: string;
  totalAmount: number;
  paidAmount: number;
  remainingPayments: number;
  nextPaymentDate: string;
  monthlyPayment: number;
}

// ============================================
// COMPONENT
// ============================================

export default function RiderFinancialDashboard() {
  // State management
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Financial data
  const [todaySummary, setTodaySummary] = useState<DailySummary>({
    date: new Date().toISOString().split('T')[0],
    totalRides: 0,
    totalEarnings: 0,
    totalExpenses: 0,
    fuelExpenses: 0,
    maintenanceExpenses: 0,
    netIncome: 0,
    hoursOnline: 0,
  });
  
  const [recentTransactions, setRecentTransactions] = useState<FinancialTransaction[]>([]);
  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo | null>(null);
  
  // Add expense modal
  const [addExpenseModalVisible, setAddExpenseModalVisible] = useState(false);
  const [expenseType, setExpenseType] = useState<'fuel' | 'maintenance' | 'lease'>('fuel');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  
  // Network status (for offline-first)
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    loadFinancialData();
    checkNetworkStatus();
    
    // Set up network listener
    const unsubscribe = setupNetworkListener();
    return () => unsubscribe();
  }, []);

  /**
   * Load financial data from API or local storage
   * Prioritizes local data when offline
   */
  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      // In production: fetch from API with offline fallback
      // const response = await fetch('/api/rider/financial-summary', {
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });
      
      // Mock data for demonstration
      setTimeout(() => {
        setTodaySummary({
          date: new Date().toISOString().split('T')[0],
          totalRides: 8,
          totalEarnings: 2450,
          totalExpenses: 650,
          fuelExpenses: 400,
          maintenanceExpenses: 150,
          netIncome: 1800,
          hoursOnline: 7,
        });
        
        setRecentTransactions([
          {
            id: '1',
            type: 'ride_earning',
            amount: 350,
            currency: 'KES',
            description: 'Ride from Westlands to CBD',
            timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            isSynced: true,
          },
          {
            id: '2',
            type: 'fuel_expense',
            amount: 200,
            currency: 'KES',
            description: 'Fuel at Shell station',
            category: 'fuel',
            timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            isSynced: true,
          },
          {
            id: '3',
            type: 'ride_earning',
            amount: 280,
            currency: 'KES',
            description: 'Ride from CBD to Kilimani',
            timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
            isSynced: true,
          },
          {
            id: '4',
            type: 'maintenance_expense',
            amount: 150,
            currency: 'KES',
            description: 'Oil change',
            category: 'maintenance',
            timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
            isSynced: false, // Pending sync
          },
        ]);
        
        setLeaseInfo({
          companyName: 'Boda Lease Kenya Ltd',
          totalAmount: 120000,
          paidAmount: 75000,
          remainingPayments: 9,
          nextPaymentDate: '2024-02-01',
          monthlyPayment: 5000,
        });
        
        setPendingSyncCount(1);
        setLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error loading financial data:', error);
      // Load from local storage as fallback
      loadFromLocalStorage();
      setLoading(false);
    }
  };

  /**
   * Load data from local storage (offline mode)
   */
  const loadFromLocalStorage = () => {
    // In production: retrieve from AsyncStorage or WatermelonDB
    console.log('Loading from local storage (offline mode)');
    // Set cached data...
  };

  /**
   * Check network connectivity
   */
  const checkNetworkStatus = async () => {
    // In production: use @react-native-community/netinfo
    setIsOnline(true); // Assume online for demo
  };

  /**
   * Setup network status listener
   */
  const setupNetworkListener = () => {
    // In production: subscribe to network changes
    // NetInfo.addEventListener(state => {
    //   setIsOnline(state.isConnected ?? false);
    //   if (state.isConnected) {
    //     syncPendingTransactions();
    //   }
    // });
    return () => {}; // unsubscribe function
  };

  /**
   * Sync pending transactions when back online
   */
  const syncPendingTransactions = async () => {
    if (!isOnline || pendingSyncCount === 0) return;
    
    try {
      // In production: send pending transactions to server
      console.log(`Syncing ${pendingSyncCount} pending transactions...`);
      setPendingSyncCount(0);
      Alert.alert('Success', 'All transactions synced successfully');
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Sync Failed', 'Will retry when connection improves');
    }
  };

  // ============================================
  // HANDLERS
  // ============================================

  const onRefresh = () => {
    setRefreshing(true);
    loadFinancialData().finally(() => setRefreshing(false));
  };

  const handleAddExpense = () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount');
      return;
    }
    
    const newTransaction: FinancialTransaction = {
      id: Date.now().toString(),
      type: expenseType === 'fuel' ? 'fuel_expense' : expenseType === 'maintenance' ? 'maintenance_expense' : 'lease_payment',
      amount: parseFloat(expenseAmount),
      currency: 'KES',
      description: expenseDescription || `${expenseType} expense`,
      category: expenseType,
      timestamp: new Date().toISOString(),
      isSynced: isOnline, // Mark as unsynced if offline
    };
    
    // Add to local list immediately (optimistic update)
    setRecentTransactions(prev => [newTransaction, ...prev]);
    
    // Update today's summary
    setTodaySummary(prev => ({
      ...prev,
      totalExpenses: prev.totalExpenses + newTransaction.amount,
      fuelExpenses: expenseType === 'fuel' ? prev.fuelExpenses + newTransaction.amount : prev.fuelExpenses,
      maintenanceExpenses: expenseType === 'maintenance' ? prev.maintenanceExpenses + newTransaction.amount : prev.maintenanceExpenses,
      netIncome: prev.netIncome - newTransaction.amount,
    }));
    
    // If offline, mark for later sync
    if (!isOnline) {
      setPendingSyncCount(prev => prev + 1);
      // Save to local storage for later sync
      saveToLocalStorage(newTransaction);
    } else {
      // Send to server
      submitExpenseToServer(newTransaction);
    }
    
    // Reset form
    setExpenseAmount('');
    setExpenseDescription('');
    setAddExpenseModalVisible(false);
    
    Alert.alert(
      isOnline ? 'Expense Logged' : 'Saved Offline',
      isOnline 
        ? 'Your expense has been recorded' 
        : 'Expense saved locally. Will sync when online.'
    );
  };

  const saveToLocalStorage = (transaction: FinancialTransaction) => {
    // In production: save to AsyncStorage or WatermelonDB
    console.log('Saving to local storage:', transaction);
  };

  const submitExpenseToServer = async (transaction: FinancialTransaction) => {
    try {
      // In production: POST to API
      // await fetch('/api/rider/expenses', {
      //   method: 'POST',
      //   headers: { 
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify(transaction)
      // });
      console.log('Submitting to server:', transaction);
    } catch (error) {
      console.error('Failed to submit expense:', error);
      // Mark as unsynced and save locally
      transaction.isSynced = false;
      saveToLocalStorage(transaction);
      setPendingSyncCount(prev => prev + 1);
    }
  };

  const handleWithdrawEarnings = () => {
    Alert.alert(
      'Withdraw to Mobile Money',
      'Choose withdrawal method:',
      [
        { text: 'M-Pesa', onPress: () => initiateWithdrawal('mpesa') },
        { text: 'Airtel Money', onPress: () => initiateWithdrawal('airtel_money') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const initiateWithdrawal = async (method: string) => {
    // In production: integrate with Mobile Money APIs
    Alert.alert(
      'Withdrawal Initiated',
      `Processing withdrawal via ${method}. You will receive an M-Pesa prompt shortly.`
    );
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const formatCurrency = (amount: number, currency: string = 'KES') => {
    const symbols: Record<string, string> = {
      KES: 'KSh ',
      UGX: 'USh ',
      RWF: 'RF ',
    };
    return `${symbols[currency] || currency} ${amount.toLocaleString()}`;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getTransactionIcon = (type: FinancialTransaction['type']) => {
    switch (type) {
      case 'ride_earning':
        return { name: 'arrow-up-circle', color: '#10B981' };
      case 'fuel_expense':
        return { name: 'gas-station', color: '#EF4444' };
      case 'maintenance_expense':
        return { name: 'wrench', color: '#F59E0B' };
      case 'lease_payment':
        return { name: 'document-text', color: '#3B82F6' };
      default:
        return { name: 'cash', color: '#6B7280' };
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading your finances...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Finances</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <TouchableOpacity style={styles.syncButton} onPress={syncPendingTransactions}>
          <Ionicons 
            name={isOnline ? 'cloud-done' : 'cloud-offline'} 
            size={24} 
            color={isOnline ? '#10B981' : '#EF4444'} 
          />
          {pendingSyncCount > 0 && (
            <View style={styles.syncBadge}>
              <Text style={styles.syncBadgeText}>{pendingSyncCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Network Status Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi" size={16} color="#FFFFFF" />
          <Text style={styles.offlineText}>Offline Mode - Changes will sync when online</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />
        }
      >
        {/* Today's Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Summary</Text>
          
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="cash-outline" size={24} color="#10B981" />
              <Text style={styles.summaryLabel}>Earnings</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                {formatCurrency(todaySummary.totalEarnings)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Ionicons name="cart-outline" size={24} color="#EF4444" />
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                {formatCurrency(todaySummary.totalExpenses)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Ionicons name="trending-up-outline" size={24} color="#3B82F6" />
              <Text style={styles.summaryLabel}>Net Income</Text>
              <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>
                {formatCurrency(todaySummary.netIncome)}
              </Text>
            </View>
            
            <View style={styles.summaryItem}>
              <Ionicons name="bicycle-outline" size={24} color="#F59E0B" />
              <Text style={styles.summaryLabel}>Rides</Text>
              <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
                {todaySummary.totalRides}
              </Text>
            </View>
          </View>
          
          <View style={styles.summaryFooter}>
            <Text style={styles.summaryFooterText}>
              Hours Online: {todaySummary.hoursOnline}h • Fuel: {formatCurrency(todaySummary.fuelExpenses)}
            </Text>
          </View>
        </View>

        {/* Lease Progress Card */}
        {leaseInfo && (
          <View style={styles.leaseCard}>
            <View style={styles.leaseHeader}>
              <Text style={styles.leaseTitle}>Motorcycle Ownership Progress</Text>
              <Ionicons name="motorcycle" size={24} color="#8B5CF6" />
            </View>
            
            <Text style={styles.leaseCompany}>{leaseInfo.companyName}</Text>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${(leaseInfo.paidAmount / leaseInfo.totalAmount) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {formatCurrency(leaseInfo.paidAmount)} / {formatCurrency(leaseInfo.totalAmount)}
              </Text>
            </View>
            
            <View style={styles.leaseDetails}>
              <View style={styles.leaseDetailItem}>
                <Text style={styles.leaseDetailLabel}>Remaining</Text>
                <Text style={styles.leaseDetailValue}>{leaseInfo.remainingPayments} payments</Text>
              </View>
              <View style={styles.leaseDetailItem}>
                <Text style={styles.leaseDetailLabel}>Monthly</Text>
                <Text style={styles.leaseDetailValue}>{formatCurrency(leaseInfo.monthlyPayment)}</Text>
              </View>
              <View style={styles.leaseDetailItem}>
                <Text style={styles.leaseDetailLabel}>Next Due</Text>
                <Text style={styles.leaseDetailValue}>{new Date(leaseInfo.nextPaymentDate).toLocaleDateString()}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setAddExpenseModalVisible(true)}
          >
            <Ionicons name="add-circle" size={32} color="#10B981" />
            <Text style={styles.actionButtonText}>Log Expense</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleWithdrawEarnings}
          >
            <Ionicons name="download-circle" size={32} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Withdraw</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="document-text" size={32} color="#F59E0B" />
            <Text style={styles.actionButtonText}>Reports</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransactions.map((transaction) => {
            const icon = getTransactionIcon(transaction.type);
            const isIncome = transaction.type === 'ride_earning';
            
            return (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={[styles.transactionIcon, { backgroundColor: `${icon.color}20` }]}>
                  <Ionicons name={icon.name as any} size={24} color={icon.color} />
                </View>
                
                <View style={styles.transactionDetails}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description}
                  </Text>
                  <Text style={styles.transactionTime}>
                    {formatTime(transaction.timestamp)}
                    {!transaction.isSynced && ' • ⏳ Pending sync'}
                  </Text>
                </View>
                
                <Text style={[
                  styles.transactionAmount,
                  { color: isIncome ? '#10B981' : '#EF4444' }
                ]}>
                  {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={addExpenseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddExpenseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Expense</Text>
              <TouchableOpacity onPress={() => setAddExpenseModalVisible(false)}>
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Expense Type Selector */}
              <Text style={styles.inputLabel}>Expense Type</Text>
              <View style={styles.expenseTypeSelector}>
                {[
                  { type: 'fuel' as const, label: 'Fuel', icon: 'gas-station' },
                  { type: 'maintenance' as const, label: 'Maintenance', icon: 'wrench' },
                  { type: 'lease' as const, label: 'Lease', icon: 'document-text' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.expenseTypeOption,
                      expenseType === option.type && styles.expenseTypeOptionActive
                    ]}
                    onPress={() => setExpenseType(option.type)}
                  >
                    <Ionicons 
                      name={option.icon as any} 
                      size={24} 
                      color={expenseType === option.type ? '#FFFFFF' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.expenseTypeLabel,
                      expenseType === option.type && styles.expenseTypeLabelActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Amount Input */}
              <Text style={styles.inputLabel}>Amount (KES)</Text>
              <TextInput
                style={styles.input}
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
              />
              
              {/* Description Input */}
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={expenseDescription}
                onChangeText={setExpenseDescription}
                placeholder="e.g., Fuel at Shell station"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
              
              {/* Photo Receipt Button */}
              <TouchableOpacity style={styles.photoButton}>
                <Ionicons name="camera" size={24} color="#10B981" />
                <Text style={styles.photoButtonText}>Add Photo Receipt</Text>
              </TouchableOpacity>
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleAddExpense}
            >
              <Text style={styles.submitButtonText}>Save Expense</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  syncButton: {
    position: 'relative',
    padding: 8,
  },
  syncBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    padding: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summaryFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  summaryFooterText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  leaseCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  leaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  leaseCompany: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },
  leaseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  leaseDetailItem: {
    alignItems: 'center',
  },
  leaseDetailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  leaseDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#1F2937',
    marginTop: 8,
    fontWeight: '500',
  },
  transactionsSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  transactionTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
  },
  expenseTypeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  expenseTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  expenseTypeOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  expenseTypeLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  expenseTypeLabelActive: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    borderRadius: 8,
    marginBottom: 16,
  },
  photoButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#10B981',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
