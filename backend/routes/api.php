<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PostController;

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

Route::get(
    'dashboard-stats',
    [PostController::class, 'dashboardStats']
);

/*
|--------------------------------------------------------------------------
| Import / Export
|--------------------------------------------------------------------------
*/

Route::post(
    'posts/import',
    [PostController::class, 'import']
);

Route::get(
    'posts/export',
    [PostController::class, 'export']
);

/*
|--------------------------------------------------------------------------
| Bulk Operations
|--------------------------------------------------------------------------
*/

Route::post(
    'posts/bulk-delete',
    [PostController::class, 'bulkDelete']
);

/*
|--------------------------------------------------------------------------
| Trash
|--------------------------------------------------------------------------
*/

Route::get(
    'posts-trash',
    [PostController::class, 'trash']
);

Route::post(
    'posts/{id}/restore',
    [PostController::class, 'restore']
);

Route::delete(
    'posts/{id}/force-delete',
    [PostController::class, 'forceDelete']
);

/*
|--------------------------------------------------------------------------
| Import / Export History
|--------------------------------------------------------------------------
*/

Route::get(
    'import-export-history',
    [PostController::class, 'history']
);

Route::delete(
    'import-export-history/{id}',
    [PostController::class, 'deleteHistory']
);

/*
|--------------------------------------------------------------------------
| Post CRUD
|--------------------------------------------------------------------------
*/

Route::apiResource(
    'posts',
    PostController::class
);