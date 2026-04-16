const BASE_BY_MODE = {
  midnight: "bg-slate-950 text-slate-100",
  light: "bg-slate-100 text-slate-900"
};

const SHARED_BY_MODE = {
  midnight:
    "[&_input]:bg-slate-900/70 [&_input]:border [&_input]:border-slate-700 [&_input]:text-slate-100 [&_input]:placeholder:text-slate-500 " +
    "[&_select]:bg-slate-900/70 [&_select]:border [&_select]:border-slate-700 [&_select]:text-slate-100 " +
    "[&_textarea]:bg-slate-900/70 [&_textarea]:border [&_textarea]:border-slate-700 [&_textarea]:text-slate-100 " +
    "[&_.btn]:rounded-xl [&_.btn]:border-slate-600 [&_.btn]:bg-slate-800/80 [&_.btn]:text-slate-200 hover:[&_.btn]:bg-slate-700/80 " +
    "[&_.btn.solid]:border-blue-500 [&_.btn.solid]:bg-blue-600 [&_.btn.solid]:text-white hover:[&_.btn.solid]:bg-blue-500",
  light:
    "[&_input]:bg-white [&_input]:border [&_input]:border-slate-300 [&_input]:text-slate-900 [&_input]:placeholder:text-slate-500 " +
    "[&_select]:bg-white [&_select]:border [&_select]:border-slate-300 [&_select]:text-slate-900 " +
    "[&_textarea]:bg-white [&_textarea]:border [&_textarea]:border-slate-300 [&_textarea]:text-slate-900 " +
    "[&_.btn]:rounded-xl [&_.btn]:border-slate-300 [&_.btn]:bg-white [&_.btn]:text-slate-800 hover:[&_.btn]:bg-slate-100 " +
    "[&_.btn.solid]:border-blue-600 [&_.btn.solid]:bg-blue-600 [&_.btn.solid]:text-white hover:[&_.btn.solid]:bg-blue-500"
};

const EMPLOYEE_BY_MODE = {
  midnight:
    "[&_.fincore-panel]:rounded-2xl [&_.fincore-panel]:border [&_.fincore-panel]:border-slate-700/60 [&_.fincore-panel]:bg-slate-900/60 [&_.fincore-panel]:shadow-xl [&_.fincore-panel]:backdrop-blur-sm " +
    "[&_.fincore-chip]:rounded-xl [&_.fincore-chip]:border [&_.fincore-chip]:border-slate-700/50 [&_.fincore-chip]:bg-slate-900/40 " +
    "[&_.fincore-input]:bg-slate-900/70 [&_.fincore-input]:border [&_.fincore-input]:border-slate-700 [&_.fincore-input]:text-slate-100 [&_.fincore-input]:placeholder:text-slate-500 " +
    "[&_.fincore-primary-btn]:bg-blue-600 [&_.fincore-primary-btn]:text-white hover:[&_.fincore-primary-btn]:bg-blue-500 " +
    "[&_.fincore-secondary-btn]:bg-slate-800 [&_.fincore-secondary-btn]:text-slate-200 [&_.fincore-secondary-btn]:border [&_.fincore-secondary-btn]:border-slate-600 hover:[&_.fincore-secondary-btn]:bg-slate-700 " +
    "[&_.fincore-link]:text-blue-300 hover:[&_.fincore-link]:text-blue-200 " +
    "[&_.fincore-empty-state]:border-slate-700/50 [&_.fincore-empty-state]:bg-slate-900/40",
  light:
    "[&_.fincore-panel]:rounded-2xl [&_.fincore-panel]:border [&_.fincore-panel]:border-slate-300 [&_.fincore-panel]:bg-white [&_.fincore-panel]:shadow-lg " +
    "[&_.fincore-chip]:rounded-xl [&_.fincore-chip]:border [&_.fincore-chip]:border-slate-300 [&_.fincore-chip]:bg-slate-50 " +
    "[&_.fincore-input]:bg-white [&_.fincore-input]:border [&_.fincore-input]:border-slate-300 [&_.fincore-input]:text-slate-900 [&_.fincore-input]:placeholder:text-slate-500 " +
    "[&_.fincore-primary-btn]:bg-blue-600 [&_.fincore-primary-btn]:text-white hover:[&_.fincore-primary-btn]:bg-blue-500 " +
    "[&_.fincore-secondary-btn]:bg-white [&_.fincore-secondary-btn]:text-slate-800 [&_.fincore-secondary-btn]:border [&_.fincore-secondary-btn]:border-slate-300 hover:[&_.fincore-secondary-btn]:bg-slate-100 " +
    "[&_.fincore-link]:text-blue-700 hover:[&_.fincore-link]:text-blue-600 " +
    "[&_.fincore-empty-state]:border-slate-300 [&_.fincore-empty-state]:bg-slate-50"
};

