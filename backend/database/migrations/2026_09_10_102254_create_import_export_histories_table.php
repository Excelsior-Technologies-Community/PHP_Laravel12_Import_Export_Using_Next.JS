<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_export_histories', function (Blueprint $table) {
            $table->id();

            $table->enum('operation', ['import', 'export']);

            $table->string('file_name')->nullable();

            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('successful_rows')->default(0);
            $table->unsignedInteger('duplicate_rows')->default(0);
            $table->unsignedInteger('failed_rows')->default(0);

            $table->enum('status', [
                'completed',
                'partial',
                'failed'
            ])->default('completed');

            $table->text('error_details')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_export_histories');
    }
};
