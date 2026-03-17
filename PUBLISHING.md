# Publishing FastForge to PyPI

This guide explains how to publish the **fastforge** package so anyone can run:

```bash
pip install fastforge
fastforge new crm_app
```

---

## Prerequisites

1. **PyPI account**  
   - Create one at [pypi.org](https://pypi.org/account/register/).  
   - For testing, use [test.pypi.org](https://test.pypi.org/account/register/).

2. **API token**  
   - PyPI: Account → Account settings → API tokens → Add API token.  
   - Scope: entire account or a single project (e.g. `fastforge`).  
   - Save the token (e.g. `pypi-...`); you won’t see it again.

3. **Tools** (in the repo where `pyproject.toml` lives):

   ```bash
   pip install build twine
   ```

---

## 1. Bump version (optional)

Edit `pyproject.toml` and update the version, e.g.:

```toml
version = "0.1.1"
```

PyPI does not allow re-uploading the same version.

---

## 2. Build the package

From the **repository root** (where `pyproject.toml` and `fastforge/` live):

```bash
# Clean old builds
rm -rf dist/ build/ *.egg-info fastforge.egg-info

# Build wheel and sdist
python -m build
```

This creates:

- `dist/fastforge-0.1.0-py3-none-any.whl`
- `dist/fastforge-0.1.0.tar.gz`

---

## 3. Check the wheel (optional)

Ensure templates are included:

```bash
unzip -l dist/fastforge-*.whl | grep templates
```

You should see paths like `fastforge/templates/app/main.py`, etc.

---

## 4. Upload to PyPI

**Production (pypi.org):**

```bash
python -m twine upload dist/*
```

When prompted:

- **Username:** `__token__`
- **Password:** your PyPI API token (e.g. `pypi-...`)

**Or use env vars (no prompt):**

```bash
export TWINE_USERNAME=__token__
export TWINE_PASSWORD=pypi-your-api-token-here
python -m twine upload dist/*
```

**Test PyPI (for trying the flow):**

```bash
python -m twine upload --repository testpypi dist/*
```

Use a Test PyPI token and install with:

```bash
pip install --index-url https://test.pypi.org/simple/ fastforge
```

---

## 5. Install and verify

After publishing to PyPI:

```bash
pip install fastforge
fastforge --version
fastforge new my_test_app
cd my_test_app
pip install -r requirements.txt
cp .env.example .env
cp config/database.yml.example config/database.yml
fastforge generate model User
fastforge generate controller Users
fastforge generate migration create_users
fastforge routes
```

---

## Summary

| Step | Command |
|------|--------|
| Clean | `rm -rf dist/ build/ *.egg-info` |
| Build | `python -m build` |
| Upload (PyPI) | `python -m twine upload dist/*` |
| Upload (Test PyPI) | `python -m twine upload --repository testpypi dist/*` |

After that, anyone can run **`pip install fastforge`** and use the CLI.
