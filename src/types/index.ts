export type AdminRole = "super_admin" | "client_admin";

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  clientId?: string;
}

export interface UserLocation {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  address: string | null;
  capturedAt: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  registeredDate: string;
  lastActive: string;
  status: "active" | "inactive";
  deviceId: string | null;
  sessions: number;
  lastLocation?: UserLocation | null;
}

export interface Device {
  id: string;
  userId: string | null;
  userName: string;
  lastSeen: string;
  firmware: string;
  hardwareVersion: string;
  licenseStatus: "active" | "inactive" | "expired";
  batteryLevel: number;
  createdAt?: string;
  pairedAt?: string | null;
  isPaired?: boolean;
  licenseKey?: string | null;
  licenseId?: string | null;
  licenseExpiry?: string | null;
}

export interface SessionLocation {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  address: string | null;
}

export interface Session {
  id: string;
  name: string | null;
  userId: string;
  userEmail: string;
  userName: string;
  deviceId: string;
  startTime: string;
  endTime: string;
  duration: number;
  dataPoints: number;
  dataSource: "live" | "stored" | "mixed";
  avgTemp: string;
  avgHR: number;
  minHR: number;
  maxHR: number;
  avgSpo2: number;
  minSpo2: number;
  maxSpo2: number;
  location?: SessionLocation | null;
}

export interface License {
  id: string;
  licenseKey: string;
  deviceId: string;
  clientId: string;
  status: "active" | "inactive" | "expired";
  activationDate: string;
  expiryDate: string;
  createdAt?: string;
}

export interface Reading {
  id: string;
  sessionId: string;
  userId: string;
  timestamp: string;
  ecgValue: number;
  temperatureCelsius: number;
  deviceId: string;
}

export interface DashboardMetrics {
  totalUsers: number;
  totalSessions: number;
  activeDevices: number;
  totalDevices: number;
  activeLicenses: number;
  systemHealth: "green" | "yellow" | "red";
}

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

// ─── ECG / RR analysis report ───────────────────────────────────────
// Mirrors GET /admin/readings/:sessionId/reports/ecg-rr. Every statistical
// field is nullable because the backend omits the whole block when a recording
// cannot support analysis, rather than sending zeroes.

export type RrRegularity =
  | "Regular"
  | "Mostly Regular"
  | "Variable"
  | "Highly Variable"
  | "Unavailable";

export type BeatToBeatVariation = "Low" | "Moderate" | "High" | "Unavailable";

export type EcgSignalQualityStatus = "Good" | "Fair" | "Limited" | "Poor" | "Unavailable";

export type EcgRrUnavailableReason =
  | "no_data"
  | "insufficient_data"
  | "poor_signal_quality";

export type EcgRrEventType =
  | "possible_long_rr"
  | "rr_irregularity"
  | "possible_missed_beat"
  | "possible_double_detection"
  | "signal_quality_drop";

export type RrQuality =
  | "valid"
  | "short_rr_candidate"
  | "long_rr_candidate"
  | "possible_missed_beat"
  | "possible_double_detection"
  | "invalid";

export interface EcgRrSummary {
  meanHR: number | null;
  minHR: number | null;
  maxHR: number | null;
  meanRR: number | null;
  minRR: number | null;
  maxRR: number | null;
  rrSD: number | null;
  rrCVPercent: number | null;
  beatsDetected: number;
  validBeats: number;
  invalidBeats: number;
  usablePercentage: number | null;
}

export interface EcgRrRhythm {
  regularity: RrRegularity;
  beatToBeatVariation: BeatToBeatVariation;
  meanAbsRrDifferenceMs: number | null;
  maxAbsRrDifferenceMs: number | null;
  longRREvents: number;
}

export interface EcgRrSignalQuality {
  status: EcgSignalQualityStatus;
  usablePercentage: number | null;
  beatsDetected: number;
  validBeats: number;
  invalidBeats: number;
}

export interface EcgRrEvent {
  timestamp: string | null;
  rPeakTimestamp: number | null;
  eventType: EcgRrEventType;
  durationMs: number | null;
  rrValue: number | null;
  quality: RrQuality;
  description: string | null;
}

/** One analysable RR interval, backing both trend charts. */
export interface EcgRrSeriesPoint {
  offsetSec: number;
  timestamp: string | null;
  rr: number;
  hr: number;
}

