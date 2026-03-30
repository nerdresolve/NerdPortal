import { useState } from "react";
import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { optionalAuthSSR } from "../services/auth";
import { getDocuments, clientFetch } from "../services/api";
import styles from "../styles/Documentos.module.css";

const CATEGORIES = [
  { value: "", label: "Todas as Categorias" },
  { value: "general", label: "Geral" },
  { value: "policy", label: "Politicas" },
  { value: "procedure", label: "Procedimentos" },
  { value: "template", label: "Templates" },
  { value: "report", label: "Relatorios" },
];

export async function getServerSideProps(context) {
  const auth = await optionalAuthSSR(context);

  let documents = [];
  let total = 0;

  try {
    const result = await getDocuments(auth.cookie || null, { limit: "20", offset: "0" });
    if (result.success) {
      documents = result.data.items || [];
      total = result.data.total || 0;
    }
  } catch (e) {
    // Render with empty data
  }

  return {
    props: { user: auth.user, initialDocuments: documents, initialTotal: total },
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

export default function DocumentosPage({ user, initialDocuments, initialTotal }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [total, setTotal] = useState(initialTotal);
  const [category, setCategory] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

  async function fetchDocuments(newCategory, newOffset) {
    setLoading(true);
    try {
      const params = { limit: String(limit), offset: String(newOffset) };
      if (newCategory) params.category = newCategory;

      const result = await clientFetch(
        `/documents?${new URLSearchParams(params).toString()}`
      );
      if (result.success) {
        setDocuments(result.data.items || []);
        setTotal(result.data.total || 0);
        setOffset(newOffset);
        setCategory(newCategory);
      }
    } catch (e) {
      // Keep current data
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryChange(e) {
    fetchDocuments(e.target.value, 0);
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <>
      <Head>
        <title>Documentos - ITPortal</title>
      </Head>

      <Layout user={user}>
        <section className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Repositorio de Documentos</h1>
            <p className={styles.subtitle}>
              Arquivos e documentos do setor de TI.
            </p>
          </div>
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
            <p>Nenhum documento encontrado.</p>
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
                  <th>Acao</th>
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
                        <span className={`badge badge-active`}>{doc.category}</span>
                      </td>
                      <td>{formatFileSize(doc.size_bytes)}</td>
                      <td>{doc.uploader_name}</td>
                      <td>{formatDate(doc.created_at)}</td>
                      <td>
                        <a
                          href={`${API_BASE}/documents/${doc.id}/download`}
                          className={styles.downloadLink}
                          rel="noopener noreferrer"
                        >
                          Download
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
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
                  Pagina {currentPage} de {totalPages}
                </span>
                <button
                  type="button"
                  className={`btn btn-outline ${styles.pageBtn}`}
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchDocuments(category, offset + limit)}
                >
                  Proxima
                </button>
              </div>
            )}
          </div>
        )}
      </Layout>
    </>
  );
}
