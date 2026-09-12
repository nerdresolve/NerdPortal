import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { resolveUser, isAdminUser } from "../services/auth";
import { getMetrics, clientFetch, createMetric, updateMetric, deleteMetric } from "../services/api";
import styles from "../styles/Dashboard.module.css";

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";

  let user = null;
  let metrics = [];
  let loadError = "";

  try {
    const [resolvedUser, result] = await Promise.all([
      resolveUser(cookie),
      getMetrics(cookie, { limit: "50" }),
    ]);
    user = resolvedUser;
    if (result.success) metrics = result.data.items || [];
    else loadError = result.error || "Could not load metrics at this time.";
  } catch (e) {
    loadError = "Could not load metrics at this time.";
  }

  return {
    props: { user, initialMetrics: metrics, initialLoadError: loadError },
  };
}

function groupByCategory(metrics) {
  const groups = {};
  for (const m of metrics) {
    const cat = m.category || "operational";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }
  return groups;
}

function getLatestPerKpi(metrics) {
  const map = {};
  for (const m of metrics) {
    if (!map[m.kpi_name] || new Date(m.period_end) > new Date(map[m.kpi_name].period_end)) {
      map[m.kpi_name] = m;
    }
  }
  return Object.values(map);
}

const CATEGORY_LABELS = {
  operational: "Operational",
  security: "Security",
  performance: "Performance",
  financial: "Financial",
};

const CATEGORY_COLORS = {
  operational: "var(--color-primary)",
  security: "var(--color-error)",
  performance: "var(--color-accent)",
  financial: "var(--color-primary-light)",
};

function formatValue(value, unit) {
  const num = parseFloat(value);
  if (unit === "percent") return `${num.toFixed(1)}%`;
  if (unit === "currency") return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  if (unit === "seconds") return `${num.toFixed(1)}s`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString("en-US");
}

