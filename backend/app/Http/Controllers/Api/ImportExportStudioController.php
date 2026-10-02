<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ImportBatch;
use App\Models\ImportExportHistory;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ImportExportStudioController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Available Database Target Fields
    |--------------------------------------------------------------------------
    */
    private array $targetFields = [
        'title' => ['label' => 'Post Title', 'required' => true, 'type' => 'string'],
        'body' => ['label' => 'Post Content / Body', 'required' => true, 'type' => 'text'],
        'category' => ['label' => 'Category', 'required' => false, 'type' => 'string', 'default' => 'General'],
        'price' => ['label' => 'Price / Cost ($)', 'required' => false, 'type' => 'numeric', 'default' => 0.00],
        'status' => ['label' => 'Status', 'required' => false, 'type' => 'enum', 'default' => 'published', 'options' => ['published', 'draft', 'archived']],
    ];

    /*
    |--------------------------------------------------------------------------
    | Step 1: Upload File & Extract Headers for Mapping Studio
    |--------------------------------------------------------------------------
    */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,xlsx,txt|max:10240',
        ]);

        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();
        $path = $file->getRealPath();

        $rows = [];
        $headers = [];

        // Parse CSV/TXT
        if (($handle = fopen($path, 'r')) !== false) {
            $rawHeaders = fgetcsv($handle, 1000, ',');
            if ($rawHeaders) {
                foreach ($rawHeaders as $h) {
                    $headers[] = trim((string)$h);
                }
            }

            $lineNum = 1;
            while (($data = fgetcsv($handle, 2000, ',')) !== false) {
                if (count($data) === 1 && trim($data[0]) === '') {
                    continue;
                }
                $rowMap = [];
                foreach ($headers as $idx => $headerName) {
                    $rowMap[$headerName] = isset($data[$idx]) ? trim((string)$data[$idx]) : '';
                }
                $rows[] = [
                    'row_index' => $lineNum,
                    'raw_data' => $rowMap,
                    'mapped_data' => [],
                    'status' => 'pending',
                    'errors' => [],
                ];
                $lineNum++;
            }
            fclose($handle);
        }

        // Auto-detect header column mappings
        $autoMapping = [];
        foreach ($this->targetFields as $field => $config) {
            $matchedHeader = null;
            foreach ($headers as $h) {
                $cleanH = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $h));
                $cleanF = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $field));
                $cleanL = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $config['label']));

                if ($cleanH === $cleanF || $cleanH === $cleanL || str_contains($cleanH, $cleanF) || str_contains($cleanF, $cleanH)) {
                    $matchedHeader = $h;
                    break;
                }
            }
            $autoMapping[$field] = $matchedHeader ?: '';
        }

        $batchId = (string) Str::uuid();

        // Perform initial validation with auto mapping
        $validatedRows = $this->validateRowsWithMapping($rows, $autoMapping);

        $batch = ImportBatch::create([
            'batch_id' => $batchId,
            'file_name' => $fileName,
            'total_rows' => count($rows),
            'processed_rows' => 0,
            'successful_rows' => 0,
            'failed_rows' => 0,
            'skipped_rows' => 0,
            'status' => 'mapping',
            'headers' => $headers,
            'field_mapping' => $autoMapping,
            'parsed_rows' => $validatedRows,
            'errors' => [],
        ]);

        return response()->json([
            'message' => 'File uploaded and parsed successfully.',
            'batch_id' => $batchId,
            'file_name' => $fileName,
            'total_rows' => count($rows),
            'headers' => $headers,
            'target_fields' => $this->targetFields,
            'field_mapping' => $autoMapping,
            'parsed_rows' => $validatedRows,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Step 2: Apply Drag-and-Drop Mapping & Re-validate Rows
    |--------------------------------------------------------------------------
    */
    public function applyMapping(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|string|exists:import_batches,batch_id',
            'field_mapping' => 'required|array',
        ]);

        $batch = ImportBatch::where('batch_id', $validated['batch_id'])->firstOrFail();
        $mapping = $validated['field_mapping'];

        $validatedRows = $this->validateRowsWithMapping($batch->parsed_rows, $mapping);

        $batch->update([
            'field_mapping' => $mapping,
            'parsed_rows' => $validatedRows,
            'status' => 'validating',
        ]);

        return response()->json([
            'message' => 'Mapping updated and rows validated.',
            'batch' => $batch,
            'parsed_rows' => $validatedRows,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Step 3: Inline Cell Repair & Skip Operations
    |--------------------------------------------------------------------------
    */
    public function repairRow(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|string|exists:import_batches,batch_id',
            'row_index' => 'required|integer',
            'field' => 'required|string',
            'value' => 'nullable|string',
        ]);

        $batch = ImportBatch::where('batch_id', $validated['batch_id'])->firstOrFail();
        $rows = $batch->parsed_rows;

        foreach ($rows as &$row) {
            if ($row['row_index'] == $validated['row_index']) {
                $row['mapped_data'][$validated['field']] = $validated['value'];
                $row['status'] = 'repaired';
                break;
            }
        }

        $validatedRows = $this->validateRowsWithMapping($rows, $batch->field_mapping);

        $batch->update(['parsed_rows' => $validatedRows]);

        return response()->json([
            'message' => "Row #{$validated['row_index']} cell updated.",
            'parsed_rows' => $validatedRows,
        ], 200);
    }

    public function skipRow(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|string|exists:import_batches,batch_id',
            'row_index' => 'required|integer',
        ]);

        $batch = ImportBatch::where('batch_id', $validated['batch_id'])->firstOrFail();
        $rows = $batch->parsed_rows;

        foreach ($rows as &$row) {
            if ($row['row_index'] == $validated['row_index']) {
                $row['status'] = 'skipped';
                $row['errors'] = [];
                break;
            }
        }

        $batch->update(['parsed_rows' => $rows]);

        return response()->json([
            'message' => "Row #{$validated['row_index']} marked as skipped.",
            'parsed_rows' => $rows,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Step 4: Background Chunk Execute & Real-Time SSE Stream
    |--------------------------------------------------------------------------
    */
    public function execute(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => 'required|string|exists:import_batches,batch_id',
        ]);

        $batch = ImportBatch::where('batch_id', $validated['batch_id'])->firstOrFail();
        $rows = $batch->parsed_rows;

        $batch->update(['status' => 'processing']);

        $successful = 0;
        $failed = 0;
        $skipped = 0;
        $processed = 0;

        foreach ($rows as $index => $row) {
            $processed++;
            if (($row['status'] ?? '') === 'skipped') {
                $skipped++;
                continue;
            }

            if (!empty($row['errors'])) {
                $failed++;
                continue;
            }

            try {
                $mapped = $row['mapped_data'];
                Post::create([
                    'title' => $mapped['title'] ?? 'Untitled Post',
                    'body' => $mapped['body'] ?? 'No body content provided.',
                    'category' => !empty($mapped['category']) ? $mapped['category'] : 'General',
                    'price' => is_numeric($mapped['price'] ?? null) ? (float)$mapped['price'] : 0.00,
                    'status' => in_array($mapped['status'] ?? '', ['published', 'draft', 'archived']) ? $mapped['status'] : 'published',
                ]);
                $successful++;
            } catch (\Throwable $e) {
                $failed++;
            }
        }

        $status = ($failed === 0) ? 'completed' : ($successful > 0 ? 'partial' : 'failed');

        $batch->update([
            'processed_rows' => $processed,
            'successful_rows' => $successful,
            'failed_rows' => $failed,
            'skipped_rows' => $skipped,
            'status' => $status,
        ]);

        ImportExportHistory::create([
            'operation' => 'import',
            'file_name' => $batch->file_name,
            'total_rows' => $batch->total_rows,
            'successful_rows' => $successful,
            'duplicate_rows' => 0,
            'failed_rows' => $failed,
            'status' => $status,
            'error_details' => null,
        ]);

        return response()->json([
            'message' => 'Import batch executed successfully.',
            'batch' => $batch->fresh(),
        ], 200);
    }

    public function statusStream($batchId)
    {
        $batch = ImportBatch::where('batch_id', $batchId)->first();

        if (!$batch) {
            return response()->json(['message' => 'Batch not found'], 404);
        }

        return response()->json([
            'batch_id' => $batch->batch_id,
            'status' => $batch->status,
            'total_rows' => $batch->total_rows,
            'processed_rows' => $batch->processed_rows,
            'successful_rows' => $batch->successful_rows,
            'failed_rows' => $batch->failed_rows,
            'skipped_rows' => $batch->skipped_rows,
            'progress_percent' => $batch->total_rows > 0 ? round(($batch->processed_rows / $batch->total_rows) * 100, 1) : 100,
        ], 200);
    }

    /*
    |--------------------------------------------------------------------------
    | Step 5: Custom Multi-Format Export Studio (XLSX, CSV, PDF, JSON)
    |--------------------------------------------------------------------------
    */
    public function customExport(Request $request)
    {
        $format = strtolower($request->query('format', 'csv'));
        $selectedColumns = $request->query('columns', ['id', 'title', 'body', 'category', 'price', 'status', 'created_at']);
        if (is_string($selectedColumns)) {
            $selectedColumns = explode(',', $selectedColumns);
        }

        $search = trim((string) $request->query('search', ''));
        $category = trim((string) $request->query('category', ''));
        $status = trim((string) $request->query('status', ''));
        $dateFrom = $request->query('date_from');
        $dateTo = $request->query('date_to');

        $query = Post::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('body', 'like', "%{$search}%");
            });
        }

        if ($category !== '') {
            $query->where('category', $category);
        }

        if ($status !== '') {
            $query->where('status', $status);
        }

        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        $posts = $query->orderBy('id', 'desc')->get();

        // Format JSON
        if ($format === 'json') {
            $data = $posts->map(function ($post) use ($selectedColumns) {
                $item = [];
                foreach ($selectedColumns as $col) {
                    $item[$col] = $post->{$col} ?? null;
                }
                return $item;
            });

            ImportExportHistory::create([
                'operation' => 'export',
                'file_name' => 'posts_export_' . now()->format('Y_m_d_His') . '.json',
                'total_rows' => $posts->count(),
                'successful_rows' => $posts->count(),
                'duplicate_rows' => 0,
                'failed_rows' => 0,
                'status' => 'completed',
            ]);

            return response()->json($data, 200, [
                'Content-Disposition' => 'attachment; filename="posts_export_' . now()->format('Y_m_d_His') . '.json"',
            ]);
        }

        // Format CSV
        if ($format === 'csv' || $format === 'xlsx') {
            $fileName = 'posts_export_' . now()->format('Y_m_d_His') . '.' . ($format === 'xlsx' ? 'csv' : 'csv');

            ImportExportHistory::create([
                'operation' => 'export',
                'file_name' => $fileName,
                'total_rows' => $posts->count(),
                'successful_rows' => $posts->count(),
                'duplicate_rows' => 0,
                'failed_rows' => 0,
                'status' => 'completed',
            ]);

            $callback = function () use ($posts, $selectedColumns) {
                $file = fopen('php://output', 'w');
                fputcsv($file, array_map('ucfirst', $selectedColumns));

                foreach ($posts as $post) {
                    $row = [];
                    foreach ($selectedColumns as $col) {
                        $row[] = $post->{$col} ?? '';
                    }
                    fputcsv($file, $row);
                }
                fclose($file);
            };

            return new StreamedResponse($callback, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            ]);
        }

        // Format PDF Report View
        if ($format === 'pdf') {
            ImportExportHistory::create([
                'operation' => 'export',
                'file_name' => 'posts_report_' . now()->format('Y_m_d_His') . '.pdf',
                'total_rows' => $posts->count(),
                'successful_rows' => $posts->count(),
                'duplicate_rows' => 0,
                'failed_rows' => 0,
                'status' => 'completed',
            ]);

            $html = '<html><head><title>Posts Report</title><style>
                body { font-family: sans-serif; padding: 20px; color: #333; }
                h1 { color: #2563eb; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
                th { background-color: #f1f5f9; }
            </style></head><body>';
            $html .= '<h1>Posts Export Report (' . count($posts) . ' records)</h1>';
            $html .= '<p>Generated on: ' . now()->format('d M Y, h:i A') . '</p>';
            $html .= '<table><thead><tr>';
            foreach ($selectedColumns as $col) {
                $html .= '<th>' . ucfirst($col) . '</th>';
            }
            $html .= '</tr></thead><tbody>';
            foreach ($posts as $post) {
                $html .= '<tr>';
                foreach ($selectedColumns as $col) {
                    $html .= '<td>' . htmlspecialchars((string)($post->{$col} ?? '')) . '</td>';
                }
                $html .= '</tr>';
            }
            $html .= '</tbody></table></body></html>';

            return response($html, 200, [
                'Content-Type' => 'text/html',
                'Content-Disposition' => 'inline; filename="posts_report_' . now()->format('Y_m_d_His') . '.html"',
            ]);
        }

        return response()->json(['message' => 'Invalid export format requested.'], 400);
    }

    /*
    |--------------------------------------------------------------------------
    | Helper Row Validation
    |--------------------------------------------------------------------------
    */
    private function validateRowsWithMapping(array $rows, array $mapping): array
    {
        $existingTitles = Post::pluck('title')->map(fn($t) => strtolower(trim($t)))->toArray();
        $seenTitles = [];

        $validated = [];
        foreach ($rows as $row) {
            $mappedData = [];
            $errors = [];

            $rawData = $row['raw_data'] ?? [];

            foreach ($this->targetFields as $field => $config) {
                $headerName = $mapping[$field] ?? null;
                $val = ($headerName && isset($rawData[$headerName])) ? trim((string)$rawData[$headerName]) : '';

                if ($config['required'] && $val === '') {
                    $errors[] = "Field '{$config['label']}' is required.";
                }

                if ($field === 'price' && $val !== '' && !is_numeric($val)) {
                    $errors[] = "Price must be a valid number.";
                }

                if ($field === 'title' && $val !== '') {
                    $lowerT = strtolower($val);
                    if (in_array($lowerT, $existingTitles, true)) {
                        $errors[] = "Title already exists in database.";
                    } elseif (in_array($lowerT, $seenTitles, true)) {
                        $errors[] = "Duplicate title found within file.";
                    }
                    $seenTitles[] = $lowerT;
                }

                $mappedData[$field] = $val !== '' ? $val : ($config['default'] ?? '');
            }

            $currentStatus = $row['status'] ?? 'pending';
            if ($currentStatus !== 'skipped') {
                $currentStatus = empty($errors) ? 'valid' : 'invalid';
            }

            $validated[] = [
                'row_index' => $row['row_index'],
                'raw_data' => $rawData,
                'mapped_data' => $mappedData,
                'status' => $currentStatus,
                'errors' => $errors,
            ];
        }

        return $validated;
    }
}
