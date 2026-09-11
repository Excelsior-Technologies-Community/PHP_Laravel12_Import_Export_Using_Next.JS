<?php

namespace App\Http\Controllers\Api;

use App\Exports\PostExport;
use App\Imports\PostImport;
use App\Http\Controllers\Controller;
use App\Models\ImportExportHistory;
use App\Models\Post;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class PostController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Fetch Posts
    |--------------------------------------------------------------------------
    | Search + Sorting + Pagination
    |--------------------------------------------------------------------------
    */

    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        $sort = $request->query('sort', 'created_at');

        $direction = strtolower(
            $request->query('direction', 'asc')
        );

        $perPage = (int) $request->query('per_page', 5);

        $perPage = max(5, min($perPage, 100));

        $allowedSorts = [
            'id',
            'title',
            'created_at',
            'updated_at',
        ];

        if (!in_array($sort, $allowedSorts, true)) {
            $sort = 'created_at';
        }

        if (!in_array($direction, ['asc', 'desc'], true)) {
            $direction = 'asc';
        }

        $query = Post::query();

        /*
        |--------------------------------------------------------------------------
        | Search
        |--------------------------------------------------------------------------
        */

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%");
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Sorting
        |--------------------------------------------------------------------------
        */

        $query->orderBy($sort, $direction);

        /*
        |--------------------------------------------------------------------------
        | Pagination
        |--------------------------------------------------------------------------
        */

        $posts = $query->paginate($perPage);

        return response()->json($posts, 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Dashboard Statistics
    |--------------------------------------------------------------------------
    */

    public function dashboardStats()
    {
        $totalPosts = Post::count();

        $trashPosts = Post::onlyTrashed()->count();

        $imports = ImportExportHistory::where(
            'operation',
            'import'
        )->count();

        $exports = ImportExportHistory::where(
            'operation',
            'export'
        )->count();

        $importedRows = ImportExportHistory::sum(
            'successful_rows'
        );

        $duplicateRows = ImportExportHistory::sum(
            'duplicate_rows'
        );

        $failedRows = ImportExportHistory::sum(
            'failed_rows'
        );

        return response()->json([
            'data' => [
                'total_posts' => $totalPosts,
                'trash_posts' => $trashPosts,
                'imports' => $imports,
                'exports' => $exports,
                'imported_rows' => $importedRows,
                'duplicate_rows' => $duplicateRows,
                'failed_rows' => $failedRows,
            ],
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Create Post
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        $post = Post::create($validated);

        return response()->json([
            'message' => 'Post created successfully',
            'data' => $post,
        ], 201);
    }

    /*
    |--------------------------------------------------------------------------
    | Show Post
    |--------------------------------------------------------------------------
    */

    public function show($id)
    {
        $post = Post::findOrFail($id);

        return response()->json([
            'data' => $post,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Update Post
    |--------------------------------------------------------------------------
    */

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        $post = Post::findOrFail($id);

        $post->update($validated);

        return response()->json([
            'message' => 'Post updated successfully',
            'data' => $post->fresh(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Delete Single Post
    |--------------------------------------------------------------------------
    */

    public function destroy($id)
    {
        $post = Post::findOrFail($id);

        $post->delete();

        return response()->json([
            'message' => 'Post moved to trash successfully',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Bulk Delete
    |--------------------------------------------------------------------------
    */

    public function bulkDelete(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:posts,id',
        ]);

        $count = Post::whereIn(
            'id',
            $validated['ids']
        )->delete();

        return response()->json([
            'message' => "{$count} post(s) moved to trash.",
            'deleted_count' => $count,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Trash
    |--------------------------------------------------------------------------
    */

    public function trash(Request $request)
    {
        $search = trim(
            (string) $request->query('search', '')
        );

        $query = Post::onlyTrashed();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%");
            });
        }

        $posts = $query
            ->oldest('deleted_at')
            ->paginate(5);

        return response()->json($posts, 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Restore Post
    |--------------------------------------------------------------------------
    */

    public function restore($id)
    {
        $post = Post::onlyTrashed()->findOrFail($id);

        $post->restore();

        return response()->json([
            'message' => 'Post restored successfully.',
            'data' => $post->fresh(),
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Permanently Delete Post
    |--------------------------------------------------------------------------
    */

    public function forceDelete($id)
    {
        $post = Post::onlyTrashed()->findOrFail($id);

        $post->forceDelete();

        return response()->json([
            'message' => 'Post permanently deleted.',
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Import Excel / CSV
    |--------------------------------------------------------------------------
    */

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,csv|max:10240',
        ]);

        try {
            $file = $request->file('file');

            $import = new PostImport();

            Excel::import($import, $file);

            $summary = $import->getSummary();

            if (
                $summary['successful_rows']
                === $summary['total_rows']
            ) {
                $status = 'completed';
            } elseif (
                $summary['successful_rows'] > 0
            ) {
                $status = 'partial';
            } else {
                $status = 'failed';
            }

            ImportExportHistory::create([
                'operation' => 'import',
                'file_name' => $file->getClientOriginalName(),
                'total_rows' => $summary['total_rows'],
                'successful_rows' => $summary['successful_rows'],
                'duplicate_rows' => $summary['duplicate_rows'],
                'failed_rows' => $summary['failed_rows'],
                'status' => $status,
                'error_details' => !empty($summary['errors'])
                    ? json_encode($summary['errors'])
                    : null,
            ]);

            return response()->json([
                'message' => 'Import processed successfully.',
                'summary' => $summary,
            ], 200);
        } catch (\Throwable $e) {
            ImportExportHistory::create([
                'operation' => 'import',
                'file_name' => $request->file('file')
                    ?->getClientOriginalName(),
                'total_rows' => 0,
                'successful_rows' => 0,
                'duplicate_rows' => 0,
                'failed_rows' => 0,
                'status' => 'failed',
                'error_details' => json_encode([
                    [
                        'row' => 0,
                        'title' => '-',
                        'error' => $e->getMessage(),
                        'type' => 'system',
                    ],
                ]),
            ]);

            return response()->json([
                'message' => 'Import failed.',
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Export Excel
    |--------------------------------------------------------------------------
    */

    public function export(Request $request)
    {
        $search = trim(
            (string) $request->query('search', '')
        );

        $sort = $request->query(
            'sort',
            'created_at'
        );

        $direction = $request->query(
            'direction',
            'asc'
        );

        $fileName =
            'posts_' .
            now()->format('Y_m_d_H_i_s') .
            '.xlsx';

        $query = Post::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where(
                    'title',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'body',
                    'like',
                    "%{$search}%"
                );
            });
        }

        $totalRows = $query->count();

        ImportExportHistory::create([
            'operation' => 'export',
            'file_name' => $fileName,
            'total_rows' => $totalRows,
            'successful_rows' => $totalRows,
            'duplicate_rows' => 0,
            'failed_rows' => 0,
            'status' => 'completed',
            'error_details' => null,
        ]);

        return Excel::download(
            new PostExport(
                $search,
                $sort,
                $direction
            ),
            $fileName
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Import / Export History
    |--------------------------------------------------------------------------
    */

    public function history(Request $request)
    {
        $search = trim(
            (string) $request->query('search', '')
        );

        $operation = strtolower(
            (string) $request->query('operation', 'all')
        );

        $query = ImportExportHistory::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where(
                    'file_name',
                    'like',
                    "%{$search}%"
                )->orWhere(
                    'status',
                    'like',
                    "%{$search}%"
                );
            });
        }

        if (
            in_array(
                $operation,
                ['import', 'export'],
                true
            )
        ) {
            $query->where(
                'operation',
                $operation
            );
        }

        $history = $query
            ->oldest()
            ->paginate(5);

        return response()->json(
            $history,
            200
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Delete History
    |--------------------------------------------------------------------------
    */

    public function deleteHistory($id)
    {
        ImportExportHistory::findOrFail($id)->delete();

        return response()->json([
            'message' => 'History deleted successfully.',
        ], 200);
    }
}