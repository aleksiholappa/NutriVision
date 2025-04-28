FROM python:3.13-slim

WORKDIR /app

COPY . /app

RUN pip install -r requirements.txt

EXPOSE 3001

CMD ["uvicorn", "main:app", "--port", "3001"]