<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->string('category')->nullable()->default('General')->after('body');
            $table->decimal('price', 10, 2)->nullable()->default(0.00)->after('category');
            $table->string('status')->nullable()->default('published')->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn(['category', 'price', 'status']);
        });
    }
};
