export type Lang = "nl" | "he" | "en";

export const LANGS: Lang[] = ["nl", "he", "en"];

export const LANG_LABELS: Record<Lang, string> = {
  nl: "NL",
  en: "EN",
  he: "עב",
};

export function isRTL(lang: Lang): boolean {
  return lang === "he";
}

type Dict = Record<string, string>;

const nl: Dict = {
  // navigation
  appName: "Prop-Scanner",
  home: "Home",
  admin: "Admin",
  login: "Inloggen",
  logout: "Uitloggen",
  search: "Zoeken",

  // stats
  totalProperties: "Totaal panden",
  avgDiscount: "Gem. korting",
  lastScan: "Laatste scan",
  never: "Nooit",

  // filters
  filters: "Filters",
  freeText: "Zoek op stad, postcode of straat",
  area: "Gebied",
  type: "Type",
  allTypes: "Alle types",
  rooms: "Kamers",
  allRooms: "Alle",
  minDiscount: "Min. korting %",
  source: "Bron",
  favoritesOnly: "Alleen favorieten",
  aiAnalyzed: "Alleen AI-geanalyseerd",
  sort: "Sorteer",
  apply: "Toepassen",
  reset: "Reset",
  bestDeals: "Beste deals (AI)",

  // property types
  apartment: "Appartement",
  house: "Woning",
  apartmentBuilding: "Opbrengsteigendom",
  commercial: "Handelspand",
  land: "Bouwgrond",

  // deal labels
  excellentDeal: "Uitstekende deal",
  goodDeal: "Goede deal",
  checkRequired: "Controleren vereist",
  notRecommended: "Niet aanbevolen",
  underMarket: "onder markt",
  market: "Markt",
  savings: "Besparing",
  pricePerSqm: "€/m²",

  // split status
  officialySplit: "Officieel gesplitst",
  notOfficialySplit: "Niet officieel gesplitst",
  partiallySplit: "Gedeeltelijk gesplitst",
  notMentioned: "Niet vermeld",
  unknown: "Onbekend",

  // actions
  sendEmail: "Stuur naar mijzelf",
  sendToAgent: "Email naar makelaar",
  addNote: "Notitie toevoegen",
  analyze: "Analyseren",
  reanalyze: "Opnieuw analyseren",
  refresh: "Vernieuwen",
  save: "Opslaan",
  cancel: "Annuleren",
  close: "Sluit",
  details: "Meer details",
  viewOnSource: "Bekijk op",
  viewOriginal: "Bekijk originele advertentie",

  // sort
  highestDiscount: "Hoogste korting",
  newest: "Nieuwste eerst",
  lowestPrice: "Laagste prijs",
  lowestPricePerSqm: "Laagste €/m²",
  bestAiDeals: "Beste AI deals",

  // alerts
  alertRules: "Alert regels",
  addAlert: "Alert toevoegen",
  immediate: "Direct",
  summary: "Samenvatting",
  morning: "Ochtend",
  afternoon: "Middag",
  evening: "Avond",
  alertName: "Naam regel",
  alertMode: "Modus",
  maxPricePerSqm: "Max €/m²",

  // sources
  manageSources: "Beheer bronnen",
  enableSource: "Activeren",
  disableSource: "Deactiveren",

  // admin
  scanNow: "Nu scannen",
  scanning: "Bezig met scannen…",
  marketAverages: "Markt gemiddeldes",
  userManagement: "Gebruikers",
  scanHistory: "Scan geschiedenis",
  searchAreas: "Zoekgebieden",
  addArea: "Gebied toevoegen",
  delete: "Verwijderen",

  // email
  emailSent: "Email verzonden",
  emailFailed: "Verzenden mislukt",
  emailToAgent: "Email naar makelaar",
  emailSubject: "Onderwerp",
  emailBody: "Bericht",
  emailTo: "Aan",
  send: "Verzenden",

  // messages
  noResults: "Geen panden gevonden voor deze filters.",
  loading: "Laden…",
  error: "Er is iets misgegaan.",
  success: "Gelukt.",
  newProperty: "NIEUW",
  topDeal: "Topdeal",
  resultsCount: "panden gevonden",
  list: "Lijst",
  map: "Kaart",

  // time
  daysAgo: "dagen geleden",
  hoursAgo: "uur geleden",
  justNow: "Zojuist",

  // login
  loginTitle: "Prop-Scanner",
  loginTagline: "Vind ondergewaardeerd vastgoed in België",
  email: "Email",
  password: "Wachtwoord",
  loginButton: "Inloggen",
  loginError: "Verkeerd email of wachtwoord",

  // notes
  noteContent: "Notitie",
  noteTag: "Tag",
  tagInteresting: "Interessant",
  tagIrrelevant: "Niet relevant",
  tagToView: "Bekijken",
  previousNotes: "Eerdere notities",

  // ai
  aiAnalysisTitle: "AI Analyse",
  aiScore: "Score",
  generating: "Bezig met genereren…",

  // PWA install
  installAppTitle: "Installeer Prop-Scanner op je toestel",
  installAppCta: "Installeren",
  installNow: "Installeer nu",
  installLater: "Later",
  installIosTitle: "Installeer Prop-Scanner op je iPhone",
  installIosStep1: "Tik op de deelknop onderaan in Safari",
  installIosStep2: "Scroll en kies 'Zet op beginscherm'",
  installIosStep3: "Tik op 'Voeg toe' rechtsboven",
  installIosFooter: "Daarna verschijnt het Prop-Scanner-icoon op je beginscherm en opent het in een eigen venster, net als een app.",

  // Email status
  sending: "Bezig met verzenden…",
  emailSelfSuccess: "Mail naar jezelf verzonden ✅",
  emailAgentSuccess: "Mail naar makelaar verzonden ✅",
  emailErrorTitle: "Verzenden mislukt",
};

