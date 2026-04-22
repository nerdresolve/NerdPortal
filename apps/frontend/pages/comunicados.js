import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { resolveUser, isAdminUser } from "../services/auth";
import {
  getAnnouncements,
  clientFetch,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../services/api";
import styles from "../styles/Comunicados.module.css";

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";

  let user = null;
  let announcements = [];
  let total = 0;
  let loadError = "";

  try {
    const [resolvedUser, result] = await Promise.all([
      resolveUser(cookie),
      getAnnouncements(cookie, { limit: "20", offset: "0" }),
    ]);
    user = resolvedUser;
    if (result.success) {
      announcements = result.data.items || [];
      total = result.data.total || 0;
    } else {
      loadError = result.error || "Não foi possível carregar os comunicados no momento.";
    }
  } catch (e) {
    loadError = "Não foi possível carregar os comunicados no momento.";
  }

  return {
    props: { user, initialAnnouncements: announcements, initialTotal: total, initialLoadError: loadError },
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

function isoToDisplay(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

const EMPTY_FORM = { title: "", body: "", isPinned: false, publishedAt: "" };

export default function ComunicadosPage({ user, initialAnnouncements, initialTotal, initialLoadError }) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState(initialLoadError || "");
  const limit = 20;

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

  async function reload(newOffset = offset) {
    setLoading(true);
    try {
      const result = await clientFetch(`/announcements?limit=${limit}&offset=${newOffset}`);
      if (result && result.success) {
        setAnnouncements(result.data.items || []);
        setTotal(result.data.total || 0);
        setOffset(newOffset);
        setPageError("");
      } else {
        setPageError(result?.error || "Não foi possível recarregar os comunicados.");
      }
    } catch (e) {
      setPageError("Não foi possível recarregar os comunicados.");
      console.error("Erro ao recarregar comunicados:", e);
    } finally {
      setLoading(false);
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

  function openEdit(item, e) {
    if (e) e.stopPropagation();
    setModalMode("edit");
    setEditItem(item);
    setForm({
      title: item.title || "",
      body: item.body || "",
      isPinned: item.is_pinned || false,
      publishedAt: item.published_at ? item.published_at.split("T")[0] : "",
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
    if (!form.title.trim() || !form.body.trim()) {
      setFormError("Título e conteúdo são obrigatórios.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        isPinned: form.isPinned,
        publishedAt: form.publishedAt || null,
      };
      const result = modalMode === "create"
        ? await createAnnouncement(payload)
        : await updateAnnouncement(editItem.id, payload);

      if (!result || !result.success) {
        setFormError(result?.error || "Erro ao salvar. Verifique os dados e tente novamente.");
        return;
      }
      setFormTouched(false);
      setShowModal(false);
      setSelected(null);
      showToast(modalMode === "create" ? "Comunicado publicado com sucesso." : "Comunicado atualizado com sucesso.");
      await reload(modalMode === "create" ? 0 : offset);
    } catch (err) {
      console.error("Erro ao salvar comunicado:", err);
      setFormError("Erro de conexão. Verifique a rede e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id, e) {
    if (e) e.stopPropagation();
    if (!confirm("Confirmar exclusão deste comunicado?")) return;
    try {
      const result = await deleteAnnouncement(id);
      if (!result || !result.success) {
        showToast(result?.error || "Erro ao excluir comunicado.", "error");
        return;
      }
      setSelected(null);
      showToast("Comunicado excluído com sucesso.");
      await reload(offset);
    } catch (err) {
      console.error("Erro ao excluir comunicado:", err);
      showToast("Erro de conexão ao excluir.", "error");
    }
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <>
      <Head>
        <title>Portal do TI | Comunicados</title>
      </Head>

      <Layout user={user}>
        {pageError && (
          <div className="status-banner status-banner-error">{pageError}</div>
        )}

        <section className={styles.header}>
          <div>
            <h1 className={styles.title}>Comunicados</h1>
            <p className={styles.subtitle}>
              Comunicados internos do setor de Tecnologia da Informação.
            </p>
          </div>
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Novo Comunicado
            </button>
          )}
        </section>
        {selected && (
          <div className={`card ${styles.detail}`}>
            <div className={styles.detailActions}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setSelected(null)}
              >
                Voltar para lista
              </button>
              {isAdmin && (
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={(e) => openEdit(selected, e)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={(e) => handleDelete(selected.id, e)}
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
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
        {!selected && (
          <>
            {announcements.length === 0 ? (
              <div className={`card ${styles.emptyState}`}>
                <p>{pageError || "Nenhum comunicado publicado."}</p>
              </div>
            ) : (
              <div className={`card ${styles.listCard}`}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Autor</th>
                      <th>Data</th>
                      <th>Status</th>
                      {isAdmin && <th>Ações</th>}
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
                        {isAdmin && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: "var(--space-2)" }}>
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={(e) => openEdit(item, e)}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={(e) => handleDelete(item.id, e)}
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

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      type="button"
                      className={`btn btn-outline ${styles.pageBtn}`}
                      disabled={currentPage <= 1}
                      onClick={() => reload(offset - limit)}
                    >
                      Anterior
                    </button>
                    <span className={styles.pageInfo}>
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      type="button"
                      className={`btn btn-outline ${styles.pageBtn}`}
                      disabled={currentPage >= totalPages}
                      onClick={() => reload(offset + limit)}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Layout>
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === "create" ? "Novo Comunicado" : "Editar Comunicado"}
              </h2>
              <button type="button" className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && <div className="modal-error">{formError}</div>}

              <div className="form-group">
                <label className="form-label">Título *</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="Título do comunicado"
                  maxLength={300}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Conteúdo *</label>
                <textarea
                  className="form-input"
                  rows={6}
                  value={form.body}
                  onChange={(e) => setField("body", e.target.value)}
                  placeholder="Texto do comunicado..."
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data de Publicação</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.publishedAt}
                    onChange={(e) => setField("publishedAt", e.target.value)}
                  />
                  {form.publishedAt && (
                    <small style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                      {isoToDisplay(form.publishedAt)}
                    </small>
                  )}
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", paddingTop: "var(--space-6)" }}>
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={form.isPinned}
                    onChange={(e) => setField("isPinned", e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  <label htmlFor="isPinned" className="form-label" style={{ margin: 0 }}>
                    Fixar comunicado
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Salvando..." : modalMode === "create" ? "Publicar" : "Salvar alterações"}
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

