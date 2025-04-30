FROM python:3.13-slim

RUN apt-get update

RUN pip install --upgrade pip

RUN groupadd --gid 1000 myuser && \
    useradd --uid 1000 --gid myuser --shell /bin/bash --create-home myuser

WORKDIR /app

COPY . /app

RUN pip install -r requirements.txt

RUN chown -R myuser:myuser /app

USER myuser

EXPOSE 3001

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:3001" , "main:app"]