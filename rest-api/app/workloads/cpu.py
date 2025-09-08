import io
import time
from typing import Any, Dict, List

import torch
import torchvision.transforms as T
from PIL import Image
from torchvision.models import ResNet18_Weights, resnet18

# Load pretrained ResNet18 once at startup
weights = ResNet18_Weights.DEFAULT
model = resnet18(weights=weights)
model.eval()
transform = weights.transforms()
idx2label = weights.meta["categories"]

def classify_image(file_bytes: bytes, topk: int = 5) -> Dict[str, Any]:
    t0 = time.perf_counter()
    
    # Preprocess
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    x = transform(img).unsqueeze(0)

    # Forward pass
    with torch.no_grad():
        logits = model(x)
        probs = torch.nn.functional.softmax(logits[0], dim=0)

    # Get top-k predictions
    values, indices = torch.topk(probs, topk)
    preds = [{"label": idx2label[idx], "prob": float(val)} for val, idx in zip(values, indices)]

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    return {"predictions": preds, "elapsed_ms": elapsed_ms}
