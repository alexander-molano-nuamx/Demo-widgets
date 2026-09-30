/**
 * bvc-digital-package-library exports no ThemeProvider/theme of its own — every
 * styled-component in it reads `theme.*` from styled-components' context, and the
 * real theme shape only lives in the package's `src/` (not published — only `dist/`
 * ships to npm). This is a snapshot of that internal theme (light mode), copied
 * from bvc-digital-package-library@1.4.3's src/constants/{colors,shadows,theme/*}.js
 * so the library's components render with real colors instead of `undefined` styles.
 */

const colors = {
  black: { dark: "#000000", light: "#2c3740", normal: "#02111A" },
  blackTransparent: { dark: "rgba(0, 0, 0, 0.25)", light: "rgba(0, 0, 0, 0.50)", normal: "rgba(0, 0, 0, 0.75)" },
  blueTransparent: { dark: "rgba(1,21,54,0.1)", light: "rgba(1,21,54,0.1)", normal: "rgba(1,21,54,0.1)" },
  grayTransparent: { dark: "rgba(200, 205, 207, 0.25)", light: "rgba(200, 205, 207, 0.75)", normal: "rgba(200, 205, 207, 0.5)" },
  lightGrayTransparent: { dark: "rgba(162, 170, 173, 0.3)", light: "rgba(162, 170, 173, 0.75)", normal: "rgba(162, 170, 173, 0.5)" },
  darkGrayHardTransparent: { dark: "rgb(29, 37, 45, 0)", light: "rgb(91, 103, 112, 0)", normal: "rgb(51, 63, 72, 0)" },
  blue: { dark: "#FF3700", light: "#8BD3E6", normal: "#FD441E" },
  darkBlueTransparent: { dark: "rgba(4,28,44,0.7)", light: "rgba(44,86,151,0.7)", normal: "rgba(0,60,113,0.7)" },
  darkBlue: { dark: "#041C2C", light: "#2C5697", normal: "#003C71" },
  lightBlue: { dark: "#DBE2E9", light: "#DBE2E9", normal: "#DBE2E9" },
  gray: { dark: "#515151", light: "#B8B8B8", normal: "#A2AAAD", medium: "#7A7A7A" },
  darkGray: { dark: "#3D3D3D", light: "#5B6770", normal: "#333F48" },
  lightGray: { dark: "#D9D9D6", light: "#F0F6F7", normal: "#666666" },
  green: { dark: "#3f9d39", light: "#a6ff97", normal: "#73CF67" },
  red: { dark: "#b63b3d", light: "#ff9d96", normal: "#ED6C68" },
  yellow: { dark: "#A28700", light: "#ffff61", normal: "#FDDA25" },
  transparent: { dark: "rgba(0,0,0,0)", light: "rgba(0,0,0,0)", normal: "rgba(0,0,0,0)" },
  white: { dark: "#F9F9F9", light: "#ffffff", normal: "#ffffff", neutral: "#F7F7F7" },
  mercury: { dark: "#E5E5E5", light: "#E5E5E5", normal: "#E5E5E5" },
  cornflowerBlue: { dark: "#013C60", light: "#013C60", normal: "#013C60" },
  blueFilters: { dark: "#2C5697", light: "#FF3700", normal: "#003C71" },
  blueGray: { dark: "#3E4445", light: "#F0F6F7", normal: "#F0F6F7", background: "#181818" },
  orange: { light: "#FFFBFA", normal: "#FF411C", lightSoft: "#F8E2DA" },
  lightGraySoft: { normal: "#F4F4F4" },
  mint: { light: "#EFFFFB" },
};

const palette = {
  orange: { 400: "#FF411C" },
};

