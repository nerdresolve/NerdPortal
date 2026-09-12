import Head from "next/head";
import Layout from "../components/Layout/Layout";
import { resolveUser } from "../services/auth";
import brand from "../brand.config";
import styles from "../styles/Support.module.css";

export async function getServerSideProps(context) {
  const cookie = context.req.headers.cookie || "";
  const user = await resolveUser(cookie);
  return { props: { user } };
}

const STEPS = [
  {
    number: "01",
    title: "Identify the problem",
    description: "Describe the problem clearly: which system is affected, the error message if there is one, and how often it happens.",
  },
  {
    number: "02",
    title: "Check system status",
    description: "Before opening a ticket, check the Systems page to see whether there is scheduled maintenance or an ongoing incident.",
  },
  {
    number: "03",
    title: "Open the ticket",
    description: "Use your organization's ticketing tool to file the request. The link is listed on the Systems page.",
  },
  {
    number: "04",
    title: "Fill in the form",
    description: "Pick the right category (incident, request, access, infrastructure), write a detailed description and attach evidence if you have it.",
  },
  {
    number: "05",
    title: "Follow it through",
    description: "Once the ticket is open, track its progress in the ticketing tool. You will get email notifications when the status changes.",
  },
];

const CATEGORIES = [
  {
    name: "Incident",
    description: "Something that breaks the normal operation of a system or service. For example: a system is down, an error blocks access, or performance is critically slow.",
    priority: "Response within 4 business hours",
  },
  {
    name: "Request",
    description: "A service or change request that is not a failure. For example: creating an account, installing software, or configuring access.",
    priority: "Response within 2 business days",
  },
  {
    name: "Access",
    description: "Granting, changing or revoking permissions on internal systems.",
    priority: "Response within 1 business day",
  },
  {
    name: "Infrastructure",
    description: "Problems or requests involving hardware, network, cabling, printers or telephony.",
    priority: "Response within 2 business days",
  },
];

export default function SupportPage({ user }) {
  return (
    <>
      <Head>
        <title>{`${brand.name} | Support`}</title>
      </Head>

      <Layout user={user}>
        <section className={styles.header}>
          <h1 className={styles.title}>Getting support</h1>
          <p className={styles.subtitle}>
            How to file and follow up on a request to the IT department.
          </p>
        </section>
        <section className={styles.stepsSection}>
          <h2 className={styles.sectionTitle}>How to open a ticket</h2>
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
          <h2 className={styles.sectionTitle}>Ticket categories</h2>
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
          <h2 className={styles.sectionTitle}>Direct contact</h2>
          <p className={styles.contactText}>
            For emergencies, or if the ticketing tool itself is unavailable, contact the IT team directly:
          </p>
          <div className={styles.contactGrid}>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Email</span>
              <a href={`mailto:${brand.support.email}`} className={styles.contactValue}>
                {brand.support.email}
              </a>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Phone</span>
              <span className={styles.contactValue}>{brand.support.phone}</span>
            </div>
            <div className={styles.contactItem}>
              <span className={styles.contactLabel}>Hours</span>
              <span className={styles.contactValue}>{brand.support.hours}</span>
            </div>
          </div>
        </section>
      </Layout>
    </>
  );
}

