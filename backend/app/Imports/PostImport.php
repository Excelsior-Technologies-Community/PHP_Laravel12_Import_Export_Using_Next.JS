<?php

namespace App\Imports;

use App\Models\Post;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class PostImport implements ToCollection, WithHeadingRow
{
    public int $totalRows = 0;
    public int $successfulRows = 0;
    public int $duplicateRows = 0;
    public int $failedRows = 0;

    public array $errors = [];

    /**
     * Store titles already seen during this import.
     */
    protected array $importedTitles = [];

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {

            // Excel row number including heading row
            $excelRowNumber = $index + 2;

            $this->totalRows++;

            $title = trim((string) ($row['title'] ?? ''));
            $body = trim((string) ($row['body'] ?? ''));

            /*
            |--------------------------------------------------------------------------
            | Validation - Title
            |--------------------------------------------------------------------------
            */

            if ($title === '') {

                $this->failedRows++;

                $this->errors[] = [
                    'row' => $excelRowNumber,
                    'title' => '-',
                    'error' => 'Title is required.',
                    'type' => 'validation',
                ];

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Validation - Body
            |--------------------------------------------------------------------------
            */

            if ($body === '') {

                $this->failedRows++;

                $this->errors[] = [
                    'row' => $excelRowNumber,
                    'title' => $title,
                    'error' => 'Body is required.',
                    'type' => 'validation',
                ];

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Validation - Title Length
            |--------------------------------------------------------------------------
            */

            if (strlen($title) > 255) {

                $this->failedRows++;

                $this->errors[] = [
                    'row' => $excelRowNumber,
                    'title' => $title,
                    'error' => 'Title must not exceed 255 characters.',
                    'type' => 'validation',
                ];

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Duplicate Detection - Same File
            |--------------------------------------------------------------------------
            */

            $titleKey = strtolower($title);

            if (in_array($titleKey, $this->importedTitles, true)) {

                $this->duplicateRows++;

                $this->errors[] = [
                    'row' => $excelRowNumber,
                    'title' => $title,
                    'error' => 'Duplicate title found in uploaded file.',
                    'type' => 'duplicate',
                ];

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Duplicate Detection - Database
            |--------------------------------------------------------------------------
            */

            $existingPost = Post::whereRaw(
                'LOWER(title) = ?',
                [$titleKey]
            )->first();

            if ($existingPost) {

                $this->duplicateRows++;

                $this->errors[] = [
                    'row' => $excelRowNumber,
                    'title' => $title,
                    'error' => 'Post with this title already exists.',
                    'type' => 'duplicate',
                ];

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Create Post
            |--------------------------------------------------------------------------
            */

            Post::create([
                'title' => $title,
                'body' => $body,
            ]);

            $this->importedTitles[] = $titleKey;

            $this->successfulRows++;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Import Summary
    |--------------------------------------------------------------------------
    */

    public function getSummary(): array
    {
        return [
            'total_rows' => $this->totalRows,

            // Original names used by history
            'successful_rows' => $this->successfulRows,
            'duplicate_rows' => $this->duplicateRows,
            'failed_rows' => $this->failedRows,

            // Frontend-friendly names
            'imported' => $this->successfulRows,
            'duplicates' => $this->duplicateRows,
            'failed' => $this->failedRows,

            'errors' => $this->errors,
        ];
    }
}