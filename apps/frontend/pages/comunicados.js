import { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { optionalAuthSSR } from "../services/auth";
import { getAnnouncements, clientFetch } from "../services/api";
import styles from "../styles/Comunicados.module.css";

export async function getServerSideProps(context) {
  const auth = await optionalAuthSSR(context);

  let announcements = [];
  let total = 0;

  try {
    const result = await getAnnouncements(auth.cookie || null, { limit: "20", offset: "0" });
    if (result.success) {
      announcements = result.data.items || [];
      total = result.data.total || 0;
    }
  } catch (e) {
    // Render with empty data
  }

  return {
    props: { user: auth.user, initialAnnouncements: announcements, initialTotal: total },
  };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function ComunicadosPage({ user, initialAnnouncements, initialTotal }) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  async function loadPage(newOffset) {
    setLoading(true);
    try {
      const result = await clientFetch(`/announcements?limit=${limit}&offset=${newOffset}`);
      if (result.success) {
        setAnnouncements(result.data.items || []);
        setTotal(result.data.total || 0);
        setOffset(newOffset);
      }
    } catch (e) {
      // Keep current data on failure
    } finally {
      setLoading(false);
    }
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <>
      <Head>
        <title>Comunicados - ITPortal</title>
      </Head>

      <Layout user={user}>
        <section className={styles.header}>
          <h1 className={styles.title}>Comunicados</h1>
          <p className={styles.subtitle}>
            Comunicados internos do setor de Tecnologia da Informacao.
          </p>
        </section>

        {/* Detail view */}
        {selected && (
          <div className={`card ${styles.detail}`}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setSelected(null)}
            >
              Voltar para lista
            </button>
            <div className={styles.detailHeader}>
              <h2 className={styles.detailTitle}>{selected.title}</h2>
              {selected.is_pinned && (
                <span className="badge badge-active">Fixado</span>
              )}
            </div>
            <p className={styles.detailMeta}>
              {selected.author_name} &middot; {formatDate(selected.published_at || selected.created_at)}
            </p>
            <div className={styles.detailBody}>{selected.body}</div>
          </div>
        )}

        {/* List view */}
        {!selected && (
          <>
            {announcements.length === 0 ? (
              <div className={`card ${styles.emptyState}`}>
                <p>Nenhum comunicado publicado.</p>
              </div>
            ) : (
              <div className={`card ${styles.listCard}`}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Titulo</th>
                      <th>Autor</th>
                      <th>Data</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody className={loading ? styles.loading : ""}>
                    {announcements.map((item) => (
                      <tr
                        key={item.id}
                        className={styles.clickableRow}
                        onClick={() => setSelected(item)}
                      >
                        <td>
                          <span className={styles.rowTitle}>{item.title}</span>
                        </td>
                        <td>{item.author_name}</td>
                        <td>{formatDate(item.published_at || item.created_at)}</td>
                        <td>
                          {item.is_pinned && (
                            <span className="badge badge-active">Fixado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      type="button"
                      className={`btn btn-outline ${styles.pageBtn}`}
                      disabled={currentPage <= 1}
                      onClick={() => loadPage(offset - limit)}
                    >
                      Anterior
                    </button>
                    <span className={styles.pageInfo}>
                      Pagina {currentPage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      className={`btn btn-outline ${styles.pageBtn}`}
                      disabled={currentPage >= totalPages}
                      onClick={() => loadPage(offset + limit)}
                    >
                      Proxima
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Layout>
    </>
  );
}
