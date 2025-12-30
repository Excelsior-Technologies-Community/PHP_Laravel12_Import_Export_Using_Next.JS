<?php

namespace App\Models;

// Enables factory support for testing / seeding
use Illuminate\Database\Eloquent\Factories\HasFactory;

// Base Eloquent model
use Illuminate\Database\Eloquent\Model;

class Post extends Model
{
    use HasFactory;

    // Fields allowed for mass assignment
    protected $fillable = ['title', 'body'];
}
