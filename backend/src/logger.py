from datetime import datetime

# Log messages.  For now just print to console.  Eventually we'll replace with
# something more robust.
def log(message: str):
    print(datetime.now(), message)
