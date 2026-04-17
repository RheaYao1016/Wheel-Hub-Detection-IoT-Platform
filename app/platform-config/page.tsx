"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import { useLocale } from "../components/Locale/LocaleProvider";
import { readStoredAuthSession } from "@/lib/auth-session";
import {
  getDefaultRuntimeEndpointConfig,
  readRuntimeEndpointConfig,
  resetRuntimeEndpointConfig,
  saveRuntimeEndpointConfig,
  type RuntimeEndpointConfig,
} from "@/lib/runtime-endpoint-config";

type PlatformHealthPayload = {
  backend: {
    status: string;
    time: string;
  };
  aiMl: {
    status: string;
    baseUrl: string;
  };
  auth: {
    loginEndpoint: string;
    sessionEndpoint: string;
    logoutEndpoint: string;
  };
  enterprise: {
    overviewEndpoint: string;
    providersEndpoint: string;
    promptPresetsEndpoint: string;
  };
};

type ProbeState = {
  status: "idle" | "checking" | "success" | "error";
  message: string;
  payload: PlatformHealthPayload | null;
};

const INITIAL_PROBE_STATE: ProbeState = {
  status: "idle",
  message: "",
  payload: null,
};

export default function PlatformConfigPage() {
  const { text, t } = useLocale();
  const [form, setForm] = useState<RuntimeEndpointConfig>(() =>
    readRuntimeEndpointConfig(),
  );
  const [notice, setNotice] = useState("");
  const [probe, setProbe] = useState<ProbeState>(INITIAL_PROBE_STATE);
  const [hasSession, setHasSession] = useState(false);

  const defaults = useMemo(() => getDefaultRuntimeEndpointConfig(), []);

  useEffect(() => {
    setHasSession(Boolean(readStoredAuthSession()));

    const syncConfig = () => {
      setForm(readRuntimeEndpointConfig());
    };

    syncConfig();
    window.addEventListener(
      "app:endpoints-change",
      syncConfig as EventListener,
    );
    return () =>
      window.removeEventListener(
        "app:endpoints-change",
        syncConfig as EventListener,
      );
  }, []);

  const probeHealth = async (apiBaseUrl: string) => {
    setProbe({
      status: "checking",
      message: t("pages.platform_config.copy001"),
      payload: null,
    });

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/health`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        data?: PlatformHealthPayload;
        message?: string;
      };

      setProbe({
        status: "success",
        message: payload.message || t("pages.platform_config.copy002"),
        payload: payload.data ?? null,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? t("pages.platform_config.copy003")
          : error instanceof Error
            ? error.message
            : t("pages.platform_config.copy004");

      setProbe({
        status: "error",
        message,
        payload: null,
      });
    }
  };

  useEffect(() => {
    probeHealth(form.apiBaseUrl).catch(console.error);
  }, []);

  const handleSave = async () => {
    saveRuntimeEndpointConfig(form);
    setNotice(t("pages.platform_config.copy005"));
    await probeHealth(form.apiBaseUrl);
  };

  const handleReset = async () => {
    resetRuntimeEndpointConfig();
    setForm(defaults);
    setNotice(t("pages.platform_config.copy006"));
    await probeHealth(defaults.apiBaseUrl);
  };

  const updateField = <K extends keyof RuntimeEndpointConfig>(
    key: K,
    value: RuntimeEndpointConfig[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const backendStatusClass =
    probe.status === "success"
      ? "status-success"
      : probe.status === "error"
        ? "status-danger"
        : "status-warning";
  const aiStatusClass =
    probe.payload?.aiMl.status === "up"
      ? "status-success"
      : probe.payload?.aiMl.status === "down"
        ? "status-danger"
        : "status-warning";

  return (
    <div className="enterprise-shell">
      <BackButton fallbackHref={hasSession ? "/workspace" : "/login"} />

      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.platform_config.copy007")}</span>
          <h1>{t("pages.platform_config.copy008")}</h1>
          <p>{t("pages.platform_config.copy009")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.platform_config.copy010")}</span>
            <strong>{form.apiBaseUrl}</strong>
          </div>
          <div>
            <span>{t("pages.platform_config.copy011")}</span>
            <strong>{form.aiProviderBaseUrl}</strong>
          </div>
          <div>
            <span>{t("pages.platform_config.copy012")}</span>
            <strong>{form.chatModel}</strong>
          </div>
        </div>
      </section>

      {notice ? <div className="auth-message">{notice}</div> : null}

      <div className="enterprise-grid">
        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.platform_config.copy013")}
              </span>
              <h2>{t("pages.platform_config.copy014")}</h2>
            </div>
          </div>

          <div className="enterprise-form-grid">
            <label>
              <span>{t("pages.platform_config.copy015")}</span>
              <input
                value={form.apiBaseUrl}
                onChange={(event) =>
                  updateField("apiBaseUrl", event.target.value)
                }
                placeholder="http://localhost:18081/api"
              />
            </label>

            <label>
              <span>{t("pages.platform_config.copy011")}</span>
              <input
                value={form.aiProviderBaseUrl}
                onChange={(event) =>
                  updateField("aiProviderBaseUrl", event.target.value)
                }
                placeholder="https://api.openai.com/v1"
              />
            </label>

            <label>
              <span>{t("pages.platform_config.copy012")}</span>
              <input
                value={form.chatModel}
                onChange={(event) =>
                  updateField("chatModel", event.target.value)
                }
                placeholder="gpt-4o-mini"
              />
            </label>

            <label>
              <span>{t("pages.platform_config.copy016")}</span>
              <input
                value={form.embeddingModel}
                onChange={(event) =>
                  updateField("embeddingModel", event.target.value)
                }
                placeholder="text-embedding-3-small"
              />
            </label>
          </div>

          <div className="enterprise-action-row">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={handleSave}
            >
              {t("pages.platform_config.copy017")}
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => probeHealth(form.apiBaseUrl)}
            >
              {t("pages.platform_config.copy018")}
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={handleReset}
            >
              {t("pages.platform_config.copy019")}
            </button>
          </div>

          <div className="enterprise-note-card">
            <strong>{t("pages.platform_config.copy020")}</strong>
            <span>{t("pages.platform_config.copy021")}</span>
          </div>
        </Card>

        <div className="enterprise-card-stack enterprise-panel-scroll">
          <Card className="enterprise-main-card">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  {t("pages.platform_config.copy022")}
                </span>
                <h2>{t("pages.platform_config.copy023")}</h2>
              </div>
            </div>

            <div className="enterprise-data-meta">
              <div>
                <span>{t("pages.platform_config.copy024")}</span>
                <strong className={`status-chip ${backendStatusClass}`}>
                  {probe.status}
                </strong>
              </div>
              <div>
                <span>{t("pages.platform_config.copy025")}</span>
                <strong>{probe.payload?.backend.status ?? "--"}</strong>
              </div>
              <div>
                <span>{t("pages.platform_config.copy026")}</span>
                <strong className={`status-chip ${aiStatusClass}`}>
                  {probe.payload?.aiMl.status ?? "--"}
                </strong>
              </div>
            </div>

            <div className="enterprise-note-card">
              <strong>{t("pages.platform_config.copy027")}</strong>
              <span>{probe.message || t("pages.platform_config.copy028")}</span>
            </div>

            <div className="enterprise-highlight-list">
              <div>
                <strong>{t("pages.platform_config.copy029")}</strong>
                <p>{`${form.apiBaseUrl}/health`}</p>
              </div>
              <div>
                <strong>{t("pages.platform_config.copy030")}</strong>
                <p>
                  {probe.payload
                    ? `${form.apiBaseUrl}${probe.payload.auth.loginEndpoint.replace("/api", "")}`
                    : `${form.apiBaseUrl}/auth/login`}
                </p>
              </div>
              <div>
                <strong>{t("pages.platform_config.copy031")}</strong>
                <p>
                  {probe.payload
                    ? `${form.apiBaseUrl}${probe.payload.auth.sessionEndpoint.replace("/api", "")}`
                    : `${form.apiBaseUrl}/auth/session`}
                </p>
              </div>
              <div>
                <strong>{t("pages.platform_config.copy032")}</strong>
                <p>
                  {probe.payload?.aiMl.baseUrl ??
                    t("pages.platform_config.copy033")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="enterprise-main-card">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  {t("pages.platform_config.copy034")}
                </span>
                <h2>{t("pages.platform_config.copy035")}</h2>
              </div>
            </div>

            <div className="enterprise-card-stack">
              <Link
                href={hasSession ? "/workspace" : "/login"}
                className="enterprise-list-item"
              >
                <strong>
                  {hasSession
                    ? t("pages.platform_config.copy036")
                    : t("pages.platform_config.copy037")}
                </strong>
                <span>
                  {hasSession
                    ? t("pages.platform_config.copy038")
                    : t("pages.platform_config.copy039")}
                </span>
              </Link>
              <Link href="/ai-assistant" className="enterprise-list-item">
                <strong>{t("pages.platform_config.copy040")}</strong>
                <span>{t("pages.platform_config.copy041")}</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
