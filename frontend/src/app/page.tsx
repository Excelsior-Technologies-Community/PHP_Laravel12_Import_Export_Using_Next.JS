"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

/* ===============================
   Post Interface
================================ */
interface Post {
  id: number;
  title: string;
  body: string;
}

/* ===============================
   Home Page Component
================================ */
export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  /* ===============================
     Fetch Posts
  ================================ */
  const fetchPosts = async () => {
    const res = await api.get("/posts");
    setPosts(res.data.data);
  };

  /* ===============================
     Create / Update Post
  ================================ */
  const submitPost = async () => {
    if (!title || !body) return alert("Fill all fields");

    setLoading(true);

    if (editId) {
      await api.put(`/posts/${editId}`, { title, body });
      setEditId(null);
    } else {
      await api.post("/posts", { title, body });
    }

    setTitle("");
    setBody("");
    setLoading(false);
    fetchPosts();
  };

  /* ===============================
     Delete Post
  ================================ */
  const deletePost = async (id: number) => {
    if (!confirm("Delete this post?")) return;
    await api.delete(`/posts/${id}`);
    fetchPosts();
  };

  /* ===============================
     Edit Post
  ================================ */
  const editPost = (post: Post) => {
    setEditId(post.id);
    setTitle(post.title);
    setBody(post.body);
  };

  const cancelEdit = () => {
    setEditId(null);
    setTitle("");
    setBody("");
  };

  /* ===============================
     Import Posts (Excel / CSV)
  ================================ */
  const importPosts = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post("/posts/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Posts imported successfully");
      fetchPosts();
    } catch (error) {
      alert("Import failed");
    }
  };

  /* ===============================
     Export Posts
  ================================ */
  const exportPosts = () => {
    window.open("http://localhost:8000/api/posts/export", "_blank");
  };

  /* ===============================
     On Load
  ================================ */
  useEffect(() => {
    fetchPosts();
  }, []);

  /* ===============================
     UI
  ================================ */
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-gray-100 py-10">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-indigo-700">
          Next.js + Laravel CRUD (Import / Export)
        </h1>

        {/* Import / Export */}
        <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => importPosts(e.target.files![0])}
            className="text-sm"
          />

          <button
            onClick={exportPosts}
            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
          >
            Export Excel
          </button>
        </div>

        {/* Create / Edit Post */}
        <div className="bg-white rounded-xl shadow-md p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">
            {editId ? "Edit Post" : "Create Post"}
          </h2>

          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="Post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="Post body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <button
            onClick={submitPost}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading
              ? "Saving..."
              : editId
              ? "Update Post"
              : "Add Post"}
          </button>

          {editId && (
            <button
              onClick={cancelEdit}
              className="w-full border border-gray-300 text-gray-600 py-2 rounded-md"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* Posts List */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Posts
          </h2>

          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex justify-between border rounded-lg p-3"
              >
                <div>
                  <h3 className="font-semibold text-indigo-700">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {post.body}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => editPost(post)}
                    className="text-xs text-blue-600 border px-2 py-1 rounded"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deletePost(post.id)}
                    className="text-xs text-red-600 border px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {posts.length === 0 && (
              <p className="text-center text-gray-500 text-sm">
                No posts found
              </p>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