const ADMIN_BY_MODE = {
  midnight:
    "[&_.card]:rounded-2xl [&_.card]:border [&_.card]:border-slate-700/60 [&_.card]:bg-slate-900/50 [&_.card]:shadow-xl [&_.card]:backdrop-blur-sm " +
    "[&_.section-heading_h3]:text-slate-100 [&_.section-heading_span]:text-slate-400 " +
    "[&_.stat-card]:rounded-2xl [&_.stat-card]:border [&_.stat-card]:border-slate-700/60 [&_.stat-card]:bg-slate-900/60 [&_.stat-card]:shadow-lg " +
    "[&_.stat-card_strong]:text-slate-100 [&_.stat-card_span]:text-slate-400 [&_.stat-card.accent]:bg-gradient-to-br [&_.stat-card.accent]:from-blue-600/30 [&_.stat-card.accent]:to-cyan-500/10 " +
    "[&_.request-table_th]:bg-slate-800/70 [&_.request-table_th]:text-slate-300 [&_.request-table_td]:text-slate-200 [&_.request-table_td]:border-b [&_.request-table_td]:border-slate-700/50 " +
    "[&_.request-table_tr:hover_td]:bg-slate-800/40 [&_.empty-state]:text-slate-400",
  light:
    "[&_.card]:rounded-2xl [&_.card]:border [&_.card]:border-slate-300 [&_.card]:bg-white [&_.card]:shadow-lg " +
    "[&_.section-heading_h3]:text-slate-900 [&_.section-heading_span]:text-slate-600 " +
    "[&_.stat-card]:rounded-2xl [&_.stat-card]:border [&_.stat-card]:border-slate-300 [&_.stat-card]:bg-white [&_.stat-card]:shadow " +
    "[&_.stat-card_strong]:text-slate-900 [&_.stat-card_span]:text-slate-600 [&_.stat-card.accent]:bg-gradient-to-br [&_.stat-card.accent]:from-blue-100 [&_.stat-card.accent]:to-cyan-50 " +
    "[&_.request-table_th]:bg-slate-100 [&_.request-table_th]:text-slate-700 [&_.request-table_td]:text-slate-800 [&_.request-table_td]:border-b [&_.request-table_td]:border-slate-200 " +
    "[&_.request-table_tr:hover_td]:bg-slate-50 [&_.empty-state]:text-slate-600"
};

const safeMode = (mode) => (mode === "light" ? "light" : "midnight");

export const getPortalThemeClass = (mode) => `theme-${safeMode(mode)}`;

export const getEmployeePortalTheme = (mode) => {
  const key = safeMode(mode);
  return `${BASE_BY_MODE[key]} ${SHARED_BY_MODE[key]} ${EMPLOYEE_BY_MODE[key]}`;
};

export const getAdminPortalTheme = (mode) => {
  const key = safeMode(mode);
  return `${BASE_BY_MODE[key]} ${SHARED_BY_MODE[key]} ${ADMIN_BY_MODE[key]}`;
};
