FROM python:3.12-slim

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY requirements.txt .

RUN uv pip install --system --no-cache -r requirements.txt

COPY collector/ collector/
COPY db/ db/
COPY sdk/ sdk/

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
