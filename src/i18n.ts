export type Lang = 'English' | 'Amharic';

export const i18n = {
  English: {
    // Tabs
    Overview: 'Overview',
    Transactions: 'Transactions',
    Plan: 'Plan',
    People: 'People',
    Note: 'Note',
    Import: 'Import',
    Review: 'Review',
    Settings: 'Settings',

    // Summary
    Income: 'Income',
    Spending: 'Spending',
    NetCashFlow: 'Net cash flow',
    TotalReportedBalance: 'Total reported balance',
    Accounts: 'Accounts',
    ReportedBalances: 'Reported balances',
    LatestKnownReports: 'Latest known reports · not a live bank connection',
    NoActivePackage: 'No active package',
    NextMobilePackage: 'Next mobile package',
    Expires: 'Expires',
    SamplePackage: 'Sample package · demo data',

    // Charts & Activity
    CashFlow: 'Cash flow',
    Monthly: 'Monthly',
    Weekly: 'Weekly',
    Week: 'Week',
    Month: 'Month',
    Day: 'Day',
    Hour: 'Hour',
    Year: 'Year',
    SpendingByCategory: 'Spending by category',
    TotalSpent: 'Total spent',
    NoSpendingPeriod: 'No spending in this period.',
    ReviewInbox: 'Review inbox',
    Pending: 'pending',
    PossibleOwnTransfer: 'Possible own transfer',
    ReviewDecisions: 'Review decisions',
    ReviewTransfersFlagged: 'Review transfers and flagged records',
    RecentActivity: 'Recent activity',
    SeeAll: 'See all',
    NoActivity: 'No activity matches this view.',
    TimeUnknown: 'Time unknown',
    OwnTransfer: 'Own transfer',

    // Calendar
    CalendarReport: 'Calendar report',
    TransactionsCount: 'Transactions',
    ApplyPeriod: 'Apply period',
    AnchorDate: 'Anchor date · Gregorian',
    ReportLevel: 'Report level',

    // Search & Filter
    SearchTransactions: 'Search transactions…',
    SearchPeople: 'Search…',
    ExportCSV: 'Export CSV',
    AccountActivity: 'Account activity',
    All: 'All',
    In: 'In',
    Out: 'Out',
    Transfers: 'Transfers',
    AllTran: 'All tran',
    AllAccounts: 'All accounts',
    NoPeopleMatch: 'No people match these filters.',

    // Plan
    MonthlySpendingLimit: 'Monthly spending limit',
    CategoryLimits: 'Category limits',
    AddCategoryLimit: 'Add category limit',
    AddSpendingLimit: 'Add a category spending limit.',
    Overspent: 'Overspent',
    Remaining: 'Remaining',
    SelectedMonth: 'Selected month',
    SelectedPeriod: 'Selected period',
    PostedSpendingOnly: 'Posted spending only',
    Goals: 'Goals',
    NewGoal: 'New goal',
    EditGoal: 'Edit goal',
    AddContribution: 'Add contribution',
    Recurring: 'Recurring',
    AddCommitment: 'Add commitment',
    EditCommitment: 'Edit commitment',
    PostPayment: 'Post payment',
    ScheduledOnly: 'Scheduled only. Counts as spending when a transaction is posted.',

    // Notes
    NewNote: 'New note',
    EditNote: 'Edit note',
    YourSpaceToRemember: 'Your space to remember',
    NoNotesYet: 'No notes yet. Keep a thought, plan, or reminder here.',

    // Install & Device
    InstallBirrX: 'Install BirrX',
    InstallBirrXApp: 'Install BirrX App',
    FastOfflineAccess: 'Fast offline access on your home screen',
    Install: 'Install',
    InstalledStandalone: 'Installed (Standalone)',
    AddToHomeScreen: 'Add to home screen',
    OfflineCapability: 'Offline capability',
    ServiceWorkerActive: 'Service Worker active',
    ThisDevice: 'This device',
    Online: 'Online',
    Offline: 'Offline (Local data active)',

    // Categories
    CatIncome: 'Income',
    CatFood: 'Food',
    CatTransport: 'Transport',
    CatHousing: 'Housing',
    CatUtilities: 'Utilities',
    CatFees: 'Fees',
    CatOther: 'Other'
  },
  Amharic: {
    // Tabs
    Overview: 'አጠቃላይ',
    Transactions: 'ግብይቶች',
    Plan: 'እቅድ',
    People: 'ሰዎች',
    Note: 'ማስታወሻ',
    Import: 'አስመጣ',
    Review: 'ግምገማ',
    Settings: 'ቅንብሮች',

    // Summary
    Income: 'ገቢ',
    Spending: 'ወጪ',
    NetCashFlow: 'ቀሪ ፍሰት',
    TotalReportedBalance: 'ጠቅላላ የተገለጸ ቀሪ ሂሳብ',
    Accounts: 'ሂሳቦች',
    ReportedBalances: 'የተገለጹ ሂሳቦች',
    LatestKnownReports: 'የቅርብ ጊዜ ሪፖርቶች · የቀጥታ የባንክ ግንኙነት አይደለም',
    NoActivePackage: 'ምንም ንቁ ጥቅል የለም',
    NextMobilePackage: 'ቀጣይ የሞባይል ጥቅል',
    Expires: 'የሚያበቃበት',
    SamplePackage: 'የናሙና ጥቅል · ማሳያ መረጃ',

    // Charts & Activity
    CashFlow: 'የገንዘብ ፍሰት',
    Monthly: 'ወርሃዊ',
    Weekly: 'ሳምንታዊ',
    Week: 'ሳምንት',
    Month: 'ወር',
    Day: 'ቀን',
    Hour: 'ሰዓት',
    Year: 'ዓመት',
    SpendingByCategory: 'ወጪ በምድብ',
    TotalSpent: 'ጠቅላላ የወጣ',
    NoSpendingPeriod: 'በዚህ ወቅት ምንም ወጪ የለም።',
    ReviewInbox: 'የግምገማ ሳጥን',
    Pending: 'በመጠባበቅ ላይ',
    PossibleOwnTransfer: 'የራስ ሂሳብ ዝውውር ሊሆን የሚችል',
    ReviewDecisions: 'ውሳኔዎችን ይገምግሙ',
    ReviewTransfersFlagged: 'ዝውውሮችን እና ምልክት የተደረገባቸውን ይገምግሙ',
    RecentActivity: 'የቅርብ ጊዜ እንቅስቃሴ',
    SeeAll: 'ሁሉንም ይመልከቱ',
    NoActivity: 'ከዚህ እይታ ጋር የሚዛመድ እንቅስቃሴ የለም።',
    TimeUnknown: 'ሰዓቱ ያልታወቀ',
    OwnTransfer: 'የራስ ዝውውር',

    // Calendar
    CalendarReport: 'የቀን መቁጠሪያ ሪፖርት',
    TransactionsCount: 'ግብይቶች',
    ApplyPeriod: 'ወቅትን ተግብር',
    AnchorDate: 'መነሻ ቀን · ጎርጎሪዮሳዊ',
    ReportLevel: 'የሪፖርት ደረጃ',

    // Search & Filter
    SearchTransactions: 'ግብይቶችን ይፈልጉ…',
    SearchPeople: 'ሰዎችን ይፈልጉ…',
    ExportCSV: 'በCSV ላክ',
    AccountActivity: 'የሂሳብ እንቅስቃሴ',
    All: 'ሁሉም',
    In: 'ገቢ',
    Out: 'ወጪ',
    Transfers: 'ዝውውሮች',
    AllTran: 'ሁሉም ግብይቶች',
    AllAccounts: 'ሁሉም ሂሳቦች',
    NoPeopleMatch: 'ማጣሪያውን የሚያሟላ ሰው አልተገኘም።',

    // Plan
    MonthlySpendingLimit: 'የወር የወጪ ገደብ',
    CategoryLimits: 'የምድብ ገደቦች',
    AddCategoryLimit: 'የምድብ ገደብ አክል',
    AddSpendingLimit: 'የምድብ ወጪ ገደብ ያክሉ።',
    Overspent: 'ከገደብ በላይ የወጣ',
    Remaining: 'የቀረ',
    SelectedMonth: 'የተመረጠው ወር',
    SelectedPeriod: 'የተመረጠው ወቅት',
    PostedSpendingOnly: 'የተመዘገቡ ወጪዎች ብቻ',
    Goals: 'ግቦች',
    NewGoal: 'አዲስ ግብ',
    EditGoal: 'ግብ አርትዕ',
    AddContribution: 'መዋጮ ጨምር',
    Recurring: 'ተደጋጋሚ',
    AddCommitment: 'ተደጋጋሚ ክፍያ ጨምር',
    EditCommitment: 'ክፍያን አርትዕ',
    PostPayment: 'ክፍያ መዝግብ',
    ScheduledOnly: 'መርሐግብር የተያዘለት ብቻ። ግብይቱ ሲመዘገብ እንደ ወጪ ይቆጠራል።',

    // Notes
    NewNote: 'አዲስ ማስታወሻ',
    EditNote: 'ማስታወሻ አርትዕ',
    YourSpaceToRemember: 'የሚያስታውሱበት ቦታዎ',
    NoNotesYet: 'እስካሁን ምንም ማስታወሻ የለም። ሃሳብ፣ እቅድ ወይም ማስታወሻ እዚህ ያስቀምጡ።',

    // Install & Device
    InstallBirrX: 'BirrXን ጫን',
    InstallBirrXApp: 'BirrX መተግበሪያን ጫን',
    FastOfflineAccess: 'በመነሻ ስክሪንዎ ላይ ፈጣን ከመስመር ውጭ አጠቃቀም',
    Install: 'ጫን',
    InstalledStandalone: 'ተጭኗል (ራሱን የቻለ)',
    AddToHomeScreen: 'ወደ መነሻ ስክሪን አክል',
    OfflineCapability: 'ከመስመር ውጭ የመስራት አቅም',
    ServiceWorkerActive: 'ሰርቪስ ወርከር ነቅቷል',
    ThisDevice: 'ይህ መሣሪያ',
    Online: 'መስመር ላይ',
    Offline: 'ከመስመር ውጭ (የአካባቢ መረጃ ነቅቷል)',

    // Categories
    CatIncome: 'ገቢ',
    CatFood: 'ምግብ',
    CatTransport: 'ትራንስፖርት',
    CatHousing: 'ቤት/ኪራይ',
    CatUtilities: 'መገልገያዎች',
    CatFees: 'ክፍያዎች',
    CatOther: 'ሌሎች'
  }
};

export function t(lang: string = 'English', key: keyof typeof i18n['English']): string {
  const l = (lang === 'Amharic' ? 'Amharic' : 'English') as Lang;
  return i18n[l][key] || i18n['English'][key] || String(key);
}

export function translateCategory(lang: string = 'English', cat: string): string {
  if (lang !== 'Amharic') return cat;
  const map: Record<string, string> = {
    Income: 'ገቢ',
    Food: 'ምግብ',
    Transport: 'ትራንስፖርት',
    Housing: 'ቤት/ኪራይ',
    Utilities: 'መገልገያዎች',
    Fees: 'ክፍያዎች',
    Other: 'ሌሎች'
  };
  return map[cat] || cat;
}

