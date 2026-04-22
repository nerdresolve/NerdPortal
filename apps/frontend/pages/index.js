import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { resolveUser } from "../services/auth";
import { getAnnouncements, getSystems } from "../services/api";
import styles from "../styles/Home.module.css";

const STATUS_LABELS = {
  active: "Ativo",
  maintenance: "Manutenção",
  deprecated: "Descontinuado",
  offline: "Offline",
};

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";

  let user = null;
  let announcements = [];
  let systems = [];
  let loadError = "";

  try {
    const [resolvedUser, annResult, sysResult] = await Promise.all([
      resolveUser(cookie),
      getAnnouncements(cookie, { limit: "5" }),
      getSystems(cookie, { limit: "10" }),
    ]);

    user = resolvedUser;

    if (annResult.success) announcements = annResult.data.items || [];
    if (sysResult.success) systems = sysResult.data.items || [];

    const failedSections = [];
    if (!annResult.success) failedSections.push("comunicados");
    if (!sysResult.success) failedSections.push("sistemas");

    if (failedSections.length > 0) {
      loadError = `Não foi possível carregar ${failedSections.join(" e ")} no momento.`;
    }
  } catch (e) {
    loadError = "Não foi possível carregar os blocos públicos da página inicial no momento.";
  }

  return {
    props: { user, announcements, systems, loadError },
  };
}

export default function HomePage({ user, announcements, systems, loadError }) {
  const activeCount = systems.filter((s) => s.status === "active").length;
  const maintenanceCount = systems.filter((s) => s.status === "maintenance").length;

  return (
    <>
      <Head>
        <title>Portal do TI | Início</title>
      </Head>

      <Layout user={user}>
        {loadError && (
          <div className="status-banner status-banner-error">{loadError}</div>
        )}
        <section className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>
            Portal do TI
          </h1>
          <p className={styles.welcomeText}>
            Central de acesso a sistemas, documentos, comunicados e métricas do setor de TI do Grupo Bravante.
          </p>
        </section>
        <section className={styles.statsGrid}>
          <div className={`card ${styles.statCard}`}>
            <span className={styles.statValue}>{systems.length}</span>
            <span className={styles.statLabel}>Sistemas Catalogados</span>
          </div>
          <div className={`card ${styles.statCard}`}>
            <span className={`${styles.statValue} ${styles.statActive}`}>{activeCount}</span>
            <span className={styles.statLabel}>Sistemas Ativos</span>
          </div>
          <div className={`card ${styles.statCard}`}>
            <span className={`${styles.statValue} ${styles.statWarning}`}>{maintenanceCount}</span>
            <span className={styles.statLabel}>Em Manutenção</span>
          </div>
          <div className={`card ${styles.statCard}`}>
            <span className={styles.statValue}>{announcements.length}</span>
            <span className={styles.statLabel}>Comunicados Recentes</span>
          </div>
        </section>
        <div className={styles.contentGrid}>
          <section className="card">
            <div className="card-header">
              <h2>Comunicados Recentes</h2>
              <a href="/comunicados" className={styles.viewAll}>Ver todos</a>
            </div>

            {announcements.length === 0 ? (
              <p className={styles.emptyState}>Nenhum comunicado publicado.</p>
            ) : (
              <ul className={styles.announcementList}>
                {announcements.map((item) => (
                  <li key={item.id} className={styles.announcementItem}>
                    <div className={styles.announcementHeader}>
                      <h3 className={styles.announcementTitle}>{item.title}</h3>
                      {item.is_pinned && (
                        <span className="badge badge-active">Fixado</span>
                      )}
                    </div>
                    <p className={styles.announcementMeta}>
                      {item.author_name} &middot;{" "}
                      {new Date(item.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card">
            <div className="card-header">
              <h2>Sistemas Internos</h2>
              <a href="/sistemas" className={styles.viewAll}>Ver todos</a>
            </div>

            {systems.length === 0 ? (
              <p className={styles.emptyState}>Nenhum sistema cadastrado.</p>
            ) : (
              <ul className={styles.systemsList}>
                {systems.slice(0, 6).map((sys) => (
                  <li key={sys.id} className={styles.systemItem}>
                    <div>
                      <span className={styles.systemName}>{sys.name}</span>
                      {sys.description && (
                        <span className={styles.systemDesc}>{sys.description}</span>
                      )}
                    </div>
                    <span className={`badge badge-${sys.status === "active" ? "active" : sys.status === "maintenance" ? "maintenance" : "offline"}`}>
                      {STATUS_LABELS[sys.status] || sys.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Layout>
    </>
  );
}

