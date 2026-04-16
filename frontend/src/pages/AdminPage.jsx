import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { clearAuth, getUser } from "../auth.js";
import { FiAlertCircle, FiBriefcase, FiChevronLeft, FiChevronRight, FiEye, FiEyeOff, FiFileText, FiGrid, FiLayers, FiLogOut, FiMenu, FiShield, FiUserCheck, FiUsers, FiX } from "react-icons/fi";
import { bankDirectory, findBankByIfsc, findBankByName } from "../constants/banks.js";
import { getAdminPortalTheme, getPortalThemeClass } from "../theme/portalTheme.js";
import { getNextPortalThemeMode, getStoredPortalThemeMode, setStoredPortalThemeMode } from "../theme/themeMode.js";

const SIDEBAR_COLLAPSE_STORAGE_KEY = "portal:sidebar-collapsed";

const StatusActions = ({ onUpdate }) => {
  return (
    <div className="inline-actions">
      <button className="btn solid" type="button" onClick={() => onUpdate("APPROVED")}>Approve</button>
      <button className="btn" type="button" onClick={() => onUpdate("REJECTED")}>Reject</button>
    </div>
  );
};

const buildBankForm = (bankDetails = {}) => {
  const bankLookup = findBankByName(bankDetails.bankName);

  return {
    accountHolderName: bankDetails.accountHolderName || "",
    bankName: bankDetails.bankName || "",
    accountNumber: bankDetails.accountNumber || "",
    confirmAccountNumber: bankDetails.accountNumber || "",
    ifscCode: bankDetails.ifscCode || bankLookup?.ifscCode || "",
    branch: bankDetails.branch || bankLookup?.branch || "",
    upiId: bankDetails.upiId || ""
  };
};

const preventClipboardAction = (event) => {
  event.preventDefault();
};

