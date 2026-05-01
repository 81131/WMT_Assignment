export const darkColors = {
  // Primary palette
  primary: '#E63946',
  primaryDark: '#C1121F',
  primaryLight: '#FF6B6B',

  // Backgrounds
  background: '#0D0D1A',
  surface: '#161627',
  surfaceElevated: '#1E1E35',
  card: '#1A1A2E',

  // Accent
  accent: '#FFD60A',
  accentSecondary: '#00B4D8',

  // Seat types
  seatRegular: '#4A4A6A',
  seatVip: '#FFD700',
  seatLoveseat: '#FF69B4',
  seatProducer: '#9B59B6',
  seatLobby: '#00BCD4',
  seatBooked: '#2D2D2D',
  seatLocked: '#E07B00',
  seatMyHold: '#2ECC71',
  seatInactive: '#1A1A1A',

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
  background: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceElevated: '#F9F9FB',
  card: '#FFFFFF',
  
  textPrimary: '#111111',
  textSecondary: '#555555',
  textMuted: '#888888',
  
  border: '#E0E0E0',
  borderLight: '#EEEEEE',
  
  seatRegular: '#D0D0E0',
  seatInactive: '#EAEAEA',
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
