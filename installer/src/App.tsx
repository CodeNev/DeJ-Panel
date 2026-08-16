import { useEffect, useReducer, useState } from "react";
import { installerReducer } from "./state/machine";
import { createInitialInstallerState } from "./state/types";
import { runPrerequisiteChecks } from "./state/prerequisites";
import { persistInstallerState } from "./state/persistence";
import { PlatformSelection } from "./steps/PlatformSelection";
import { CloudflareAuthentication } from "./steps/CloudflareAuthentication";
import { ProjectConfiguration } from "./steps/ProjectConfiguration";
import { SecurityConfiguration } from "./steps/SecurityConfiguration";
import { ReviewScreen } from "./steps/ReviewScreen";
import { DeploymentRunner } from "./steps/DeploymentRunner";
import { CompletionScreen, FailedScreen } from "./steps/ResultScreens";
import type { InstallerLocale } from "./i18n";
import { t } from "./i18n";

export default function App() {
  const [state, dispatch] = useReducer(installerReducer, undefined, createInitialInstallerState);
  const [locale, setLocale] = useState<InstallerLocale>("fa");

  useEffect(() => {
    document.documentElement.dir = locale === "fa" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    persistInstallerState(state);
  }, [state]);

  const currentStep = state.steps[state.currentStepIndex];

  async function handlePlatformSelected(platform: "cloudflare" | "railway") {
    dispatch({ type: "SELECT_PLATFORM", platform });
    dispatch({
      type: "ADD_LOG",
      log: { timestamp: Date.now(), level: "INFO", message: `Platform selected: ${platform}` },
    });
    const checks = await runPrerequisiteChecks(platform);
    dispatch({ type: "SET_PREREQUISITES", prerequisites: checks });
    dispatch({ type: "NEXT_STEP" });
  }

  function handleCloudflareVerified(apiToken: string, accountId: string, accountName: string) {
    dispatch({ type: "SET_CREDENTIALS", apiToken, accountId });
    dispatch({
      type: "ADD_LOG",
      log: { timestamp: Date.now(), level: "INFO", message: `Cloudflare account verified: ${accountName}` },
    });
    dispatch({ type: "NEXT_STEP" });
  }

  function handleDeploymentFailure(message: string, code: string) {
    dispatch({
      type: "FAIL",
      error: {
        code,
        message,
        failedStep: "DEPLOYMENT",
        possibleCauses: [
          "Invalid or expired Cloudflare API token",
          "Insufficient token permissions",
          "Resource name conflict",
          "Cloudflare API rate limiting",
          "Network or CORS restriction from GitHub Pages",
        ],
        requestId: crypto.randomUUID(),
        retryable: true,
      },
    });
  }

  return (
    <div className="dej-installer">
      <header className="dej-header">
        <span className="dej-brand">{t(locale, "appTitle")}</span>
        <div className="dej-header-actions">
          <button type="button" onClick={() => setLocale(locale === "fa" ? "en" : "fa")}>
            {locale === "fa" ? "EN" : "فا"}
          </button>
          <a href="https://github.com/CodeNev/DeJ-Panel" target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
          <a href="https://t.me/CodeNev" target="_blank" rel="noreferrer noopener">
            @CodeNev
          </a>
        </div>
      </header>

      <main className="dej-main">
        {state.status === "FAILED" && state.error ? (
          <FailedScreen
            error={state.error}
            onBack={() => dispatch({ type: "PREV_STEP" })}
            onRetry={() => dispatch({ type: "CLEAR_ERROR" })}
          />
        ) : (
          <>
            {currentStep === "PLATFORM_SELECTION" && (
              <PlatformSelection locale={locale} onSelect={handlePlatformSelected} />
            )}

            {currentStep === "PREREQUISITE_CHECK" && (
              <div className="dej-step">
                <ul className="dej-prereq-list">
                  {state.prerequisites.map((p) => (
                    <li key={p.id} className={`dej-prereq dej-prereq-${p.status.toLowerCase()}`}>
                      <strong>{p.title}</strong>
                      <span>{p.description}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => dispatch({ type: "NEXT_STEP" })}>
                  {t(locale, "next")}
                </button>
              </div>
            )}

            {currentStep === "AUTHENTICATION" && state.platform === "cloudflare" && (
              <CloudflareAuthentication locale={locale} onVerified={handleCloudflareVerified} />
            )}

            {currentStep === "ACCOUNT_VALIDATION" && (
              <div className="dej-step">
                <p className="dej-mono">Account: {state.credentials?.accountId}</p>
                <button type="button" onClick={() => dispatch({ type: "NEXT_STEP" })}>
                  {t(locale, "next")}
                </button>
              </div>
            )}

            {currentStep === "PROJECT_CONFIGURATION" && state.platform && state.credentials && (
              <ProjectConfiguration
                locale={locale}
                platform={state.platform}
                apiToken={state.credentials.apiToken}
                accountId={state.credentials.accountId ?? ""}
                onSubmit={(data) => {
                  dispatch({ type: "UPDATE_FORM", patch: data });
                  dispatch({ type: "NEXT_STEP" });
                }}
              />
            )}

            {currentStep === "SECURITY_CONFIGURATION" && (
              <SecurityConfiguration
                locale={locale}
                onSubmit={(data) => {
                  dispatch({ type: "UPDATE_FORM", patch: data });
                  dispatch({ type: "NEXT_STEP" });
                }}
              />
            )}

            {(currentStep === "ENVIRONMENT_CONFIGURATION" ||
              currentStep === "DOMAIN_CONFIGURATION" ||
              currentStep === "DEPLOYMENT_PREPARATION") &&
              state.platform && (
                <ReviewScreen
                  locale={locale}
                  platform={state.platform}
                  formData={state.formData}
                  onBack={() => dispatch({ type: "PREV_STEP" })}
                  onConfirm={() => dispatch({ type: "NEXT_STEP" })}
                />
              )}

            {(currentStep === "DEPLOYMENT" || currentStep === "DEPLOYMENT_MONITORING") &&
              state.platform === "cloudflare" &&
              state.credentials && (
                <DeploymentRunner
                  apiToken={state.credentials.apiToken}
                  accountId={state.credentials.accountId ?? ""}
                  formData={state.formData}
                  onLog={(log) => dispatch({ type: "ADD_LOG", log })}
                  onResource={(resource) =>
                    dispatch({ type: "ADD_RESOURCE", resource: { ...resource, createdAt: Date.now() } })
                  }
                  onSuccess={() => dispatch({ type: "NEXT_STEP" })}
                  onFailure={handleDeploymentFailure}
                />
              )}

            {(currentStep === "DATABASE_MIGRATION" ||
              currentStep === "HEALTH_CHECK" ||
              currentStep === "VERIFICATION") && (
              <div className="dej-step">
                <p>Step: {currentStep}</p>
                <button type="button" onClick={() => dispatch({ type: "NEXT_STEP" })}>
                  {t(locale, "next")}
                </button>
              </div>
            )}

            {currentStep === "COMPLETED" && <CompletionScreen state={state} />}
          </>
        )}
      </main>

      <footer className="dej-footer">
        <span>DeJ Panel</span>
        <a href="https://github.com/CodeNev/DeJ-Panel">GitHub</a>
        <a href="https://t.me/CodeNev">@CodeNev</a>
        <span>v0.1.0</span>
      </footer>
    </div>
  );
}
