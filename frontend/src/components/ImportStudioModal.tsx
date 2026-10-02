"use client";

import { useState } from "react";
import api from "@/services/api";

interface ParsedRow {
  row_index: number;
  raw_data: Record<string, string>;
  mapped_data: Record<string, string>;
  status: "valid" | "invalid" | "skipped" | "repaired" | "pending";
  errors: string[];
}

interface ImportBatchData {
  batch_id: string;
  file_name: string;
  total_rows: number;
  headers: string[];
  field_mapping: Record<string, string>;
  parsed_rows: ParsedRow[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportStudioModal({ isOpen, onClose, onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<"upload" | "map" | "inspector" | "execute">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [batch, setBatch] = useState<ImportBatchData | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string>("");
  const [editingValue, setEditingValue] = useState<string>("");

  // Progress execution states
  const [executing, setExecuting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [execStatus, setExecStatus] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/import-studio/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setBatch(res.data);
      setMapping(res.data.field_mapping || {});
      setRows(res.data.parsed_rows || []);
      setActiveTab("map");
      setLogs((prev) => [...prev, `[INFO] File "${file.name}" uploaded and headers extracted.`]);
    } catch (err: any) {
      alert(err.response?.data?.message || "File upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleApplyMapping = async () => {
    if (!batch) return;
    try {
      setUploading(true);
      const res = await api.post("/import-studio/apply-mapping", {
        batch_id: batch.batch_id,
        field_mapping: mapping,
      });

      setRows(res.data.parsed_rows || []);
      setActiveTab("inspector");
      setLogs((prev) => [...prev, `[MAPPING] Column mapping updated and row validation complete.`]);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update mapping.");
    } finally {
      setUploading(false);
    }
  };

  const handleRepairRowCell = async (rowIndex: number, field: string, value: string) => {
    if (!batch) return;
    try {
      const res = await api.post("/import-studio/repair-row", {
        batch_id: batch.batch_id,
        row_index: rowIndex,
        field,
        value,
      });
      setRows(res.data.parsed_rows || []);
      setEditingRowIdx(null);
      setLogs((prev) => [...prev, `[REPAIR] Row #${rowIndex} cell '${field}' updated to '${value}'.`]);
    } catch (err: any) {
      alert("Failed to repair cell.");
    }
  };

  const handleSkipRow = async (rowIndex: number) => {
    if (!batch) return;
    try {
      const res = await api.post("/import-studio/skip-row", {
        batch_id: batch.batch_id,
        row_index: rowIndex,
      });
      setRows(res.data.parsed_rows || []);
      setLogs((prev) => [...prev, `[SKIP] Row #${rowIndex} skipped from import batch.`]);
    } catch (err: any) {
      alert("Failed to skip row.");
    }
  };

  const handleExecuteBatch = async () => {
    if (!batch) return;
    try {
      setExecuting(true);
      setActiveTab("execute");
      setProgressPercent(15);
      setExecStatus("Processing background queue chunks...");

      setLogs((prev) => [...prev, `[EXECUTE] Processing chunk import into database...`]);

      const res = await api.post("/import-studio/execute", {
        batch_id: batch.batch_id,
      });

      const updatedBatch = res.data.batch;
      setProgressPercent(100);
      setProcessedCount(updatedBatch.processed_rows);
      setSuccessCount(updatedBatch.successful_rows);
      setFailCount(updatedBatch.failed_rows);
      setExecStatus(`Batch completed with status: ${updatedBatch.status.toUpperCase()}`);

      setLogs((prev) => [
        ...prev,
        `[COMPLETE] Imported ${updatedBatch.successful_rows} rows successfully. ${updatedBatch.failed_rows} failed, ${updatedBatch.skipped_rows} skipped.`,
      ]);

      onSuccess();
    } catch (err: any) {
      setExecStatus("Execution failed.");
      alert(err.response?.data?.message || "Execution failed.");
    } finally {
      setExecuting(false);
    }
  };

  const targetFields = [
    { key: "title", label: "Post Title*", required: true },
    { key: "body", label: "Post Content*", required: true },
    { key: "category", label: "Category", required: false },
    { key: "price", label: "Price ($)", required: false },
    { key: "status", label: "Status", required: false },
  ];

  const validCount = rows.filter((r) => r.status === "valid" || r.status === "repaired").length;
  const invalidCount = rows.filter((r) => r.status === "invalid").length;
  const skippedCount = rows.filter((r) => r.status === "skipped").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
              📊 Advanced Import Studio & Drag-and-Drop Mapper
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Column mapping studio, pre-import validation inspector, inline cell repair, and background chunk execution.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl font-bold px-2 py-1">
            ✕
          </button>
        </div>

        {/* TABS HEADER */}
        <div className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-5 py-2 flex items-center gap-3 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 rounded-lg transition-all ${
              activeTab === "upload" ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            1. Upload File
          </button>
          <button
            disabled={!batch}
            onClick={() => setActiveTab("map")}
            className={`px-4 py-2 rounded-lg transition-all ${
              !batch ? "opacity-50 cursor-not-allowed" : activeTab === "map" ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            2. Field Mapping Studio
          </button>
          <button
            disabled={!batch}
            onClick={() => setActiveTab("inspector")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              !batch ? "opacity-50 cursor-not-allowed" : activeTab === "inspector" ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            3. Error Inspector ({invalidCount > 0 ? <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">{invalidCount} Errors</span> : "Clean"})
          </button>
          <button
            disabled={!batch}
            onClick={() => setActiveTab("execute")}
            className={`px-4 py-2 rounded-lg transition-all ${
              !batch ? "opacity-50 cursor-not-allowed" : activeTab === "execute" ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            4. Live Execution Logs
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200">
          {/* TAB 1: UPLOAD */}
          {activeTab === "upload" && (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 dark:border-indigo-800 rounded-2xl p-12 bg-indigo-50/50 dark:bg-indigo-950/20 text-center">
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center text-3xl mb-4 shadow-lg shadow-indigo-500/30">
                📁
              </div>
              <h3 className="text-lg font-bold mb-2">Upload Excel or CSV Dataset</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                Select or drag a .csv or .xlsx file to automatically extract column headers and prepare drag-and-drop mapping.
              </p>

              <input
                type="file"
                accept=".csv, .xlsx"
                className="hidden"
                id="fileStudioInput"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSelectedFile(e.target.files[0]);
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <label
                htmlFor="fileStudioInput"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                {uploading ? "Parsing File..." : "Choose File / Drop Here"}
              </label>
            </div>
          )}

          {/* TAB 2: DRAG & DROP FIELD MAPPING STUDIO */}
          {activeTab === "map" && batch && (
            <div className="space-y-6">
              <div className="bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-200">
                    File: <span className="underline">{batch.file_name}</span> ({batch.total_rows} Rows Detected)
                  </h4>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    Auto-detected matches are highlighted. Drag or select the corresponding CSV header for each target database field.
                  </p>
                </div>
                <button
                  onClick={handleApplyMapping}
                  disabled={uploading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {uploading ? "Applying..." : "Validate & Continue →"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {targetFields.map((tf) => {
                  const currentMapped = mapping[tf.key] || "";
                  return (
                    <div
                      key={tf.key}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{tf.label}</span>
                        {currentMapped ? (
                          <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                            Mapped to: {currentMapped}
                          </span>
                        ) : (
                          <span className="text-xs bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-semibold px-2 py-0.5 rounded-full">
                            Unmapped
                          </span>
                        )}
                      </div>

                      <select
                        value={currentMapped}
                        onChange={(e) => setMapping({ ...mapping, [tf.key]: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- Do Not Import / Skip --</option>
                        {batch.headers.map((h) => (
                          <option key={h} value={h}>
                            Header Column: {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: VALIDATION ERROR INSPECTOR & INLINE CELL REPAIR */}
          {activeTab === "inspector" && batch && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl">
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-3 py-1 rounded-full">
                    ✅ Ready: {validCount}
                  </span>
                  <span className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-3 py-1 rounded-full">
                    ⚠️ Validation Errors: {invalidCount}
                  </span>
                  <span className="bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300 px-3 py-1 rounded-full">
                    ⏭️ Skipped: {skippedCount}
                  </span>
                </div>

                <button
                  onClick={handleExecuteBatch}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
                >
                  🚀 Execute Batch Import Now
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-200 uppercase font-semibold">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Body</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Price ($)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Validation Result</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                    {rows.map((row) => {
                      const isInvalid = row.status === "invalid";
                      const isSkipped = row.status === "skipped";
                      const isRepaired = row.status === "repaired";

                      return (
                        <tr
                          key={row.row_index}
                          className={`${
                            isInvalid
                              ? "bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200"
                              : isSkipped
                              ? "opacity-40 bg-slate-100 dark:bg-slate-800/40"
                              : isRepaired
                              ? "bg-amber-50/70 dark:bg-amber-950/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <td className="p-3 font-bold">{row.row_index}</td>

                          {/* TITLE CELL */}
                          <td className="p-3">
                            {editingRowIdx === row.row_index && editingField === "title" ? (
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  className="p-1 border text-xs rounded w-full bg-white dark:bg-slate-900"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                />
                                <button
                                  onClick={() => handleRepairRowCell(row.row_index, "title", editingValue)}
                                  className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <span
                                className="cursor-pointer underline decoration-dotted hover:text-indigo-600"
                                onClick={() => {
                                  setEditingRowIdx(row.row_index);
                                  setEditingField("title");
                                  setEditingValue(row.mapped_data.title || "");
                                }}
                              >
                                {row.mapped_data.title || <i className="text-slate-400">Empty</i>}
                              </span>
                            )}
                          </td>

                          {/* BODY CELL */}
                          <td className="p-3 max-w-[200px] truncate">
                            {editingRowIdx === row.row_index && editingField === "body" ? (
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  className="p-1 border text-xs rounded w-full bg-white dark:bg-slate-900"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                />
                                <button
                                  onClick={() => handleRepairRowCell(row.row_index, "body", editingValue)}
                                  className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <span
                                className="cursor-pointer underline decoration-dotted hover:text-indigo-600"
                                onClick={() => {
                                  setEditingRowIdx(row.row_index);
                                  setEditingField("body");
                                  setEditingValue(row.mapped_data.body || "");
                                }}
                              >
                                {row.mapped_data.body || <i className="text-slate-400">Empty</i>}
                              </span>
                            )}
                          </td>

                          <td className="p-3">{row.mapped_data.category || "General"}</td>
                          <td className="p-3">${row.mapped_data.price || "0.00"}</td>
                          <td className="p-3">{row.mapped_data.status || "published"}</td>

                          {/* ERRORS / STATUS */}
                          <td className="p-3">
                            {isInvalid ? (
                              <div className="text-rose-600 dark:text-rose-400 font-semibold space-y-0.5">
                                {row.errors.map((err, idx) => (
                                  <div key={idx}>⚠️ {err}</div>
                                ))}
                              </div>
                            ) : isSkipped ? (
                              <span className="text-slate-400">Skipped</span>
                            ) : isRepaired ? (
                              <span className="text-amber-600 font-bold">🛠️ Repaired Inline</span>
                            ) : (
                              <span className="text-emerald-600 font-bold">✅ Clean</span>
                            )}
                          </td>

                          {/* ACTIONS */}
                          <td className="p-3 text-right">
                            {!isSkipped && (
                              <button
                                onClick={() => handleSkipRow(row.row_index)}
                                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded font-semibold text-xs"
                              >
                                Skip Row
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE SSE LOGS & PROGRESS */}
          {activeTab === "execute" && (
            <div className="space-y-6">
              <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-white">
                <div className="flex justify-between items-center mb-2 font-bold text-sm">
                  <span>Batch Queue Progress: {execStatus}</span>
                  <span className="text-indigo-400">{progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden mb-4">
                  <div
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 uppercase font-bold d-block">Processed</span>
                    <div className="text-xl font-extrabold text-indigo-400">{processedCount}</div>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 uppercase font-bold d-block">Imported</span>
                    <div className="text-xl font-extrabold text-emerald-400">{successCount}</div>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-xs text-slate-400 uppercase font-bold d-block">Failed</span>
                    <div className="text-xl font-extrabold text-rose-400">{failCount}</div>
                  </div>
                </div>
              </div>

              {/* LOGS CONSOLE */}
              <div className="bg-black p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 max-h-60 overflow-y-auto">
                {logs.map((log, idx) => (
                  <div key={idx} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100 dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs font-semibold text-slate-500">
          <span>Supported File Formats: .CSV, .XLSX</span>
          <button onClick={onClose} className="px-4 py-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 text-slate-900 dark:text-white rounded-lg">
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
}
