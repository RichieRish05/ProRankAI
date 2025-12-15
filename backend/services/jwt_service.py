import os
import jwt
from datetime import datetime, timedelta

class JwtService:
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY")
        self.algorithm = os.getenv("JWT_ALGORITHM")

    def generate_token(self, payload: dict):
        payload_with_exp = payload.copy()
        payload_with_exp.update({"exp": datetime.utcnow() + timedelta(days=1)})
        return jwt.encode(payload_with_exp, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token: str):
        if not token:
            return None
        try:
            return jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
        
    def get_user_id_from_token(self, token: str):
        payload = self.verify_token(token)
        if payload:
            return payload.get("user_id")
    
        return None


