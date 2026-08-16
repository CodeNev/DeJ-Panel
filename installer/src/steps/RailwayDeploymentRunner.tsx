import { useEffect, useRef, useState } from "react";
import {
  rwCreateDomain,
  rwCreateProject,
  rwCreateServiceFromRepo,
  rwDeployService,
  rwGetDefaultEnvironmentId,
  rwGetDeploymentStatus,
  rwSetVariables,
} from "../providers/railway-client";
import { createAdminAccount, waitForWorkerHealthy } from "../providers/deploy-shared";
import type { InstallerFormData, InstallerLogLine } from "../state/types";

type Props = {
  apiToken: string;
  formData: InstallerFormData;
  onLog: (log: InstallerLogLine) => void;
  onResource: (resource: { type: "railway_project" | "railway_service" | "domain"; id: string; name: string }) => void;
  onSuccess: (panelUrl: string) => void;
  onFailure: (message: string, code: string) => void;
};

export function RailwayDeploymentRunner({ apiToken, formData, onLog, onResource, onSuccess, onFailure }: Props) {
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
      const serviceName = formData.workerName ?? "dej-panel";
      const projectName = formData.railwayProjectName ?? serviceName;

      log("INFO", "Initializing Railway deployment");

      log("INFO", `Creating Railway project: ${projectName}`);
      const projectResult = await rwCreateProject(apiToken, projectName);
      if (!projectResult.ok) {
        log("ERROR", projectResult.message);
        onFailure(projectResult.message, projectResult.code);
        return;
      }
      onResource({ type: "railway_project", id: projectResult.data.id, name: projectResult.data.name });

      log("INFO", `Creating service from GitHub repository (CodeNev/DeJ-Panel)`);
      const serviceResult = await rwCreateServiceFromRepo(apiToken, projectResult.data.id, serviceName);
      if (!serviceResult.ok) {
        log("ERROR", serviceResult.message);
        onFailure(serviceResult.message, serviceResult.code);
        return;
      }
      onResource({ type: "railway_service", id: serviceResult.data.id, name: serviceResult.data.name });

      log("INFO", "Resolving deployment environment");
      const envResult = await rwGetDefaultEnvironmentId(apiToken, projectResult.data.id);
      if (!envResult.ok) {
        log("ERROR", envResult.message);
        onFailure(envResult.message, envResult.code);
        return;
      }

      log("INFO", "Configuring environment variables");
      const varsResult = await rwSetVariables(apiToken, projectResult.data.id, serviceResult.data.id, {
        APP_ENV: "production",
        APP_VERSION: "0.1.0",
        DEPLOYMENT_PLATFORM: "railway",
        DEJ_SQLITE_PATH: "/app/data/dej-panel.sqlite",
      });
      if (!varsResult.ok) {
        log("ERROR", varsResult.message);
        onFailure(varsResult.message, varsResult.code);
        return;
      }

      log("INFO", "Creating public domain");
      const domainResult = await rwCreateDomain(apiToken, serviceResult.data.id, envResult.data);
      if (!domainResult.ok) {
        log("WARN", `Could not auto-create domain: ${domainResult.message}`);
      }
      const domain = domainResult.ok ? domainResult.data.domain : null;
      if (domain) {
        onResource({ type: "domain", id: domain, name: domain });
      }

      log("INFO", "Triggering deployment (Railway will build from the Dockerfile)");
      const deployResult = await rwDeployService(apiToken, serviceResult.data.id, envResult.data);
      if (!deployResult.ok) {
        log("ERROR", deployResult.message);
        onFailure(deployResult.message, deployResult.code);
        return;
      }

      log("INFO", "Waiting for build and deploy to finish — this can take a few minutes");
      if (deployResult.data.deploymentId) {
        for (let attempt = 0; attempt < 40; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const statusResult = await rwGetDeploymentStatus(apiToken, deployResult.data.deploymentId);
          if (!statusResult.ok) continue;
          if (statusResult.data === "SUCCESS") {
            log("INFO", "Deployment succeeded");
            break;
          }
          if (statusResult.data === "FAILED" || statusResult.data === "CRASHED") {
            log("ERROR", `Deployment ended with status: ${statusResult.data}`);
            onFailure(`Railway deployment failed (${statusResult.data}).`, "DEPLOYMENT_FAILED");
            return;
          }
          log("DEBUG", `Deployment status: ${statusResult.data}`);
        }
      }

      if (!domain) {
        log("ERROR", "No public domain available to verify health.");
        onFailure("Deployment finished but no public domain was created.", "DOMAIN_VERIFICATION_FAILED");
        return;
      }

      const panelUrl = `https://${domain}`;
      log("INFO", `Panel URL: ${panelUrl}`);

      log("INFO", "Waiting for deployment to become healthy");
      const healthy = await waitForWorkerHealthy(panelUrl, 20);
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
  }, [apiToken, formData]);

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
