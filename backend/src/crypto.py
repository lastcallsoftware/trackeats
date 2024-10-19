import os
import nacl
import nacl.secret
import nacl.utils;

nacl_box: nacl.secret.SecretBox = None

def create_key():
    key = nacl.utils.random(nacl.secret.SecretBox.KEY_SIZE)
    with open("keyfile.key", "wb") as file1:
        file1.write(key)

def load_key():
    keyfile = "keyfile.key"
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

def decrypt(encrypted_data: bytes) -> str:
    byte_data = nacl_box.decrypt(encrypted_data)
    return str(byte_data, "utf-8")

#create_key()