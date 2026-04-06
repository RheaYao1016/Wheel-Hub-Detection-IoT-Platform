# Industrial Surface Defect Detection AI/ML Service

This FastAPI service provides:

- OpenAI-compatible AI analysis orchestration
- Controlled natural-language diagnostics
- Multi-format report generation (`csv`, `xlsx`, `docx`)
- Real YOLO-oriented training execution through Ultralytics

Run locally:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 18100 --reload
```

## Training Behavior

- When `ultralytics` is installed, the service runs real YOLO-compatible training from the exported annotation dataset.
- When training dependencies or dataset files are unavailable, the request fails with an actionable remediation message instead of fabricating metrics.
- Exported annotation datasets are expected to include a `dataset.yaml` file under the dataset root.
