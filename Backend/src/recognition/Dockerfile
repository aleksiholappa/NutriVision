FROM python:3.13-slim

RUN apt-get update

WORKDIR /app

COPY . /app

RUN pip install --upgrade pip

RUN pip install -r requirements.txt

RUN useradd -ms /bin/bash myuser

RUN chown -R myuser:myuser /app

RUN chmod -R 755 /app

USER myuser

EXPOSE 3001

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:3001" , "main:app"]
