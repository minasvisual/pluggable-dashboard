# CRUD Rendering Specification

## Purpose
Define how the dashboard dynamically generates tables, forms, and custom inputs from JSON schema configurations.

## Requirements

### Requirement: Dynamic Table Generation
The dashboard MUST render a data table displaying properties where the config option `grid` is truthy or where the field index is configured.

#### Scenario: Displaying properties in the grid
- **GIVEN** a resource schema containing properties:
  ```json
  [
    { "name": "id", "label": "ID", "config": { "grid": true } },
    { "name": "name", "label": "Name", "config": { "grid": true } },
    { "name": "bio", "label": "About" }
  ]
  ```
- **WHEN** the table view loads
- **THEN** the table SHALL display columns for "ID" and "Name"
- **AND** it SHALL NOT display a column for "About"

---

### Requirement: Dynamic Form Rendering
The application MUST render forms using Vue Formulate based on schema properties and input types.

#### Scenario: Rendering standard and custom input types
- **GIVEN** a schema property with `type: "textarea"`
- **WHEN** rendering the edit/create form
- **THEN** the form MUST display a text area input matching the key name
- **GIVEN** a schema property with `type: "wysiwyg"`
- **WHEN** rendering the edit/create form
- **THEN** the form MUST render the custom rich text editor (Quill) instead of a standard textarea
