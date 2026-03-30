import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { optionalAuthSSR } from "../services/auth";
import { getTeam } from "../services/api";
import styles from "../styles/Equipe.module.css";

export async function getServerSideProps(context) {
  const auth = await optionalAuthSSR(context);

  let members = [];

  try {
    const result = await getTeam(auth.cookie || null, { limit: "50", active: "true" });
    if (result.success) members = result.data.items || [];
  } catch (e) {
    // Render with empty data
  }

  return {
    props: { user: auth.user, members },
  };
}

function getInitials(name) {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function EquipePage({ user, members }) {
  return (
    <>
      <Head>
        <title>Equipe TI - ITPortal</title>
      </Head>

      <Layout user={user}>
        <section className={styles.header}>
          <h1 className={styles.title}>Equipe de Tecnologia da Informacao</h1>
          <p className={styles.subtitle}>
            Diretorio de membros do setor de TI do NerdResolve.
          </p>
        </section>

        {members.length === 0 ? (
          <div className={`card ${styles.emptyState}`}>
            <p>Nenhum membro cadastrado.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {members.map((member) => (
              <div key={member.id} className={`card ${styles.memberCard}`}>
                <div className={styles.avatar}>
                  {member.photo_url ? (
                    <img
                      src={member.photo_url}
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
                </div>

                <div className={styles.contact}>
                  <a
                    href={`mailto:${member.email}`}
                    className={styles.contactLink}
                  >
                    {member.email}
                  </a>
                  {member.phone && (
                    <span className={styles.contactPhone}>{member.phone}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Layout>
    </>
  );
}