export interface EcgRrReport {
  sessionId: string;
  sessionName: string | null;
  userId: string;
  userName: string;
  deviceId: string;
  startTime: string;
  endTime: string;
  recordingDurationSec: number | null;
  analysedAt: string | null;

  available: boolean;
  unavailableReason: EcgRrUnavailableReason | null;
  unavailableMessage: string | null;

  signalQuality: EcgRrSignalQuality;
  events: EcgRrEvent[];

  // Present only when `available` is true.
  summary: EcgRrSummary | null;
  rhythm: EcgRrRhythm | null;
  series: EcgRrSeriesPoint[];
  patientSummary: string | null;
  technicalSummary: string | null;
}

// ─── HRV analysis report ────────────────────────────────────────────
// Mirrors GET /admin/readings/:sessionId/reports/hrv. Metrics are null on any
// non-success status; the backend omits them rather than sending zeroes.

export type HrvStatus = "success" | "insufficient_data" | "poor_signal_quality" | "no_data";

export type HrvQuality = "Good" | "Acceptable" | "Limited" | "Insufficient";

export type HrvBaselineComparison = "in_line" | "higher" | "lower";

export interface HrvRecording {
  durationSec: number | null;
  analysisDurationSec: number | null;
  shortRecording: boolean;
  ultraShortRecording: boolean;
}

export interface HrvQualityBlock {
  status: HrvQuality;
  /** The upstream ECG/RR signal-quality grade this HRV result inherits. */
  ecgSignalQuality: string | null;
  totalIntervals: number;
  validNNIntervals: number;
  excludedIntervals: number;
  usablePercentage: number | null;
  artifactPercentage: number | null;
  successivePairs: number;
  successivePairsSkipped: number;
}

export interface HrvMetrics {
  meanNNMs: number | null;
  minNNMs: number | null;
  maxNNMs: number | null;
  sdnnMs: number | null;
  rmssdMs: number | null;
  pnn50Percent: number | null;
}

export interface HrvBaseline {
  available: boolean;
  sessionsUsed?: number;
  baselineRmssdMs?: number | null;
  baselineSdnnMs?: number | null;
  rmssdChangePercent?: number | null;
  comparison?: HrvBaselineComparison | null;
}

/** One accepted NN interval, backing the HRV trend chart. */
export interface HrvSeriesPoint {
  offsetSec: number;
  timestamp: string | null;
  rPeakTimestamp: number | null;
  nnMs: number;
}

export interface HrvReport {
  sessionId: string;
  sessionName: string | null;
  userId: string;
  userName: string;
  deviceId: string;
  startTime: string;
  endTime: string;
  analysedAt: string | null;

  status: HrvStatus;
  message: string | null;

  recording: HrvRecording;
  quality: HrvQualityBlock;

  // Present only when `status === "success"`.
  metrics: HrvMetrics | null;
  baseline: HrvBaseline;
  timeSeries: HrvSeriesPoint[];
  patientSummary: string | null;
  technicalSummary: string | null;
}

/** One prior session's HRV, for the across-sessions trend. */
export interface HrvTrendPoint {
  sessionId: string;
  sessionName: string | null;
  startTime: string;
  rmssdMs: number;
  sdnnMs: number;
  pnn50Percent: number;
  quality: HrvQuality;
  validNNIntervals: number;
}

export interface HrvTrend {
  points: HrvTrendPoint[];
  currentSessionId?: string;
}

// ─── Rhythm screening report ────────────────────────────────────────
// Mirrors GET /admin/readings/:sessionId/reports/rhythm.

export type RhythmStatus = "success" | "insufficient_data" | "poor_signal_quality" | "no_data";

export type RhythmPattern =
  | "Regular"
  | "Mostly Regular"
  | "Variable"
  | "Highly Variable"
  | "Unavailable";

export type RhythmEventType =
  | "elevated_heart_rate"
  | "low_heart_rate"
  | "irregular_rr_period"
  | "possible_long_rr"
  | "possible_missed_beat"
  | "possible_double_detection"
  | "signal_quality_drop";

