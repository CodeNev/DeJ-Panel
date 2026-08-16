import { useEffect, useRef, useState } from "react";
import {
  cfCreateD1Database,
  cfEnableWorkersDevSubdomain,
  cfGetAccountWorkersSubdomain,
  cfRunD1Migration,
  cfUploadWorkerModule,
  fetchInitialMigrationSql,
  fetchWorkerBundleSource,
} from "../providers/cloudflare-deploy";
import { createAdminAccount, waitForWorkerHealthy } from "../providers/deploy-shared";
import type { InstallerFormData, InstallerLogLine } from "../state/types";

type Props = {
  apiToken: string;
  accountId: string;
  formData: InstallerFormData;
  onLog: (log: InstallerLogLine) => void;
  onResource: (resource: { type: "d1_database" | "worker"; id: string; name: string }) => void;
  onSuccess: (panelUrl: string) => void;
  onFailure: (message: string, code: string) => void;
};

export function DeploymentRunner({
  apiToken,
  accountId,
  formData,
  onLog,
  onResource,
  onSuccess,
  onFailure,
}: Props) {
  const [lines, setLines] = useState<InstallerLogLine[]>([]);
  const started = useRef(false);

  function log(level: InstallerLogLine["level"], message: string) {
    const entry: InstallerLogLine = { timestamp: Date.now(), level, message };
    setLines((prev) => [...prev, entry]);
    onLog(entry);
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function run() {
      const workerName = formData.workerName ?? "dej-panel";
      const databaseName = formData.databaseName ?? "dej_panel_db";

      log("INFO", "Initializing deployment");

      log("INFO", `Creating D1 database: ${databaseName}`);
      const dbResult = await cfCreateD1Database(apiToken, accountId, databaseName);
      if (!dbResult.ok) {
        log("ERROR", `D1 creation failed: ${dbResult.message}`);
        onFailure(dbResult.message, dbResult.code);
        return;
      }
      log("INFO", `D1 database created (${dbResult.data.uuid})`);
      onResource({ type: "d1_database", id: dbResult.data.uuid, name: dbResult.data.name });

      log("INFO", "Fetching latest published Worker bundle from GitHub");
      const bundleResult = await fetchWorkerBundleSource();
      if (!bundleResult.ok) {
        log("ERROR", bundleResult.message);
        onFailure(bundleResult.message, bundleResult.code);
        return;
      }
      log("INFO", `Worker bundle fetched (${(bundleResult.data.length / 1024).toFixed(0)} KB)`);

      log("INFO", `Uploading Worker script: ${workerName}`);
      const uploadResult = await cfUploadWorkerModule(
        apiToken,
        accountId,
        workerName,
        bundleResult.data,
        dbResult.data.uuid
      );
      if (!uploadResult.ok) {
        log("ERROR", `Worker upload failed: ${uploadResult.message}`);
        onFailure(uploadResult.message, uploadResult.code);
        return;
      }
      log("INFO", "Worker script uploaded successfully");
      onResource({ type: "worker", id: uploadResult.data.id, name: workerName });

      log("INFO", "Applying database migrations");
      const migrationSqlResult = await fetchInitialMigrationSql();
      if (!migrationSqlResult.ok) {
        log("ERROR", migrationSqlResult.message);
        onFailure(migrationSqlResult.message, migrationSqlResult.code);
        return;
      }
      const migrateResult = await cfRunD1Migration(apiToken, accountId, dbResult.data.uuid, migrationSqlResult.data);
      if (!migrateResult.ok) {
        log("ERROR", `Migration failed: ${migrateResult.message}`);
        onFailure(migrateResult.message, migrateResult.code);
        return;
      }
      log("INFO", `Migration applied (${migrateResult.data.statementsRun} statements)`);

      log("INFO", "Enabling workers.dev subdomain");
      const enableResult = await cfEnableWorkersDevSubdomain(apiToken, accountId, workerName);
      if (!enableResult.ok) {
        log("WARN", `Could not auto-enable workers.dev subdomain: ${enableResult.message}`);
      }

      const subdomainResult = await cfGetAccountWorkersSubdomain(apiToken, accountId);
      const subdomain = subdomainResult.ok ? subdomainResult.data.subdomain : null;
      if (!subdomain) {
        log("ERROR", "Could not determine your workers.dev subdomain.");
        onFailure("Could not determine workers.dev subdomain.", "DOMAIN_VERIFICATION_FAILED");
        return;
      }

      const panelUrl = `https://${workerName}.${subdomain}.workers.dev`;
      log("INFO", `Panel URL: ${panelUrl}`);

      log("INFO", "Waiting for deployment to become healthy");
      const healthy = await waitForWorkerHealthy(panelUrl);
      if (!healthy) {
        log("ERROR", "Health check did not pass in time.");
        onFailure("Deployment did not become healthy in time.", "HEALTH_CHECK_FAILED");
        return;
      }
      log("INFO", "Health check passed");

      if (formData.adminUsername && formData.adminPassword) {
        log("INFO", "Creating initial admin account");
        const adminResult = await createAdminAccount(panelUrl, formData.adminUsername, formData.adminPassword);
        if (!adminResult.ok) {
          log("WARN", `Admin creation failed: ${adminResult.message}. You can retry this from the panel directly.`);
        } else {
          log("INFO", "Admin account created");
        }
      }

      onSuccess(panelUrl);
    }

    run().catch((err) => {
      log("FATAL", (err as Error).message);
      onFailure((err as Error).message, "DEPLOYMENT_FAILED");
    });
  }, [apiToken, accountId, formData]);

  return (
    <div className="dej-step">
      <div className="dej-log-viewer">
        {lines.map((line, idx) => (
          <div key={idx} className={`dej-log-line dej-log-${line.level.toLowerCase()}`}>
            <span className="dej-mono">[{new Date(line.timestamp).toLocaleTimeString()}]</span> {line.message}
          </div>
        ))}
      </div>
    </div>
  );
}
