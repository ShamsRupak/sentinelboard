from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_path: str = "models/weather_model.joblib"
    prometheus_enabled: bool = True
    drift_psi_threshold: float = 0.2
    drift_window_size: int = 200
    ws_broadcast_interval: float = 0.5

    model_config = {"env_prefix": "SB_"}


settings = Settings()
