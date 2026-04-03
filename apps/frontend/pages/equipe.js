import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { optionalAuthSSR, isAdminUser } from "../services/auth";
import {
  getTeam,
  clientFetch,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  resolveApiAssetUrl,
} from "../services/api";
import styles from "../styles/Equipe.module.css";

const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

export async function getServerSideProps(context) {
  const auth = await optionalAuthSSR(context);

  let members = [];
  let loadError = "";

  try {
    const activeParam = isAdminUser(auth.user) ? "false" : "true";
    const result = await getTeam(auth.cookie || null, { limit: "50", active: activeParam });
    if (result.success) members = result.data.items || [];
    else loadError = result.error || "Não foi possível carregar a equipe no momento.";
  } catch (e) {
    loadError = "Não foi possível carregar a equipe no momento.";
  }

  return {
    props: { user: auth.user, initialMembers: members, initialLoadError: loadError },
  };
}

function getInitials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function appendFormValue(formData, key, value) {
  if (value === null || value === undefined || value === "") return;
  formData.append(key, String(value));
}

const EMPTY_FORM = {
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  department: "TI",
  description: "",
  sortOrder: "0",
  isActive: true,
};

export default function EquipePage({ user, initialMembers, initialLoadError }) {
  const [members, setMembers] = useState(initialMembers);
  const [pageError, setPageError] = useState(initialLoadError || "");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
  const [formTouched, setFormTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const isAdmin = isAdminUser(user);

  function updatePhotoPreview(nextUrl) {
    setPhotoPreviewUrl((currentUrl) => {
      if (currentUrl && currentUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentUrl);
      }
      return nextUrl;
    });
  }

  function resetPhotoState(previewUrl = "") {
    setPhotoFile(null);
    updatePhotoPreview(previewUrl);
  }

  function showToast(msg, type = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (photoPreviewUrl && photoPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
  }, [photoPreviewUrl]);

  async function reload() {
    try {
      const activeParam = isAdmin ? "false" : "true";
      const result = await clientFetch(`/team?limit=50&active=${activeParam}`);
      if (result && result.success) {
        setMembers(result.data.items || []);
        setPageError("");
      } else {
        setPageError(result?.error || "Não foi possível recarregar a equipe.");
      }
    } catch (e) {
      setPageError("Não foi possível recarregar a equipe.");
      console.error("Erro ao recarregar membros:", e);
    }
  }

  function openCreate() {
    setModalMode("create");
    setEditItem(null);
    setForm(EMPTY_FORM);
    resetPhotoState("");
    setFormTouched(false);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(member) {
    setModalMode("edit");
    setEditItem(member);
    setForm({
      fullName: member.full_name || "",
      jobTitle: member.job_title || "",
      email: member.email || "",
      phone: member.phone || "",
      department: member.department || "TI",
      description: member.description || "",
      sortOrder: String(member.sort_order ?? 0),
      isActive: member.is_active !== false,
    });
    resetPhotoState(resolveApiAssetUrl(member.photo_url || ""));
    setFormTouched(false);
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    if (formTouched && !confirm("Existem alterações não salvas. Deseja sair sem salvar?")) return;
    setShowModal(false);
    setEditItem(null);
    resetPhotoState("");
    setFormTouched(false);
    setFormError("");
  }

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormTouched(true);
  }

  function handlePhotoChange(event) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!ALLOWED_PHOTO_TYPES.has(selectedFile.type)) {
      event.target.value = "";
      setFormError("Formato de foto inválido. Use JPG, PNG, WEBP ou GIF.");
      return;
    }

    if (selectedFile.size > MAX_PHOTO_SIZE_BYTES) {
      event.target.value = "";
      setFormError("A foto deve ter no máximo 2 MB.");
      return;
    }

    setFormError("");
    setPhotoFile(selectedFile);
    updatePhotoPreview(URL.createObjectURL(selectedFile));
    setFormTouched(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.fullName.trim() || !form.jobTitle.trim() || !form.email.trim()) {
      setFormError("Nome, cargo e e-mail são obrigatórios.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        fullName: form.fullName.trim(),
        jobTitle: form.jobTitle.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        department: form.department.trim() || "TI",
        description: form.description.trim() || null,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
        isActive: form.isActive,
      };

      let body = payload;
      if (photoFile) {
        const formData = new FormData();
        appendFormValue(formData, "fullName", payload.fullName);
        appendFormValue(formData, "jobTitle", payload.jobTitle);
        appendFormValue(formData, "email", payload.email);
        appendFormValue(formData, "phone", payload.phone);
        appendFormValue(formData, "department", payload.department);
        appendFormValue(formData, "description", payload.description);
        appendFormValue(formData, "sortOrder", payload.sortOrder);
        appendFormValue(formData, "isActive", payload.isActive);
        formData.append("photo", photoFile);
        body = formData;
      }

      const result = modalMode === "create"
        ? await createTeamMember(body)
        : await updateTeamMember(editItem.id, body);

      if (!result || !result.success) {
        setFormError(result?.error || "Erro ao salvar. Verifique os dados e tente novamente.");
        return;
      }

      setFormTouched(false);
      setShowModal(false);
      setEditItem(null);
      resetPhotoState("");
      showToast(modalMode === "create" ? "Membro adicionado com sucesso." : "Membro atualizado com sucesso.");
      await reload();
    } catch (err) {
      console.error("Erro ao salvar membro:", err);
      setFormError("Erro de conexão. Verifique a rede e tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Confirmar exclusão deste membro?")) return;

    try {
      const result = await deleteTeamMember(id);
      if (!result || !result.success) {
        showToast(result?.error || "Erro ao excluir membro.", "error");
        return;
      }
      showToast("Membro removido com sucesso.");
      await reload();
    } catch (err) {
      console.error("Erro ao excluir membro:", err);
      showToast("Erro de conexão ao excluir.", "error");
    }
  }

  return (
    <>
      <Head>
        <title>Portal do TI | Equipe</title>
      </Head>

      <Layout user={user}>
        {pageError && (
          <div className="status-banner status-banner-error">{pageError}</div>
        )}

        <section className={styles.header}>
          <div>
            <h1 className={styles.title}>Equipe de Tecnologia da Informação</h1>
            <p className={styles.subtitle}>
              Diretório de membros do setor de TI do NerdResolve.
            </p>
          </div>
          {isAdmin && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Novo Membro
            </button>
          )}
        </section>

        {members.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <p>{pageError || "Nenhum membro cadastrado."}</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {members.map((member) => (
              <div
                key={member.id}
                className={`card ${styles.memberCard} ${!member.is_active ? styles.inactive : ""}`}
              >
                <div className={styles.avatar}>
                  {member.photo_url ? (
                    <img
                      src={resolveApiAssetUrl(member.photo_url)}
                      alt={member.full_name}
                      className={styles.avatarImg}
                    />
                  ) : (
                    <span className={styles.avatarInitials}>
                      {getInitials(member.full_name)}
                    </span>
                  )}
                </div>

                <div className={styles.info}>
                  <h3 className={styles.memberName}>{member.full_name}</h3>
                  <span className={styles.memberTitle}>{member.job_title}</span>
                  <span className={styles.memberDept}>{member.department}</span>
                  {member.description && (
                    <p className={styles.memberDesc}>{member.description}</p>
                  )}
                  {isAdmin && !member.is_active && (
                    <span className="badge badge-offline" style={{ marginTop: "var(--space-1)" }}>
                      Inativo
                    </span>
                  )}
                </div>

                <div className={styles.contact}>
                  <a href={`mailto:${member.email}`} className={styles.contactLink}>
                    {member.email}
                  </a>
                  {member.phone && (
                    <span className={styles.contactPhone}>{member.phone}</span>
                  )}
                </div>

                {isAdmin && (
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => openEdit(member)}
                      style={{ flex: 1 }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(member.id)}
                      style={{ flex: 1 }}
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Layout>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {modalMode === "create" ? "Novo Membro" : "Editar Membro"}
              </h2>
              <button type="button" className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && <div className="modal-error">{formError}</div>}

              <div className={styles.photoField}>
                <label className="form-label">Foto do membro</label>
                <div className={styles.photoUploadRow}>
                  <div className={styles.photoPreview}>
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt={form.fullName || "Prévia da foto do membro"}
                        className={styles.photoPreviewImage}
                      />
                    ) : (
                      <span className={styles.photoPreviewInitials}>
                        {getInitials(form.fullName)}
                      </span>
                    )}
                  </div>
                  <div className={styles.photoUploadContent}>
                    <input
                      className="form-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handlePhotoChange}
                    />
                    <p className={styles.photoHelp}>
                      Use JPG, PNG, WEBP ou GIF com até 2 MB.
                    </p>
                    {modalMode === "edit" && editItem?.photo_url && !photoFile && (
                      <p className={styles.photoHint}>
                        Envie uma nova imagem apenas se quiser substituir a foto atual.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome completo *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.fullName}
                    onChange={(event) => setField("fullName", event.target.value)}
                    placeholder="Nome do membro"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cargo *</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.jobTitle}
                    onChange={(event) => setField("jobTitle", event.target.value)}
                    placeholder="Cargo / função"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">E-mail *</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    placeholder="(xx) xxxxx-xxxx"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Departamento</label>
                  <input
                    className="form-input"
                    type="text"
                    value={form.department}
                    onChange={(event) => setField("department", event.target.value)}
                    placeholder="TI"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ordem de exibição</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(event) => setField("sortOrder", event.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição / bio</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.description}
                  onChange={(event) => setField("description", event.target.value)}
                  placeholder="Breve descrição do membro (opcional)"
                  style={{ resize: "vertical" }}
                />
              </div>

              {modalMode === "edit" && (
                <div className={styles.checkboxField}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(event) => setField("isActive", event.target.checked)}
                    style={{ width: "auto" }}
                  />
                  <label htmlFor="isActive" className="form-label" style={{ margin: 0 }}>
                    Membro ativo (visível no diretório)
                  </label>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Salvando..." : modalMode === "create" ? "Adicionar" : "Salvar alterações"}
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
