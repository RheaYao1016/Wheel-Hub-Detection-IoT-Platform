export type ApiEnvelope<T> = {
  status: "success" | "error";
  message: string;
  requestId: string;
  data: T;
};

export type AiProviderProfile = {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyMasked: string;
  chatModel: string;
  embeddingModel: string;
  enabled: boolean;
  defaultStrategy: string;
  systemPrompt: string;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string;
};

export type DataSourceProfile = {
  id: string;
  type: string;
  name: string;
  connectionMeta: Record<string, string>;
  storagePath: string;
  schemaProfile: string;
  status: string;
  rowCount: number;
  qualityScore: string;
  previewRows: Array<Record<string, string>>;
  createdAt: string;
  updatedAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  persona: string;
  locale: "zh-CN" | "en-US";
  promptPresetId: string;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string;
};

export type PromptPreset = {
  id: string;
  name: string;
  objective: string;
  recommendedTemplate: string;
  systemPrompt: string;
  operationTargets: string[];
};

export type AiAssistantSettings = {
  indexWindowDays: number;
  updatedAt: string;
  updatedBy: string;
};

export type AiIndexEntry = {
  indexId: string;
  category: string;
  type: string;
  label: string;
  route: string;
  entityType: string;
  entityId: string;
  operation: string;
  accessLevel: string;
  status: string;
  updatedAt: string;
  tags: string[];
};

export type ProtocolChoice = {
  code: string;
  label: string;
  indexId: string;
};

export type AiProtocolEnvelope = {
  version: string;
  displayText: string;
  intent: string;
  type: string;
  operation: string;
  indexIds: string[];
  target: string;
  auth: string;
  params: Record<string, string>;
  choices: ProtocolChoice[];
  followUp: string;
  confidence: number;
  unknownIndexes: string[];
  raw: string;
};

export type IntentCatalogItem = {
  id: string;
  utterance: string;
  intent: string;
  operation: string;
  indexHints: string[];
  followUp: string;
};

export type AiProtocolGuide = {
  settings: AiAssistantSettings;
  formatSpecification: string;
  chatPrompt: string;
  analysisPrompt: string;
  intentClassifierPrompt: string;
  intentCategories: string[];
  examples: IntentCatalogItem[];
};

export type IntentAssessment = {
  intent: string;
  reason: string;
  suggestedTemplate: string;
};

export type AssistantAction = {
  id: string;
  type: string;
  label: string;
  target: string;
  payload: Record<string, string>;
  confidence: number;
};

export type ChatMessage = {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  promptPresetId: string;
  createdAt: string;
  promptTokens: number;
  completionTokens: number;
  sourceRefs: string[];
  intentAssessment: IntentAssessment | null;
  actions: AssistantAction[];
  protocol: AiProtocolEnvelope | null;
};

export type AnalysisResult = {
  headline: string;
  summary: string;
  findings: string[];
  recommendations: string[];
  evidence: Array<{ label: string; detail: string }>;
  riskLevel: string;
  confidence: number;
  inspectionDomain?: string;
  riskScore?: number;
  metrics?: Array<{ label: string; value: number }>;
  chartSeries?: Array<{ name: string; value: number }>;
  sourceSummary?: string;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
  sourceRefs: string[];
  appliedStrategy: string;
  artifacts: string[];
  promptPresetId: string;
  intentAssessment: IntentAssessment | null;
  actions: AssistantAction[];
  protocol: AiProtocolEnvelope | null;
};

export type AnalysisJob = {
  id: string;
  prompt: string;
  template: string;
  verbosity: string;
  promptPresetId: string;
  sourceIds: string[];
  status: string;
  result: AnalysisResult;
  reportIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ReportArtifact = {
  id: string;
  jobId: string;
  format: string;
  filename: string;
  storagePath: string;
  summary: string;
  createdAt: string;
};

export type AnnotationProject = {
  id: string;
  name: string;
  description: string;
  categories: string[];
  assetIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type AnnotationAsset = {
  id: string;
  projectId: string;
  filename: string;
  storagePath: string;
  split: string;
  width: number;
  height: number;
  createdAt: string;
};

export type AnnotationLabel = {
  id: string;
  assetId: string;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: string;
};

export type TrainingMetricPoint = {
  epoch: number;
  loss: number;
  map50: number;
  precision: number;
  recall: number;
};

export type TrainingJob = {
  id: string;
  datasetId: string;
  taskType: string;
  baseModel: string;
  deviceMode: string;
  preset: string;
  epochCount: number;
  status: string;
  progress: number;
  metrics: TrainingMetricPoint[];
  artifacts: string[];
  startedAt: string;
  finishedAt: string;
};

export type ModelVersion = {
  id: string;
  name: string;
  sourceJobId: string;
  taskType: string;
  artifactPath: string;
  metricsSummary: string;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  actor: string;
  role: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  createdAt: string;
};

export type EnterpriseOverview = {
  providers: AiProviderProfile[];
  promptPresets: PromptPreset[];
  dataSources: DataSourceProfile[];
  analysisJobs: AnalysisJob[];
  trainingJobs: TrainingJob[];
  reports: ReportArtifact[];
  modelVersions: ModelVersion[];
  recentAuditLogs: AuditLog[];
};