const shadows = {
  gray: { dark: `0px 2px 4px ${colors.lightGray.dark}`, light: `0px 2px 4px ${colors.lightGray.light}`, normal: `0px 2px 4px ${colors.lightGray.normal}` },
  blackTransparent: { dark: `-4px 4px 4px ${colors.blackTransparent.dark}`, light: `-4px 4px 4px ${colors.blackTransparent.light}`, normal: `-4px 4px 4px ${colors.blackTransparent.normal}` },
  mercury: { dark: `0px 2px 4px ${colors.mercury.dark}`, light: `0px 2px 4px ${colors.mercury.light}`, normal: `0px 2px 4px ${colors.mercury.normal}` },
  transparent: { dark: `0px 0px 0px ${colors.transparent.dark}`, light: `0px 0px 0px ${colors.transparent.light}`, normal: `0px 0px 0px ${colors.transparent.normal}` },
  blueTransparent: { dark: `-4px 4px 4px ${colors.blueTransparent.dark}`, light: `-4px 4px 4px ${colors.blueTransparent.light}`, normal: `-4px 4px 4px ${colors.blueTransparent.normal}` },
  autoComplete: { dark: `0 0 0 1000px ${colors.transparent.dark} inset`, light: `0 0 0 1000px ${colors.transparent.light} inset`, normal: `0 0 0 1000px ${colors.transparent.normal} inset` },
};

const spacing = (...values: number[]) => {
  if (values.length === 0 || values.length > 4) return "0em";
  return values.reduce((finalValue, value) => `${finalValue} ${value * 0.25}em`, "").trim();
};

const breakpoints = {
  xs: "@media only screen and (min-width: 0em)",
  sm: "@media only screen and (min-width: 48em)",
  md: "@media only screen and (min-width: 64em)",
  lg: "@media only screen and (min-width: 75em)",
  mobileAndTablet: "@media only screen and (max-width: 1023px)",
};

const base = {
  font: {
    family: { primary: "'PT Serif', sans-serif" },
    size: {
      h1: "3.75rem", h2: "3rem", h3: "2.5rem", h4: "2.25rem", h5: "1.625rem", h6: "1.5rem",
      subtitle1: "1.1375rem", subtitle2: "1.25rem",
      paragraph1: "1.125rem", paragraph2: "1rem", paragraphFooter: "0.95rem", paragraph3: "0.875rem",
      caption2: "0.8rem", caption: "0.75rem", help: "0.625em", small: "0.5rem",
    },
    letterSpacing: { small: "-0.03125rem", medium: "0.25rem", large: "0.375rem", normal: "0rem" },
    lineHeight: { small: "1.8rem", medium: "2.5rem", large: "3rem", normal: "normal", caption: "0.95rem", caption2: "1.375rem" },
  },
  transitions: {
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeOut: "cubic-bezier(0.0, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    },
    linear: { normal: "linear" },
    duration: {
      shortest: "150ms", shorter: "200ms", short: "250ms", standard: "300ms", complex: "375ms",
      enteringScreen: "225ms", leavingScreen: "195ms",
    },
  },
  zIndex: { initial: 0, backward: -1, forward: 1, fixed: 2, higher: 3, super: 100 },
  borderRadius: { none: "unset", button: "100px", small: "3px", medium: "8px", large: "18px", total: "50%", quickLinks: " 10px 0 0 10px" },
  containerWidth: {
    xs: { width: "93%", maxWidth: "93%" },
    sm: { width: "85%", maxWidth: "85%" },
    md: { width: "75%", maxWidth: "75%" },
    lg: { width: "72%", maxWidth: "72em" },
    fluid: { width: "100%", maxWidth: "120em" },
  },
  tooltipSize: { small: "10em", medium: "20em", large: "30em" },
  utils: { spacing },
  flexboxgrid: {
    gridSize: 12,
    gutterWidth: 0,
    outerMargin: 0,
    mediaQuery: "only screen",
    breakpoints: { xs: 0, sm: 48, md: 64, lg: 75 },
  },
  breakpoints,
};

