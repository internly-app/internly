from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import routes  # Make sure the folder and file are correct

app = FastAPI(title="Internly API")

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routes from routes.py
app.include_router(routes.router)
