FROM python:3.12-slim

WORKDIR /app

# System deps for pdfplumber
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpoppler-cpp-dev \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements_api.txt .
RUN pip install --no-cache-dir -r requirements_api.txt

# Copy source
COPY src/ ./src/
COPY app/ ./app/

# HuggingFace Spaces runs as non-root user 1000
RUN mkdir -p /app/models && chown -R 1000:1000 /app
USER 1000

# Models are downloaded from HF Hub at startup (set HF_MODEL_LB and HF_MODEL_DB env vars)
ENV TRANSFORMERS_CACHE=/app/models
ENV HF_HOME=/app/models

EXPOSE 7860

CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "7860"]
