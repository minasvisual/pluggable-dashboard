<template>
<div>
        <pre>
[
    {                                                           //required | Project config
        "code": "modelslug",
        "name": "Model Label",
        "url": "https://project-url.com",                       // Base URL for api (used to control session requests )
        "resources_path": "/models/",                           // Base path or base URL of Json Models folder
        "resources": {                                          // Project crud endpoints schema
            "users": {                                          // !IMPORTANT: object index match url target
                "resource": "users_schema.json",                // Schema Json url/path
                "label": "Users"
            },
            "roles":{
                "resource": "roles_schema.json",
                "label": "Roles"
            }
        },
        "widgets":{                                             // optional | Dashboard Widgets
            "tiles":{
                "resource":"widget_tiles.json",                 // Schema Json url/path (inside $resources_path folder)
                "label": "Tiles test"                           // Card Title
            }
        },
                                                                // optional | Project default http requests schema (overwrited by model schema)
        "api":{                                                 
            "headers": {                                        // Default headers (send in all project http requests)
                "app-key": "1234567890" 
            },
            "params": {                                         // Default query string params (send in all project http requests)
                "limit": 5
            },
            "pagination": {                                     // Default grid settings (apply in all models)
                "limitField": "limit"
            }                                                   // Read Schema json api to more options
        },
                                                                // optional | Project authentication api
        "auth": {
            "url_login": "https://project-url.com/api/user",	// Url of login api
            "url_method": "post",                               // Login http method  | Default POST
            "use_system_auth": true,                            // Borrow the global token in requests; a failure here never expires the global session
            "field_username": "user_id",                        // Username field to be send | Defaut email
            "field_secret": "access_token",                     // Password/Secret field  | Default password
            "field_remember": "remember",                       // Remember field to permanent login (if exists) | Default remember
            "response_mode": "body",                        	// How to get token string | opts: body/header | Default body
            "response_token": "token",                      	// Response data token location (ex: {user:{token: '...'}} means user.token) | Default 'token'
            "request_mode": "header",                       	// How to send token between requests | opts: header/query | Default header
            "request_token": "access-token",                    // Token field name | Default access-token
            "request_token_expression": "Bearer {token}",       // Token request value expression to be interpolated | Default {token}		
            "request_expiration_status": 401,                   // Token expiration status code to be changed authentication status on CRUD
            "logged_url": "https://project-url.com/api/user",	// Url to How to get logged user data  
            "logged_model": {                                   // User response DTO
                "id": "_id",                                    // Ex: { id: 1, fullname: 'John doe', email: 'email@email.com', level: 'admin' }
                "name": "fullname",
                "username": "email",
                "role": "level"
            }
        },
    }
]
    </pre>    
</div>
</template>