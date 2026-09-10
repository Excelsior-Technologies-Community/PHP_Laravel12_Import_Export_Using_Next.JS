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
    | Fetch All Posts
    |--------------------------------------------------------------------------
    */

    public function index()
    {
        return response()->json([
            'data' => Post::latest()->get()
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Create Post
    |--------------------------------------------------------------------------
    */

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        $post = Post::create([
            'title' => $request->title,
            'body' => $request->body,
        ]);

        return response()->json([
            'message' => 'Post created successfully',
            'data' => $post
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
            'data' => $post
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Update Post
    |--------------------------------------------------------------------------
    */

    public function update(Request $request, $id)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
        ]);

        $post = Post::findOrFail($id);

        $post->update([
            'title' => $request->title,
            'body' => $request->body,
        ]);

        return response()->json([
            'message' => 'Post updated successfully',
            'data' => $post
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Delete Post
    |--------------------------------------------------------------------------
    */

    public function destroy($id)
    {
        Post::findOrFail($id)->delete();

        return response()->json([
            'message' => 'Post deleted successfully'
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

        /*
        |--------------------------------------------------------------------------
        | Determine Import Status
        |--------------------------------------------------------------------------
        */

        if ($summary['successful_rows'] === $summary['total_rows']) {

            $status = 'completed';

        } elseif ($summary['successful_rows'] > 0) {

            $status = 'partial';

        } else {

            $status = 'failed';
        }

        /*
        |--------------------------------------------------------------------------
        | Save Import History
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | Save Failed Import History
        |--------------------------------------------------------------------------
        */

        ImportExportHistory::create([
            'operation' => 'import',

            'file_name' => $request->file('file')?->getClientOriginalName(),

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
                ]
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

    public function export()
    {
        $fileName = 'posts_' . now()->format('Y_m_d_H_i_s') . '.xlsx';

        $totalRows = Post::count();

        /*
        |--------------------------------------------------------------------------
        | Save Export History
        |--------------------------------------------------------------------------
        */

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
            new PostExport,
            $fileName
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Import / Export History
    |--------------------------------------------------------------------------
    */

    public function history()
    {
        $history = ImportExportHistory::latest()->get();

        return response()->json([
            'data' => $history
        ], 200);
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
            'message' => 'History deleted successfully.'
        ], 200);
    }
}

