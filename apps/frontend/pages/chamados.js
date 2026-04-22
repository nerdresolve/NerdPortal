import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { resolveUser } from "../services/auth";
import styles from "../styles/Chamados.module.css";

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";
  const user = await resolveUser(cookie);
  return { props: { user } };
}

const STEPS = [
  {
    number: "01",
    title: "Identifique o Problema",
    description: "Descreva o problema de forma clara, incluindo o sistema afetado, a mensagem de erro (se houver) e a frequência de ocorrência.",
  },
  {
    number: "02",
    title: "Verifique o Status dos Sistemas",
    description: "Antes de abrir um chamado, consulte a página de Sistemas Internos para verificar se há alguma manutenção programada ou incidente em andamento.",
  },
  {
    number: "03",
    title: "Acesse o Portal de Chamados",
    description: "Acesse o sistema de chamados da empresa para registrar sua solicitação. O link está disponível na página de Sistemas Internos.",
  },
  {
    number: "04",
    title: "Preencha o Formulário",
    description: "Selecione a categoria apropriada (incidente, solicitação, acesso, infraestrutura), preencha a descrição detalhada e anexe evidências se necessário.",
  },
  {
    number: "05",
    title: "Acompanhe o Chamado",
    description: "Após a abertura, acompanhe o andamento pelo sistema de chamados. Você receberá notificações por e-mail sobre atualizações no status.",
  },
];

const CATEGORIES = [
  {
    name: "Incidente",
    description: "Problema que afeta o funcionamento normal de um sistema ou serviço. Exemplos: sistema fora do ar, erro ao acessar, lentidão crítica.",
    priority: "Resposta em até 4 horas úteis",
  },
  {
    name: "Solicitação",
    description: "Pedido de serviço ou alteração que não envolve falha. Exemplos: criação de conta, instalação de software, configuração de acesso.",
    priority: "Resposta em até 2 dias úteis",
  },
  {
    name: "Acesso",
    description: "Solicitação de concessão, alteração ou revogação de permissões em sistemas internos.",
    priority: "Resposta em até 1 dia útil",
  },
  {
    name: "Infraestrutura",
    description: "Problemas ou solicitações relacionados a equipamentos, rede, cabeamento, impressoras ou telefonia.",
    priority: "Resposta em até 2 dias úteis",
  },
];

export default function ChamadosPage({ user }) {
  return (
    <>
      <Head>
        <title>Portal do TI | Chamados</title>
      </Head>

      <Layout user={user}>
        <section className={styles.header}>
          <h1 className={styles.title}>Abertura de Chamados</h1>
          <p className={styles.subtitle}>
            Orientações para registro e acompanhamento de solicitações ao setor de TI.
          </p>
        </section>
        <section className={styles.stepsSection}>
          <h2 className={styles.sectionTitle}>Como abrir um chamado</h2>
          <div className={styles.stepsGrid}>
            {STEPS.map((step) => (
              <div key={step.number} className={`card ${styles.stepCard}`}>
                <span className={styles.stepNumber}>{step.number}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className={styles.categoriesSection}>
          <h2 className={styles.sectionTitle}>Categorias de Chamado</h2>
          <div className={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <div key={cat.name} className={`card ${styles.categoryCard}`}>
                <div className={styles.categoryHeader}>
                  <h3 className={styles.categoryName}>{cat.name}</h3>
                  <span className={styles.categoryPriority}>{cat.priority}</span>
                </div>
                <p className={styles.categoryDesc}>{cat.description}</p>
              </div>
            ))}
          </div>
        </section>
        <section className={`card ${styles.contactSection}`}>
          <h2 className={styles.sectionTitle}>Contato Direto</h2>
          <p className={styles.contactText}>
            Para emergências ou indisponibilidade do sistema de chamados, entre em contato diretamente com a equipe de TI:
          </p>
          <div className={styles.contactGrid}>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>E-mail</span>
              <a href="mailto:ti@example.com" className={styles.contactValue}>
                ti@example.com
              </a>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Ramal</span>
              <span className={styles.contactValue}>4000</span>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Horário</span>
              <span className={styles.contactValue}>Seg-Sex, 08:00 - 18:00</span>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}

