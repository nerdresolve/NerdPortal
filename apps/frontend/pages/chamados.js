import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { optionalAuthSSR } from "../services/auth";
import styles from "../styles/Chamados.module.css";

export async function getServerSideProps(context) {
  const auth = await optionalAuthSSR(context);

  return {
    props: { user: auth.user },
  };
}

const STEPS = [
  {
    number: "01",
    title: "Identifique o Problema",
    description: "Descreva o problema de forma clara, incluindo o sistema afetado, a mensagem de erro (se houver) e a frequencia de ocorrencia.",
  },
  {
    number: "02",
    title: "Verifique o Status dos Sistemas",
    description: "Antes de abrir um chamado, consulte a pagina de Sistemas Internos para verificar se ha alguma manutencao programada ou incidente em andamento.",
  },
  {
    number: "03",
    title: "Acesse o Portal de Chamados",
    description: "Acesse o sistema de chamados da empresa para registrar sua solicitacao. O link esta disponivel na pagina de Sistemas Internos.",
  },
  {
    number: "04",
    title: "Preencha o Formulario",
    description: "Selecione a categoria apropriada (incidente, solicitacao, acesso, infraestrutura), preencha a descricao detalhada e anexe evidencias se necessario.",
  },
  {
    number: "05",
    title: "Acompanhe o Chamado",
    description: "Apos a abertura, acompanhe o andamento pelo sistema de chamados. Voce recebera notificacoes por e-mail sobre atualizacoes no status.",
  },
];

const CATEGORIES = [
  {
    name: "Incidente",
    description: "Problema que afeta o funcionamento normal de um sistema ou servico. Exemplos: sistema fora do ar, erro ao acessar, lentidao critica.",
    priority: "Resposta em ate 4 horas uteis",
  },
  {
    name: "Solicitacao",
    description: "Pedido de servico ou alteracao que nao envolve falha. Exemplos: criacao de conta, instalacao de software, configuracao de acesso.",
    priority: "Resposta em ate 2 dias uteis",
  },
  {
    name: "Acesso",
    description: "Solicitacao de concessao, alteracao ou revogacao de permissoes em sistemas internos.",
    priority: "Resposta em ate 1 dia util",
  },
  {
    name: "Infraestrutura",
    description: "Problemas ou solicitacoes relacionados a equipamentos, rede, cabeamento, impressoras ou telefonia.",
    priority: "Resposta em ate 2 dias uteis",
  },
];

export default function ChamadosPage({ user }) {
  return (
    <>
      <Head>
        <title>Chamados - ITPortal</title>
      </Head>

      <Layout user={user}>
        <section className={styles.header}>
          <h1 className={styles.title}>Abertura de Chamados</h1>
          <p className={styles.subtitle}>
            Orientacoes para registro e acompanhamento de solicitacoes ao setor de TI.
          </p>
        </section>

        {/* Steps */}
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

        {/* Categories */}
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

        {/* Contact */}
        <section className={`card ${styles.contactSection}`}>
          <h2 className={styles.sectionTitle}>Contato Direto</h2>
          <p className={styles.contactText}>
            Para emergencias ou indisponibilidade do sistema de chamados, entre em contato diretamente com a equipe de TI:
          </p>
          <div className={styles.contactGrid}>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>E-mail</span>
              <a href="mailto:ti@bravante.com.br" className={styles.contactValue}>
                ti@bravante.com.br
              </a>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Ramal</span>
              <span className={styles.contactValue}>4000</span>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Horario</span>
              <span className={styles.contactValue}>Seg-Sex, 08:00 - 18:00</span>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}
