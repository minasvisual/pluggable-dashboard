## ADDED Requirements

### Requirement: Authentication Header Security
All requests to the Sequelize-Express API MUST enforce authentication using the `x-internal-secret` header.

#### Scenario: Unauthorized Access without Header
- **WHEN** a request is made to any route of the Sequelize-Express API without the `x-internal-secret` header
- **THEN** the API MUST return a `401 Unauthorized` response with the body `{"error": "Unauthorized"}`

#### Scenario: Unauthorized Access with Invalid Header
- **WHEN** a request is made to any route of the Sequelize-Express API with an invalid `x-internal-secret` header
- **THEN** the API MUST return a `401 Unauthorized` response with the body `{"error": "Unauthorized"}`

### Requirement: Express Database CRUD Routing
The API SHALL expose an Express router mounted as a Vercel serverless function, supporting CRUD operations for a `Model` resource with `name`, `domain`, and `content` fields.

#### Scenario: List Models
- **WHEN** an authenticated request is made via `GET` to `/api/models`
- **THEN** the API MUST return a `200 OK` status with a list of models in the database

#### Scenario: Create Model
- **WHEN** an authenticated request is made via `POST` to `/api/models` with a valid body containing `name`, `domain`, and `content`
- **THEN** the API MUST save the model to the database and return a `201 Created` status with the created model object

#### Scenario: Update Model
- **WHEN** an authenticated request is made via `PUT` to `/api/models/:id` with new values for `name`, `domain`, or `content`
- **THEN** the API MUST update the model in the database and return a `200 OK` status with the updated model object

#### Scenario: Delete Model
- **WHEN** an authenticated request is made via `DELETE` to `/api/models/:id`
- **THEN** the API MUST remove the model from the database and return a `200 OK` or `204 No Content` status

### Requirement: Vercel Serverless Function Compatibility
The Express application MUST be exported such that it can run as a single Vercel serverless function handler.

#### Scenario: Running as Vercel Function Handler
- **WHEN** the Vercel serverless environment routes a request to `/api/models`
- **THEN** the entrypoint file SHALL export the Express application (or a handler wrapping it) to handle the request routing dynamically
