from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import torch
import cv2
import numpy as np
import segmentation_models_pytorch as smp
from torchvision import models
import torch.nn as nn
import albumentations as A
from albumentations.pytorch import ToTensorV2
from ultralytics import YOLO
import joblib
from skimage.feature import graycomatrix, graycoprops, local_binary_pattern
import warnings
import uuid
import os
import base64
from pydantic import BaseModel
from typing import Optional

warnings.filterwarnings("ignore")

app = FastAPI(title="FractureScope AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Configurare cai modele
# ============================================
PATH_ANATOMIC = "best_clasificator_anatomicB2512.pth"
PATH_UNET = "best_unet_efficientnet800Size.pth"
PATH_YOLO_DET = "fractura_segmentare_v3/weights/best.pt"
PATH_TIP_FRACTURA = "best_clasificator_tip_fractura_augmentat.pth"
PATH_RF = "model_rf_fracturi.pkl"

RESULTS_DIR = "results"
os.makedirs(RESULTS_DIR, exist_ok=True)

CLASE_RO = ['Hand', 'Leg', 'Hip', 'Shoulder']
CLASE_TIP = ['Avulsion fracture', 'Comminuted fracture', 'Fracture Dislocation',
             'Greenstick fracture', 'Hairline Fracture', 'Impacted fracture',
             'Longitudinal fracture', 'Oblique fracture', 'Pathological fracture',
             'Spiral Fracture']
MEAN = np.array([0.485, 0.456, 0.406])
STD = np.array([0.229, 0.224, 0.225])

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[AI Service] Folosim device: {DEVICE}")

# ============================================
# Incarcare modele la pornire (o singura data!)
# ============================================
transform_tip = A.Compose([
    A.LongestMaxSize(max_size=260),
    A.PadIfNeeded(min_height=260, min_width=260, border_mode=cv2.BORDER_CONSTANT, fill=0),
    A.Normalize(mean=MEAN, std=STD),
    ToTensorV2()
])

print("[AI Service] Se incarca modelele...")

anat_model = models.efficientnet_b2(weights=None)
in_f = anat_model.classifier[1].in_features
anat_model.classifier = nn.Sequential(nn.Dropout(p=0.3), nn.Linear(in_f, 4))
anat_model.load_state_dict(torch.load(PATH_ANATOMIC, map_location=DEVICE, weights_only=True))
anat_model.to(DEVICE).eval()

unet_model = smp.Unet(encoder_name="efficientnet-b3", in_channels=3, classes=1)
unet_model.load_state_dict(torch.load(PATH_UNET, map_location=DEVICE, weights_only=True))
unet_model.to(DEVICE).eval()

yolo_model = YOLO(PATH_YOLO_DET)

tip_model = models.efficientnet_b2(weights=None)
in_f_tip = tip_model.classifier[1].in_features
tip_model.classifier = nn.Sequential(nn.Dropout(p=0.3), nn.Linear(in_f_tip, 10))
tip_model.load_state_dict(torch.load(PATH_TIP_FRACTURA, map_location=DEVICE, weights_only=True))
tip_model.to(DEVICE).eval()

rf_model = joblib.load(PATH_RF)

print("[AI Service] Toate modelele incarcate cu succes!")

# ============================================
# Functii helper (din interface_pipeline.py)
# ============================================

def get_tip_fractura(img_rgb, bbox):
    x, y, w, h = bbox
    y1, y2 = max(0, y - 20), min(img_rgb.shape[0], y + h + 20)
    x1, x2 = max(0, x - 20), min(img_rgb.shape[1], x + w + 20)
    crop_img = img_rgb[y1:y2, x1:x2]
    if crop_img.size == 0:
        return "Nedeterminat"
    augmented = transform_tip(image=crop_img)
    tensor_img = augmented['image'].unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        outputs = tip_model(tensor_img)
        pred_idx = outputs.argmax(1).item()
    return CLASE_TIP[pred_idx]


def extrage_trasaturi_pt_rf(img_crop_gray):
    if img_crop_gray is None or img_crop_gray.size == 0:
        return None
    img_resized = cv2.resize(img_crop_gray, (64, 64))
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    img_eq = clahe.apply(img_resized)
    img_blur = cv2.GaussianBlur(img_eq, (3, 3), 0)
    edges = cv2.Canny(img_blur, 50, 150)
    features = []
    glcm = graycomatrix(img_eq, [1], [0, np.pi / 4], levels=256, symmetric=True, normed=True)
    features.append(graycoprops(glcm, 'contrast').mean())
    features.append(graycoprops(glcm, 'energy').mean())
    features.append(graycoprops(glcm, 'homogeneity').mean())
    radius = 1
    n_points = 8 * radius
    lbp = local_binary_pattern(img_eq, n_points, radius, method='uniform')
    n_bins = int(lbp.max() + 1)
    hist_lbp, _ = np.histogram(lbp.ravel(), bins=n_bins, range=(0, n_bins), density=True)
    for i in range(3):
        features.append(hist_lbp[i] if i < len(hist_lbp) else 0)
    moments = cv2.moments(edges)
    hu = cv2.HuMoments(moments).flatten()
    features.append(-np.sign(hu[0]) * np.log10(np.abs(hu[0]) + 1e-10) if hu[0] != 0 else 0)
    features.append(np.sum(edges) / 255 / edges.size)
    return np.array(features).reshape(1, -1)


def img_to_base64(img_rgb):
    """Converteste imaginea numpy in string base64 pentru a o trimite ca JSON"""
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    _, buffer = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode('utf-8')


def run_unet_pipeline(img_orig, img_gray):
    """Ruleaza pipeline-ul UNet si returneaza rezultatele"""
    img_rgb_curat = cv2.cvtColor(img_orig, cv2.COLOR_BGR2RGB)
    img_final = img_rgb_curat.copy()

    clahe_unet = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    img_un = clahe_unet.apply(img_gray)

    h_orig, w_orig = img_orig.shape[:2]
    scale_un = 800 / max(h_orig, w_orig)
    new_w, new_h = int(w_orig * scale_un), int(h_orig * scale_un)
    img_resized_un = cv2.resize(img_un, (new_w, new_h))

    img_padded_un = np.zeros((800, 800), dtype=np.uint8)
    pad_y_un = (800 - new_h) // 2
    pad_x_un = (800 - new_w) // 2
    img_padded_un[pad_y_un:pad_y_un + new_h, pad_x_un:pad_x_un + new_w] = img_resized_un

    img_un_rgb = cv2.cvtColor(img_padded_un, cv2.COLOR_GRAY2RGB).astype(np.float32) / 255.0
    t_un = torch.from_numpy((img_un_rgb - MEAN) / STD).permute(2, 0, 1).unsqueeze(0).float().to(DEVICE)

    with torch.no_grad():
        prob = torch.sigmoid(unet_model(t_un)).cpu().numpy().squeeze()
        mask_padded = (prob > 0.30).astype(np.uint8)

    mask_cropped = mask_padded[pad_y_un:pad_y_un + new_h, pad_x_un:pad_x_un + new_w]
    mask_full = cv2.resize(mask_cropped, (w_orig, h_orig), interpolation=cv2.INTER_NEAREST)
    prob_cropped = prob[pad_y_un:pad_y_un + new_h, pad_x_un:pad_x_un + new_w]
    prob_full = cv2.resize(prob_cropped, (w_orig, h_orig), interpolation=cv2.INTER_LINEAR)

    contours, _ = cv2.findContours(mask_full, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contururi_candidate = [c for c in contours if cv2.contourArea(c) > 10]
    fracturi_confirmate = []
    detections = []

    for c in contururi_candidate:
        x, y, w, h = cv2.boundingRect(c)
        crop_gri = img_gray[y:y + h, x:x + w]
        features_rf = extrage_trasaturi_pt_rf(crop_gri)
        if features_rf is not None:
            decizie = rf_model.predict(features_rf)[0]
            if decizie == 1:
                fracturi_confirmate.append(c)
                c_mask = np.zeros_like(mask_full)
                cv2.drawContours(c_mask, [c], -1, 1, thickness=cv2.FILLED)
                conf = float(prob_full[c_mask == 1].mean())
                cv2.rectangle(img_final, (x, y), (x + w, y + h), (255, 0, 0), 2)
                cv2.drawContours(img_final, [c], -1, (255, 255, 0), 1)
                label = f"{conf:.2f}"
                cv2.putText(img_final, label, (x, max(15, y - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
                detections.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h), "confidence": conf})

    has_fracture = len(fracturi_confirmate) > 0
    fracture_type = None
    max_conf = 0.0

    if has_fracture:
        cel_mai_mare = max(fracturi_confirmate, key=cv2.contourArea)
        bx, by, bw, bh = cv2.boundingRect(cel_mai_mare)
        fracture_type = get_tip_fractura(img_rgb_curat, (bx, by, bw, bh))
        max_conf = max(d["confidence"] for d in detections)

    return has_fracture, fracture_type, max_conf, detections, img_final


def run_yolo_pipeline(img_orig, img_gray):
    """Ruleaza pipeline-ul YOLO si returneaza rezultatele"""
    img_rgb_curat = cv2.cvtColor(img_orig, cv2.COLOR_BGR2RGB)
    img_final = img_rgb_curat.copy()

    results = yolo_model.predict(img_rgb_curat, conf=0.15, iou=0.3, agnostic_nms=True, verbose=False)[0]
    cutii_confirmate = []
    detections = []

    if len(results.boxes) > 0:
        for i in range(len(results.boxes)):
            box = results.boxes.xyxy[i].cpu().numpy().astype(int)
            conf = float(results.boxes.conf[i].item())
            x1, y1, x2, y2 = box[0], box[1], box[2], box[3]
            crop_gri = img_gray[y1:y2, x1:x2]
            features_rf = extrage_trasaturi_pt_rf(crop_gri)
            if features_rf is not None:
                decizie = rf_model.predict(features_rf)[0]
                if decizie == 1:
                    cutii_confirmate.append(box)
                    cv2.rectangle(img_final, (x1, y1), (x2, y2), (255, 0, 0), 2)
                    label = f"{conf:.2f}"
                    cv2.putText(img_final, label, (x1, max(15, y1 - 10)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
                    if results.masks is not None:
                        contour = results.masks.xy[i].astype(np.int32).reshape((-1, 1, 2))
                        cv2.drawContours(img_final, [contour], -1, (255, 255, 0), 1)
                    detections.append({"x1": int(x1), "y1": int(y1), "x2": int(x2), "y2": int(y2), "confidence": conf})

    has_fracture = len(cutii_confirmate) > 0
    fracture_type = None
    max_conf = 0.0

    if has_fracture:
        prima = cutii_confirmate[0]
        bw, bh = prima[2] - prima[0], prima[3] - prima[1]
        fracture_type = get_tip_fractura(img_rgb_curat, (prima[0], prima[1], bw, bh))
        max_conf = max(d["confidence"] for d in detections)

    return has_fracture, fracture_type, max_conf, detections, img_final


# ============================================
# ENDPOINTS
# ============================================

@app.get("/health")
def health_check():
    return {"status": "ok", "device": DEVICE, "models_loaded": True}


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    model_type: str = Form(default="UNet")  # "UNet" sau "YoloV8"
):
    """
    Primeste o radiografie si returneaza rezultatul detectiei.

    Returns:
    - anatomic_region: regiunea detectata (Mana, Picior, Sold, Umar)
    - has_fracture: true/false
    - fracture_type: tipul fracturii (daca exista)
    - confidence: scorul de incredere
    - detections: lista de bounding boxes
    - result_image_base64: imaginea cu rezultatul desenat (base64 JPEG)
    """
    # Citim imaginea din request
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img_orig = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img_orig is None:
        raise HTTPException(status_code=400, detail="Imaginea nu a putut fi citita. Trimite un fisier .jpg sau .png valid.")

    img_gray = cv2.cvtColor(img_orig, cv2.COLOR_BGR2GRAY)

    # --- Clasificator anatomic ---
    clahe_simplu = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    img_anat_gray = clahe_simplu.apply(img_gray)
    h, w = img_anat_gray.shape[:2]
    scale = 512 / max(h, w)
    img_resized = cv2.resize(img_anat_gray, (int(w * scale), int(h * scale)))
    img_padded = np.zeros((512, 512), dtype=np.uint8)
    pad_y = (512 - img_resized.shape[0]) // 2
    pad_x = (512 - img_resized.shape[1]) // 2
    img_padded[pad_y:pad_y + img_resized.shape[0], pad_x:pad_x + img_resized.shape[1]] = img_resized
    img_anat_rgb = cv2.cvtColor(img_padded, cv2.COLOR_GRAY2RGB).astype(np.float32) / 255.0
    t_anat = torch.from_numpy((img_anat_rgb - MEAN) / STD).permute(2, 0, 1).unsqueeze(0).float().to(DEVICE)

    with torch.no_grad():
        regiune_idx = anat_model(t_anat).argmax(1).item()
        anatomic_region = CLASE_RO[regiune_idx]

    # --- Detectie fractura ---
    if model_type == "UNet":
        has_fracture, fracture_type, confidence, detections, img_result = run_unet_pipeline(img_orig, img_gray)
    else:
        has_fracture, fracture_type, confidence, detections, img_result = run_yolo_pipeline(img_orig, img_gray)

    # Convertim imaginea rezultat in base64
    result_image_b64 = img_to_base64(img_result)

    return {
        "anatomic_region": anatomic_region,
        "has_fracture": has_fracture,
        "fracture_type": fracture_type,
        "confidence": round(confidence, 4),
        "model_type": model_type,
        "detections": detections,
        "result_image_base64": result_image_b64
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)