const AdminSidebar = ({ activeSection, onSelectSection, onLogout, user, isCollapsed, onToggleCollapse, onCloseMobile }) => {
  const navGroups = [
    {
      title: "OVERVIEW",
      items: [{ key: "dashboard", label: "Dashboard", icon: FiGrid }]
    },
    {
      title: "APPROVALS",
      items: [
        { key: "pending-users", label: "Pending Users", icon: FiUserCheck },
        { key: "pan-approvals", label: "PAN Approvals", icon: FiShield },
        { key: "bank-approvals", label: "Bank Approvals", icon: FiBriefcase }
      ]
    },
    {
      title: "REQUESTS",
      items: [
        { key: "expenses", label: "Expense Requests", icon: FiFileText },
        { key: "advances", label: "Salary Requests", icon: FiLayers },
        { key: "all", label: "All Requests", icon: FiAlertCircle }
      ]
    },
    {
      title: "ACCOUNT",
      items: [
        { key: "users", label: "Users", icon: FiUsers },
        { key: "roles", label: "Roles", icon: FiShield }
      ]
    }
  ];

  return (
    <aside className="fincore-sidebar admin-sidebar shadow-2xl lg:shadow-none">
      <div className="sidebar-header-row">
        <div className="fincore-brand-box sidebar-brand">
          <div className="fincore-logo sidebar-logo">FC</div>
          <div className="sidebar-brand-text">
            <p className="fincore-muted sidebar-kicker">FINANCE PORTAL</p>
            <strong className="sidebar-brand-title">Fincore Admin</strong>
            <p className="fincore-muted sidebar-brand-subtitle">Operations Desk</p>
          </div>
        </div>

        <button className="sidebar-toggle-btn" type="button" onClick={onToggleCollapse} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>

        <button className="sidebar-mobile-close" type="button" onClick={onCloseMobile} aria-label="Close sidebar">
          <FiX />
        </button>
      </div>

      <nav className="sidebar-nav">
        {navGroups.map((group) => (
          <div className="fincore-nav-group admin-sidebar-group" key={group.title}>
            <p className="fincore-nav-title sidebar-nav-title">{group.title}</p>
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activeSection === item.key ? "fincore-nav-link sidebar-link active transition-all duration-200" : "fincore-nav-link sidebar-link transition-all duration-200"}
                onClick={() => onSelectSection(item.key)}
              >
                <item.icon className="sidebar-link-icon" />
                <span className="sidebar-link-label">{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="fincore-user-card sidebar-footer">
        <div className="sidebar-user-meta">
          <span className="sidebar-user-label fincore-muted">Logged in as</span>
          <strong className="sidebar-user-name">{user?.name || "System Admin"}</strong>
          <span className="sidebar-user-role">{String(user?.role || "ADMIN").toUpperCase()}</span>
        </div>
        <button className="fincore-signout btn solid full-width admin-logout" onClick={onLogout} type="button">
          <FiLogOut />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};

export default function AdminPage() {
  const navigate = useNavigate();
  const user = getUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [themeMode, setThemeMode] = useState(getStoredPortalThemeMode);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === "1";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Different page sizes for different sections
  const PAGE_SIZE_REQUESTS = 10;  // for expenses and advances
  const PAGE_SIZE_USERS = 8;
  const PAGE_SIZE_PENDING = 10;
  
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [users, setUsers] = useState([]);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseFilter, setExpenseFilter] = useState("ALL");
  const [advanceSearch, setAdvanceSearch] = useState("");
  const [advanceFilter, setAdvanceFilter] = useState("ALL");
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [expensePage, setExpensePage] = useState(parseInt(searchParams.get("expensePage")) || 1);
  const [advancePage, setAdvancePage] = useState(parseInt(searchParams.get("advancePage")) || 1);
  const [userPage, setUserPage] = useState(parseInt(searchParams.get("userPage")) || 1);
  const [pendingExpensePage, setPendingExpensePage] = useState(parseInt(searchParams.get("pendingExpensePage")) || 1);
  const [pendingAdvancePage, setPendingAdvancePage] = useState(parseInt(searchParams.get("pendingAdvancePage")) || 1);
  const [pendingPanPage, setPendingPanPage] = useState(parseInt(searchParams.get("pendingPanPage")) || 1);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [bankVisibility, setBankVisibility] = useState({ account: false, confirmAccount: false });
  const [userFormTab, setUserFormTab] = useState("profile");
  const [editingUserId, setEditingUserId] = useState("");
  const [userFormModalOpen, setUserFormModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    panNumber: "",
    panStatus: "pending",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
    upiId: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [detailModal, setDetailModal] = useState({ open: false, title: "", rows: [] });
  const [roles, setRoles] = useState([]);
  const [rolePage, setRolePage] = useState(parseInt(searchParams.get("rolePage")) || 1);
  const [roleSearch, setRoleSearch] = useState("");
  const [editingRoleId, setEditingRoleId] = useState("");
  const [roleFormModalOpen, setRoleFormModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({
    name: "",
    displayName: "",
    description: "",
    permissions: []
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingUsersPage, setPendingUsersPage] = useState(parseInt(searchParams.get("pendingUsersPage")) || 1);
  const [tdsApprovalModal, setTdsApprovalModal] = useState({ open: false, advanceId: "", tdsRate: "10", error: "" });
  const [pendingBankPage, setPendingBankPage] = useState(parseInt(searchParams.get("pendingBankPage")) || 1);

  const normalizeStatus = (status) => String(status || "").toUpperCase();
  const adminThemeClass = useMemo(() => getAdminPortalTheme(themeMode), [themeMode]);
  const portalThemeClassName = getPortalThemeClass(themeMode);
  const themeToggleLabel = themeMode === "midnight" ? "Light Mode" : "Dark Mode";
  const paginate = (items, page, pageSize) => {
    const safePage = Math.max(1, page);
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };
  const totalPages = (count, pageSize) => Math.max(1, Math.ceil(count / pageSize));

  // Sync pagination state to URL
  const updatePaginationParam = (param, value) => {
    if (value > 1) {
      searchParams.set(param, value.toString());
    } else {
      searchParams.delete(param);
    }
    setSearchParams(searchParams);
  };

  useEffect(() => {
    updatePaginationParam("expensePage", expensePage);
  }, [expensePage]);

  useEffect(() => {
    updatePaginationParam("advancePage", advancePage);
  }, [advancePage]);

  useEffect(() => {
    updatePaginationParam("userPage", userPage);
  }, [userPage]);

  useEffect(() => {
    updatePaginationParam("pendingExpensePage", pendingExpensePage);
  }, [pendingExpensePage]);

  useEffect(() => {
    updatePaginationParam("pendingAdvancePage", pendingAdvancePage);
  }, [pendingAdvancePage]);

  useEffect(() => {
    updatePaginationParam("pendingPanPage", pendingPanPage);
  }, [pendingPanPage]);

  useEffect(() => {
    updatePaginationParam("rolePage", rolePage);
  }, [rolePage]);

  useEffect(() => {
    setRolePage(1);
  }, [roleSearch]);

  useEffect(() => {
    updatePaginationParam("pendingUsersPage", pendingUsersPage);
  }, [pendingUsersPage]);

  useEffect(() => {
    updatePaginationParam("pendingBankPage", pendingBankPage);
  }, [pendingBankPage]);

  const loadData = async () => {
    const [expenseRes, advanceRes, usersRes, rolesRes, pendingRes] = await Promise.all([
      api.get("/admin/expenses"),
      api.get("/admin/advances"),
      api.get("/admin/users"),
      api.get("/admin/roles"),
      api.get("/admin/pending-users")
    ]);
    setExpenses(expenseRes.data);
    setAdvances(advanceRes.data);
    setUsers(usersRes.data);
    setRoles(rolesRes.data);
    setPendingUsers(pendingRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setStoredPortalThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, isSidebarCollapsed ? "1" : "0");
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 960px)");
    const handleMediaChange = (event) => {
      if (event.matches) {
        // Prevent getting stuck in collapsed mode when desktop toggle is hidden on mobile.
        setIsSidebarCollapsed(false);
      }
      if (!event.matches) {
        setIsSidebarOpen(false);
      }
    };

    handleMediaChange(mediaQuery);
    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  useEffect(() => {
    setExpensePage(1);
  }, [expenseSearch, expenseFilter]);

  useEffect(() => {
    setAdvancePage(1);
  }, [advanceSearch, advanceFilter]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userRoleFilter]);

  const resetUserForm = () => {
    setEditingUserId("");
    setUserFormTab("profile");
    setUserForm({
      name: "",
      email: "",
      password: "",
      role: "EMPLOYEE",
      panNumber: "",
      panStatus: "pending",
      accountHolderName: "",
      bankName: "",
      accountNumber: "",
      confirmAccountNumber: "",
      ifscCode: "",
      branch: "",
      upiId: ""
    });
  };

  const openUserFormModal = () => {
    resetUserForm();
    setMessage("");
    setError("");
    setUserFormModalOpen(true);
  };

  const closeUserFormModal = () => {
    setUserFormModalOpen(false);
    resetUserForm();
    setError("");
  };

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  const toggleThemeMode = () => {
    setThemeMode((current) => getNextPortalThemeMode(current));
  };

  const updateExpense = async (id, status) => {
    await api.patch(`/admin/expenses/${id}/status`, { status });
    await loadData();
  };

  const updateAdvance = async (id, status) => {
    if (status === "APPROVED") {
      setTdsApprovalModal({ open: true, advanceId: id, tdsRate: "10", error: "" });
      return;
    }

    await api.patch(`/admin/advances/${id}/status`, { status });
    await loadData();
  };

  const closeTdsApprovalModal = () => {
    setTdsApprovalModal({ open: false, advanceId: "", tdsRate: "10", error: "" });
  };

  const handleTdsRateChange = (event) => {
    setTdsApprovalModal((current) => ({ ...current, tdsRate: event.target.value, error: "" }));
  };

  const submitTdsApproval = async (event) => {
    event.preventDefault();
    const rate = Number(tdsApprovalModal.tdsRate);

    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setTdsApprovalModal((current) => ({ ...current, error: "TDS rate must be between 0 and 100" }));
      return;
    }

    try {
      await api.patch(`/admin/advances/${tdsApprovalModal.advanceId}/status`, { status: "APPROVED", tdsRate: rate });
      closeTdsApprovalModal();
      await loadData();
    } catch (requestError) {
      setTdsApprovalModal((current) => ({ ...current, error: requestError.response?.data?.message || "Unable to approve with TDS" }));
    }
  };

  const viewExpenseReceipt = async (expenseId, originalName) => {
    try {
      const response = await api.get(`/admin/expenses/${expenseId}/receipt`, { responseType: "blob" });
      const fileURL = window.URL.createObjectURL(response.data);
      window.open(fileURL, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(fileURL), 30_000);
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to open receipt ${originalName ? `(${originalName})` : ""}`);
    }
  };

  const handleUserFieldChange = (event) => {
    const { name, value } = event.target;

    if (name === "bankName") {
      const bankLookup = findBankByName(value);

      setUserForm((current) => ({
        ...current,
        bankName: value,
        ifscCode: bankLookup?.ifscCode || "",
        branch: bankLookup?.branch || ""
      }));
      return;
    }

    if (name === "ifscCode") {
      const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
      const bankLookup = findBankByIfsc(normalized);

      setUserForm((current) => ({
        ...current,
        ifscCode: normalized,
        branch: bankLookup?.branch || "",
        bankName: bankLookup?.name || current.bankName
      }));
      return;
    }

    setUserForm((current) => ({ ...current, [name]: value }));
  };

  const verifyUserIfsc = () => {
    const normalized = String(userForm.ifscCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
    if (!normalized) {
      setError("Enter IFSC code first");
      setMessage("");
      return;
    }

    const bankLookup = findBankByIfsc(normalized);
    if (!bankLookup) {
      setError("Invalid IFSC code");
      setMessage("");
      return;
    }

    setUserForm((current) => ({
      ...current,
      ifscCode: normalized,
      branch: bankLookup.branch || current.branch,
      bankName: bankLookup.name || current.bankName
    }));
    setError("");
    setMessage("IFSC verified successfully");
  };

  const handleUserSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (userForm.accountNumber || userForm.confirmAccountNumber) {
        if (userForm.accountNumber !== userForm.confirmAccountNumber) {
          setError("Account numbers do not match");
          return;
        }
      }

      const bankLookupByName = findBankByName(userForm.bankName);
      const bankLookupByIfsc = findBankByIfsc(userForm.ifscCode);
      const payload = { ...userForm };

      if (payload.bankName) {
        payload.bankName = payload.bankName.trim();
      }

      if (payload.bankName || payload.accountNumber || payload.ifscCode || payload.branch || payload.upiId || payload.accountHolderName) {
        payload.bankName = payload.bankName || bankLookupByIfsc?.name || "";
        payload.ifscCode = payload.ifscCode || bankLookupByName?.ifscCode || bankLookupByIfsc?.ifscCode || "";
        payload.branch = payload.branch || bankLookupByIfsc?.branch || bankLookupByName?.branch || "";
      }

      if (payload.panNumber || payload.panStatus) {
        payload.panDetails = {
          panNumber: payload.panNumber,
          status: payload.panStatus
        };
      }

      delete payload.panNumber;
      delete payload.panStatus;
      delete payload.confirmAccountNumber;

      if (editingUserId) {
        if (!payload.password) {
          delete payload.password;
        }
        await api.patch(`/admin/users/${editingUserId}`, payload);
        setMessage("User updated successfully");
      } else {
        await api.post("/admin/users", payload);
        setMessage("User created successfully");
      }

      await loadData();
      closeUserFormModal();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save user");
    }
  };

  const updatePanStatus = async (userId, status) => {
    const confirmed = window.confirm(`Mark PAN as ${String(status).toLowerCase()}?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.patch(`/admin/users/${userId}/pan`, { status });
      setMessage(`PAN ${String(status).toLowerCase()} successfully`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update PAN status");
    }
  };

  const updateBankStatus = async (userId, status) => {
    const confirmed = window.confirm(`Mark bank details as ${String(status).toLowerCase()}?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.patch(`/admin/users/${userId}/bank`, { status });
      setMessage(`Bank details ${String(status).toLowerCase()} successfully`);
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update bank status");
    }
  };

  const startEditUser = (item) => {
    setEditingUserId(item._id);
    setUserFormTab("profile");
    setMessage("");
    setError("");
    setUserFormModalOpen(true);
    setUserForm({
      name: item.name || "",
      email: item.email || "",
      password: "",
      role: item.role || "EMPLOYEE",
      panNumber: item.panDetails?.panNumber || "",
      panStatus: item.panDetails?.status || "pending",
      ...buildBankForm(item.bankDetails)
    });
  };

  const deleteUser = async (id) => {
    const confirmed = window.confirm("Delete this user and all saved bank details?");
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/admin/users/${id}`);
      setMessage("User deleted successfully");
      await loadData();
      if (editingUserId === id) {
        resetUserForm();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete user");
    }
  };

  const resetRoleForm = () => {
    setEditingRoleId("");
    setRoleForm({
      name: "",
      displayName: "",
      description: "",
      permissions: []
    });
  };

  const openRoleFormModal = () => {
    resetRoleForm();
    setError("");
    setMessage("");
    setRoleFormModalOpen(true);
  };

  const closeRoleFormModal = () => {
    setRoleFormModalOpen(false);
    resetRoleForm();
  };

  const handleRoleFieldChange = (event) => {
    const { name, value } = event.target;
    setRoleForm((current) => ({ ...current, [name]: value }));
  };

  const handleRoleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (editingRoleId) {
        await api.patch(`/admin/roles/${editingRoleId}`, {
          displayName: roleForm.displayName,
          description: roleForm.description,
          permissions: roleForm.permissions
        });
        setMessage("Role updated successfully");
      } else {
        await api.post("/admin/roles", roleForm);
        setMessage("Role created successfully");
      }
      await loadData();
      closeRoleFormModal();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save role");
    }
  };

  const deleteRole = async (id) => {
    const role = roles.find((r) => r._id === id);
    const confirmed = window.confirm(`Delete role "${role?.displayName}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/admin/roles/${id}`);
      setMessage("Role deleted successfully");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to delete role");
    }
  };

  const editRole = (role) => {
    setEditingRoleId(role._id);
    setRoleForm({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      permissions: role.permissions || []
    });
    setError("");
    setMessage("");
    setRoleFormModalOpen(true);
  };

  const approveUser = async (userId) => {
    const confirmed = window.confirm("Approve this user?");
    if (!confirmed) {
      return;
    }

    try {
      await api.patch(`/admin/users/${userId}/approve`);
      setMessage("User approved successfully");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to approve user");
    }
  };

  const rejectUser = async (userId) => {
    const confirmed = window.confirm("Reject this user?");
    if (!confirmed) {
      return;
    }

    try {
      await api.patch(`/admin/users/${userId}/reject`);
      setMessage("User rejected successfully");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to reject user");
    }
  };

  const closeDetailModal = () => {
    setDetailModal({ open: false, title: "", rows: [] });
  };

  const handleSelectSection = (section) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((current) => !current);
  };

  const openSidebar = () => {
    setIsSidebarCollapsed(false);
    setIsSidebarOpen(true);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const openRequestDetailModal = (item, type) => {
    if (type === "expense") {
      setDetailModal({
        open: true,
        title: `Expense: ${item.title || "Request"}`,
        rows: [
          { label: "Employee", value: item.user?.name || "-" },
          { label: "Email", value: item.user?.email || "-" },
          { label: "Status", value: item.status || "-" },
          { label: "Amount", value: `₹${item.amount ?? "-"}` },
          { label: "Report Date", value: item.reportDate ? new Date(item.reportDate).toLocaleDateString() : "-" },
          { label: "Description", value: item.description || "-" },
          { label: "Admin Note", value: item.adminNote || "-" }
        ]
      });
      return;
    }

    setDetailModal({
      open: true,
      title: "Salary Request",
      rows: [
        { label: "Employee", value: item.user?.name || "-" },
        { label: "Email", value: item.user?.email || "-" },
        { label: "Status", value: item.status || "-" },
        { label: "Amount", value: `₹${item.amount ?? "-"}` },
        { label: "TDS Rate", value: `${item.tdsRate ?? 0}%` },
        { label: "TDS Amount", value: `₹${item.tdsAmount ?? 0}` },
        { label: "Net Amount", value: `₹${item.netAmount ?? item.amount ?? "-"}` },
        { label: "Needed By", value: item.neededBy ? new Date(item.neededBy).toLocaleDateString() : "-" },
        { label: "Reason", value: item.reason || "-" },
        { label: "Admin Note", value: item.adminNote || "-" }
      ]
    });
  };

  const pendingExpenses = expenses.filter((item) => item.status === "PENDING");
  const pendingAdvances = advances.filter((item) => item.status === "PENDING");
  const pendingPanUsers = users.filter((item) => {
    const panStatus = normalizeStatus(item.panDetails?.status);
    return Boolean(item.panDetails?.panNumber) && panStatus === "PENDING";
  });
  const pendingBankUsers = users.filter((item) => {
    const bankStatus = normalizeStatus(item.bankDetails?.status || (item.bankDetails?.accountNumber ? "PENDING" : ""));
    return Boolean(item.bankDetails?.accountNumber) && bankStatus === "PENDING";
  });
  const approvedCount = [...expenses, ...advances].filter((item) => item.status === "APPROVED").length;
  const rejectedCount = [...expenses, ...advances].filter((item) => item.status === "REJECTED").length;
  const pendingPanCount = pendingPanUsers.length;
  const pendingBankCount = pendingBankUsers.length;
  const pendingUserCount = pendingUsers.length;
  const totalPendingApprovals = pendingExpenses.length + pendingAdvances.length + pendingPanCount + pendingBankCount + pendingUserCount;
  const approvedAmount =
    expenses.filter((item) => normalizeStatus(item.status) === "APPROVED").reduce((sum, item) => sum + Number(item.amount || 0), 0) +
    advances.filter((item) => normalizeStatus(item.status) === "APPROVED").reduce((sum, item) => sum + Number((item.netAmount ?? item.amount) || 0), 0);
  const totalTdsDeducted = advances
    .filter((item) => normalizeStatus(item.status) === "APPROVED")
    .reduce((sum, item) => sum + Number(item.tdsAmount || 0), 0);

  const filteredExpenses = expenses.filter((item) => {
    const matchesStatus = expenseFilter === "ALL" ? true : normalizeStatus(item.status) === expenseFilter;
    const query = expenseSearch.trim().toLowerCase();
    const matchesSearch =
      query.length === 0
        ? true
        : `${item.title || ""} ${item.description || ""} ${item.user?.name || ""} ${item.amount || ""}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const filteredAdvances = advances.filter((item) => {
    const matchesStatus = advanceFilter === "ALL" ? true : normalizeStatus(item.status) === advanceFilter;
    const query = advanceSearch.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ? true : `${item.reason || ""} ${item.user?.name || ""} ${item.amount || ""}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const filteredUsers = users.filter((item) => {
    const roleMatch = userRoleFilter === "ALL" ? true : String(item.role || "") === userRoleFilter;
    const query = userSearch.trim().toLowerCase();
    const searchMatch = query.length === 0 ? true : `${item.name || ""} ${item.email || ""}`.toLowerCase().includes(query);
    return roleMatch && searchMatch;
  });

  const filteredRoles = roles.filter((item) => {
    const query = roleSearch.trim().toLowerCase();
    return query.length === 0 ? true : `${item.name || ""} ${item.displayName || ""} ${item.description || ""}`.toLowerCase().includes(query);
  });

  const pagedExpenses = paginate(filteredExpenses, expensePage, PAGE_SIZE_REQUESTS);
  const pagedAdvances = paginate(filteredAdvances, advancePage, PAGE_SIZE_REQUESTS);
  const pagedUsers = paginate(filteredUsers, userPage, PAGE_SIZE_USERS);
  const pagedRoles = paginate(filteredRoles, rolePage, PAGE_SIZE_USERS);
  const pagedPendingUsers = paginate(pendingUsers, pendingUsersPage, PAGE_SIZE_USERS);
  const pagedPendingPanUsers = paginate(pendingPanUsers, pendingPanPage, PAGE_SIZE_USERS);
  const pagedPendingBankUsers = paginate(pendingBankUsers, pendingBankPage, PAGE_SIZE_USERS);
  const pagedPendingExpenses = paginate(pendingExpenses, pendingExpensePage, PAGE_SIZE_PENDING);
  const pagedPendingAdvances = paginate(pendingAdvances, pendingAdvancePage, PAGE_SIZE_PENDING);
  const selectedTdsAdvance = advances.find((item) => item._id === tdsApprovalModal.advanceId) || null;
  const selectedTdsAdvanceAmount = Number(selectedTdsAdvance?.amount || 0);
  const selectedTdsRate = Number(tdsApprovalModal.tdsRate);
  const selectedTdsDeduction = Number.isFinite(selectedTdsRate) ? Number(((selectedTdsAdvanceAmount * Math.max(0, Math.min(100, selectedTdsRate))) / 100).toFixed(2)) : 0;
  const selectedTdsNetAmount = Number((selectedTdsAdvanceAmount - selectedTdsDeduction).toFixed(2));

  const renderPagination = (page, setPage, total) => {
    if (total <= 1) return null;

    const pageButtons = [];
    const maxVisible = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(total, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
      pageButtons.push(
        <button key="first" className="btn" type="button" onClick={() => setPage(1)}>
          1
        </button>
      );
      if (startPage > 2) {
        pageButtons.push(<span key="dots1" className="pagination-dots">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageButtons.push(
        <button
          key={i}
          className={`btn ${i === page ? "solid" : ""}`}
          type="button"
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }

    if (endPage < total) {
      if (endPage < total - 1) {
        pageButtons.push(<span key="dots2" className="pagination-dots">...</span>);
      }
      pageButtons.push(
        <button key="last" className="btn" type="button" onClick={() => setPage(total)}>
          {total}
        </button>
      );
    }

    return (
      <div className="pagination-row">
        <button className="btn" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
          Prev
        </button>
        <div className="pagination-buttons">
          {pageButtons}
        </div>
        <span className="pagination-info">
          Page {page} / {total}
        </span>
        <button className="btn" type="button" onClick={() => setPage((current) => Math.min(total, current + 1))} disabled={page >= total}>
          Next
        </button>
      </div>
    );
  };

  const renderRequestTable = (items, type) => (
    <div className="table-wrap">
      <table className="request-table">
        <thead>
          <tr>
            <th>Amount</th>
            <th>Details</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td>
                <strong>₹{item.amount}</strong>
                {type === "advance" ? (
                  <p className="request-cell-sub">TDS ₹{item.tdsAmount ?? 0} • Net ₹{item.netAmount ?? item.amount}</p>
                ) : null}
              </td>
              <td>
                <div className="request-cell-stack">
                  <strong>{type === "expense" ? item.title : item.reason}</strong>
                  <span>{item.user?.name || "-"}</span>
                </div>
              </td>
              <td>{new Date(type === "expense" ? item.reportDate : item.neededBy).toLocaleDateString()}</td>
              <td>
                <span className={`status-badge status-${String(item.status || "").toLowerCase()}`}>{item.status}</span>
              </td>
              <td>
                <div className="inline-actions">
                  <button className="btn" type="button" onClick={() => openRequestDetailModal(item, type)}>
                    Open Details
                  </button>
                  {type === "expense" && item.receipt?.key ? (
                    <button className="btn" type="button" onClick={() => viewExpenseReceipt(item._id, item.receipt?.originalName)}>
                      View File
                    </button>
                  ) : null}
                  {normalizeStatus(item.status) === "PENDING" ? (
                    <StatusActions onUpdate={(status) => (type === "expense" ? updateExpense(item._id, status) : updateAdvance(item._id, status))} />
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDashboard = () => (
    <>
      <section className="stats-grid">
        <article className="stat-card accent">
          <span>Pending Expenses</span>
          <strong>{pendingExpenses.length}</strong>
        </article>
        <article className="stat-card">
          <span>Pending Salary Requests</span>
          <strong>{pendingAdvances.length}</strong>
        </article>
        <article className="stat-card">
          <span>Approved</span>
          <strong>{approvedCount}</strong>
        </article>
        <article className="stat-card">
          <span>Rejected</span>
          <strong>{rejectedCount}</strong>
        </article>
        <article className="stat-card accent">
          <span>Approved Amount</span>
          <strong>₹{approvedAmount.toFixed(2)}</strong>
        </article>
        <article className="stat-card">
          <span>TDS Deducted</span>
          <strong>₹{totalTdsDeducted.toFixed(2)}</strong>
        </article>
        <article className="stat-card accent">
          <span>Pending PANs</span>
          <strong>{pendingPanCount}</strong>
        </article>
        <article className="stat-card">
          <span>Pending Banks</span>
          <strong>{pendingBankCount}</strong>
        </article>
        <article className="stat-card accent">
          <span>Pending Users</span>
          <strong>{pendingUserCount}</strong>
        </article>
        <article className="stat-card">
          <span>Total Pending</span>
          <strong>{totalPendingApprovals}</strong>
        </article>
      </section>

      <section className="grid-two">
        <article className="card">
          <h3>Pending Expense Approvals</h3>
          {renderRequestTable(pagedPendingExpenses, "expense")}
          {renderPagination(pendingExpensePage, setPendingExpensePage, totalPages(pendingExpenses.length, PAGE_SIZE_PENDING))}
        </article>

        <article className="card">
          <h3>Pending Salary Request Approvals</h3>
          {renderRequestTable(pagedPendingAdvances, "advance")}
          {renderPagination(pendingAdvancePage, setPendingAdvancePage, totalPages(pendingAdvances.length, PAGE_SIZE_PENDING))}
        </article>
      </section>
    </>
  );

  const renderPanApprovals = () => (
    <section className="admin-pan-section">
      <article className="card section-panel admin-pan-queue">
        <div className="section-heading">
          <h3>PAN Approval Queue</h3>
          <span>{pendingPanUsers.length} pending</span>
        </div>

        {pendingPanUsers.length === 0 ? <p className="empty-state">No pending PAN requests</p> : null}

        <ul className="list admin-pan-list">
          {pagedPendingPanUsers.map((item) => (
            <li key={item._id}>
              <div className="request-row admin-pan-row">
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.email}</p>
                  <span className="request-meta">PAN: {item.panDetails?.panNumber || "-"}</span>
                  <span className="request-meta">Added: {item.panDetails?.addedAt ? new Date(item.panDetails.addedAt).toLocaleDateString() : "-"}</span>
                </div>

                <div className="inline-actions user-approval-actions">
                  <button className="btn solid" type="button" onClick={() => updatePanStatus(item._id, "APPROVED")}>Approve</button>
                  <button className="btn" type="button" onClick={() => updatePanStatus(item._id, "REJECTED")}>Reject</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {renderPagination(pendingPanPage, setPendingPanPage, totalPages(pendingPanUsers.length, PAGE_SIZE_USERS))}
      </article>
    </section>
  );

  const renderBankApprovals = () => (
    <section className="admin-pan-section">
      <article className="card section-panel admin-pan-queue">
        <div className="section-heading">
          <h3>Bank Approval Queue</h3>
          <span>{pendingBankUsers.length} pending</span>
        </div>

        {pendingBankUsers.length === 0 ? <p className="empty-state">No pending bank requests</p> : null}

        <ul className="list admin-pan-list">
          {pagedPendingBankUsers.map((item) => (
            <li key={item._id}>
              <div className="request-row admin-pan-row">
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.email}</p>
                  <span className="request-meta">Bank: {item.bankDetails?.bankName || "-"}</span>
                  <span className="request-meta">Account: {item.bankDetails?.accountNumber || "-"}</span>
                  <span className="request-meta">IFSC: {item.bankDetails?.ifscCode || "-"}</span>
                </div>

                <div className="inline-actions user-approval-actions">
                  <button className="btn solid" type="button" onClick={() => updateBankStatus(item._id, "APPROVED")}>Approve</button>
                  <button className="btn" type="button" onClick={() => updateBankStatus(item._id, "REJECTED")}>Reject</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {renderPagination(pendingBankPage, setPendingBankPage, totalPages(pendingBankUsers.length, PAGE_SIZE_USERS))}
      </article>
    </section>
  );

  const renderUsers = () => (
    <section className="users-section user-list-section">
      <article className="card section-panel">
        <div className="section-heading">
          <h3>User List</h3>
          <div className="inline-actions user-list-actions">
            <span>Manage, edit, or delete users</span>
            <button className="btn solid" type="button" onClick={openUserFormModal}>
              Add User
            </button>
          </div>
        </div>

        <div className="table-toolbar">
          <input type="text" placeholder="Search by name or email" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)}>
            <option value="ALL">All Roles</option>
            {roles.map((role) => (
              <option key={role._id} value={role.name}>
                {role.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table className="request-table admin-user-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>PAN</th>
                <th>Bank Details</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className="request-cell-stack">
                      <strong>{item.name}</strong>
                      <span>{item.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className="status-badge status-approved">{String(item.role || "EMPLOYEE").toUpperCase()}</span>
                  </td>
                  <td>
                    <div className="request-cell-stack">
                      <strong>{item.panDetails?.panNumber || "Not added"}</strong>
                      <span>{String(item.panDetails?.status || "pending").toUpperCase()}</span>
                    </div>
                  </td>
                  <td>
                    <div className="request-cell-stack">
                      <strong>{item.bankDetails?.bankName || "Not added"}</strong>
                      <span>{item.bankDetails?.accountNumber ? `****${String(item.bankDetails.accountNumber).slice(-4)}` : "No account"}</span>
                      <span>{item.bankDetails?.ifscCode || "No IFSC"}</span>
                    </div>
                  </td>
                  <td>
                    <div className="inline-actions user-actions">
                      <button className="btn solid" type="button" onClick={() => startEditUser(item)}>
                        Edit
                      </button>
                      <button className="btn" type="button" onClick={() => deleteUser(item._id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderPagination(userPage, setUserPage, totalPages(filteredUsers.length, PAGE_SIZE_USERS))}
      </article>

      {userFormModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeUserFormModal}>
          <div className="detail-modal form-modal user-form-modal" onClick={(event) => event.stopPropagation()}>
            <div className="detail-modal-head">
              <div>
                <h3>{editingUserId ? "Edit User" : "Add User"}</h3>
                <p className="modal-subtitle">Fill profile, bank, and PAN details before saving.</p>
              </div>
              <button className="modal-icon-button" type="button" onClick={closeUserFormModal} aria-label="Close user form modal">
                <FiX />
              </button>
            </div>

            <div className="detail-modal-body">
              <div className="tab-row" role="tablist" aria-label="User form sections">
                <button type="button" className={userFormTab === "profile" ? "tab-button active" : "tab-button"} onClick={() => setUserFormTab("profile")}>
                  Profile
                </button>
                <button type="button" className={userFormTab === "bank" ? "tab-button active" : "tab-button"} onClick={() => setUserFormTab("bank")}>
                  Bank Details
                </button>
                <button type="button" className={userFormTab === "pan" ? "tab-button active" : "tab-button"} onClick={() => setUserFormTab("pan")}>
                  PAN
                </button>
              </div>

              <form className="user-form" onSubmit={handleUserSubmit}>
                {userFormTab === "profile" ? (
                  <>
                    <input name="name" placeholder="Full name" value={userForm.name} onChange={handleUserFieldChange} required />
                    <input type="email" name="email" placeholder="Email" value={userForm.email} onChange={handleUserFieldChange} required />
                    <input
                      type="password"
                      name="password"
                      placeholder={editingUserId ? "New password (optional)" : "Password"}
                      value={userForm.password}
                      onChange={handleUserFieldChange}
                      required={!editingUserId}
                    />
                    <select name="role" value={userForm.role} onChange={handleUserFieldChange} required>
                      <option value="">Select a role</option>
                      {roles.map((role) => (
                        <option key={role._id} value={role.name}>
                          {role.displayName}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}

                {userFormTab === "bank" ? (
                  <>
                    <div className="full-span user-bank-form-head">
                      <h4 className="user-bank-form-title">Add New Bank Account</h4>
                    </div>

                    <div className="full-span user-bank-field">
                      <label htmlFor="userLinkedPan">Linked PAN</label>
                      <select id="userLinkedPan" name="panNumber" value={userForm.panNumber} onChange={handleUserFieldChange}>
                        <option value="">Select PAN</option>
                        {userForm.panNumber ? <option value={userForm.panNumber}>{userForm.panNumber}</option> : null}
                      </select>
                    </div>

                    <div className="full-span user-bank-field">
                      <label htmlFor="userAccountHolderName">Account Holder Name</label>
                      <input
                        id="userAccountHolderName"
                        name="accountHolderName"
                        placeholder="As per bank records"
                        value={userForm.accountHolderName}
                        onChange={handleUserFieldChange}
                      />
                    </div>

                    <div className="user-bank-field">
                      <label htmlFor="userAccountNumber">Account Number</label>
                      <div className="relative">
                        <input
                          id="userAccountNumber"
                          className="w-full pr-10"
                          name="accountNumber"
                          type={bankVisibility.account ? "text" : "password"}
                          placeholder="Account number"
                          value={userForm.accountNumber}
                          onChange={handleUserFieldChange}
                          onCopy={preventClipboardAction}
                          onPaste={preventClipboardAction}
                          onCut={preventClipboardAction}
                          onDragStart={preventClipboardAction}
                          autoComplete="new-password"
                        />
                        <button
                          className="theme-eye-btn absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-0"
                          type="button"
                          aria-label={bankVisibility.account ? "Hide account number" : "Show account number"}
                          title={bankVisibility.account ? "Hide account number" : "Show account number"}
                          onClick={() => setBankVisibility((current) => ({ ...current, account: !current.account }))}
                        >
                          {bankVisibility.account ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="user-bank-field">
                      <label htmlFor="userConfirmAccountNumber">Confirm Account Number</label>
                      <div className="relative">
                        <input
                          id="userConfirmAccountNumber"
                          className="w-full pr-10"
                          name="confirmAccountNumber"
                          type={bankVisibility.confirmAccount ? "text" : "password"}
                          placeholder="Re-enter account number"
                          value={userForm.confirmAccountNumber}
                          onChange={handleUserFieldChange}
                          onCopy={preventClipboardAction}
                          onPaste={preventClipboardAction}
                          onCut={preventClipboardAction}
                          onDragStart={preventClipboardAction}
                          autoComplete="new-password"
                        />
                        <button
                          className="theme-eye-btn absolute inset-y-0 right-0 flex items-center pr-3 bg-transparent border-0"
                          type="button"
                          aria-label={bankVisibility.confirmAccount ? "Hide confirm account number" : "Show confirm account number"}
                          title={bankVisibility.confirmAccount ? "Hide confirm account number" : "Show confirm account number"}
                          onClick={() => setBankVisibility((current) => ({ ...current, confirmAccount: !current.confirmAccount }))}
                        >
                          {bankVisibility.confirmAccount ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="user-bank-field">
                      <label htmlFor="userIfscCode">IFSC Code</label>
                      <div className="fincore-input-row">
                        <input id="userIfscCode" name="ifscCode" placeholder="SBIN0001234" value={userForm.ifscCode} onChange={handleUserFieldChange} />
                        <button className="fincore-verify-btn" type="button" onClick={verifyUserIfsc}>
                          Verify
                        </button>
                      </div>
                    </div>

                    <div className="user-bank-field">
                      <label htmlFor="userBankName">Bank Name</label>
                      <input id="userBankName" name="bankName" placeholder="Bank name" list="bank-directory-options" value={userForm.bankName} onChange={handleUserFieldChange} />
                    </div>

                    <div className="user-bank-field">
                      <label htmlFor="userBranch">Branch (optional)</label>
                      <input id="userBranch" name="branch" placeholder="Branch name" value={userForm.branch} onChange={handleUserFieldChange} readOnly />
                    </div>

                    <div className="user-bank-field">
                      <label htmlFor="userUpiId">UPI ID (optional)</label>
                      <input id="userUpiId" name="upiId" placeholder="name@upi" value={userForm.upiId} onChange={handleUserFieldChange} />
                    </div>

                    <datalist id="bank-directory-options">
                      {bankDirectory.map((bank) => (
                        <option key={bank.name} value={bank.name} />
                      ))}
                    </datalist>
                  </>
                ) : null}

                {userFormTab === "pan" ? (
                  <>
                    <input name="panNumber" placeholder="PAN number" value={userForm.panNumber} onChange={handleUserFieldChange} />
                    <select name="panStatus" value={userForm.panStatus} onChange={handleUserFieldChange}>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </>
                ) : null}

                {error ? <p className="error full-span">{error}</p> : null}
                {message ? <p className="success full-span">{message}</p> : null}
                <div className="inline-actions full-span user-form-actions">
                  <button className="btn" type="button" onClick={closeUserFormModal}>
                    Cancel
                  </button>
                  <button className="btn solid" type="submit">
                    {editingUserId ? "Update User" : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );

  const renderPendingUsers = () => (
    <section className="pending-users-section">
      <article className="card section-panel">
        <div className="section-heading">
          <h3>Pending User Approvals</h3>
          <span>{pendingUsers.length} pending</span>
        </div>

        {pendingUsers.length === 0 ? (
          <p className="empty-state">No pending users to approve</p>
        ) : null}

        <ul className="list pending-user-list">
          {pagedPendingUsers.map((item) => (
            <li key={item._id}>
              <div className="request-row pending-user-row">
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.email}</p>
                  <span className="request-meta">Role: {item.role}</span>
                  <span className="request-meta">Registered: {new Date(item.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="inline-actions user-approval-actions">
                  <button className="btn solid" type="button" onClick={() => approveUser(item._id)}>
                    Approve
                  </button>
                  <button className="btn" type="button" onClick={() => rejectUser(item._id)}>
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {renderPagination(pendingUsersPage, setPendingUsersPage, totalPages(pendingUsers.length, PAGE_SIZE_USERS))}
      </article>
    </section>
  );

  const renderRoles = () => (
    <section className="roles-section">
      <article className="card section-panel">
        <div className="section-heading">
          <h3>Role List</h3>
          <div className="inline-actions role-actions role-list-header-actions">
            <span>{filteredRoles.length} roles</span>
            <button className="btn solid" type="button" onClick={openRoleFormModal}>
              Add New Role
            </button>
          </div>
        </div>

        <div className="table-toolbar role-toolbar">
          <input type="text" placeholder="Search roles" value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} />
        </div>

        {pagedRoles.length === 0 ? (
          <div className="empty-state role-empty-state">No roles found for this search.</div>
        ) : (
          <div className="table-wrap">
            <table className="request-table admin-user-table role-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedRoles.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <div className="request-cell-stack">
                        <strong>{item.displayName}</strong>
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="request-cell-stack">
                        <span className="role-badges">
                          {item.isSystemRole ? <span className="badge">System Role</span> : null}
                          {item.isDefault ? <span className="badge primary">Default</span> : null}
                          {!item.isSystemRole && !item.isDefault ? <span className="badge disabled">Custom Role</span> : null}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="request-cell-stack">
                        <span>{item.description || "No description"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="inline-actions role-actions">
                        {!item.isSystemRole ? (
                          <>
                            <button className="btn solid" type="button" onClick={() => editRole(item)}>
                              Edit
                            </button>
                            <button className="btn" type="button" onClick={() => deleteRole(item._id)}>
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="badge disabled">Cannot modify</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {renderPagination(rolePage, setRolePage, totalPages(filteredRoles.length, PAGE_SIZE_USERS))}
      </article>

      {roleFormModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeRoleFormModal}>
          <div className="detail-modal form-modal role-form-modal" onClick={(event) => event.stopPropagation()}>
            <div className="detail-modal-head">
              <div>
                <h3>{editingRoleId ? "Edit Role" : "Add New Role"}</h3>
                <p className="modal-subtitle">Create or update a role with the required permissions metadata.</p>
              </div>
              <button className="modal-icon-button" type="button" onClick={closeRoleFormModal} aria-label="Close role form modal">
                <FiX />
              </button>
            </div>

            <form className="detail-modal-body role-form" onSubmit={handleRoleSubmit}>
              <input
                name="name"
                placeholder="Role name (e.g., MANAGER)"
                value={roleForm.name}
                onChange={handleRoleFieldChange}
                disabled={!!editingRoleId}
                required
              />
              <input
                name="displayName"
                placeholder="Display name (e.g., Manager)"
                value={roleForm.displayName}
                onChange={handleRoleFieldChange}
                required
              />
              <textarea
                name="description"
                placeholder="Role description"
                value={roleForm.description}
                onChange={handleRoleFieldChange}
                rows="3"
              />
              {error ? <p className="error full-span">{error}</p> : null}
              {message ? <p className="success full-span">{message}</p> : null}
              <div className="inline-actions role-form-actions full-span">
                <button className="btn" type="button" onClick={closeRoleFormModal}>
                  Cancel
                </button>
                <button className="btn solid" type="submit">
                  {editingRoleId ? "Update Role" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );

  const layoutClasses = ["admin-layout", "fincore-dashboard", "admin-portal", isSidebarCollapsed ? "collapsed sidebar-collapsed" : "", isSidebarOpen ? "sidebar-open" : ""];
  return (
    <main className={`${layoutClasses.join(" ")} portal-theme ${portalThemeClassName} ${adminThemeClass} min-h-screen`}>
      <AdminSidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onLogout={logout}
        user={user}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        onCloseMobile={closeSidebar}
      />

      {isSidebarOpen ? <button className="sidebar-backdrop" type="button" onClick={closeSidebar} aria-label="Close sidebar overlay" /> : null}

      <section className="fincore-main admin-content relative">
        <header className="fincore-header admin-shell-header">
          <div className="portal-head-row">
            <div>
              <p className="fincore-breadcrumb admin-breadcrumb">Admin / Overview</p>
              <h1>Admin Dashboard</h1>
              <p className="fincore-subtitle">Monitor, approve, and reject all finance requests.</p>
            </div>
            <div className="portal-head-actions">
              <button className="sidebar-desktop-toggle" type="button" onClick={toggleSidebarCollapse} aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                {isSidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
              </button>
              <button className="sidebar-mobile-toggle" type="button" onClick={openSidebar} aria-label="Open sidebar menu">
                <FiMenu />
              </button>
              <button className="portal-theme-toggle" type="button" onClick={toggleThemeMode}>
                {themeToggleLabel}
              </button>
            </div>
          </div>
        </header>

        {activeSection === "dashboard" ? renderDashboard() : null}

        {activeSection === "expenses" ? (
          <article className="card section-panel">
            <div className="section-heading">
              <h3>Expense Requests</h3>
              <span>{filteredExpenses.length} shown</span>
            </div>
            <div className="table-toolbar">
              <input type="text" placeholder="Search expense requests" value={expenseSearch} onChange={(e) => setExpenseSearch(e.target.value)} />
              <select value={expenseFilter} onChange={(e) => setExpenseFilter(e.target.value)}>
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            {renderRequestTable(pagedExpenses, "expense")}
            {renderPagination(expensePage, setExpensePage, totalPages(filteredExpenses.length, PAGE_SIZE_REQUESTS))}
          </article>
        ) : null}

        {activeSection === "advances" ? (
          <article className="card section-panel">
            <div className="section-heading">
              <h3>Salary Requests</h3>
              <span>{filteredAdvances.length} shown</span>
            </div>
            <div className="table-toolbar">
              <input type="text" placeholder="Search salary requests" value={advanceSearch} onChange={(e) => setAdvanceSearch(e.target.value)} />
              <select value={advanceFilter} onChange={(e) => setAdvanceFilter(e.target.value)}>
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            {renderRequestTable(pagedAdvances, "advance")}
            {renderPagination(advancePage, setAdvancePage, totalPages(filteredAdvances.length, PAGE_SIZE_REQUESTS))}
          </article>
        ) : null}

        {activeSection === "users" ? renderUsers() : null}

        {activeSection === "pending-users" ? renderPendingUsers() : null}

        {activeSection === "pan-approvals" ? renderPanApprovals() : null}

        {activeSection === "bank-approvals" ? renderBankApprovals() : null}

        {activeSection === "roles" ? renderRoles() : null}

        {activeSection === "all" ? (
          <section className="grid-two">
            <article className="card section-panel">
              <div className="section-heading">
                <h3>All Expenses</h3>
                <span>{filteredExpenses.length} items</span>
              </div>
              {renderRequestTable(pagedExpenses, "expense")}
              {renderPagination(expensePage, setExpensePage, totalPages(filteredExpenses.length, PAGE_SIZE_REQUESTS))}
            </article>

            <article className="card section-panel">
              <div className="section-heading">
                <h3>All Salary Requests</h3>
                <span>{filteredAdvances.length} items</span>
              </div>
              {renderRequestTable(pagedAdvances, "advance")}
              {renderPagination(advancePage, setAdvancePage, totalPages(filteredAdvances.length, PAGE_SIZE_REQUESTS))}
            </article>
          </section>
        ) : null}

        {detailModal.open ? (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeDetailModal}>
            <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="detail-modal-head">
                <div>
                  <h3>{detailModal.title}</h3>
                  <p className="modal-subtitle">Review the selected record details below.</p>
                </div>
                <button className="modal-icon-button" type="button" onClick={closeDetailModal} aria-label="Close details modal">
                  <FiX />
                </button>
              </div>
              <div className="detail-modal-body">
                {detailModal.rows.map((row) => (
                  <div key={row.label} className="detail-row">
                    <span className="detail-label">{row.label}</span>
                    <span className="detail-value">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {tdsApprovalModal.open ? (
          <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeTdsApprovalModal}>
            <div className="detail-modal tds-modal" onClick={(e) => e.stopPropagation()}>
              <div className="detail-modal-head">
                <div>
                  <h3>Approve Salary Request</h3>
                  <p className="modal-subtitle">Set the deduction rate before approving the payout.</p>
                </div>
                <button className="modal-icon-button" type="button" onClick={closeTdsApprovalModal} aria-label="Close salary request modal">
                  <FiX />
                </button>
              </div>
              <form className="detail-modal-body" onSubmit={submitTdsApproval}>
                <div className="grid grid-two tds-summary-grid gap-3 mb-2">
                  <div className="tds-summary-card">
                    <span>Advance Amount</span>
                    <strong>₹{selectedTdsAdvanceAmount.toFixed(2)}</strong>
                  </div>
                  <div className="tds-summary-card">
                    <span>TDS Deduction</span>
                    <strong>₹{selectedTdsDeduction.toFixed(2)}</strong>
                  </div>
                  <div className="tds-summary-card">
                    <span>Net Amount</span>
                    <strong>₹{selectedTdsNetAmount.toFixed(2)}</strong>
                  </div>
                  <div className="tds-summary-card">
                    <span>TDS Rate</span>
                    <strong>{Number.isFinite(selectedTdsRate) ? `${selectedTdsRate}%` : "0%"}</strong>
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="tdsRate">TDS Rate (%)</label>
                  <input
                    id="tdsRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={tdsApprovalModal.tdsRate}
                    onChange={handleTdsRateChange}
                    required
                  />
                </div>
                {tdsApprovalModal.error ? <p className="error">{tdsApprovalModal.error}</p> : null}
                <div className="inline-actions">
                  <button className="btn" type="button" onClick={closeTdsApprovalModal}>
                    Cancel
                  </button>
                  <button className="btn solid" type="submit">
                    Approve
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
