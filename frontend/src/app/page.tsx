"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import api from "@/services/api";

/*
|--------------------------------------------------------------------------
| Interfaces
|--------------------------------------------------------------------------
*/

interface Category {
  id: number;
  name: string;
  description?: string;
  posts_count?: number;
}

interface Post {
  id: number;
  title: string;
  body: string;
  category_id?: number | null;
  category?: Category | null;
  created_at?: string;
  updated_at?: string;
}

interface ImportError {
  row: number;
  title?: string;
  error: string;
}

interface ImportSummary {
  total_rows: number;
  imported: number;
  duplicates: number;
  failed: number;
  errors?: ImportError[];
}

interface History {
  id: number;
  operation: string;
  file_name?: string;
  total_rows?: number;
  successful_rows?: number;
  duplicate_rows?: number;
  failed_rows?: number;
  status?: string;
  created_at?: string;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${parseFloat(
    (bytes / Math.pow(1024, index)).toFixed(2)
  )} ${units[index]}`;
};

const formatDate = (date?: string) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [history, setHistory] = useState<History[]>([]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [editId, setEditId] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const [dragActive, setDragActive] = useState(false);

  const [search, setSearch] = useState("");

  const [historyFilter, setHistoryFilter] = useState("all");

  const [message, setMessage] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Fetch Posts
  |--------------------------------------------------------------------------
  */

  const fetchPosts = async () => {
    try {
      setLoading(true);

      const response = await api.get("/posts");

      setPosts(response.data.data ?? response.data);
    } catch (error) {
      console.error(error);
      setMessage("Unable to load posts.");
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Fetch History
  |--------------------------------------------------------------------------
  */

  const fetchHistory = async () => {
    try {
      const response = await api.get("/import-export-history");

      const data = response.data.data ?? response.data;

      setHistory(
        [...data].sort(
          (a: History, b: History) =>
            new Date(b.created_at ?? "").getTime() -
            new Date(a.created_at ?? "").getTime()
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Initial Load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    fetchPosts();
    fetchHistory();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Auto Hide Message
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3500);

    return () => clearTimeout(timer);
  }, [message]);

  /*
  |--------------------------------------------------------------------------
  | Create / Update
  |--------------------------------------------------------------------------
  */

  const savePost = async () => {
    if (!title.trim() || !body.trim()) {
      setMessage("Please enter both title and body.");
      return;
    }

    try {
      setLoading(true);

      if (editId) {
        await api.put(`/posts/${editId}`, {
          title,
          body,
        });

        setMessage("Post updated successfully.");
      } else {
        await api.post("/posts", {
          title,
          body,
        });

        setMessage("Post created successfully.");
      }

      setTitle("");
      setBody("");
      setEditId(null);

      await fetchPosts();
    } catch (error) {
      console.error(error);
      setMessage("Unable to save post.");
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Edit
  |--------------------------------------------------------------------------
  */

  const editPost = (post: Post) => {
    setEditId(post.id);
    setTitle(post.title);
    setBody(post.body);

    window.scrollTo({
      top: 700,
      behavior: "smooth",
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Delete
  |--------------------------------------------------------------------------
  */

  const deletePost = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this post?")) {
      return;
    }

    try {
      await api.delete(`/posts/${id}`);

      setMessage("Post deleted successfully.");

      await fetchPosts();
    } catch (error) {
      console.error(error);
      setMessage("Unable to delete post.");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | File Validation
  |--------------------------------------------------------------------------
  */

  const validateFile = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
    ];

    const validExtension =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".csv");

    if (!validExtension && !validTypes.includes(file.type)) {
      setMessage("Only XLSX and CSV files are allowed.");
      return false;
    }

    return true;
  };

  /*
  |--------------------------------------------------------------------------
  | Select File
  |--------------------------------------------------------------------------
  */

  const handleFile = (file: File) => {
    if (!validateFile(file)) return;

    setSelectedFile(file);
    setSummary(null);
    setMessage(`${file.name} selected successfully.`);
  };

  /*
  |--------------------------------------------------------------------------
  | Input Change
  |--------------------------------------------------------------------------
  */

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      handleFile(file);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Drag Events
  |--------------------------------------------------------------------------
  */

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Import
  |--------------------------------------------------------------------------
  */

  const importPosts = async () => {
    if (!selectedFile) {
      setMessage("Please select an XLSX or CSV file first.");
      return;
    }

    try {
      setImporting(true);
      setSummary(null);

      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await api.post("/posts/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setSummary(response.data.summary ?? response.data);

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setMessage("Import completed successfully.");

      await fetchPosts();
      await fetchHistory();
    } catch (error: any) {
      console.error(error);

      const responseData = error?.response?.data;

      if (responseData?.summary) {
        setSummary(responseData.summary);
      }

      setMessage(
        responseData?.message ||
          "Import failed. Please check the file and try again."
      );
    } finally {
      setImporting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Export
  |--------------------------------------------------------------------------
  */

  const exportPosts = async () => {
    try {
      window.open(
        "http://127.0.0.1:8000/api/posts/export",
        "_blank"
      );

      setMessage("Export started successfully.");

      setTimeout(() => {
        fetchHistory();
      }, 1500);
    } catch (error) {
      console.error(error);
      setMessage("Unable to export posts.");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Delete History
  |--------------------------------------------------------------------------
  */

  const deleteHistory = async (id: number) => {
    if (!window.confirm("Delete this history record?")) {
      return;
    }

    try {
      await api.delete(`/import-export-history/${id}`);

      setHistory((current) =>
        current.filter((item) => item.id !== id)
      );

      setMessage("History record deleted.");
    } catch (error) {
      console.error(error);
      setMessage("Unable to delete history.");
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Statistics
  |--------------------------------------------------------------------------
  */

  const stats = useMemo(() => {
    return {
      posts: posts.length,

      imported: history.reduce(
        (sum, item) => sum + Number(item.successful_rows ?? 0),
        0
      ),

      duplicates: history.reduce(
        (sum, item) => sum + Number(item.duplicate_rows ?? 0),
        0
      ),

      failed: history.reduce(
        (sum, item) => sum + Number(item.failed_rows ?? 0),
        0
      ),
    };
  }, [posts, history]);

  /*
  |--------------------------------------------------------------------------
  | Filter Posts
  |--------------------------------------------------------------------------
  */

  const filteredPosts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return posts;

    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(keyword) ||
        post.body.toLowerCase().includes(keyword)
    );
  }, [posts, search]);

  /*
  |--------------------------------------------------------------------------
  | Filter History
  |--------------------------------------------------------------------------
  */

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return history;

    return history.filter(
      (item) =>
        item.operation?.toLowerCase() === historyFilter.toLowerCase()
    );
  }, [history, historyFilter]);

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="dashboard-orb orb-one" />
      <div className="dashboard-orb orb-two" />
      <div className="dashboard-orb orb-three" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ==============================================================
            HEADER
        ============================================================== */}

        <header className="mb-8 fade-up">
          <div className="glass-card rounded-3xl px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-purple-600 text-2xl text-white shadow-lg shadow-indigo-500/25">
                  ⇅
                </div>

                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                      Import / Export Studio
                    </h1>

                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                      Laravel + Next.js
                    </span>
                  </div>

                  <p className="text-sm text-slate-500">
                    Manage posts, imports, exports and data quality from one dashboard.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                  <span className="text-xs font-semibold text-slate-600">
                    API Workspace
                  </span>
                </div>

                <button
                  onClick={() => {
                    fetchPosts();
                    fetchHistory();
                    setMessage("Dashboard refreshed.");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"
                >
                  ↻ Refresh
                </button>
              </div>

            </div>
          </div>
        </header>

        {/* ==============================================================
            STATISTICS
        ============================================================== */}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* Posts */}
          <div className="glass-card fade-up fade-up-delay-1 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Total Posts
                </p>

                <p className="stat-number mt-2 text-3xl font-black text-slate-900">
                  {stats.posts}
                </p>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Current database records
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl text-indigo-600">
                ◈
              </div>
            </div>
          </div>

          {/* Imported */}
          <div className="glass-card fade-up fade-up-delay-2 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Imported
                </p>

                <p className="stat-number mt-2 text-3xl font-black text-slate-900">
                  {stats.imported}
                </p>

                <p className="mt-1 text-xs font-medium text-emerald-600">
                  Successfully processed
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600">
                ✓
              </div>
            </div>
          </div>

          {/* Duplicates */}
          <div className="glass-card fade-up fade-up-delay-3 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Duplicates
                </p>

                <p className="stat-number mt-2 text-3xl font-black text-slate-900">
                  {stats.duplicates}
                </p>

                <p className="mt-1 text-xs font-medium text-amber-600">
                  Skipped duplicate rows
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-600">
                !
              </div>
            </div>
          </div>

          {/* Failed */}
          <div className="glass-card fade-up fade-up-delay-4 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Failed
                </p>

                <p className="stat-number mt-2 text-3xl font-black text-slate-900">
                  {stats.failed}
                </p>

                <p className="mt-1 text-xs font-medium text-rose-600">
                  Rows requiring attention
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-xl text-rose-600">
                ×
              </div>
            </div>
          </div>

        </section>

        {/* ==============================================================
            IMPORT / EXPORT WORKSPACE
        ============================================================== */}

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Import */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 xl:col-span-2">

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900">
                    Import data
                  </h2>

                  <span className="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    XLSX / CSV
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Upload your spreadsheet and validate rows automatically.
                </p>
              </div>

              {selectedFile && (
                <button
                  onClick={() => {
                    setSelectedFile(null);

                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600"
                >
                  Remove file
                </button>
              )}
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`drop-zone flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50"
                  : selectedFile
                    ? "border-emerald-300 bg-emerald-50/60"
                    : "border-slate-200 bg-slate-50/70 hover:border-indigo-300 hover:bg-indigo-50/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl shadow-sm ${
                  selectedFile
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-white text-indigo-600"
                }`}
              >
                {selectedFile ? "✓" : "↑"}
              </div>

              {selectedFile ? (
                <>
                  <p className="max-w-full truncate px-4 text-sm font-black text-slate-800">
                    {selectedFile.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatBytes(selectedFile.size)} • Ready to import
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-black text-slate-800">
                    Drop your file here
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    or click to browse from your computer
                  </p>

                  <p className="mt-3 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm">
                    .xlsx • .csv
                  </p>
                </>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={importPosts}
                disabled={!selectedFile || importing}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:-translate-y-0.5 hover:shadow-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {importing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Importing...
                  </>
                ) : (
                  <>
                    ↑ Import Data
                  </>
                )}
              </button>

              <button
                onClick={exportPosts}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-600"
              >
                ↓ Export Excel
              </button>
            </div>

          </div>

          {/* Guide */}
          <div className="glass-card rounded-3xl p-5 sm:p-6">

            <div className="mb-6">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                ✦
              </div>

              <h2 className="text-lg font-black text-slate-900">
                Import guide
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Keep your spreadsheet clean for the best import result.
              </p>
            </div>

            <div className="space-y-3">

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Required columns
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                    title
                  </span>

                  <span className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
                    body
                  </span>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl bg-emerald-50 p-4">
                <span className="text-emerald-600">✓</span>

                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    Validation
                  </p>

                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    Required fields and data formats are checked.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl bg-amber-50 p-4">
                <span className="text-amber-600">!</span>

                <div>
                  <p className="text-sm font-bold text-amber-800">
                    Duplicate detection
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Existing duplicate records are identified during import.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 rounded-2xl bg-indigo-50 p-4">
                <span className="text-indigo-600">↗</span>

                <div>
                  <p className="text-sm font-bold text-indigo-800">
                    Import history
                  </p>

                  <p className="mt-1 text-xs leading-5 text-indigo-700">
                    Every import and export operation is recorded.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ==============================================================
            IMPORT SUMMARY
        ============================================================== */}

        {summary && (
          <section className="mb-8 fade-up">
            <div className="glass-card overflow-hidden rounded-3xl">

              <div className="border-b border-slate-100 bg-white/70 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Import result
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Validation and processing summary for your latest upload.
                    </p>
                  </div>

                  <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                    Completed
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">

                <div className="bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total rows
                  </p>

                  <p className="stat-number mt-2 text-2xl font-black text-slate-900">
                    {summary.total_rows}
                  </p>
                </div>

                <div className="bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Imported
                  </p>

                  <p className="stat-number mt-2 text-2xl font-black text-emerald-600">
                    {summary.imported}
                  </p>
                </div>

                <div className="bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Duplicates
                  </p>

                  <p className="stat-number mt-2 text-2xl font-black text-amber-600">
                    {summary.duplicates}
                  </p>
                </div>

                <div className="bg-white p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Failed
                  </p>

                  <p className="stat-number mt-2 text-2xl font-black text-rose-600">
                    {summary.failed}
                  </p>
                </div>

              </div>

              {summary.errors && summary.errors.length > 0 && (
                <div className="overflow-x-auto border-t border-slate-100">
                  <table className="modern-table w-full min-w-175 text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-400">
                          Row
                        </th>

                        <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-400">
                          Title
                        </th>

                        <th className="px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-400">
                          Error
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {summary.errors.map((error, index) => (
                        <tr key={index} className="border-t border-slate-100">
                          <td className="px-5 py-4 text-sm font-bold text-slate-600">
                            #{error.row}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                            {error.title || "-"}
                          </td>

                          <td className="px-5 py-4 text-sm text-rose-600">
                            {error.error}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </section>
        )}

        {/* ==============================================================
            POST MANAGEMENT
        ============================================================== */}

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Form */}
          <div className="glass-card rounded-3xl p-5 sm:p-6">

            <div className="mb-6">
              <span className="mb-3 inline-flex rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600">
                {editId ? "Edit mode" : "Create mode"}
              </span>

              <h2 className="text-xl font-black text-slate-900">
                {editId ? "Update post" : "Create post"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage individual records directly from the dashboard.
              </p>
            </div>

            <div className="space-y-4">

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Title
                </label>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter post title"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Body
                </label>

                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Write your post content..."
                  rows={6}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="flex gap-3">

                <button
                  onClick={savePost}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : editId
                      ? "Update Post"
                      : "Create Post"}
                </button>

                {editId && (
                  <button
                    onClick={() => {
                      setEditId(null);
                      setTitle("");
                      setBody("");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300"
                  >
                    Cancel
                  </button>
                )}

              </div>

            </div>
          </div>

          {/* Posts */}
          <div className="glass-card overflow-hidden rounded-3xl xl:col-span-2">

            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Post collection
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {filteredPosts.length} record
                    {filteredPosts.length !== 1 ? "s" : ""} displayed
                  </p>
                </div>

                <div className="relative w-full lg:max-w-xs">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    ⌕
                  </span>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search posts..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                  />
                </div>

              </div>
            </div>

            <div className="max-h-130 overflow-y-auto">

              {loading && posts.length === 0 ? (
                <div className="flex min-h-60 items-center justify-center">
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                    Loading posts...
                  </div>
                </div>
              ) : filteredPosts.length === 0 ? (
                <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
                    ◌
                  </div>

                  <p className="font-bold text-slate-700">
                    No posts found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Create a post or import data to get started.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">

                  {filteredPosts.map((post, index) => (
                    <div
                      key={post.id}
                      className="group p-5 transition hover:bg-slate-50/80 sm:p-6"
                    >
                      <div className="flex gap-4">

                        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-600 sm:flex">
                          {String(index + 1).padStart(2, "0")}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                            <div className="min-w-0">
                              <h3 className="truncate text-base font-black text-slate-800">
                                {post.title}
                              </h3>

                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                                {post.body}
                              </p>
                            </div>

                            <div className="flex shrink-0 gap-2">

                              <button
                                onClick={() => editPost(post)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => deletePost(post.id)}
                                className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                              >
                                Delete
                              </button>

                            </div>

                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                              ID #{post.id}
                            </span>

                            {post.created_at && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                                {formatDate(post.created_at)}
                              </span>
                            )}

                          </div>

                        </div>

                      </div>
                    </div>
                  ))}

                </div>
              )}

            </div>
          </div>
        </section>

        {/* ==============================================================
            HISTORY
        ============================================================== */}

        <section className="mb-8">
          <div className="glass-card overflow-hidden rounded-3xl">

            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900">
                      Import / Export history
                    </h2>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                      {history.length}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Track every data transfer and its result.
                  </p>
                </div>

                <div className="flex gap-2">

                  {["all", "import", "export"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setHistoryFilter(filter)}
                      className={`rounded-lg px-3 py-2 text-xs font-bold capitalize transition ${
                        historyFilter === filter
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}

                </div>

              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  ◷
                </div>

                <p className="font-bold text-slate-700">
                  No history available
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Import or export data to create activity records.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="modern-table w-full min-w-225 text-left">

                  <thead>
                    <tr className="bg-slate-50/80">

                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Operation
                      </th>

                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        File
                      </th>

                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Rows
                      </th>

                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Imported
                      </th>

                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Duplicates
                      </th>

                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Failed
                      </th>

                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Status
                      </th>

                      <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Date
                      </th>

                      <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Action
                      </th>

                    </tr>
                  </thead>

                  <tbody>

                    {filteredHistory.map((item) => {

                      const operation =
                        item.operation?.toLowerCase() ?? "";

                      const isImport = operation === "import";

                      return (
                        <tr
                          key={item.id}
                          className="border-t border-slate-100"
                        >

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                                isImport
                                  ? "bg-indigo-50 text-indigo-600"
                                  : "bg-emerald-50 text-emerald-600"
                              }`}
                            >
                              <span>
                                {isImport ? "↑" : "↓"}
                              </span>

                              {item.operation}
                            </span>
                          </td>

                          <td className="max-w-55 truncate px-5 py-4 text-sm font-semibold text-slate-700">
                            {item.file_name || "posts.xlsx"}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-slate-600">
                            {item.total_rows ?? "-"}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-emerald-600">
                            {item.successful_rows ?? 0}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-amber-600">
                            {item.duplicate_rows ?? 0}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-rose-600">
                            {item.failed_rows ?? 0}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                                item.status?.toLowerCase() === "success"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-rose-50 text-rose-600"
                              }`}
                            >
                              {item.status || "Unknown"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                            {formatDate(item.created_at)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => deleteHistory(item.id)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            >
                              Delete
                            </button>
                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>
            )}

          </div>
        </section>

        {/* ==============================================================
            FOOTER
        ============================================================== */}

        <footer className="pb-8 pt-2 text-center">
          <p className="text-xs font-medium text-slate-400">
            Laravel 12 API • Next.js 16 • React 19 • Tailwind CSS 4
          </p>
        </footer>

      </div>

      {/* ================================================================
          TOAST
      ================================================================ */}

      {message && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm fade-up">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl shadow-slate-900/10">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              ✓
            </div>

            <p className="text-sm font-bold text-slate-700">
              {message}
            </p>

            <button
              onClick={() => setMessage("")}
              className="ml-2 text-slate-400 hover:text-slate-700"
            >
              ×
            </button>

          </div>
        </div>
      )}

    </main>
  );
}