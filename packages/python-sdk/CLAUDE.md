# Python SDK

## Dependencies
This project uses Poetry for dependency management.

```bash
# Install dependencies
poetry install

# Run tests
poetry run pytest tests/ --verbose

# Run specific test
poetry run pytest tests/shared/ -v
```

## Sandbox
Poetry is configured to use in-project venv (`.venv/`), so tests run without escaping sandbox.
Whenever you change CLAUDE.md, apply the same change to AGENTS.md, and vice versa.
