
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
