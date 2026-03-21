FROM python:3.12-slim

# Install git and curl
RUN apt-get update && apt-get install -y git curl && rm -rf /var/lib/apt/lists/*

# Install elan (Lean version manager)
RUN curl https://elan-init.github.io/elan/elan-init.sh -sSf | bash -s -- -y --default-toolchain none
ENV PATH="/root/.elan/bin:${PATH}"

# Copy Lean project and build it (downloads toolchain + builds)
COPY lean_project/ /app/lean_project/
WORKDIR /app/lean_project
RUN lake build

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY app/ /app/app/

WORKDIR /app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
