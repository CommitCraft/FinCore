import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBriefcase,
  FiChevronLeft,
  FiChevronRight,
  FiCheckCircle,
  FiCreditCard,
  FiEye,
  FiEyeOff,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiPlus,
  FiShield,
  FiUser,
  FiX
} from "react-icons/fi";
import { api } from "../api.js";
import { clearAuth, getUser, updateStoredUser } from "../auth.js";
import { bankDirectory, findBankByIfsc, findBankByName } from "../constants/banks.js";
import { getEmployeePortalTheme, getPortalThemeClass } from "../theme/portalTheme.js";
import { getNextPortalThemeMode, getStoredPortalThemeMode, setStoredPortalThemeMode } from "../theme/themeMode.js";

const SIDEBAR_COLLAPSE_STORAGE_KEY = "portal:sidebar-collapsed";

const quickActions = [
  { title: "New Request", subtitle: "Create a new payment link", section: "newPayment", icon: FiPlus },
  { title: "Verify PAN", subtitle: "Check PAN validity", section: "panManagement", icon: FiShield },
  { title: "Add Account", subtitle: "Link a bank account", section: "bankAccounts", icon: FiBriefcase },
  { title: "History", subtitle: "View past transactions", section: "paymentRequests", icon: FiFileText }
];

const sectionMeta = {
  dashboard: { header: "Overview", crumb: "Dashboard" },
  newPayment: { header: "New Payment Request", crumb: "Payments" },
  paymentRequests: { header: "Payment Requests", crumb: "Payments" },
  panManagement: { header: "PAN Management", crumb: "Account" },
  bankAccounts: { header: "Bank Accounts", crumb: "Account" },
  profile: { header: "Profile", crumb: "Account" }
};

const tabToSection = {
  dashboard: "dashboard",
  profile: "profile",
  expense: "newPayment",
  advance: "newPayment",
  history: "paymentRequests",
  pan: "panManagement",
  bank: "bankAccounts"
};

const sectionToTab = {
  dashboard: "dashboard",
  newPayment: "expense",
  paymentRequests: "history",
  panManagement: "pan",
  bankAccounts: "bank",
  profile: "profile"
};

const categories = ["Salary", "Reimbursement", "Freelance", "Other"];

const statusToUi = (status) => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PENDING") return { label: "PENDING", tone: "warn" };
  if (normalized === "APPROVED" || normalized === "COMPLETED") return { label: "COMPLETED", tone: "ok" };
  if (normalized === "REJECTED") return { label: "REJECTED", tone: "bad" };
  return { label: "PROCESSING", tone: "info" };
};

const mapAdvanceToRequest = (item) => {
  const [category = "Other", ...rest] = String(item.reason || "Other").split("|");
  const parsed = statusToUi(item.status);
  return {
    id: item._id,
    amount: Number(item.amount || 0),
    tdsAmount: Number(item.tdsAmount || 0),
    category: category.trim() || "Other",
    description: rest.join("|").trim(),
    status: parsed.label,
    tone: parsed.tone,
    createdAt: item.createdAt
  };
};

const maskPan = (panNumber) => {
  const pan = String(panNumber || "").toUpperCase();
  if (pan.length !== 10) return "Not added";
  return `${pan.slice(0, 3)}*****${pan.slice(8)}`;
};

