import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { optionalAuthSSR, isAdminUser } from "../services/auth";
import { getDocuments, clientFetch, uploadDocument, deleteDocument } from "../services/api";
import styles from "../styles/Documentos.module.css";

const CATEGORIES = [
  { value: "", label: "Todas as Categorias" },
  { value: "general", label: "Geral" },
  { value: "policy", label: "Políticas" },
  { value: "procedure", label: "Procedimentos" },
  { value: "template", label: "Templates" },
  { value: "report", label: "Relatórios" },
];

export async function getServerSideProps(context) {
  const auth = await optionalAuthSSR(context);

  let documents = [];
  let total = 0;
  let loadError = "";

  try {
    const result = await getDocuments(auth.cookie || null, { limit: "20", offset: "0" });
    if (result.success) {
      documents = result.data.items || [];
      total = result.data.total || 0;
    } else {
      loadError = result.error || "Não foi possível carregar os documentos no momento.";
    }
  } catch (e) {
    loadError = "Não foi possível carregar os documentos no momento.";
  }

  return {
    props: {
      user: auth.user,
      initialDocuments: documents,
      initialTotal: total,
      initialLoadError: loadError,
    },
  };
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function getMimeIcon(mimeType) {
  if (!mimeType) return "file";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("image")) return "image";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "sheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "slide";
  if (mimeType.includes("word") || mimeType.includes("document")) return "doc";
  if (mimeType.includes("text")) return "text";
  return "file";
}

const MIME_COLORS = {
  pdf: "var(--color-error)",
  image: "var(--amarelo-bravante)",
  sheet: "var(--color-primary)",
  slide: "var(--amarelo-80)",
  doc: "#2563EB",
  text: "var(--cinza-bravante)",
  file: "var(--gray-300)",
};

const EMPTY_FORM = { category: "general", description: "" };

export default function DocumentosPage({ user, initialDocuments, initialTotal, initialLoadError }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [total, setTotal] = useState(initialTotal);
  const [category, setCategory] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState(initialLoadError || "");
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const isAdmin = isAdminUser(user);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

  function showToast(msg, type = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  async function fetchDocuments(newCategory, newOffset) {
    setLoading(true);
    try {
      const params = { limit: String(limit), offset: String(newOffset) };
      if (newCategory) params.category = newCategory;
      const result = await clientFetch(`/documents?${new URLSearchParams(params).toString()}`);
      if (result && result.success) {
        setDocuments(result.data.items || []);
        setTotal(result.data.total || 0);
        setOffset(newOffset);
        setCategory(newCategory);
        setPageError("");
      } else {
        setPageError(result?.error || "Não foi possível recarregar os documentos.");
      }
    } catch (e) {
      setPageError("Não foi possível recarregar os documentos.");
      console.error("Erro ao recarregar documentos:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryChange(e) {
    fetchDocuments(e.target.value, 0);
  }

  function openUpload() {
    setForm(EMPTY_FORM);
    setFile(null);
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setFormError("");
    setFile(null);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setFormError("Selecione um arquivo.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", form.category);
      if (form.description.trim()) {
        formData.append("description", form.description.trim());
      }
      const result = await uploadDocument(formData);
      if (!result || !result.success) {
        setFormError(result?.error || "Erro ao enviar arquivo. Verifique o tamanho e formato.");
        return;
      }
      closeModal();
      showToast("Documento enviado com sucesso.");
      await fetchDocuments(category, 0);
    } catch (err) {
      console.error("Erro ao enviar documento:", err);
      setFormError("Erro de conexão. Verifique a rede e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Confirmar exclusão deste documento?")) return;
    try {
      const result = await deleteDocument(id);
      if (!result || !result.success) {
        showToast(result?.error || "Erro ao excluir documento.", "error");
        return;
      }
      showToast("Documento excluído com sucesso.");
      await fetchDocuments(category, offset);
    } catch (err) {
      console.error("Erro ao excluir documento:", err);
      showToast("Erro de conexão ao excluir.", "error");
    }
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <>
      <Head>
        <title>Portal do TI | Documentos</title>
      </Head>

      <Layout user={user}>
        {pageError && (
          <div className="status-banner status-banner-error">{pageError}</div>
        )}

        <section className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Repositório de Documentos</h1>
            <p className={styles.subtitle}>
              Arquivos e documentos do setor de TI.
            </p>
          </div>
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={openUpload}>
              + Enviar Documento
            </button>
          )}
        </section>

        {/* Filter bar */}
        <div className={styles.filterBar}>
          <select
            className={`form-input ${styles.categorySelect}`}
            value={category}
            onChange={handleCategoryChange}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
          <span className={styles.resultCount}>
            {total} documento{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <p>{pageError || "Nenhum documento encontrado."}</p>
          </div>
        ) : (
          <div className={`card ${styles.listCard}`}>
            <table className={`data-table ${loading ? styles.loading : ""}`}>
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Categoria</th>
                  <th>Tamanho</th>
                  <th>Enviado por</th>
                  <th>Data</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const icon = getMimeIcon(doc.mime_type);
                  return (
                    <tr key={doc.id}>
                      <td>
                        <div className={styles.docNameCell}>
                          <span
                            className={styles.docIcon}
                            style={{ color: MIME_COLORS[icon] }}
                          >
                            {icon.toUpperCase().slice(0, 3)}
                          </span>
                          <div>
                            <span className={styles.docName}>{doc.original_name}</span>
                            {doc.description && (
                              <span className={styles.docDesc}>{doc.description}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-active">{doc.category}</span>
                      </td>
                      <td>{formatFileSize(doc.size_bytes)}</td>
                      <td>{doc.uploader_name}</td>
                      <td>{formatDate(doc.created_at)}</td>
                      <td>
                        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                          <a
                            href={`${API_BASE}/documents/${doc.id}/download`}
                            className={styles.downloadLink}
                            rel="noopener noreferrer"
                          >
                            Download
                          </a>
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(doc.id)}
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={`btn btn-outline ${styles.pageBtn}`}
                  disabled={currentPage <= 1}
                  onClick={() => fetchDocuments(category, offset - limit)}
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
                  onClick={() => fetchDocuments(category, offset + limit)}
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        )}
      </Layout>

      {/* Upload Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Enviar Documento</h2>
              <button type="button" className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleUpload}>
              {formError && <div className="modal-error">{formError}</div>}

              <div className="form-group">
                <label className="form-label">Arquivo *</label>
                <input
                  className="form-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  style={{ padding: "var(--space-2)" }}
                />
                <small style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                  Máximo 10MB. Formatos: PDF, Word, Excel, PowerPoint, imagens, texto.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="general">Geral</option>
                  <option value="policy">Políticas</option>
                  <option value="procedure">Procedimentos</option>
                  <option value="template">Templates</option>
                  <option value="report">Relatórios</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descrição opcional do documento"
                  maxLength={500}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar"}
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
