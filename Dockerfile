FROM python:3.9.19-slim-bullseye
# install deps
WORKDIR /app

COPY requirements.txt .
RUN apt-get update && apt-get dist-upgrade -y \
    && apt-get install -y --no-install-recommends netcat-openbsd bash curl libpq-dev build-essential \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir -r requirements.txt

# copy code
COPY . .

# official wait-for-it helper script
RUN curl -fsSL https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh \
    -o /usr/local/bin/wait-for-it \
    && chmod +x /usr/local/bin/wait-for-it

# default command is to run migrations & start the server
CMD ["sh", "-c", "wait-for-it db:5432 -t 30 -- alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"]