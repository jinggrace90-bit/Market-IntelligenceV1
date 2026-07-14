FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=4000

# Install dependencies first for better layer caching.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 4000

# Apply migrations (idempotent) then boot the ASGI app (FastAPI + Socket.IO).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:asgi --host 0.0.0.0 --port ${PORT:-4000}"]
