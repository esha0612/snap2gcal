FROM public.ecr.aws/lambda/python:3.12

# Copy requirements and install Python deps
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt -t ${LAMBDA_TASK_ROOT}

# Copy your function code
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}

CMD ["lambda_handler.lambda_handler"]