import { useEffect, useRef, useState } from "react";
import { cfCreateD1Database } from "../providers/cloudflare-deploy";
import type { InstallerFormData, InstallerLogLine } from "../state/types";

type Props = {
  apiToken: string;
  accountId: string;
  formData: InstallerFormData;
  onLog: (log: InstallerLogLine) => void;
  onResource: (resource: { type: "d1_database"; id: string; name: string }) => void;
  onSuccess: () => void;
  onFailure: (message: string, code: string) => void;
};

export function DeploymentRunner({ apiToken, accountId, formData, onLog, onResource, onSuccess, onFailure }: Props) {
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
      log("INFO", "Initializing deployment");

      log("INFO", `Creating D1 database: ${formData.databaseName}`);
      const dbResult = await cfCreateD1Database(apiToken, accountId, formData.databaseName ?? "dej_panel_db");
      if (!dbResult.ok) {
        log("ERROR", `D1 creation failed: ${dbResult.message}`);
        onFailure(dbResult.message, dbResult.code);
        return;
      }
      log("INFO", `D1 database created (${dbResult.data.uuid})`);
      onResource({ type: "d1_database", id: dbResult.data.uuid, name: dbResult.data.name });

      log("INFO", "Worker deployment requires the built application bundle.");
      log(
        "WARN",
        "This installer prepared your database and account — pushing the actual Worker code (git clone + wrangler deploy or GitHub Actions) is the next automated step, since a static GitHub Pages page cannot upload a full Worker bundle by itself."
      );
      log("INFO", "Applying migrations to the new D1 database is required before first use.");

      onSuccess();
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
