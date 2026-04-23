import nacl
import nacl.secret
from nacl.utils import EncryptedMessage
from bcrypt import hashpw, checkpw, gensalt
import secrets
import base64
import hashlib
import hmac

class Crypto:
    _symmetric_key: bytes | None = None
    _nacl_box: nacl.secret.SecretBox | None = None

    @staticmethod
    def generate_url_token(num_bytes: int = 32) -> str:
        """
        Generate a token to use in verification emails
        """
        return secrets.token_urlsafe(num_bytes)


    @staticmethod
    def initialize(key_b64: str):
        """
        Initialize the crypto library
        """
        Crypto._symmetric_key = base64.b64decode(key_b64)
        Crypto._nacl_box = nacl.secret.SecretBox(Crypto._symmetric_key)


    @staticmethod
    def encrypt(data: str) -> EncryptedMessage:
        """
        Encrypted data will be exactly 40 bytes longer than the encoded data
        """
        if not Crypto._nacl_box:
            raise ValueError("Encryption engine not initialized")
        byte_data = bytes(data, "utf-8")
        encrypted_data = Crypto._nacl_box.encrypt(byte_data)
        return encrypted_data


    @staticmethod
    def decrypt(encrypted_data: bytes) -> str:
        """
        Decrypt data
        """
        if not Crypto._nacl_box:
            raise ValueError("Encryption engine not initialized")
        byte_data = Crypto._nacl_box.decrypt(encrypted_data)
        return str(byte_data, "utf-8")


    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash the password
        Note that the salt is stored as part of the hash, rather than as a 
        separarte value.  The bcrypt API knows how to separate them.
        """
        salt = gensalt()
        password_bytes = bytes(password, "utf-8")
        password_hash = hashpw(password_bytes, salt)
        password_hash_str = password_hash.decode("utf-8")
        return password_hash_str


    @staticmethod
    def check_password(password: bytes, password_hash: bytes) -> bool:
        """
        Verify the given password against its hash
        """
        return checkpw(password, password_hash)


    @staticmethod
    def hash(input: str) -> str:
        """
        Unlike the encryption and password hash, which incorporate random elements, this hash
        is deterministic and can therefore be used for searches.
        """
        if not Crypto._symmetric_key:
            raise ValueError("Encryption key not set")
        return hmac.new(Crypto._symmetric_key, input.lower().encode(), hashlib.sha256).hexdigest()
    