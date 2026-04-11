# Jewelry Merge Service (Python)

This service merges two images:
1. Jewelry image
2. Model image

It detects the face, estimates the neck area, removes plain black/white jewelry background, and places the jewelry near neck/chest so it looks like worn jewelry.

It returns two generated outputs:
- `normalImage`
- `hoverImage`

## Setup

```bash
cd app/python
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn merge_api:app --host 127.0.0.1 --port 8001 --reload
```

## Environment Variables

Create `app/python/.env`:

```env
OPENROUTER_API_KEY=YOUR_OPENROUTER_KEY
```

Optional frontend toggle in `app/.env`:

```env
VITE_MERGE_API_URL=http://127.0.0.1:8001
VITE_USE_OPENROUTER=true
VITE_OPENROUTER_MODEL=google/gemini-2.5-flash-image
VITE_OPENROUTER_PROMPT=Create a realistic jewelry try-on image...
```

The backend now auto-loads both `app/python/.env` and `app/.env` at startup.

If the server was already running, stop and restart it after installing/updating dependencies.

## Endpoint

- `POST /merge-images`
- Form-data fields:
  - `jewelry_image` (file)
  - `model_image` (file)
  - `necklace_center_x` (optional, 0 to 1)
  - `necklace_center_y` (optional, 0 to 1)
  - `necklace_width_ratio` (optional, 0 to 1)
  - `vertical_offset_ratio` (optional, 0 to 1)

The frontend admin form calls this endpoint at `http://127.0.0.1:8001/merge-images` by default.
