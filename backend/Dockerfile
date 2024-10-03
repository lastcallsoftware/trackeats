# Use an official Python runtime as the base image
FROM python:3

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt requirements.txt

# Install any dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code into the container
COPY . .

# Specify the command to run when the container starts
# This runs the app using Flask's built-in dev server
#CMD ["python", "app.py"]

# This runs the app using the Waitress WSGI app server
CMD ["waitress-serve", "app:app"]