function isoToDisplay(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${m}/${d}/${y}`;
}

const EMPTY_FORM = {
  kpiName: "",
  kpiValue: "",
  kpiUnit: "count",
  periodStart: "",
  periodEnd: "",
  category: "operational",
  notes: "",
};

export default function DashboardPage({ user, initialMetrics, initialLoadError }) {
  const [metrics, setMetrics] = useState(initialMetrics);
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

  async function reload() {
    try {
      const result = await clientFetch("/metrics?limit=50");
      if (result && result.success) {
        setMetrics(result.data.items || []);
        setPageError("");
      } else {
        setPageError(result?.error || "Could not reload metrics.");
      }
    } catch (e) {
      setPageError("Could not reload metrics.");
      console.error("Error reloading metrics:", e);
    }
  }

  function openCreate() {
    setModalMode("create");
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormTouched(false);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(metric) {
    setModalMode("edit");
    setEditItem(metric);
    setForm({
      kpiValue: String(metric.kpi_value),
      kpiUnit: metric.kpi_unit || "count",
      notes: metric.notes || "",
    });
    setFormTouched(false);
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    if (formTouched && !confirm("There are unsaved changes. Do you want to leave without saving?")) return;
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

    if (modalMode === "create") {
      if (!form.kpiName.trim() || form.kpiValue === "" || !form.periodStart || !form.periodEnd) {
        setFormError("Name, value, period start and period end are required.");
        return;
      }
    } else {
      if (form.kpiValue === "") {
        setFormError("Value is required.");
        return;
      }
    }

    setSubmitting(true);
    setFormError("");
    try {
      let result;
      if (modalMode === "create") {
        result = await createMetric({
          kpiName: form.kpiName.trim(),
          kpiValue: parseFloat(form.kpiValue),
          kpiUnit: form.kpiUnit,
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          category: form.category,
          notes: form.notes.trim() || null,
        });
      } else {
        result = await updateMetric(editItem.id, {
          kpiValue: parseFloat(form.kpiValue),
          kpiUnit: form.kpiUnit,
          notes: form.notes.trim() || null,
        });
      }

      if (!result || !result.success) {
        setFormError(result?.error || "Error saving. Check the data and try again.");
        return;
      }
      setFormTouched(false);
      setShowModal(false);
      showToast(modalMode === "create" ? "Metric created successfully." : "Metric updated successfully.");
      await reload();
    } catch (err) {
      console.error("Error saving metric:", err);
      setFormError("Connection error. Check your network and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this metric?")) return;
    try {
      const result = await deleteMetric(id);
      if (!result || !result.success) {
        showToast(result?.error || "Error deleting metric.", "error");
        return;
      }
      showToast("Metric deleted successfully.");
      await reload();
    } catch (err) {
      console.error("Error deleting metric:", err);
      showToast("Connection error while deleting.", "error");
    }
  }

  const grouped = groupByCategory(metrics);
  const latestKpis = getLatestPerKpi(metrics);
  const categories = Object.keys(grouped).sort();

  return (
    <>
      <Head>
        <title>NerdPortal | Dashboard</title>
      </Head>

      <Layout user={user}>
        {pageError && (
          <div className="status-banner status-banner-error">{pageError}</div>
        )}

        <section className={styles.header}>
          <div>
            <h1 className={styles.title}>Metrics Dashboard</h1>
            <p className={styles.subtitle}>
              Consolidated view of IT indicators by category.
            </p>
          </div>
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + New Metric
            </button>
          )}
        </section>
        {latestKpis.length > 0 && (
          <section className={styles.kpiGrid}>
            {latestKpis.map((kpi) => (
              <div key={kpi.id} className={`card ${styles.kpiCard}`}>
                <div
                  className={styles.kpiAccent}
                  style={{ backgroundColor: CATEGORY_COLORS[kpi.category] || CATEGORY_COLORS.operational }}
                />
                <div className={styles.kpiContent}>
                  <span className={styles.kpiValue}>
                    {formatValue(kpi.kpi_value, kpi.kpi_unit)}
                  </span>
                  <span className={styles.kpiName}>{kpi.kpi_name}</span>
                  <span className={styles.kpiPeriod}>
                    {new Date(kpi.period_start).toLocaleDateString("en-US")}
                    {" → "}
                    {new Date(kpi.period_end).toLocaleDateString("en-US")}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}
        {categories.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <p>{pageError || `No metrics recorded.${isAdmin ? " Add KPIs using the button above." : ""}`}</p>
          </div>
        ) : (
          categories.map((cat) => (
            <section key={cat} className={styles.categorySection}>
              <div className={styles.categoryHeader}>
                <div
                  className={styles.categoryDot}
                  style={{ backgroundColor: CATEGORY_COLORS[cat] || CATEGORY_COLORS.operational }}
                />
                <h2 className={styles.categoryTitle}>
                  {CATEGORY_LABELS[cat] || cat}
                </h2>
                <span className={styles.categoryCount}>
                  {grouped[cat].length} record{grouped[cat].length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Indicator</th>
                      <th>Value</th>
                      <th>Period</th>
                      <th>Owner</th>
                      <th>Updated</th>
                      {isAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[cat].map((m) => (
                      <tr key={m.id}>
                        <td>
                          <span className={styles.metricName}>{m.kpi_name}</span>
                          {m.notes && (
                            <span className={styles.metricNotes}>{m.notes}</span>
                          )}
                        </td>
                        <td className={styles.metricValue}>
                          {formatValue(m.kpi_value, m.kpi_unit)}
                        </td>
                        <td>
                          {new Date(m.period_start).toLocaleDateString("en-US")}
                          {" → "}
                          {new Date(m.period_end).toLocaleDateString("en-US")}
                        </td>
                        <td>{m.created_by_name || "-"}</td>
                        <td>{new Date(m.updated_at).toLocaleDateString("en-US")}</td>
                        {isAdmin && (
                          <td>
                            <div style={{ display: "flex", gap: "var(--space-2)" }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => openEdit(m)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(m.id)}
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
            </section>
          ))
        )}
      </Layout>
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === "create" ? "New Metric" : `Edit: ${editItem?.kpi_name}`}
              </h2>
              <button type="button" className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && <div className="modal-error">{formError}</div>}

              {modalMode === "create" && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Indicator Name *</label>
                      <input
                        className="form-input"
                        type="text"
                        value={form.kpiName}
                        onChange={(e) => setField("kpiName", e.target.value)}
                        placeholder="e.g. Systems Uptime"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        className="form-input"
                        value={form.category}
                        onChange={(e) => setField("category", e.target.value)}
                      >
                        <option value="operational">Operational</option>
                        <option value="security">Security</option>
                        <option value="performance">Performance</option>
                        <option value="financial">Financial</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Period Start *</label>
                      <input
                        className="form-input"
                        type="date"
                        value={form.periodStart}
                        onChange={(e) => setField("periodStart", e.target.value)}
                      />
                      {form.periodStart && (
                        <small style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                          {isoToDisplay(form.periodStart)}
                        </small>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Period End *</label>
                      <input
                        className="form-input"
                        type="date"
                        value={form.periodEnd}
                        onChange={(e) => setField("periodEnd", e.target.value)}
                      />
                      {form.periodEnd && (
                        <small style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                          {isoToDisplay(form.periodEnd)}
                        </small>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Value *</label>
                  <input
                    className="form-input"
                    type="number"
                    step="any"
                    value={form.kpiValue}
                    onChange={(e) => setField("kpiValue", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select
                    className="form-input"
                    value={form.kpiUnit}
                    onChange={(e) => setField("kpiUnit", e.target.value)}
                  >
                    <option value="count">Count</option>
                    <option value="percent">Percentage (%)</option>
                    <option value="currency">Currency ($)</option>
                    <option value="seconds">Seconds</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Notes or context about this indicator"
                  style={{ resize: "vertical" }}
                />
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

