<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Run the migrations (create table)
    public function up()
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();              // Primary key
            $table->string('title');   // Post title
            $table->text('body');      // Post content
            $table->timestamps();      // created_at & updated_at
        });
    }

    // Reverse the migrations (drop table)
    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
