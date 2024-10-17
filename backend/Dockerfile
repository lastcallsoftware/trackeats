# Use an official Python runtime as the base image
FROM python:3

# Keeps Python from generating .pyc files in the container
ENV PYTHONDONTWRITEBYTECODE=1

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED=1

# Copy the requirements file into the container
COPY requirements.txt requirements.txt

# Install any dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Set the working directory in the container
WORKDIR /app

# Copy the rest of your application code into the container
COPY . .

# Expose the web service port
EXPOSE 5000

# Creates a non-root user with an explicit UID and adds permission to access the /app folder
# For more info, please refer to https://aka.ms/vscode-docker-python-configure-containers
RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

# Specify the command to run when the container starts.
# This command runs the app by simply executing it as Python code.
# The app uses whatever app server is specified in the last line of code.  When 
# the # boilerplate code was generated, this used Flask's built-in WSGI server:
#   app.run(debug=True)
#...but I have updated it to use the Waitress server:
#   serve(app, listen="*:5000")
# Can't remember why I did that when we can run Waitress from the Dockerfile (see below)!
CMD ["python", "app.py"]

# This runs the app using the Waitress WSGI app server
#CMD ["waitress-serve", "--listen=0.0.0.0:5000", "--call", "app:app"]

# Run the app using the Gunicorn WSGI server.
# During debugging, this entry point will be overridden. For more information, please refer to https://aka.ms/vscode-docker-python-debug
#CMD ["gunicorn", "--bind", "0.0.0.0:5000", "backend.app:app"]
