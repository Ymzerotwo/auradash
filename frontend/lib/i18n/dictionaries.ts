// To maintain strict typing, we infer the types from the English files
import type commonEn from '../../lang/en/common.json';
import type systemEn from '../../lang/en/system.json';
import type loginEn from '../../lang/en/login.json';
import type workspaceEn from '../../lang/en/general.json';
import type sidebarEn from '../../lang/en/sidebar.json';
import type forgotpasswordEn from '../../lang/en/forgotpassword.json';
import type usersEn from '../../lang/en/users.json';
import type profileEn from '../../lang/en/profile.json';
import type mediaEn from '../../lang/en/media.json';
import type servicesEn from '../../lang/en/services.json';
import type categoriesEn from '../../lang/en/categories.json';
import type dashboardEn from '../../lang/en/dashboard.json';
import type topbarEn from '../../lang/en/topbar.json';
import type articlesEn from '../../lang/en/articles.json';
import type commentsEn from '../../lang/en/comments.json';
import type inboxEn from '../../lang/en/inbox.json';
import type customersEn from '../../lang/en/customers.json';
import type apikeysEn from '../../lang/en/apikeys.json';
import type bookingsEn from '../../lang/en/bookings.json';

export type Dictionary = {
  common: typeof commonEn;
  system: typeof systemEn;
  login: typeof loginEn;
  workspace: typeof workspaceEn;
  sidebar: typeof sidebarEn;
  forgotpassword: typeof forgotpasswordEn;
  users: typeof usersEn;
  profile: typeof profileEn;
  media: typeof mediaEn;
  services: typeof servicesEn;
  categories: typeof categoriesEn;
  dashboard: typeof dashboardEn;
  topbar: typeof topbarEn;
  articles: typeof articlesEn;
  comments: typeof commentsEn;
  inbox: typeof inboxEn;
  customers: typeof customersEn;
  apikeys: typeof apikeysEn;
  bookings: typeof bookingsEn;
};

export type Locale = 'en' | 'ar';

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: async () => {
    const common = await import('../../lang/en/common.json').then((module) => module.default);
    const system = await import('../../lang/en/system.json').then((module) => module.default);
    const login = await import('../../lang/en/login.json').then((module) => module.default);
    const workspace = await import('../../lang/en/general.json').then((module) => module.default);
    const sidebar = await import('../../lang/en/sidebar.json').then((module) => module.default);
    const forgotpassword = await import('../../lang/en/forgotpassword.json').then((module) => module.default);
    const users = await import('../../lang/en/users.json').then((module) => module.default);
    const profile = await import('../../lang/en/profile.json').then((module) => module.default);
    const media = await import('../../lang/en/media.json').then((module) => module.default);
    const services = await import('../../lang/en/services.json').then((module) => module.default);
    const categories = await import('../../lang/en/categories.json').then((module) => module.default);
    const dashboard = await import('../../lang/en/dashboard.json').then((module) => module.default);
    const topbar = await import('../../lang/en/topbar.json').then((module) => module.default);
    const articles = await import('../../lang/en/articles.json').then((module) => module.default);
    const comments = await import('../../lang/en/comments.json').then((module) => module.default);
    const inbox = await import('../../lang/en/inbox.json').then((module) => module.default);
    const customers = await import('../../lang/en/customers.json').then((module) => module.default);
    const apikeys = await import('../../lang/en/apikeys.json').then((module) => module.default);
    const bookings = await import('../../lang/en/bookings.json').then((module) => module.default);
    return { common, system, login, workspace, sidebar, forgotpassword, users, profile, media, services, categories, dashboard, topbar, articles, comments, inbox, customers, apikeys, bookings };
  },
  ar: async () => {
    const common = await import('../../lang/ar/common.json').then((module) => module.default);
    const system = await import('../../lang/ar/system.json').then((module) => module.default);
    const login = await import('../../lang/ar/login.json').then((module) => module.default);
    const workspace = await import('../../lang/ar/general.json').then((module) => module.default);
    const sidebar = await import('../../lang/ar/sidebar.json').then((module) => module.default);
    const forgotpassword = await import('../../lang/ar/forgotpassword.json').then((module) => module.default);
    const users = await import('../../lang/ar/users.json').then((module) => module.default);
    const profile = await import('../../lang/ar/profile.json').then((module) => module.default);
    const media = await import('../../lang/ar/media.json').then((module) => module.default);
    const services = await import('../../lang/ar/services.json').then((module) => module.default);
    const categories = await import('../../lang/ar/categories.json').then((module) => module.default);
    const dashboard = await import('../../lang/ar/dashboard.json').then((module) => module.default);
    const topbar = await import('../../lang/ar/topbar.json').then((module) => module.default);
    const articles = await import('../../lang/ar/articles.json').then((module) => module.default);
    const comments = await import('../../lang/ar/comments.json').then((module) => module.default);
    const inbox = await import('../../lang/ar/inbox.json').then((module) => module.default);
    const customers = await import('../../lang/ar/customers.json').then((module) => module.default);
    const apikeys = await import('../../lang/ar/apikeys.json').then((module) => module.default);
    const bookings = await import('../../lang/ar/bookings.json').then((module) => module.default);
    return { common, system, login, workspace, sidebar, forgotpassword, users, profile, media, services, categories, dashboard, topbar, articles, comments, inbox, customers, apikeys, bookings };
  },
};

export const getDictionary = async (locale: Locale | string): Promise<Dictionary> => {
  // Security Hardening: Protect against prototype pollution and invalid locale injections
  if (locale !== 'en' && locale !== 'ar') {
    return dictionaries.en();
  }
  return dictionaries[locale]();
};
