<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PostController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/


Route::post('posts/import', [PostController::class, 'import']);
Route::get('posts/export', [PostController::class, 'export']);

Route::apiResource('posts', PostController::class);

