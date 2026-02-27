# PHP_Laravel12_Import_Export_Using_Next.JS

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12.x-FF2D20?style=for-the-badge&logo=laravel&logoColor=white">
  <img src="https://img.shields.io/badge/PHP-8%2B-777BB4?style=for-the-badge&logo=php&logoColor=white">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black">
  <img src="https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white">
  <img src="https://img.shields.io/badge/MySQL-Database-4479A1?style=for-the-badge&logo=mysql&logoColor=white">
</p>


---

## Overview

This project demonstrates Import & Export (Excel / CSV) functionality using Laravel 12 and Next.js 14.

---

## Features

- CRUD operations
- Excel / CSV Import
- Excel Export
- Laravel 12 REST API
- Next.js 14 Frontend
- Tailwind CSS
- MySQL Database

---

## Folder Structure

### Backend (Laravel)

```text
backend/
├── app/
│   ├── Exports/PostExport.php
│   ├── Imports/PostImport.php
│   ├── Http/Controllers/Api/PostController.php
│   └── Models/Post.php
├── database/migrations/create_posts_table.php
├── routes/api.php
└── .env
```

### Frontend (Next.js)

```text
frontend/
├── src/app/page.tsx
├── src/services/api.ts
├── tailwind.config.js
└── package.json
```

---


## BACKEND (Laravel)

### Step 1: Create Laravel Project

```bash
composer create-project laravel/laravel backend
```

---

### Step 2: Environment Setup

`.env`

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=backend
DB_USERNAME=root
DB_PASSWORD=
```

---

### Step 3: Create Model + Migration

```bash
php artisan make:model Post -m
```

This creates:

```
app/Models/Post.php
database/migrations/xxxx_xx_xx_create_posts_table.php
```

---

### Step 4: Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
```

Run migration:

```bash
php artisan migrate
```

---

### Step 5: Post Model

`app/Models/Post.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    protected $fillable = ['title', 'body'];
}
```

---

### Step 6: PostController (CRUD + Import + Export)

```bash
php artisan make:controller Api/PostController
```

`app/Http/Controllers/Api/PostController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\PostImport;
use App\Exports\PostExport;

class PostController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Post::all()], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        $post = Post::create($request->only('title','body'));

        return response()->json(['message' => 'Post created successfully', 'data' => $post], 201);
    }

    public function show($id)
    {
        $post = Post::findOrFail($id);
        return response()->json(['data' => $post], 200);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        $post = Post::findOrFail($id);
        $post->update($request->only('title','body'));

        return response()->json(['message' => 'Post updated successfully', 'data' => $post], 200);
    }

    public function destroy($id)
    {
        Post::findOrFail($id)->delete();
        return response()->json(['message' => 'Post deleted successfully'], 200);
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,csv',
        ]);

        Excel::import(new PostImport, $request->file('file'));
        return response()->json(['message' => 'Posts imported successfully']);
    }

    public function export()
    {
        return Excel::download(new PostExport, 'posts.xlsx');
    }
}
```

---

### Step 7: Import Class

```bash
php artisan make:import PostImport
```

```php
<?php

namespace App\Imports;

use App\Models\Post;
use Maatwebsite\Excel\Concerns\ToModel;

class PostImport implements ToModel
{
    public function model(array $row)
    {
        return new Post([
            'title' => $row[0],
            'body' => $row[1],
        ]);
    }
}
```

---

### Step 8: Export Class

```bash
php artisan make:export PostExport
```

```php
<?php

namespace App\Exports;

use App\Models\Post;
use Maatwebsite\Excel\Concerns\FromCollection;

class PostExport implements FromCollection
{
    public function collection()
    {
        return Post::all();
    }
}
```

---

### Step 9: API Routes

`routes/api.php`

```php
use App\Http\Controllers\Api\PostController;

Route::get('posts/export', [PostController::class, 'export']);
Route::post('posts/import', [PostController::class, 'import']);
Route::apiResource('posts', PostController::class);
```

---

### Step 10: Install Excel Package

```bash
composer require maatwebsite/excel
```

---

### Step 11: Run Backend

```bash
php artisan serve
```

POSTMAN URL (Backend):
```
POST http://127.0.0.1:8000/api/posts/import
```
<img width="1796" height="664" alt="Screenshot 2025-12-30 162348" src="https://github.com/user-attachments/assets/4057f025-0ab0-430d-8a01-228696def3ff" />

---

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
