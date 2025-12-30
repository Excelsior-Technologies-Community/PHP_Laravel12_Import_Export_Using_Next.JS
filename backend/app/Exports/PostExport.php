<?php

namespace App\Exports;

use App\Models\Post;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class PostExport implements FromCollection, WithHeadings
{
    public function collection()
    {
        return Post::select('title', 'body')->get();
    }

    public function headings(): array
    {
        return ['title', 'body'];
    }
}
