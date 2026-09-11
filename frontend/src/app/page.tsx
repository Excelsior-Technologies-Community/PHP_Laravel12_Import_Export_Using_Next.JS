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

interface Post {
  id: number;
  title: string;
  body: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
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

interface DashboardStats {
  total_posts: number;
  trash_posts: number;
  imports: number;
  exports: number;
  imported_rows: number;
  duplicate_rows: number;
  failed_rows: number;
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 Bytes";

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${parseFloat(
    (
      bytes /
      Math.pow(1024, index)
    ).toFixed(2)
  )} ${units[index]}`;
};

const formatDate = (date?: string) => {
  if (!date) return "-";

  return new Date(date).toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

/*
|--------------------------------------------------------------------------
| Page
|--------------------------------------------------------------------------
*/

export default function Home() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Main Data
  |--------------------------------------------------------------------------
  */

  const [posts, setPosts] = useState<Post[]>(
    []
  );

  const [trashPosts, setTrashPosts] =
    useState<Post[]>([]);

  const [history, setHistory] =
    useState<History[]>([]);

  const [stats, setStats] =
    useState<DashboardStats>({
      total_posts: 0,
      trash_posts: 0,
      imports: 0,
      exports: 0,
      imported_rows: 0,
      duplicate_rows: 0,
      failed_rows: 0,
    });

  /*
  |--------------------------------------------------------------------------
  | Form
  |--------------------------------------------------------------------------
  */

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [editId, setEditId] =
    useState<number | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  const [loading, setLoading] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const [trashLoading, setTrashLoading] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | File
  |--------------------------------------------------------------------------
  */

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [summary, setSummary] =
    useState<ImportSummary | null>(null);

  const [dragActive, setDragActive] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Search / Sort / Pagination
  |--------------------------------------------------------------------------
  */

  const [search, setSearch] =
    useState("");

  const [sort, setSort] =
    useState("created_at");

  const [direction, setDirection] =
    useState("desc");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [lastPage, setLastPage] =
    useState(1);

  const [perPage, setPerPage] =
    useState(5);

  /*
  |--------------------------------------------------------------------------
  | Selection
  |--------------------------------------------------------------------------
  */

  const [selectedIds, setSelectedIds] =
    useState<number[]>([]);

  /*
  |--------------------------------------------------------------------------
  | Trash Search
  |--------------------------------------------------------------------------
  */

  const [trashSearch, setTrashSearch] =
    useState("");

  const [trashPage, setTrashPage] =
    useState(1);

  const [trashLastPage, setTrashLastPage] =
    useState(1);

  /*
  |--------------------------------------------------------------------------
  | History Filters
  |--------------------------------------------------------------------------
  */

  const [historySearch, setHistorySearch] =
    useState("");

  const [historyFilter, setHistoryFilter] =
    useState("all");

  const [historyPage, setHistoryPage] =
    useState(1);

  const [historyLastPage, setHistoryLastPage] =
    useState(1);

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  const [showTrash, setShowTrash] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Fetch Posts
  |--------------------------------------------------------------------------
  */

  const fetchPosts = async (
    page = currentPage
  ) => {
    try {
      setLoading(true);

      const response = await api.get(
        "/posts",
        {
          params: {
            search,
            sort,
            direction,
            page,
            per_page: perPage,
          },
        }
      );

      setPosts(
        response.data.data ?? []
      );

      setCurrentPage(
        response.data.current_page ?? page
      );

      setLastPage(
        response.data.last_page ?? 1
      );

      setSelectedIds([]);
    } catch (error) {
      console.error(error);
      setMessage(
        "Unable to load posts."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Fetch Stats
  |--------------------------------------------------------------------------
  */

  const fetchStats = async () => {
    try {
      const response =
        await api.get(
          "/dashboard-stats"
        );

      setStats(
        response.data.data
      );
    } catch (error) {
      console.error(error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Fetch Trash
  |--------------------------------------------------------------------------
  */

  const fetchTrash = async (
    page = trashPage
  ) => {
    try {
      setTrashLoading(true);

      const response =
        await api.get(
          "/posts-trash",
          {
            params: {
              search: trashSearch,
              page,
            },
          }
        );

      setTrashPosts(
        response.data.data ?? []
      );

      setTrashPage(
        response.data.current_page ?? page
      );

      setTrashLastPage(
        response.data.last_page ?? 1
      );
    } catch (error) {
      console.error(error);
      setMessage(
        "Unable to load trash."
      );
    } finally {
      setTrashLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Fetch History
  |--------------------------------------------------------------------------
  */

  const fetchHistory = async (
    page = historyPage
  ) => {
    try {
      const response =
        await api.get(
          "/import-export-history",
          {
            params: {
              search: historySearch,
              operation:
                historyFilter,
              page,
            },
          }
        );

      setHistory(
        response.data.data ?? []
      );

      setHistoryPage(
        response.data.current_page ?? page
      );

      setHistoryLastPage(
        response.data.last_page ?? 1
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
    fetchPosts(1);
    fetchStats();
    fetchTrash(1);
    fetchHistory(1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Search / Sort Reload
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer =
      setTimeout(() => {
        fetchPosts(1);
      }, 400);

    return () =>
      clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    search,
    sort,
    direction,
    perPage,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Trash Search Reload
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer =
      setTimeout(() => {
        fetchTrash(1);
      }, 400);

    return () =>
      clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashSearch]);

  /*
  |--------------------------------------------------------------------------
  | History Search Reload
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timer =
      setTimeout(() => {
        fetchHistory(1);
      }, 400);

    return () =>
      clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    historySearch,
    historyFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Message
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!message) return;

    const timer =
      setTimeout(() => {
        setMessage("");
      }, 3500);

    return () =>
      clearTimeout(timer);
  }, [message]);

  /*
  |--------------------------------------------------------------------------
  | Create / Update
  |--------------------------------------------------------------------------
  */

  const savePost = async () => {
    if (
      !title.trim() ||
      !body.trim()
    ) {
      setMessage(
        "Please enter both title and body."
      );

      return;
    }

    try {
      setLoading(true);

      if (editId) {
        await api.put(
          `/posts/${editId}`,
          {
            title,
            body,
          }
        );

        setMessage(
          "Post updated successfully."
        );
      } else {
        await api.post(
          "/posts",
          {
            title,
            body,
          }
        );

        setMessage(
          "Post created successfully."
        );
      }

      setTitle("");
      setBody("");
      setEditId(null);

      await fetchPosts(1);
      await fetchStats();
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to save post."
      );
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
  | Delete Single
  |--------------------------------------------------------------------------
  */

  const deletePost = async (
    id: number
  ) => {
    if (
      !window.confirm(
        "Move this post to Trash?"
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/posts/${id}`
      );

