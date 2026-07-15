# Project Configuration Specification

## Purpose
Define how the Pluggable Dashboard loads, processes, and stores project configuration files and resource schemas.

## Requirements

### Requirement: Loading Projects Configuration
The application SHALL load the list of available projects from the path or URL specified by the `VUE_APP_DATABASE` environment variable.

#### Scenario: Successful configuration load on app mount
- **GIVEN** the `VUE_APP_DATABASE` environment variable is set to `/examples/projects.json`
- **WHEN** the application starts up and mounts the root component
- **THEN** the application MUST make a GET request to retrieve `/examples/projects.json`
- **AND** it MUST store the list of projects in the Vuex state under `projects`

#### Scenario: Configuration file missing or invalid
- **GIVEN** the resource at `VUE_APP_DATABASE` returns a 404 or invalid JSON
- **WHEN** the application attempts to load projects on boot
- **THEN** it SHALL trigger a notification with an error message
- **AND** the Vuex state `projects` MUST remain empty

---

### Requirement: Resolving Resource Schemas
The application SHALL dynamically fetch individual resource schemas when navigating to a specific resource path.

#### Scenario: Fetching schema for a resource
- **GIVEN** a project named `myproject` with a resource `users` defined with schema `users_schema.json` under `resources_path: "/models/"`
- **WHEN** the user navigates to `/api/myproject/users`
- **THEN** the application MUST make a GET request to the URL formed by combining the project's root URL and the resource path: `<project_url>/models/users_schema.json`
- **AND** it MUST cache the resolved schema in Vuex state under `schemas` to prevent redundant fetches.
