from __future__ import annotations

import base64
import io
import json
import os
import urllib.error
import urllib.request
import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

app = FastAPI(title="Jewelry Image Merge API", version="1.0.0")

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


def _load_env_file(file_path: str) -> None:
    if not os.path.exists(file_path):
        return

    try:
        with open(file_path, "r", encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        # If .env can't be read, server still works with process env variables.
        return


_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_load_env_file(os.path.join(_CURRENT_DIR, ".env"))
_load_env_file(os.path.join(os.path.dirname(_CURRENT_DIR), ".env"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _open_as_rgba(upload: UploadFile) -> Image.Image:
    try:
        raw = upload.file.read()
        image = Image.open(io.BytesIO(raw)).convert("RGBA")
        return image
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {upload.filename}") from exc


def _detect_face_bbox(model_image: Image.Image) -> tuple[int, int, int, int] | None:
    rgb = np.array(model_image.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    classifier = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    faces = classifier.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(60, 60),
    )

    if len(faces) == 0:
        return None

    x, y, w, h = max(faces, key=lambda value: value[2] * value[3])
    return int(x), int(y), int(w), int(h)


def _extract_foreground_mask(rgb: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]

    not_white = gray < 246
    not_black = gray > 24

    # Keep jewelry details that are either colorful or sufficiently bright.
    mask = not_white & not_black & ((saturation > 18) | (gray > 68))

    kernel = np.ones((3, 3), dtype=np.uint8)
    cleaned = cv2.morphologyEx(mask.astype(np.uint8) * 255, cv2.MORPH_OPEN, kernel)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)

    return cleaned > 0


def _extract_background_from_corners(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    border_h = max(4, h // 12)
    border_w = max(4, w // 12)

    corners = np.concatenate(
        [
            rgb[:border_h, :border_w].reshape(-1, 3),
            rgb[:border_h, w - border_w :].reshape(-1, 3),
            rgb[h - border_h :, :border_w].reshape(-1, 3),
            rgb[h - border_h :, w - border_w :].reshape(-1, 3),
        ],
        axis=0,
    )

    bg_color = np.median(corners, axis=0)
    diff = np.linalg.norm(rgb.astype(np.float32) - bg_color.astype(np.float32), axis=2)
    bg_mask = diff < 30

    kernel = np.ones((5, 5), dtype=np.uint8)
    refined = cv2.morphologyEx(bg_mask.astype(np.uint8) * 255, cv2.MORPH_CLOSE, kernel)
    return refined > 0


def _keep_significant_components(mask: np.ndarray) -> np.ndarray:
    mask_u8 = (mask.astype(np.uint8) * 255)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask_u8, connectivity=8)

    if num_labels <= 1:
        return mask

    h, w = mask.shape
    keep = np.zeros_like(mask, dtype=bool)
    min_area = max(40, int(h * w * 0.00045))
    large_area = int(h * w * 0.35)

    for label in range(1, num_labels):
        area = int(stats[label, cv2.CC_STAT_AREA])
        if area < min_area or area > large_area:
            continue
        keep |= labels == label

    if np.count_nonzero(keep) == 0:
        return mask
    return keep


def _crop_to_alpha(image: Image.Image) -> Image.Image:
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image
    return image.crop(bbox)


def _prepare_jewelry(jewelry_image: Image.Image) -> Image.Image:
    rgba = jewelry_image.convert("RGBA")
    rgba_arr = np.array(rgba)
    alpha = rgba_arr[:, :, 3]

    if np.any(alpha < 250):
        softened = Image.fromarray(rgba_arr, mode="RGBA")
        return _crop_to_alpha(softened)

    rgb = rgba_arr[:, :, :3]
    fg_mask = _extract_foreground_mask(rgb)
    bg_mask = _extract_background_from_corners(rgb)
    mask = fg_mask & (~bg_mask)

    if np.count_nonzero(mask) < max(200, (mask.size // 180)):
        mask = ~bg_mask

    if np.count_nonzero(mask) < max(500, (mask.size // 120)):
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        _, mask_u8 = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        mask = mask_u8 > 0

    mask = _keep_significant_components(mask)

    alpha_channel = np.zeros_like(alpha)
    alpha_channel[mask] = 255
    alpha_channel = cv2.GaussianBlur(alpha_channel, (5, 5), 0)

    merged = np.dstack((rgb, alpha_channel))
    prepared = Image.fromarray(merged.astype(np.uint8), mode="RGBA")
    return _crop_to_alpha(prepared)


def _compute_anchor(
    model_width: int,
    model_height: int,
    face_bbox: tuple[int, int, int, int] | None,
    manual_center_x: float | None,
    manual_center_y: float | None,
    manual_width_ratio: float | None,
) -> tuple[int, int, int]:
    if manual_center_x is not None and manual_center_y is not None and manual_width_ratio is not None:
        center_x = int(model_width * np.clip(manual_center_x, 0.0, 1.0))
        center_y = int(model_height * np.clip(manual_center_y, 0.0, 1.0))
        width = int(model_width * np.clip(manual_width_ratio, 0.1, 0.95))
        return center_x, center_y, width

    if not face_bbox:
        return model_width // 2, int(model_height * 0.62), int(model_width * 0.46)

    face_x, face_y, face_w, face_h = face_bbox
    center_x = face_x + face_w // 2
    center_y = int(face_y + face_h * 1.74)
    width = int(face_w * 1.85)
    return center_x, center_y, width


def _extract_component_images(jewelry_image: Image.Image) -> tuple[Image.Image, Image.Image | None, Image.Image | None]:
    rgba = np.array(jewelry_image.convert("RGBA"))
    alpha = rgba[:, :, 3]
    mask = alpha > 14

    if np.count_nonzero(mask) == 0:
        return jewelry_image, None, None

    labels_count, labels, stats, centroids = cv2.connectedComponentsWithStats(
        (mask.astype(np.uint8) * 255),
        connectivity=8,
    )

    h, w = alpha.shape
    min_area = max(30, int(h * w * 0.00045))

    components: list[dict[str, float | int]] = []
    for label in range(1, labels_count):
        area = int(stats[label, cv2.CC_STAT_AREA])
        if area < min_area:
            continue
        left = int(stats[label, cv2.CC_STAT_LEFT])
        top = int(stats[label, cv2.CC_STAT_TOP])
        width = int(stats[label, cv2.CC_STAT_WIDTH])
        height = int(stats[label, cv2.CC_STAT_HEIGHT])
        cx, cy = centroids[label]
        components.append(
            {
                "label": label,
                "area": area,
                "left": left,
                "top": top,
                "width": width,
                "height": height,
                "cx": float(cx),
                "cy": float(cy),
            }
        )

    if not components:
        return jewelry_image, None, None

    def _crop_component(label: int) -> Image.Image:
        ys, xs = np.where(labels == label)
        y0, y1 = int(ys.min()), int(ys.max()) + 1
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        part = rgba[y0:y1, x0:x1].copy()
        local = labels[y0:y1, x0:x1] == label
        part[:, :, 3] = np.where(local, part[:, :, 3], 0)
        return Image.fromarray(part, mode="RGBA")

    total_area = float(sum(float(comp["area"]) for comp in components))

    earring_candidates = [
        comp
        for comp in components
        if float(comp["area"]) > total_area * 0.01
        and float(comp["area"]) < total_area * 0.28
        and float(comp["cy"]) > h * 0.38
        and (float(comp["cx"]) < w * 0.42 or float(comp["cx"]) > w * 0.58)
    ]

    left_earring_comp = None
    right_earring_comp = None

    left_pool = [comp for comp in earring_candidates if float(comp["cx"]) < w * 0.5]
    right_pool = [comp for comp in earring_candidates if float(comp["cx"]) > w * 0.5]

    if left_pool:
        left_earring_comp = max(
            left_pool,
            key=lambda comp: float(comp["area"]) * (0.8 + min(1.0, float(comp["height"]) / max(1.0, float(comp["width"])))))
    if right_pool:
        right_earring_comp = max(
            right_pool,
            key=lambda comp: float(comp["area"]) * (0.8 + min(1.0, float(comp["height"]) / max(1.0, float(comp["width"])))))

    earring_labels: set[int] = set()
    if left_earring_comp:
        earring_labels.add(int(left_earring_comp["label"]))
    if right_earring_comp:
        earring_labels.add(int(right_earring_comp["label"]))

    necklace_labels = [
        int(comp["label"])
        for comp in components
        if int(comp["label"]) not in earring_labels
        and float(comp["cy"]) < h * 0.82
        and float(comp["width"]) > max(8.0, float(comp["height"]) * 0.8)
    ]

    if not necklace_labels:
        necklace_component = max(
            components,
            key=lambda comp: float(comp["area"]) * (0.6 + min(2.2, float(comp["width"]) / max(1.0, float(comp["height"]))))
            * (0.6 + (1.0 - min(1.0, abs(float(comp["cx"]) - (w * 0.5)) / (w * 0.5)))),
        )
        necklace_labels = [int(necklace_component["label"])]

    ys, xs = np.where(np.isin(labels, necklace_labels))
    if ys.size == 0 or xs.size == 0:
        necklace = jewelry_image
    else:
        y0, y1 = int(ys.min()), int(ys.max()) + 1
        x0, x1 = int(xs.min()), int(xs.max()) + 1
        neck_part = rgba[y0:y1, x0:x1].copy()
        local = np.isin(labels[y0:y1, x0:x1], necklace_labels)
        neck_part[:, :, 3] = np.where(local, neck_part[:, :, 3], 0)
        necklace = Image.fromarray(neck_part, mode="RGBA")

    left_earring = _crop_component(int(left_earring_comp["label"])) if left_earring_comp else None
    right_earring = _crop_component(int(right_earring_comp["label"])) if right_earring_comp else None

    if left_earring and not right_earring:
        right_earring = ImageOps.mirror(left_earring)
    elif right_earring and not left_earring:
        left_earring = ImageOps.mirror(right_earring)

    return necklace, left_earring, right_earring


def _compute_earring_anchors(
    model_width: int,
    model_height: int,
    face_bbox: tuple[int, int, int, int] | None,
) -> tuple[tuple[int, int], tuple[int, int], int]:
    if not face_bbox:
        left_anchor = (int(model_width * 0.37), int(model_height * 0.33))
        right_anchor = (int(model_width * 0.63), int(model_height * 0.33))
        target_h = int(model_height * 0.13)
        return left_anchor, right_anchor, target_h

    face_x, face_y, face_w, face_h = face_bbox
    left_anchor = (int(face_x + face_w * 0.08), int(face_y + face_h * 0.74))
    right_anchor = (int(face_x + face_w * 0.92), int(face_y + face_h * 0.74))
    target_h = int(face_h * 0.42)
    return left_anchor, right_anchor, max(28, target_h)


def _alpha_composite_with_shadow(
    canvas: Image.Image,
    overlay: Image.Image,
    x: int,
    y: int,
    blur: float,
    darkness: float,
) -> None:
    shadow = overlay.copy().convert("RGBA")
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=blur))
    shadow = ImageEnhance.Brightness(shadow).enhance(darkness)
    canvas.alpha_composite(shadow, (x + 2, y + 3))
    canvas.alpha_composite(overlay, (x, y))


def _composite(
    model_image: Image.Image,
    necklace_image: Image.Image,
    left_earring: Image.Image | None,
    right_earring: Image.Image | None,
    face_bbox: tuple[int, int, int, int] | None,
    width_factor: float,
    y_factor: float,
    manual_center_x: float | None,
    manual_center_y: float | None,
    manual_width_ratio: float | None,
    vertical_offset_ratio: float | None,
) -> Image.Image:
    model_w, model_h = model_image.size
    center_x, center_y, anchor_width = _compute_anchor(
        model_w,
        model_h,
        face_bbox,
        manual_center_x,
        manual_center_y,
        manual_width_ratio,
    )
    target_w = max(46, int(anchor_width * width_factor))
    target_w = min(target_w, int(model_w * 0.88))

    ratio = target_w / max(1, necklace_image.width)
    target_h = max(20, int(necklace_image.height * ratio))

    necklace_resized = necklace_image.resize((target_w, target_h), Image.Resampling.LANCZOS)

    x = max(0, min(model_w - target_w, center_x - target_w // 2))
    y_offset = float(np.clip(vertical_offset_ratio if vertical_offset_ratio is not None else y_factor, 0.05, 0.95))
    y = max(0, min(model_h - target_h, int(center_y - target_h * y_offset)))

    composed = model_image.copy()
    _alpha_composite_with_shadow(composed, necklace_resized, x, y, blur=2.6, darkness=0.58)

    left_anchor, right_anchor, base_earring_h = _compute_earring_anchors(model_w, model_h, face_bbox)
    earring_h = int(base_earring_h * (0.92 + (width_factor - 1.0) * 0.35))

    if left_earring:
        left_ratio = earring_h / max(1, left_earring.height)
        left_w = max(16, int(left_earring.width * left_ratio))
        left_resized = left_earring.resize((left_w, max(16, earring_h)), Image.Resampling.LANCZOS)
        lx = max(0, min(model_w - left_resized.width, left_anchor[0] - left_resized.width // 2))
        ly = max(0, min(model_h - left_resized.height, left_anchor[1] - int(left_resized.height * 0.14)))
        _alpha_composite_with_shadow(composed, left_resized, lx, ly, blur=1.8, darkness=0.62)

    if right_earring:
        right_ratio = earring_h / max(1, right_earring.height)
        right_w = max(16, int(right_earring.width * right_ratio))
        right_resized = right_earring.resize((right_w, max(16, earring_h)), Image.Resampling.LANCZOS)
        rx = max(0, min(model_w - right_resized.width, right_anchor[0] - right_resized.width // 2))
        ry = max(0, min(model_h - right_resized.height, right_anchor[1] - int(right_resized.height * 0.14)))
        _alpha_composite_with_shadow(composed, right_resized, rx, ry, blur=1.8, darkness=0.62)

    return composed


def _to_data_url(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def _call_openrouter_image_generation(
    model_image: Image.Image,
    jewelry_image: Image.Image,
    prompt: str | None,
    model_id: str | None,
) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENROUTER_API_KEY is not configured on the server.",
        )

    model_data_url = _to_data_url(model_image.convert("RGBA"))
    jewelry_data_url = _to_data_url(jewelry_image.convert("RGBA"))

    final_prompt = prompt or (
        "Create a realistic jewelry try-on image using the provided model photo and jewelry product image. "
        "Place necklace naturally on the neck and earrings on both ears with accurate scale and alignment. "
        "Keep the model identity, skin tone, hairstyle, and background unchanged. "
        "Output one high-quality photorealistic image."
    )

    payload = {
        "model": model_id or "google/gemini-2.5-flash-image",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": final_prompt},
                    {"type": "image_url", "image_url": {"url": model_data_url}},
                    {"type": "image_url", "image_url": {"url": jewelry_data_url}},
                ],
            }
        ],
        "modalities": ["image", "text"],
        "stream": False,
    }

    req = urllib.request.Request(
        OPENROUTER_API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        err_text = exc.read().decode("utf-8", errors="ignore") if exc.fp else str(exc)
        raise HTTPException(status_code=502, detail=f"OpenRouter HTTP error: {err_text}") from exc
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"OpenRouter request failed: {exc}") from exc

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="OpenRouter returned invalid JSON.") from exc

    choices = parsed.get("choices") or []
    if not choices:
        raise HTTPException(status_code=502, detail="OpenRouter returned no choices.")

    message = choices[0].get("message") or {}
    images = message.get("images") or []
    if not images:
        raise HTTPException(status_code=502, detail="OpenRouter returned no generated images.")

    image_obj = images[0] or {}
    image_url_obj = image_obj.get("image_url") or image_obj.get("imageUrl") or {}
    image_data_url = image_url_obj.get("url")

    if not isinstance(image_data_url, str) or not image_data_url.startswith("data:image"):
        raise HTTPException(status_code=502, detail="OpenRouter image payload was invalid.")

    return image_data_url


def _build_outputs(
    model_image: Image.Image,
    jewelry_image: Image.Image,
    face_bbox: tuple[int, int, int, int] | None,
    manual_center_x: float | None,
    manual_center_y: float | None,
    manual_width_ratio: float | None,
    vertical_offset_ratio: float | None,
) -> tuple[str, str]:
    necklace_image, left_earring, right_earring = _extract_component_images(jewelry_image)

    normal = _composite(
        model_image=model_image,
        necklace_image=necklace_image,
        left_earring=left_earring,
        right_earring=right_earring,
        face_bbox=face_bbox,
        width_factor=1.0,
        y_factor=0.14,
        manual_center_x=manual_center_x,
        manual_center_y=manual_center_y,
        manual_width_ratio=manual_width_ratio,
        vertical_offset_ratio=vertical_offset_ratio,
    )

    hover = _composite(
        model_image=ImageEnhance.Brightness(model_image).enhance(1.03),
        necklace_image=necklace_image,
        left_earring=left_earring,
        right_earring=right_earring,
        face_bbox=face_bbox,
        width_factor=1.05,
        y_factor=0.16,
        manual_center_x=manual_center_x,
        manual_center_y=manual_center_y,
        manual_width_ratio=manual_width_ratio,
        vertical_offset_ratio=vertical_offset_ratio,
    )

    return _to_data_url(normal), _to_data_url(hover)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/merge-images")
def merge_images(
    jewelry_image: UploadFile = File(...),
    model_image: UploadFile = File(...),
    necklace_center_x: float | None = Form(None),
    necklace_center_y: float | None = Form(None),
    necklace_width_ratio: float | None = Form(None),
    vertical_offset_ratio: float | None = Form(None),
    use_openrouter: bool = Form(False),
    openrouter_prompt: str | None = Form(None),
    openrouter_model: str | None = Form(None),
) -> dict:
    if not jewelry_image.content_type or not jewelry_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="jewelry_image must be an image")

    if not model_image.content_type or not model_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="model_image must be an image")

    model_rgba = _open_as_rgba(model_image)
    jewelry_raw = _open_as_rgba(jewelry_image)
    jewelry_rgba = _prepare_jewelry(jewelry_raw)
    face_bbox = _detect_face_bbox(model_rgba)

    if use_openrouter:
        generated_image = _call_openrouter_image_generation(
            model_image=model_rgba,
            jewelry_image=jewelry_raw,
            prompt=openrouter_prompt,
            model_id=openrouter_model,
        )
        return {
            "normalImage": _to_data_url(jewelry_raw),
            "hoverImage": generated_image,
            "faceDetected": face_bbox is not None,
            "provider": "openrouter",
        }

    generated_normal_image, generated_hover_image = _build_outputs(
        model_rgba,
        jewelry_rgba,
        face_bbox,
        necklace_center_x,
        necklace_center_y,
        necklace_width_ratio,
        vertical_offset_ratio,
    )

    return {
        "normalImage": _to_data_url(jewelry_raw),
        "hoverImage": generated_hover_image or generated_normal_image,
        "faceDetected": face_bbox is not None,
        "provider": "local-python",
    }