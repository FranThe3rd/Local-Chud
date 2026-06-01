FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl tmux \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/data

ENV PYTHONUNBUFFERED=1
ENV LOCALCHUD_DATA_DIR=/app/data

EXPOSE 7001

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7001"]