const buildBankForm = (bankDetails = {}, fallbackName = "") => {
  const bankLookup = findBankByName(bankDetails.bankName);

  return {
    accountHolderName: bankDetails.accountHolderName || fallbackName || "",
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

export default function EmployeePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUser = getUser();

  const [currentUser, setCurrentUser] = useState(initialUser);
  const [activeSection, setActiveSection] = useState(() => {
    const section = tabToSection[searchParams.get("tab") || "dashboard"];
    return section || "dashboard";
  });

  const [requestFilter, setRequestFilter] = useState("ALL");
  const [requestForm, setRequestForm] = useState({ amount: "", category: "", description: "" });
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestError, setRequestError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [themeMode, setThemeMode] = useState(getStoredPortalThemeMode);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === "1";
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [profileStatus, setProfileStatus] = useState("");
  const [profileForm, setProfileForm] = useState({
    email: initialUser?.email || "",
    phone: initialUser?.phone || "",
    fullName: initialUser?.name || "",
    address: initialUser?.address || ""
  });

  const [bankStatus, setBankStatus] = useState("");
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankVisibility, setBankVisibility] = useState({ account: false, confirmAccount: false });
  const [bankForm, setBankForm] = useState(() => buildBankForm(initialUser?.bankDetails, initialUser?.name));
  const [linkedPan, setLinkedPan] = useState(initialUser?.panDetails?.panNumber || "");

  const [panStatusMessage, setPanStatusMessage] = useState("");
  const [panForm, setPanForm] = useState({
    panNumber: initialUser?.panDetails?.panNumber || ""
  });
  const [panDetails, setPanDetails] = useState(initialUser?.panDetails || null);

  const displayName = useMemo(() => String(currentUser?.name || "User").toUpperCase(), [currentUser?.name]);
  const meta = sectionMeta[activeSection] || sectionMeta.dashboard;
  const bankLabel = currentUser?.bankDetails?.bankName || "No bank added";
  const maskedAccount = currentUser?.bankDetails?.accountNumber
    ? `****${String(currentUser.bankDetails.accountNumber).slice(-4)}`
    : "----";
  const ifsc = currentUser?.bankDetails?.ifscCode || "-";
  const branch = currentUser?.bankDetails?.branch || "-";
  const hasBank = Boolean(currentUser?.bankDetails?.bankName && currentUser?.bankDetails?.accountNumber);
  const bankApprovalStatus = String(currentUser?.bankDetails?.status || (hasBank ? "pending" : "")).toLowerCase();
  const bankStatusLabel = bankApprovalStatus === "approved" ? "Verified" : bankApprovalStatus === "rejected" ? "Rejected" : hasBank ? "Pending Review" : "Missing";

  const visibleRequests = useMemo(() => {
    if (requestFilter === "ALL") return requests;
    return requests.filter((item) => item.status === requestFilter);
  }, [requestFilter, requests]);

  const summary = useMemo(() => {
    const pending = requests.filter((item) => item.status === "PENDING").length;
    const processing = requests.filter((item) => item.status === "PROCESSING").length;
    const completed = requests.filter((item) => item.status === "COMPLETED").length;
    const totalCount = requests.length;
    const totalCollected = requests.filter((item) => item.status === "COMPLETED").reduce((acc, item) => acc + item.amount, 0);
    const totalTds = requests.reduce((acc, item) => acc + item.tdsAmount, 0);

    return {
      pending,
      processing,
      completed,
      totalCount,
      totalCollected,
      totalTds,
      fyNet: totalCollected - totalTds
    };
  }, [requests]);

  const employeeThemeClass = useMemo(() => getEmployeePortalTheme(themeMode), [themeMode]);
  const portalThemeClassName = getPortalThemeClass(themeMode);
  const themeToggleLabel = themeMode === "midnight" ? "Light Mode" : "Dark Mode";

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) return;
    const nextSection = tabToSection[tab] || "dashboard";
    setActiveSection((current) => (current === nextSection ? current : nextSection));
  }, [searchParams]);

  useEffect(() => {
    const hydrateUserAndPan = async () => {
      try {
        const [meRes, panRes] = await Promise.all([api.get("/auth/me"), api.get("/pan/my")]);
        const nextUser = {
          ...(meRes.data?.user || {}),
          panDetails: panRes.data?.panDetails || meRes.data?.user?.panDetails || null
        };

        setCurrentUser(nextUser);
        updateStoredUser(nextUser);
        setProfileForm({
          email: nextUser.email || "",
          phone: nextUser.phone || "",
          fullName: nextUser.name || "",
          address: nextUser.address || ""
        });
        setBankForm(buildBankForm(nextUser.bankDetails, nextUser.name));
        setPanDetails(nextUser.panDetails || null);
        setPanForm({ panNumber: nextUser.panDetails?.panNumber || "" });
        setLinkedPan(nextUser.panDetails?.panNumber || "");
      } catch {
        // Keep existing local user snapshot if network request fails.
      }
    };

    hydrateUserAndPan();
  }, []);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoadingRequests(true);
        setRequestError("");
        const { data } = await api.get("/advances/my");
        setRequests((Array.isArray(data) ? data : []).map(mapAdvanceToRequest));
      } catch (error) {
        setRequestError(error.response?.data?.message || "Unable to load payment requests");
      } finally {
        setLoadingRequests(false);
      }
    };

    loadRequests();
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

  const switchSection = (section) => {
    setActiveSection(section);
    setIsSidebarOpen(false);
    const tab = sectionToTab[section] || "dashboard";
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("tab", tab);
      return next;
    });
  };

  const toggleThemeMode = () => {
    setThemeMode((current) => getNextPortalThemeMode(current));
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

  const handleRequestChange = (event) => {
    const { name, value } = event.target;
    setRequestForm((current) => ({ ...current, [name]: value }));
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!requestForm.amount || !requestForm.category) return;

    try {
      setSubmittingRequest(true);
      setRequestMessage("");
      const neededBy = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const reason = `${requestForm.category} | ${requestForm.description || "Payment request"}`;
      const payload = {
        amount: Number(requestForm.amount),
        reason,
        neededBy
      };

      const { data } = await api.post("/advances", payload);
      setRequests((current) => [mapAdvanceToRequest(data), ...current]);
      setRequestForm({ amount: "", category: "", description: "" });
      setRequestMessage("Request submitted successfully.");
      switchSection("paymentRequests");
    } catch (error) {
      setRequestMessage(error.response?.data?.message || "Could not submit request");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const onProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileStatus("");
    try {
      const payload = {
        name: profileForm.fullName,
        email: profileForm.email,
        phone: profileForm.phone,
        address: profileForm.address
      };

      const { data } = await api.patch("/auth/me", payload);
      const mergedUser = { ...(currentUser || {}), ...(data?.user || {}) };
      setCurrentUser(mergedUser);
      updateStoredUser(mergedUser);
      setProfileStatus("Saved successfully.");
    } catch (error) {
      setProfileStatus(error.response?.data?.message || "Could not save profile");
    }
  };

  const onBankChange = (event) => {
    const { name, value } = event.target;
    if (name === "bankName") {
      const bankLookup = findBankByName(value);

      setBankForm((current) => ({
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

      setBankForm((current) => ({
        ...current,
        ifscCode: normalized,
        branch: bankLookup?.branch || "",
        bankName: bankLookup?.name || current.bankName
      }));
      return;
    }

    setBankForm((current) => ({ ...current, [name]: value }));
  };

  const saveBankAccount = async (event) => {
    event.preventDefault();
    setBankStatus("");

    if (bankForm.accountNumber !== bankForm.confirmAccountNumber) {
      setBankStatus("Account numbers do not match.");
      return;
    }

    try {
      const bankLookupByName = findBankByName(bankForm.bankName);
      const bankLookupByIfsc = findBankByIfsc(bankForm.ifscCode);
      const payload = {
        bankDetails: {
          accountHolderName: bankForm.accountHolderName,
          bankName: bankForm.bankName || bankLookupByIfsc?.name || "",
          accountNumber: bankForm.accountNumber,
          ifscCode: bankForm.ifscCode || bankLookupByName?.ifscCode || bankLookupByIfsc?.ifscCode || "",
          branch: bankForm.branch || bankLookupByIfsc?.branch || bankLookupByName?.branch || "",
          upiId: bankForm.upiId
        }
      };
      const { data } = await api.patch("/auth/me", payload);
      const mergedUser = { ...(currentUser || {}), ...(data?.user || {}) };
      setCurrentUser(mergedUser);
      updateStoredUser(mergedUser);
      setBankStatus("Bank details saved.");
      setIsEditingBank(false);
    } catch (error) {
      setBankStatus(error.response?.data?.message || "Could not save bank details");
    }
  };

  const verifyIfscCode = () => {
    const normalized = String(bankForm.ifscCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
    if (!normalized) {
      setBankStatus("Enter IFSC code first.");
      return;
    }

    const bankLookup = findBankByIfsc(normalized);
    if (!bankLookup) {
      setBankStatus("Invalid IFSC code. Please check and try again.");
      return;
    }

    setBankForm((current) => ({
      ...current,
      ifscCode: normalized,
      branch: bankLookup.branch || current.branch,
      bankName: bankLookup.name || current.bankName
    }));
    setBankStatus("IFSC verified successfully.");
  };

  const openBankAccountModal = () => {
    setBankStatus("");
    setIsEditingBank(true);
  };

  const closeBankAccountModal = () => {
    setIsEditingBank(false);
    setBankStatus("");
  };

  const onPanChange = (event) => {
    const value = String(event.target.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    setPanForm({ panNumber: value });
  };

  const savePan = async (event) => {
    event.preventDefault();
    setPanStatusMessage("");
    try {
      const { data } = await api.put("/pan/my", {
        panNumber: panForm.panNumber
      });

      setPanDetails(data?.panDetails || null);
      const mergedUser = {
        ...(currentUser || {}),
        panDetails: data?.panDetails || null
      };
      setCurrentUser(mergedUser);
      updateStoredUser(mergedUser);
      setPanStatusMessage("PAN saved successfully.");
    } catch (error) {
      setPanStatusMessage(error.response?.data?.message || "Could not save PAN");
    }
  };

  const logout = () => {
    clearAuth();
    navigate("/login");
  };

  const navGroups = [
    {
      title: "OVERVIEW",
      links: [{ key: "dashboard", label: "Dashboard", icon: FiGrid }]
    },
    {
      title: "PAYMENTS",
      links: [
        { key: "newPayment", label: "New Payment", icon: FiCreditCard },
        { key: "paymentRequests", label: "Payment Requests", icon: FiFileText }
      ]
    },
    {
      title: "ACCOUNT",
      links: [
        { key: "panManagement", label: "PAN Management", icon: FiShield },
        { key: "bankAccounts", label: "Bank Accounts", icon: FiBriefcase },
        { key: "profile", label: "Profile", icon: FiUser }
      ]
    }
  ];

  const renderDashboard = () => (
    <>
      <header className="fincore-header">
        <h1>Overview</h1>
        <p className="fincore-subtitle">Welcome back, {displayName}</p>
      </header>

      <section className="fincore-grid four">
        <article className="fincore-panel">
          <p className="fincore-muted">Total Collected</p>
          <h2>Rs{summary.totalCollected.toFixed(2)}</h2>
          <p className="fincore-note">All time</p>
        </article>
        <article className="fincore-panel">
          <p className="fincore-muted">TDS Deducted</p>
          <h2>Rs{summary.totalTds.toFixed(2)}</h2>
          <p className="fincore-note">All time</p>
        </article>
        <article className="fincore-panel">
          <p className="fincore-muted">This FY Net FY 2026-27</p>
          <h2>Rs{summary.fyNet.toFixed(2)}</h2>
          <p className="fincore-note">After TDS</p>
        </article>
        <article className="fincore-panel">
          <p className="fincore-muted">Account Status</p>
          <h2 className={String(currentUser?.status || "").toLowerCase() === "active" ? "verified" : ""}>
            {String(currentUser?.status || "pending").toLowerCase() === "active" ? "Verified" : "Pending"}
          </h2>
          <p className="fincore-note">Your account verification state.</p>
        </article>
      </section>

      <section className="fincore-grid four small-row">
        <article className="fincore-chip">
          <span>Pending</span>
          <b className="tone-warn">{summary.pending}</b>
        </article>
        <article className="fincore-chip">
          <span>Processing</span>
          <b className="tone-info">{summary.processing}</b>
        </article>
        <article className="fincore-chip">
          <span>Completed</span>
          <b className="tone-ok">{summary.completed}</b>
        </article>
        <article className="fincore-chip">
          <span>Total</span>
          <b className="tone-neutral">{summary.totalCount}</b>
        </article>
      </section>

      <section className="fincore-section">
        <h3>Quick Actions</h3>
        <div className="fincore-grid four">
          {quickActions.map((action) => {
            const ActionIcon = action.icon;
            return (
              <article className="fincore-panel action" key={action.title}>
                <div className="fincore-action-icon">
                  <ActionIcon />
                </div>
                <h4>{action.title}</h4>
                <p className="fincore-note">{action.subtitle}</p>
                <button className="fincore-link" type="button" onClick={() => switchSection(action.section)}>
                  Open
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="fincore-section">
        <div className="fincore-section-head">
          <h3>Recent Payments</h3>
          <button className="fincore-link" type="button" onClick={() => switchSection("paymentRequests")}>
            View all
          </button>
        </div>

        <article className="fincore-panel fincore-table-card">
          {loadingRequests ? (
            <div className="fincore-empty-state compact">
              <p className="fincore-note">Loading recent requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="fincore-empty-state compact">
              <div className="fincore-empty-icon">
                <FiCreditCard />
              </div>
              <h4>No payments yet</h4>
              <p className="fincore-note">Your recent payments will appear here.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="fincore-data-table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.slice(0, 5).map((item) => (
                    <tr key={item.id}>
                      <td data-label="Amount">
                        <strong>Rs{item.amount.toFixed(2)}</strong>
                      </td>
                      <td data-label="Category">{item.category}</td>
                      <td data-label="Description">{item.description || "-"}</td>
                      <td data-label="Date">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td data-label="Status">
                        <span className={`status-badge status-${String(item.status || "").toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </>
  );

  const renderNewPayment = () => (
    <section className="fincore-section fincore-stack-gap">
      <div className="fincore-page-head">
        <button className="fincore-back" type="button" onClick={() => switchSection("dashboard")}>
          <FiArrowLeft />
          <span>Back</span>
        </button>
        <h2>New Payment Request</h2>
      </div>

      <article className="fincore-panel fincore-form-card">
        <label className="fincore-field-label">Bank Account *</label>
        <div className="fincore-bank-select">
          <div>
            <strong>{displayName}</strong>
            <p className="fincore-note">{maskedAccount} - {ifsc} - {bankLabel}</p>
          </div>
          <span className="fincore-pill">Primary</span>
        </div>
      </article>

      <form className="fincore-panel fincore-form-card" onSubmit={submitRequest}>
        <label className="fincore-field-label" htmlFor="amount">
          Amount (Rs) *
        </label>
        <input
          className="fincore-input"
          id="amount"
          name="amount"
          type="number"
          min="1"
          placeholder="Enter amount"
          value={requestForm.amount}
          onChange={handleRequestChange}
          required
        />

        <label className="fincore-field-label" htmlFor="category">
          Category *
        </label>
        <select
          className="fincore-input"
          id="category"
          name="category"
          value={requestForm.category}
          onChange={handleRequestChange}
          required
        >
          <option value="">Select a category</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label className="fincore-field-label" htmlFor="description">
          Description (optional)
        </label>
        <textarea
          className="fincore-input"
          id="description"
          name="description"
          placeholder="Brief description of the payment"
          rows={4}
          value={requestForm.description}
          onChange={handleRequestChange}
        />

        {requestMessage ? <p className="fincore-note">{requestMessage}</p> : null}

        <div className="fincore-actions-row">
          <button className="fincore-secondary-btn" type="button" onClick={() => switchSection("paymentRequests")}>
            Cancel
          </button>
          <button className="fincore-primary-btn" type="submit" disabled={submittingRequest}>
            {submittingRequest ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </section>
  );

  const renderPaymentRequests = () => (
    <section className="fincore-section fincore-stack-gap">
      <div className="fincore-page-head right-action">
        <h2>Payment Requests</h2>
        <button className="fincore-primary-btn" type="button" onClick={() => switchSection("newPayment")}>
          <FiPlus />
          <span>New Request</span>
        </button>
      </div>

      <article className="fincore-panel fincore-form-card">
        <select className="fincore-input fincore-filter" value={requestFilter} onChange={(event) => setRequestFilter(event.target.value)}>
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </article>

      {requestError ? (
        <article className="fincore-empty-state">
          <div className="fincore-empty-icon">
            <FiAlertCircle />
          </div>
          <h4>Unable to load requests</h4>
          <p className="fincore-note">{requestError}</p>
        </article>
      ) : (
        <article className="fincore-panel fincore-table-card">
          {loadingRequests ? (
            <div className="fincore-empty-state compact">
              <p className="fincore-note">Loading requests...</p>
            </div>
          ) : visibleRequests.length === 0 ? (
            <div className="fincore-empty-state compact">
              <div className="fincore-empty-icon">
                <FiFileText />
              </div>
              <h4>No payment requests</h4>
              <p className="fincore-note">Create your first payment request to get started.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="fincore-data-table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRequests.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Amount">
                        <strong>Rs{item.amount.toFixed(2)}</strong>
                      </td>
                      <td data-label="Category">{item.category}</td>
                      <td data-label="Description">{item.description || "-"}</td>
                      <td data-label="Date">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td data-label="Status">
                        <span className={`status-badge status-${String(item.status || "").toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}
    </section>
  );

  const renderPan = () => (
    <section className="fincore-section fincore-stack-gap">
      <div className="fincore-page-head">
        <h2>PAN Management</h2>
      </div>

      <article className="fincore-panel fincore-info-card">
        <div className="fincore-info-head">
          <div>
            <strong>{maskPan(panDetails?.panNumber)}</strong>
            <p className="fincore-note">{displayName}</p>
          </div>
          <span className={`fincore-pill ${String(panDetails?.status || "").toLowerCase() === "approved" ? "success" : ""}`}>
            <FiCheckCircle />
            <span>{String(panDetails?.status || "pending").toUpperCase()}</span>
          </span>
        </div>
        <hr className="fincore-divider" />
        <p className="fincore-note">Add or update your PAN to keep payment compliance ready.</p>
      </article>

      <form className="fincore-panel fincore-form-card" onSubmit={savePan}>
        <label className="fincore-field-label" htmlFor="panNumber">
          PAN Number
        </label>
        <input
          className="fincore-input"
          id="panNumber"
          name="panNumber"
          value={panForm.panNumber}
          onChange={onPanChange}
          placeholder="ABCDE1234F"
          required
        />
        {panStatusMessage ? <p className="fincore-note">{panStatusMessage}</p> : null}
        <div className="fincore-actions-row">
          <button className="fincore-primary-btn" type="submit">
            Save PAN
          </button>
        </div>
      </form>
    </section>
  );

  const renderBankAccounts = () => (
    <section className="fincore-section fincore-stack-gap">
      <div className="fincore-page-head right-action">
        <h2>Bank Accounts</h2>
        <button className="fincore-primary-btn" type="button" onClick={openBankAccountModal}>
          <FiPlus />
          <span>{hasBank ? "Edit Bank Account" : "Add New Bank Account"}</span>
        </button>
      </div>

      <article className="fincore-panel fincore-info-card">
        <div className="fincore-info-head">
          <div>
            <strong>{bankLabel}</strong>
            <p className="fincore-note">{maskedAccount}</p>
            <p className="fincore-note">{displayName}</p>
            <p className="fincore-note">Status: {bankStatusLabel}</p>
          </div>
          <span className={`fincore-pill ${bankApprovalStatus === "approved" ? "success" : ""}`}>
            <FiCheckCircle />
            <span>{bankStatusLabel}</span>
          </span>
        </div>
        <hr className="fincore-divider" />
        <div className="fincore-bank-grid">
          <div>
            <p className="fincore-muted">IFSC</p>
            <strong>{ifsc}</strong>
          </div>
          <div>
            <p className="fincore-muted">Branch</p>
            <strong>{branch}</strong>
          </div>
        </div>
      </article>

      {isEditingBank ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeBankAccountModal}>
          <div className="detail-modal bank-account-modal" onClick={(event) => event.stopPropagation()}>
            <div className="detail-modal-head">
              <div>
                <h3>{hasBank ? "Edit Bank Account" : "Add New Bank Account"}</h3>
                <p className="modal-subtitle">Fill bank details exactly as per your bank records.</p>
              </div>
              <button className="modal-icon-button" type="button" onClick={closeBankAccountModal} aria-label="Close bank account form">
                <FiX />
              </button>
            </div>

            <form className="detail-modal-body fincore-form-card" onSubmit={saveBankAccount}>
              <h3 className="fincore-form-title">Add New Bank Account</h3>

              <label className="fincore-field-label" htmlFor="linkedPan">
                Linked PAN
              </label>
              <select className="fincore-input" id="linkedPan" name="linkedPan" value={linkedPan} onChange={(event) => setLinkedPan(event.target.value)}>
                <option value="">Select PAN</option>
                {panDetails?.panNumber ? <option value={panDetails.panNumber}>{panDetails.panNumber}</option> : null}
              </select>

              <label className="fincore-field-label" htmlFor="accountHolderName">
                Account Holder Name
              </label>
              <input
                className="fincore-input"
                id="accountHolderName"
                name="accountHolderName"
                value={bankForm.accountHolderName}
                onChange={onBankChange}
                placeholder="As per bank records"
                required
              />

              <div className="fincore-two-col">
                <div>
                  <label className="fincore-field-label" htmlFor="accountNumber">
                    Account Number
                  </label>
                  <div className="relative">
                    <input
                      className="fincore-input pr-24"
                      id="accountNumber"
                      name="accountNumber"
                      type={bankVisibility.account ? "text" : "password"}
                      value={bankForm.accountNumber}
                      onChange={onBankChange}
                      placeholder="Account number"
                      onCopy={preventClipboardAction}
                      onPaste={preventClipboardAction}
                      onCut={preventClipboardAction}
                      onDragStart={preventClipboardAction}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      className="theme-eye-btn absolute right-2 top-1/2 -translate-y-1/2"
                      type="button"
                      aria-label={bankVisibility.account ? "Hide account number" : "Show account number"}
                      title={bankVisibility.account ? "Hide account number" : "Show account number"}
                      onClick={() => setBankVisibility((current) => ({ ...current, account: !current.account }))}
                    >
                      {bankVisibility.account ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="fincore-field-label" htmlFor="confirmAccountNumber">
                    Confirm Account Number
                  </label>
                  <div className="relative">
                    <input
                      className="fincore-input pr-24"
                      id="confirmAccountNumber"
                      name="confirmAccountNumber"
                      type={bankVisibility.confirmAccount ? "text" : "password"}
                      value={bankForm.confirmAccountNumber}
                      onChange={onBankChange}
                      placeholder="Re-enter account number"
                      onCopy={preventClipboardAction}
                      onPaste={preventClipboardAction}
                      onCut={preventClipboardAction}
                      onDragStart={preventClipboardAction}
                      autoComplete="new-password"
                      required
                    />
                    <button
                      className="theme-eye-btn absolute right-2 top-1/2 -translate-y-1/2"
                      type="button"
                      aria-label={bankVisibility.confirmAccount ? "Hide confirm account number" : "Show confirm account number"}
                      title={bankVisibility.confirmAccount ? "Hide confirm account number" : "Show confirm account number"}
                      onClick={() => setBankVisibility((current) => ({ ...current, confirmAccount: !current.confirmAccount }))}
                    >
                      {bankVisibility.confirmAccount ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="fincore-two-col">
                <div>
                  <label className="fincore-field-label" htmlFor="ifscCode">
                    IFSC Code
                  </label>
                  <div className="fincore-input-row">
                    <input className="fincore-input" id="ifscCode" name="ifscCode" value={bankForm.ifscCode} onChange={onBankChange} placeholder="SBIN0001234" required />
                    <button className="fincore-verify-btn" type="button" onClick={verifyIfscCode}>
                      Verify
                    </button>
                  </div>
                </div>
                <div>
                  <label className="fincore-field-label" htmlFor="bankName">
                    Bank Name
                  </label>
                  <input className="fincore-input" id="bankName" name="bankName" list="bank-directory-options" value={bankForm.bankName} onChange={onBankChange} placeholder="Bank name" required />
                </div>
              </div>

              <div className="fincore-two-col">
                <div>
                  <label className="fincore-field-label" htmlFor="branch">
                    Branch (optional)
                  </label>
                  <input className="fincore-input" id="branch" name="branch" value={bankForm.branch} onChange={onBankChange} placeholder="Branch name" readOnly />
                </div>
                <div>
                  <label className="fincore-field-label" htmlFor="upiId">
                    UPI ID (optional)
                  </label>
                  <input className="fincore-input" id="upiId" name="upiId" value={bankForm.upiId} onChange={onBankChange} placeholder="name@upi" />
                </div>
              </div>

              <datalist id="bank-directory-options">
                {bankDirectory.map((bank) => (
                  <option key={bank.name} value={bank.name} />
                ))}
              </datalist>

              {bankStatus ? <p className="fincore-note">{bankStatus}</p> : null}

              <div className="fincore-actions-row bank-form-actions">
                <button className="fincore-secondary-btn" type="button" onClick={closeBankAccountModal}>
                  Cancel
                </button>
                <button className="fincore-primary-btn" type="submit">
                  {hasBank ? "Update Bank Account" : "Add Bank Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );

  const renderProfile = () => (
    <section className="fincore-section fincore-stack-gap">
      <div className="fincore-page-head">
        <h2>Profile</h2>
      </div>

      <div className="fincore-profile-grid">
        <article className="fincore-panel fincore-info-card">
          <div className="fincore-avatar">U</div>
          <h3>{displayName}</h3>
          <span className="fincore-pill">User</span>
          <hr className="fincore-divider" />
          <p className="fincore-muted">EMAIL</p>
          <strong>{profileForm.email || "-"}</strong>
          <p className="fincore-muted">PHONE</p>
          <strong>{profileForm.phone || "Not set"}</strong>
          <p className="fincore-muted">ADDRESS</p>
          <strong>{profileForm.address || "Not set"}</strong>
        </article>

        <form className="fincore-panel fincore-form-card" onSubmit={saveProfile}>
          <h3>Personal Information</h3>
          <div className="fincore-two-col">
            <div>
              <label className="fincore-field-label" htmlFor="profileEmail">
                Email
              </label>
              <input
                className="fincore-input"
                id="profileEmail"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={onProfileChange}
              />
            </div>
            <div>
              <label className="fincore-field-label" htmlFor="profilePhone">
                Phone
              </label>
              <input
                className="fincore-input"
                id="profilePhone"
                name="phone"
                type="text"
                value={profileForm.phone}
                onChange={onProfileChange}
              />
            </div>
          </div>

          <label className="fincore-field-label" htmlFor="profileName">
            Full Name
          </label>
          <input className="fincore-input" id="profileName" name="fullName" type="text" value={profileForm.fullName} onChange={onProfileChange} />

          <label className="fincore-field-label" htmlFor="profileAddress">
            Address
          </label>
          <textarea
            className="fincore-input"
            id="profileAddress"
            name="address"
            rows={4}
            placeholder="Enter your full address"
            value={profileForm.address}
            onChange={onProfileChange}
          />

          <div className="fincore-actions-row">
            <span className="fincore-note">{profileStatus}</span>
            <button className="fincore-primary-btn" type="submit">
              <FiCheckCircle />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );

  return (
    <div className={`fincore-dashboard portal-theme employee-portal ${portalThemeClassName} ${employeeThemeClass} ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${isSidebarOpen ? "sidebar-open" : ""} min-h-screen`}>
      <aside className="fincore-sidebar employee-sidebar shadow-2xl lg:shadow-none">
        <div className="sidebar-header-row">
          <div className="fincore-brand-box sidebar-brand">
            <div className="fincore-logo sidebar-logo">FC</div>
            <div className="sidebar-brand-text">
              <p className="fincore-muted sidebar-kicker">FINANCE PORTAL</p>
              <strong className="sidebar-brand-title">Fincore Employee</strong>
              <p className="fincore-muted sidebar-brand-subtitle">Self Service</p>
            </div>
          </div>

          <button className="sidebar-toggle-btn" type="button" onClick={toggleSidebarCollapse} aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {isSidebarCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>

          <button className="sidebar-mobile-close" type="button" onClick={closeSidebar} aria-label="Close sidebar">
            <FiX />
          </button>
        </div>

        {navGroups.map((group) => (
          <div className="fincore-nav-group" key={group.title}>
            <p className="fincore-nav-title sidebar-nav-title">{group.title}</p>
            {group.links.map((link) => {
              const LinkIcon = link.icon;
              return (
                <button
                  className={`fincore-nav-link sidebar-link transition-all duration-200 ${activeSection === link.key ? "active" : ""}`}
                  type="button"
                  onClick={() => switchSection(link.key)}
                  key={link.key}
                >
                  <LinkIcon className="sidebar-link-icon" />
                  <span className="sidebar-link-label">{link.label}</span>
                </button>
              );
            })}
          </div>
        ))}

        <div className="fincore-user-card sidebar-footer">
          <div className="sidebar-user-meta">
            <span className="sidebar-user-label fincore-muted">Logged in as</span>
            <strong className="sidebar-user-name">{displayName}</strong>
            <span className="sidebar-user-role">EMPLOYEE</span>
          </div>
          <button className="fincore-signout inline-flex items-center gap-2" type="button" onClick={logout}>
            <FiLogOut />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {isSidebarOpen ? <button className="sidebar-backdrop" type="button" onClick={closeSidebar} aria-label="Close sidebar overlay" /> : null}

      <main className="fincore-main relative">
        <header className="fincore-section-breadcrumb portal-head-row">
          <p className="fincore-breadcrumb">
            {meta.crumb} / {meta.header}
          </p>
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
        </header>

        {activeSection === "dashboard" && renderDashboard()}
        {activeSection === "newPayment" && renderNewPayment()}
        {activeSection === "paymentRequests" && renderPaymentRequests()}
        {activeSection === "panManagement" && renderPan()}
        {activeSection === "bankAccounts" && renderBankAccounts()}
        {activeSection === "profile" && renderProfile()}
      </main>
    </div>
  );
}