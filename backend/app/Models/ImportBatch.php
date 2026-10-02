<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_id',
        'file_name',
        'total_rows',
        'processed_rows',
        'successful_rows',
        'failed_rows',
        'skipped_rows',
        'status',
        'headers',
        'field_mapping',
        'parsed_rows',
        'errors',
    ];

    protected $casts = [
        'headers' => 'array',
        'field_mapping' => 'array',
        'parsed_rows' => 'array',
        'errors' => 'array',
    ];
}
