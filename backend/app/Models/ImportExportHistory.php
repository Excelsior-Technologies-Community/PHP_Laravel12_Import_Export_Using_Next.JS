<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ImportExportHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'operation',
        'file_name',
        'total_rows',
        'successful_rows',
        'duplicate_rows',
        'failed_rows',
        'status',
        'error_details',
    ];
}