const en: Dict = {
  appName: "Prop-Scanner",
  home: "Home",
  admin: "Admin",
  login: "Login",
  logout: "Logout",
  search: "Search",

  totalProperties: "Total properties",
  avgDiscount: "Avg. discount",
  lastScan: "Last scan",
  never: "Never",

  filters: "Filters",
  freeText: "Search city, postal code or street",
  area: "Area",
  type: "Type",
  allTypes: "All types",
  rooms: "Rooms",
  allRooms: "All",
  minDiscount: "Min. discount %",
  source: "Source",
  favoritesOnly: "Favorites only",
  aiAnalyzed: "AI-analyzed only",
  sort: "Sort",
  apply: "Apply",
  reset: "Reset",
  bestDeals: "Best deals (AI)",

  apartment: "Apartment",
  house: "House",
  apartmentBuilding: "Apartment building",
  commercial: "Commercial",
  land: "Land",

  excellentDeal: "Excellent deal",
  goodDeal: "Good deal",
  checkRequired: "Check required",
  notRecommended: "Not recommended",
  underMarket: "below market",
  market: "Market",
  savings: "Savings",
  pricePerSqm: "€/m²",

  officialySplit: "Officially split",
  notOfficialySplit: "Not officially split",
  partiallySplit: "Partially split",
  notMentioned: "Not mentioned",
  unknown: "Unknown",

  sendEmail: "Email to myself",
  sendToAgent: "Email to agent",
  addNote: "Add note",
  analyze: "Analyze",
  reanalyze: "Re-analyze",
  refresh: "Refresh",
  save: "Save",
  cancel: "Cancel",
  close: "Close",
  details: "More details",
  viewOnSource: "View on",
  viewOriginal: "View original listing",

  highestDiscount: "Highest discount",
  newest: "Newest first",
  lowestPrice: "Lowest price",
  lowestPricePerSqm: "Lowest €/m²",
  bestAiDeals: "Best AI deals",

  alertRules: "Alert rules",
  addAlert: "Add alert",
  immediate: "Immediate",
  summary: "Summary",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  alertName: "Rule name",
  alertMode: "Mode",
  maxPricePerSqm: "Max €/m²",

  manageSources: "Manage sources",
  enableSource: "Enable",
  disableSource: "Disable",

  scanNow: "Scan now",
  scanning: "Scanning…",
  marketAverages: "Market averages",
  userManagement: "Users",
  scanHistory: "Scan history",
  searchAreas: "Search areas",
  addArea: "Add area",
  delete: "Delete",

  emailSent: "Email sent",
  emailFailed: "Sending failed",
  emailToAgent: "Email to agent",
  emailSubject: "Subject",
  emailBody: "Message",
  emailTo: "To",
  send: "Send",

  noResults: "No properties match these filters.",
  loading: "Loading…",
  error: "Something went wrong.",
  success: "Success.",
  newProperty: "NEW",
  topDeal: "Top deal",
  resultsCount: "properties found",
  list: "List",
  map: "Map",

  daysAgo: "days ago",
  hoursAgo: "hours ago",
  justNow: "Just now",

  loginTitle: "Prop-Scanner",
  loginTagline: "Find undervalued real estate in Belgium",
  email: "Email",
  password: "Password",
  loginButton: "Login",
  loginError: "Wrong email or password",

  noteContent: "Note",
  noteTag: "Tag",
  tagInteresting: "Interesting",
  tagIrrelevant: "Not relevant",
  tagToView: "To view",
  previousNotes: "Previous notes",

  aiAnalysisTitle: "AI Analysis",
  aiScore: "Score",
  generating: "Generating…",

  // PWA install
  installAppTitle: "Install Prop-Scanner on your device",
  installAppCta: "Install",
  installNow: "Install now",
  installLater: "Later",
  installIosTitle: "Install Prop-Scanner on your iPhone",
  installIosStep1: "Tap the Share button at the bottom of Safari",
  installIosStep2: "Scroll down and choose 'Add to Home Screen'",
  installIosStep3: "Tap 'Add' in the top right",
  installIosFooter: "The Prop-Scanner icon will appear on your home screen and open in its own window, just like an app.",

  // Email status
  sending: "Sending…",
  emailSelfSuccess: "Email sent to yourself ✅",
  emailAgentSuccess: "Email sent to the agent ✅",
  emailErrorTitle: "Failed to send",
};

