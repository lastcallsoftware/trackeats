import nacl
import nacl.secret
import nacl.utils;

def create_key():
    key = nacl.utils.random(nacl.secret.SecretBox.KEY_SIZE)
    with open("keyfile.key", "wb") as file1:
        file1.write(key)

create_key()