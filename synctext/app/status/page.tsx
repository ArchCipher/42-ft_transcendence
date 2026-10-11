import type { Metadata } from "next";
import { prisma as db } from "@synctext/db";
import styles from "./status.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status",
  description: "Current SyncText service status",
};

async function databaseIsHealthy(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function collaborationIsHealthy(): Promise<boolean> {
  const collabUrl = process.env.COLLAB_INTERNAL_URL;
  if (!collabUrl) return false;

  try {
    const response = await fetch(`${collabUrl}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

type ServiceStatusProps = {
  name: string;
  operational: boolean;
};

function ServiceStatus({ name, operational }: ServiceStatusProps) {
  return (
    <div className={styles.service}>
      <span>{name}</span>
      <span
        className={
          operational ? styles.operational : styles.unavailable
        }
      >
        {operational ? "Operational" : "Unavailable"}
      </span>
    </div>
  );
}

export default async function StatusPage() {
  const [database, collaboration] = await Promise.all([
    databaseIsHealthy(),
    collaborationIsHealthy(),
  ]);

  const allOperational = database && collaboration;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>SyncText Status</h1>

        <p className={styles.summary}>
          {allOperational
            ? "All systems operational"
            : "Some services are unavailable"}
        </p>

        <div className={styles.services}>
          <ServiceStatus name="Web" operational />
          <ServiceStatus name="Database" operational={database} />
          <ServiceStatus
            name="Collaboration"
            operational={collaboration}
          />
        </div>
      </section>
    </main>
  );
}