      setMessage(
        "Post moved to Trash."
      );

      await fetchPosts(
        currentPage
      );

      await fetchStats();
      await fetchTrash(1);
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to delete post."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Select / Unselect
  |--------------------------------------------------------------------------
  */

  const toggleSelect = (
    id: number
  ) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedIds.length ===
      posts.length
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(
        posts.map(
          (post) => post.id
        )
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Bulk Delete
  |--------------------------------------------------------------------------
  */

  const bulkDelete = async () => {
    if (
      selectedIds.length === 0
    ) {
      setMessage(
        "Select at least one post."
      );

      return;
    }

    if (
      !window.confirm(
        `Move ${selectedIds.length} selected post(s) to Trash?`
      )
    ) {
      return;
    }

    try {
      await api.post(
        "/posts/bulk-delete",
        {
          ids: selectedIds,
        }
      );

      setSelectedIds([]);

      setMessage(
        "Selected posts moved to Trash."
      );

      await fetchPosts(1);
      await fetchStats();
      await fetchTrash(1);
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to bulk delete posts."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Trash Restore
  |--------------------------------------------------------------------------
  */

  const restorePost = async (
    id: number
  ) => {
    try {
      await api.post(
        `/posts/${id}/restore`
      );

      setMessage(
        "Post restored successfully."
      );

      await fetchTrash(
        trashPage
      );

      await fetchPosts(1);
      await fetchStats();
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to restore post."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Permanent Delete
  |--------------------------------------------------------------------------
  */

  const permanentlyDelete =
    async (id: number) => {
      if (
        !window.confirm(
          "Permanently delete this post? This cannot be undone."
        )
      ) {
        return;
      }

      try {
        await api.delete(
          `/posts/${id}/force-delete`
        );

        setMessage(
          "Post permanently deleted."
        );

        await fetchTrash(
          trashPage
        );

        await fetchStats();
      } catch (error) {
        console.error(error);

        setMessage(
          "Unable to permanently delete post."
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | File Validation
  |--------------------------------------------------------------------------
  */

  const validateFile = (
    file: File
  ) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
    ];

    const validExtension =
      file.name
        .toLowerCase()
        .endsWith(".xlsx") ||
      file.name
        .toLowerCase()
        .endsWith(".csv");

    if (
      !validExtension &&
      !validTypes.includes(file.type)
    ) {
      setMessage(
        "Only XLSX and CSV files are allowed."
      );

      return false;
    }

    return true;
  };

  /*
  |--------------------------------------------------------------------------
  | Select File
  |--------------------------------------------------------------------------
  */

  const handleFile = (
    file: File
  ) => {
    if (!validateFile(file))
      return;

    setSelectedFile(file);
    setSummary(null);

    setMessage(
      `${file.name} selected successfully.`
    );
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (file) {
      handleFile(file);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Drag & Drop
  |--------------------------------------------------------------------------
  */

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setDragActive(false);

    const file =
      event.dataTransfer
        .files?.[0];

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
      setMessage(
        "Please select an XLSX or CSV file first."
      );

      return;
    }

    try {
      setImporting(true);
      setSummary(null);

      const formData =
        new FormData();

      formData.append(
        "file",
        selectedFile
      );

      const response =
        await api.post(
          "/posts/import",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      setSummary(
        response.data.summary ??
          response.data
      );

      setSelectedFile(null);

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      setMessage(
        "Import completed successfully."
      );

      await fetchPosts(1);
      await fetchHistory(1);
      await fetchStats();
    } catch (error: any) {
      console.error(error);

      const data =
        error?.response?.data;

      if (data?.summary) {
        setSummary(data.summary);
      }

      setMessage(
        data?.message ||
          "Import failed."
      );
    } finally {
      setImporting(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Filtered Export
  |--------------------------------------------------------------------------
  */

  const exportPosts = () => {
    const params =
      new URLSearchParams();

    if (search.trim()) {
      params.set(
        "search",
        search.trim()
      );
    }

    params.set("sort", sort);
    params.set(
      "direction",
      direction
    );

    const url =
      `http://127.0.0.1:8000/api/posts/export?${params.toString()}`;

    window.open(
      url,
      "_blank"
    );

    setMessage(
      "Filtered export started."
    );

    setTimeout(() => {
      fetchHistory(1);
      fetchStats();
    }, 1500);
  };

  /*
  |--------------------------------------------------------------------------
  | Delete History
  |--------------------------------------------------------------------------
  */

  const deleteHistory = async (
    id: number
  ) => {
    if (
      !window.confirm(
        "Delete this history record?"
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/import-export-history/${id}`
      );

      setMessage(
        "History record deleted."
      );

      await fetchHistory(
        historyPage
      );

      await fetchStats();
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to delete history."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Clear Filters
  |--------------------------------------------------------------------------
  */

  const clearPostFilters = () => {
    setSearch("");
    setSort("created_at");
    setDirection("desc");
    setCurrentPage(1);
    setPerPage(5);
  };

  /*
  |--------------------------------------------------------------------------
  | Pagination Numbers
  |--------------------------------------------------------------------------
  */

  const getPages = (
    current: number,
    last: number
  ) => {
    const pages: number[] = [];

    for (
      let i = 1;
      i <= last;
      i++
    ) {
      if (
        last <= 7 ||
        i === 1 ||
        i === last ||
        Math.abs(
          i - current
        ) <= 1
      ) {
        pages.push(i);
      }
    }

    return pages;
  };

  const postPages = useMemo(
    () =>
      getPages(
        currentPage,
        lastPage
      ),
    [
      currentPage,
      lastPage,
    ]
  );

  const trashPages = useMemo(
    () =>
      getPages(
        trashPage,
        trashLastPage
      ),
    [
      trashPage,
      trashLastPage,
    ]
  );

  const historyPages = useMemo(
    () =>
      getPages(
        historyPage,
        historyLastPage
      ),
    [
      historyPage,
      historyLastPage,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <main className="relative min-h-screen overflow-hidden">

      <div className="dashboard-orb orb-one" />
      <div className="dashboard-orb orb-two" />
      <div className="dashboard-orb orb-three" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ============================================================
            HEADER
        ============================================================ */}

        <header className="mb-8 fade-up">
          <div className="glass-card rounded-3xl px-5 py-5 sm:px-7">

            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div className="flex items-center gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-purple-600 text-2xl text-white shadow-lg">
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
                    Advanced import, export,
                    search, sorting, trash and
                    data management dashboard.
                  </p>

                </div>

              </div>

              <div className="flex flex-wrap items-center gap-3">

                <button
                  onClick={() => {
                    fetchPosts(1);
                    fetchStats();
                    fetchTrash(1);
                    fetchHistory(1);

                    setMessage(
                      "Dashboard refreshed."
                    );
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600"
                >
                  ↻ Refresh
                </button>

                <button
                  onClick={() => {
                    setShowTrash(
                      !showTrash
                    );

                    if (!showTrash) {
                      fetchTrash(1);
                    }
                  }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition ${
                    showTrash
                      ? "bg-rose-600 text-white"
                      : "border border-rose-100 bg-rose-50 text-rose-600"
                  }`}
                >
                  🗑️ Trash ({stats.trash_posts})
                </button>

              </div>

            </div>

          </div>
        </header>

        {/* ============================================================
            STATISTICS
        ============================================================ */}

        <section className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">

          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Total Posts
            </p>

            <p className="stat-number mt-2 text-3xl font-black text-slate-900">
              {stats.total_posts}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Active database records
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Trash
            </p>

            <p className="stat-number mt-2 text-3xl font-black text-rose-600">
              {stats.trash_posts}
            </p>

            <p className="mt-1 text-xs text-rose-500">
              Soft deleted records
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Imported Rows
            </p>

            <p className="stat-number mt-2 text-3xl font-black text-emerald-600">
              {stats.imported_rows}
            </p>

            <p className="mt-1 text-xs text-emerald-600">
              Successful imports
            </p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Export Operations
            </p>

            <p className="stat-number mt-2 text-3xl font-black text-indigo-600">
              {stats.exports}
            </p>

            <p className="mt-1 text-xs text-indigo-500">
              Excel exports
            </p>
          </div>

        </section>

        {/* ============================================================
            IMPORT / EXPORT
        ============================================================ */}

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">

          <div className="glass-card rounded-3xl p-5 sm:p-6 xl:col-span-2">

            <div className="mb-5">

              <h2 className="text-lg font-black text-slate-900">
                Import data
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Upload XLSX or CSV files.
              </p>

            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() =>
                fileInputRef.current?.click()
              }
              className={`drop-zone flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50"
                  : selectedFile
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl text-indigo-600 shadow-sm">
                {selectedFile ? "✓" : "↑"}
              </div>

              {selectedFile ? (
                <>
                  <p className="max-w-full truncate px-4 text-sm font-black text-slate-800">
                    {selectedFile.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {formatBytes(
                      selectedFile.size
                    )}{" "}
                    • Ready to import
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-black text-slate-800">
                    Drop your file here
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    or click to browse
                  </p>

                  <p className="mt-3 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 shadow-sm">
                    .xlsx • .csv
                  </p>
                </>
              )}

            </div>

            <div className="mt-4 flex gap-3">

              <button
                onClick={importPosts}
                disabled={
                  !selectedFile ||
                  importing
                }
                className="flex flex-1 items-center justify-center rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing
                  ? "Importing..."
                  : "↑ Import Data"}
              </button>

              <button
                onClick={exportPosts}
                className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:border-emerald-200 hover:text-emerald-600"
              >
                ↓ Export Filtered
              </button>

            </div>

          </div>

          <div className="glass-card rounded-3xl p-6">

            <h2 className="text-lg font-black text-slate-900">
              Data Quality
            </h2>

            <div className="mt-5 space-y-4">

              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase text-amber-600">
                  Duplicates
                </p>

                <p className="mt-1 text-2xl font-black text-amber-700">
                  {stats.duplicate_rows}
                </p>
              </div>

              <div className="rounded-2xl bg-rose-50 p-4">
                <p className="text-xs font-bold uppercase text-rose-600">
                  Failed Rows
                </p>

                <p className="mt-1 text-2xl font-black text-rose-700">
                  {stats.failed_rows}
                </p>
              </div>

              <div className="rounded-2xl bg-indigo-50 p-4">
                <p className="text-xs font-bold uppercase text-indigo-600">
                  Import Operations
                </p>

                <p className="mt-1 text-2xl font-black text-indigo-700">
                  {stats.imports}
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* ============================================================
            IMPORT SUMMARY
        ============================================================ */}

        {summary && (
          <section className="mb-8">

            <div className="glass-card overflow-hidden rounded-3xl">

              <div className="border-b border-slate-100 px-5 py-5">

                <h2 className="text-lg font-black text-slate-900">
                  Latest Import Result
                </h2>

              </div>

              <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">

                <div className="bg-white p-5">
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Total
                  </p>

                  <p className="mt-2 text-2xl font-black">
                    {summary.total_rows}
                  </p>
                </div>

                <div className="bg-white p-5">
                  <p className="text-xs font-bold uppercase text-emerald-500">
                    Imported
                  </p>

                  <p className="mt-2 text-2xl font-black text-emerald-600">
                    {summary.imported}
                  </p>
                </div>

                <div className="bg-white p-5">
                  <p className="text-xs font-bold uppercase text-amber-500">
                    Duplicates
                  </p>

                  <p className="mt-2 text-2xl font-black text-amber-600">
                    {summary.duplicates}
                  </p>
                </div>

                <div className="bg-white p-5">
                  <p className="text-xs font-bold uppercase text-rose-500">
                    Failed
                  </p>

                  <p className="mt-2 text-2xl font-black text-rose-600">
                    {summary.failed}
                  </p>
                </div>

              </div>

              {summary.errors &&
                summary.errors.length > 0 && (
                  <div className="overflow-x-auto">

                    <table className="w-full text-left">

                      <thead>
                        <tr className="bg-slate-50">

                          <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                            Row
                          </th>

                          <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                            Title
                          </th>

                          <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                            Error
                          </th>

                        </tr>
                      </thead>

                      <tbody>

                        {summary.errors.map(
                          (
                            error,
                            index
                          ) => (
                            <tr
                              key={index}
                              className="border-t border-slate-100"
                            >

                              <td className="px-5 py-4 text-sm font-bold">
                                #{error.row}
                              </td>

                              <td className="px-5 py-4 text-sm">
                                {error.title ||
                                  "-"}
                              </td>

                              <td className="px-5 py-4 text-sm text-rose-600">
                                {error.error}
                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>
                )}

            </div>

          </section>
        )}

        {/* ============================================================
            TRASH
        ============================================================ */}

        {showTrash && (
          <section className="mb-8">

            <div className="glass-card overflow-hidden rounded-3xl">

              <div className="border-b border-slate-100 p-5">

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  <div>

                    <h2 className="text-xl font-black text-slate-900">
                      🗑️ Trash
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Restore deleted posts or permanently remove them.
                    </p>

                  </div>

                  <input
                    value={trashSearch}
                    onChange={(e) =>
                      setTrashSearch(
                        e.target.value
                      )
                    }
                    placeholder="Search trash..."
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-rose-400"
                  />

                </div>

              </div>

              {trashLoading ? (
                <div className="p-10 text-center">
                  Loading trash...
                </div>
              ) : trashPosts.length === 0 ? (
                <div className="p-10 text-center text-slate-500">
                  Trash is empty.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">

                  {trashPosts.map(
                    (post) => (
                      <div
                        key={post.id}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                      >

                        <div>

                          <h3 className="font-black text-slate-800">
                            {post.title}
                          </h3>

                          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                            {post.body}
                          </p>

                          <p className="mt-2 text-xs text-rose-500">
                            Deleted:{" "}
                            {formatDate(
                              post.deleted_at
                            )}
                          </p>

                        </div>

                        <div className="flex gap-2">

                          <button
                            onClick={() =>
                              restorePost(
                                post.id
                              )
                            }
                            className="rounded-lg bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-100"
                          >
                            ♻️ Restore
                          </button>

                          <button
                            onClick={() =>
                              permanentlyDelete(
                                post.id
                              )
                            }
                            className="rounded-lg bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"
                          >
                            Permanently Delete
                          </button>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

              {trashLastPage > 1 && (
                <div className="flex flex-wrap justify-center gap-2 border-t border-slate-100 p-5">

                  {trashPages.map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() =>
                          fetchTrash(
                            page
                          )
                        }
                        className={`h-9 min-w-9 rounded-lg px-3 text-xs font-bold ${
                          trashPage === page
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}

                </div>
              )}

            </div>

          </section>
        )}

        {/* ============================================================
            POST MANAGEMENT
        ============================================================ */}

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Form */}

          <div className="glass-card rounded-3xl p-5 sm:p-6">

            <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600">
              {editId
                ? "Edit mode"
                : "Create mode"}
            </span>

            <h2 className="mt-4 text-xl font-black text-slate-900">
              {editId
                ? "Update post"
                : "Create post"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage individual records.
            </p>

            <div className="mt-6 space-y-4">

              <div>

                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Title
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  placeholder="Enter title"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />

              </div>

              <div>

                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                  Body
                </label>

                <textarea
                  value={body}
                  onChange={(e) =>
                    setBody(
                      e.target.value
                    )
                  }
                  rows={6}
                  placeholder="Write post content..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />

              </div>

              <div className="flex gap-3">

                <button
                  onClick={savePost}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
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
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                )}

              </div>

            </div>

          </div>

          {/* Posts */}

          <div className="glass-card overflow-hidden rounded-3xl xl:col-span-2">

            {/* Filters */}

            <div className="border-b border-slate-100 p-5">

              <div className="flex flex-col gap-4">

                <div className="flex flex-col gap-3 lg:flex-row">

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="🔎 Search title or body..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:bg-white"
                  />

                  <select
                    value={sort}
                    onChange={(e) =>
                      setSort(
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none"
                  >
                    <option value="created_at">
                      Sort by Created
                    </option>

                    <option value="updated_at">
                      Sort by Updated
                    </option>

                    <option value="title">
                      Sort by Title
                    </option>

                    <option value="id">
                      Sort by ID
                    </option>
                  </select>

                  <select
                    value={direction}
                    onChange={(e) =>
                      setDirection(
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none"
                  >
                    <option value="desc">
                      Descending
                    </option>

                    <option value="asc">
                      Ascending
                    </option>
                  </select>

                  <select
                    value={perPage}
                    onChange={(e) =>
                      setPerPage(
                        Number(
                          e.target.value
                        )
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none"
                  >
                    <option value={5}>
                      5 / page
                    </option>

                    <option value={10}>
                      10 / page
                    </option>

                    <option value={25}>
                      25 / page
                    </option>

                    <option value={50}>
                      50 / page
                    </option>
                  </select>

                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <div className="flex items-center gap-3">

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">

                      <input
                        type="checkbox"
                        checked={
                          posts.length > 0 &&
                          selectedIds.length ===
                            posts.length
                        }
                        onChange={
                          toggleSelectAll
                        }
                        className="h-4 w-4"
                      />

                      Select page
                    </label>

                    {selectedIds.length >
                      0 && (
                      <button
                        onClick={
                          bulkDelete
                        }
                        className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white"
                      >
                        🗑️ Delete Selected (
                        {
                          selectedIds.length
                        }
                        )
                      </button>
                    )}

                  </div>

                  <button
                    onClick={
                      clearPostFilters
                    }
                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
                  >
                    Clear Filters
                  </button>

                </div>

              </div>

            </div>

            {/* Post list */}

            {loading &&
            posts.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                Loading posts...
              </div>
            ) : posts.length === 0 ? (
              <div className="p-10 text-center">

                <p className="font-bold text-slate-700">
                  No posts found
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing your search.
                </p>

              </div>
            ) : (
              <div className="divide-y divide-slate-100">

                {posts.map(
                  (post, index) => (
                    <div
                      key={post.id}
                      className="p-5 transition hover:bg-slate-50"
                    >

                      <div className="flex gap-4">

                        <div className="pt-1">

                          <input
                            type="checkbox"
                            checked={selectedIds.includes(
                              post.id
                            )}
                            onChange={() =>
                              toggleSelect(
                                post.id
                              )
                            }
                            className="h-4 w-4"
                          />

                        </div>

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-600">
                          {String(
                            index + 1
                          ).padStart(2, "0")}
                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">

                            <div>

                              <h3 className="font-black text-slate-800">
                                {post.title}
                              </h3>

                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                                {post.body}
                              </p>

                            </div>

                            <div className="flex shrink-0 gap-2">

                              <button
                                onClick={() =>
                                  editPost(
                                    post
                                  )
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  deletePost(
                                    post.id
                                  )
                                }
                                className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"
                              >
                                Delete
                              </button>

                            </div>

                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                              ID #{post.id}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                              {formatDate(
                                post.created_at
                              )}
                            </span>

                          </div>

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

            {/* Pagination */}

            {lastPage > 1 && (
              <div className="flex flex-wrap justify-center gap-2 border-t border-slate-100 p-5">

                {postPages.map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() =>
                        fetchPosts(
                          page
                        )
                      }
                      className={`h-9 min-w-9 rounded-lg px-3 text-xs font-bold ${
                        currentPage ===
                        page
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

              </div>
            )}

          </div>

        </section>

        {/* ============================================================
            HISTORY
        ============================================================ */}

        <section className="mb-8">

          <div className="glass-card overflow-hidden rounded-3xl">

            <div className="border-b border-slate-100 p-5">

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>

                  <h2 className="text-xl font-black text-slate-900">
                    Import / Export History
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Search and filter every transfer operation.
                  </p>

                </div>

                <div className="flex flex-col gap-2 sm:flex-row">

                  <input
                    value={historySearch}
                    onChange={(e) =>
                      setHistorySearch(
                        e.target.value
                      )
                    }
                    placeholder="Search filename..."
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />

                  <select
                    value={historyFilter}
                    onChange={(e) =>
                      setHistoryFilter(
                        e.target.value
                      )
                    }
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
                  >
                    <option value="all">
                      All Operations
                    </option>

                    <option value="import">
                      Imports
                    </option>

                    <option value="export">
                      Exports
                    </option>
                  </select>

                </div>

              </div>

            </div>

            {history.length ===
            0 ? (
              <div className="p-10 text-center text-slate-500">
                No history available.
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-225 text-left">

                  <thead>

                    <tr className="bg-slate-50">

                      <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                        Operation
                      </th>

                      <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                        File
                      </th>

                      <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                        Rows
                      </th>

                      <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                        Imported
                      </th>

                      <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                        Duplicates
                      </th>

                      <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                        Failed
                      </th>

                      <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                        Status
                      </th>

                      <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                        Date
                      </th>

                      <th className="px-5 py-3 text-xs font-black uppercase text-slate-400">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {history.map(
                      (item) => (
                        <tr
                          key={item.id}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >

                          <td className="px-5 py-4">

                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                              item.operation ===
                              "import"
                                ? "bg-indigo-50 text-indigo-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}>
                              {item.operation}
                            </span>

                          </td>

                          <td className="max-w-55 truncate px-5 py-4 text-sm font-semibold">
                            {item.file_name ||
                              "posts.xlsx"}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold">
                            {item.total_rows ??
                              0}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-emerald-600">
                            {item.successful_rows ??
                              0}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-amber-600">
                            {item.duplicate_rows ??
                              0}
                          </td>

                          <td className="px-5 py-4 text-sm font-bold text-rose-600">
                            {item.failed_rows ??
                              0}
                          </td>

                          <td className="px-5 py-4">

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-600">
                              {item.status ||
                                "unknown"}
                            </span>

                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                            {formatDate(
                              item.created_at
                            )}
                          </td>

                          <td className="px-5 py-4">

                            <button
                              onClick={() =>
                                deleteHistory(
                                  item.id
                                )
                              }
                              className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600"
                            >
                              Delete
                            </button>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

            {historyLastPage >
              1 && (
              <div className="flex flex-wrap justify-center gap-2 border-t border-slate-100 p-5">

                {historyPages.map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() =>
                        fetchHistory(
                          page
                        )
                      }
                      className={`h-9 min-w-9 rounded-lg px-3 text-xs font-bold ${
                        historyPage ===
                        page
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

              </div>
            )}

          </div>

        </section>

        {/* ============================================================
            FOOTER
        ============================================================ */}

        <footer className="pb-8 pt-2 text-center">

          <p className="text-xs font-medium text-slate-400">
            Laravel 12 API • Next.js 16 • React 19 • Tailwind CSS 4
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Search • Sort • Pagination • Bulk Delete • Trash • Restore • Filtered Export
          </p>

        </footer>

      </div>

      {/* ============================================================
          TOAST
      ============================================================ */}

      {message && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm">

          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl">

            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              ✓
            </div>

            <p className="text-sm font-bold text-slate-700">
              {message}
            </p>

            <button
              onClick={() =>
                setMessage("")
              }
              className="text-slate-400 hover:text-slate-700"
            >
              ×
            </button>

          </div>

        </div>
      )}

    </main>
  );
}