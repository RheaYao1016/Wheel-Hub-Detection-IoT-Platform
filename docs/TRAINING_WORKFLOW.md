# Training Workflow

## Directly Usable Flow
1. Open `/annotation` and create an annotation project.
2. Upload wheel hub images into `train`, `val`, or `test`.
3. Draw bounding boxes and save labels.
4. Click `Export YOLO dataset`.
5. Open `/training` and select the exported dataset.
6. Choose a model such as `yolov10n.pt`, `yolov10s.pt`, `yolov10m.pt`, `yolov10l.pt`, or `yolov10x.pt`.
7. Start training with at least `10` epochs.
8. Review real artifacts such as `best.pt`, `results.csv`, `confusion_matrix.png`, and generated Ultralytics charts.

## What Works Now
- Annotation project creation
- Image upload with split selection
- Bounding-box labeling
- YOLO dataset export with `dataset.yaml`
- Real training job creation from exported annotation datasets
- Minimum `10` epochs enforced by backend and AI/ML service
- Model version registration after successful training completion
- Honest failure reporting when CUDA, weights, or dataset prerequisites are missing

## Strict Real Mode Rules
- The service no longer fabricates deterministic fallback metrics.
- If `ultralytics` is unavailable, the request fails and tells you how to fix the environment.
- If the dataset is incomplete, the request fails and tells you to re-export or repair the dataset.
- If CUDA is selected but unavailable, the request fails instead of silently switching to CPU.

## Recommended First Run
- Start with `yolov10n.pt`
- Use `10` epochs first to validate labels, split quality, and loss trend
- Move to `20` or `30` epochs after the first stable run succeeds
- Keep the first dataset small but complete so `train/val/test` all exist

## Common Problems and Fixes
- `dataset.yaml is missing`
  - Re-export from `/annotation`.
  - Confirm the dataset path still exists on disk.
- `CUDA was requested, but the current Python environment has no CUDA-capable torch runtime`
  - Install a CUDA-enabled PyTorch build in `services/ai-ml/.venv`.
  - Verify `torch.cuda.is_available()` returns `True`.
- `Real training failed`
  - Check the AI/ML service console.
  - Verify model weights and dataset label/image pairing.
  - Confirm the selected device is available on the current machine.
