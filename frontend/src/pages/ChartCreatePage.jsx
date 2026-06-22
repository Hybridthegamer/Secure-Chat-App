import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useBlockchain, ROLE } from "../context/BlockchainContext";
import ChartRenderer from "../components/ChartRenderer";
import "./ChartCreatePage.css";

const CHART_TYPES = ["bar", "line", "pie", "scatter"];

const DEFAULTS = {
  bar: {
    labels:   ["January","February","March","April","May","June"],
    datasets: [{ label: "Dataset 1", data: [65, 59, 80, 81, 56, 72] }]
  },
  line: {
    labels:   ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    datasets: [{ label: "Trend", data: [30, 45, 28, 60, 75, 55, 90], fill: true }]
  },
  pie: {
    labels:   ["Category A","Category B","Category C","Category D"],
    datasets: [{ label: "Distribution", data: [40, 25, 20, 15] }]
  },
  scatter: {
    labels:   [],
    datasets: [{
      label: "Data Points",
      data: Array.from({length:10}, (_,i) => ({ x: i*10, y: Math.round(Math.random()*100) }))
    }]
  }
};

export default function ChartCreatePage() {
  const { csContract, isConnected, userRole } = useBlockchain();
  const navigate = useNavigate();

  const [title,       setTitle]       = useState("");
  const [chartType,   setChartType]   = useState("bar");
  const [description, setDescription] = useState("");
  const [labelsText,  setLabelsText]  = useState(JSON.stringify(DEFAULTS.bar.labels, null, 2));
  const [datasetsText,setDatasetsText]= useState(JSON.stringify(DEFAULTS.bar.datasets, null, 2));
  const [isSubmitting,setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");
  const [parseError,  setParseError]  = useState({ labels: "", datasets: "" });

  if (!isConnected) return <Navigate to="/" replace />;
  if (userRole < ROLE.Editor) return <Navigate to="/dashboard" replace />;

  const handleTypeChange = (t) => {
    setChartType(t);
    setLabelsText(JSON.stringify(DEFAULTS[t].labels, null, 2));
    setDatasetsText(JSON.stringify(DEFAULTS[t].datasets, null, 2));
    setParseError({ labels: "", datasets: "" });
  };

  const validateJSON = (text, field) => {
    try {
      JSON.parse(text);
      setParseError((p) => ({ ...p, [field]: "" }));
      return true;
    } catch (e) {
      setParseError((p) => ({ ...p, [field]: e.message }));
      return false;
    }
  };

  const previewChart = () => {
    try {
      const l = JSON.parse(labelsText);
      const d = JSON.parse(datasetsText);
      return { labelsJSON: JSON.stringify(l), datasetsJSON: JSON.stringify(d), title, chartType };
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const labelsOk   = validateJSON(labelsText, "labels");
    const datasetsOk = validateJSON(datasetsText, "datasets");
    if (!labelsOk || !datasetsOk) return;
    if (!title.trim()) { setError("Chart title is required."); return; }

    setSubmitting(true);
    try {
      const compactLabels   = JSON.stringify(JSON.parse(labelsText));
      const compactDatasets = JSON.stringify(JSON.parse(datasetsText));

      const tx = await csContract.createChart(
        title.trim(),
        chartType,
        compactLabels,
        compactDatasets,
        description.trim()
      );
      await tx.wait();
      navigate("/dashboard");
    } catch (err) {
      setError(err.reason || err.message || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  };

  const preview = previewChart();

  return (
    <div className="create-page">
      <div className="create-form-panel">
        <div className="page-header">
          <div>
            <h1 className="page-title">Create Chart</h1>
            <p className="page-subtitle">Data will be encrypted and stored on blockchain</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label>Chart Title *</label>
            <input
              className="form-control"
              placeholder="e.g. Monthly Revenue Q1 2024"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Chart Type</label>
            <div className="type-selector">
              {CHART_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`type-btn ${chartType === t ? "active" : ""}`}
                  onClick={() => handleTypeChange(t)}
                >
                  {t === "bar" ? "📊" : t === "line" ? "📈" : t === "pie" ? "🥧" : "✦"}
                  {" "}{t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Brief description of this chart's data"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Labels (JSON array)</label>
            <textarea
              className={`form-control code-input ${parseError.labels ? "input-error" : ""}`}
              rows={4}
              value={labelsText}
              onChange={(e) => {
                setLabelsText(e.target.value);
                validateJSON(e.target.value, "labels");
              }}
              spellCheck={false}
            />
            {parseError.labels && <span className="field-error">{parseError.labels}</span>}
            <span className="field-hint">For scatter charts, leave as empty array <code>[]</code></span>
          </div>

          <div className="form-group">
            <label>Datasets (JSON array — Chart.js format)</label>
            <textarea
              className={`form-control code-input ${parseError.datasets ? "input-error" : ""}`}
              rows={8}
              value={datasetsText}
              onChange={(e) => {
                setDatasetsText(e.target.value);
                validateJSON(e.target.value, "datasets");
              }}
              spellCheck={false}
            />
            {parseError.datasets && <span className="field-error">{parseError.datasets}</span>}
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? <><span className="spinner"></span> Recording on Blockchain…</>
                : "⛓️ Store on Blockchain"}
            </button>
          </div>
        </form>
      </div>

      <div className="create-preview-panel">
        <h2 className="preview-title">Live Preview</h2>
        {preview ? (
          <div className="preview-chart-box">
            <ChartRenderer chart={preview} height={300} />
          </div>
        ) : (
          <div className="preview-placeholder">
            Fix JSON errors to see preview
          </div>
        )}
        <div className="blockchain-info">
          <h3>What gets stored on blockchain</h3>
          <ul>
            <li>Chart title, type &amp; description</li>
            <li>Labels and dataset values (as JSON)</li>
            <li>Creator wallet address</li>
            <li>Timestamp of creation</li>
            <li>Cryptographic hash linked to genesis block</li>
          </ul>
          <p className="info-note">
            Every future update will append a new block, preserving the full history.
          </p>
        </div>
      </div>
    </div>
  );
}