export interface RhythmEvent {
  eventType: RhythmEventType;
  startSec: number | null;
  endSec: number | null;
  durationSec: number | null;
  timestamp: string | null;
  heartRateBpm: number | null;
  meanHeartRateBpm: number | null;
  cvPercent: number | null;
  rrValue: number | null;
  beats: number | null;
  /** Cannot be interpreted without activity/rest information. */
  requiresContext: boolean;
  /** A probable detection artifact rather than a physiological observation. */
  requiresQualityReview: boolean;
  description: string | null;
}

export interface RhythmReport {
  sessionId: string;
  sessionName: string | null;
  userName: string;
  deviceId: string;
  startTime: string;
  analysedAt: string | null;

  status: RhythmStatus;
  message: string | null;

  summary: {
    rhythmPattern: RhythmPattern;
    classificationConfidence: number | null;
    averageHR: number | null;
    minimumHR: number | null;
    maximumHR: number | null;
    rrCvPercent: number | null;
    analysedBeats: number;
    recordingDurationSec: number | null;
  } | null;

  screening: {
    elevatedHRPeriods: number;
    lowHRPeriods: number;
    irregularRRPeriods: number;
    possibleLongRREvents: number;
    possibleMissedBeats: number;
    possibleDoubleDetections: number;
  } | null;

  signalQuality: {
    status: string;
    usablePercentage: number | null;
    beatsDetected: number;
    validBeats: number;
    invalidBeats: number;
  };

  events: RhythmEvent[];
  patientSummary: string | null;
  technicalSummary: string | null;
}

// ─── Respiration report ─────────────────────────────────────────────
// Mirrors GET /admin/readings/:sessionId/reports/respiration.

export type RespirationStatus =
  | "success"
  | "insufficient_data"
  | "poor_signal_quality"
  | "disagreement"
  | "no_data";

export type RespirationConfidence = "High" | "Moderate" | "Low" | "Unavailable";

/** One estimator's result, or the reason it could not produce one. */
export interface RespirationEstimate {
  available: boolean;
  rate: number | null;
  freqHz: number | null;
  prominence: number | null;
  quality: "Good" | "Fair" | "Poor" | "Unavailable";
  intervalsUsed?: number | null;
  samplesUsed?: number | null;
  reason: string | null;
  detail: string | null;
}

export interface RespirationTrendPoint {
  offsetSec: number;
  midpointSec: number;
  rateBpm: number | null;
  usable: boolean;
  reason: string | null;
}

export interface RespirationReport {
  sessionId: string;
  sessionName: string | null;
  userName: string;
  deviceId: string;
  startTime: string;
  analysedAt: string | null;

  status: RespirationStatus;
  message: string | null;

  summary: {
    respirationRate: number | null;
    unit: string;
    confidence: RespirationConfidence;
    basis: "ecg_and_ppg" | "ecg_only" | "ppg_only" | null;
    withinPlausibleRange: boolean | null;
  };

  ecgEstimate: RespirationEstimate;
  ppgEstimate: RespirationEstimate;

  crossCheck: {
    status: string | null;
    difference: number | null;
  };

  recording: {
    durationSec: number | null;
    analysedDurationSec: number | null;
    artifactPercentage: number | null;
    spectralResolutionBpm: number | null;
  };

  trend: RespirationTrendPoint[];
  patientSummary: string | null;
  technicalSummary: string | null;
}

// ─── SpO₂ report ────────────────────────────────────────────────────

export type Spo2Status = "success" | "insufficient_data" | "poor_signal_quality" | "no_data";
export type SignalStability = "Stable" | "Moderately variable" | "Variable" | "Unavailable";
export type Spo2EventType = "possible_desaturation" | "low_saturation_period" | "signal_gap";

export interface ReportMeta {
  sessionId: string;
  sessionName: string | null;
  userId: string;
  userName: string;
  deviceId: string;
  startTime: string;
  endTime: string;
  analysedAt: string | null;
}

/** Sample accounting shared by the signal reports. */
export interface SignalCoverage {
  totalSamples: number;
  usableSamples: number;
  excludedSamples: number;
  coveragePct: number | null;
  analysedDurationSec: number | null;
  recordingDurationSec: number | null;
}

