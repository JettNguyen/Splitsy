import { StyleSheet, Platform } from 'react-native';

export const FONT_FAMILY = Platform.select({
  ios: 'Avenir Next',
  android: 'Roboto',
  default: 'System'
});

export const FONT_FAMILY_BOLD = Platform.select({
  ios: 'Avenir Next',
  android: 'Roboto', 
  default: 'System'
});

const AppStyles = StyleSheet.create({
  container: {
    flex: 1,
    fontFamily: FONT_FAMILY,
  },
  main: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    fontFamily: FONT_FAMILY_BOLD,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    fontFamily: FONT_FAMILY,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 10,
    fontFamily: FONT_FAMILY_BOLD,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    fontFamily: FONT_FAMILY,
  },
  navContainer: {
    position: 'absolute',
    bottom: -40,
    left: 10,
    right: 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    borderRadius: 50,
    padding: 10,
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    shadowColor: '#653981ff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addButton: {
    width: 58,
    height: 58,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    backgroundColor: '#7c3aed',
    position: 'absolute',
    top: -20,
    shadowColor: '#7556acff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    zIndex: 1000,
  },
  addButtonPressed: {
    backgroundColor: '#6d28d9',
    transform: [{ scale: 0.92 }],
    shadowOpacity: 0.7,
  },
  sideButtons: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  centerSpace: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 10,
    width: 60,
    position: 'relative',
  },
  tabButton: {
    minWidth: 60,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  activeTab: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONT_FAMILY,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcome: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
    fontFamily: FONT_FAMILY_BOLD,
  },
  balanceSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  balanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  balanceCell: {
    width: '48%',
  },
  balanceCards: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  balanceCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#664693ff',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
    fontFamily: FONT_FAMILY_BOLD,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT_FAMILY,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: FONT_FAMILY_BOLD,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 15,
    fontFamily: FONT_FAMILY_BOLD,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyIconText: {
    fontSize: 32,
    fontFamily: FONT_FAMILY_BOLD,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: FONT_FAMILY_BOLD,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: FONT_FAMILY,
  },
  transactionCard: {
    borderRadius: 12,
    padding: 16,           
    marginVertical: 8,
    marginHorizontal: 12, 
    shadowColor: '#7556acff',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 0},
    shadowRadius: 3,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,             
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,          
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 17,          
    fontWeight: '600',
  },
  transactionSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 18,          
    fontWeight: '600',
  },
  statusCircle: {
    width: 12,
    height: 12,
    borderRadius: 10,
    marginLeft: 5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  modalPanelShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  modalCloseButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  modalClose: {
    color: '#7c3aed',
    fontWeight: '700'
  },
  settleButton: {
    backgroundColor: '#7c3aed',
    paddingVertical: 8,
    borderRadius: 8,
  },
});

export default AppStyles;
