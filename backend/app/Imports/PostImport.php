<?php

namespace App\Imports;

use App\Models\Post;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class PostImport implements ToModel, WithHeadingRow
{
    public function model(array $row)
    {
        return new Post([
            'title' => $row['title'],
            'body'  => $row['body'],
        ]);
    }
}
