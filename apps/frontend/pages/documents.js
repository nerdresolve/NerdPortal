import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { resolveUser, isAdminUser } from "../services/auth";
import { getDocuments, clientFetch, uploadDocument, deleteDocument } from "../services/api";
import styles from "../styles/Documents.module.css";

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "general", label: "General" },
  { value: "policy", label: "Policies" },
  { value: "procedure", label: "Procedures" },
  { value: "template", label: "Templates" },
  { value: "report", label: "Reports" },
];

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";

  let user = null;
  let documents = [];
  let total = 0;
  let loadError = "";

  try {
    const [resolvedUser, result] = await Promise.all([
      resolveUser(cookie),
      getDocuments(cookie, { limit: "20", offset: "0" }),
    ]);
    user = resolvedUser;
    if (result.success) {
      documents = result.data.items || [];
      total = result.data.total || 0;
    } else {
      loadError = result.error || "Could not load documents right now.";
    }
  } catch (e) {
    loadError = "Could not load documents right now.";
  }

  return {
    props: {
      user,
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
  return new Date(dateStr).toLocaleDateString("en-US");
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
  image: "var(--color-accent)",
  sheet: "var(--color-primary)",
  slide: "var(--color-accent-light)",
  doc: "#2563EB",
  text: "var(--color-text-muted)",
  file: "var(--gray-300)",
};

const EMPTY_FORM = { category: "general", description: "" };

export default function DocumentsPage({ user, initialDocuments, initialTotal, initialLoadError }) {
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
        setPageError(result?.error || "Could not reload documents right now.");
      }
    } catch (e) {
      setPageError("Could not reload documents right now.");
      console.error("Failed to reload documents:", e);
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
      setFormError("Please select a file.");
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
        setFormError(result?.error || "Could not upload the file. Check its size and format.");
        return;
      }
      closeModal();
      showToast("Document uploaded successfully.");
      await fetchDocuments(category, 0);
    } catch (err) {
      console.error("Failed to upload document:", err);
      setFormError("Connection error. Check your network and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this document?")) return;
    try {
      const result = await deleteDocument(id);
      if (!result || !result.success) {
        showToast(result?.error || "Could not delete the document.", "error");
        return;
      }
      showToast("Document deleted successfully.");
      await fetchDocuments(category, offset);
    } catch (err) {
      console.error("Failed to delete document:", err);
      showToast("Connection error while deleting.", "error");
    }
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <>
      <Head>
        <title>NerdPortal | Documents</title>
      </Head>

      <Layout user={user}>
        {pageError && (
          <div className="status-banner status-banner-error">{pageError}</div>
        )}

        <section className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Document Repository</h1>
            <p className={styles.subtitle}>
              Files and documents from the IT department.
            </p>
          </div>
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={openUpload}>
              + Upload Document
            </button>
          )}
        </section>
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
            {total} document{total !== 1 ? "s" : ""}
          </span>
        </div>
        {documents.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <p>{pageError || "No documents found."}</p>
          </div>
        ) : (
          <div className={`card ${styles.listCard}`}>
            <table className={`data-table ${loading ? styles.loading : ""}`}>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Uploaded by</th>
                  <th>Date</th>
                  <th>Action</th>
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
                              Delete
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
                  Previous
                </button>
                <span className={styles.pageInfo}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className={`btn btn-outline ${styles.pageBtn}`}
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchDocuments(category, offset + limit)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </Layout>
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Document</h2>
              <button type="button" className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleUpload}>
              {formError && <div className="modal-error">{formError}</div>}

              <div className="form-group">
                <label className="form-label">File *</label>
                <input
                  className="form-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                  style={{ padding: "var(--space-2)" }}
                />
                <small style={{ color: "var(--color-text-muted)", fontSize: "0.8125rem" }}>
                  10MB maximum. Formats: PDF, Word, Excel, PowerPoint, images, text.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="general">General</option>
                  <option value="policy">Policies</option>
                  <option value="procedure">Procedures</option>
                  <option value="template">Templates</option>
                  <option value="report">Reports</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional document description"
                  maxLength={500}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Uploading..." : "Upload"}
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
