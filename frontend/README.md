## FRONTEND (Next.js)

### Step 1: Create Next.js App

```bash
npx create-next-app@latest frontend

npm install axios

npm run dev
```

---
### Step 2: Axios API Service

`src/services/api.ts`
```ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
  headers: { Accept: "application/json" },
});

export default api;
```

---

### Step 3: Main Page (CRUD + Import + Export)

`src/app/page.tsx`
```tsx
"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

interface Post {
  id: number;
  title: string;
  body: string;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  const fetchPosts = async () => {
    const res = await api.get("/posts");
    setPosts(res.data.data);
  };

  const submitPost = async () => {
    if (!title || !body) return alert("Fill all fields");

    if (editId) {
      await api.put(`/posts/${editId}`, { title, body });
      setEditId(null);
    } else {
      await api.post("/posts", { title, body });
    }

    setTitle("");
    setBody("");
    fetchPosts();
  };

  const deletePost = async (id: number) => {
    if (!confirm("Delete?")) return;
    await api.delete(`/posts/${id}`);
    fetchPosts();
  };

  const editPost = (post: Post) => {
    setEditId(post.id);
    setTitle(post.title);
    setBody(post.body);
  };

  const importPosts = async () => {
    if (!file) return alert("Select file");

    const formData = new FormData();
    formData.append("file", file);

    await api.post("/posts/import", formData);
    fetchPosts();
  };

  const exportPosts = () => {
    window.open("http://127.0.0.1:8000/api/posts/export");
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Laravel + Next.js Import Export
        </h1>

        <input
          className="border w-full mb-2 p-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="border w-full mb-2 p-2"
          placeholder="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        <button
          onClick={submitPost}
          className="bg-blue-600 text-white w-full py-2 mb-4"
        >
          {editId ? "Update Post" : "Add Post"}
        </button>

        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-2"
        />

        <button
          onClick={importPosts}
          className="bg-green-600 text-white w-full py-2 mb-2"
        >
          Import Excel
        </button>

        <button
          onClick={exportPosts}
          className="bg-purple-600 text-white w-full py-2 mb-4"
        >
          Export Excel
        </button>

        {posts.map((post) => (
          <div key={post.id} className="border p-3 mb-2">
            <h3 className="font-bold">{post.title}</h3>
            <p>{post.body}</p>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => editPost(post)}
                className="text-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => deletePost(post.id)}
                className="text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
```

---

## Excel Import Format

  <img width="130" height="67" alt="Screenshot 2025-12-30 162823" src="https://github.com/user-attachments/assets/2fe8c53f-9dcc-4180-9f5c-4cdb2c1b7322" />

     
## Frontend URL:
```
http://localhost:3000
```

## Output:-

Import & Export ( Fronted ):-

<img width="1910" height="659" alt="Screenshot 2025-12-30 170156" src="https://github.com/user-attachments/assets/f9e9e04c-2b63-4e64-aa9e-0bd73974a4ff" />

Import Successfully:-

<img width="1908" height="629" alt="Screenshot 2025-12-30 162945" src="https://github.com/user-attachments/assets/23728be7-b00c-4e81-9869-2d989a3f9731" />
