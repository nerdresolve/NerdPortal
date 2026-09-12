import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { resolveUser, isAdminUser } from "../services/auth";
import {
  getSystems,
  clientFetch,
  createSystem,
  updateSystem,
  deleteSystem,
} from "../services/api";
import styles from "../styles/Systems.module.css";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "deprecated", label: "Deprecated" },
  { value: "offline", label: "Offline" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "internal", label: "Internal" },
  { value: "external", label: "External" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "saas", label: "SaaS" },
];

// Display names for the stored category values, so the table shows "SaaS"
// rather than a CSS-capitalized "Saas".
const CATEGORY_LABELS = CATEGORY_OPTIONS.reduce((acc, opt) => {
  if (opt.value) acc[opt.value] = opt.label;
  return acc;
}, {});

const STATUS_LABELS = {
  active: "Active",
  maintenance: "Maintenance",
  deprecated: "Deprecated",
  offline: "Offline",
};

const STATUS_BADGE = {
  active: "badge-active",
  maintenance: "badge-maintenance",
  deprecated: "badge-offline",
  offline: "badge-offline",
};

const EMPTY_FORM = {
  name: "",
  url: "",
  description: "",
  status: "active",
  category: "internal",
};

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";

  let user = null;
  let systems = [];
  let loadError = "";

  try {
    const [resolvedUser, result] = await Promise.all([
      resolveUser(cookie),
      getSystems(cookie, { limit: "50" }),
    ]);
    user = resolvedUser;
    if (result.success) systems = result.data.items || [];
    else loadError = result.error || "Could not load the systems right now.";
  } catch (e) {
    loadError = "Could not load the systems right now.";
  }

  return {
    props: { user, initialSystems: systems, initialLoadError: loadError },
  };
}

export default function SystemsPage({ user, initialSystems, initialLoadError }) {
  const [systems, setSystems] = useState(initialSystems);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState(initialLoadError || "");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formTouched, setFormTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const isAdmin = isAdminUser(user);

  function showToast(msg, type = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  async function reload(newStatus = statusFilter, newCategory = categoryFilter) {
    setLoading(true);
    try {
      const params = { limit: "50" };
      if (newStatus) params.status = newStatus;
      if (newCategory) params.category = newCategory;
      const result = await clientFetch(`/systems?${new URLSearchParams(params).toString()}`);
      if (result && result.success) {
        setSystems(result.data.items || []);
        setPageError("");
      } else {
        setPageError(result?.error || "Could not reload the systems right now.");
      }
    } catch (e) {
      setPageError("Could not reload the systems right now.");
      console.error("Error reloading systems:", e);
    } finally {
      setLoading(false);
    }
  }

  async function applyFilters(newStatus, newCategory) {
    setStatusFilter(newStatus);
    setCategoryFilter(newCategory);
    await reload(newStatus, newCategory);
  }

  function openCreate() {
    setModalMode("create");
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormTouched(false);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(item) {
    setModalMode("edit");
    setEditItem(item);
    setForm({
      name: item.name || "",
      url: item.url || "",
      description: item.description || "",
      status: item.status || "active",
      category: item.category || "internal",
    });
    setFormTouched(false);
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    if (formTouched && !confirm("You have unsaved changes. Do you want to leave without saving?")) return;
    setShowModal(false);
    setEditItem(null);
    setFormTouched(false);
    setFormError("");
  }

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormTouched(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        url: form.url.trim() || null,
        description: form.description.trim() || null,
        status: form.status,
        category: form.category,
      };
      const result = modalMode === "create"
        ? await createSystem(payload)
        : await updateSystem(editItem.id, payload);

      if (!result || !result.success) {
        setFormError(result?.error || "Could not save. Please check the information and try again.");
        return;
      }
      setFormTouched(false);
      setShowModal(false);
      showToast(modalMode === "create" ? "System created successfully." : "System updated successfully.");
      await reload();
    } catch (err) {
      console.error("Error saving system:", err);
      setFormError("Connection error. Please check your network and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this system?")) return;
    try {
      const result = await deleteSystem(id);
      if (!result || !result.success) {
        showToast(result?.error || "Could not delete the system.", "error");
        return;
      }
      showToast("System deleted successfully.");
      await reload();
    } catch (err) {
      console.error("Error deleting system:", err);
      showToast("Connection error while deleting.", "error");
    }
  }

  return (
    <>
      <Head>
        <title>NerdPortal | Systems</title>
      </Head>

      <Layout user={user}>
        {pageError && (
          <div className="status-banner status-banner-error">{pageError}</div>
        )}

        <section className={styles.header}>
          <div>
            <h1 className={styles.title}>Internal Systems</h1>
            <p className={styles.subtitle}>
              Catalog of systems and services used across the company.
            </p>
          </div>
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + New System
            </button>
          )}
        </section>
        <div className={styles.filterBar}>
          <select
            className={`form-input ${styles.filterSelect}`}
            value={statusFilter}
            onChange={(e) => applyFilters(e.target.value, categoryFilter)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            className={`form-input ${styles.filterSelect}`}
            value={categoryFilter}
            onChange={(e) => applyFilters(statusFilter, e.target.value)}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <span className={styles.resultCount}>
            {systems.length} system{systems.length !== 1 ? "s" : ""}
          </span>
        </div>
        {systems.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <p>{pageError || "No systems found with the selected filters."}</p>
          </div>
        ) : (
          <div className={`card ${styles.listCard} ${loading ? styles.loading : ""}`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>System</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Access</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {systems.map((sys) => (
                  <tr key={sys.id}>
                    <td>
                      <span className={styles.sysName}>{sys.name}</span>
                      {sys.description && (
                        <span className={styles.sysDesc}>{sys.description}</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.sysCategory}>
                        {CATEGORY_LABELS[sys.category] || sys.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[sys.status] || "badge-offline"}`}>
                        {STATUS_LABELS[sys.status] || sys.status}
                      </span>
                    </td>
                    <td>{sys.owner_name || "-"}</td>
                    <td>
                      {sys.url ? (
                        <a
                          href={sys.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.accessLink}
                        >
                          Open
                        </a>
                      ) : (
                        <span className={styles.noLink}>-</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: "flex", gap: "var(--space-2)" }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => openEdit(sys)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(sys.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Layout>
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === "create" ? "New System" : "Edit System"}
              </h2>
              <button type="button" className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && <div className="modal-error">{formError}</div>}

              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="System name"
                  maxLength={200}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Access URL</label>
                <input
                  className="form-input"
                  type="url"
                  value={form.url}
                  onChange={(e) => setField("url", e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Short description of the system"
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="deprecated">Deprecated</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input"
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                  >
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="saas">SaaS</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : modalMode === "create" ? "Create" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </>
  );
}

