import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useBlockchain, ROLE } from "../context/BlockchainContext";
import ChartRenderer from "../components/ChartRenderer";
import "./ChartCreatePage.css";

export default function ChartEditPage() {
  const { id } = useParams();
  const { csContract, isConnected, userRole } = useBlockchain();
  const navigate = useNavigate();

  const [chart,        setChart]       = useState(null);
  const [labelsText,   setLabelsText]  = useState("");
  const [datasetsText, setDatasetsText]= useState("");
  const [description,  setDescription] = useState("");
  const [isLoading,    setLoading]     = useState(true);
  const [isSubmitting, setSubmitting]  = useState(false);
  const [error,        setError]       = useState("");
  const [parseError,   setParseError]  = useState({ labels: "", datasets: "" });

  if (!isConnected) return <Navigate to="/" replace />;
  if (userRole < ROLE.Editor) return <Navigate to="/dashboard" replace />;

  useEffect(() => {
    if (!csContract || !id) return;
    (async () => {
      try {
        const c = await csContract.getChart(Number(id));
        const record = {
          chartId:      Number(c.chartId),
          title:        c.title,
          chartType:    c.chartType,
          labelsJSON:   c.labelsJSON,
          datasetsJSON: c.datasetsJSON,
          description:  c.description,
          creator:      c.creator,
          createdAt:    c.createdAt,
          lastModified: c.lastModified,
        };
        setChart(record);
        setLabelsText(JSON.stringify(JSON.parse(c.labelsJSON || "[]"), null, 2));
        setDatasetsText(JSON.stringify(JSON.parse(c.datasetsJSON || "[]"), null, 2));
        setDescription(c.description || "");
      } catch (err) {
        setError("Failed to load chart: " + (err.reason || err.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [csContract, id]);

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
    if (!chart) return null;
    try {
      const l = JSON.parse(labelsText);
      const d = JSON.parse(datasetsText);
      return { ...chart, labelsJSON: JSON.stringify(l), datasetsJSON: JSON.stringify(d) };
    } catch { return null; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const labelsOk   = validateJSON(labelsText, "labels");
    const datasetsOk = validateJSON(datasetsText, "datasets");
    if (!labelsOk || !datasetsOk) return;

    setSubmitting(true);
    setError("");
    try {
      const compactLabels   = JSON.stringify(JSON.parse(labelsText));
      const compactDatasets = JSON.stringify(JSON.parse(datasetsText));

      const tx = await csContract.updateChart(
        Number(id),
        compactLabels,
        compactDatasets,
        description.trim()
      );
      await tx.wait();
      navigate(`/charts/${id}`);
    } catch (err) {
      setError(err.reason || err.message || "Transaction failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="loading-spinner"><div className="spinner"></div>Loading…</div>;

  const preview = previewChart();

  return (
    <div className="create-page">
      <div className="create-form-panel">
        <div className="page-header">
          <div>
            <h1 className="page-title">Edit Chart</h1>
            <p className="page-subtitle">
              {chart?.title} — updating creates a new immutable block
            </p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          ⛓️ Updating this chart will append a new block to the blockchain.
          The previous version is preserved permanently in the audit trail.
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label>Chart Type</label>
            <div className="form-control" style={{ color: "var(--text-secondary)", textTransform: "capitalize" }}>
              {chart?.chartType} (cannot change type after creation)
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-control"
              rows={2}
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
          </div>

          <div className="form-group">
            <label>Datasets (JSON array)</label>
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
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/charts/${id}`)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? <><span className="spinner"></span> Appending Block…</>
                : "⛓️ Save to Blockchain"}
            </button>
          </div>
        </form>
      </div>

      <div className="create-preview-panel">
        <h2 className="preview-title">Live Preview</h2>
        {preview ? (
          <div className="preview-chart-box">
            <ChartRenderer chart={preview} height={280} />
          </div>
        ) : (
          <div className="preview-placeholder">Fix JSON errors to preview</div>
        )}
      </div>
    </div>
  );
}
