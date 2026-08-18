import { styles } from "../styles";

export function SummaryCell({
  label,
  value,
  tone,
  emphasize,
  flagged,
}: {
  label: string;
  value: string;
  tone?: "danger" | "positive";
  emphasize?: boolean;
  flagged?: boolean;
}) {
  return (
    <div style={styles.summaryCell} className="ht-summary-cell">
      <div style={styles.summaryLabel}>{label}</div>
      <div
        className={emphasize ? "ht-summary-value-emphasize" : "ht-summary-value"}
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          color: tone === "danger" ? "#B5432E" : tone === "positive" ? "#1E7A5E" : "#1A1A1A",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
        {flagged && <span style={{ color: "#3A5FA0" }}> *</span>}
      </div>
    </div>
  );
}
