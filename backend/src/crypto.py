import os
import nacl
import nacl.secret
import nacl.utils;
from bcrypt import hashpw, checkpw, gensalt
import secrets

# FYI, it turns out the Python standard library has function to do most of this
# stuff (in the secrets package), but we're already using these third-party 
# libraries and you would THINK that libraries specifically devoted to crypto 
# would be especially secure, so we'll continue to use them for now.

nacl_box: nacl.secret.SecretBox = None

# Generate a token to use in verification emails
def generate_url_token(num_bytes = 32) -> str:
    return secrets.token_urlsafe(32)

# Create a new key file and store it into a file
def create_key_file(keyfile: str) -> None:
    key = nacl.utils.random(nacl.secret.SecretBox.KEY_SIZE)
    with open(keyfile, "wb") as file1:
        file1.write(key)

# Load key file into memory
def load_key(keyfile: str) -> bytes:
    if not os.path.exists(keyfile):
        raise  FileNotFoundError(f"Key file does not exist: {keyfile}")
    try:
        with open(keyfile, "rb") as file:
            secret_key = file.read()
    except OSError:
        raise IOError(f"Could not read key file: {keyfile}")

    # Re-use the same secret key we use for signing tokens.
    # Probably better to have two separate keys, but... come on, man.
    global nacl_box
    nacl_box = nacl.secret.SecretBox(secret_key)

    return secret_key

# Encrypted data will be exactly 40 bytes longer than the encoded data
def encrypt(data: str) -> str:
    byte_data = bytes(data, "utf-8")
    encrypted_data = nacl_box.encrypt(byte_data)
    return encrypted_data

# Decrypt data
def decrypt(encrypted_data: bytes) -> str:
    byte_data = nacl_box.decrypt(encrypted_data)
    return str(byte_data, "utf-8")

# Hash the password
def hash_password(password: str) -> str:
    # Note that the salt is stored as part of the hash, rather than as a 
    # separarte value.  The bcrypt API knows how to separate them.
    salt = gensalt()
    password_bytes = bytes(password, "utf-8")
    password_hash = hashpw(password_bytes, salt)
    password_hash_str = password_hash.decode("utf-8")
    return password_hash_str

# Verify the given password against its hash
def check_password(password: bytes, password_hash: bytes):
    return checkpw(password, password_hash)
