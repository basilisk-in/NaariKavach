import { StyleSheet } from 'react-native';

export const colors = {
  black: '#000000',
  darkGray: '#141414',
  lightGray: '#F2F2F2',
  white: '#FFFFFF',
  gray: '#757575',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const borderRadius = {
  small: 8,
  medium: 12,
  large: 24,
} as const;

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: spacing.sm,
  },
  button: {
    backgroundColor: colors.black,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.small,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.darkGray,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.lightGray,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.medium,
    fontSize: 16,
    marginVertical: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.small,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
  textGray: {
    color: colors.gray,
  },
  tabContainer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
});
