"use client";

import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportStudioModal({ isOpen, onClose }: Props) {
  const [format, setFormat] = useState<"xlsx" | "csv" | "pdf" | "json">("xlsx");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const allColumns = [
    { key: "id", label: "Post ID" },
    { key: "title", label: "Title" },
    { key: "body", label: "Content / Body" },
    { key: "category", label: "Category" },
    { key: "price", label: "Price ($)" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Created Date" },
  ];

  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "id",
    "title",
    "body",
    "category",
    "price",
    "status",
    "created_at",
  ]);

  if (!isOpen) return null;

  const toggleColumn = (key: string) => {
    if (selectedColumns.includes(key)) {
      if (selectedColumns.length > 1) {
        setSelectedColumns(selectedColumns.filter((c) => c !== key));
      }
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  const handleTriggerExport = () => {
    const params = new URLSearchParams();
    params.append("format", format);
    params.append("columns", selectedColumns.join(","));
    if (search) params.append("search", search);
    if (category) params.append("category", category);
    if (status) params.append("status", status);
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);

    const exportUrl = `http://127.0.0.1:8000/api/export-studio/custom?${params.toString()}`;
    window.open(exportUrl, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* MODAL HEADER */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
              📈 Custom Dynamic Export Studio
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select export columns, date range, filters, and multi-format outputs (XLSX, CSV, PDF, JSON).
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl font-bold px-2 py-1">
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6 text-slate-800 dark:text-slate-200">
          {/* FORMAT SELECTOR */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              1. Choose Export Format
            </label>
            <div className="grid grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setFormat("xlsx")}
                className={`p-3 rounded-xl border font-bold text-sm flex flex-col items-center gap-1 transition-all ${
                  format === "xlsx"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-xl">📊</span>
                <span>Excel (XLSX)</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={`p-3 rounded-xl border font-bold text-sm flex flex-col items-center gap-1 transition-all ${
                  format === "csv"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-xl">📑</span>
                <span>CSV Data</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={`p-3 rounded-xl border font-bold text-sm flex flex-col items-center gap-1 transition-all ${
                  format === "pdf"
                    ? "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-xl">📄</span>
                <span>PDF Report</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat("json")}
                className={`p-3 rounded-xl border font-bold text-sm flex flex-col items-center gap-1 transition-all ${
                  format === "json"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="text-xl">⚙️</span>
                <span>JSON API</span>
              </button>
            </div>
          </div>

          {/* COLUMN SELECTOR */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              2. Select Active Export Columns
            </label>
            <div className="flex flex-wrap gap-2">
              {allColumns.map((col) => {
                const isSelected = selectedColumns.includes(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => toggleColumn(col.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white shadow"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {isSelected ? "✓ " : "+ "}
                    {col.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ADVANCED FILTERS */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Advanced Export Filters
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-xs text-slate-500 font-semibold mb-1 block">Search Keyword</span>
                <input
                  type="text"
                  placeholder="Search title/body..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold mb-1 block">Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="">All Categories</option>
                  <option value="General">General</option>
                  <option value="Tech">Tech</option>
                  <option value="Finance">Finance</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold mb-1 block">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <option value="">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <span className="text-xs text-slate-500 font-semibold mb-1 block">Date From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <span className="text-xs text-slate-500 font-semibold mb-1 block">Date To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100 dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg text-xs font-semibold">
            Cancel
          </button>

          <button
            onClick={handleTriggerExport}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center gap-2"
          >
            📥 Download {format.toUpperCase()} Export Now
          </button>
        </div>
      </div>
    </div>
  );
}
