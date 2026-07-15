# Serverless API Specification

## Purpose
Define the behavior and security standards of the internal serverless functions located under `/api/`.

## Requirements

### Requirement: Internal Header Security
All serverless functions located under `/api/` MUST enforce authentication using the `x-internal-secret` header.

#### Scenario: Request without valid secret
- **GIVEN** a request is made to `GET /api/datetime` with no `x-internal-secret` header or an incorrect secret value
- **WHEN** the serverless function executes
- **THEN** the API MUST return a `401 Unauthorized` response with a JSON error payload:
  ```json
  { "error": "Unauthorized" }
  ```

#### Scenario: Request with valid secret
- **GIVEN** a request is made to `GET /api/datetime` containing `x-internal-secret` equal to the environment variable `API_SECRET`
- **WHEN** the serverless function executes
- **THEN** the API MUST return a `200 OK` status
- **AND** the response payload MUST contain current server information:
  - `date` (format YYYY-MM-DD)
  * `time` (format HH:MM:SS)
  * `timestamp` (ISO String)
  * `timezone` (Server resolved time zone)
