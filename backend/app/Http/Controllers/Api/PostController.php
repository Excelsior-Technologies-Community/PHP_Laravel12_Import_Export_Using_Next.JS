<?php

namespace App\Http\Controllers\Api;
use App\Imports\PostImport;
use App\Exports\PostExport;
use Maatwebsite\Excel\Facades\Excel;


// Base controller class
use App\Http\Controllers\Controller;

// Post model
use App\Models\Post;

// HTTP request class
use Illuminate\Http\Request;

class PostController extends Controller
{
    // GET /api/posts - Fetch all posts
    public function index()
    {
        return response()->json([
            'data' => Post::all()
        ], 200);
    }

    // POST /api/posts - Create a new post
    public function store(Request $request)
    {
        // Validate incoming request data
        $request->validate([
            'title' => 'required|string|max:255',
            'body'  => 'required|string',
        ]);

        // Create a new post record
        $post = Post::create([
            'title' => $request->title,
            'body'  => $request->body,
        ]);

        // Return success response
        return response()->json([
            'message' => 'Post created successfully',
            'data' => $post
        ], 201);
    }

    // GET /api/posts/{id} - Fetch single post by ID
    public function show($id)
    {
        // Find post or throw 404 error
        $post = Post::findOrFail($id);

        return response()->json([
            'data' => $post
        ], 200);
    }

    // PUT /api/posts/{id} - Update an existing post
    public function update(Request $request, $id)
    {
        // Validate request data
        $request->validate([
            'title' => 'required|string|max:255',
            'body'  => 'required|string',
        ]);

        // Find post by ID
        $post = Post::findOrFail($id);

        // Update post data
        $post->update($request->all());

        return response()->json([
            'message' => 'Post updated successfully',
            'data' => $post
        ], 200);
    }

    // DELETE /api/posts/{id} - Delete a post
    public function destroy($id)
    {
        // Find and delete post
        Post::findOrFail($id)->delete();

        return response()->json([
            'message' => 'Post deleted successfully'
        ], 200);
    }

    // POST /api/posts/import 
    public function import(Request $request) 
    { 
        $request->validate([ 
            'file' => 'required|mimes:xlsx,csv' 
        ]); 
    
        Excel::import(new PostImport, $request->file('file')); 
    
        return response()->json([ 
            'message' => 'Posts imported successfully' 
        ]); 
    } 
    
    // GET /api/posts/export 
    public function export() 
    { 
        return Excel::download(new PostExport, 'posts.xlsx'); 
    } 
} 

