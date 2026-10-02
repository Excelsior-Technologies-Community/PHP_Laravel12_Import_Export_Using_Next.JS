<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\ImportExportStudioController;

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
| Advanced Import / Export Studio
|--------------------------------------------------------------------------
*/

Route::post('import-studio/upload', [ImportExportStudioController::class, 'upload']);
Route::post('import-studio/apply-mapping', [ImportExportStudioController::class, 'applyMapping']);
Route::post('import-studio/repair-row', [ImportExportStudioController::class, 'repairRow']);
Route::post('import-studio/skip-row', [ImportExportStudioController::class, 'skipRow']);
Route::post('import-studio/execute', [ImportExportStudioController::class, 'execute']);
Route::get('import-studio/status/{batchId}', [ImportExportStudioController::class, 'statusStream']);
Route::get('export-studio/custom', [ImportExportStudioController::class, 'customExport']);

/*
|--------------------------------------------------------------------------
| Import / Export Standard
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