const he: Dict = {
  appName: "Prop-Scanner",
  home: "בית",
  admin: "ניהול",
  login: "התחבר",
  logout: "התנתק",
  search: "חיפוש",

  totalProperties: "סה״כ נכסים",
  avgDiscount: "הנחה ממוצעת",
  lastScan: "סריקה אחרונה",
  never: "מעולם לא",

  filters: "סינונים",
  freeText: "חפש לפי עיר, מיקוד או רחוב",
  area: "אזור",
  type: "סוג",
  allTypes: "כל הסוגים",
  rooms: "חדרים",
  allRooms: "הכל",
  minDiscount: "מינ׳ הנחה %",
  source: "מקור",
  favoritesOnly: "מועדפים בלבד",
  aiAnalyzed: "AI מנותח בלבד",
  sort: "מיון",
  apply: "החל",
  reset: "אפס",
  bestDeals: "העסקאות הטובות (AI)",

  apartment: "דירה",
  house: "בית",
  apartmentBuilding: "נכס מניב",
  commercial: "מסחרי",
  land: "קרקע",

  excellentDeal: "עסקה מצוינת",
  goodDeal: "עסקה טובה",
  checkRequired: "דורש בדיקה",
  notRecommended: "לא מומלץ",
  underMarket: "מתחת לשוק",
  market: "שוק",
  savings: "חיסכון",
  pricePerSqm: "€/מ״ר",

  officialySplit: "פיצול רשמי",
  notOfficialySplit: "לא פוצל רשמית",
  partiallySplit: "פיצול חלקי",
  notMentioned: "לא צוין",
  unknown: "לא ידוע",

  sendEmail: "שלח לעצמי",
  sendToAgent: "שלח למתווך",
  addNote: "הוסף הערה",
  analyze: "נתח",
  reanalyze: "נתח מחדש",
  refresh: "רענן",
  save: "שמור",
  cancel: "ביטול",
  close: "סגור",
  details: "פרטים נוספים",
  viewOnSource: "צפה ב-",
  viewOriginal: "צפה במודעה המקורית",

  highestDiscount: "הנחה הכי גבוהה",
  newest: "החדשים ביותר",
  lowestPrice: "המחיר הנמוך ביותר",
  lowestPricePerSqm: "מחיר נמוך למ״ר",
  bestAiDeals: "עסקאות AI הטובות",

  alertRules: "כללי התראה",
  addAlert: "הוסף התראה",
  immediate: "מיידי",
  summary: "סיכום",
  morning: "בוקר",
  afternoon: "צהריים",
  evening: "ערב",
  alertName: "שם הכלל",
  alertMode: "מצב",
  maxPricePerSqm: "מקס €/מ״ר",

  manageSources: "ניהול מקורות",
  enableSource: "הפעל",
  disableSource: "השבת",

  scanNow: "סרוק עכשיו",
  scanning: "סורק…",
  marketAverages: "ממוצעי שוק",
  userManagement: "משתמשים",
  scanHistory: "היסטוריית סריקות",
  searchAreas: "אזורי חיפוש",
  addArea: "הוסף אזור",
  delete: "מחק",

  emailSent: "המייל נשלח",
  emailFailed: "השליחה נכשלה",
  emailToAgent: "מייל למתווך",
  emailSubject: "נושא",
  emailBody: "הודעה",
  emailTo: "אל",
  send: "שלח",

  noResults: "לא נמצאו נכסים עבור הסינון הזה.",
  loading: "טוען…",
  error: "משהו השתבש.",
  success: "הצליח.",
  newProperty: "חדש",
  topDeal: "מציאה",
  resultsCount: "נכסים נמצאו",
  list: "רשימה",
  map: "מפה",

  daysAgo: "ימים",
  hoursAgo: "שעות",
  justNow: "הרגע",

  loginTitle: "Prop-Scanner",
  loginTagline: "מצא נדל״ן שמתומחר נמוך בבלגיה",
  email: "אימייל",
  password: "סיסמה",
  loginButton: "התחבר",
  loginError: "אימייל או סיסמה שגויים",

  noteContent: "הערה",
  noteTag: "תגית",
  tagInteresting: "מעניין",
  tagIrrelevant: "לא רלוונטי",
  tagToView: "לצפייה",
  previousNotes: "הערות קודמות",

  aiAnalysisTitle: "ניתוח AI",
  aiScore: "ציון",
  generating: "מייצר…",

  // PWA install
  installAppTitle: "התקן את Prop-Scanner על המכשיר שלך",
  installAppCta: "התקנה",
  installNow: "התקן עכשיו",
  installLater: "מאוחר יותר",
  installIosTitle: "התקנת Prop-Scanner על iPhone",
  installIosStep1: "לחץ על כפתור השיתוף 📤 בתחתית Safari",
  installIosStep2: "גלול למטה ובחר \"הוסף למסך הבית\"",
  installIosStep3: "לחץ \"הוסף\" בפינה הימנית העליונה",
  installIosFooter: "אחר כך האייקון של Prop-Scanner יופיע על מסך הבית וייפתח בחלון נפרד — בדיוק כמו אפליקציה.",

  // Email status
  sending: "שולח…",
  emailSelfSuccess: "המייל נשלח אליך ✅",
  emailAgentSuccess: "המייל נשלח לסוכן ✅",
  emailErrorTitle: "השליחה נכשלה",
};

const dicts: Record<Lang, Dict> = { nl, en, he };

export function t(lang: Lang, key: string): string {
  return dicts[lang]?.[key] ?? dicts.nl[key] ?? key;
}

export const LANG_STORAGE_KEY = "prop-scanner-lang";
