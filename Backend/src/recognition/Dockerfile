FROM python:3.13-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1234 app && \
    useradd -m -u 1234 -g app app

WORKDIR /app

COPY --chown=app:app . /app

RUN mkdir -p /app/uploads && \
    chown app:app /app/uploads && \
    chmod 775 /app/uploads

RUN chmod -R 775 /app

RUN pip install --upgrade pip

RUN pip install -r requirements.txt

USER app:app

EXPOSE 3001

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:3001" , "main:app"]
