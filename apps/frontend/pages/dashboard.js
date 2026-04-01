import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { optionalAuthSSR, isAdminUser } from "../services/auth";
import { getMetrics, clientFetch, createMetric, updateMetric, deleteMetric } from "../services/api";
import styles from "../styles/Dashboard.module.css";

export async function getServerSideProps(context) {
  const auth = await optionalAuthSSR(context);

  let metrics = [];
  let loadError = "";

  try {
    const result = await getMetrics(auth.cookie || null, { limit: "50" });
    if (result.success) metrics = result.data.items || [];
    else loadError = result.error || "Não foi possível carregar as métricas no momento.";
  } catch (e) {
    loadError = "Não foi possível carregar as métricas no momento.";
  }

  return {
    props: { user: auth.user, initialMetrics: metrics, initialLoadError: loadError },
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
  operational: "Operacional",
  security: "Segurança",
  performance: "Performance",
  financial: "Financeiro",
};

const CATEGORY_COLORS = {
  operational: "var(--color-primary)",
  security: "var(--color-error)",
  performance: "var(--amarelo-bravante)",
  financial: "var(--verde-70)",
};

function formatValue(value, unit) {
  const num = parseFloat(value);
  if (unit === "percent") return `${num.toFixed(1)}%`;
  if (unit === "currency") return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  if (unit === "seconds") return `${num.toFixed(1)}s`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString("pt-BR");
}

function isoToDisplay(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
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
        setPageError(result?.error || "Não foi possível recarregar as métricas.");
      }
    } catch (e) {
      setPageError("Não foi possível recarregar as métricas.");
      console.error("Erro ao recarregar métricas:", e);
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
    if (formTouched && !confirm("Existem alterações não salvas. Deseja sair sem salvar?")) return;
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
        setFormError("Nome, valor, início e fim do período são obrigatórios.");
        return;
      }
    } else {
      if (form.kpiValue === "") {
        setFormError("Valor é obrigatório.");
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
        setFormError(result?.error || "Erro ao salvar. Verifique os dados e tente novamente.");
        return;
      }
      setFormTouched(false);
      setShowModal(false);
      showToast(modalMode === "create" ? "Métrica criada com sucesso." : "Métrica atualizada com sucesso.");
      await reload();
    } catch (err) {
      console.error("Erro ao salvar métrica:", err);
      setFormError("Erro de conexão. Verifique a rede e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Confirmar exclusão desta métrica?")) return;
    try {
      const result = await deleteMetric(id);
      if (!result || !result.success) {
        showToast(result?.error || "Erro ao excluir métrica.", "error");
        return;
      }
      showToast("Métrica excluída com sucesso.");
      await reload();
    } catch (err) {
      console.error("Erro ao excluir métrica:", err);
      showToast("Erro de conexão ao excluir.", "error");
    }
  }

  const grouped = groupByCategory(metrics);
  const latestKpis = getLatestPerKpi(metrics);
  const categories = Object.keys(grouped).sort();

  return (
    <>
      <Head>
        <title>Portal do TI | Dashboard</title>
      </Head>

      <Layout user={user}>
        {pageError && (
          <div className="status-banner status-banner-error">{pageError}</div>
        )}

        <section className={styles.header}>
          <div>
            <h1 className={styles.title}>Dashboard de Métricas</h1>
            <p className={styles.subtitle}>
              Visão consolidada dos indicadores de TI por categoria.
            </p>
          </div>
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Nova Métrica
            </button>
          )}
        </section>

        {/* Summary KPI Cards */}
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
                    {new Date(kpi.period_start).toLocaleDateString("pt-BR")}
                    {" – "}
                    {new Date(kpi.period_end).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Category Sections */}
        {categories.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <p>{pageError || `Nenhuma métrica registrada.${isAdmin ? " Adicione KPIs usando o botão acima." : ""}`}</p>
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
                  {grouped[cat].length} registro{grouped[cat].length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="card">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Indicador</th>
                      <th>Valor</th>
                      <th>Período</th>
                      <th>Responsável</th>
                      <th>Atualizado</th>
                      {isAdmin && <th>Ações</th>}
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
                          {new Date(m.period_start).toLocaleDateString("pt-BR")}
                          {" – "}
                          {new Date(m.period_end).toLocaleDateString("pt-BR")}
                        </td>
                        <td>{m.created_by_name || "-"}</td>
                        <td>{new Date(m.updated_at).toLocaleDateString("pt-BR")}</td>
                        {isAdmin && (
                          <td>
                            <div style={{ display: "flex", gap: "var(--space-2)" }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => openEdit(m)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(m.id)}
                              >
                                Excluir
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

      {/* Admin Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === "create" ? "Nova Métrica" : `Editar: ${editItem?.kpi_name}`}
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
                      <label className="form-label">Nome do Indicador *</label>
                      <input
                        className="form-input"
                        type="text"
                        value={form.kpiName}
                        onChange={(e) => setField("kpiName", e.target.value)}
                        placeholder="ex: Uptime Sistemas"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Categoria</label>
                      <select
                        className="form-input"
                        value={form.category}
                        onChange={(e) => setField("category", e.target.value)}
                      >
                        <option value="operational">Operacional</option>
                        <option value="security">Segurança</option>
                        <option value="performance">Performance</option>
                        <option value="financial">Financeiro</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Início do Período *</label>
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
                      <label className="form-label">Fim do Período *</label>
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
                  <label className="form-label">Valor *</label>
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
                  <label className="form-label">Unidade</label>
                  <select
                    className="form-input"
                    value={form.kpiUnit}
                    onChange={(e) => setField("kpiUnit", e.target.value)}
                  >
                    <option value="count">Contagem</option>
                    <option value="percent">Percentual (%)</option>
                    <option value="currency">Moeda (R$)</option>
                    <option value="seconds">Segundos</option>
                    <option value="hours">Horas</option>
                    <option value="days">Dias</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Notas ou contexto sobre este indicador"
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Salvando..." : modalMode === "create" ? "Criar" : "Salvar alterações"}
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
