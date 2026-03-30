import { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { optionalAuthSSR } from "../services/auth";
import { getSystems, clientFetch } from "../services/api";
import styles from "../styles/Sistemas.module.css";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os Status" },
  { value: "active", label: "Ativo" },
  { value: "maintenance", label: "Manutencao" },
  { value: "deprecated", label: "Descontinuado" },
  { value: "offline", label: "Offline" },
];

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas as Categorias" },
  { value: "internal", label: "Interno" },
  { value: "external", label: "Externo" },
  { value: "infrastructure", label: "Infraestrutura" },
  { value: "saas", label: "SaaS" },
];

const STATUS_LABELS = {
  active: "Ativo",
  maintenance: "Manutencao",
  deprecated: "Descontinuado",
  offline: "Offline",
};

const STATUS_BADGE = {
  active: "badge-active",
  maintenance: "badge-maintenance",
  deprecated: "badge-offline",
  offline: "badge-offline",
};

export async function getServerSideProps(context) {
  const auth = await optionalAuthSSR(context);

  let systems = [];

  try {
    const result = await getSystems(auth.cookie || null, { limit: "50" });
    if (result.success) systems = result.data.items || [];
  } catch (e) {
    // Render with empty data
  }

  return {
    props: { user: auth.user, initialSystems: systems },
  };
}

export default function SistemasPage({ user, initialSystems }) {
  const [systems, setSystems] = useState(initialSystems);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(false);

  async function applyFilters(newStatus, newCategory) {
    setLoading(true);
    try {
      const params = { limit: "50" };
      if (newStatus) params.status = newStatus;
      if (newCategory) params.category = newCategory;

      const result = await clientFetch(
        `/systems?${new URLSearchParams(params).toString()}`
      );
      if (result.success) {
        setSystems(result.data.items || []);
        setStatusFilter(newStatus);
        setCategoryFilter(newCategory);
      }
    } catch (e) {
      // Keep current data
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Sistemas - ITPortal</title>
      </Head>

      <Layout user={user}>
        <section className={styles.header}>
          <h1 className={styles.title}>Sistemas Internos</h1>
          <p className={styles.subtitle}>
            Catalogo de sistemas e servicos utilizados pelo NerdResolve.
          </p>
        </section>

        {/* Filter bar */}
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
            {systems.length} sistema{systems.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Systems Grid */}
        {systems.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <p>Nenhum sistema encontrado com os filtros aplicados.</p>
          </div>
        ) : (
          <div className={`card ${styles.listCard} ${loading ? styles.loading : ""}`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sistema</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Responsavel</th>
                  <th>Acesso</th>
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
                      <span className={styles.sysCategory}>{sys.category}</span>
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
                          Abrir
                        </a>
                      ) : (
                        <span className={styles.noLink}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Layout>
    </>
  );
}