export interface Spo2Event {
  eventType: Spo2EventType;
  startSec: number | null;
  endSec: number | null;
  durationSec: number | null;
  timestamp: string | null;
  baselinePct: number | null;
  nadirPct: number | null;
  dropPct: number | null;
  meanPct: number | null;
  thresholdPct: number | null;
  /** False means saturation never returned to baseline — likelier a sensor shift. */
  recovered: boolean | null;
  recoverySec: number | null;
  description: string | null;
}

export interface Spo2Report extends ReportMeta {
  status: Spo2Status;
  message: string | null;
  summary: {
    meanPct: number | null;
    medianPct: number | null;
    minPct: number | null;
    maxPct: number | null;
    sdPct: number | null;
    desaturationEvents: number;
    strictDesaturationEvents: number;
    recoveredDesaturations: number;
    lowSaturationPeriods: number;
    timeBelow90Sec: number | null;
    timeBelow90Percent: number | null;
    timeBelow88Sec: number | null;
    timeBelow88Percent: number | null;
  } | null;
  stability: SignalStability;
  coverage: SignalCoverage;
  events: Spo2Event[];
  series: Array<{
    offsetSec: number;
    timestamp: string | null;
    spo2: number;
    baseline: number | null;
  }>;
  patientSummary: string | null;
  technicalSummary: string | null;
}

// ─── Temperature report ─────────────────────────────────────────────

export type TemperatureStatus = Spo2Status;
/** Which measurement the sensor appears to be making. A label, not a verdict. */
export type TemperatureRegime =
  | "Surface / skin range"
  | "Body-temperature range"
  | "Mixed range"
  | "Unavailable";
export type TemperatureTrend = "Rising" | "Falling" | "Stable" | "Unavailable";
export type TemperatureEventType = "relative_elevation" | "relative_depression";

export interface TemperatureEvent {
  eventType: TemperatureEventType;
  startSec: number | null;
  endSec: number | null;
  durationSec: number | null;
  timestamp: string | null;
  baselineC: number | null;
  peakC: number | null;
  changeC: number | null;
  description: string | null;
}

export interface TemperatureReport extends ReportMeta {
  status: TemperatureStatus;
  message: string | null;
  summary: {
    meanC: number | null;
    medianC: number | null;
    minC: number | null;
    maxC: number | null;
    sdC: number | null;
    startC: number | null;
    endC: number | null;
    totalChangeC: number | null;
    driftCPerMin: number | null;
    elevationEvents: number;
    depressionEvents: number;
  } | null;
  regime: TemperatureRegime;
  trend: TemperatureTrend;
  stability: SignalStability;
  coverage: SignalCoverage;
  events: TemperatureEvent[];
  series: Array<{
    offsetSec: number;
    timestamp: string | null;
    tempC: number;
    baseline: number | null;
  }>;
  patientSummary: string | null;
  technicalSummary: string | null;
}

// ─── Combined report ────────────────────────────────────────────────

export type CombinedStatus = "success" | "insufficient_data" | "no_data";
export type Association =
  | "No clear association"
  | "Weak"
  | "Moderate"
  | "Strong"
  | "Unavailable";
export type AssociationDirection =
  | "Move together"
  | "Move oppositely"
  | "No consistent direction"
  | "Unavailable";

/** One pairwise relationship, or the reason it could not be described. */
export interface CombinedRelationship {
  label: string;
  available: boolean;
  pairs: number;
  minPairs: number | null;
  spanSec: number | null;
  r: number | null;
  rSquared: number | null;
  association: Association;
  direction: AssociationDirection;
  reason: string | null;
  detail: string | null;
}

export interface ConcurrentEvent {
  startSec: number;
  signals: string[];
  spo2EventType: string | null;
  otherEventType: string | null;
  description: string | null;
}

export interface CombinedReport extends ReportMeta {
  status: CombinedStatus;
  message: string | null;
  coverage: {
    rows: number;
    hrPresent: number;
    spo2Present: number;
    tempPresent: number;
    analysedDurationSec: number | null;
    recordingDurationSec: number | null;
  };
  /** Always present — an unavailable pairing carries its reason. */
  relationships: CombinedRelationship[];
  concurrentEvents: ConcurrentEvent[];
  series: Array<{
    offsetSec: number;
    timestamp: string | null;
    hr: number | null;
    spo2: number | null;
    tempC: number | null;
  }>;
  patientSummary: string | null;
  technicalSummary: string | null;
}
