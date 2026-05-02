import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Easing, Platform, ScrollView
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStyles } from '../utils/themeUtils';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(280, width * 0.8);

export default function AppLayout({ children, role }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const styles = useThemeStyles(getStyles);
  const insets = useSafeAreaInsets();

  const toggleSidebar = () => {
    const toValue = isSidebarOpen ? -SIDEBAR_WIDTH : 0;
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    if (isSidebarOpen) toggleSidebar();
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const navItems = {
    customer: [
      { name: 'Home', path: '/customer/home', icon: 'home-outline' },
      { name: 'My Tickets', path: '/customer/tickets', icon: 'ticket-outline' },
      { name: 'Profile', path: '/customer/profile', icon: 'person-outline' },
    ],
    manager: [
      { name: 'Dashboard', path: '/manager/dashboard', icon: 'stats-chart-outline' },
      { name: 'Movies', path: '/manager/movies', icon: 'film-outline' },
      { name: 'Halls', path: '/manager/halls', icon: 'easel-outline' },
      { name: 'Branches', path: '/manager/branches', icon: 'business-outline' },
      { name: 'Staff', path: '/manager/staff', icon: 'people-outline' },
      { name: 'Time Slots', path: '/manager/slots', icon: 'time-outline' },
      { name: 'Scanner', path: '/manager/scanner', icon: 'scan-outline' },
      { name: 'Reviews', path: '/manager/reviews', icon: 'star-outline' },
    ],
    employee: [
      { name: 'Scan Ticket', path: '/employee/scan', icon: 'qr-code-outline' },
    ]
  };

  const links = navItems[role] || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuBtn}>
            <Ionicons name="menu" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CinemaApp</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          {user && <Text style={styles.userName}>{user.name?.split(' ')[0]}</Text>}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {Platform.OS === 'web' ? (
          <View style={styles.contentInner}>{children}</View>
        ) : children}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>© {new Date().getFullYear()} CinemaApp. All rights reserved.</Text>
      </View>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.sidebarHeader}>
          <Ionicons name="film" size={32} color={colors.primary} />
          <Text style={styles.sidebarTitle}>Menu</Text>
          <TouchableOpacity onPress={closeSidebar} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.sidebarLinks}>
          {links.map((link) => {
            const isActive = pathname === link.path || pathname.startsWith(link.path + '/');
            return (
              <TouchableOpacity
                key={link.name}
                style={[styles.linkItem, isActive && styles.linkItemActive]}
                onPress={() => {
                  closeSidebar();
                  router.push(link.path);
                }}
              >
                <Ionicons
                  name={link.icon}
                  size={22}
                  color={isActive ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 15 }}
                />
                <Text style={[styles.linkText, isActive && styles.linkTextActive]}>
                  {link.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  themeBtn: { padding: 4, marginRight: 10 },
  userName: { color: colors.textSecondary, marginRight: 10, fontSize: 14 },
  logoutBtn: { padding: 4 },
  content: { flex: 1, ...(Platform.OS === 'web' ? { alignItems: 'center', overflowY: 'auto' } : {}) },
  contentInner: { flex: 1, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  footer: {
    padding: SIZES.sm,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  footerText: { color: colors.textMuted, fontSize: 12 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 50,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    zIndex: 100,
    elevation: 10,
    ...(Platform.OS === 'web' ? { boxShadow: '4px 0px 10px rgba(0,0,0,0.5)' } : { shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.5, shadowRadius: 10 })
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sidebarTitle: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary, marginLeft: 15, flex: 1 },
  closeBtn: { padding: 4 },
  sidebarLinks: { padding: SIZES.md },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: SIZES.radius,
    marginBottom: 8,
  },
  linkItemActive: { backgroundColor: colors.surfaceElevated },
  linkText: { fontSize: 16, color: colors.textSecondary, fontWeight: '500' },
  linkTextActive: { color: colors.primary, fontWeight: 'bold' },
});