export const libraryTheme = {
  ...base,
  name: "LIGHT",
  isMobile: false,
  colors: {
    cards: { disabled: colors.lightGrayTransparent.normal },
    recharts: { axisColor: colors.blue.normal, barColor: colors.gray.normal },
    separator: {
      primary: colors.lightGray, secondary: colors.darkBlue, tertiary: colors.blue, quaternary: colors.white,
      calendar: { dark: colors.lightGray.normal, light: colors.lightGray.normal, normal: colors.lightGray.normal },
      stickyMenu: colors.blue, megaMenuChild: colors.blue, transparent: colors.transparent,
      megaMenu: { dark: colors.lightGray.normal, light: colors.lightGray.normal, normal: colors.lightGray.normal },
    },
    border: {
      primary: colors.blue, secondary: colors.green, active: colors.green, transparent: colors.transparent,
      disabled: colors.gray, tertiary: colors.lightGray, tabs: colors.darkGray, download: colors.darkGray,
      contact: colors.white, quinary: colors.darkBlue, subtle: colors.gray.medium,
    },
    bg: {
      tertiary: colors.darkBlue, background: colors.white, certifications: colors.blueGray.background,
      footerSpacer: colors.gray.dark, bvcStock: colors.darkGray, accessibilityBar: colors.darkGray,
      disabled: colors.gray, quinary: colors.darkBlue, footer: colors.darkGray, primary: colors.blue,
      megaMenu: colors.lightGray, megaMenuIcons: colors.darkBlue, quickLinks: colors.darkBlue,
      secondary: colors.green, danger: colors.red, success: colors.green, quickLink: colors.darkBlueTransparent,
      transparent: colors.transparent, chartTooltip: colors.darkGray,
      tickerHeader: { dark: colors.darkGray.dark, light: colors.darkGray.dark, normal: colors.darkGray.dark },
      tickerBody: colors.lightGray, tickerShadow: colors.darkGrayHardTransparent,
      overlay: { dark: colors.darkBlueTransparent.dark, light: colors.darkBlueTransparent.light, normal: colors.darkBlueTransparent.normal },
      calendar: colors.white,
      serviceCard: { dark: colors.darkBlue.dark, light: colors.white.dark, normal: colors.white.dark },
      tableHover: colors.grayTransparent, filters: colors.darkBlue, tableHeader: colors.darkGray,
      simpleBannerFilter: { dark: colors.blue.dark, normal: colors.darkBlue.normal, light: colors.darkBlue.light },
      imageCardBase: colors.cornflowerBlue, imageCard: colors.blueFilters, simpleBannerButton: colors.white,
      download: colors.darkBlue, overlayDark: colors.blackTransparent, inactive: colors.orange,
      accentPrimary: colors.orange.normal, surfaceSoft: colors.lightGraySoft.normal,
      successSoft: colors.mint.light, warningSoft: colors.orange.lightSoft,
    },
    font: {
      primary: colors.white, secondary: colors.blue, tertiary: colors.darkBlue, active: colors.green,
      danger: colors.red, success: colors.green, disabled: colors.gray, info: colors.gray,
      calendar: colors.darkBlue, contact: colors.lightGray, transparent: colors.transparent,
      serviceCard: { dark: colors.darkGray.light, light: colors.white.light, normal: colors.darkGray.light },
      megaMenu: { item: colors.darkBlue.light, child: colors.darkBlue.light, mobile: colors.darkBlue.normal },
      quaternary: colors.darkGray,
      recharts: { dark: colors.gray.dark, normal: colors.gray.dark, light: colors.gray.dark },
      button: colors.blue,
      richText: { text: colors.darkBlue.light, list: colors.green.normal },
      stepByStepText: colors.lightBlue, controlPrimary: colors.darkGray.dark, controlSecondary: colors.gray.dark,
    },
    chart: {
      layout: { backgroundColor: colors.white.dark, fontFamily: base.font.family.primary, textColor: colors.gray.dark },
      grid: {
        vertLines: { color: colors.lightGrayTransparent.dark, visible: true },
        horzLines: { color: colors.lightGrayTransparent.dark, visible: true },
      },
      priceScale: { borderColor: colors.blue.light },
      timeScale: { borderColor: colors.blue.light },
    },
    series: {
      topColor: colors.transparent.normal, bottomColor: colors.transparent.normal, lineColor: colors.blue.normal,
      crosshairMarkerRadius: 8, priceLineVisible: false, lastValueVisible: false, lineWidth: 2,
    },
    hover: { arrows: colors.blue.normal },
    hovers: {
      rectangularNovelty: colors.blue.normal, socialNetworks: palette.orange[400], brands: palette.orange[400],
      quinary: colors.darkBlue,
    },
  },
  boxShadow: {
    primary: shadows.gray, calendar: shadows.mercury, secondary: shadows.blackTransparent,
    tertiary: shadows.blueTransparent, autoComplete: shadows.autoComplete,
  },
  button: { primary: colors.blue, disabled: colors.gray.light },
};
