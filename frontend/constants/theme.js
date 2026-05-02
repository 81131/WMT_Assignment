export const darkColors = {
  // Primary palette (PVR Yellow)
  primary: '#FFC107',
  primaryDark: '#B38705',
  primaryLight: '#FFD54F',

  // Backgrounds (Dark/Black)
  background: '#121212',
  surface: '#1E1E1E',
  surfaceElevated: '#2C2C2C',
  card: '#1A1A1A',

  // Accent
  accent: '#FFC107',
  accentSecondary: '#F39C12',

  // Seat types
  seatRegular: '#333333',
  seatVip: '#FFC107',
  seatLoveseat: '#E91E63',
  seatProducer: '#9C27B0',
  seatLobby: '#03A9F4',
  seatBooked: '#1A1A1A',
  seatLocked: '#E67E22',
  seatSelected: '#00BCD4',  // Distinct cyan — clearly different from VIP yellow
  seatMyHold: '#2ECC71',
  seatInactive: '#111111',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0C0',
  textMuted: '#5A5A7A',

  // Status
  success: '#2ECC71',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#3498DB',

  // Borders
  border: '#2A2A45',
  borderLight: '#3A3A55',
};

export const lightColors = {
  ...darkColors, // keep same brand colors
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F3F5',
  card: '#FFFFFF',
  
  textPrimary: '#212529',
  textSecondary: '#495057',
  textMuted: '#ADB5BD',
  
  border: '#DEE2E6',
  borderLight: '#E9ECEF',
  
  seatRegular: '#E9ECEF',
  seatInactive: '#F8F9FA',
};

// Keep COLORS as default export to prevent breaking non-refactored screens during transition
export const COLORS = darkColors;

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  radius: 12,
  radiusLg: 20,
};

export const SEAT_TYPE_COLORS = {
  regular: COLORS.seatRegular,
  vip: COLORS.seatVip,
  loveseat: COLORS.seatLoveseat,
  producer: COLORS.seatProducer,
  lobby: COLORS.seatLobby,
};

export const ROLES = {
  MAIN_MANAGER: 'main_manager',
  BRANCH_MANAGER: 'branch_manager',
  HALL_EMPLOYEE: 'hall_employee',
  CUSTOMER: 'customer',
};
