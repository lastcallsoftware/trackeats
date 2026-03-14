# BUILD STAGE
FROM python:3.11-slim AS builder

WORKDIR /tmp

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt


# EXECUTION STAGE
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Set PATH to use user-installed packages
ENV PATH=/root/.local/bin:$PATH

# Create non-root user
RUN adduser --uid 5678 --disabled-password --gecos "" appuser && chown -R appuser /app

# Copy application code
COPY --chown=appuser . .

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')" || exit 1

CMD ["python", "src/app.py"]
