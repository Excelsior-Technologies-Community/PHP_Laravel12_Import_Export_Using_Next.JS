<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PostController;

/*
|--------------------------------------------------------------------------
| Import / Export
|--------------------------------------------------------------------------
*/

Route::post('posts/import', [PostController::class, 'import']);

Route::get('posts/export', [PostController::class, 'export']);

/*
|--------------------------------------------------------------------------
| Import / Export History
|--------------------------------------------------------------------------
*/

Route::get('import-export-history', [PostController::class, 'history']);

Route::delete(
    'import-export-history/{id}',
    [PostController::class, 'deleteHistory']
);

/*
|--------------------------------------------------------------------------
| Post CRUD
|--------------------------------------------------------------------------
*/

Route::apiResource('posts', PostController::class);

