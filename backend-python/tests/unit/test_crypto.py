import base64

import nacl.utils
import pytest

from crypto import Crypto


def teardown_function() -> None:
    setattr(Crypto, "_nacl_box", None)


def test_encrypt_requires_initialize() -> None:
    with pytest.raises(ValueError, match="Encryption engine not initialized"):
        Crypto.encrypt("hello")


def test_initialize_encrypt_decrypt_round_trip() -> None:
    key_b64 = base64.b64encode(nacl.utils.random(32)).decode("utf-8")
    Crypto.initialize(key_b64)

    encrypted = Crypto.encrypt("trackeats")
    decrypted = Crypto.decrypt(bytes(encrypted))

    assert decrypted == "trackeats"


def test_hash_password_and_check_password() -> None:
    password = "s3cret-password"
    password_hash = Crypto.hash_password(password)

    assert Crypto.check_password(password.encode("utf-8"), password_hash.encode("utf-8")) is True
    assert Crypto.check_password(b"wrong-password", password_hash.encode("utf-8")) is False


def test_generate_url_token_returns_nonempty_string() -> None:
    token = Crypto.generate_url_token(24)

    assert isinstance(token, str)
    assert len(token) > 0
