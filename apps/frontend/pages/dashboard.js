import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { optionalAuthSSR } from "../services/auth";
import { getMetrics } from "../services/api";
import styles from "../styles/Dashboard.module.css";

export async function getServerSideProps(context) {
  const auth = await optionalAuthSSR(context);

  let metrics = [];

  try {
    const result = await getMetrics(auth.cookie || null, { limit: "50" });
    if (result.success) metrics = result.data.items || [];
  } catch (e) {
    // Render with empty data on failure
  }

  return {
    props: {
      user: auth.user,
      metrics,
    },
  };
}

// Group metrics by category for display sections
function groupByCategory(metrics) {
  const groups = {};
  for (const m of metrics) {
    const cat = m.category || "operational";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }
  return groups;
}

// Get the latest value for each unique KPI name
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
  security: "Seguranca",
  performance: "Performance",
  financial: "Financeiro",
};

const CATEGORY_COLORS = {
  operational: "var(--color-primary)",
  security: "var(--color-error)",
  performance: "var(--color-accent)",
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

export default function DashboardPage({ user, metrics }) {
  const grouped = groupByCategory(metrics);
  const latestKpis = getLatestPerKpi(metrics);
  const categories = Object.keys(grouped).sort();

  return (
    <>
      <Head>
        <title>Dashboard - ITPortal</title>
      </Head>

      <Layout user={user}>
        <section className={styles.header}>
          <h1 className={styles.title}>Dashboard de Metricas</h1>
          <p className={styles.subtitle}>
            Visao consolidada dos indicadores de TI por categoria.
          </p>
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
                    {" - "}
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
            <p>Nenhuma metrica registrada. Adicione KPIs pelo painel administrativo.</p>
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
                      <th>Periodo</th>
                      <th>Responsavel</th>
                      <th>Atualizado</th>
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
                          {" - "}
                          {new Date(m.period_end).toLocaleDateString("pt-BR")}
                        </td>
                        <td>{m.created_by_name || "-"}</td>
                        <td>{new Date(m.updated_at).toLocaleDateString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </Layout>
    </>
  );
}
