<?php

return [

    // API routes where CORS rules will be applied
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    // Allowed HTTP methods (GET, POST, PUT, DELETE, etc.)
    'allowed_methods' => ['*'],

    // Frontend origins allowed to access the API
    'allowed_origins' => ['http://localhost:3000'],

    // Patterns for allowed origins (not used here)
    'allowed_origins_patterns' => [],

    // Allowed request headers
    'allowed_headers' => ['*'],

    // Headers exposed to the browser
    'exposed_headers' => [],

    // Cache duration for preflight requests
    'max_age' => 0,

    // Whether cookies / auth headers are supported
    'supports_credentials' => false,

];
